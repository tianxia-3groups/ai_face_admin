import { request } from '@/utils/request'

export const workflowApi = {
  // 获取工作流列表
  list: (params = {}) => {
    return request.get('/api/workflow', { params })
  },

  // 创建工作流
  create: (data) => {
    return request.post('/api/workflow', data)
  },

  // 获取工作流详情
  get: (id) => {
    return request.get(`/api/workflow/${id}`)
  },

  // 更新工作流
  update: (id, data) => {
    return request.put(`/api/workflow/${id}`, data)
  },

  // 删除工作流
  delete: (id) => {
    return request.delete(`/api/workflow/${id}`)
  },

  // 获取工作流状态
  getStatus: (id) => {
    return request.get(`/api/workflow/${id}/status`)
  },

  // 更新工作流状态
  updateStatus: (id, status, message = null, progress = null) => {
    return request.put(`/api/workflow/${id}/status`, { status, message, progress })
  },

  // 获取工作流统计
  getStats: (id) => {
    return request.get(`/api/workflow/${id}/stats`)
  },

  // 获取仪表板数据
  getDashboardData: () => {
    return request.get('/api/workflow/dashboard')
  }
} 