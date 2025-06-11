import request from '@/utils/request'

/**
 * 上传任务管理API
 */

// 创建上传任务
export function createUploadTask(workflowId, files, options = {}) {
  const formData = new FormData()
  
  // 添加文件
  if (Array.isArray(files)) {
    files.forEach(file => {
      formData.append('files', file)
    })
  } else {
    formData.append('files', files)
  }
  
  // 添加工作流ID
  formData.append('workflowId', workflowId)
  
  // 添加选项
  Object.keys(options).forEach(key => {
    formData.append(key, options[key])
  })
  
  return request({
    url: '/api/upload/tasks',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 获取所有上传任务
export function getUploadTasks(params = {}) {
  return request({
    url: '/api/upload/tasks',
    method: 'get',
    params
  })
}

// 获取特定上传任务详情
export function getUploadTask(taskId) {
  return request({
    url: `/api/upload/tasks/${taskId}`,
    method: 'get'
  })
}

// 暂停上传任务
export function pauseUploadTask(taskId) {
  return request({
    url: `/api/upload/tasks/${taskId}/pause`,
    method: 'post'
  })
}

// 恢复上传任务
export function resumeUploadTask(taskId) {
  return request({
    url: `/api/upload/tasks/${taskId}/resume`,
    method: 'post'
  })
}

// 取消上传任务
export function cancelUploadTask(taskId) {
  return request({
    url: `/api/upload/tasks/${taskId}/cancel`,
    method: 'post'
  })
}

// 重试上传任务
export function retryUploadTask(taskId) {
  return request({
    url: `/api/upload/tasks/${taskId}/retry`,
    method: 'post'
  })
}

// 删除上传任务
export function deleteUploadTask(taskId) {
  return request({
    url: `/api/upload/tasks/${taskId}`,
    method: 'delete'
  })
}

// 批量操作上传任务
export function batchUploadTasks(action, taskIds) {
  return request({
    url: '/api/upload/tasks/batch',
    method: 'post',
    data: {
      action, // 'pause' | 'resume' | 'cancel' | 'retry' | 'delete'
      taskIds
    }
  })
}

// 获取全局上传统计
export function getUploadStats() {
  return request({
    url: '/api/upload/stats',
    method: 'get'
  })
}

// 获取上传配置
export function getUploadConfig() {
  return request({
    url: '/api/upload/config',
    method: 'get'
  })
}

// 更新上传配置
export function updateUploadConfig(config) {
  return request({
    url: '/api/upload/config',
    method: 'put',
    data: config
  })
}

// 分片上传 - 上传单个分片
export function uploadChunk(taskId, chunkData) {
  const formData = new FormData()
  formData.append('chunk', chunkData.chunk)
  formData.append('chunkIndex', chunkData.chunkIndex)
  formData.append('totalChunks', chunkData.totalChunks)
  formData.append('fileHash', chunkData.fileHash)
  formData.append('fileName', chunkData.fileName)
  
  return request({
    url: `/api/upload/tasks/${taskId}/chunks`,
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 合并文件分片
export function mergeChunks(taskId, fileData) {
  return request({
    url: `/api/upload/tasks/${taskId}/merge`,
    method: 'post',
    data: fileData
  })
}

// 检查文件是否已存在
export function checkFileExists(fileHash, workflowId) {
  return request({
    url: '/api/upload/check-exists',
    method: 'post',
    data: {
      fileHash,
      workflowId
    }
  })
}

// 清理临时文件
export function cleanupTempFiles(taskId) {
  return request({
    url: `/api/upload/tasks/${taskId}/cleanup`,
    method: 'post'
  })
}

export default {
  createUploadTask,
  getUploadTasks,
  getUploadTask,
  pauseUploadTask,
  resumeUploadTask,
  cancelUploadTask,
  retryUploadTask,
  deleteUploadTask,
  batchUploadTasks,
  getUploadStats,
  getUploadConfig,
  updateUploadConfig,
  uploadChunk,
  mergeChunks,
  checkFileExists,
  cleanupTempFiles
} 