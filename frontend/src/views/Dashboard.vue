<template>
  <div class="dashboard">
    <!-- 欢迎区域 -->
    <div class="welcome-section">
      <div class="welcome-content">
        <h1>AI训练管理系统</h1>
        <p class="welcome-text">
          欢迎回来！当前有 <strong>{{ stats.running }}</strong> 个流程正在运行，
          <strong>{{ stats.waiting }}</strong> 个流程等待中。
        </p>
        <div class="quick-actions">
          <el-button 
            type="primary" 
            size="large"
            icon="Plus"
            @click="createWorkflow"
          >
            创建新训练
          </el-button>
          <el-button 
            size="large"
            icon="FolderOpened"
            @click="goToWorkflows"
          >
            流程中心
          </el-button>
        </div>
      </div>
      <div class="welcome-visual">
        <div class="status-ring">
          <el-progress 
            type="circle" 
            :percentage="systemProgress"
            :width="120"
            :stroke-width="8"
          >
            <template #default="{ percentage }">
              <span class="progress-text">{{ percentage }}%</span>
              <span class="progress-label">系统繁忙度</span>
            </template>
          </el-progress>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :xs="12" :sm="6" :lg="3">
          <div class="stat-card">
            <div class="stat-icon running">
              <el-icon><VideoPlay /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.running }}</div>
              <div class="stat-label">运行中</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :lg="3">
          <div class="stat-card">
            <div class="stat-icon waiting">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.waiting }}</div>
              <div class="stat-label">等待中</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :lg="3">
          <div class="stat-card">
            <div class="stat-icon completed">
              <el-icon><Check /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.completed }}</div>
              <div class="stat-label">已完成</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :lg="3">
          <div class="stat-card">
            <div class="stat-icon total">
              <el-icon><Folder /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.total }}</div>
              <div class="stat-label">总流程</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 主要内容区 -->
    <el-row :gutter="20" class="main-content">
      <!-- 活跃流程 -->
      <el-col :xs="24" :lg="14">
        <el-card class="content-card" shadow="never">
          <template #header>
            <div class="card-header">
              <div class="header-left">
                <el-icon><VideoPlay /></el-icon>
                <span>活跃流程</span>
              </div>
              <el-button text @click="goToWorkflows">查看全部</el-button>
            </div>
          </template>
          
          <div class="workflow-list">
            <div 
              v-for="workflow in activeWorkflows" 
              :key="workflow.id"
              class="workflow-item"
              @click="viewWorkflow(workflow.id)"
            >
              <div class="workflow-info">
                <div class="workflow-name">{{ workflow.name }}</div>
                <div class="workflow-meta">
                  <WorkflowStatus :status="workflow.status" />
                  <span class="workflow-time">{{ formatTime(workflow.updatedAt) }}</span>
                </div>
              </div>
              <div class="workflow-progress">
                <el-progress 
                  :percentage="workflow.progress" 
                  :status="getProgressStatus(workflow.status)"
                  :stroke-width="6"
                />
                <div class="progress-text">{{ workflow.progress }}%</div>
              </div>
            </div>
            
            <div v-if="activeWorkflows.length === 0" class="empty-state">
              <el-icon size="48" color="#C0C4CC"><VideoPlay /></el-icon>
              <p>暂无活跃流程</p>
              <el-button type="primary" @click="createWorkflow">创建第一个流程</el-button>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 侧边栏 -->
      <el-col :xs="24" :lg="10">
        <!-- 上传队列 -->
        <el-card class="content-card upload-queue" shadow="never">
          <template #header>
            <div class="card-header">
              <div class="header-left">
                <el-icon><Upload /></el-icon>
                <span>上传队列</span>
              </div>
              <el-tag :type="uploadQueueStatus.type" size="small">
                {{ uploadQueueStatus.text }}
              </el-tag>
            </div>
          </template>
          
          <div class="upload-summary">
            <div class="upload-stats">
              <div class="upload-stat">
                <span class="label">等待上传</span>
                <span class="value">{{ uploadStats.waiting }}</span>
              </div>
              <div class="upload-stat">
                <span class="label">正在上传</span>
                <span class="value">{{ uploadStats.uploading }}</span>
              </div>
              <div class="upload-stat">
                <span class="label">已完成</span>
                <span class="value">{{ uploadStats.completed }}</span>
              </div>
            </div>
            
            <div v-if="uploadStats.uploading > 0" class="upload-progress">
              <el-progress 
                :percentage="globalUploadProgress"
                :stroke-width="8"
                :show-text="false"
              />
              <span class="progress-label">总体进度 {{ globalUploadProgress }}%</span>
            </div>
          </div>
        </el-card>

        <!-- 系统状态 -->
        <el-card class="content-card system-status" shadow="never">
          <template #header>
            <div class="card-header">
              <div class="header-left">
                <el-icon><Monitor /></el-icon>
                <span>系统状态</span>
              </div>
              <el-button text @click="refreshSystemStatus">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          
          <div class="system-metrics">
            <div class="metric-item">
              <div class="metric-label">GPU使用率</div>
              <el-progress 
                :percentage="systemStatus.gpu" 
                :stroke-width="6"
                :status="systemStatus.gpu > 80 ? 'exception' : null"
              />
            </div>
            <div class="metric-item">
              <div class="metric-label">内存使用</div>
              <el-progress 
                :percentage="systemStatus.memory"
                :stroke-width="6"
                :status="systemStatus.memory > 90 ? 'exception' : null"
              />
            </div>
            <div class="metric-item">
              <div class="metric-label">存储空间</div>
              <el-progress 
                :percentage="systemStatus.disk"
                :stroke-width="6" 
                :status="systemStatus.disk > 85 ? 'exception' : null"
              />
            </div>
          </div>
        </el-card>

        <!-- 最近活动 -->
        <el-card class="content-card recent-activity" shadow="never">
          <template #header>
            <div class="card-header">
              <div class="header-left">
                <el-icon><Bell /></el-icon>
                <span>最近活动</span>
              </div>
            </div>
          </template>
          
          <div class="activity-list">
            <div 
              v-for="activity in recentActivities" 
              :key="activity.id"
              class="activity-item"
            >
              <div class="activity-icon" :class="activity.type">
                <el-icon>
                  <component :is="activity.icon" />
                </el-icon>
              </div>
              <div class="activity-content">
                <div class="activity-text">{{ activity.text }}</div>
                <div class="activity-time">{{ formatTime(activity.time) }}</div>
              </div>
            </div>
            
            <div v-if="recentActivities.length === 0" class="empty-activity">
              <p>暂无最近活动</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Plus, FolderOpened, VideoPlay, Clock, Check, Folder, Upload, 
  Monitor, Refresh, Bell, CircleCheck, Warning, CircleClose 
} from '@element-plus/icons-vue'
import WorkflowStatus from '@/components/WorkflowStatus.vue'

