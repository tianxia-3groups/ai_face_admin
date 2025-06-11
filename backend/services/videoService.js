// 视频处理服务
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');
const logger = require('../utils/logger');
const FileService = require('./fileService');

class VideoService {
  /**
   * 获取视频信息
   */
  static async getVideoInfo(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          logger.error('获取视频信息失败:', err);
          reject(err);
        } else {
          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          resolve({
            duration: metadata.format.duration,
            width: videoStream?.width,
            height: videoStream?.height,
            frameRate: videoStream?.r_frame_rate,
            bitRate: metadata.format.bit_rate,
            size: metadata.format.size
          });
        }
      });
    });
  }

  /**
   * 视频切片 - 提取关键帧
   */
  static async extractFrames(videoPath, outputDir, options = {}) {
    const {
      interval = 1, // 间隔秒数
      quality = 2,  // 质量 (1-31, 数字越小质量越好)
      maxFrames = 1000, // 最大帧数
      format = 'jpg' // 输出格式
    } = options;

    try {
      // 确保输出目录存在
      await FileService.ensureDir(outputDir);

      // 获取视频信息
      const videoInfo = await this.getVideoInfo(videoPath);
      const totalFrames = Math.min(Math.floor(videoInfo.duration / interval), maxFrames);

      logger.info(`开始切片视频: ${videoPath}, 预计提取 ${totalFrames} 帧`);

      return new Promise((resolve, reject) => {
        const outputPattern = path.join(outputDir, `frame_%04d.${format}`);
        
        ffmpeg(videoPath)
          .outputOptions([
            `-vf fps=1/${interval}`, // 设置帧率
            `-q:v ${quality}`, // 设置质量
            `-frames:v ${maxFrames}` // 限制最大帧数
          ])
          .output(outputPattern)
          .on('start', (commandLine) => {
            logger.info('FFmpeg 命令:', commandLine);
          })
          .on('progress', (progress) => {
            logger.info(`切片进度: ${progress.percent || 0}%`);
          })
          .on('end', async () => {
            try {
              // 获取实际生成的文件
              const files = await FileService.listFiles(outputDir, [`.${format}`]);
              logger.info(`视频切片完成，共生成 ${files.length} 个文件`);
              resolve({
                totalFrames: files.length,
                outputDir,
                files: files.map(f => f.name)
              });
            } catch (error) {
              reject(error);
            }
          })
          .on('error', (err) => {
            logger.error('视频切片失败:', err);
            reject(err);
          })
          .run();
      });

    } catch (error) {
      logger.error('视频切片初始化失败:', error);
      throw error;
    }
  }

  /**
   * 检查是否为视频文件
   */
  static isVideoFile(filePath) {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.webm', '.flv', '.m4v'];
    const ext = path.extname(filePath).toLowerCase();
    return videoExtensions.includes(ext);
  }

  /**
   * 生成缩略图
   */
  static async generateThumbnail(videoPath, outputPath, timeOffset = '00:00:01') {
    try {
      await FileService.ensureDir(path.dirname(outputPath));

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .seekInput(timeOffset)
          .frames(1)
          .output(outputPath)
          .on('end', () => {
            logger.info(`缩略图生成完成: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (err) => {
            logger.error('生成缩略图失败:', err);
            reject(err);
          })
          .run();
      });

    } catch (error) {
      logger.error('缩略图生成初始化失败:', error);
      throw error;
    }
  }

  /**
   * 批量处理视频文件
   */
  static async processVideos(inputDir, outputDir, options = {}) {
    try {
      const videoFiles = await FileService.listFiles(inputDir);
      const videos = videoFiles.filter(file => this.isVideoFile(file.path));

      if (videos.length === 0) {
        logger.info('没有找到视频文件');
        return { processed: 0, results: [] };
      }

      logger.info(`找到 ${videos.length} 个视频文件，开始处理`);

      const results = [];
      let processed = 0;

      for (const video of videos) {
        try {
          const videoOutputDir = path.join(outputDir, path.parse(video.name).name);
          const result = await this.extractFrames(video.path, videoOutputDir, options);
          
          results.push({
            videoFile: video.name,
            success: true,
            ...result
          });
          
          processed++;
          logger.info(`已处理 ${processed}/${videos.length} 个视频`);

        } catch (error) {
          logger.error(`处理视频失败 ${video.name}:`, error);
          results.push({
            videoFile: video.name,
            success: false,
            error: error.message
          });
        }
      }

      return { processed, total: videos.length, results };

    } catch (error) {
      logger.error('批量处理视频失败:', error);
      throw error;
    }
  }

  /**
   * 获取视频第一帧作为封面
   */
  static async getVideoCover(videoPath, outputPath) {
    return this.generateThumbnail(videoPath, outputPath, '00:00:00.1');
  }
}

module.exports = VideoService; 