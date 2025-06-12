import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadApi } from '@/api/upload'

export const useUploadStore = defineStore('upload', () => {
  // 状态
  const uploadQueue = ref([])
  const isUploading = ref(false)
  const globalProgress = ref(0)

  // 计算属性
  const uploadingFiles = computed(() => 
    uploadQueue.value.filter(item => item.status === 'uploading')
  )
  
  const completedFiles = computed(() => 
    uploadQueue.value.filter(item => item.status === 'completed')
  )
  
  const failedFiles = computed(() => 
    uploadQueue.value.filter(item => item.status === 'failed')
  )
  
  const totalFiles = computed(() => uploadQueue.value.length)
  
  const uploadingCount = computed(() => uploadingFiles.value.length)
  
  const hasUploading = computed(() => uploadingCount.value > 0)
  
  // 任务统计
  const tasks = computed(() => uploadQueue.value)
  
  const taskStats = computed(() => ({
    total: totalFiles.value,
    uploading: uploadingFiles.value.length,
    waiting: uploadQueue.value.filter(t => t.status === 'pending').length,
    completed: completedFiles.value.length,
    failed: failedFiles.value.length
  }))

  // 动作
  const addUploadTask = (task) => {
    const uploadTask = {
      id: Date.now() + Math.random(),
      name: task.file.name,
      size: task.file.size,
      workflowId: task.workflowId,
      file: task.file,
      progress: 0,
      status: 'pending', // pending, uploading, completed, failed, paused
      uploadedSize: 0,
      speed: 0,
      remainingTime: 0,
      error: null,
      createdAt: new Date()
    }
    
    uploadQueue.value.push(uploadTask)
    return uploadTask.id
  }

  const updateUploadProgress = (taskId, progress, uploadedSize, speed, remainingTime) => {
    const task = uploadQueue.value.find(t => t.id === taskId)
    if (task) {
      task.progress = progress
      task.uploadedSize = uploadedSize
      task.speed = speed
      task.remainingTime = remainingTime
      task.status = progress === 100 ? 'completed' : 'uploading'
    }
    
    // 更新全局进度
    updateGlobalProgress()
  }

  const updateUploadStatus = (taskId, status, error = null) => {
    const task = uploadQueue.value.find(t => t.id === taskId)
    if (task) {
      task.status = status
      if (error) task.error = error
    }
    
    updateGlobalProgress()
  }

  const pauseUpload = (taskId) => {
    const task = uploadQueue.value.find(t => t.id === taskId)
    if (task && task.status === 'uploading') {
      task.status = 'paused'
    }
  }

  const resumeUpload = (taskId) => {
    const task = uploadQueue.value.find(t => t.id === taskId)
    if (task && task.status === 'paused') {
      task.status = 'pending'
    }
  }

  const cancelUpload = (taskId) => {
    const index = uploadQueue.value.findIndex(t => t.id === taskId)
    if (index !== -1) {
      uploadQueue.value.splice(index, 1)
    }
    updateGlobalProgress()
  }

  const retryUpload = (taskId) => {
    const task = uploadQueue.value.find(t => t.id === taskId)
    if (task && task.status === 'failed') {
      task.status = 'pending'
      task.progress = 0
      task.uploadedSize = 0
      task.error = null
    }
  }

  const clearCompleted = () => {
    uploadQueue.value = uploadQueue.value.filter(t => t.status !== 'completed')
    updateGlobalProgress()
  }

  const clearAll = () => {
    uploadQueue.value = []
    globalProgress.value = 0
    isUploading.value = false
  }

  const updateGlobalProgress = () => {
    if (uploadQueue.value.length === 0) {
      globalProgress.value = 0
      isUploading.value = false
      return
    }
    
    const totalProgress = uploadQueue.value.reduce((sum, task) => sum + task.progress, 0)
    globalProgress.value = Math.round(totalProgress / uploadQueue.value.length)
    
    isUploading.value = uploadQueue.value.some(task => 
      ['pending', 'uploading'].includes(task.status)
    )
  }

  const getUploadTask = (taskId) => {
    return uploadQueue.value.find(t => t.id === taskId)
  }

  const getWorkflowUploads = (workflowId) => {
    return uploadQueue.value.filter(t => t.workflowId === workflowId)
  }

  // 从API获取上传任务
  const fetchTasks = async () => {
    try {
      const response = await uploadApi.getTasks()
      if (response.success) {
        uploadQueue.value = response.data || []
        updateGlobalProgress()
      }
    } catch (error) {
      console.error('获取上传任务失败:', error)
    }
  }

  return {
    // 状态
    uploadQueue,
    isUploading,
    globalProgress,
    
    // 计算属性
    uploadingFiles,
    completedFiles,
    failedFiles,
    totalFiles,
    uploadingCount,
    hasUploading,
    tasks,
    taskStats,
    
    // 动作
    addUploadTask,
    updateUploadProgress,
    updateUploadStatus,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    clearCompleted,
    clearAll,
    getUploadTask,
    getWorkflowUploads,
    fetchTasks
  }
}) 