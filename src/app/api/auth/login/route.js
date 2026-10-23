
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// 加密密码
async function hashPassword(password) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

// 验证密码
async function verifyPassword(password, hash) {
  const isMatch = await bcrypt.compare(password, hash);
  return isMatch;
}

// 模拟用户数据库
const users = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$wpIQoRZDLELz4aP3vmkSouG6WZtepbmOhKp..DKBz7wPdBkp71fA.' // 123456
  },
  {
    id: 2,
    username: 'user1',
    password: '$2a$10$wpIQoRZDLELz4aP3vmkSouG6WZtepbmOhKp..DKBz7wPdBkp71fA.' // 123456
  }
];

export async function POST(request) {
  try {

    const { username, password } = await request.json();
    console.log('----login info: ', username, password);

    const pw = await hashPassword(password);
    console.log('----hashed password: ', pw);

    const ok = await verifyPassword(password, pw);
    console.log('----password match: ', ok);

    if (!username || !password) {
      return NextResponse.json(
        { message: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    const user = users.find(u => u.username === username);
    
    if (!user) {
      return NextResponse.json(
        { message: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const isValidPassword = bcrypt.compareSync(password, user.password);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { message: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      'your-secret-key',
      { expiresIn: '24h' }
    );

    return NextResponse.json({ 
      message: '登录成功',
      token: token,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    return NextResponse.json(
      { message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
