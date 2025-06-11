<template>
  <div class="upload-manager">
    <!-- 上传管理器标题栏 -->
    <div class="upload-header">
      <div class="header-left">
        <el-icon class="header-icon"><UploadFilled /></el-icon>
        <span class="header-title">上传管理器</span>
        <el-badge :value="stats.total" class="header-badge" />
      </div>
      <div class="header-right">
        <el-button 
          size="small" 
          @click="refreshTasks"
          :loading="loading"
        >
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="upload-stats">
      <div class="stat-item">
        <span class="stat-label">总计</span>
        <span class="stat-value">{{ stats.total }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">上传中</span>
        <span class="stat-value uploading">{{ stats.uploading }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">等待中</span>
        <span class="stat-value waiting">{{ stats.waiting }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">已完成</span>
        <span class="stat-value completed">{{ stats.completed }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">失败</span>
        <span class="stat-value failed">{{ stats.failed }}</span>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="upload-tasks" v-loading="loading">
      <div 
        v-for="task in filteredTasks" 
        :key="task.id"
        class="upload-task"
        :class="[`task-${task.status}`]"
      >
        <!-- 任务状态图标 -->
        <div class="task-status-icon">
          <el-icon v-if="task.status === 'uploading'" class="uploading">
            <Loading />
          </el-icon>
          <el-icon v-else-if="task.status === 'waiting'" class="waiting">
            <Clock />
          </el-icon>
          <el-icon v-else-if="task.status === 'completed'" class="completed">
            <CircleCheck />
          </el-icon>
          <el-icon v-else-if="task.status === 'failed'" class="failed">
            <CircleClose />
          </el-icon>
        </div>

        <!-- 任务信息 -->
        <div class="task-info">
          <div class="task-header">
            <span class="task-name">{{ task.name || `任务 ${task.id}` }}</span>
            <span class="task-workflow">{{ getWorkflowName(task.workflowId) }}</span>
          </div>
          
          <div class="task-details">
            <span class="file-count">{{ task.files?.length || 0 }} 个文件</span>
            <span class="file-size">{{ formatFileSize(task.totalSize) }}</span>
            <span class="task-time">{{ formatTime(task.createdAt) }}</span>
          </div>

          <!-- 进度条 -->
          <div class="task-progress" v-if="['uploading', 'processing'].includes(task.status)">
            <el-progress 
              :percentage="task.progress || 0"
              :status="getProgressStatus(task.status)"
              :stroke-width="4"
            />
          </div>

          <!-- 错误信息 -->
          <div class="task-error" v-if="task.status === 'failed' && task.error">
            <el-text type="danger" size="small">{{ task.error }}</el-text>
          </div>
        </div>

        <!-- 任务操作 -->
        <div class="task-actions">
          <el-button-group size="small">
            <el-button 
              v-if="task.status === 'failed'"
              @click.stop="retryTask(task.id)"
              :loading="task.loading"
              type="warning"
            >
              <el-icon><Refresh /></el-icon>
            </el-button>
            
            <el-button 
              @click.stop="deleteTask(task.id)"
              :loading="task.loading"
              type="danger"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-button-group>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredTasks.length === 0" class="empty-state">
        <el-empty description="暂无上传任务" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  UploadFilled,
  Refresh,
  Delete,
  Loading,
  Clock,
  CircleCheck,
  CircleClose
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUploadStore } from '@/store/upload'
import { useWorkflowStore } from '@/store/workflow'
import * as uploadApi from '@/api/upload'

const uploadStore = useUploadStore()
const workflowStore = useWorkflowStore()

// 响应式数据
const loading = ref(false)
const tasks = ref([])
const refreshTimer = ref(null)

// 统计数据
const stats = computed(() => ({
  total: tasks.value.length,
  uploading: tasks.value.filter(t => t.status === 'uploading').length,
  waiting: tasks.value.filter(t => t.status === 'waiting').length,
  completed: tasks.value.filter(t => t.status === 'completed').length,
  failed: tasks.value.filter(t => t.status === 'failed').length
}))

// 过滤后的任务列表
const filteredTasks = computed(() => {
  return tasks.value.slice(0, 20) // 只显示前20个任务
})

// 生命周期
onMounted(() => {
  loadTasks()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})

// 方法
async function loadTasks() {
  loading.value = true
  try {
    const response = await uploadApi.getUploadTasks()
    tasks.value = response.data || []
  } catch (error) {
    console.error('加载上传任务失败:', error)
    ElMessage.error('加载上传任务失败')
  } finally {
    loading.value = false
  }
}

async function refreshTasks() {
  await loadTasks()
}

function startAutoRefresh() {
  refreshTimer.value = setInterval(() => {
    loadTasks()
  }, 5000) // 每5秒刷新一次
}

function stopAutoRefresh() {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
    refreshTimer.value = null
  }
}

async function retryTask(taskId) {
  const task = tasks.value.find(t => t.id === taskId)
  if (!task) return
  
  task.loading = true
  try {
    await uploadApi.retryUploadTask(taskId)
    task.status = 'waiting'
    task.error = null
    ElMessage.success('任务已重新加入队列')
  } catch (error) {
    console.error('重试任务失败:', error)
    ElMessage.error('重试任务失败')
  } finally {
    task.loading = false
  }
}

async function deleteTask(taskId) {
  try {
    await ElMessageBox.confirm('确定要删除这个上传任务吗？', '确认删除', {
      type: 'warning'
    })
    
    const task = tasks.value.find(t => t.id === taskId)
    if (!task) return
    
    task.loading = true
    await uploadApi.deleteUploadTask(taskId)
    
    // 从列表中移除
    tasks.value = tasks.value.filter(t => t.id !== taskId)
    
    ElMessage.success('任务已删除')
  } catch (error) {
    if (error === 'cancel') return
    console.error('删除任务失败:', error)
    ElMessage.error('删除任务失败')
  }
}

function getWorkflowName(workflowId) {
  const workflow = workflowStore.workflows.find(w => w.id === workflowId)
  return workflow?.name || `工作流 ${workflowId.slice(0, 8)}`
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  
  const now = new Date()
  const time = new Date(timestamp)
  const diff = now - time
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return time.toLocaleDateString()
}

function getProgressStatus(status) {
  switch (status) {
    case 'uploading': return 'success'
    case 'processing': return 'warning'
    default: return ''
  }
}
</script>

<style scoped>
.upload-manager {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.upload-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 18px;
  color: #409eff;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-badge {
  margin-left: 8px;
}

.upload-stats {
  display: flex;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.stat-value.uploading {
  color: #409eff;
}

.stat-value.waiting {
  color: #e6a23c;
}

.stat-value.completed {
  color: #67c23a;
}

.stat-value.failed {
  color: #f56c6c;
}

.upload-tasks {
  max-height: 600px;
  overflow-y: auto;
}

.upload-task {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.upload-task:hover {
  background: #f8f9fa;
}

.task-status-icon {
  margin-right: 12px;
  font-size: 20px;
}

.task-status-icon .uploading {
  color: #409eff;
  animation: spin 1s linear infinite;
}

.task-status-icon .waiting {
  color: #e6a23c;
}

.task-status-icon .completed {
  color: #67c23a;
}

.task-status-icon .failed {
  color: #f56c6c;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.task-info {
  flex: 1;
  min-width: 0;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.task-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.task-workflow {
  font-size: 12px;
  color: #909399;
}

.task-details {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.task-progress {
  margin-bottom: 4px;
}

.task-error {
  margin-top: 4px;
}

.task-actions {
  margin-left: 16px;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
}
</style> 