// 文件操作服务
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

class FileService {
  /**
   * 确保目录存在
   */
  static async ensureDir(dirPath) {
    try {
      await fs.ensureDir(dirPath);
      return true;
    } catch (error) {
      logger.error('创建目录失败:', error);
      throw error;
    }
  }

  /**
   * 移动文件
   */
  static async moveFile(sourcePath, targetPath) {
    try {
      await fs.ensureDir(path.dirname(targetPath));
      await fs.move(sourcePath, targetPath);
      return true;
    } catch (error) {
      logger.error('移动文件失败:', error);
      throw error;
    }
  }

  /**
   * 复制文件
   */
  static async copyFile(sourcePath, targetPath) {
    try {
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath);
      return true;
    } catch (error) {
      logger.error('复制文件失败:', error);
      throw error;
    }
  }

  /**
   * 删除文件或目录
   */
  static async remove(targetPath) {
    try {
      await fs.remove(targetPath);
      return true;
    } catch (error) {
      logger.error('删除文件失败:', error);
      throw error;
    }
  }

  /**
   * 获取文件信息
   */
  static async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const hash = await this.getFileHash(filePath);
      
      return {
        name: path.basename(filePath),
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isDirectory: stats.isDirectory(),
        hash
      };
    } catch (error) {
      logger.error('获取文件信息失败:', error);
      throw error;
    }
  }

  /**
   * 计算文件哈希
   */
  static async getFileHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * 获取目录下所有文件
   */
  static async listFiles(dirPath, extensions = null) {
    try {
      if (!await fs.pathExists(dirPath)) {
        return [];
      }

      const files = await fs.readdir(dirPath);
      const fileList = [];

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          // 如果指定了扩展名过滤
          if (extensions && !extensions.includes(path.extname(file).toLowerCase())) {
            continue;
          }
          
          fileList.push({
            name: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          });
        }
      }

      return fileList;
    } catch (error) {
      logger.error('列举文件失败:', error);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  static async exists(filePath) {
    return await fs.pathExists(filePath);
  }

  /**
   * 读取JSON文件
   */
  static async readJson(filePath) {
    try {
      return await fs.readJson(filePath);
    } catch (error) {
      logger.error('读取JSON文件失败:', error);
      throw error;
    }
  }

  /**
   * 写入JSON文件
   */
  static async writeJson(filePath, data) {
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeJson(filePath, data, { spaces: 2 });
      return true;
    } catch (error) {
      logger.error('写入JSON文件失败:', error);
      throw error;
    }
  }

  /**
   * 获取目录大小
   */
  static async getDirectorySize(dirPath) {
    try {
      let totalSize = 0;
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          totalSize += await this.getDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      }
      
      return totalSize;
    } catch (error) {
      logger.error('计算目录大小失败:', error);
      return 0;
    }
  }
}

module.exports = FileService; 