const express = require('express');
const router = express.Router();
const uploadTaskService = require('../services/uploadTaskService');
const logger = require('../utils/logger');

// 创建上传任务
router.post('/create', async (req, res) => {
  try {
    const { workflowId, files, metadata } = req.body;
    
    if (!workflowId || !files || !Array.isArray(files)) {
      return res.status(400).json({
        success: false,
        message: '参数错误：需要提供workflowId和files数组'
      });
    }

    const taskId = await uploadTaskService.createUploadTask(workflowId, files, metadata);
    
    res.json({
      success: true,
      data: { taskId },
      message: '上传任务创建成功'
    });

  } catch (error) {
    logger.error('创建上传任务失败:', error);
    res.status(500).json({
      success: false,
      message: '创建上传任务失败: ' + error.message
    });
  }
});

// 获取任务状态
router.get('/status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = uploadTaskService.getTaskStatus(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    res.json({
      success: true,
      data: {
        id: task.id,
        workflowId: task.workflowId,
        status: task.status,
        progress: task.progress,
        fileCount: task.files.length,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        error: task.error,
        retryCount: task.retryCount
      }
    });

  } catch (error) {
    logger.error('获取任务状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务状态失败: ' + error.message
    });
  }
});

// 获取队列统计信息
router.get('/stats', async (req, res) => {
  try {
    const stats = uploadTaskService.getQueueStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('获取队列统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取队列统计失败: ' + error.message
    });
  }
});

// 获取工作流相关的任务
router.get('/workflow/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const tasks = uploadTaskService.getWorkflowTasks(workflowId);
    
    // 只返回必要的信息
    const simplifiedTasks = tasks.map(task => ({
      id: task.id,
      status: task.status,
      progress: task.progress,
      fileCount: task.files.length,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      error: task.error
    }));

    res.json({
      success: true,
      data: simplifiedTasks
    });

  } catch (error) {
    logger.error('获取工作流任务失败:', error);
    res.status(500).json({
      success: false,
      message: '获取工作流任务失败: ' + error.message
    });
  }
});

// 取消任务
router.post('/cancel/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const cancelled = await uploadTaskService.cancelTask(taskId);
    
    if (cancelled) {
      res.json({
        success: true,
        message: '任务已取消'
      });
    } else {
      res.status(404).json({
        success: false,
        message: '任务不存在或无法取消'
      });
    }

  } catch (error) {
    logger.error('取消任务失败:', error);
    res.status(500).json({
      success: false,
      message: '取消任务失败: ' + error.message
    });
  }
});

// 获取所有任务列表
router.get('/', async (req, res) => {
  try {
    const tasks = uploadTaskService.getAllTasks();
    
    // 返回简化的任务信息
    const simplifiedTasks = tasks.map(task => ({
      id: task.id,
      workflowId: task.workflowId,
      status: task.status,
      progress: task.progress,
      fileCount: task.files.length,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      error: task.error
    }));

    res.json({
      success: true,
      data: simplifiedTasks
    });

  } catch (error) {
    logger.error('获取任务列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务列表失败: ' + error.message
    });
  }
});

// 获取所有任务列表（分页）
router.get('/list', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, workflowId } = req.query;
    const stats = uploadTaskService.getQueueStats();
    
    // 这里需要扩展服务以支持分页查询
    // 暂时返回统计信息
    res.json({
      success: true,
      data: {
        stats,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: stats.total
        }
      }
    });

  } catch (error) {
    logger.error('获取任务列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务列表失败: ' + error.message
    });
  }
});

module.exports = router; 