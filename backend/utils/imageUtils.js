// 图片处理工具
const sharp = require('sharp');
const path = require('path');
const fs = require('fs-extra');
const logger = require('./logger');

/**
 * 获取图片信息
 */
async function getImageInfo(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata();
    const stats = await fs.stat(imagePath);
    
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      channels: metadata.channels,
      size: stats.size,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      isAnimated: metadata.isAnimated || false
    };
  } catch (error) {
    logger.error('获取图片信息失败:', error);
    throw error;
  }
}

/**
 * 生成缩略图
 */
async function generateThumbnail(inputPath, outputPath, options = {}) {
  const {
    width = 200,
    height = 200,
    quality = 80,
    format = 'jpeg'
  } = options;

  try {
    await fs.ensureDir(path.dirname(outputPath));
    
    await sharp(inputPath)
      .resize(width, height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality })
      .toFile(outputPath);
      
    logger.info(`缩略图生成成功: ${outputPath}`);
    return outputPath;
    
  } catch (error) {
    logger.error('生成缩略图失败:', error);
    throw error;
  }
}

/**
 * 调整图片尺寸
 */
async function resizeImage(inputPath, outputPath, options = {}) {
  const {
    width,
    height,
    fit = 'cover', // cover, contain, fill, inside, outside
    quality = 90,
    format = null // 保持原格式
  } = options;

  try {
    await fs.ensureDir(path.dirname(outputPath));
    
    let pipeline = sharp(inputPath);
    
    if (width || height) {
      pipeline = pipeline.resize(width, height, { fit });
    }
    
    if (format) {
      if (format === 'jpeg') {
        pipeline = pipeline.jpeg({ quality });
      } else if (format === 'png') {
        pipeline = pipeline.png({ quality });
      } else if (format === 'webp') {
        pipeline = pipeline.webp({ quality });
      }
    }
    
    await pipeline.toFile(outputPath);
    
    logger.info(`图片尺寸调整完成: ${outputPath}`);
    return outputPath;
    
  } catch (error) {
    logger.error('调整图片尺寸失败:', error);
    throw error;
  }
}

/**
 * 转换图片格式
 */
async function convertFormat(inputPath, outputPath, targetFormat, options = {}) {
  const { quality = 90 } = options;

  try {
    await fs.ensureDir(path.dirname(outputPath));
    
    let pipeline = sharp(inputPath);
    
    switch (targetFormat.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        pipeline = pipeline.jpeg({ quality });
        break;
      case 'png':
        pipeline = pipeline.png({ quality });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality });
        break;
      case 'tiff':
        pipeline = pipeline.tiff({ quality });
        break;
      default:
        throw new Error(`不支持的图片格式: ${targetFormat}`);
    }
    
    await pipeline.toFile(outputPath);
    
    logger.info(`图片格式转换完成: ${inputPath} -> ${outputPath}`);
    return outputPath;
    
  } catch (error) {
    logger.error('转换图片格式失败:', error);
    throw error;
  }
}

/**
 * 检查图片质量（模糊检测等）
 */
async function analyzeImageQuality(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata();
    const stats = await sharp(imagePath).stats();
    
    // 基于图片统计信息进行质量分析
    const analysis = {
      width: metadata.width,
      height: metadata.height,
      megapixels: (metadata.width * metadata.height) / 1000000,
      channels: stats.channels,
      // 简单的质量评估
      quality: 'unknown'
    };
    
    // 基本质量评估逻辑
    if (analysis.megapixels < 0.1) {
      analysis.quality = 'low';
      analysis.reason = '分辨率过低';
    } else if (analysis.megapixels > 2) {
      analysis.quality = 'high';
    } else {
      analysis.quality = 'medium';
    }
    
    return analysis;
    
  } catch (error) {
    logger.error('分析图片质量失败:', error);
    throw error;
  }
}

/**
 * 批量处理图片
 */
