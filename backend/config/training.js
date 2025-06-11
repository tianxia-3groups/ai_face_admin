// 训练配置
module.exports = {
  // 默认训练参数
  defaultParams: {
    learningRate: 0.001,
    epochs: 100,
    batchSize: 32,
    validationSplit: 0.2,
    patience: 10,
    minDelta: 0.001
  },
  
  // 训练脚本配置
  scripts: {
    trainScript: process.env.TRAIN_SCRIPT_PATH || './scripts/train.py',
    pythonPath: process.env.PYTHON_PATH || 'python'
  },
  
  // 资源限制
  resources: {
    maxConcurrentTraining: 1, // 同时只能一个训练
    gpuMemoryLimit: process.env.GPU_MEMORY_LIMIT || '8GB',
    timeoutHours: parseInt(process.env.TRAINING_TIMEOUT_HOURS) || 24
  },
  
  // 监控配置
  monitoring: {
    logInterval: 10, // 日志更新间隔（秒）
    saveCheckpointInterval: 100, // 检查点保存间隔（epoch）
    metricsToTrack: ['loss', 'accuracy', 'val_loss', 'val_accuracy']
  }
}; 