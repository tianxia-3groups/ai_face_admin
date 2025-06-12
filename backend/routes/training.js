const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const logger = require('../utils/logger');

const router = express.Router();

// 训练进程管理
const trainingProcesses = new Map();

/**
 * 获取训练配置
 */
router.get('/:workflowId/config', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const configPath = path.join(process.cwd(), `workflows/${workflowId}/training-config.json`);
    
    if (!await fs.pathExists(configPath)) {
      return res.status(404).json({ 
        error: '配置文件不存在', 
        message: '训练配置文件未找到' 
      });
    }
    
    const config = await fs.readJson(configPath);
    
    res.json({
      success: true,
      config
    });
    
  } catch (error) {
    logger.error('获取训练配置错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '获取训练配置失败' 
    });
  }
});

/**
 * 更新训练配置
 */
router.put('/:workflowId/config', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({ 
        error: '参数错误', 
        message: '缺少配置参数' 
      });
    }
    
    const configPath = path.join(process.cwd(), `workflows/${workflowId}/training-config.json`);
    
    // 验证配置参数
    const validatedConfig = validateTrainingConfig(config);
    
    await fs.writeJson(configPath, validatedConfig, { spaces: 2 });
    
    logger.info(`训练配置已更新: ${workflowId} by ${req.user.username}`);
    
    res.json({
      success: true,
      message: '训练配置更新成功',
      config: validatedConfig
    });
    
  } catch (error) {
    logger.error('更新训练配置错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '更新训练配置失败' 
    });
  }
});

/**
 * 开始训练
 */
router.post('/:workflowId/start', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    // 检查工作流状态
    const workflowPath = path.join(process.cwd(), `db/workflows/${workflowId}.json`);
    if (!await fs.pathExists(workflowPath)) {
      return res.status(404).json({ 
        error: '工作流不存在' 
      });
    }
    
    const workflow = await fs.readJson(workflowPath);
    
    if (workflow.status !== 'CONFIGURING') {
      return res.status(400).json({ 
        error: '工作流状态错误', 
        message: '只能从配置状态开始训练' 
      });
    }
    
    // 检查是否有其他训练在进行
    if (trainingProcesses.size > 0) {
      return res.status(409).json({ 
        error: '训练冲突', 
        message: '已有其他训练正在进行中' 
      });
    }
    
    // 验证训练数据
    const materialsDir = path.join(process.cwd(), `workflows/${workflowId}/materials/processed`);
    const materials = await fs.readdir(materialsDir);
    const imageFiles = materials.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext);
    });
    
    if (imageFiles.length < 10) {
      return res.status(400).json({ 
        error: '训练数据不足', 
        message: '至少需要10张图片才能开始训练' 
      });
    }
    
    // 启动训练进程
    const trainingProcess = await startTrainingProcess(workflowId, req.user.username, req.app.get('io'));
    
    res.json({
      success: true,
      message: '训练已开始',
      processId: trainingProcess.pid
    });
    
  } catch (error) {
    logger.error('启动训练错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '启动训练失败' 
    });
  }
});

/**
 * 停止训练
 */
router.post('/:workflowId/stop', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    const processInfo = trainingProcesses.get(workflowId);
    if (!processInfo) {
      return res.status(404).json({ 
        error: '训练进程不存在', 
        message: '没有找到正在运行的训练进程' 
      });
    }
    
    // 优雅停止训练进程
    processInfo.process.kill('SIGTERM');
    
    setTimeout(() => {
      if (!processInfo.process.killed) {
        processInfo.process.kill('SIGKILL');
      }
    }, 10000); // 10秒后强制杀死
    
    logger.info(`训练进程已停止: ${workflowId} by ${req.user.username}`);
    
    res.json({
      success: true,
      message: '训练已停止'
    });
    
  } catch (error) {
    logger.error('停止训练错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '停止训练失败' 
    });
  }
});

/**
 * 获取训练状态
 */
router.get('/:workflowId/status', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    const processInfo = trainingProcesses.get(workflowId);
    const isRunning = !!processInfo;
    
    // 读取最新的训练日志
    const logPath = path.join(process.cwd(), `workflows/${workflowId}/logs/training.log`);
    let recentLogs = [];
    
    if (await fs.pathExists(logPath)) {
      const logContent = await fs.readFile(logPath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());
      recentLogs = lines.slice(-50); // 最近50行日志
    }
    
    res.json({
      success: true,
      isRunning,
      processId: processInfo?.pid,
      startTime: processInfo?.startTime,
      recentLogs
    });
    
  } catch (error) {
    logger.error('获取训练状态错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '获取训练状态失败' 
    });
  }
});