const router = useRouter()

// 统计数据
const stats = reactive({
  running: 2,
  waiting: 3,
  completed: 15,
  total: 20
})

// 上传统计
const uploadStats = reactive({
  waiting: 5,
  uploading: 2,
  completed: 18
})

// 系统状态
const systemStatus = reactive({
  gpu: 65,
  memory: 72,
  disk: 45
})

// 活跃流程
const activeWorkflows = ref([
  {
    id: 'wf_001',
    name: '人物肖像训练_001',
    status: 'training_progress',
    progress: 65,
    updatedAt: new Date(Date.now() - 1800000) // 30分钟前
  },
  {
    id: 'wf_002',
    name: '风景照片训练_002',
    status: 'processing_materials',
    progress: 25,
    updatedAt: new Date(Date.now() - 600000) // 10分钟前
  }
])

// 最近活动
const recentActivities = ref([
  {
    id: 1,
    type: 'success',
    icon: CircleCheck,
    text: '人物肖像训练_001 训练阶段完成',
    time: new Date(Date.now() - 300000) // 5分钟前
  },
  {
    id: 2,
    type: 'info',
    icon: Upload,
    text: '风景照片训练_002 开始上传素材',
    time: new Date(Date.now() - 900000) // 15分钟前
  },
  {
    id: 3,
    type: 'warning',
    icon: Warning,
    text: '系统GPU使用率较高，建议关注',
    time: new Date(Date.now() - 1200000) // 20分钟前
  }
])

// 计算属性
const systemProgress = computed(() => {
  return Math.round((stats.running / Math.max(stats.total, 1)) * 100)
})

