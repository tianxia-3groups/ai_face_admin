<template>
  <div class="upload-queue-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <div class="title-group">
            <h1>
              <el-icon class="title-icon"><Upload /></el-icon>
              上传队列管理
            </h1>
            <p class="subtitle">管理所有工作流的上传任务和队列状态</p>
          </div>
        </div>
        <div class="header-right">
          <el-button @click="refreshTasks" class="refresh-btn">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-button type="danger" @click="clearCompleted" class="clear-btn">
            <el-icon><Delete /></el-icon>
            清理已完成
          </el-button>
        </div>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="task-list-section">
      <el-card class="task-list-card" shadow="never">
        <template #header>
          <div class="card-header">
            <div class="header-left">
              <div class="header-icon">
                <el-icon><List /></el-icon>
              </div>
              <div class="header-info">
                <span class="header-title">上传任务列表</span>
                <span class="header-subtitle">{{ uploadStore.uploadQueue.length }} 个任务</span>
              </div>
            </div>
            <div class="header-actions">
              <el-button @click="refreshTasks" class="action-btn">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
              <el-button type="danger" @click="clearCompleted" class="action-btn">
                <el-icon><Delete /></el-icon>
                清理已完成
              </el-button>
            </div>
          </div>
        </template>

        <el-table :data="uploadStore.uploadQueue" class="upload-table">
          <el-table-column prop="id" label="任务ID" width="120">
            <template #default="{ row }">
              <div class="task-id">
                <el-icon><Document /></el-icon>
                <span>{{ row.id }}</span>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="workflowId" label="所属流程" width="150">
            <template #default="{ row }">
              <div class="workflow-link">
                <el-icon><VideoPlay /></el-icon>
                <span>{{ row.workflowId }}</span>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="name" label="文件名">
            <template #default="{ row }">
              <div class="file-info">
                <div class="file-icon">
                  <el-icon><Picture /></el-icon>
                </div>
                <div class="file-details">
                  <span class="file-name">{{ row.name }}</span>
                  <span class="file-type">{{ getFileType(row.name) }}</span>
                </div>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="size" label="文件大小" width="120">
            <template #default="{ row }">
              <div class="file-size">
                {{ formatFileSize(row.size) }}
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="status" label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" class="status-tag">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="progress" label="进度" width="180">
            <template #default="{ row }">
              <div class="progress-cell">
                <div class="progress-info">
                  <span class="progress-text">{{ row.progress || 0 }}%</span>
                  <span class="progress-speed" v-if="row.status === 'uploading'">
                    {{ getUploadSpeed(row) }}
                  </span>
                </div>
                <el-progress 
                  :percentage="row.progress || 0" 
                  :status="getProgressStatus(row.status)"
                  :stroke-width="8"
                  :show-text="false"
                />
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button 
                  v-if="row.status === 'uploading'" 
                  size="small" 
                  type="warning"
                  @click="pauseTask(row.id)"
                  class="action-btn"
                >
                  <el-icon><VideoPause /></el-icon>
                  暂停
                </el-button>
                <el-button 
                  v-if="row.status === 'paused'" 
                  size="small" 
                  type="primary" 
                  @click="resumeTask(row.id)"
                  class="action-btn"
                >
                  <el-icon><VideoPlay /></el-icon>
                  继续
                </el-button>
                <el-button 
                  v-if="row.status === 'failed'" 
                  size="small" 
                  type="success" 
                  @click="retryTask(row.id)"
                  class="action-btn"
                >
                  <el-icon><RefreshRight /></el-icon>
                  重试
                </el-button>
                <el-button 
                  size="small" 
                  type="danger" 
                  @click="deleteTask(row.id)"
                  class="action-btn"
                >
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 空状态 -->
        <div v-if="uploadStore.uploadQueue.length === 0" class="empty-state">
          <div class="empty-icon">
            <el-icon size="64"><Upload /></el-icon>
          </div>
          <h3>暂无上传任务</h3>
          <p>当前没有任何文件在上传队列中</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useUploadStore } from '@/store/upload'
import { ElMessage } from 'element-plus'
import { 
  Upload, Refresh, Delete, Folder, Loading, Check, Warning, List,
  Document, VideoPlay, Picture, VideoPause, RefreshRight
} from '@element-plus/icons-vue'

const uploadStore = useUploadStore()

onMounted(() => {
  refreshTasks()
})

const refreshTasks = async () => {
  try {
    // 无需异步获取，直接刷新显示
    ElMessage.success('刷新成功')
  } catch (error) {
    ElMessage.error('刷新失败')
  }
}

const clearCompleted = async () => {
  try {
    uploadStore.clearCompleted()
    ElMessage.success('清理完成')
  } catch (error) {
    ElMessage.error('清理失败')
  }
}

const pauseTask = async (taskId) => {
  try {
    uploadStore.pauseUpload(taskId)
    ElMessage.success('已暂停')
  } catch (error) {
    ElMessage.error('暂停失败')
  }
}

