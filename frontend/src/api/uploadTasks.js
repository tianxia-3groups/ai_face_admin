import request from '@/utils/request'

// 上传任务API
export const uploadTasksApi = {
  // 创建上传任务
  async createTask(workflowId, files, metadata = {}) {
    const formData = new FormData()
    formData.append('workflowId', workflowId)
    formData.append('metadata', JSON.stringify(metadata))
    
    // 添加文件信息（不是实际文件，而是文件元数据）
    const fileInfos = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }))
    formData.append('files', JSON.stringify(fileInfos))
    
    return request({
      url: '/api/upload-tasks/create',
      method: 'post',
      data: formData
    })
  },

  // 获取任务状态
  async getTaskStatus(taskId) {
    return request({
      url: `/api/upload-tasks/status/${taskId}`,
      method: 'get'
    })
  },

  // 获取队列统计信息
  async getQueueStats() {
    return request({
      url: '/api/upload-tasks/stats',
      method: 'get'
    })
  },

  // 获取工作流相关的任务
  async getWorkflowTasks(workflowId) {
    return request({
      url: `/api/upload-tasks/workflow/${workflowId}`,
      method: 'get'
    })
  },

  // 取消任务
  async cancelTask(taskId) {
    return request({
      url: `/api/upload-tasks/cancel/${taskId}`,
      method: 'post'
    })
  },

  // 获取任务列表
  async getTaskList(params = {}) {
    return request({
      url: '/api/upload-tasks/list',
      method: 'get',
      params
    })
  },

  // 重试失败的任务
  async retryTask(taskId) {
    return request({
      url: `/api/upload-tasks/retry/${taskId}`,
      method: 'post'
    })
  }
}

export default uploadTasksApi 