const globalUploadProgress = computed(() => {
  const total = uploadStats.waiting + uploadStats.uploading + uploadStats.completed
  return total > 0 ? Math.round((uploadStats.completed / total) * 100) : 0
})

const uploadQueueStatus = computed(() => {
  if (uploadStats.uploading > 0) {
    return { type: 'primary', text: '上传中' }
  } else if (uploadStats.waiting > 0) {
    return { type: 'warning', text: '等待中' }
  } else {
    return { type: 'success', text: '空闲' }
  }
})

// 方法
const createWorkflow = () => {
  router.push('/workflow/create')
}

const goToWorkflows = () => {
  router.push('/workflows')
}

const viewWorkflow = (workflowId) => {
  router.push(`/workflow/${workflowId}`)
}

const getProgressStatus = (status) => {
  switch (status) {
    case 'completed': return 'success'
    case 'failed': return 'exception'
    case 'paused': return 'warning'
    default: return null
  }
}

const formatTime = (date) => {
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days}天前`
  } else if (hours > 0) {
    return `${hours}小时前`
  } else if (minutes > 0) {
    return `${minutes}分钟前`
  } else {
    return '刚刚'
  }
}

const refreshSystemStatus = () => {
  // TODO: 刷新系统状态
  console.log('刷新系统状态')
}

const loadDashboardData = async () => {
  try {
    // TODO: 加载仪表板数据
    console.log('加载仪表板数据')
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

// 生命周期
onMounted(() => {
  loadDashboardData()
})
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.welcome-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.welcome-content h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
}

.welcome-text {
  margin: 0 0 20px 0;
  font-size: 16px;
  opacity: 0.9;
}

.quick-actions {
  display: flex;
  gap: 12px;
}

.welcome-visual {
  display: flex;
  align-items: center;
}

.status-ring :deep(.el-progress-circle__text) {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.progress-text {
  font-size: 18px;
  font-weight: 600;
  color: white;
  line-height: 1;
}

.progress-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4px;
}

.stats-section {
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
}

.stat-icon.running {
  background: #e8f4fd;
  color: #409eff;
}

.stat-icon.waiting {
  background: #fdf6ec;
  color: #e6a23c;
}

.stat-icon.completed {
  background: #f0f9ff;
  color: #67c23a;
}

.stat-icon.total {
  background: #f4f4f5;
  color: #909399;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.main-content {
  margin-top: 24px;
}

.content-card {
  margin-bottom: 20px;
}

.content-card :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.content-card :deep(.el-card__body) {
  padding: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.workflow-list {
  min-height: 200px;
}

.workflow-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.workflow-item:hover {
  background-color: #fafafa;
  margin: 0 -20px;
  padding: 16px 20px;
  border-radius: 6px;
}

.workflow-item:last-child {
  border-bottom: none;
}

.workflow-info {
  flex: 1;
}

.workflow-name {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
}

.workflow-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workflow-time {
  font-size: 12px;
  color: #909399;
}

.workflow-progress {
  width: 160px;
  text-align: right;
}

.progress-text {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.empty-state p {
  margin: 16px 0 20px 0;
}

.upload-summary {
  margin-bottom: 16px;
}

.upload-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.upload-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.upload-stat .label {
  font-size: 12px;
  color: #909399;
}

.upload-stat .value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.upload-progress {
  text-align: center;
}

.progress-label {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

.system-metrics {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 16px;
}

.activity-icon.success {
  background: #f0f9ff;
  color: #67c23a;
}

.activity-icon.info {
  background: #e8f4fd;
  color: #409eff;
}

.activity-icon.warning {
  background: #fdf6ec;
  color: #e6a23c;
}

.activity-content {
  flex: 1;
}

.activity-text {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.activity-time {
  font-size: 12px;
  color: #909399;
}

.empty-activity {
  text-align: center;
  padding: 20px;
  color: #909399;
}

@media (max-width: 768px) {
  .dashboard {
    padding: 10px;
  }
  
  .welcome-section {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }
  
  .welcome-visual {
    order: -1;
  }
  
  .workflow-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .workflow-progress {
    width: 100%;
    text-align: left;
  }
  
  .upload-stats {
    flex-direction: column;
    gap: 8px;
  }
  
  .upload-stat {
    flex-direction: row;
    justify-content: space-between;
  }
}
</style> 