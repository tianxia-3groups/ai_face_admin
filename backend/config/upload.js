// 上传配置
module.exports = {
  // 文件上传限制
  limits: {
    fileSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 100 * 1024 * 1024 * 1024, // 100GB
    files: 50 // 最多50个文件
  },
  
  // 支持的文件类型
  allowedTypes: {
    images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'],
    videos: ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/wmv', 'video/webm']
  },
  
  // 分片上传配置
  chunks: {
    size: parseInt(process.env.UPLOAD_CHUNK_SIZE) || 2 * 1024 * 1024, // 2MB
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_UPLOADS) || 3
  },
  
  // 存储路径配置
  paths: {
    temp: 'uploads/temp',
    workflows: 'workflows'
  }
}; 