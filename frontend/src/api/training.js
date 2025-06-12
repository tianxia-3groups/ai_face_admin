import { request } from '@/utils/request'

export const trainingApi = {
  /**
   * 获取训练配置
   * @param {string} workflowId 工作流ID 
   * @returns {Promise<Object>} 配置对象
   */
  getConfig(workflowId) {
    return request({
      url: `/api/training/${workflowId}/config`,
      method: 'get'
    })
  },
  
  /**
   * 更新训练配置
   * @param {string} workflowId 工作流ID
   * @param {Object} config 配置对象
   * @returns {Promise<Object>} 更新结果
   */
  updateConfig(workflowId, config) {
    return request({
      url: `/api/training/${workflowId}/config`,
      method: 'put',
      data: { config }
    })
  },
  
  /**
   * 开始训练
   * @param {string} workflowId 工作流ID
   * @returns {Promise<Object>} 训练开始结果
   */
  startTraining(workflowId) {
    return request({
      url: `/api/training/${workflowId}/start`,
      method: 'post'
    })
  },
  
  /**
   * 停止训练
   * @param {string} workflowId 工作流ID
   * @returns {Promise<Object>} 训练停止结果
   */
  stopTraining(workflowId) {
    return request({
      url: `/api/training/${workflowId}/stop`,
      method: 'post'
    })
  },
  
  /**
   * 获取训练状态
   * @param {string} workflowId 工作流ID
   * @returns {Promise<Object>} 训练状态
   */
  getStatus(workflowId) {
    return request({
      url: `/api/training/${workflowId}/status`,
      method: 'get'
    })
  },
  
  /**
   * 获取训练日志
   * @param {string} workflowId 工作流ID
   * @param {number} lines 获取的行数，默认100行
   * @returns {Promise<Object>} 训练日志
   */
  getLogs(workflowId, lines = 100) {
    return request({
      url: `/api/training/${workflowId}/logs`,
      method: 'get',
      params: { lines }
    })
  },
  
  /**
   * 获取支持的训练类型
   * @returns {Promise<Object>} 训练类型列表
   */
  getTypes() {
    return request({
      url: `/api/training/types`,
      method: 'get'
    })
  },
  
  /**
   * 获取指定类型的配置模板
   * @param {string} type 训练类型
   * @returns {Promise<Object>} 配置模板
   */
  getTemplates(type) {
    return request({
      url: `/api/training/templates/${type}`,
      method: 'get'
    })
  },
  
  /**
   * 验证素材是否符合训练类型要求
   * @param {string} workflowId 工作流ID
   * @param {string} type 训练类型
   * @returns {Promise<Object>} 验证结果
   */
  validateMaterials(workflowId, type) {
    return request({
      url: `/api/training/validate-materials`,
      method: 'post',
      data: { workflowId, type }
    })
  },
  
  /**
   * 获取训练类型的素材要求
   * @param {string} type 训练类型
   * @returns {Promise<Object>} 素材要求
   */
  getRequirements(type) {
    return request({
      url: `/api/training/requirements/${type}`,
      method: 'get'
    })
  }
} 