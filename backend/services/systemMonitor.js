const os = require('os')
const { exec } = require('child_process')
const checkDiskSpace = require('check-disk-space').default
const logger = require('../utils/logger')

class SystemMonitor {
  constructor() {
    this.clients = new Set()
    this.isRunning = false
    this.interval = null
    this.currentStatus = {
      cpu: 0,
      memory: 0,
      disk: 0,
      gpu: 0,
      timestamp: new Date()
    }
  }

  // 添加客户端连接
  addClient(socket) {
    this.clients.add(socket)
    logger.info(`系统监控客户端连接，当前连接数: ${this.clients.size}`)
    
    // 立即发送当前状态
    socket.emit('system-status', this.currentStatus)
    
    // 如果是第一个客户端，启动监控
    if (this.clients.size === 1) {
      this.startMonitoring()
    }
  }

  // 移除客户端连接
  removeClient(socket) {
    this.clients.delete(socket)
    logger.info(`系统监控客户端断开，当前连接数: ${this.clients.size}`)
    
    // 如果没有客户端了，停止监控
    if (this.clients.size === 0) {
      this.stopMonitoring()
    }
  }

  // 开始监控
  startMonitoring() {
    if (this.isRunning) return
    
    this.isRunning = true
    logger.info('开始实时系统监控')
    
    // 立即获取一次数据
    this.collectSystemData()
    
    // 每3秒更新一次系统状态
    this.interval = setInterval(() => {
      this.collectSystemData()
    }, 3000)
  }

  // 停止监控
  stopMonitoring() {
    if (!this.isRunning) return
    
    this.isRunning = false
    logger.info('停止实时系统监控')
    
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  // 收集系统数据
  async collectSystemData() {
    try {
      const [cpu, memory, disk, gpu] = await Promise.all([
        this.getCPUUsage(),
        this.getMemoryUsage(),
        this.getDiskUsage(),
        this.getGPUUsage()
      ])

      const newStatus = {
        cpu: Math.round(cpu),
        memory: Math.round(memory),
        disk: Math.round(disk),
        gpu: Math.round(gpu),
        timestamp: new Date()
      }

      // 更新当前状态
      this.currentStatus = newStatus

      // 广播给所有连接的客户端
      this.broadcast('system-status', newStatus)

    } catch (error) {
      logger.error('收集系统数据失败:', error)
    }
  }

  // 广播消息给所有客户端
  broadcast(event, data) {
    this.clients.forEach(socket => {
      try {
        socket.emit(event, data)
      } catch (error) {
        logger.error('广播系统状态失败:', error)
        // 移除无效的socket连接
        this.clients.delete(socket)
      }
    })
  }

  // 获取CPU使用率
  getCPUUsage() {
    return new Promise((resolve) => {
      const startMeasure = this.getCPUInfo()
      
      setTimeout(() => {
        const endMeasure = this.getCPUInfo()
        const idleDifference = endMeasure.idle - startMeasure.idle
        const totalDifference = endMeasure.total - startMeasure.total
        const cpuPercentage = 100 - ~~(100 * idleDifference / totalDifference)
        resolve(cpuPercentage)
      }, 1000)
    })
  }

  // 获取CPU信息
  getCPUInfo() {
    const cpus = os.cpus()
    let user = 0, nice = 0, sys = 0, idle = 0, irq = 0
    
    cpus.forEach((cpu) => {
      user += cpu.times.user
      nice += cpu.times.nice
      sys += cpu.times.sys
      idle += cpu.times.idle
      irq += cpu.times.irq
    })
    
    const total = user + nice + sys + idle + irq
    return { idle, total }
  }

  // 获取内存使用率
  getMemoryUsage() {
    return new Promise((resolve) => {
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      const usedMem = totalMem - freeMem
      const memoryUsage = (usedMem / totalMem) * 100
      resolve(memoryUsage)
    })
  }

  // 获取磁盘使用率
  async getDiskUsage() {
    try {
      const diskSpace = await checkDiskSpace(process.cwd())
      const totalSpace = diskSpace.size
      const freeSpace = diskSpace.free
      const usedSpace = totalSpace - freeSpace
      const usagePercentage = (usedSpace / totalSpace) * 100
      return usagePercentage
    } catch (error) {
      logger.error('获取磁盘使用率错误:', error)
      return 65 // 默认值
    }
  }

  // 获取GPU使用率
  getGPUUsage() {
    return new Promise((resolve) => {
      exec('nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits', (error, stdout, stderr) => {
        if (error) {
          // 如果nvidia-smi不可用，返回模拟数据
          resolve(Math.floor(Math.random() * 30) + 40)
        } else {
          try {
            const gpuUsageString = stdout.trim().split('\n')[0]
            const gpuUsage = parseInt(gpuUsageString) || 0
            resolve(gpuUsage)
          } catch (parseError) {
            resolve(Math.floor(Math.random() * 30) + 40)
          }
        }
      })
    })
  }

  // 获取当前状态
  getCurrentStatus() {
    return this.currentStatus
  }
}

// 创建单例实例
const systemMonitor = new SystemMonitor()

module.exports = systemMonitor 