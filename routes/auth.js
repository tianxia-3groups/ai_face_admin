const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// JWT密钥（实际应用中应该从环境变量读取）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// 模拟用户数据（实际应用中应该从数据库读取）
const users = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123', // 实际应用中应该使用加密密码
    name: '管理员',
    email: 'admin@example.com',
    role: 'admin'
  },
  {
    id: 2,
    username: 'user',
    password: 'user123',
    name: '普通用户',
    email: 'user@example.com',
    role: 'user'
  }
];

// 登录接口
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    // 查找用户
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 生成JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' } // 7天过期
    );

    // 返回用户信息（不包含密码）
    const { password: _, ...userInfo } = user;

    res.json({
      success: true,
      message: '登录成功',
      token,
      user: userInfo
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 登出接口
router.post('/logout', (req, res) => {
  // 客户端清除token即可，服务端可以维护黑名单（可选）
  res.json({
    success: true,
    message: '登出成功'
  });
});

// 检查登录状态
router.get('/check', authenticateToken, (req, res) => {
  res.json({
    success: true,
    isLoggedIn: true,
    user: req.user
  });
});

// 获取当前用户信息
router.get('/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: '用户不存在'
    });
  }

  const { password: _, ...userInfo } = user;
  res.json({
    success: true,
    user: userInfo
  });
});

// JWT认证中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '访问令牌缺失'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: '访问令牌无效'
      });
    }
    req.user = user;
    next();
  });
}

module.exports = router; 