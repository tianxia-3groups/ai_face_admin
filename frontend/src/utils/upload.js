/**
 * 上传工具函数集合
 */

// 计算文件MD5哈希
export async function calculateFileHash(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = function(e) {
      const buffer = e.target.result
      const hash = CryptoJS.MD5(CryptoJS.lib.WordArray.create(buffer)).toString()
      resolve(hash)
    }
    reader.readAsArrayBuffer(file)
  })
}

// 简化版哈希计算（基于文件名、大小、修改时间）
export function calculateSimpleHash(file) {
  const str = `${file.name}-${file.size}-${file.lastModified}`
  return btoa(str).replace(/[+/=]/g, '').substring(0, 16)
}

// 检查文件类型
export function validateFileType(file, allowedTypes = []) {
  if (allowedTypes.length === 0) return true
  
  const fileType = file.type.toLowerCase()
  const fileName = file.name.toLowerCase()
  
  return allowedTypes.some(type => {
    if (type.includes('/')) {
      return fileType === type || fileType.startsWith(type.replace('*', ''))
    } else {
      return fileName.endsWith(`.${type}`)
    }
  })
}

// 检查文件大小
export function validateFileSize(file, maxSize) {
  if (!maxSize) return true
  
  const maxBytes = typeof maxSize === 'string' 
    ? parseSize(maxSize) 
    : maxSize
    
  return file.size <= maxBytes
}

// 解析文件大小字符串
export function parseSize(sizeStr) {
  if (typeof sizeStr === 'number') return sizeStr
  
  const units = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
    'TB': 1024 * 1024 * 1024 * 1024
  }
  
  const match = sizeStr.toString().match(/^(\d+(?:\.\d+)?)\s*([KMGT]?B)$/i)
  if (!match) return 0
  
  const [, size, unit] = match
  return parseFloat(size) * (units[unit.toUpperCase()] || 1)
}

// 将文件分片
export function sliceFile(file, chunkSize = 2 * 1024 * 1024) { // 默认2MB
  const chunks = []
  const totalChunks = Math.ceil(file.size / chunkSize)
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const chunk = file.slice(start, end)
    
    chunks.push({
      index: i,
      chunk: chunk,
      start: start,
      end: end,
      size: chunk.size
    })
  }
  
  return {
    chunks,
    totalChunks,
    totalSize: file.size
  }
}

// 创建上传任务
export function createUploadTask(workflowId, files, options = {}) {
  const {
    chunkSize = 2 * 1024 * 1024, // 2MB
    concurrent = 3, // 并发数
    retries = 3, // 重试次数
    validateTypes = [],
    maxFileSize = null
  } = options
  
  // 验证文件
  const validFiles = []
  const invalidFiles = []
  
  for (const file of files) {
    const errors = []
    
    // 检查文件类型
    if (validateTypes.length > 0 && !validateFileType(file, validateTypes)) {
      errors.push('不支持的文件类型')
    }
    
    // 检查文件大小
    if (maxFileSize && !validateFileSize(file, maxFileSize)) {
      errors.push(`文件大小超过限制 (${maxFileSize})`)
    }
    
    if (errors.length > 0) {
      invalidFiles.push({ file, errors })
    } else {
      validFiles.push(file)
    }
  }
  
  // 创建任务数据
  const task = {
    id: generateTaskId(),
    workflowId,
    files: validFiles.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      hash: calculateSimpleHash(file),
      file: file
    })),
    invalidFiles,
    status: 'created',
    progress: 0,
    uploadedSize: 0,
    totalSize: validFiles.reduce((sum, file) => sum + file.size, 0),
    options: {
      chunkSize,
      concurrent,
      retries
    },
    createdAt: new Date().toISOString(),
    chunks: new Map(), // 存储每个文件的分片信息
    errors: []
  }
  
  return task
}

// 生成任务ID
export function generateTaskId() {
  return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 默认的文件类型配置
export const FILE_TYPE_CONFIGS = {
  image: {
    types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],
    maxSize: '10MB'
  },
  video: {
    types: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/mkv'],
    extensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'],
    maxSize: '500MB'
  },
  document: {
    types: ['application/pdf', 'text/plain', 'application/msword'],
    extensions: ['pdf', 'txt', 'doc', 'docx'],
    maxSize: '50MB'
  }
}

// 获取推荐的上传配置
export function getRecommendedConfig(files) {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  
  // 根据文件总大小调整配置
  let chunkSize, concurrent
  
  if (totalSize > 1024 * 1024 * 1024) { // > 1GB
    chunkSize = 5 * 1024 * 1024 // 5MB
    concurrent = 2
  } else if (totalSize > 100 * 1024 * 1024) { // > 100MB
    chunkSize = 2 * 1024 * 1024 // 2MB
    concurrent = 3
  } else {
    chunkSize = 1 * 1024 * 1024 // 1MB
    concurrent = 5
  }
  
  return {
    chunkSize,
    concurrent,
    retries: 3
  }
}

