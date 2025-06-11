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
 * 启动训练进程
 */
async function startTrainingProcess(workflowId, username, io) {
  const workflowDir = path.join(process.cwd(), `workflows/${workflowId}`);
  const logPath = path.join(workflowDir, 'logs/training.log');
  
  // 确保日志目录存在
  await fs.ensureDir(path.dirname(logPath));
  
  // 创建日志文件写入流
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  
  // 这里应该替换为实际的训练脚本路径
  const trainingScript = process.env.TRAINING_SCRIPT || 'python train.py';
  const args = [
    '--data_dir', path.join(workflowDir, 'materials/processed'),
    '--output_dir', path.join(workflowDir, 'output/model'),
    '--config', path.join(workflowDir, 'training-config.json'),
    '--workflow_id', workflowId
  ];
  
  // 启动训练进程
  const trainingProcess = spawn('python', ['train.py', ...args], {
    cwd: workflowDir,
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
    const workflowPath = path.join(process.cwd(), `db/workflows/${workflowId}.json`);
    const workflow = await fs.readJson(workflowPath);
    
    if (code === 0) {
      workflow.status = 'TRAINING_COMPLETED';
      workflow.progress.message = '训练完成';
      workflow.progress.current = 100;
    } else {
      workflow.status = 'TRAINING_FAILED';
      workflow.progress.message = `训练失败，退出码: ${code}`;
    }
    
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
    const workflowPath = path.join(process.cwd(), `db/workflows/${workflowId}.json`);
    const workflow = await fs.readJson(workflowPath);
    
    workflow.status = 'TRAINING_FAILED';
    workflow.progress.message = `训练进程错误: ${error.message}`;
    workflow.updatedAt = new Date().toISOString();
    
    await fs.writeJson(workflowPath, workflow, { spaces: 2 });
    
    io.to(`workflow-${workflowId}`).emit('training-error', {
      workflowId,
      error: error.message
    });
  });
  
  // 更新工作流状态为训练中
  const workflowPath = path.join(process.cwd(), `db/workflows/${workflowId}.json`);
  const workflow = await fs.readJson(workflowPath);
  
  workflow.status = 'TRAINING';
  workflow.progress.message = '训练进行中...';
  workflow.progress.current = 10;
  workflow.updatedAt = new Date().toISOString();
  workflow.statusHistory.push({
    status: 'TRAINING',
    timestamp: new Date().toISOString(),
    message: '训练已开始'
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