import { io } from 'socket.io-client'
import { ElMessage } from 'element-plus'

class SocketService {
  constructor() {
    this.socket = null
    this.connected = false
    this.listeners = new Map()
  }

  // 连接到服务器
  connect() {
    if (this.socket) {
      return this.socket
    }

    const serverUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
    
    this.socket = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000
    })

    // 连接事件
    this.socket.on('connect', () => {
      console.log('Socket连接成功')
      this.connected = true
    })

    this.socket.on('disconnect', () => {
      console.log('Socket连接断开')
      this.connected = false
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket连接错误:', error)
      ElMessage.error('实时连接失败，部分功能可能不可用')
    })

    return this.socket
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
    }
  }

  // 加入系统监控
  joinSystemMonitor() {
    if (this.socket && this.connected) {
      this.socket.emit('join-system-monitor')
    }
  }

  // 离开系统监控
  leaveSystemMonitor() {
    if (this.socket && this.connected) {
      this.socket.emit('leave-system-monitor')
    }
  }

  // 监听系统状态更新
  onSystemStatus(callback) {
    if (this.socket) {
      this.socket.on('system-status', callback)
      // 保存监听器引用，用于清理
      this.listeners.set('system-status', callback)
    }
  }

  // 取消监听系统状态
  offSystemStatus() {
    if (this.socket && this.listeners.has('system-status')) {
      this.socket.off('system-status', this.listeners.get('system-status'))
      this.listeners.delete('system-status')
    }
  }

  // 加入工作流房间
  joinWorkflow(workflowId) {
    if (this.socket && this.connected) {
      this.socket.emit('join-workflow', workflowId)
    }
  }

  // 监听工作流状态更新
  onWorkflowStatusUpdate(callback) {
    if (this.socket) {
      this.socket.on('workflow-status-update', callback)
      this.listeners.set('workflow-status-update', callback)
    }
  }

  // 取消监听工作流状态
  offWorkflowStatusUpdate() {
    if (this.socket && this.listeners.has('workflow-status-update')) {
      this.socket.off('workflow-status-update', this.listeners.get('workflow-status-update'))
      this.listeners.delete('workflow-status-update')
    }
  }

  // 监听上传进度更新
  onUploadProgress(callback) {
    if (this.socket) {
      this.socket.on('upload-progress', callback)
      this.listeners.set('upload-progress', callback)
    }
  }

  // 取消监听上传进度
  offUploadProgress() {
    if (this.socket && this.listeners.has('upload-progress')) {
      this.socket.off('upload-progress', this.listeners.get('upload-progress'))
      this.listeners.delete('upload-progress')
    }
  }

  // 通用事件监听
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback)
      this.listeners.set(event, callback)
    }
  }

  // 通用事件取消监听
  off(event) {
    if (this.socket && this.listeners.has(event)) {
      this.socket.off(event, this.listeners.get(event))
      this.listeners.delete(event)
    }
  }

  // 发送事件
  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data)
    }
  }

  // 获取连接状态
  isConnected() {
    return this.connected
  }
}

// 创建单例实例
const socketService = new SocketService()

// Vue插件
export default {
  install(app) {
    // 连接到服务器
    socketService.connect()

    // 将socketService注入到全局属性
    app.config.globalProperties.$socket = socketService
    app.provide('$socket', socketService)
  }
}

export { socketService } 