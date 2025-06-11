const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { createServer } = require('http');
const { Server } = require('socket.io');

// 导入路由
const authRoutes = require('./backend/routes/auth');
const uploadRoutes = require('./backend/routes/upload');
const workflowRoutes = require('./backend/routes/workflow');
const materialsRoutes = require('./backend/routes/materials');
const trainingRoutes = require('./backend/routes/training');

// 导入中间件
const authMiddleware = require('./backend/middleware/auth');

// 导入工具类
const logger = require('./backend/utils/logger');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// 确保必要的目录存在
async function ensureDirectories() {
  const dirs = [
    'db',
    'db/workflows',
    'workflows',
    'logs',
    'uploads/temp'
  ];
  
  for (const dir of dirs) {
    await fs.ensureDir(dir);
  }
  
  // 创建默认配置文件
  await ensureConfigFiles();
}

async function ensureConfigFiles() {
  // 用户配置文件
  const usersPath = 'db/users.json';
  if (!await fs.pathExists(usersPath)) {
    const defaultUsers = {
      admin: {
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        createdAt: new Date().toISOString()
      }
    };
    await fs.writeJson(usersPath, defaultUsers, { spaces: 2 });
  }
  
  // 训练配置模板
  const trainingConfigPath = 'db/training-config.json';
  if (!await fs.pathExists(trainingConfigPath)) {
    const defaultConfig = {
      learningRate: 0.001,
      epochs: 100,
      batchSize: 32,
      imageSize: 512,
      steps: 2000,
      saveEvery: 500,
      validationSplit: 0.2,
      gpuMemoryGrowth: true,
      mixedPrecision: true
    };
    await fs.writeJson(trainingConfigPath, defaultConfig, { spaces: 2 });
  }
  
  // 上传配置文件
  const uploadConfigPath = 'db/upload-config.json';
  if (!await fs.pathExists(uploadConfigPath)) {
    const defaultUploadConfig = {
      maxConcurrentFiles: 3,
      maxConcurrentWorkflows: 1,
      chunkSize: "2MB",
      allowedFileTypes: [
        "image/jpeg",
        "image/png", 
        "image/webp",
        "video/mp4",
        "video/avi",
        "video/mov"
      ],
      maxFileSize: "500MB",
      retryAttempts: 3,
      retryDelay: 1000
    };
    await fs.writeJson(uploadConfigPath, defaultUploadConfig, { spaces: 2 });
  }
}

// 中间件配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session配置
app.use(session({
  secret: process.env.SESSION_SECRET || 'ai-face-admin-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

// 静态文件服务
app.use('/uploads', express.static('uploads'));
app.use('/workflows', express.static('workflows'));

// 生产环境下服务前端静态文件
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend/dist')));
}

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);
app.use('/api/upload-tasks', authMiddleware, require('./backend/routes/uploadTasks'));
app.use('/api/workflow', authMiddleware, workflowRoutes);
app.use('/api/materials', authMiddleware, materialsRoutes);
app.use('/api/training', authMiddleware, trainingRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 系统状态API
app.get('/api/system/status', authMiddleware, (req, res) => {
  const usage = process.memoryUsage();
  res.json({
    cpu: Math.random() * 100, // 模拟CPU使用率
    memory: (usage.heapUsed / usage.heapTotal) * 100,
    disk: Math.random() * 100, // 模拟磁盘使用率
    gpu: {
      usage: Math.random() * 100, // 模拟GPU使用率
      memory: Math.random() * 100 // 模拟GPU内存使用率
    },
    temperature: 65 + Math.random() * 20, // 模拟温度
    uptime: process.uptime()
  });
});

// 生产环境下的前端路由处理
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
  });
}

// Socket.IO连接处理
io.on('connection', (socket) => {
  logger.info(`Socket客户端已连接: ${socket.id}`);
  
  socket.on('join-workflow', (workflowId) => {
    socket.join(`workflow-${workflowId}`);
    logger.info(`客户端 ${socket.id} 加入工作流房间: ${workflowId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Socket客户端已断开: ${socket.id}`);
  });
});

// 将io实例附加到app，供其他模块使用
app.set('io', io);

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error('服务器错误:', err);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试'
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 启动服务器
async function startServer() {
  try {
    await ensureDirectories();
    
    server.listen(PORT, () => {
      logger.info(`🚀 AI人脸训练管理系统已启动`);
      logger.info(`📍 服务器地址: http://localhost:${PORT}`);
      logger.info(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('启动服务器失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，正在关闭服务器...');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

startServer(); 