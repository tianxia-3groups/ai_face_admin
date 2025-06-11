const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 用户登录
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: '参数错误', 
        message: '用户名和密码不能为空' 
      });
    }
    
    // 读取用户配置文件
    const usersPath = path.join(process.cwd(), 'db/users.json');
    const users = await fs.readJson(usersPath);
    
    // 验证用户凭据
    const user = users[username];
    if (!user || user.password !== password) {
      logger.warn(`登录失败: ${username} - IP: ${req.ip}`);
      return res.status(401).json({ 
        error: '登录失败', 
        message: '用户名或密码错误' 
      });
    }
    
    // 创建用户会话
    req.session.user = {
      username: user.username,
      role: user.role,
      loginTime: new Date().toISOString()
    };
    
    logger.info(`用户登录成功: ${username} - IP: ${req.ip}`);
    
    res.json({
      success: true,
      message: '登录成功',
      user: {
        username: user.username,
        role: user.role
      }
    });
    
  } catch (error) {
    logger.error('登录处理错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '登录处理失败' 
    });
  }
});

/**
 * 用户登出
 */
router.post('/logout', (req, res) => {
  const username = req.session?.user?.username;
  
  req.session.destroy((err) => {
    if (err) {
      logger.error('登出错误:', err);
      return res.status(500).json({ 
        error: '登出失败', 
        message: '服务器错误' 
      });
    }
    
    logger.info(`用户登出: ${username || 'unknown'}`);
    res.json({ 
      success: true, 
      message: '登出成功' 
    });
  });
});

/**
 * 获取当前用户信息
 */
router.get('/me', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ 
      error: '未登录', 
      message: '用户未登录' 
    });
  }
  
  res.json({
    success: true,
    user: {
      username: req.session.user.username,
      role: req.session.user.role,
      loginTime: req.session.user.loginTime
    }
  });
});

/**
 * 检查登录状态
 */
router.get('/check', (req, res) => {
  const isLoggedIn = !!(req.session && req.session.user);
  
  res.json({
    isLoggedIn,
    user: isLoggedIn ? {
      username: req.session.user.username,
      role: req.session.user.role
    } : null
  });
});

module.exports = router; 