/**
 * 获取训练日志
 */
router.get('/:workflowId/logs', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { lines = 100 } = req.query;
    
    const logPath = path.join(process.cwd(), `workflows/${workflowId}/logs/training.log`);
    
    if (!await fs.pathExists(logPath)) {
      return res.json({
        success: true,
        logs: []
      });
    }
    
    const logContent = await fs.readFile(logPath, 'utf8');
    const allLines = logContent.split('\n').filter(line => line.trim());
    const recentLines = allLines.slice(-parseInt(lines));
    
    res.json({
      success: true,
      logs: recentLines,
      totalLines: allLines.length
    });
    
  } catch (error) {
    logger.error('获取训练日志错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '获取训练日志失败' 
    });
  }
});

/**
 * 获取支持的训练类型
 */
router.get('/types', async (req, res) => {
  try {
    // 返回支持的训练类型及其描述
    const trainTypes = [
      {
        id: 'face_swap',
        name: '单对单训练',
        description: '将脸源人物的脸部特征应用到模特身上，实现换脸效果',
        requirements: {
          source: '需要提供清晰的脸部照片/视频(至少20张)',
          target: '需要提供模特照片/视频(至少10张)'
        }
      },
      {
        id: 'face_extract',
        name: '单人脸提取训练',
        description: '从单一人物素材中提取高质量的脸部特征模型',
        requirements: {
          source: '需要提供多角度、多表情的清晰脸部照片/视频(至少30张)',
          target: '不需要模特素材'
        }
      }
    ];
    
    res.json({
      success: true,
      types: trainTypes
    });
  } catch (error) {
    logger.error('获取训练类型错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '获取训练类型失败' 
    });
  }
});

/**
 * 获取指定类型的配置模板
 */
router.get('/templates/:type', async (req, res) => {
  try {
    const { type } = req.params;
    
    // 验证类型
    const validTypes = ['face_swap', 'face_extract'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: '参数错误', 
        message: '无效的训练类型' 
      });
    }
    
    const configPath = path.join(process.cwd(), 'db/training-config.json');
    const config = await fs.readJson(configPath);
    
    // 获取指定类型的模板
    const templates = config.templates[type];
    if (!templates) {
      return res.status(404).json({ 
        error: '模板不存在', 
        message: `未找到类型为 ${type} 的训练模板` 
      });
    }
    
    res.json({
      success: true,
      type,
      templates
    });
    
  } catch (error) {
    logger.error('获取训练模板错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '获取训练模板失败' 
    });
  }
});

/**
 * 验证素材是否符合训练类型要求
 */
router.post('/validate-materials', async (req, res) => {
  try {
    const { workflowId, type } = req.body;
    
    if (!workflowId || !type) {
      return res.status(400).json({ 
        error: '参数错误', 
        message: '工作流ID和训练类型不能为空' 
      });
    }
    
    // 验证工作流存在
    const workflowPath = path.join(process.cwd(), `db/workflows/${workflowId}.json`);
    if (!await fs.pathExists(workflowPath)) {
      return res.status(404).json({ 
        error: '工作流不存在' 
      });
    }
    
    // 根据类型验证素材
    const sourcePath = path.join(process.cwd(), `workflows/${workflowId}/materials/source`);
    const sourceFiles = await fs.readdir(sourcePath);
    const sourceImgCount = sourceFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext);
    }).length;
    
    const result = {
      valid: true,
      source: { valid: true, count: sourceImgCount, required: 0, message: '' }
    };
    
    // 根据训练类型设置要求
    if (type === 'face_swap') {
      result.source.required = 20;
      if (sourceImgCount < 20) {
        result.source.valid = false;
        result.source.message = '脸源图片数量不足，需要至少20张';
        result.valid = false;
      }
      
      // 检查模特素材
      const targetPath = path.join(process.cwd(), `workflows/${workflowId}/materials/target`);
      if (await fs.pathExists(targetPath)) {
        const targetFiles = await fs.readdir(targetPath);
        const targetImgCount = targetFiles.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext);
        }).length;
        
        result.target = { valid: true, count: targetImgCount, required: 10, message: '' };
        
        if (targetImgCount < 10) {
          result.target.valid = false;
          result.target.message = '模特图片数量不足，需要至少10张';
          result.valid = false;
        }
      } else {
        result.target = { valid: false, count: 0, required: 10, message: '未找到模特素材目录' };
        result.valid = false;
      }
    } else if (type === 'face_extract') {
      result.source.required = 30;
      if (sourceImgCount < 30) {
        result.source.valid = false;
        result.source.message = '脸源图片数量不足，需要至少30张';
        result.valid = false;
      }
    }
    
    res.json({
      success: true,
      validation: result
    });
    
  } catch (error) {
    logger.error('验证素材错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '验证素材失败' 
    });
  }
});

