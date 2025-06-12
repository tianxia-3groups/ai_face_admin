import request from '@/utils/request'

export const settingsApi = {
  // 获取上传配置
  getUploadConfig: () => {
    return request.get('/api/settings/upload')
  },

  // 保存上传配置
  saveUploadConfig: (config) => {
    return request.post('/api/settings/upload', config)
  },

  // 获取训练配置
  getTrainingConfig: () => {
    return request.get('/api/settings/training')
  },

  // 保存训练配置
  saveTrainingConfig: (config) => {
    return request.post('/api/settings/training', config)
  },

  // 获取系统信息
  getSystemInfo: () => {
    return request.get('/api/settings/system-info')
  },

  // 导出设置
  exportSettings: () => {
    return request.get('/api/settings/export')
  },

  // 导入设置
  importSettings: (settings) => {
    return request.post('/api/settings/import', settings)
  },

  // 获取DeepFaceLab目录配置
  getDeepFaceLabDir: () => {
    return request.get('/api/settings/deepfacelab-dir')
  },

  // 保存DeepFaceLab目录配置
  saveDeepFaceLabDir: (config) => {
    return request.post('/api/settings/deepfacelab-dir', config)
  }
} 