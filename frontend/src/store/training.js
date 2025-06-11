import { defineStore } from 'pinia'
import { ref } from 'vue'
import { trainingApi } from '@/api/training'
import { ElMessage } from 'element-plus'

export const useTrainingStore = defineStore('training', () => {
  // 状态
  const currentTraining = ref(null)
  const trainingLogs = ref([])
  const trainingStatus = ref(null)
  const trainingProgress = ref(0)

  // 动作
  const startTraining = async (workflowId, config) => {
    try {
      const response = await trainingApi.start(workflowId, config)
      
      if (response.success) {
        currentTraining.value = response.training
        ElMessage.success('训练已开始')
        return true
      }
      return false
    } catch (error) {
      ElMessage.error(error.message || '开始训练失败')
      return false
    }
  }

  const stopTraining = async (workflowId) => {
    try {
      const response = await trainingApi.stop(workflowId)
      
      if (response.success) {
        currentTraining.value = null
        trainingStatus.value = 'stopped'
        ElMessage.success('训练已停止')
        return true
      }
      return false
    } catch (error) {
      ElMessage.error(error.message || '停止训练失败')
      return false
    }
  }

  const getTrainingStatus = async (workflowId) => {
    try {
      const response = await trainingApi.getStatus(workflowId)
      trainingStatus.value = response.status
      trainingProgress.value = response.progress || 0
      return response
    } catch (error) {
      console.error('获取训练状态失败:', error)
      return null
    }
  }

  const fetchTrainingLogs = async (workflowId, lines = 100) => {
    try {
      const response = await trainingApi.getLogs(workflowId, lines)
      trainingLogs.value = response.logs || []
      return response.logs
    } catch (error) {
      console.error('获取训练日志失败:', error)
      return []
    }
  }

  const updateTrainingProgress = (progress, status) => {
    trainingProgress.value = progress
    trainingStatus.value = status
  }

  const addTrainingLog = (log) => {
    trainingLogs.value.push(log)
    // 保持最新的1000条日志
    if (trainingLogs.value.length > 1000) {
      trainingLogs.value = trainingLogs.value.slice(-1000)
    }
  }

  const clearTrainingLogs = () => {
    trainingLogs.value = []
  }

  return {
    // 状态
    currentTraining,
    trainingLogs,
    trainingStatus,
    trainingProgress,
    
    // 动作
    startTraining,
    stopTraining,
    getTrainingStatus,
    fetchTrainingLogs,
    updateTrainingProgress,
    addTrainingLog,
    clearTrainingLogs
  }
}) 