const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const router = express.Router();

// 工作流状态枚举
const WORKFLOW_STATUS = {
  CREATED: 'CREATED',
  UPLOADING: 'UPLOADING', 
  SLICING: 'SLICING',
  PROCESSING: 'PROCESSING',
  FILTERING: 'FILTERING',
  MATERIALS_READY: 'MATERIALS_READY',
  CONFIGURING: 'CONFIGURING',
  TRAINING: 'TRAINING',
  TRAINING_COMPLETED: 'TRAINING_COMPLETED',
  UPLOADING_RESULT: 'UPLOADING_RESULT',
  COMPLETED: 'COMPLETED',
  TRAINING_FAILED: 'TRAINING_FAILED',
  CANCELLED: 'CANCELLED'
};

/**
 * 获取仪表板数据
 */
router.get('/dashboard', async (req, res) => {
  try {
    const workflowsDir = path.join(process.cwd(), 'db/workflows');
    await fs.ensureDir(workflowsDir);
    
    const files = await fs.readdir(workflowsDir);
    const workflows = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const workflowPath = path.join(workflowsDir, file);
        const workflow = await fs.readJson(workflowPath);
        workflows.push(workflow);
      }
    }
    
    // 计算统计数据
    const stats = {
      total: workflows.length,
      running: workflows.filter(w => ['TRAINING', 'PROCESSING', 'UPLOADING'].includes(w.status)).length,
      waiting: workflows.filter(w => ['CREATED', 'MATERIALS_READY', 'CONFIGURING'].includes(w.status)).length,
      completed: workflows.filter(w => w.status === 'COMPLETED').length,
      failed: workflows.filter(w => w.status === 'TRAINING_FAILED').length
    };
    
    // 获取活跃工作流（非完成状态的最新5个）
    const activeWorkflows = workflows
      .filter(w => w.status !== 'COMPLETED' && w.status !== 'CANCELLED')
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5)
      .map(w => ({
        id: w.id,
        name: w.name,
        status: w.status,
        progress: w.progress?.current || 0,
        updatedAt: w.updatedAt
      }));
    
    // 获取最近活动（最新的状态变更记录）
    const recentActivities = [];
    workflows.forEach(w => {
      if (w.statusHistory && w.statusHistory.length > 0) {
        const latestStatus = w.statusHistory[w.statusHistory.length - 1];
        recentActivities.push({
          id: `${w.id}_${latestStatus.timestamp}`,
          workflowId: w.id,
          workflowName: w.name,
          type: getActivityType(latestStatus.status),
          message: latestStatus.message,
          timestamp: latestStatus.timestamp
        });
      }
    });
    
    // 按时间排序，取最新10条
    recentActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const activities = recentActivities.slice(0, 10);
    
    res.json({
      success: true,
      data: {
        stats,
        activeWorkflows,
        recentActivities: activities
      }
    });
    
  } catch (error) {
    logger.error('获取仪表板数据错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '获取仪表板数据失败' 
    });
  }
});

/**
 * 获取活动类型
 */
function getActivityType(status) {
  const typeMap = {
    'COMPLETED': 'success',
    'TRAINING_FAILED': 'error',
    'TRAINING': 'info',
    'PROCESSING': 'warning'
  };
  return typeMap[status] || 'info';
}

/**
 * 获取所有工作流列表
 */
router.get('/', async (req, res) => {
  try {
    const workflowsDir = path.join(process.cwd(), 'db/workflows');
    await fs.ensureDir(workflowsDir);
    
    const files = await fs.readdir(workflowsDir);
    const workflows = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const workflowPath = path.join(workflowsDir, file);
        const workflow = await fs.readJson(workflowPath);
        workflows.push(workflow);
      }
    }
    
    // 按创建时间降序排序
    workflows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      workflows
    });
    
  } catch (error) {
    logger.error('获取工作流列表错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '获取工作流列表失败' 
    });
  }
});

