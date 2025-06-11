const logger = require('../utils/logger');

/**
 * 认证中间件 - 验证用户是否已登录
 */
function authMiddleware(req, res, next) {
  // 检查session中是否有用户信息
  if (!req.session || !req.session.user) {
    logger.warn(`未授权访问: ${req.method} ${req.path} - IP: ${req.ip}`);
    return res.status(401).json({ 
      error: '未授权访问', 
      message: '请先登录' 
    });
  }

  // 将用户信息附加到请求对象
  req.user = req.session.user;
  
  logger.debug(`已认证用户访问: ${req.user.username} - ${req.method} ${req.path}`);
  next();
}

/**
 * 管理员权限中间件
 */
function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    logger.warn(`管理员权限访问被拒绝: ${req.user?.username || 'unknown'} - ${req.method} ${req.path}`);
    return res.status(403).json({ 
      error: '权限不足', 
      message: '需要管理员权限' 
    });
  }
  
  next();
}

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.adminMiddleware = adminMiddleware; 