// 认证配置
module.exports = {
  // 会话配置
  session: {
    secret: process.env.SESSION_SECRET || 'ai-face-admin-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24小时
    }
  },
  
  // JWT配置（如果需要）
  jwt: {
    secret: process.env.JWT_SECRET || 'ai-face-admin-jwt-secret',
    expiresIn: '24h'
  }
}; 