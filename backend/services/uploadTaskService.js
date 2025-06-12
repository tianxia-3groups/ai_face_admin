const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class UploadTaskService {
  constructor() {
    this.taskQueue = []; // 上传任务队列
    this.activeTasks = new Map(); // 当前活跃任务 Map<taskId, TaskInfo>
    this.completedTasks = new Map(); // 已完成任务
    this.taskIdCounter = 0; // 任务ID计数器
    this.maxConcurrent = 3; // 默认最大并发数，从配置文件读取
    this.isProcessing = false; // 防止重复处理队列
    
    this.loadConfig();
  }

  // 加载配置
  async loadConfig() {
    try {
      const configPath = path.join(__dirname, '../../db/upload-config.json');
      const configData = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);
      this.maxConcurrent = config.maxConcurrentFiles || 3;
      logger.info(`上传配置加载完成，最大并发数: ${this.maxConcurrent}`);
    } catch (error) {
      logger.warn('上传配置文件不存在，使用默认配置');
      // 创建默认配置文件
      await this.createDefaultConfig();
    }
  }

  // 创建默认配置文件
  async createDefaultConfig() {
    const defaultConfig = {
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

    try {
      const configPath = path.join(__dirname, '../../db/upload-config.json');
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      logger.info('默认上传配置文件已创建');
    } catch (error) {
      logger.error('创建默认配置文件失败:', error);
    }
  }

  // 创建上传任务
  async createUploadTask(workflowId, files, metadata = {}) {
    const taskId = `upload_${Date.now()}_${++this.taskIdCounter}`;
    
    // 确保工作流目录存在
    const uploadPath = path.join(__dirname, `../../workflows/${workflowId}/materials/raw/`);
    await fs.mkdir(uploadPath, { recursive: true });

    const task = {
      id: taskId,
      workflowId: workflowId,
      files: files, // 文件信息数组
      status: 'waiting',
      progress: 0,
      uploadPath: uploadPath,
      createdAt: new Date(),
      metadata: metadata,
      retryCount: 0,
      errors: []
    };

    this.taskQueue.push(task);
    logger.info(`创建上传任务: ${taskId}, 工作流: ${workflowId}, 文件数: ${files.length}`);
    
    // 异步处理队列
    this.processQueue();
    
    return taskId;
  }

  // 处理任务队列
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.activeTasks.size < this.maxConcurrent && this.taskQueue.length > 0) {
        const task = this.taskQueue.shift();
        await this.startTask(task);
      }
    } catch (error) {
      logger.error('处理任务队列时出错:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // 开始执行任务
  async startTask(task) {
    this.activeTasks.set(task.id, task);
    task.status = 'uploading';
    task.startedAt = new Date();

    logger.info(`开始处理上传任务: ${task.id}`);

    try {
      // 这里应该调用实际的文件上传逻辑
      await this.uploadFiles(task);
      
      task.status = 'completed';
      task.completedAt = new Date();
      task.progress = 100;
      
      // 移到已完成任务
      this.completedTasks.set(task.id, task);
      
      // 通知工作流管理器
      await this.notifyWorkflow(task.workflowId, 'upload_completed', task.id);
      
      logger.info(`上传任务完成: ${task.id}`);
      
    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
      task.errors.push({
        message: error.message,
        timestamp: new Date(),
        attempt: task.retryCount + 1
      });

      logger.error(`上传任务失败: ${task.id}, 错误: ${error.message}`);
      
      // 重试逻辑
      if (task.retryCount < 3) {
        task.retryCount++;
        task.status = 'waiting';
        this.taskQueue.push(task);
        logger.info(`任务 ${task.id} 准备第 ${task.retryCount} 次重试`);
      } else {
        await this.notifyWorkflow(task.workflowId, 'upload_failed', task.id);
      }
    } finally {
      this.activeTasks.delete(task.id);
      // 继续处理队列
      setTimeout(() => this.processQueue(), 100);
    }
  }

  // 模拟文件上传（实际实现时需要处理真实的文件上传）
  async uploadFiles(task) {
    const uploadPromises = task.files.map((file, index) => 
      this.uploadSingleFile(task, file, index)
    );

    await Promise.all(uploadPromises);
  }

  // 上传单个文件
  async uploadSingleFile(task, fileInfo, fileIndex) {
    return new Promise((resolve, reject) => {
      // 模拟上传过程
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          // 更新任务总进度
          const fileProgress = 100 / task.files.length;
          task.progress = Math.min(100, task.progress + fileProgress);
          
          logger.info(`文件上传完成: ${fileInfo.name}, 任务: ${task.id}`);
          resolve();
        }
      }, 200 + Math.random() * 300); // 随机延迟模拟网络
    });
  }

  // 通知工作流管理器
  async notifyWorkflow(workflowId, event, taskId) {
    try {
      // 这里应该通过事件系统或直接调用工作流管理器
      // 暂时记录日志
      logger.info(`通知工作流 ${workflowId}: ${event}, 任务: ${taskId}`);
      
      // TODO: 实现工作流通知机制
      // const WorkflowManager = require('./workflowService');
      // WorkflowManager.handleUploadEvent(workflowId, event, taskId);
      
    } catch (error) {
      logger.error('通知工作流失败:', error);
    }
  }

  // 获取任务状态
  getTaskStatus(taskId) {
    // 先在活跃任务中查找
    if (this.activeTasks.has(taskId)) {
      return this.activeTasks.get(taskId);
    }
    
    // 再在已完成任务中查找
    if (this.completedTasks.has(taskId)) {
      return this.completedTasks.get(taskId);
    }
    
    // 在队列中查找
    const queuedTask = this.taskQueue.find(task => task.id === taskId);
    if (queuedTask) {
      return queuedTask;
    }
    
    return null;
  }

  // 获取队列统计信息
  getQueueStats() {
    return {
      waiting: this.taskQueue.length,
      uploading: this.activeTasks.size,
      completed: this.completedTasks.size,
      total: this.taskQueue.length + this.activeTasks.size + this.completedTasks.size
    };
  }

  // 获取工作流相关的任务
  getWorkflowTasks(workflowId) {
    const tasks = [];
    
    // 队列中的任务
    tasks.push(...this.taskQueue.filter(task => task.workflowId === workflowId));
    
    // 活跃任务
    for (const task of this.activeTasks.values()) {
      if (task.workflowId === workflowId) {
        tasks.push(task);
      }
    }
    
    // 已完成任务
    for (const task of this.completedTasks.values()) {
      if (task.workflowId === workflowId) {
        tasks.push(task);
      }
    }
    
    return tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  // 获取所有任务
  getAllTasks() {
    const tasks = [];
    
    // 队列中的任务
    tasks.push(...this.taskQueue);
    
    // 活跃任务
    for (const task of this.activeTasks.values()) {
      tasks.push(task);
    }
    
    // 已完成任务
    for (const task of this.completedTasks.values()) {
      tasks.push(task);
    }
    
    return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // 取消任务
  async cancelTask(taskId) {
    // 从队列中移除
    const queueIndex = this.taskQueue.findIndex(task => task.id === taskId);
    if (queueIndex > -1) {
      const task = this.taskQueue.splice(queueIndex, 1)[0];
      task.status = 'cancelled';
      logger.info(`任务 ${taskId} 已从队列中取消`);
      return true;
    }
    
    // 如果是活跃任务，标记为取消（实际实现需要中断上传）
    if (this.activeTasks.has(taskId)) {
      const task = this.activeTasks.get(taskId);
      task.status = 'cancelled';
      logger.info(`任务 ${taskId} 已标记为取消`);
      return true;
    }
    
    return false;
  }
}

// 创建单例实例
const uploadTaskService = new UploadTaskService();

module.exports = uploadTaskService; 