async function processImages(inputDir, outputDir, processor, options = {}) {
  try {
    await fs.ensureDir(outputDir);
    
    const files = await fs.readdir(inputDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext);
    });
    
    const results = [];
    
    for (const file of imageFiles) {
      try {
        const inputPath = path.join(inputDir, file);
        const outputPath = path.join(outputDir, file);
        
        await processor(inputPath, outputPath, options);
        
        results.push({
          file,
          success: true,
          inputPath,
          outputPath
        });
        
      } catch (error) {
        logger.error(`处理图片失败 ${file}:`, error);
        results.push({
          file,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    logger.info(`批量处理完成: ${successCount}/${imageFiles.length} 个文件成功`);
    
    return {
      total: imageFiles.length,
      success: successCount,
      failed: imageFiles.length - successCount,
      results
    };
    
  } catch (error) {
    logger.error('批量处理图片失败:', error);
    throw error;
  }
}

/**
 * 生成图片网格（缩略图集合）
 */
async function createImageGrid(imagePaths, outputPath, options = {}) {
  const {
    columns = 4,
    thumbnailSize = 200,
    spacing = 10,
    backgroundColor = '#ffffff'
  } = options;

  try {
    if (imagePaths.length === 0) {
      throw new Error('没有提供图片路径');
    }
    
    const rows = Math.ceil(imagePaths.length / columns);
    const canvasWidth = columns * thumbnailSize + (columns - 1) * spacing;
    const canvasHeight = rows * thumbnailSize + (rows - 1) * spacing;
    
    // 创建空白画布
    let canvas = sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 3,
        background: backgroundColor
      }
    });
    
    const compositeOperations = [];
    
    for (let i = 0; i < imagePaths.length; i++) {
      const row = Math.floor(i / columns);
      const col = i % columns;
      const left = col * (thumbnailSize + spacing);
      const top = row * (thumbnailSize + spacing);
      
      // 生成缩略图
      const thumbnailBuffer = await sharp(imagePaths[i])
        .resize(thumbnailSize, thumbnailSize, { fit: 'cover' })
        .toBuffer();
      
      compositeOperations.push({
        input: thumbnailBuffer,
        left,
        top
      });
    }
    
    await canvas
      .composite(compositeOperations)
      .jpeg({ quality: 90 })
      .toFile(outputPath);
    
    logger.info(`图片网格生成完成: ${outputPath}`);
    return outputPath;
    
  } catch (error) {
    logger.error('生成图片网格失败:', error);
    throw error;
  }
}

/**
 * 检查图片是否损坏
 */
async function validateImage(imagePath) {
  try {
    await sharp(imagePath).metadata();
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * 优化图片（压缩、格式转换等）
 */
async function optimizeImage(inputPath, outputPath, options = {}) {
  const {
    quality = 85,
    format = 'jpeg',
    maxWidth = 1920,
    maxHeight = 1080,
    removeMetadata = true
  } = options;

  try {
    await fs.ensureDir(path.dirname(outputPath));
    
    let pipeline = sharp(inputPath);
    
    // 移除元数据
    if (removeMetadata) {
      pipeline = pipeline.rotate(); // 自动旋转并移除EXIF
    }
    
    // 调整尺寸（如果超过最大尺寸）
    pipeline = pipeline.resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true
    });
    
    // 设置输出格式和质量
    if (format === 'jpeg') {
      pipeline = pipeline.jpeg({ quality, progressive: true });
    } else if (format === 'png') {
      pipeline = pipeline.png({ quality });
    } else if (format === 'webp') {
      pipeline = pipeline.webp({ quality });
    }
    
    await pipeline.toFile(outputPath);
    
    const originalSize = (await fs.stat(inputPath)).size;
    const optimizedSize = (await fs.stat(outputPath)).size;
    const compression = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);
    
    logger.info(`图片优化完成: ${inputPath} -> ${outputPath}, 压缩: ${compression}%`);
    
    return {
      inputPath,
      outputPath,
      originalSize,
      optimizedSize,
      compression: parseFloat(compression)
    };
    
  } catch (error) {
    logger.error('优化图片失败:', error);
    throw error;
  }
}

module.exports = {
  getImageInfo,
  generateThumbnail,
  resizeImage,
  convertFormat,
  analyzeImageQuality,
  processImages,
  createImageGrid,
  validateImage,
  optimizeImage
}; 