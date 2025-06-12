const express = require('express')
const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const logger = require('../utils/logger')

const router = express.Router()

// 配置文件路径
const settingsPath = path.join(process.cwd(), 'db/settings.json')
const uploadConfigPath = path.join(process.cwd(), 'db/upload-config.json')
const trainingConfigPath = path.join(process.cwd(), 'db/training-config.json')

// 确保配置文件存在
const ensureConfigFiles = async () => {
  try {
    // 创建db目录
    await fs.ensureDir(path.dirname(settingsPath))
    
    // 创建默认设置文件
    const defaultSettings = {
      deepfacelabDir: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const defaultUploadConfig = {
      maxConcurrentFiles: 3,
      maxConcurrentWorkflows: 1,
      chunkSize: '2MB',
      maxFileSize: '500MB',
      retryAttempts: 3,
      allowedFileTypes: [
        'image/jpeg',
        'image/png', 
        'image/webp',
        'video/mp4',
        'video/avi',
        'video/mov'
      ]
    }
    
    const defaultTrainingConfig = {
      defaultEpochs: 1000,
      batchSize: 4,
      learningRate: 0.0002,
      gpuDevice: 'auto',
      deepfacelabDir: ''
    }
    
    if (!await fs.pathExists(settingsPath)) {
      await fs.writeJson(settingsPath, defaultSettings, { spaces: 2 })
    }
    
    if (!await fs.pathExists(uploadConfigPath)) {
      await fs.writeJson(uploadConfigPath, defaultUploadConfig, { spaces: 2 })
    }
    
    if (!await fs.pathExists(trainingConfigPath)) {
      await fs.writeJson(trainingConfigPath, defaultTrainingConfig, { spaces: 2 })
    }
  } catch (error) {
    logger.error('创建配置文件失败:', error)
  }
}

// 初始化配置文件
ensureConfigFiles()

/**
 * 获取上传配置
 */
router.get('/upload', async (req, res) => {
  try {
    const config = await fs.readJson(uploadConfigPath)
    res.json({
      success: true,
      data: config
    })
  } catch (error) {
    logger.error('获取上传配置失败:', error)
    res.status(500).json({
      success: false,
      message: '获取配置失败'
    })
  }
})

/**
 * 保存上传配置
 */
router.post('/upload', async (req, res) => {
  try {
    const config = req.body
    config.updatedAt = new Date().toISOString()
    
    await fs.writeJson(uploadConfigPath, config, { spaces: 2 })
    
    logger.info('上传配置已更新')
    res.json({
      success: true,
      message: '配置保存成功'
    })
  } catch (error) {
    logger.error('保存上传配置失败:', error)
    res.status(500).json({
      success: false,
      message: '保存配置失败'
    })
  }
})

/**
 * 获取训练配置
 */
router.get('/training', async (req, res) => {
  try {
    const config = await fs.readJson(trainingConfigPath)
    res.json({
      success: true,
      data: config
    })
  } catch (error) {
    logger.error('获取训练配置失败:', error)
    res.status(500).json({
      success: false,
      message: '获取配置失败'
    })
  }
})

/**
 * 保存训练配置
 */
router.post('/training', async (req, res) => {
  try {
    const config = req.body
    config.updatedAt = new Date().toISOString()
    
    await fs.writeJson(trainingConfigPath, config, { spaces: 2 })
    
    logger.info('训练配置已更新', { deepfacelabDir: config.deepfacelabDir })
    res.json({
      success: true,
      message: '配置保存成功'
    })
  } catch (error) {
    logger.error('保存训练配置失败:', error)
    res.status(500).json({
      success: false,
      message: '保存配置失败'
    })
  }
})

/**
 * 获取DeepFaceLab目录配置
 */
router.get('/deepfacelab-dir', async (req, res) => {
  try {
    const config = await fs.readJson(trainingConfigPath)
    res.json({
      success: true,
      data: {
        deepfacelabDir: config.deepfacelabDir || ''
      }
    })
  } catch (error) {
    logger.error('获取DeepFaceLab目录失败:', error)
    res.json({
      success: true,
      data: {
        deepfacelabDir: ''
      }
    })
  }
})

/**
 * 保存DeepFaceLab目录配置
 */
router.post('/deepfacelab-dir', async (req, res) => {
  try {
    const { deepfacelabDir } = req.body
    
    // 验证目录是否存在
    if (deepfacelabDir && !await fs.pathExists(deepfacelabDir)) {
      return res.status(400).json({
        success: false,
        message: '指定的目录不存在'
      })
    }
    
    // 更新训练配置中的DeepFaceLab目录
    const config = await fs.readJson(trainingConfigPath)
    config.deepfacelabDir = deepfacelabDir
    config.updatedAt = new Date().toISOString()
    
    await fs.writeJson(trainingConfigPath, config, { spaces: 2 })
    
    logger.info('DeepFaceLab目录已更新:', deepfacelabDir)
    res.json({
      success: true,
      message: 'DeepFaceLab目录配置成功'
    })
  } catch (error) {
    logger.error('保存DeepFaceLab目录失败:', error)
    res.status(500).json({
      success: false,
      message: '保存配置失败'
    })
  }
})

/**
 * 获取系统信息
 */
router.get('/system-info', async (req, res) => {
  try {
    const systemInfo = {
      uptime: formatUptime(os.uptime()),
      cpuUsage: Math.round(Math.random() * 100), // 模拟数据
      memoryUsage: Math.round((1 - os.freemem() / os.totalmem()) * 100),
      diskUsage: Math.round(Math.random() * 100), // 模拟数据
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
      freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024) + 'GB'
    }
    
    res.json({
      success: true,
      data: systemInfo
    })
  } catch (error) {
    logger.error('获取系统信息失败:', error)
    res.status(500).json({
      success: false,
      message: '获取系统信息失败'
    })
  }
})

