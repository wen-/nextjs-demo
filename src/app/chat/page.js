"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const websockConfig = {
    url: "ws://localhost:3001",
    reconnectInterval: 1000, // 重连间隔
    maxReconnect: 30, // 最大重连次数
};

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [ws, setWs] = useState(null);
  const [reconnect, setReconnect] = useState(0);
  const [inputText, setInputText] = useState("");
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const router = useRouter();
  const activeTransfers = useRef(new Map());

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    const connect = () => {
      const websocket = new WebSocket("ws://localhost:3001");

      websocket.onopen = () => {
        setReconnect(0);
        websocket.send(
          JSON.stringify({
            type: "auth",
            token: token,
          })
        );
      };

      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "message":
            setMessages((prev) => [
              ...prev,
              {
                ...data,
                isSender: data.sender === getUsernameFromToken(token),
              },
            ]);
            break;
          case "fileProgress":
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === data.fileId
                  ? { ...msg, progress: data.progress }
                  : msg
              )
            );
            break;
          case "fileComplete":
            setMessages((prev) => {
                
                if(prev.length === 0) {
                    return [data];
                }else {
                    const i = prev.findIndex((msg) => msg.id === data.fileId);
                    if(i === -1) {
                        return [...prev, data];
                    }else{
                        const newMsgs = [...prev];
                        newMsgs[i] = {
                            ...newMsgs[i],
                            downloadUrl: data.downloadUrl,
                        };
                        return newMsgs;
                    }
                }
            });
            break;
          case "fileChunkRequest":
            handleChunkRequest(websocket, data.fileId, data.chunkIndex);
            break;
        }
      };

      websocket.onclose = () => {
        if (reconnect < websockConfig.maxReconnect) {
            setTimeout(() => {
                setReconnect(reconnect + 1);
                connect();
            }, websockConfig.reconnectInterval);
        } else {
            console.log("WebSocket连接已关闭");
        }
      };

      setWs(websocket);
    };
    connect();

    return () => {
      websocket.close();
    };
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getUsernameFromToken = (token) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.username;
    } catch {
      return "unknown";
    }
  };

  const handleChunkRequest = (websocket, fileId, chunkIndex) => {
    const transfer = activeTransfers.current.get(fileId);
    if (!transfer || websocket.readyState !== WebSocket.OPEN) return;

    const start = chunkIndex * transfer.chunkSize;
    const end = Math.min(
      start + transfer.chunkSize,
      transfer.buffer.byteLength
    );
    const chunk = transfer.buffer.slice(start, end);

    websocket.send(
      JSON.stringify({
        type: "fileChunk",
        fileId: fileId,
        chunk: Array.from(new Uint8Array(chunk)),
        chunkIndex: chunkIndex,
        totalChunks: transfer.totalChunks,
      })
    );

    transfer.uploadedChunks++;
    const progress = (transfer.uploadedChunks / transfer.totalChunks) * 100;

    setMessages((prev) =>
      prev.map((msg) => (msg.id === fileId ? { ...msg, progress } : msg))
    );
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;

    const message = {
      type: "message",
      content: inputText,
      timestamp: Date.now(),
    };

    ws.send(JSON.stringify(message));
    setTimeout(()=>setInputText(""));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = (file) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const chunkSize = 16384;
    const bufferReader = new FileReader();

    setMessages((prev) => [
      ...prev,
      {
        id: fileId,
        type: "file",
        fileName: file.name,
        fileSize: file.size,
        progress: 0,
        isSender: true,
        timestamp: Date.now(),
      },
    ]);

    bufferReader.onload = (e) => {
      const arrayBuffer = e.target.result;
      const totalChunks = Math.ceil(arrayBuffer.byteLength / chunkSize);

      activeTransfers.current.set(fileId, {
        file: file,
        totalChunks: totalChunks,
        uploadedChunks: 0,
        chunkSize: chunkSize,
        buffer: arrayBuffer,
      });

      ws.send(
        JSON.stringify({
          type: "fileUploadRequest",
          fileId: fileId,
          fileName: file.name,
          fileSize: file.size,
          totalChunks: totalChunks,
        })
      );
    };

    bufferReader.readAsArrayBuffer(file);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">实时聊天室</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
          >
            退出登录
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full p-4">
        <div className="flex-1 bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <div
                key={msg.id || msg.timestamp}
                className={`flex ${
                  msg.isSender ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl overflow-x-auto ${
                    msg.isSender
                      ? "bg-blue-500 text-white rounded-br-none"
                      : "bg-gray-200 text-gray-800 rounded-bl-none"
                  }`}
                >
                  {msg.type === "message" ? (
                    <pre>{msg.content}</pre>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                        {["png", "jpg", "jpeg"].includes(msg.fileName.toLowerCase().split('.').pop())?(<img src={msg.downloadUrl} alt="img" />)
                        :(<svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-blue-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>)}
                      </div>
                      <div>
                        <p className="font-medium break-all">{msg.fileName}</p>
                        <p className="text-xs opacity-75">
                          {formatFileSize(msg.fileSize || 0)}
                        </p>
                        {msg.progress !== undefined && msg.progress < 100 && (
                          <div className="mt-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${msg.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-xs">
                              {msg.progress.toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {msg.downloadUrl && (
                          <a
                            href={msg.downloadUrl}
                            download={msg.fileName}
                            className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                          >
                            下载文件
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4 bg-gray-50">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span>发送文件</span>
              </button>
              <span className="text-sm text-gray-500">支持大文件断点续传</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="border-t p-4">
            <div className="flex space-x-3">
              <textarea
                id="textInput"
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                    e.key === "Enter" && !e.shiftKey && handleSendMessage()
                }}
                placeholder="输入消息..."
                className="flex-1 border border-gray-300 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-12"
              />
              <button
                onClick={handleSendMessage}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 transition duration-200 shadow-lg"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
