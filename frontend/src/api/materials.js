import request from '@/utils/request'

/**
 * 素材管理API
 */

// 获取工作流的素材列表
export function getMaterials(workflowId, params = {}) {
  return request({
    url: `/api/workflows/${workflowId}/materials`,
    method: 'get',
    params
  })
}

// 上传素材文件
export function uploadMaterials(workflowId, files, materialType = 'faceSource') {
  const formData = new FormData()
  
  // 添加文件
  if (Array.isArray(files)) {
    files.forEach(file => {
      formData.append('files', file)
    })
  } else {
    formData.append('files', files)
  }
  
  // 添加素材类型
  formData.append('materialType', materialType)
  
  return request({
    url: `/api/workflows/${workflowId}/materials/upload`,
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 分片上传素材文件
export function uploadMaterialsChunked(workflowId, file, options = {}) {
  const {
    chunkSize = 2 * 1024 * 1024, // 2MB
    materialType = 'faceSource',
    onProgress
  } = options
  
  return new Promise((resolve, reject) => {
    const totalChunks = Math.ceil(file.size / chunkSize)
    const fileHash = generateFileHash(file)
    let uploadedChunks = 0
    
    const uploadChunk = async (chunkIndex) => {
      const start = chunkIndex * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const chunk = file.slice(start, end)
      
      const formData = new FormData()
      formData.append('chunk', chunk)
      formData.append('chunkIndex', chunkIndex)
      formData.append('totalChunks', totalChunks)
      formData.append('fileHash', fileHash)
      formData.append('fileName', file.name)
      formData.append('fileSize', file.size)
      formData.append('materialType', materialType)
      
      try {
        const response = await request({
          url: `/api/workflows/${workflowId}/materials/upload-chunk`,
          method: 'post',
          data: formData,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        uploadedChunks++
        const progress = Math.round((uploadedChunks / totalChunks) * 100)
        
        if (onProgress) {
          onProgress({ progress, uploadedChunks, totalChunks })
        }
        
        if (uploadedChunks === totalChunks) {
          // 所有分片上传完成，合并文件
          const mergeResponse = await request({
            url: `/api/workflows/${workflowId}/materials/merge-chunks`,
            method: 'post',
            data: {
              fileHash,
              fileName: file.name,
              totalChunks,
              materialType
            }
          })
          resolve(mergeResponse)
        } else {
          // 继续上传下一个分片
          uploadChunk(chunkIndex + 1)
        }
      } catch (error) {
        reject(error)
      }
    }
    
    // 开始上传第一个分片
    uploadChunk(0)
  })
}

// 获取素材文件详情
export function getMaterialDetail(workflowId, materialId) {
  return request({
    url: `/api/workflows/${workflowId}/materials/${materialId}`,
    method: 'get'
  })
}

// 获取素材文件预览
export function getMaterialPreview(workflowId, materialId, params = {}) {
  return request({
    url: `/api/workflows/${workflowId}/materials/${materialId}/preview`,
    method: 'get',
    params,
    responseType: 'blob' // 用于图片/视频预览
  })
}

// 获取素材文件缩略图
export function getMaterialThumbnail(workflowId, materialId) {
  return request({
    url: `/api/workflows/${workflowId}/materials/${materialId}/thumbnail`,
    method: 'get',
    responseType: 'blob'
  })
}

// 删除素材文件
export function deleteMaterial(workflowId, materialId) {
  return request({
    url: `/api/workflows/${workflowId}/materials/${materialId}`,
    method: 'delete'
  })
}

// 批量删除素材文件
export function deleteMaterials(workflowId, materialIds) {
  return request({
    url: `/api/workflows/${workflowId}/materials/batch-delete`,
    method: 'post',
    data: { materialIds }
  })
}

// 移动素材文件（软删除/恢复）
export function moveMaterial(workflowId, materialId, action) {
  return request({
    url: `/api/workflows/${workflowId}/materials/${materialId}/move`,
    method: 'post',
    data: { action } // 'delete' | 'restore'
  })
}

// 更新素材元数据
export function updateMaterialMetadata(workflowId, materialId, metadata) {
  return request({
    url: `/api/workflows/${workflowId}/materials/${materialId}/metadata`,
    method: 'put',
    data: metadata
  })
}

// 获取素材统计信息
export function getMaterialStats(workflowId) {
  return request({
    url: `/api/workflows/${workflowId}/materials/stats`,
    method: 'get'
  })
}

// 视频切片处理
export function processVideoSlicing(workflowId, materialId, options = {}) {
  return request({
    url: `/api/workflows/${workflowId}/materials/${materialId}/slice`,
    method: 'post',
    data: {
      frameRate: options.frameRate || 1, // 每秒提取帧数
      quality: options.quality || 'medium', // low | medium | high
      maxFrames: options.maxFrames || 1000 // 最大提取帧数
    }
  })
}

// 获取视频切片进度
export function getSlicingProgress(workflowId, taskId) {
  return request({
    url: `/api/workflows/${workflowId}/slicing/${taskId}/progress`,
    method: 'get'
  })
}

// 图片质量检测
export function checkImageQuality(workflowId, materialId) {
  return request({
    url: `/api/workflows/${workflowId}/materials/${materialId}/quality-check`,
    method: 'post'
  })
}

// 人脸检测和提取
export function detectFaces(workflowId, materialId) {
  return request({
    url: `/api/workflows/${workflowId}/materials/${materialId}/detect-faces`,
    method: 'post'
  })
}

// 批量质量检测
export function batchQualityCheck(workflowId, materialIds) {
  return request({
    url: `/api/workflows/${workflowId}/materials/batch-quality-check`,
    method: 'post',
    data: { materialIds }
  })
}

// 导出素材文件
export function exportMaterials(workflowId, options = {}) {
  return request({
    url: `/api/workflows/${workflowId}/materials/export`,
    method: 'post',
    data: {
      format: options.format || 'zip', // zip | tar
      includeMetadata: options.includeMetadata || true,
      materialTypes: options.materialTypes || ['faceSource', 'model']
    },
    responseType: 'blob'
  })
}

// 从URL批量下载素材
export function importFromUrls(workflowId, urls, materialType = 'faceSource') {
  return request({
    url: `/api/workflows/${workflowId}/materials/import-urls`,
    method: 'post',
    data: {
      urls,
      materialType
    }
  })
}

// 获取导入进度
export function getImportProgress(workflowId, taskId) {
  return request({
    url: `/api/workflows/${workflowId}/import/${taskId}/progress`,
    method: 'get'
  })
}

// 工具函数：生成文件哈希
function generateFileHash(file) {
  // 简单的文件哈希生成（生产环境建议使用更强的哈希算法）
  return `${file.name}_${file.size}_${file.lastModified}`
}

// 工具函数：检查文件类型
export function validateFileType(file, allowedTypes = []) {
  if (!allowedTypes.length) {
    // 默认允许的文件类型
    allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/quicktime'
    ]
  }
  
  return allowedTypes.includes(file.type)
}

// 工具函数：检查文件大小
export function validateFileSize(file, maxSize = 500 * 1024 * 1024) { // 默认500MB
  return file.size <= maxSize
}

// 工具函数：格式化文件大小
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export default {
  getMaterials,
  uploadMaterials,
  uploadMaterialsChunked,
  getMaterialDetail,
  getMaterialPreview,
  getMaterialThumbnail,
  deleteMaterial,
  deleteMaterials,
  moveMaterial,
  updateMaterialMetadata,
  getMaterialStats,
  processVideoSlicing,
  getSlicingProgress,
  checkImageQuality,
  detectFaces,
  batchQualityCheck,
  exportMaterials,
  importFromUrls,
  getImportProgress,
  validateFileType,
  validateFileSize,
  formatFileSize
} 