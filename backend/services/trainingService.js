// 训练服务
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const logger = require('../utils/logger');
const FileService = require('./fileService');
const trainingConfig = require('../config/training');

class TrainingService {
  constructor() {
    this.runningTraining = null; // 当前运行的训练进程
    this.trainingStatus = new Map(); // 训练状态管理
  }

  /**
   * 检查是否有训练正在运行
   */
  isTrainingRunning() {
    return this.runningTraining !== null;
  }

  /**
   * 获取当前运行的训练ID
   */
  getRunningTrainingId() {
    return this.runningTraining?.workflowId || null;
  }

  /**
   * 启动训练
   */
  async startTraining(workflowId, config = {}) {
    try {
      // 检查是否已有训练在运行
      if (this.isTrainingRunning()) {
        throw new Error(`训练冲突：工作流 ${this.getRunningTrainingId()} 正在训练中`);
      }

      // 验证工作流目录和配置
      const workflowDir = path.join(process.cwd(), 'workflows', workflowId);
      if (!await FileService.exists(workflowDir)) {
        throw new Error(`工作流目录不存在: ${workflowId}`);
      }

      // 合并配置
      const finalConfig = {
        ...trainingConfig.defaultParams,
        ...config
      };

      // 保存训练配置
      const configPath = path.join(workflowDir, 'training-config.json');
      await FileService.writeJson(configPath, finalConfig);

      // 准备训练参数
      const scriptPath = trainingConfig.scripts.trainScript;
      const pythonPath = trainingConfig.scripts.pythonPath;
      const materialPath = path.join(workflowDir, 'materials', 'processed');
      const outputPath = path.join(workflowDir, 'output');

      // 确保输出目录存在
      await FileService.ensureDir(outputPath);

      // 构建命令参数
      const args = [
        scriptPath,
        '--workspace', workflowDir,
        '--materials', materialPath,
        '--output', outputPath,
        '--config', configPath
      ];

      logger.info(`启动训练进程: ${pythonPath} ${args.join(' ')}`);

      // 启动训练进程
      const trainingProcess = spawn(pythonPath, args, {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // 设置当前运行的训练
      this.runningTraining = {
        workflowId,
        process: trainingProcess,
        startTime: new Date(),
        pid: trainingProcess.pid
      };

      // 初始化训练状态
      this.trainingStatus.set(workflowId, {
        status: 'TRAINING',
        progress: 0,
        currentEpoch: 0,
        totalEpochs: finalConfig.epochs,
        loss: null,
        accuracy: null,
        startTime: new Date(),
        logs: []
      });

      // 设置进程事件监听
      this.setupProcessListeners(workflowId, trainingProcess);

      return {
        success: true,
        workflowId,
        pid: trainingProcess.pid,
        message: '训练已启动'
      };

    } catch (error) {
      logger.error('启动训练失败:', error);
      throw error;
    }
  }

  /**
   * 设置进程监听器
   */
  setupProcessListeners(workflowId, process) {
    const logPath = path.join(process.cwd(), 'workflows', workflowId, 'logs', 'training.log');
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });

    // 监听标准输出
    process.stdout.on('data', (data) => {
      const logLine = data.toString();
      logStream.write(`${new Date().toISOString()} [STDOUT] ${logLine}`);
      
      // 解析训练进度
      this.parseTrainingProgress(workflowId, logLine);
      
      logger.info(`[Training ${workflowId}] ${logLine.trim()}`);
    });

    // 监听标准错误
    process.stderr.on('data', (data) => {
      const errorLine = data.toString();
      logStream.write(`${new Date().toISOString()} [STDERR] ${errorLine}`);
      logger.error(`[Training ${workflowId}] ${errorLine.trim()}`);
    });

    // 监听进程结束
    process.on('close', (code) => {
      logStream.end();
      
      if (code === 0) {
        this.onTrainingSuccess(workflowId);
      } else {
        this.onTrainingFailure(workflowId, code);
      }
      
      // 清理运行状态
      this.runningTraining = null;
    });

    // 监听进程错误
    process.on('error', (error) => {
      logger.error(`训练进程错误 [${workflowId}]:`, error);
      this.onTrainingFailure(workflowId, -1, error.message);
      this.runningTraining = null;
    });
  }