const resumeTask = async (taskId) => {
  try {
    uploadStore.resumeUpload(taskId)
    ElMessage.success('已继续')
  } catch (error) {
    ElMessage.error('继续失败')
  }
}

const retryTask = async (taskId) => {
  try {
    uploadStore.retryUpload(taskId)
    ElMessage.success('重试中')
  } catch (error) {
    ElMessage.error('重试失败')
  }
}

const deleteTask = async (taskId) => {
  try {
    uploadStore.cancelUpload(taskId)
    ElMessage.success('已删除')
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileType = (filename) => {
  const ext = filename.split('.').pop()?.toUpperCase()
  return ext || 'FILE'
}

const getUploadSpeed = (task) => {
  // 模拟上传速度计算
  return '2.5 MB/s'
}

const getStatusType = (status) => {
  const typeMap = {
    waiting: 'info',
    uploading: 'primary',
    paused: 'warning',
    completed: 'success',
    failed: 'danger'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status) => {
  const textMap = {
    waiting: '等待中',
    uploading: '上传中',
    paused: '已暂停',
    completed: '已完成',
    failed: '失败'
  }
  return textMap[status] || status
}

const getProgressStatus = (status) => {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'exception'
  return null
}
</script>

<style scoped>
.upload-queue-page {
  padding: 16px;
  background: #f8fafc;
  min-height: 100vh;
}

.page-header {
  position: relative;
  margin-bottom: 24px;
  padding: 24px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%);
  border-radius: 12px;
  color: white;
  box-shadow: 0 8px 25px rgba(79, 70, 229, 0.15);
  overflow: hidden;
}

.page-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)" /></svg>') repeat;
  opacity: 0.5;
}

.header-content {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-group h1 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.title-icon {
  font-size: 32px;
  color: #fbbf24;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.subtitle {
  margin: 0;
  font-size: 16px;
  opacity: 0.95;
  line-height: 1.4;
}

.header-right {
  display: flex;
  gap: 12px;
}

.refresh-btn, .clear-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-weight: 600;
  border-radius: 8px;
  padding: 10px 20px;
  transition: all 0.3s ease;
}

.refresh-btn:hover, .clear-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.stats-section {
  margin-bottom: 24px;
}

.stat-card {
  position: relative;
  display: flex;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--card-color), var(--card-color-light));
}

.total-card {
  --card-color: #8b5cf6;
  --card-color-light: #a78bfa;
}

.uploading-card {
  --card-color: #3b82f6;
  --card-color-light: #60a5fa;
}

.completed-card {
  --card-color: #10b981;
  --card-color-light: #34d399;
}

.failed-card {
  --card-color: #ef4444;
  --card-color-light: #f87171;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.total-card .stat-icon {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
  color: #8b5cf6;
}

.uploading-card .stat-icon {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #3b82f6;
}

.completed-card .stat-icon {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #10b981;
}

.failed-card .stat-icon {
  background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
  color: #ef4444;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.task-list-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.task-list-section:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.task-list-card :deep(.el-card__header) {
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
  border-radius: 12px 12px 0 0;
}

.task-list-card :deep(.el-card__body) {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.header-subtitle {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.action-btn:hover {
  transform: translateY(-1px);
}

.upload-table :deep(.el-table__header) {
  background: #f8fafc;
}

.upload-table :deep(.el-table th) {
  background: #f8fafc;
  color: #374151;
  font-weight: 600;
  border-bottom: 1px solid #e5e7eb;
}

.upload-table :deep(.el-table td) {
  border-bottom: 1px solid #f1f5f9;
  padding: 16px 0;
}

.upload-table :deep(.el-table__row:hover) {
  background: #f8fafc;
}

.task-id, .workflow-link {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
  color: #f59e0b;
  font-size: 16px;
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.file-type {
  font-size: 11px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

.file-size {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.status-tag {
  border-radius: 6px;
  font-weight: 500;
}

.progress-cell {
  padding: 4px 0;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-text {
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
}

.progress-speed {
  font-size: 11px;
  color: #3b82f6;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.empty-icon {
  margin-bottom: 20px;
  color: #d1d5db;
}

.empty-state h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

@media (max-width: 768px) {
  .upload-queue-page {
    padding: 12px;
  }

  .page-header {
    padding: 20px 16px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .title-group h1 {
    font-size: 24px;
  }

  .header-right {
    justify-content: center;
  }

  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
  }

  .action-buttons {
    flex-direction: column;
    gap: 4px;
    align-items: stretch;
  }

  .action-btn {
    width: 100%;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .upload-queue-page {
    padding: 8px;
  }

  .page-header {
    padding: 16px 12px;
  }

  .title-group h1 {
    font-size: 20px;
  }

  .stat-card {
    padding: 16px;
  }

  .stat-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
    margin-right: 12px;
  }

  .stat-number {
    font-size: 20px;
  }
}
</style> 