/**
 * 获取单个工作流详情
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const workflowPath = path.join(process.cwd(), `db/workflows/${id}.json`);
    
    if (!await fs.pathExists(workflowPath)) {
      return res.status(404).json({ 
        error: '工作流不存在', 
        message: `找不到ID为 ${id} 的工作流` 
      });
    }
    
    const workflow = await fs.readJson(workflowPath);
    
    // 获取工作流统计信息
    const stats = await getWorkflowStats(id);
    workflow.stats = stats;
    
    res.json({
      success: true,
      data: workflow
    });
    
  } catch (error) {
    logger.error('获取工作流详情错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '获取工作流详情失败' 
    });
  }
});

/**
 * 创建新工作流
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, expectedDuration, trainType } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        error: '参数错误', 
        message: '工作流名称不能为空' 
      });
    }
    
    // 验证训练类型
    const validTrainTypes = ['face_swap', 'face_extract'];
    if (!trainType || !validTrainTypes.includes(trainType)) {
      return res.status(400).json({
        error: '参数错误',
        message: '训练类型无效，必须是face_swap或face_extract'
      });
    }
    
    const workflowId = uuidv4();
    const workflow = {
      id: workflowId,
      name,
      description: description || '',
      expectedDuration: expectedDuration || '',
      status: WORKFLOW_STATUS.CREATED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user.username,
      type: trainType, // 保存训练类型
      progress: {
        current: 0,
        total: 100,
        message: '工作流已创建'
      },
      statusHistory: [{
        status: WORKFLOW_STATUS.CREATED,
        timestamp: new Date().toISOString(),
        message: '工作流创建成功'
      }],
      materials: {
        source: {
          totalFiles: 0,
          processedFiles: 0,
          selectedFiles: []
        },
        target: trainType === 'face_swap' ? {
          totalFiles: 0,
          processedFiles: 0,
          selectedFiles: []
        } : null
      }
    };
    
    // 保存工作流配置
    const workflowPath = path.join(process.cwd(), `db/workflows/${workflowId}.json`);
    await fs.writeJson(workflowPath, workflow, { spaces: 2 });
    
    // 创建工作流目录结构
    await createWorkflowDirectories(workflowId, trainType);
    
    // 复制训练配置模板
    await copyTrainingConfig(workflowId, trainType);
    
    logger.info(`工作流创建成功: ${workflowId} - ${name} - 类型: ${trainType} by ${req.user.username}`);
    
    res.json({
      success: true,
      message: '工作流创建成功',
      workflow
    });
    
  } catch (error) {
    logger.error('创建工作流错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '创建工作流失败' 
    });
  }
});

/**
 * 更新工作流状态
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message, progress } = req.body;
    
    if (!Object.values(WORKFLOW_STATUS).includes(status)) {
      return res.status(400).json({ 
        error: '参数错误', 
        message: '无效的状态值' 
      });
    }
    
    const workflowPath = path.join(process.cwd(), `db/workflows/${id}.json`);
    
    if (!await fs.pathExists(workflowPath)) {
      return res.status(404).json({ 
        error: '工作流不存在', 
        message: `找不到ID为 ${id} 的工作流` 
      });
    }
    
    const workflow = await fs.readJson(workflowPath);
    
    // 检查训练并发限制
    if (status === WORKFLOW_STATUS.TRAINING) {
      const hasTrainingWorkflow = await checkTrainingWorkflow(id);
      if (hasTrainingWorkflow) {
        return res.status(409).json({ 
          error: '训练冲突', 
          message: '已有其他工作流正在训练中，请等待完成后再试' 
        });
      }
    }
    
    // 更新状态
    workflow.status = status;
    workflow.updatedAt = new Date().toISOString();
    
    if (message) {
      workflow.progress.message = message;
    }
    
    if (progress !== undefined) {
      workflow.progress.current = progress;
    }
    
    // 添加状态历史记录
    workflow.statusHistory.push({
      status,
      timestamp: new Date().toISOString(),
      message: message || `状态更新为: ${status}`,
      updatedBy: req.user.username
    });
    
    await fs.writeJson(workflowPath, workflow, { spaces: 2 });
    
    // 通过Socket.IO广播状态更新
    const io = req.app.get('io');
    io.to(`workflow-${id}`).emit('workflow-status-updated', {
      workflowId: id,
      status,
      progress: workflow.progress,
      message
    });
    
    logger.info(`工作流状态更新: ${id} - ${status} by ${req.user.username}`);
    
    res.json({
      success: true,
      message: '状态更新成功',
      workflow
    });
    
  } catch (error) {
    logger.error('更新工作流状态错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '更新状态失败' 
    });
  }
});

/**
 * 删除工作流
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const workflowPath = path.join(process.cwd(), `db/workflows/${id}.json`);
    
    if (!await fs.pathExists(workflowPath)) {
      return res.status(404).json({ 
        error: '工作流不存在', 
        message: `找不到ID为 ${id} 的工作流` 
      });
    }
    
    const workflow = await fs.readJson(workflowPath);
    
    // 检查是否可以删除（不能删除正在训练的工作流）
    if (workflow.status === WORKFLOW_STATUS.TRAINING) {
      return res.status(409).json({ 
        error: '操作冲突', 
        message: '无法删除正在训练中的工作流' 
      });
    }
    
    // 删除工作流配置文件
    await fs.remove(workflowPath);
    
    // 删除工作流目录（可选，也可以保留用于恢复）
    const workflowDir = path.join(process.cwd(), `workflows/${id}`);
    if (await fs.pathExists(workflowDir)) {
      await fs.remove(workflowDir);
    }
    
    logger.info(`工作流删除: ${id} - ${workflow.name} by ${req.user.username}`);
    
    res.json({
      success: true,
      message: '工作流删除成功'
    });
    
  } catch (error) {
    logger.error('删除工作流错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '删除工作流失败' 
    });
  }
});

/**
 * 创建工作流目录结构
 */