  /**
   * 解析训练进度
   */
  parseTrainingProgress(workflowId, logLine) {
    try {
      const status = this.trainingStatus.get(workflowId);
      if (!status) return;

      // 解析epoch信息
      const epochMatch = logLine.match(/Epoch (\d+)\/(\d+)/);
      if (epochMatch) {
        status.currentEpoch = parseInt(epochMatch[1]);
        status.totalEpochs = parseInt(epochMatch[2]);
        status.progress = Math.round((status.currentEpoch / status.totalEpochs) * 100);
      }

      // 解析loss信息
      const lossMatch = logLine.match(/loss: ([\d.]+)/);
      if (lossMatch) {
        status.loss = parseFloat(lossMatch[1]);
      }

      // 解析accuracy信息
      const accMatch = logLine.match(/accuracy: ([\d.]+)/);
      if (accMatch) {
        status.accuracy = parseFloat(accMatch[1]);
      }

      // 添加到日志
      status.logs.push({
        timestamp: new Date(),
        message: logLine.trim()
      });

      // 保持最近100条日志
      if (status.logs.length > 100) {
        status.logs = status.logs.slice(-100);
      }

      this.trainingStatus.set(workflowId, status);

    } catch (error) {
      logger.error('解析训练进度失败:', error);
    }
  }

  /**
   * 训练成功处理
   */
  onTrainingSuccess(workflowId) {
    logger.info(`训练完成: ${workflowId}`);
    
    const status = this.trainingStatus.get(workflowId);
    if (status) {
      status.status = 'TRAINING_COMPLETED';
      status.progress = 100;
      status.endTime = new Date();
      this.trainingStatus.set(workflowId, status);
    }
  }

  /**
   * 训练失败处理
   */
  onTrainingFailure(workflowId, exitCode, errorMessage = null) {
    logger.error(`训练失败: ${workflowId}, 退出码: ${exitCode}`);
    
    const status = this.trainingStatus.get(workflowId);
    if (status) {
      status.status = 'TRAINING_FAILED';
      status.exitCode = exitCode;
      status.errorMessage = errorMessage;
      status.endTime = new Date();
      this.trainingStatus.set(workflowId, status);
    }
  }

  /**
   * 停止训练
   */
  async stopTraining(workflowId) {
    try {
      if (!this.runningTraining || this.runningTraining.workflowId !== workflowId) {
        throw new Error(`工作流 ${workflowId} 没有正在运行的训练`);
      }

      const process = this.runningTraining.process;
      
      // 发送终止信号
      process.kill('SIGTERM');
      
      // 等待进程结束
      await new Promise((resolve) => {
        process.on('close', resolve);
        
        // 5秒后强制杀死
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
        }, 5000);
      });

      // 更新状态
      const status = this.trainingStatus.get(workflowId);
      if (status) {
        status.status = 'CANCELLED';
        status.endTime = new Date();
        this.trainingStatus.set(workflowId, status);
      }

      this.runningTraining = null;
      
      logger.info(`训练已停止: ${workflowId}`);
      return { success: true, message: '训练已停止' };

    } catch (error) {
      logger.error('停止训练失败:', error);
      throw error;
    }
  }

  /**
   * 获取训练状态
   */
  getTrainingStatus(workflowId) {
    return this.trainingStatus.get(workflowId) || null;
  }

  /**
   * 获取所有训练状态
   */
  getAllTrainingStatus() {
    return Object.fromEntries(this.trainingStatus);
  }

  /**
   * 清理训练状态
   */
  clearTrainingStatus(workflowId) {
    this.trainingStatus.delete(workflowId);
  }

  /**
   * 获取训练日志
   */
  async getTrainingLogs(workflowId, lines = 100) {
    try {
      const logPath = path.join(process.cwd(), 'workflows', workflowId, 'logs', 'training.log');
      
      if (!await FileService.exists(logPath)) {
        return [];
      }

      const content = await fs.readFile(logPath, 'utf8');
      const logLines = content.split('\n').filter(line => line.trim());
      
      return logLines.slice(-lines);

    } catch (error) {
      logger.error('读取训练日志失败:', error);
      return [];
    }
  }
}

// 创建单例实例
const trainingService = new TrainingService();

module.exports = trainingService; 