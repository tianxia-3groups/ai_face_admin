const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 获取素材列表（分页）
 */
router.get('/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { 
      type = 'processed', 
      page = 1, 
      pageSize = 50,
      search = ''
    } = req.query;
    
    const materialsDir = path.join(process.cwd(), `workflows/${workflowId}/materials/${type}`);
    
    if (!await fs.pathExists(materialsDir)) {
      return res.json({
        success: true,
        materials: [],
        total: 0,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });
    }
    
    let files = await fs.readdir(materialsDir);
    
    // 过滤图片文件
    files = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext);
    });
    
    // 搜索过滤
    if (search) {
      files = files.filter(file => 
        file.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    const total = files.length;
    const startIndex = (parseInt(page) - 1) * parseInt(pageSize);
    const endIndex = startIndex + parseInt(pageSize);
    const paginatedFiles = files.slice(startIndex, endIndex);
    
    const materials = [];
    
    for (const fileName of paginatedFiles) {
      const filePath = path.join(materialsDir, fileName);
      const stats = await fs.stat(filePath);
      
      // 生成缩略图URL
      const thumbnailUrl = `/api/materials/${workflowId}/thumbnail/${type}/${fileName}`;
      
      materials.push({
        id: fileName,
        name: fileName,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        url: `/workflows/${workflowId}/materials/${type}/${fileName}`,
        thumbnailUrl,
        selected: false
      });
    }
    
    res.json({
      success: true,
      materials,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / parseInt(pageSize))
    });
    
  } catch (error) {
    logger.error('获取素材列表错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '获取素材列表失败' 
    });
  }
});

/**
 * 生成图片缩略图
 */
router.get('/:workflowId/thumbnail/:type/:fileName', async (req, res) => {
  try {
    const { workflowId, type, fileName } = req.params;
    const { size = 200 } = req.query;
    
    const imagePath = path.join(process.cwd(), `workflows/${workflowId}/materials/${type}/${fileName}`);
    
    if (!await fs.pathExists(imagePath)) {
      return res.status(404).json({ 
        error: '文件不存在' 
      });
    }
    
    // 检查缩略图缓存
    const thumbnailDir = path.join(process.cwd(), `workflows/${workflowId}/thumbnails/${type}`);
    const thumbnailPath = path.join(thumbnailDir, `${path.parse(fileName).name}_${size}.webp`);
    
    if (await fs.pathExists(thumbnailPath)) {
      // 返回缓存的缩略图
      res.set('Content-Type', 'image/webp');
      res.set('Cache-Control', 'public, max-age=86400'); // 24小时缓存
      return res.sendFile(thumbnailPath);
    }
    
    // 生成缩略图
    await fs.ensureDir(thumbnailDir);
    
    await sharp(imagePath)
      .resize(parseInt(size), parseInt(size), {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 80 })
      .toFile(thumbnailPath);
    
    res.set('Content-Type', 'image/webp');
    res.set('Cache-Control', 'public, max-age=86400');
    res.sendFile(thumbnailPath);
    
  } catch (error) {
    logger.error('生成缩略图错误:', error);
    res.status(500).json({ 
      error: '生成缩略图失败' 
    });
  }
});

/**
 * 批量删除素材（软删除）
 */
router.post('/:workflowId/delete', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { files, fromType = 'processed' } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ 
        error: '参数错误', 
        message: '没有指定要删除的文件' 
      });
    }
    
    const sourceDir = path.join(process.cwd(), `workflows/${workflowId}/materials/${fromType}`);
    const deletedDir = path.join(process.cwd(), `workflows/${workflowId}/materials/deleted`);
    
    await fs.ensureDir(deletedDir);
    
    const deletedFiles = [];
    const errors = [];
    
    for (const fileName of files) {
      try {
        const sourcePath = path.join(sourceDir, fileName);
        const targetPath = path.join(deletedDir, fileName);
        
        if (await fs.pathExists(sourcePath)) {
          // 如果目标文件已存在，添加时间戳
          let finalTargetPath = targetPath;
          if (await fs.pathExists(targetPath)) {
            const ext = path.extname(fileName);
            const name = path.basename(fileName, ext);
            finalTargetPath = path.join(deletedDir, `${name}_${Date.now()}${ext}`);
          }
          
          await fs.move(sourcePath, finalTargetPath);
          
          // 保存删除记录
          const deleteRecord = {
            originalName: fileName,
            deletedName: path.basename(finalTargetPath),
            deletedAt: new Date().toISOString(),
            deletedBy: req.user.username,
            fromType
          };
          
          const recordPath = path.join(deletedDir, `${path.parse(finalTargetPath).name}.json`);
          await fs.writeJson(recordPath, deleteRecord, { spaces: 2 });
          
          deletedFiles.push(fileName);
        } else {
          errors.push(`文件不存在: ${fileName}`);
        }
      } catch (error) {
        errors.push(`删除失败: ${fileName} - ${error.message}`);
      }
    }
    
    logger.info(`批量删除素材: ${workflowId} - ${deletedFiles.length} 个文件`);
    
    res.json({
      success: true,
      message: `成功删除 ${deletedFiles.length} 个文件`,
      deletedFiles,
      errors
    });
    
  } catch (error) {
    logger.error('批量删除素材错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '批量删除失败' 
    });
  }
});