// 上传单个分片
export async function uploadChunk(workflowId, chunkData, onProgress) {
  const { chunk, chunkIndex, totalChunks, fileHash, fileName } = chunkData
  
  const formData = new FormData()
  formData.append('chunk', chunk)
  formData.append('chunkIndex', chunkIndex)
  formData.append('totalChunks', totalChunks)
  formData.append('fileHash', fileHash)
  formData.append('fileName', fileName)
  
  const xhr = new XMLHttpRequest()
  
  return new Promise((resolve, reject) => {
    // 上传进度监听
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = Math.round((e.loaded / e.total) * 100)
        onProgress(progress, e.loaded, e.total)
      }
    })
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          resolve(response)
        } catch (e) {
          reject(new Error('响应解析失败'))
        }
      } else {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`))
      }
    })
    
    xhr.addEventListener('error', () => {
      reject(new Error('网络错误'))
    })
    
    xhr.addEventListener('timeout', () => {
      reject(new Error('上传超时'))
    })
    
    xhr.open('POST', `/api/upload/${workflowId}/chunks`)
    xhr.timeout = 30000 // 30秒超时
    xhr.send(formData)
  })
}

// 检查文件是否已存在
export async function checkFileExists(workflowId, fileHash, fileName) {
  const response = await fetch(`/api/upload/${workflowId}/check-exists`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fileHash, fileName })
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  const result = await response.json()
  return result.data
}

// 完整的文件上传流程
export async function uploadFile(workflowId, file, options = {}) {
  const {
    chunkSize = 2 * 1024 * 1024, // 2MB
    onProgress,
    onChunkProgress,
    retries = 3
  } = options
  
  const fileHash = calculateSimpleHash(file)
  const fileName = file.name
  
  // 检查文件是否已存在
  const existsInfo = await checkFileExists(workflowId, fileHash, fileName)
  if (existsInfo.exists) {
    if (onProgress) onProgress(100)
    return { success: true, message: '文件已存在', filePath: existsInfo.filePath }
  }
  
  // 分片文件
  const { chunks, totalChunks } = sliceFile(file, chunkSize)
  let uploadedChunks = existsInfo.uploadedChunks || 0
  let uploadedSize = 0
  
  // 从已上传的分片开始
  for (let i = uploadedChunks; i < totalChunks; i++) {
    const chunkInfo = chunks[i]
    let retryCount = 0
    
    while (retryCount < retries) {
      try {
        const chunkData = {
          chunk: chunkInfo.chunk,
          chunkIndex: i,
          totalChunks,
          fileHash,
          fileName
        }
        
        const result = await uploadChunk(workflowId, chunkData, (progress, loaded, total) => {
          if (onChunkProgress) {
            onChunkProgress(i, progress, loaded, total)
          }
        })
        
        uploadedSize += chunkInfo.size
        const totalProgress = Math.round((uploadedSize / file.size) * 100)
        
        if (onProgress) {
          onProgress(totalProgress, uploadedSize, file.size)
        }
        
        // 如果是最后一个分片且上传完成
        if (result.fileComplete) {
          return {
            success: true,
            message: '文件上传完成',
            filePath: result.filePath
          }
        }
        
        break // 成功，跳出重试循环
        
      } catch (error) {
        retryCount++
        console.warn(`分片 ${i} 上传失败 (${retryCount}/${retries}):`, error.message)
        
        if (retryCount >= retries) {
          throw new Error(`分片 ${i} 上传失败: ${error.message}`)
        }
        
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
      }
    }
  }
  
  return { success: true, message: '文件上传完成' }
}

// 批量上传文件
export async function uploadFiles(workflowId, files, options = {}) {
  const {
    concurrent = 3,
    onFileProgress,
    onTotalProgress,
    ...uploadOptions
  } = options
  
  const results = []
  const totalFiles = files.length
  let completedFiles = 0
  let totalSize = files.reduce((sum, file) => sum + file.size, 0)
  let uploadedSize = 0
  
  // 限制并发数
  const semaphore = new Array(concurrent).fill(null)
  
  const uploadFile_wrapped = async (file, index) => {
    try {
      const result = await uploadFile(workflowId, file, {
        ...uploadOptions,
        onProgress: (progress, loaded, total) => {
          if (onFileProgress) {
            onFileProgress(index, file.name, progress, loaded, total)
          }
          
          // 更新总进度
          const fileProgress = (loaded / total) || 0
          const currentFileContribution = (file.size / totalSize) * fileProgress
          
          if (onTotalProgress) {
            const totalProgress = Math.min(
              ((uploadedSize + loaded) / totalSize) * 100,
              100
            )
            onTotalProgress(totalProgress, uploadedSize + loaded, totalSize)
          }
        }
      })
      
      uploadedSize += file.size
      completedFiles++
      
      return { file: file.name, ...result }
      
    } catch (error) {
      completedFiles++
      return { file: file.name, success: false, error: error.message }
    }
  }
  
  // 使用Promise.all限制并发
  const promises = files.map(async (file, index) => {
    // 等待可用的并发槽
    await new Promise(resolve => {
      const checkSlot = () => {
        const availableIndex = semaphore.findIndex(slot => slot === null)
        if (availableIndex !== -1) {
          semaphore[availableIndex] = true
          resolve()
        } else {
          setTimeout(checkSlot, 100)
        }
      }
      checkSlot()
    })
    
    try {
      const result = await uploadFile_wrapped(file, index)
      
      // 释放并发槽
      const usedIndex = semaphore.findIndex(slot => slot === true)
      if (usedIndex !== -1) {
        semaphore[usedIndex] = null
      }
      
      return result
    } catch (error) {
      // 释放并发槽
      const usedIndex = semaphore.findIndex(slot => slot === true)
      if (usedIndex !== -1) {
        semaphore[usedIndex] = null
      }
      throw error
    }
  })
  
  return Promise.all(promises)
}

// 导出所有函数
export default {
  calculateFileHash,
  calculateSimpleHash,
  validateFileType,
  validateFileSize,
  parseSize,
  sliceFile,
  createUploadTask,
  generateTaskId,
  FILE_TYPE_CONFIGS,
  getRecommendedConfig,
  uploadChunk,
  checkFileExists,
  uploadFile,
  uploadFiles
}