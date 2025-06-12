const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

const router = express.Router();

// 配置multer用于处理文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const workflowId = req.params.workflowId;
    const uploadPath = path.join(process.cwd(), `uploads/temp/${workflowId}`);
    fs.ensureDirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // 使用原始文件名，添加时间戳避免冲突
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension);
    cb(null, `${basename}_${timestamp}${extension}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 * 1024, // 100GB
    files: 50 // 最多50个文件
  },
  fileFilter: function (req, file, cb) {
    // 允许的文件类型
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp',
      'video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/wmv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
    }
  }
});

/**
 * 直接上传小文件
 */
router.post('/:workflowId/direct', upload.single('file'), async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { materialType = 'faceSource' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ 
        error: '上传错误', 
        message: '没有收到文件' 
      });
    }
    
    // 确保目标目录存在
    const targetDir = path.join(process.cwd(), `workflows/${workflowId}/materials/raw/${materialType}`);
    await fs.ensureDir(targetDir);
    
    // 移动文件到目标目录
    const targetPath = path.join(targetDir, req.file.originalname);
    await fs.move(req.file.path, targetPath);
    
    logger.info(`文件直接上传完成: ${workflowId}/${materialType}/${req.file.originalname}`);
    
    res.json({
      success: true,
      message: '文件上传成功',
      filePath: `workflows/${workflowId}/materials/raw/${materialType}/${req.file.originalname}`,
      size: req.file.size
    });
    
  } catch (error) {
    logger.error('直接上传错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '文件上传失败: ' + error.message
    });
  }
});

/**
 * 分片上传 - 上传单个分片
 */
router.post('/:workflowId/chunks', upload.single('chunk'), async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { chunkIndex, totalChunks, fileHash, fileName, materialType = 'faceSource' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ 
        error: '上传错误', 
        message: '没有收到分片文件' 
      });
    }
    
    const chunkIndex_num = parseInt(chunkIndex);
    const totalChunks_num = parseInt(totalChunks);
    
    // 创建分片存储目录
    const chunksDir = path.join(process.cwd(), `uploads/chunks/${workflowId}/${fileHash}`);
    await fs.ensureDir(chunksDir);
    
    // 移动分片到指定位置
    const chunkPath = path.join(chunksDir, `chunk_${chunkIndex_num}`);
    await fs.move(req.file.path, chunkPath);
    
    logger.info(`分片上传完成: ${workflowId}/${fileName} - ${chunkIndex_num + 1}/${totalChunks_num}`);
    
    // 检查是否所有分片都已上传
    const uploadedChunks = await fs.readdir(chunksDir);
    const isComplete = uploadedChunks.length === totalChunks_num;
    
    if (isComplete) {
      // 合并分片
      const mergeResult = await mergeChunks(workflowId, fileHash, fileName, totalChunks_num, materialType);
      
      res.json({
        success: true,
        message: '分片上传完成，文件已合并',
        fileComplete: true,
        filePath: mergeResult.filePath
      });
    } else {
      res.json({
        success: true,
        message: `分片 ${chunkIndex_num + 1}/${totalChunks_num} 上传成功`,
        fileComplete: false,
        uploadedChunks: uploadedChunks.length
      });
    }
    
  } catch (error) {
    logger.error('分片上传错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '分片上传失败: ' + error.message
    });
  }
});

/**
 * 合并文件分片
 */
async function mergeChunks(workflowId, fileHash, fileName, totalChunks, materialType = 'faceSource') {
  const chunksDir = path.join(process.cwd(), `uploads/chunks/${workflowId}/${fileHash}`);
  const targetDir = path.join(process.cwd(), `workflows/${workflowId}/materials/raw/${materialType}`);
  await fs.ensureDir(targetDir);
  
  const targetPath = path.join(targetDir, fileName);
  const writeStream = fs.createWriteStream(targetPath);
  
  try {
    // 按顺序合并分片
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunksDir, `chunk_${i}`);
      
      if (!await fs.pathExists(chunkPath)) {
        throw new Error(`分片 ${i} 不存在`);
      }
      
      const chunkBuffer = await fs.readFile(chunkPath);
      writeStream.write(chunkBuffer);
    }
    
    writeStream.end();
    
    // 等待写入完成
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
    // 清理分片文件
    await fs.remove(chunksDir);
    
    const stats = await fs.stat(targetPath);
    
    logger.info(`文件合并完成: ${fileName} (${stats.size} bytes)`);
    
    return {
      filePath: `workflows/${workflowId}/materials/raw/${materialType}/${fileName}`,
      size: stats.size
    };
    
  } catch (error) {
    writeStream.destroy();
    throw error;
  }
}

/**
 * 检查文件是否已存在
 */
router.post('/:workflowId/check-exists', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { fileHash, fileName, materialType = 'faceSource' } = req.body;
    
    if (!fileHash || !fileName) {
      return res.status(400).json({
        error: '参数错误',
        message: '需要提供fileHash和fileName'
      });
    }
    
    const filePath = path.join(process.cwd(), `workflows/${workflowId}/materials/raw/${materialType}/${fileName}`);
    const exists = await fs.pathExists(filePath);
    
    let uploadedChunks = 0;
    if (!exists) {
      // 检查已上传的分片数量
      const chunksDir = path.join(process.cwd(), `uploads/chunks/${workflowId}/${fileHash}`);
      if (await fs.pathExists(chunksDir)) {
        const chunks = await fs.readdir(chunksDir);
        uploadedChunks = chunks.length;
      }
    }
    
    res.json({
      success: true,
      data: {
        exists,
        uploadedChunks,
        needUpload: !exists
      }
    });
    
  } catch (error) {
    logger.error('检查文件存在性失败:', error);
    res.status(500).json({
      error: '服务器错误',
      message: '检查文件失败: ' + error.message
    });
  }
});

/**
 * 普通文件上传（小文件）
 */
router.post('/:workflowId/files', upload.array('files', 50), async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        error: '上传错误', 
        message: '没有收到文件' 
      });
    }
    
    const uploadedFiles = [];
    
    // 移动文件到工作流目录
    const targetDir = path.join(process.cwd(), `workflows/${workflowId}/materials/raw`);
    await fs.ensureDir(targetDir);
    
    for (const file of req.files) {
      const targetPath = path.join(targetDir, file.filename);
      await fs.move(file.path, targetPath);
      
      uploadedFiles.push({
        originalName: file.originalname,
        fileName: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        path: `workflows/${workflowId}/materials/raw/${file.filename}`
      });
    }
    
    logger.info(`文件上传完成: ${workflowId} - ${uploadedFiles.length} 个文件`);
    
    res.json({
      success: true,
      message: '文件上传成功',
      files: uploadedFiles
    });
    
  } catch (error) {
    logger.error('文件上传错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '文件上传失败' 
    });
  }
});

/**
 * 获取工作流上传的文件列表
 */
router.get('/:workflowId/files', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { type = 'raw' } = req.query; // raw, processed, deleted
    
    const filesDir = path.join(process.cwd(), `workflows/${workflowId}/materials/${type}`);
    
    if (!await fs.pathExists(filesDir)) {
      return res.json({
        success: true,
        files: []
      });
    }
    
    const files = await fs.readdir(filesDir);
    const fileList = [];
    
    for (const fileName of files) {
      const filePath = path.join(filesDir, fileName);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        fileList.push({
          name: fileName,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          path: `workflows/${workflowId}/materials/${type}/${fileName}`
        });
      }
    }
    
    res.json({
      success: true,
      files: fileList
    });
    
  } catch (error) {
    logger.error('获取文件列表错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '获取文件列表失败' 
    });
  }
});

/**
 * 获取上传配置
 */
router.get('/config', async (req, res) => {
  try {
    const configPath = path.join(process.cwd(), 'db/upload-config.json');
    
    if (!await fs.pathExists(configPath)) {
      // 返回默认配置
      const defaultConfig = {
        maxConcurrentFiles: 3,
        maxConcurrentWorkflows: 1,
        chunkSize: "2MB",
        allowedFileTypes: [
          "image/jpeg",
          "image/png", 
          "image/webp",
          "video/mp4",
          "video/avi",
          "video/mov"
        ],
        maxFileSize: "500MB",
        retryAttempts: 3,
        retryDelay: 1000
      };
      
      return res.json(defaultConfig);
    }
    
    const uploadConfig = await fs.readJson(configPath);
    
    res.json(uploadConfig);
    
  } catch (error) {
    logger.error('获取上传配置失败:', error);
    res.status(500).json({
      error: '服务器错误',
      message: '获取上传配置失败: ' + error.message
    });
  }
});

/**
 * 获取上传统计信息
 */
router.get('/stats', async (req, res) => {
  try {
    // 这里可以统计当前上传情况
    // 暂时返回模拟数据
    const stats = {
      total: 0,
      uploading: 0,
      waiting: 0,
      completed: 0,
      failed: 0,
      totalSize: 0,
      uploadedSize: 0
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    logger.error('获取上传统计失败:', error);
    res.status(500).json({
      error: '服务器错误',
      message: '获取上传统计失败: ' + error.message
    });
  }
});

/**
 * 上传脸源素材
 */
router.post('/:workflowId/source', upload.array('files'), async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    // 验证工作流存在
    const workflowPath = path.join(process.cwd(), `db/workflows/${workflowId}.json`);
    if (!await fs.pathExists(workflowPath)) {
      return res.status(404).json({
        error: '工作流不存在',
        message: `找不到ID为 ${workflowId} 的工作流`
      });
    }
    
    // 获取工作流配置
    const workflow = await fs.readJson(workflowPath);
    
    // 确保目录存在
    const sourceDir = path.join(process.cwd(), `workflows/${workflowId}/materials/source`);
    await fs.ensureDir(sourceDir);
    
    const rawDir = path.join(process.cwd(), `workflows/${workflowId}/materials/raw`);
    await fs.ensureDir(rawDir);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: '没有文件',
        message: '没有收到上传的文件'
      });
    }
    
    // 处理上传的文件
    const result = {
      success: true,
      files: []
    };
    
    for (const file of req.files) {
      // 保存到源目录
      const destPath = path.join(sourceDir, file.originalname);
      await fs.move(file.path, destPath, { overwrite: true });
      
      // 备份到raw目录
      const rawPath = path.join(rawDir, `source_${file.originalname}`);
      await fs.copy(destPath, rawPath);
      
      result.files.push({
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        destination: destPath
      });
      
      logger.info(`文件上传成功(脸源): ${file.originalname} (${workflowId})`);
    }
    
    // 更新工作流素材数量
    if (!workflow.materials) {
      workflow.materials = {
        source: {
          totalFiles: 0,
          processedFiles: 0,
          selectedFiles: []
        }
      };
    }
    
    if (!workflow.materials.source) {
      workflow.materials.source = {
        totalFiles: 0,
        processedFiles: 0,
        selectedFiles: []
      };
    }
    
    workflow.materials.source.totalFiles += req.files.length;
    workflow.updatedAt = new Date().toISOString();
    
    // 如果当前是创建状态，则更新为上传中
    if (workflow.status === 'CREATED') {
      workflow.status = 'UPLOADING';
      workflow.statusHistory.push({
        status: 'UPLOADING',
        timestamp: new Date().toISOString(),
        message: '素材上传中'
      });
    }
    
    await fs.writeJson(workflowPath, workflow, { spaces: 2 });
    
    res.json(result);
    
  } catch (error) {
    logger.error('上传脸源素材错误:', error);
    res.status(500).json({
      error: '服务器错误',
      message: '上传脸源素材失败'
    });
  }
});

/**
 * 上传模特素材
 */
router.post('/:workflowId/target', upload.array('files'), async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    // 验证工作流存在
    const workflowPath = path.join(process.cwd(), `db/workflows/${workflowId}.json`);
    if (!await fs.pathExists(workflowPath)) {
      return res.status(404).json({
        error: '工作流不存在',
        message: `找不到ID为 ${workflowId} 的工作流`
      });
    }
    
    // 获取工作流配置
    const workflow = await fs.readJson(workflowPath);
    
    // 验证训练类型
    if (workflow.type !== 'face_swap') {
      return res.status(400).json({
        error: '训练类型错误',
        message: '只有单对单训练类型需要上传模特素材'
      });
    }
    
    // 确保目录存在
    const targetDir = path.join(process.cwd(), `workflows/${workflowId}/materials/target`);
    await fs.ensureDir(targetDir);
    
    const rawDir = path.join(process.cwd(), `workflows/${workflowId}/materials/raw`);
    await fs.ensureDir(rawDir);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: '没有文件',
        message: '没有收到上传的文件'
      });
    }
    
    // 处理上传的文件
    const result = {
      success: true,
      files: []
    };
    
    for (const file of req.files) {
      // 保存到目标目录
      const destPath = path.join(targetDir, file.originalname);
      await fs.move(file.path, destPath, { overwrite: true });
      
      // 备份到raw目录
      const rawPath = path.join(rawDir, `target_${file.originalname}`);
      await fs.copy(destPath, rawPath);
      
      result.files.push({
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        destination: destPath
      });
      
      logger.info(`文件上传成功(模特): ${file.originalname} (${workflowId})`);
    }
    
    // 更新工作流素材数量
    if (!workflow.materials) {
      workflow.materials = {
        source: {
          totalFiles: 0,
          processedFiles: 0,
          selectedFiles: []
        },
        target: {
          totalFiles: 0,
          processedFiles: 0,
          selectedFiles: []
        }
      };
    }
    
    if (!workflow.materials.target) {
      workflow.materials.target = {
        totalFiles: 0,
        processedFiles: 0,
        selectedFiles: []
      };
    }
    
    workflow.materials.target.totalFiles += req.files.length;
    workflow.updatedAt = new Date().toISOString();
    
    // 如果当前是创建状态，则更新为上传中
    if (workflow.status === 'CREATED') {
      workflow.status = 'UPLOADING';
      workflow.statusHistory.push({
        status: 'UPLOADING',
        timestamp: new Date().toISOString(),
        message: '素材上传中'
      });
    }
    
    await fs.writeJson(workflowPath, workflow, { spaces: 2 });
    
    res.json(result);
    
  } catch (error) {
    logger.error('上传模特素材错误:', error);
    res.status(500).json({
      error: '服务器错误',
      message: '上传模特素材失败'
    });
  }
});

module.exports = router; 