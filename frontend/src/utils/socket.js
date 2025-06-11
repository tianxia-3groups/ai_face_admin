import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
    this.connected = false
    this.currentWorkflowId = null
  }

  // 连接Socket.IO服务器
  connect() {
    if (this.socket && this.connected) {
      return this.socket
    }

    const serverUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    })

    this.socket.on('connect', () => {
      console.log('Socket.IO 连接成功:', this.socket.id)
      this.connected = true
    })

    this.socket.on('disconnect', () => {
      console.log('Socket.IO 连接断开')
      this.connected = false
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO 连接错误:', error)
      this.connected = false
    })

    return this.socket
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
      this.currentWorkflowId = null
    }
  }

  // 加入工作流房间
  joinWorkflow(workflowId) {
    if (this.socket && this.connected) {
      // 如果之前加入了其他工作流房间，先离开
      if (this.currentWorkflowId && this.currentWorkflowId !== workflowId) {
        this.leaveWorkflow(this.currentWorkflowId)
      }
      
      this.socket.emit('join-workflow', workflowId)
      this.currentWorkflowId = workflowId
      console.log(`加入工作流房间: ${workflowId}`)
    }
  }

  // 离开工作流房间
  leaveWorkflow(workflowId) {
    if (this.socket && this.connected) {
      this.socket.emit('leave-workflow', workflowId)
      console.log(`离开工作流房间: ${workflowId}`)
      
      if (this.currentWorkflowId === workflowId) {
        this.currentWorkflowId = null
      }
    }
  }

  // 监听工作流状态更新
  onWorkflowStatusUpdate(callback) {
    if (this.socket) {
      this.socket.on('workflow-status-update', callback)
    }
  }

  // 监听上传进度更新
  onUploadProgress(callback) {
    if (this.socket) {
      this.socket.on('upload-progress', callback)
    }
  }

  // 监听训练进度更新
  onTrainingProgress(callback) {
    if (this.socket) {
      this.socket.on('training-progress', callback)
    }
  }

  // 监听日志更新
  onLogUpdate(callback) {
    if (this.socket) {
      this.socket.on('log-update', callback)
    }
  }

  // 移除事件监听器
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback)
    }
  }

  // 发送消息
  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data)
    }
  }

  // 获取连接状态  
  isConnected() {
    return this.connected
  }

  // 获取当前工作流ID
  getCurrentWorkflowId() {
    return this.currentWorkflowId
  }
}

// 创建全局实例
const socketService = new SocketService()

export default socketService 