async function createWorkflowDirectories(workflowId, trainType) {
  const baseDir = path.join(process.cwd(), `workflows/${workflowId}`);
  
  const dirs = [
    'materials/raw',
    'materials/source', // 脸源素材目录
    'materials/processed', 
    'materials/deleted',
    'logs',
    'output/model',
    'output/reports'
  ];
  
  // 如果是face_swap类型，添加target目录
  if (trainType === 'face_swap') {
    dirs.push('materials/target'); // 模特素材目录
  }
  
  for (const dir of dirs) {
    await fs.ensureDir(path.join(baseDir, dir));
  }
  
  // 保存目录结构信息
  const configPath = path.join(baseDir, 'config.json');
  await fs.writeJson(configPath, {
    workflowId,
    trainType,
    createdAt: new Date().toISOString(),
    directories: dirs
  }, { spaces: 2 });
  
  logger.info(`工作流目录创建成功: ${workflowId}`);
}

/**
 * 复制训练配置模板
 */
async function copyTrainingConfig(workflowId, trainType) {
  const sourcePath = path.join(process.cwd(), 'db/training-config.json');
  const targetPath = path.join(process.cwd(), `workflows/${workflowId}/training-config.json`);
  
  const trainingConfig = await fs.readJson(sourcePath);
  
  // 选择对应训练类型的默认配置
  const templateConfig = trainType && trainingConfig.templates[trainType] ? 
    trainingConfig.templates[trainType].default : 
    trainingConfig.templates.face_swap.default;
  
  // 添加硬件配置
  const configToSave = {
    ...templateConfig,
    hardware: trainingConfig.hardware,
    trainType: trainType || 'face_swap',
    updatedAt: new Date().toISOString()
  };
  
  await fs.writeJson(targetPath, configToSave, { spaces: 2 });
  
  logger.info(`训练配置已复制到工作流: ${workflowId}`);
}

/**
 * 检查是否有其他工作流正在训练
 */
async function checkTrainingWorkflow(excludeId) {
  const workflowsDir = path.join(process.cwd(), 'db/workflows');
  const files = await fs.readdir(workflowsDir);
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      const workflowId = file.replace('.json', '');
      if (workflowId === excludeId) continue;
      
      const workflowPath = path.join(workflowsDir, file);
      const workflow = await fs.readJson(workflowPath);
      
      if (workflow.status === WORKFLOW_STATUS.TRAINING) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * 获取工作流统计信息
 */
async function getWorkflowStats(workflowId) {
  const workflowDir = path.join(process.cwd(), `workflows/${workflowId}`);
  
  const stats = {
    materialsCount: 0,
    processedCount: 0,
    deletedCount: 0,
    totalSize: 0
  };
  
  try {
    // 统计原始素材
    const rawDir = path.join(workflowDir, 'materials/raw');
    if (await fs.pathExists(rawDir)) {
      const rawFiles = await fs.readdir(rawDir);
      stats.materialsCount = rawFiles.length;
    }
    
    // 统计处理后素材
    const processedDir = path.join(workflowDir, 'materials/processed');
    if (await fs.pathExists(processedDir)) {
      const processedFiles = await fs.readdir(processedDir);
      stats.processedCount = processedFiles.length;
    }
    
    // 统计删除的素材
    const deletedDir = path.join(workflowDir, 'materials/deleted');
    if (await fs.pathExists(deletedDir)) {
      const deletedFiles = await fs.readdir(deletedDir);
      stats.deletedCount = deletedFiles.length;
    }
    
  } catch (error) {
    logger.warn(`获取工作流统计信息失败: ${workflowId}`, error);
  }
  
  return stats;
}

module.exports = router; 