/**
 * 获取训练类型的素材要求
 */
router.get('/requirements/:type', async (req, res) => {
  try {
    const { type } = req.params;
    
    // 验证类型
    const validTypes = ['face_swap', 'face_extract'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: '参数错误', 
        message: '无效的训练类型' 
      });
    }
    
    // 根据类型返回要求
    let requirements;
    if (type === 'face_swap') {
      requirements = {
        source: {
          minCount: 20,
          description: '需要提供清晰的脸部照片/视频，数量越多效果越好，至少20张',
          formats: ['.jpg', '.png', '.jpeg', '.mp4', '.avi', '.mov'],
          tips: [
            '正面照片效果最佳，侧脸照片适量即可',
            '表情丰富的照片有助于更好的效果',
            '光线充足的照片效果会更好'
          ]
        },
        target: {
          minCount: 10,
          description: '需要提供模特照片/视频，至少10张',
          formats: ['.jpg', '.png', '.jpeg', '.mp4', '.avi', '.mov'],
          tips: [
            '姿势多样的照片有助于生成多样化的结果',
            '光线、角度一致的照片会有更好的效果'
          ]
        }
      };
    } else if (type === 'face_extract') {
      requirements = {
        source: {
          minCount: 30,
          description: '需要提供多角度、多表情的清晰脸部照片/视频，至少30张',
          formats: ['.jpg', '.png', '.jpeg', '.mp4', '.avi', '.mov'],
          tips: [
            '建议包含多种角度的照片（正面、侧面、仰角、俯角等）',
            '包含多种表情的照片（微笑、严肃、惊讶等）',
            '不同光线条件下的照片可提高适应性'
          ]
        }
      };
    }
    
    res.json({
      success: true,
      type,
      requirements
    });
    
  } catch (error) {
    logger.error('获取训练要求错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '获取训练要求失败' 
    });
  }
});

/**
 * 启动训练进程
 */