/**
 * 导出设置
 */
router.get('/export', async (req, res) => {
  try {
    const [settings, uploadConfig, trainingConfig] = await Promise.all([
      fs.readJson(settingsPath).catch(() => ({})),
      fs.readJson(uploadConfigPath).catch(() => ({})),
      fs.readJson(trainingConfigPath).catch(() => ({}))
    ])
    
    const exportData = {
      settings,
      uploadConfig,
      trainingConfig,
      exportTime: new Date().toISOString(),
      version: '1.0.0'
    }
    
    res.json({
      success: true,
      data: exportData
    })
  } catch (error) {
    logger.error('导出设置失败:', error)
    res.status(500).json({
      success: false,
      message: '导出设置失败'
    })
  }
})

/**
 * 导入设置
 */
router.post('/import', async (req, res) => {
  try {
    const { settings, uploadConfig, trainingConfig } = req.body
    
    if (settings) {
      await fs.writeJson(settingsPath, settings, { spaces: 2 })
    }
    
    if (uploadConfig) {
      await fs.writeJson(uploadConfigPath, uploadConfig, { spaces: 2 })
    }
    
    if (trainingConfig) {
      await fs.writeJson(trainingConfigPath, trainingConfig, { spaces: 2 })
    }
    
    logger.info('设置导入成功')
    res.json({
      success: true,
      message: '设置导入成功'
    })
  } catch (error) {
    logger.error('导入设置失败:', error)
    res.status(500).json({
      success: false,
      message: '导入设置失败'
    })
  }
})

// 辅助函数：格式化运行时间
function formatUptime(uptime) {
  const days = Math.floor(uptime / 86400)
  const hours = Math.floor((uptime % 86400) / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  
  if (days > 0) {
    return `${days}天 ${hours}小时`
  } else if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`
  } else {
    return `${minutes}分钟`
  }
}

module.exports = router 