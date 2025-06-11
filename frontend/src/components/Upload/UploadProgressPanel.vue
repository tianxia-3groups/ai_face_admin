<template>
  <div class="upload-progress-panel">
    <div class="panel-header">
      <div class="header-title">
        <el-icon><Upload /></el-icon>
        <span>上传管理</span>
        <el-badge :value="uploadStore.uploadingCount" :max="99" type="primary" />
      </div>
      
      <div class="header-actions">
        <el-button 
          v-if="uploadStore.completedFiles.length > 0"
          size="small" 
          @click="uploadStore.clearCompleted"
        >
          清除已完成
        </el-button>
        <el-button 
          v-if="uploadStore.totalFiles > 0"
          size="small" 
          type="danger"
          @click="uploadStore.clearAll"
        >
          清除全部
        </el-button>
      </div>
    </div>

    <div class="panel-body">
      <!-- 全局进度 -->
      <div v-if="uploadStore.hasUploading" class="global-progress">
        <div class="progress-info">
          <span>总体进度</span>
          <span>{{ uploadStore.globalProgress }}%</span>
        </div>
        <el-progress 
          :percentage="uploadStore.globalProgress" 
          :stroke-width="4"
          :show-text="false"
        />
      </div>

      <!-- 上传任务列表 -->
      <div class="upload-list">
        <div 
          v-for="task in uploadStore.uploadQueue" 
          :key="task.id"
          class="upload-item"
          :class="{ 'is-completed': task.status === 'completed' }"
        >
          <div class="item-icon">
            <el-icon v-if="task.status === 'completed'" class="success-icon">
              <Check />
            </el-icon>
            <el-icon v-else-if="task.status === 'failed'" class="error-icon">
              <Close />
            </el-icon>
            <el-icon v-else-if="task.status === 'paused'" class="pause-icon">
              <VideoPause />
            </el-icon>
            <el-icon v-else class="uploading-icon">
              <Document />
            </el-icon>
          </div>
          
          <div class="item-content">
            <div class="item-header">
              <span class="file-name" :title="task.name">{{ task.name }}</span>
              <span class="file-size">{{ formatFileSize(task.size) }}</span>
            </div>
            
            <div class="item-progress">
              <el-progress 
                v-if="task.status !== 'completed'"
                :percentage="task.progress" 
                :stroke-width="3"
                :show-text="false"
                :status="task.status === 'failed' ? 'exception' : ''"
              />
              
              <div v-if="task.status === 'uploading'" class="progress-details">
                <span>{{ formatFileSize(task.uploadedSize) }} / {{ formatFileSize(task.size) }}</span>
                <span v-if="task.speed > 0">{{ formatSpeed(task.speed) }}</span>
                <span v-if="task.remainingTime > 0">剩余 {{ formatTime(task.remainingTime) }}</span>
              </div>
              
              <div v-if="task.status === 'failed' && task.error" class="error-message">
                {{ task.error }}
              </div>
            </div>
          </div>
          
          <div class="item-actions">
            <el-button-group size="small">
              <el-button 
                v-if="task.status === 'uploading'"
                @click="pauseUpload(task.id)"
                :icon="VideoPause"
              />
              <el-button 
                v-if="task.status === 'paused'"
                @click="resumeUpload(task.id)"
                :icon="VideoPlay"
              />
              <el-button 
                v-if="task.status === 'failed'"
                @click="retryUpload(task.id)"
                :icon="Refresh"
              />
              <el-button 
                @click="cancelUpload(task.id)"
                :icon="Close"
                type="danger"
              />
            </el-button-group>
          </div>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-if="uploadStore.totalFiles === 0" class="empty-state">
        <el-icon class="empty-icon"><Upload /></el-icon>
        <p>暂无上传任务</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useUploadStore } from '@/store/upload'

const uploadStore = useUploadStore()

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化传输速度
const formatSpeed = (bytesPerSecond) => {
  return formatFileSize(bytesPerSecond) + '/s'
}

// 格式化时间
const formatTime = (seconds) => {
  if (seconds < 60) return `${Math.round(seconds)}秒`
  if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`
  return `${Math.round(seconds / 3600)}小时`
}

// 暂停上传
const pauseUpload = (taskId) => {
  uploadStore.pauseUpload(taskId)
}

// 恢复上传
const resumeUpload = (taskId) => {
  uploadStore.resumeUpload(taskId)
}

// 重试上传
const retryUpload = (taskId) => {
  uploadStore.retryUpload(taskId)
}

// 取消上传
const cancelUpload = (taskId) => {
  uploadStore.cancelUpload(taskId)
}
</script>

<style scoped>
.upload-progress-panel {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.panel-body {
  max-height: 400px;
  overflow-y: auto;
}

.global-progress {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
}

.upload-list {
  padding: 8px 0;
}

.upload-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 20px;
  border-bottom: 1px solid #f5f5f5;
  transition: background-color 0.3s;
}

.upload-item:hover {
  background: #f8f9fa;
}

.upload-item.is-completed {
  opacity: 0.7;
}

.item-icon {
  margin-right: 12px;
  padding-top: 2px;
}

.success-icon {
  color: #67c23a;
}

.error-icon {
  color: #f56c6c;
}

.pause-icon {
  color: #e6a23c;
}

.uploading-icon {
  color: #409eff;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.file-name {
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.file-size {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}

.item-progress {
  margin-bottom: 4px;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.error-message {
  font-size: 12px;
  color: #f56c6c;
  margin-top: 4px;
}

.item-actions {
  margin-left: 12px;
  padding-top: 2px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.empty-icon {
  font-size: 48px;
  color: #c0c4cc;
  margin-bottom: 12px;
}
</style> 