
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// 创建WebSocket服务器
const wss = new WebSocket.Server({ port: 3001 });
console.log('WebSocket服务器运行在端口3001');

// 存储连接的客户端
const clients = new Map();
// 存储文件传输状态
const fileTransfers = new Map();

// JWT密钥
const JWT_SECRET = 'your-secret-key';

// 处理JWT验证
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// 广播消息给所有连接的客户端
function broadcast(message, excludeClient = null) {
  const messageStr = JSON.stringify(message);
  for (const [userId, client] of clients) {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  }
}

// 发送消息给特定用户
function sendToUser(userId, message) {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
}

wss.on('connection', (ws) => {
  console.log('新的WebSocket连接');
  let authenticatedUser = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'auth':
          // 处理认证
          const decoded = verifyToken(message.token);
          if (decoded) {
            authenticatedUser = decoded;
            clients.set(decoded.userId, ws);
            ws.send(JSON.stringify({ type: 'authSuccess', message: '认证成功' }));
            console.log(`用户 ${decoded.username} 认证成功`);
          } else {
            ws.send(JSON.stringify({ type: 'authError', message: '认证失败' }));
            ws.close();
          }
          break;

        case 'message':
          // 处理聊天消息
          if (!authenticatedUser) return;
          
          const chatMessage = {
            type: 'message',
            id: Date.now(),
            content: message.content,
            sender: authenticatedUser.username,
            timestamp: new Date().toISOString()
          };
          
          broadcast(chatMessage);
          break;

        case 'fileUploadRequest':
          // 处理文件上传请求
          if (!authenticatedUser) return;
          
          const fileId = message.fileId;
          const filePath = path.join(__dirname, 'uploads', `${fileId}_${message.fileName}`);
          
          // 确保uploads目录存在
          if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
            fs.mkdirSync(path.join(__dirname, 'uploads'));
          }
          
          // 初始化文件传输状态
          fileTransfers.set(fileId, {
            fileName: message.fileName,
            fileSize: message.fileSize,
            totalChunks: message.totalChunks,
            receivedChunks: 0,
            filePath: filePath,
            buffer: Buffer.alloc(message.fileSize),
            uploader: authenticatedUser.userId
          });
          
          // 请求第一个块
          ws.send(JSON.stringify({
            type: 'fileChunkRequest',
            fileId: fileId,
            chunkIndex: 0
          }));
          break;

        case 'fileChunk':
          // 处理文件块
          if (!authenticatedUser) return;
          
          const transfer = fileTransfers.get(message.fileId);
          if (!transfer) return;
          
          // 验证上传者
          if (transfer.uploader !== authenticatedUser.userId) return;
          
          // 写入块数据
          const chunk = Buffer.from(message.chunk);
          const chunkSize = chunk.length;
          const start = message.chunkIndex * 16384;
          chunk.copy(transfer.buffer, start, 0, chunkSize);
          
          transfer.receivedChunks++;
          
          // 发送进度更新
          const progress = (transfer.receivedChunks / transfer.totalChunks) * 100;
          broadcast({
            type: 'fileProgress',
            fileId: message.fileId,
            progress: progress
          });
          
          // 检查是否完成
          if (transfer.receivedChunks === transfer.totalChunks) {
            // 保存文件
            fs.writeFileSync(transfer.filePath, transfer.buffer);
            
            // 通知完成
            const downloadUrl = `/api/files/${message.fileId}_${transfer.fileName}`;
            broadcast({
              type: 'fileComplete',
              id: Date.now(),
              fileId: message.fileId,
              fileName: transfer.fileName,
              fileSize: transfer.fileSize,
              timestamp: new Date().toISOString(),
              downloadUrl: downloadUrl
            });
            
            // 清理传输状态
            fileTransfers.delete(message.fileId);
          } else {
            // 请求下一个块
            ws.send(JSON.stringify({
              type: 'fileChunkRequest',
              fileId: message.fileId,
              chunkIndex: transfer.receivedChunks
            }));
          }
          break;
      }
    } catch (err) {
      console.error('处理消息时出错:', err);
      ws.send(JSON.stringify({ type: 'error', message: '服务器内部错误' }));
    }
  });

  ws.on('close', () => {
    if (authenticatedUser) {
      clients.delete(authenticatedUser.userId);
      console.log(`用户 ${authenticatedUser.username} 断开连接`);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket错误:', err);
  });
});

// 处理进程退出时清理
process.on('SIGINT', () => {
  console.log('关闭WebSocket服务器...');
  wss.close();
  process.exit(0);
});
