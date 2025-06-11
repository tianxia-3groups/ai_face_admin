// Google Drive服务
const { google } = require('googleapis');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');
const FileService = require('./fileService');

class DriveService {
  constructor() {
    this.drive = null;
    this.isInitialized = false;
  }

  /**
   * 初始化Google Drive API
   */
  async initialize() {
    try {
      if (this.isInitialized) return;

      const credentials = {
        client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
        client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
        refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN
      };

      if (!credentials.client_id || !credentials.client_secret || !credentials.refresh_token) {
        logger.warn('Google Drive 凭据未配置，跳过初始化');
        return;
      }

      const oauth2Client = new google.auth.OAuth2(
        credentials.client_id,
        credentials.client_secret,
        'urn:ietf:wg:oauth:2.0:oob'
      );

      oauth2Client.setCredentials({
        refresh_token: credentials.refresh_token
      });

      this.drive = google.drive({
        version: 'v3',
        auth: oauth2Client
      });

      this.isInitialized = true;
      logger.info('Google Drive API 初始化成功');

    } catch (error) {
      logger.error('Google Drive API 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 检查是否已初始化
   */
  checkInitialized() {
    if (!this.isInitialized) {
      throw new Error('Google Drive 服务未初始化');
    }
  }

  /**
   * 上传文件到Google Drive
   */
  async uploadFile(filePath, fileName = null, folderId = null) {
    try {
      await this.initialize();
      this.checkInitialized();

      if (!await FileService.exists(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }

      const fileInfo = await FileService.getFileInfo(filePath);
      const uploadFileName = fileName || fileInfo.name;

      logger.info(`开始上传文件到 Google Drive: ${uploadFileName}`);

      const fileMetadata = {
        name: uploadFileName
      };

      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      const media = {
        mimeType: 'application/octet-stream',
        body: fs.createReadStream(filePath)
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name,size,webViewLink,webContentLink'
      });

      logger.info(`文件上传成功: ${uploadFileName}, ID: ${response.data.id}`);

      return {
        id: response.data.id,
        name: response.data.name,
        size: response.data.size,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink
      };

    } catch (error) {
      logger.error('上传文件到 Google Drive 失败:', error);
      throw error;
    }
  }

  /**
   * 创建文件夹
   */
  async createFolder(folderName, parentFolderId = null) {
    try {
      await this.initialize();
      this.checkInitialized();

      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id,name'
      });

      logger.info(`文件夹创建成功: ${folderName}, ID: ${response.data.id}`);

      return {
        id: response.data.id,
        name: response.data.name
      };

    } catch (error) {
      logger.error('创建文件夹失败:', error);
      throw error;
    }
  }

  /**
   * 上传工作流结果
   */
  async uploadWorkflowResults(workflowId, workflowName = null) {
    try {
      await this.initialize();
      this.checkInitialized();

      const workflowDir = path.join(process.cwd(), 'workflows', workflowId);
      const outputDir = path.join(workflowDir, 'output');

      if (!await FileService.exists(outputDir)) {
        throw new Error(`输出目录不存在: ${outputDir}`);
      }

      // 创建工作流文件夹
      const folderName = workflowName || `Workflow_${workflowId}`;
      const folder = await this.createFolder(folderName);

      const uploadResults = [];

      // 上传模型文件
      const modelDir = path.join(outputDir, 'model');
      if (await FileService.exists(modelDir)) {
        const modelFiles = await FileService.listFiles(modelDir);
        
        for (const file of modelFiles) {
          try {
            const result = await this.uploadFile(
              file.path,
              `model_${file.name}`,
              folder.id
            );
            uploadResults.push({
              type: 'model',
              file: file.name,
              ...result
            });
          } catch (error) {
            logger.error(`上传模型文件失败 ${file.name}:`, error);
            uploadResults.push({
              type: 'model',
              file: file.name,
              error: error.message
            });
          }
        }
      }

      // 上传报告文件
      const reportsDir = path.join(outputDir, 'reports');
      if (await FileService.exists(reportsDir)) {
        const reportFiles = await FileService.listFiles(reportsDir);
        
        for (const file of reportFiles) {
          try {
            const result = await this.uploadFile(
              file.path,
              `report_${file.name}`,
              folder.id
            );
            uploadResults.push({
              type: 'report',
              file: file.name,
              ...result
            });
          } catch (error) {
            logger.error(`上传报告文件失败 ${file.name}:`, error);
            uploadResults.push({
              type: 'report',
              file: file.name,
              error: error.message
            });
          }
        }
      }

      // 上传配置文件
      const configFile = path.join(workflowDir, 'training-config.json');
      if (await FileService.exists(configFile)) {
        try {
          const result = await this.uploadFile(
            configFile,
            'training-config.json',
            folder.id
          );
          uploadResults.push({
            type: 'config',
            file: 'training-config.json',
            ...result
          });
        } catch (error) {
          logger.error('上传配置文件失败:', error);
          uploadResults.push({
            type: 'config',
            file: 'training-config.json',
            error: error.message
          });
        }
      }

      logger.info(`工作流结果上传完成: ${workflowId}, 文件夹ID: ${folder.id}`);

      return {
        folderId: folder.id,
        folderName: folder.name,
        totalFiles: uploadResults.length,
        successCount: uploadResults.filter(r => !r.error).length,
        results: uploadResults
      };

    } catch (error) {
      logger.error('上传工作流结果失败:', error);
      throw error;
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(fileId) {
    try {
      await this.initialize();
      this.checkInitialized();

      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id,name,size,mimeType,createdTime,modifiedTime,webViewLink,webContentLink'
      });

      return response.data;

    } catch (error) {
      logger.error('获取文件信息失败:', error);
      throw error;
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(fileId) {
    try {
      await this.initialize();
      this.checkInitialized();

      await this.drive.files.delete({
        fileId: fileId
      });

      logger.info(`文件删除成功: ${fileId}`);
      return true;

    } catch (error) {
      logger.error('删除文件失败:', error);
      throw error;
    }
  }

  /**
   * 生成分享链接
   */
  async createShareLink(fileId, role = 'reader') {
    try {
      await this.initialize();
      this.checkInitialized();

      // 创建权限
      await this.drive.permissions.create({
        fileId: fileId,
        resource: {
          role: role,
          type: 'anyone'
        }
      });

      // 获取文件信息
      const fileInfo = await this.getFileInfo(fileId);
      
      return {
        fileId: fileId,
        webViewLink: fileInfo.webViewLink,
        webContentLink: fileInfo.webContentLink
      };

    } catch (error) {
      logger.error('创建分享链接失败:', error);
      throw error;
    }
  }

  /**
   * 检查服务是否可用
   */
  async checkService() {
    try {
      await this.initialize();
      this.checkInitialized();

      // 尝试获取根目录信息
      await this.drive.files.get({
        fileId: 'root',
        fields: 'id,name'
      });

      return { available: true, message: 'Google Drive 服务正常' };

    } catch (error) {
      logger.error('Google Drive 服务检查失败:', error);
      return { available: false, error: error.message };
    }
  }
}

// 创建单例实例
const driveService = new DriveService();

module.exports = driveService; 