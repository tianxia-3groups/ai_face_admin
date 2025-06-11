/**
 * 格式化工具函数集合
 */

// 格式化文件大小
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 B'
  if (!bytes || bytes < 0) return 'N/A'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// 格式化时间
export function formatTime(timestamp, format = 'relative') {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const now = new Date()
  
  switch (format) {
    case 'relative':
      return formatRelativeTime(date, now)
    case 'datetime':
      return formatDateTime(date)
    case 'date':
      return formatDate(date)
    case 'time':
      return formatTimeOnly(date)
    default:
      return formatRelativeTime(date, now)
  }
}

// 格式化相对时间
export function formatRelativeTime(date, now = new Date()) {
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)
  
  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 30) return `${days} 天前`
  if (months < 12) return `${months} 个月前`
  return `${years} 年前`
}

// 格式化日期时间
export function formatDateTime(date) {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 格式化日期
export function formatDate(date) {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 格式化时间（仅时间部分）
export function formatTimeOnly(date) {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 格式化持续时间
export function formatDuration(milliseconds) {
  if (!milliseconds || milliseconds < 0) return '0 秒'
  
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days} 天 ${hours % 24} 小时 ${minutes % 60} 分钟`
  } else if (hours > 0) {
    return `${hours} 小时 ${minutes % 60} 分钟`
  } else if (minutes > 0) {
    return `${minutes} 分钟 ${seconds % 60} 秒`
  } else {
    return `${seconds} 秒`
  }
}

// 格式化百分比
export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '0%'
  
  const num = Number(value)
  return `${num.toFixed(decimals)}%`
}

// 格式化数字
export function formatNumber(value, options = {}) {
  if (value === null || value === undefined || isNaN(value)) return '0'
  
  const {
    decimals = 0,
    useThousandSeparator = true,
    suffix = '',
    prefix = ''
  } = options
  
  const num = Number(value)
  let formatted = num.toFixed(decimals)
  
  if (useThousandSeparator) {
    formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
  
  return `${prefix}${formatted}${suffix}`
}

// 格式化速度（字节/秒）
export function formatSpeed(bytesPerSecond) {
  if (!bytesPerSecond || bytesPerSecond <= 0) return '0 B/s'
  
  return formatFileSize(bytesPerSecond) + '/s'
}

// 格式化进度
export function formatProgress(current, total) {
  if (!total || total <= 0) return '0%'
  
  const percentage = Math.min((current / total) * 100, 100)
  return `${percentage.toFixed(1)}%`
}

// 格式化状态文本
export function formatStatus(status) {
  const statusMap = {
    // 工作流状态
    'CREATED': '已创建',
    'UPLOADING': '上传中',
    'SLICING': '切片中',
    'PROCESSING': '处理中',
    'FILTERING': '筛选中',
    'MATERIALS_READY': '素材就绪',
    'CONFIGURING': '配置中',
    'TRAINING': '训练中',
    'TRAINING_COMPLETED': '训练完成',
    'UPLOADING_RESULT': '上传结果',
    'COMPLETED': '已完成',
    'TRAINING_FAILED': '训练失败',
    'CANCELLED': '已取消',
    
    // 上传任务状态
    'waiting': '等待中',
    'uploading': '上传中',
    'processing': '处理中',
    'completed': '已完成',
    'failed': '失败',
    'paused': '已暂停',
    'cancelled': '已取消'
  }
  
  return statusMap[status] || status
}

// 格式化文件类型
export function formatFileType(filename) {
  if (!filename) return 'unknown'
  
  const ext = filename.split('.').pop()?.toLowerCase()
  
  const typeMap = {
    // 图片
    'jpg': '图片',
    'jpeg': '图片',
    'png': '图片',
    'gif': '图片',
    'bmp': '图片',
    'webp': '图片',
    'svg': '图片',
    
    // 视频
    'mp4': '视频',
    'avi': '视频',
    'mov': '视频',
    'wmv': '视频',
    'flv': '视频',
    'mkv': '视频',
    'webm': '视频',
    
    // 音频
    'mp3': '音频',
    'wav': '音频',
    'flac': '音频',
    'aac': '音频',
    
    // 文档
    'pdf': '文档',
    'doc': '文档',
    'docx': '文档',
    'txt': '文档',
    'md': '文档',
    
    // 压缩包
    'zip': '压缩包',
    'rar': '压缩包',
    '7z': '压缩包',
    'tar': '压缩包',
    'gz': '压缩包'
  }
  
  return typeMap[ext] || '文件'
}

// 格式化内存使用量
export function formatMemory(bytes) {
  return formatFileSize(bytes)
}

// 格式化CPU使用率
export function formatCpuUsage(usage) {
  return formatPercentage(usage)
}

// 格式化温度
export function formatTemperature(celsius) {
  if (celsius === null || celsius === undefined || isNaN(celsius)) return 'N/A'
  
  return `${celsius.toFixed(1)}°C`
}

// 格式化ID（截取前8位）
export function formatId(id, length = 8) {
  if (!id) return ''
  
  return id.toString().substring(0, length)
}

// 格式化文件路径
export function formatPath(path) {
  if (!path) return ''
  
  // 替换反斜杠为正斜杠
  return path.replace(/\\/g, '/')
}

// 格式化颜色（根据数值范围返回不同颜色）
export function getStatusColor(status) {
  const colorMap = {
    // 成功状态
    'COMPLETED': '#67c23a',
    'completed': '#67c23a',
    'success': '#67c23a',
    
    // 进行中状态
    'UPLOADING': '#409eff',
    'TRAINING': '#409eff',
    'PROCESSING': '#409eff',
    'uploading': '#409eff',
    'processing': '#409eff',
    'active': '#409eff',
    
    // 等待状态
    'CREATED': '#e6a23c',
    'waiting': '#e6a23c',
    'pending': '#e6a23c',
    
    // 失败状态
    'TRAINING_FAILED': '#f56c6c',
    'failed': '#f56c6c',
    'error': '#f56c6c',
    
    // 暂停状态
    'paused': '#909399',
    'stopped': '#909399',
    
    // 取消状态
    'CANCELLED': '#909399',
    'cancelled': '#909399'
  }
  
  return colorMap[status] || '#909399'
}

// 格式化数值范围的颜色
export function getValueColor(value, thresholds = { low: 30, high: 70 }) {
  if (value < thresholds.low) return '#67c23a' // 绿色
  if (value < thresholds.high) return '#e6a23c' // 黄色
  return '#f56c6c' // 红色
}

// 格式化文件扩展名
export function getFileExtension(filename) {
  if (!filename) return ''
  
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

// 格式化文件名（移除扩展名）
export function getFileName(filename) {
  if (!filename) return ''
  
  const parts = filename.split('.')
  return parts.length > 1 ? parts.slice(0, -1).join('.') : filename
}

// 导出所有函数
export default {
  formatFileSize,
  formatTime,
  formatRelativeTime,
  formatDateTime,
  formatDate,
  formatTimeOnly,
  formatDuration,
  formatPercentage,
  formatNumber,
  formatSpeed,
  formatProgress,
  formatStatus,
  formatFileType,
  formatMemory,
  formatCpuUsage,
  formatTemperature,
  formatId,
  formatPath,
  getStatusColor,
  getValueColor,
  getFileExtension,
  getFileName
} 