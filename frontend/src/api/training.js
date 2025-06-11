import { request } from '@/utils/request'

export const trainingApi = {
  // 开始训练
  start: (workflowId, config) => {
    return request.post(`/api/training/${workflowId}/start`, config)
  },

  // 停止训练
  stop: (workflowId) => {
    return request.post(`/api/training/${workflowId}/stop`)
  },

  // 获取训练状态
  getStatus: (workflowId) => {
    return request.get(`/api/training/${workflowId}/status`)
  },

  // 获取训练进度
  getProgress: (workflowId) => {
    return request.get(`/api/training/${workflowId}/progress`)
  },

  // 获取训练日志
  getLogs: (workflowId, lines = 100) => {
    return request.get(`/api/training/${workflowId}/logs`, {
      params: { lines }
    })
  },

  // 获取训练配置
  getConfig: (workflowId) => {
    return request.get(`/api/training/${workflowId}/config`)
  },

  // 更新训练配置
  updateConfig: (workflowId, config) => {
    return request.put(`/api/training/${workflowId}/config`, config)
  }
} 