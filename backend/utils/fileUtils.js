// 文件工具函数
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 获取文件扩展名（小写）
 */
function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
}

/**
 * 检查文件类型
 */
function getFileType(filename) {
  const ext = getFileExtension(filename);
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.webm', '.flv', '.m4v'];
  const documentExtensions = ['.pdf', '.doc', '.docx', '.txt', '.md'];
  
  if (imageExtensions.includes(ext)) return 'image';
  if (videoExtensions.includes(ext)) return 'video';
  if (documentExtensions.includes(ext)) return 'document';
  
  return 'other';
}

/**
 * 生成安全的文件名
 */
function sanitizeFilename(filename) {
  // 移除或替换不安全的字符
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * 生成唯一文件名
 */
function generateUniqueFilename(originalName) {
  const ext = path.extname(originalName);
  const basename = path.basename(originalName, ext);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  return `${sanitizeFilename(basename)}_${timestamp}_${random}${ext}`;
}

/**
 * 计算文件MD5哈希
 */
async function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * 检查磁盘空间
 */
async function checkDiskSpace(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    // 简单实现，实际可以使用 statvfs 等系统调用
    return {
      available: true,
      path: dirPath,
      // 这里可以添加实际的磁盘空间检查逻辑
    };
  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
}

/**
 * 创建工作流目录结构
 */
async function createWorkflowDirectories(workflowId) {
  const workflowDir = path.join(process.cwd(), 'workflows', workflowId);
  
  const directories = [
    workflowDir,
    path.join(workflowDir, 'materials'),
    path.join(workflowDir, 'materials', 'raw'),
    path.join(workflowDir, 'materials', 'processed'),
    path.join(workflowDir, 'materials', 'deleted'),
    path.join(workflowDir, 'logs'),
    path.join(workflowDir, 'output'),
    path.join(workflowDir, 'output', 'model'),
    path.join(workflowDir, 'output', 'reports')
  ];
  
  for (const dir of directories) {
    await fs.ensureDir(dir);
  }
  
  return workflowDir;
}

/**
 * 清理临时文件
 */
async function cleanupTempFiles(tempDir, maxAge = 24 * 60 * 60 * 1000) {
  try {
    if (!await fs.pathExists(tempDir)) {
      return { cleaned: 0, size: 0 };
    }
    
    const files = await fs.readdir(tempDir);
    let cleanedCount = 0;
    let cleanedSize = 0;
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        cleanedSize += stats.size;
        await fs.remove(filePath);
        cleanedCount++;
      }
    }
    
    return {
      cleaned: cleanedCount,
      size: cleanedSize,
      sizeFormatted: formatFileSize(cleanedSize)
    };
    
  } catch (error) {
    throw new Error(`清理临时文件失败: ${error.message}`);
  }
}

/**
 * 递归计算目录大小
 */
async function calculateDirectorySize(dirPath) {
  try {
    let totalSize = 0;
    const files = await fs.readdir(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isDirectory()) {
        totalSize += await calculateDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    return 0;
  }
}

/**
 * 验证文件完整性
 */
async function validateFileIntegrity(filePath, expectedHash = null, expectedSize = null) {
  try {
    if (!await fs.pathExists(filePath)) {
      return { valid: false, error: '文件不存在' };
    }
    
    const stats = await fs.stat(filePath);
    
    // 检查文件大小
    if (expectedSize !== null && stats.size !== expectedSize) {
      return {
        valid: false,
        error: `文件大小不匹配，期望: ${expectedSize}, 实际: ${stats.size}`
      };
    }
    
    // 检查文件哈希
    if (expectedHash !== null) {
      const actualHash = await calculateFileHash(filePath);
      if (actualHash !== expectedHash) {
        return {
          valid: false,
          error: `文件哈希不匹配，期望: ${expectedHash}, 实际: ${actualHash}`
        };
      }
    }
    
    return {
      valid: true,
      size: stats.size,
      hash: expectedHash || await calculateFileHash(filePath)
    };
    
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * 安全移动文件（带备份）
 */
async function safeMove(sourcePath, targetPath, backup = true) {
  try {
    // 确保目标目录存在
    await fs.ensureDir(path.dirname(targetPath));
    
    // 如果目标文件存在且需要备份
    if (backup && await fs.pathExists(targetPath)) {
      const backupPath = `${targetPath}.backup.${Date.now()}`;
      await fs.move(targetPath, backupPath);
    }
    
    // 移动文件
    await fs.move(sourcePath, targetPath);
    
    return { success: true };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  formatFileSize,
  getFileExtension,
  getFileType,
  sanitizeFilename,
  generateUniqueFilename,
  calculateFileHash,
  checkDiskSpace,
  createWorkflowDirectories,
  cleanupTempFiles,
  calculateDirectorySize,
  validateFileIntegrity,
  safeMove
}; 