async function startTrainingProcess(workflowId, username, io) {
  // 读取工作流配置和训练配置
  const workflowPath = path.join(process.cwd(), `db/workflows/${workflowId}.json`);
  const workflow = await fs.readJson(workflowPath);
  
  const trainingConfigPath = path.join(process.cwd(), `workflows/${workflowId}/training-config.json`);
  const trainingConfig = await fs.readJson(trainingConfigPath);
  
  const trainType = workflow.type || 'face_swap';
  
  // 根据训练类型选择不同的训练脚本
  let scriptPath;
  if (trainType === 'face_swap') {
    scriptPath = path.join(__dirname, '../scripts/train_face_swap.py');
  } else if (trainType === 'face_extract') {
    scriptPath = path.join(__dirname, '../scripts/train_face_extract.py');
  } else {
    scriptPath = path.join(__dirname, '../scripts/train.py');
  }
  
  // 准备训练参数
  const sourcePath = path.join(process.cwd(), `workflows/${workflowId}/materials/source`);
  const outputPath = path.join(process.cwd(), `workflows/${workflowId}/output/model`);
  const logPath = path.join(process.cwd(), `workflows/${workflowId}/logs/training.log`);
  
  // 构建训练命令行参数
  const args = [
    scriptPath,
    '--workflow-id', workflowId,
    '--source-dir', sourcePath,
    '--output-dir', outputPath,
    '--log-file', logPath,
    '--epochs', trainingConfig.epochs,
    '--batch-size', trainingConfig.batchSize,
    '--learning-rate', trainingConfig.learningRate,
    '--resolution', trainingConfig.resolution
  ];
  
  // 根据训练类型添加额外参数
  if (trainType === 'face_swap') {
    const targetPath = path.join(process.cwd(), `workflows/${workflowId}/materials/target`);
    args.push('--target-dir', targetPath);
    args.push('--blend-ratio', trainingConfig.faceBlendRatio || 0.8);
    args.push('--preserve-pose', trainingConfig.preservePose ? 'true' : 'false');
  } else if (trainType === 'face_extract') {
    args.push('--extraction-accuracy', trainingConfig.extractionAccuracy || 0.95);
    args.push('--angle-range', trainingConfig.angleRange || 45);
  }
  
  // 确保日志目录存在
  await fs.ensureDir(path.dirname(logPath));
  
  // 创建日志文件写入流
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  
  // 启动训练进程
  const trainingProcess = spawn('python', args, {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  const processInfo = {
    process: trainingProcess,
    pid: trainingProcess.pid,
    workflowId,
    startTime: new Date().toISOString(),
    username
  };
  
  trainingProcesses.set(workflowId, processInfo);
  
  // 处理标准输出
  trainingProcess.stdout.on('data', (data) => {
    const message = data.toString();
    logStream.write(`[STDOUT] ${new Date().toISOString()}: ${message}`);
    
    // 通过Socket.IO发送实时日志
    io.to(`workflow-${workflowId}`).emit('training-log', {
      type: 'stdout',
      message: message.trim(),
      timestamp: new Date().toISOString()
    });
  });
  
  // 处理标准错误
  trainingProcess.stderr.on('data', (data) => {
    const message = data.toString();
    logStream.write(`[STDERR] ${new Date().toISOString()}: ${message}`);
    
    io.to(`workflow-${workflowId}`).emit('training-log', {
      type: 'stderr',
      message: message.trim(),
      timestamp: new Date().toISOString()
    });
  });
  
  // 处理进程结束
  trainingProcess.on('close', async (code) => {
    logStream.write(`[SYSTEM] ${new Date().toISOString()}: 训练进程结束，退出码: ${code}\n`);
    logStream.end();
    
    trainingProcesses.delete(workflowId);
    
    // 更新工作流状态
    workflow.status = 'TRAINING_COMPLETED';
    workflow.progress.message = '训练完成';
    workflow.progress.current = 100;
    
    workflow.updatedAt = new Date().toISOString();
    workflow.statusHistory.push({
      status: workflow.status,
      timestamp: new Date().toISOString(),
      message: workflow.progress.message
    });
    
    await fs.writeJson(workflowPath, workflow, { spaces: 2 });
    
    // 通知前端训练结束
    io.to(`workflow-${workflowId}`).emit('training-completed', {
      workflowId,
      exitCode: code,
      success: code === 0,
      message: workflow.progress.message
    });
    
    logger.info(`训练进程结束: ${workflowId} - 退出码: ${code}`);
  });
  
  // 处理进程错误
  trainingProcess.on('error', async (error) => {
    logger.error(`训练进程错误: ${workflowId}`, error);
    
    logStream.write(`[ERROR] ${new Date().toISOString()}: ${error.message}\n`);
    logStream.end();
    
    trainingProcesses.delete(workflowId);
    
    // 更新工作流状态为失败
    workflow.status = 'TRAINING_FAILED';
    workflow.progress.message = `训练进程错误: ${error.message}`;
    workflow.updatedAt = new Date().toISOString();
    
    await fs.writeJson(workflowPath, workflow, { spaces: 2 });
    
    io.to(`workflow-${workflowId}`).emit('training-error', {
      workflowId,
      error: error.message
    });
  });
  
  // 更新工作流状态
  workflow.status = 'TRAINING';
  workflow.progress = { current: 0, total: 100, message: '训练已开始' };
  workflow.statusHistory.push({
    status: 'TRAINING',
    timestamp: new Date().toISOString(),
    message: `训练已开始，类型: ${trainType}`,
    updatedBy: username
  });
  
  await fs.writeJson(workflowPath, workflow, { spaces: 2 });
  
  logger.info(`训练进程已启动: ${workflowId} - PID: ${trainingProcess.pid}`);
  
  return processInfo;
}

/**
 * 验证训练配置
 */
function validateTrainingConfig(config) {
  const validated = { ...config };
  
  // 基本参数验证
  validated.learningRate = Math.max(0.0001, Math.min(1.0, parseFloat(config.learningRate) || 0.001));
  validated.epochs = Math.max(1, Math.min(1000, parseInt(config.epochs) || 100));
  validated.batchSize = Math.max(1, Math.min(128, parseInt(config.batchSize) || 32));
  validated.imageSize = Math.max(64, Math.min(1024, parseInt(config.imageSize) || 512));
  validated.steps = Math.max(100, parseInt(config.steps) || 2000);
  validated.saveEvery = Math.max(50, parseInt(config.saveEvery) || 500);
  validated.validationSplit = Math.max(0.1, Math.min(0.5, parseFloat(config.validationSplit) || 0.2));
  
  // 布尔值参数
  validated.gpuMemoryGrowth = Boolean(config.gpuMemoryGrowth);
  validated.mixedPrecision = Boolean(config.mixedPrecision);
  
  return validated;
}

module.exports = router; 