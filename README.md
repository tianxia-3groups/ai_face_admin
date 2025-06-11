# AI人脸模型训练管理系统

一个基于Node.js + Vue3的AI人脸模型训练管理系统，专为RunPod部署环境设计。

## 功能特性

### 🎯 核心功能
- **工作流管理**: 完整的训练流程管理，从素材上传到模型完成
- **大文件上传**: 支持分片上传和断点续传
- **视频处理**: 自动视频切片转换为训练图片
- **素材筛选**: 可视化图片筛选，支持批量删除和恢复
- **实时监控**: 训练进度和日志的实时查看
- **云盘集成**: 自动上传训练结果到Google Drive

### 🔧 技术特性
- **前后端分离**: Node.js后端 + Vue3前端
- **实时通信**: Socket.IO支持的实时状态更新
- **文件系统存储**: 无需数据库，基于JSON配置文件
- **并发控制**: 智能的训练资源管理
- **容错机制**: 完善的错误处理和恢复

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- Python >= 3.8 (用于训练脚本)
- FFmpeg (用于视频处理)

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd ai_face_admin
```

2. **安装依赖**
```bash
npm run setup
```

3. **配置环境变量**
```bash
cp env.example .env
# 编辑 .env 文件，配置必要的环境变量
```

4. **启动开发服务器**
```bash
npm run dev
```

5. **访问系统**
- 后端API: http://localhost:3000
- 前端界面: http://localhost:5173 (开发模式)

### 生产部署

1. **构建前端**
```bash
npm run build
```

2. **启动生产服务器**
```bash
npm start
```

## 系统架构

### 目录结构
```
ai_face_admin/
├── backend/                 # 后端代码
│   ├── routes/             # API路由
│   ├── middleware/         # 中间件
│   ├── utils/              # 工具函数
│   └── services/           # 业务服务
├── frontend/               # 前端代码 (Vue3)
├── db/                     # 配置文件存储
├── workflows/              # 训练流程工作目录
├── logs/                   # 系统日志
└── uploads/                # 临时上传目录
```

### 工作流状态
- `CREATED` - 已创建
- `UPLOADING` - 素材上传中
- `SLICING` - 视频切片中
- `PROCESSING` - 素材处理中
- `FILTERING` - 素材筛选中
- `MATERIALS_READY` - 素材已确认
- `CONFIGURING` - 配置中
- `TRAINING` - 训练中
- `TRAINING_COMPLETED` - 训练完成
- `UPLOADING_RESULT` - 上传结果中
- `COMPLETED` - 已完成

## API文档

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/me` - 获取当前用户信息

### 工作流接口
- `GET /api/workflow` - 获取工作流列表
- `POST /api/workflow` - 创建新工作流
- `GET /api/workflow/:id` - 获取工作流详情
- `PUT /api/workflow/:id/status` - 更新工作流状态
- `DELETE /api/workflow/:id` - 删除工作流

### 上传接口
- `POST /api/upload/:workflowId/chunk/init` - 初始化分片上传
- `POST /api/upload/:workflowId/chunk/:fileId/:chunkIndex` - 上传文件分片
- `GET /api/upload/:workflowId/chunk/:fileId/status` - 获取上传状态
- `POST /api/upload/:workflowId/files` - 普通文件上传

### 素材管理接口
- `GET /api/materials/:workflowId` - 获取素材列表
- `POST /api/materials/:workflowId/delete` - 批量删除素材
- `POST /api/materials/:workflowId/restore` - 批量恢复素材
- `GET /api/materials/:workflowId/deleted` - 获取已删除素材

### 训练接口
- `GET /api/training/:workflowId/config` - 获取训练配置
- `PUT /api/training/:workflowId/config` - 更新训练配置
- `POST /api/training/:workflowId/start` - 开始训练
- `POST /api/training/:workflowId/stop` - 停止训练
- `GET /api/training/:workflowId/status` - 获取训练状态
- `GET /api/training/:workflowId/logs` - 获取训练日志

## 配置说明

### 默认用户
- 用户名: `admin`
- 密码: `admin123`

### 训练配置参数
- `learningRate`: 学习率 (0.0001-1.0)
- `epochs`: 训练轮数 (1-1000)
- `batchSize`: 批次大小 (1-128)
- `imageSize`: 图片尺寸 (64-1024)
- `steps`: 训练步数
- `saveEvery`: 保存间隔
- `validationSplit`: 验证集比例

## 开发指南

### 后端开发
```bash
# 启动后端开发服务器
npm run dev

# 查看日志
tail -f logs/combined.log
```

### 前端开发
```bash
# 进入前端目录
cd frontend

# 启动前端开发服务器
npm run dev
```

### 添加新功能
1. 在 `backend/routes/` 中添加新的API路由
2. 在 `frontend/src/` 中添加对应的前端组件
3. 更新API文档和测试

## 部署说明

### RunPod部署
1. 确保容器有足够的存储空间
2. 安装必要的系统依赖 (FFmpeg, Python等)
3. 配置环境变量
4. 启动服务

### Docker部署
```bash
# 构建镜像
docker build -t ai-face-admin .

# 运行容器
docker run -d -p 3000:3000 \
  -v $(pwd)/workflows:/app/workflows \
  -v $(pwd)/db:/app/db \
  ai-face-admin
```

## 故障排除

### 常见问题
1. **上传失败**: 检查磁盘空间和文件权限
2. **训练无法启动**: 确认Python环境和训练脚本路径
3. **Socket连接失败**: 检查防火墙和代理设置

### 日志查看
```bash
# 系统日志
tail -f logs/combined.log

# 错误日志
tail -f logs/error.log

# 特定工作流日志
tail -f workflows/{workflow-id}/logs/training.log
```

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 支持

如有问题，请提交 Issue 或联系开发团队。 