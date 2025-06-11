import { defineStore } from 'pinia'
import { workflowApi } from '@/api/workflow'
import { getUploadStats } from '@/api/upload'
import { trainingApi } from '@/api/training'

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    // 加载状态
    loading: false,
    lastUpdated: null,
    
    // 统计数据
    stats: {
      totalWorkflows: 0,
      activeWorkflows: 0,
      completedWorkflows: 0,
      failedWorkflows: 0,
      
      totalUploads: 0,
      uploadingTasks: 0,
      queuedTasks: 0,
      
      totalTraining: 0,
      trainingActive: 0,
      trainingCompleted: 0,
      
      storageUsed: 0,
      storageTotal: 0,
      gpuUsage: 0,
      cpuUsage: 0,
      memoryUsage: 0
    },
    
    // 活跃流程
    activeWorkflows: [],
    
    // 最近活动
    recentActivities: [],
    
    // 上传队列概览
    uploadQueue: {
      total: 0,
      uploading: 0,
      waiting: 0,
      completed: 0,
      failed: 0
    },
    
    // 系统状态
    systemStatus: {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      gpuUsage: 0,
      gpuMemory: 0,
      temperature: 0,
      uptime: 0
    },
    
    // 性能数据（用于图表）
    performanceData: {
      cpuHistory: [],
      memoryHistory: [],
      gpuHistory: [],
      timestamps: []
    }
  }),
  
  getters: {
    // 总体进度百分比
    overallProgress: (state) => {
      const total = state.stats.totalWorkflows
      if (total === 0) return 0
      
      const completed = state.stats.completedWorkflows
      return Math.round((completed / total) * 100)
    },
    
    // 上传任务完成率
    uploadCompletionRate: (state) => {
      const total = state.uploadQueue.total
      if (total === 0) return 0
      
      const completed = state.uploadQueue.completed
      return Math.round((completed / total) * 100)
    },
    
    // 存储使用率
    storageUsageRate: (state) => {
      const total = state.stats.storageTotal
      if (total === 0) return 0
      
      const used = state.stats.storageUsed
      return Math.round((used / total) * 100)
    },
    
    // 活跃工作流状态分布
    workflowStatusDistribution: (state) => {
      return state.activeWorkflows.reduce((acc, workflow) => {
        acc[workflow.status] = (acc[workflow.status] || 0) + 1
        return acc
      }, {})
    },
    
    // 今日活动统计
    todayActivity: (state) => {
      const today = new Date().toDateString()
      return state.recentActivities.filter(activity => 
        new Date(activity.timestamp).toDateString() === today
      ).length
    },
    
    // 系统健康状态
    systemHealth: (state) => {
      const { cpuUsage, memoryUsage, diskUsage, gpuUsage } = state.systemStatus
      const average = (cpuUsage + memoryUsage + diskUsage + gpuUsage) / 4
      
      if (average < 50) return 'good'
      if (average < 80) return 'warning'
      return 'critical'
    }
  },
  
  actions: {
    // 加载仪表板数据
    async loadDashboardData() {
      this.loading = true
      try {
        await Promise.all([
          this.loadStats(),
          this.loadActiveWorkflows(),
          this.loadRecentActivities(),
          this.loadUploadQueue(),
          this.loadSystemStatus()
        ])
        
        this.lastUpdated = new Date().toISOString()
      } catch (error) {
        console.error('加载仪表板数据失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 加载统计数据
    async loadStats() {
      try {
        const [workflowStats, uploadStats] = await Promise.all([
          workflowApi.getDashboardData(),
          getUploadStats()
        ])
        
        this.stats = {
          ...this.stats,
          ...workflowStats.data,
          ...uploadStats.data
        }
      } catch (error) {
        console.error('加载统计数据失败:', error)
      }
    },
    
    // 加载活跃工作流
    async loadActiveWorkflows() {
      try {
        const response = await workflowApi.list({
          status: ['UPLOADING', 'PROCESSING', 'TRAINING'],
          limit: 10
        })
        
        this.activeWorkflows = response.data.list || []
      } catch (error) {
        console.error('加载活跃工作流失败:', error)
      }
    },
    
    // 加载最近活动
    async loadRecentActivities() {
      try {
        // 暂时使用工作流列表作为活动数据
        const response = await workflowApi.list({ limit: 20 })
        
        this.recentActivities = response.data.list?.map(workflow => ({
          id: workflow.id,
          type: 'workflow',
          action: '状态更新',
          target: workflow.name,
          status: workflow.status,
          timestamp: workflow.updatedAt,
          description: `工作流 ${workflow.name} 状态更新为 ${workflow.status}`
        })) || []
      } catch (error) {
        console.error('加载最近活动失败:', error)
      }
    },
    
    // 加载上传队列
    async loadUploadQueue() {
      try {
        const response = await getUploadStats()
        
        this.uploadQueue = {
          total: response.data.total || 0,
          uploading: response.data.uploading || 0,
          waiting: response.data.waiting || 0,
          completed: response.data.completed || 0,
          failed: response.data.failed || 0
        }
      } catch (error) {
        console.error('加载上传队列失败:', error)
      }
    },
    
    // 加载系统状态
    async loadSystemStatus() {
      try {
        const response = await fetch('/api/system/status')
        const data = await response.json()
        
        this.systemStatus = {
          cpuUsage: data.cpu || 0,
          memoryUsage: data.memory || 0,
          diskUsage: data.disk || 0,
          gpuUsage: data.gpu?.usage || 0,
          gpuMemory: data.gpu?.memory || 0,
          temperature: data.temperature || 0,
          uptime: data.uptime || 0
        }
        
        // 更新性能历史数据
        this.updatePerformanceHistory()
      } catch (error) {
        console.error('加载系统状态失败:', error)
      }
    },
    
    // 更新性能历史数据
    updatePerformanceHistory() {
      const maxHistory = 60 // 保留60个数据点
      const now = new Date().toLocaleTimeString()
      
      // 添加新数据点
      this.performanceData.cpuHistory.push(this.systemStatus.cpuUsage)
      this.performanceData.memoryHistory.push(this.systemStatus.memoryUsage)
      this.performanceData.gpuHistory.push(this.systemStatus.gpuUsage)
      this.performanceData.timestamps.push(now)
      
      // 保持数据点数量不超过限制
      if (this.performanceData.cpuHistory.length > maxHistory) {
        this.performanceData.cpuHistory.shift()
        this.performanceData.memoryHistory.shift()
        this.performanceData.gpuHistory.shift()
        this.performanceData.timestamps.shift()
      }
    },
    
    // 刷新特定数据
    async refreshStats() {
      await this.loadStats()
    },
    
    async refreshActiveWorkflows() {
      await this.loadActiveWorkflows()
    },
    
    async refreshUploadQueue() {
      await this.loadUploadQueue()
    },
    
    async refreshSystemStatus() {
      await this.loadSystemStatus()
    },
    
    // 添加活动记录
    addActivity(activity) {
      this.recentActivities.unshift({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...activity
      })
      
      // 保持活动记录不超过50条
      if (this.recentActivities.length > 50) {
        this.recentActivities = this.recentActivities.slice(0, 50)
      }
    },
    
    // 更新工作流状态（当收到实时更新时）
    updateWorkflowStatus(workflowId, status, progress) {
      const workflow = this.activeWorkflows.find(w => w.id === workflowId)
      if (workflow) {
        workflow.status = status
        workflow.progress = progress
        
        // 如果工作流完成或失败，从活跃列表中移除
        if (['COMPLETED', 'FAILED'].includes(status)) {
          this.activeWorkflows = this.activeWorkflows.filter(w => w.id !== workflowId)
        }
      }
    },
    
    // 重置数据
    resetData() {
      this.stats = {
        totalWorkflows: 0,
        activeWorkflows: 0,
        completedWorkflows: 0,
        failedWorkflows: 0,
        totalUploads: 0,
        uploadingTasks: 0,
        queuedTasks: 0,
        totalTraining: 0,
        trainingActive: 0,
        trainingCompleted: 0,
        storageUsed: 0,
        storageTotal: 0,
        gpuUsage: 0,
        cpuUsage: 0,
        memoryUsage: 0
      }
      
      this.activeWorkflows = []
      this.recentActivities = []
      this.uploadQueue = {
        total: 0,
        uploading: 0,
        waiting: 0,
        completed: 0,
        failed: 0
      }
      
      this.performanceData = {
        cpuHistory: [],
        memoryHistory: [],
        gpuHistory: [],
        timestamps: []
      }
    }
  }
}) 