/**
 * 批量恢复素材
 */
router.post('/:workflowId/restore', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { files, toType = 'processed' } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ 
        error: '参数错误', 
        message: '没有指定要恢复的文件' 
      });
    }
    
    const deletedDir = path.join(process.cwd(), `workflows/${workflowId}/materials/deleted`);
    const targetDir = path.join(process.cwd(), `workflows/${workflowId}/materials/${toType}`);
    
    await fs.ensureDir(targetDir);
    
    const restoredFiles = [];
    const errors = [];
    
    for (const fileName of files) {
      try {
        const sourcePath = path.join(deletedDir, fileName);
        const recordPath = path.join(deletedDir, `${path.parse(fileName).name}.json`);
        
        if (await fs.pathExists(sourcePath) && await fs.pathExists(recordPath)) {
          const deleteRecord = await fs.readJson(recordPath);
          const targetPath = path.join(targetDir, deleteRecord.originalName);
          
          // 如果目标文件已存在，添加时间戳
          let finalTargetPath = targetPath;
          if (await fs.pathExists(targetPath)) {
            const ext = path.extname(deleteRecord.originalName);
            const name = path.basename(deleteRecord.originalName, ext);
            finalTargetPath = path.join(targetDir, `${name}_restored_${Date.now()}${ext}`);
          }
          
          await fs.move(sourcePath, finalTargetPath);
          await fs.remove(recordPath);
          
          restoredFiles.push({
            original: deleteRecord.originalName,
            restored: path.basename(finalTargetPath)
          });
        } else {
          errors.push(`文件或记录不存在: ${fileName}`);
        }
      } catch (error) {
        errors.push(`恢复失败: ${fileName} - ${error.message}`);
      }
    }
    
    logger.info(`批量恢复素材: ${workflowId} - ${restoredFiles.length} 个文件`);
    
    res.json({
      success: true,
      message: `成功恢复 ${restoredFiles.length} 个文件`,
      restoredFiles,
      errors
    });
    
  } catch (error) {
    logger.error('批量恢复素材错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '批量恢复失败' 
    });
  }
});

/**
 * 获取已删除素材列表
 */
router.get('/:workflowId/deleted', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { page = 1, pageSize = 50 } = req.query;
    
    const deletedDir = path.join(process.cwd(), `workflows/${workflowId}/materials/deleted`);
    
    if (!await fs.pathExists(deletedDir)) {
      return res.json({
        success: true,
        materials: [],
        total: 0,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });
    }
    
    const files = await fs.readdir(deletedDir);
    
    // 过滤图片文件
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext);
    });
    
    const total = imageFiles.length;
    const startIndex = (parseInt(page) - 1) * parseInt(pageSize);
    const endIndex = startIndex + parseInt(pageSize);
    const paginatedFiles = imageFiles.slice(startIndex, endIndex);
    
    const materials = [];
    
    for (const fileName of paginatedFiles) {
      const filePath = path.join(deletedDir, fileName);
      const recordPath = path.join(deletedDir, `${path.parse(fileName).name}.json`);
      
      const stats = await fs.stat(filePath);
      let deleteRecord = null;
      
      if (await fs.pathExists(recordPath)) {
        deleteRecord = await fs.readJson(recordPath);
      }
      
      const thumbnailUrl = `/api/materials/${workflowId}/thumbnail/deleted/${fileName}`;
      
      materials.push({
        id: fileName,
        name: fileName,
        originalName: deleteRecord?.originalName || fileName,
        size: stats.size,
        deletedAt: deleteRecord?.deletedAt,
        deletedBy: deleteRecord?.deletedBy,
        fromType: deleteRecord?.fromType,
        url: `/workflows/${workflowId}/materials/deleted/${fileName}`,
        thumbnailUrl
      });
    }
    
    res.json({
      success: true,
      materials,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / parseInt(pageSize))
    });
    
  } catch (error) {
    logger.error('获取已删除素材列表错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '获取已删除素材列表失败' 
    });
  }
});

/**
 * 永久删除素材
 */
router.delete('/:workflowId/permanent', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { files } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ 
        error: '参数错误', 
        message: '没有指定要删除的文件' 
      });
    }
    
    const deletedDir = path.join(process.cwd(), `workflows/${workflowId}/materials/deleted`);
    
    const deletedFiles = [];
    const errors = [];
    
    for (const fileName of files) {
      try {
        const filePath = path.join(deletedDir, fileName);
        const recordPath = path.join(deletedDir, `${path.parse(fileName).name}.json`);
        
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath);
          deletedFiles.push(fileName);
        }
        
        if (await fs.pathExists(recordPath)) {
          await fs.remove(recordPath);
        }
      } catch (error) {
        errors.push(`删除失败: ${fileName} - ${error.message}`);
      }
    }
    
    logger.info(`永久删除素材: ${workflowId} - ${deletedFiles.length} 个文件`);
    
    res.json({
      success: true,
      message: `成功永久删除 ${deletedFiles.length} 个文件`,
      deletedFiles,
      errors
    });
    
  } catch (error) {
    logger.error('永久删除素材错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: '永久删除失败' 
    });
  }
});

module.exports = router; 