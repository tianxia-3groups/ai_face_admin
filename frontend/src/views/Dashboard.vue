<template>
  <div class="dashboard">
    <!-- 欢迎区域 -->
    <div class="welcome-section">
      <div class="welcome-content">
        <h1>
          <el-icon class="title-icon">
            <Star/>
          </el-icon>
          AI训练管理系统
        </h1>
        <p class="welcome-text">
          欢迎回来！当前有 <strong class="highlight">{{ stats.running }}</strong> 个流程正在运行，
          <strong class="highlight">{{ stats.waiting }}</strong> 个流程等待中。
        </p>
        <div class="quick-actions">
          <el-button
              type="primary"
              size="large"
              icon="Plus"
              class="action-btn primary-btn"
              @click="createWorkflow"
          >
            创建新训练
          </el-button>
          <el-button
              size="large"
              icon="FolderOpened"
              class="action-btn secondary-btn"
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
              :width="100"
              :stroke-width="8"
              color="#ffc107"
          >
            <template #default="{ percentage }">
              <div>
                <div class="progress-text">{{ percentage }}%</div>
                <div class="progress-label">系统繁忙度</div>
              </div>
            </template>
          </el-progress>
        </div>
        <div class="visual-decoration">
          <div class="floating-dot dot-1"></div>
          <div class="floating-dot dot-2"></div>
          <div class="floating-dot dot-3"></div>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <el-row :gutter="24">
        <el-col :xs="12" :sm="6" :lg="3">
          <StatCard
              type="running"
              :icon="VideoPlay"
              :number="stats.running"
              label="运行中"
          />
        </el-col>
        <el-col :xs="12" :sm="6" :lg="3">
          <StatCard
              type="waiting"
              :icon="Clock"
              :number="stats.waiting"
              label="等待中"
          />
        </el-col>
        <el-col :xs="12" :sm="6" :lg="3">
          <StatCard
              type="completed"
              :icon="Check"
              :number="stats.completed"
              label="已完成"
          />
        </el-col>
        <el-col :xs="12" :sm="6" :lg="3">
          <StatCard
              type="total"
              :icon="Folder"
              :number="stats.total"
              label="总流程"
          />
        </el-col>
      </el-row>
    </div>

    <!-- 主要内容区 -->
    <el-row :gutter="24" class="main-content">
      <!-- 活跃流程 -->
      <el-col :xs="24" :lg="14">
        <el-card class="content-card workflow-card" shadow="never">
          <template #header>
            <div class="card-header">
              <div class="header-left">
                <div class="header-icon">
                  <el-icon>
                    <VideoPlay/>
                  </el-icon>
                </div>
                <div class="header-info">
                  <span class="header-title">活跃流程</span>
                  <span class="header-subtitle">{{ activeWorkflows.length }} 个正在运行</span>
                </div>
              </div>
              <el-button type="primary" link @click="goToWorkflows">
                查看全部
                <el-icon class="ml-1">
                  <ArrowRight/>
                </el-icon>
              </el-button>
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
                <div class="workflow-name">
                  <span class="name-text">{{ workflow.name }}</span>
                  <el-tag :type="getStatusType(workflow.status)" size="small" class="status-tag">
                    {{ getStatusText(workflow.status) }}
                  </el-tag>
                </div>
                <div class="workflow-meta">
                  <span class="workflow-time">
                    <el-icon><Clock/></el-icon>
                    {{ formatTime(workflow.updatedAt) }}
                  </span>
                </div>
              </div>
              <div class="workflow-progress">
                <div class="progress-info">
                  <span class="progress-percent">{{ workflow.progress }}%</span>
                </div>
                <el-progress
                    :percentage="workflow.progress"
                    :status="getProgressStatus(workflow.status)"
                    :stroke-width="6"
                    :show-text="false"
                />
              </div>
            </div>

            <div v-if="activeWorkflows.length === 0" class="empty-state">
              <div class="empty-icon">
                <el-icon size="64">
                  <VideoPlay/>
                </el-icon>
              </div>
              <h3>暂无活跃流程</h3>
              <p>开始您的第一个AI训练流程</p>
              <el-button type="primary" class="create-btn" @click="createWorkflow">
                <el-icon>
                  <Plus/>
                </el-icon>
                创建第一个流程
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 侧边栏 -->
      <el-col :xs="24" :lg="10">
        <!-- 上传队列 -->
        <el-card class="content-card upload-card" shadow="never">
          <template #header>
            <div class="card-header">
              <div class="header-left">
                <div class="header-icon upload-icon">
                  <el-icon>
                    <Upload/>
                  </el-icon>
                </div>
                <div class="header-info">
                  <span class="header-title">上传队列</span>
                  <span class="header-subtitle">{{ uploadStats.uploading + uploadStats.waiting }} 个任务</span>
                </div>
              </div>
              <el-tag
                  :type="uploadQueueStatus.type"
                  size="small"
                  :class="['status-badge', uploadQueueStatus.type]"
              >
                {{ uploadQueueStatus.text }}
              </el-tag>
            </div>
          </template>

          <div class="upload-summary">
            <div class="upload-stats">
              <div class="upload-stat">
                <div class="stat-icon-mini waiting">
                  <el-icon>
                    <Clock/>
                  </el-icon>
                </div>
                <div class="stat-info">
                  <span class="value">{{ uploadStats.waiting }}</span>
                  <span class="label">等待上传</span>
                </div>
              </div>
              <div class="upload-stat">
                <div class="stat-icon-mini uploading">
                  <el-icon>
                    <Loading/>
                  </el-icon>
                </div>
                <div class="stat-info">
                  <span class="value">{{ uploadStats.uploading }}</span>
                  <span class="label">正在上传</span>
                </div>
              </div>
              <div class="upload-stat">
                <div class="stat-icon-mini completed">
                  <el-icon>
                    <Check/>
                  </el-icon>
                </div>
                <div class="stat-info">
                  <span class="value">{{ uploadStats.completed }}</span>
                  <span class="label">已完成</span>
                </div>
              </div>
            </div>

            <div v-if="uploadStats.uploading > 0" class="upload-progress">
              <div class="progress-header">
                <span class="progress-title">总体进度</span>
                <span class="progress-value">{{ globalUploadProgress }}%</span>
              </div>
              <el-progress
                  :percentage="globalUploadProgress"
                  :stroke-width="8"
                  :show-text="false"
                  color="#409eff"
              />
            </div>
          </div>
        </el-card>

        <!-- 系统状态 -->
        <el-card class="content-card system-card" shadow="never">
          <template #header>
            <div class="card-header">
              <div class="header-left">
                <div class="header-icon system-icon">
                  <el-icon>
                    <Monitor/>
                  </el-icon>
                </div>
                <div class="header-info">
                  <span class="header-title">系统状态</span>
                  <span class="header-subtitle">实时监控</span>
                </div>
              </div>
              <div class="system-status-header">
                <el-tag
                    :type="$socket?.isConnected() ? 'success' : 'warning'"
                    size="small"
                    class="connection-status"
                >
                  <el-icon>
                    <Connection/>
                  </el-icon>
                  <span class="ml-1"> {{ $socket?.isConnected() ? '实时监控' : '连接中...' }}</span>
                </el-tag>
              </div>
            </div>
          </template>

          <div class="system-metrics">
            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-label">CPU使用率</span>
                <span class="metric-value">{{ systemStatus.cpu }}%</span>
              </div>
              <el-progress
                  :percentage="systemStatus.cpu"
                  :stroke-width="8"
                  :status="systemStatus.cpu > 85 ? 'exception' : null"
                  :show-text="false"
                  color="#67c23a"
              />
            </div>
            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-label">GPU使用率</span>
                <span class="metric-value">{{ systemStatus.gpu }}%</span>
              </div>
              <el-progress
                  :percentage="systemStatus.gpu"
                  :stroke-width="8"
                  :status="systemStatus.gpu > 80 ? 'exception' : null"
                  :show-text="false"
                  color="#e6a23c"
              />
            </div>
            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-label">内存使用</span>
                <span class="metric-value">{{ systemStatus.memory }}%</span>
              </div>
              <el-progress
                  :percentage="systemStatus.memory"
                  :stroke-width="8"
                  :status="systemStatus.memory > 90 ? 'exception' : null"
                  :show-text="false"
                  color="#409eff"
              />
            </div>
            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-label">存储空间</span>
                <span class="metric-value">{{ systemStatus.disk }}%</span>
              </div>
              <el-progress
                  :percentage="systemStatus.disk"
                  :stroke-width="8"
                  :status="systemStatus.disk > 85 ? 'exception' : null"
                  :show-text="false"
                  color="#f56c6c"
              />
            </div>
          </div>
        </el-card>

        <!-- 最近活动 -->
        <el-card class="content-card activity-card" shadow="never">
          <template #header>
            <div class="card-header">
              <div class="header-left">
                <div class="header-icon activity-icon">
                  <el-icon>
                    <Bell/>
                  </el-icon>
                </div>
                <div class="header-info">
                  <span class="header-title">最近活动</span>
                  <span class="header-subtitle">系统动态</span>
                </div>
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
                  <component :is="activity.icon"/>
                </el-icon>
              </div>
              <div class="activity-content">
                <div class="activity-text">{{ activity.text }}</div>
                <div class="activity-time">{{ formatTime(activity.time) }}</div>
              </div>
            </div>

            <div v-if="recentActivities.length === 0" class="empty-activity">
              <div class="empty-icon">
                <el-icon size="48">
                  <Bell/>
                </el-icon>
              </div>
              <p>暂无最近活动</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import {ref, reactive, computed, onMounted, onUnmounted, inject} from 'vue'
import {useRouter} from 'vue-router'
import {
  Plus, FolderOpened, VideoPlay, Clock, Check, Folder, Upload,
  Monitor, Refresh, Bell, CircleCheck, Warning, CircleClose,
  Star, TrendCharts, Minus, ArrowRight, Loading, Connection
} from '@element-plus/icons-vue'
import WorkflowStatus from '@/components/WorkflowStatus.vue'
import StatCard from '@/components/StatCard.vue'
import {useWorkflowStore} from '@/store/workflow'
import {useDashboardStore} from '@/store/dashboard'
import {useUploadStore} from '@/store/upload'
import {workflowApi} from '@/api/workflow'
import request from '@/utils/request'

const router = useRouter()
const workflowStore = useWorkflowStore()
const dashboardStore = useDashboardStore()
const uploadStore = useUploadStore()
const $socket = inject('$socket')

// 统计数据
const stats = reactive({
  running: 0,
  waiting: 0,
  completed: 0,
  total: 0
})

// 上传统计
const uploadStats = reactive({
  waiting: 0,
  uploading: 0,
  completed: 0
})

// 系统状态
const systemStatus = reactive({
  cpu: 0,
  gpu: 0,
  memory: 0,
  disk: 0
})

// 活跃流程
const activeWorkflows = ref([])

// 最近活动
const recentActivities = ref([])

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
    return {type: 'primary', text: '上传中'}
  } else if (uploadStats.waiting > 0) {
    return {type: 'warning', text: '等待中'}
  } else {
    return {type: 'success', text: '空闲'}
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
    case 'completed':
      return 'success'
    case 'failed':
      return 'exception'
    case 'paused':
      return 'warning'
    default:
      return null
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

const refreshSystemStatus = async () => {
  try {
    const response = await request.get('/api/system/status')
    if (response.success) {
      Object.assign(systemStatus, response.data)
    }
  } catch (error) {
    console.error('刷新系统状态失败:', error)
  }
}

// 处理实时系统状态更新
const handleSystemStatusUpdate = (data) => {
  // console.log('收到实时系统状态:', data)
  // 确保数据正确更新到响应式对象
  systemStatus.cpu = data.cpu || 0
  systemStatus.memory = data.memory || 0
  systemStatus.disk = data.disk || 0
  systemStatus.gpu = data.gpu || 0
  // console.log('更新后的系统状态:', systemStatus)
}

const loadDashboardData = async () => {
  try {
    // 使用仪表板专用API获取数据
    const dashboardResponse = await workflowApi.getDashboardData()

    if (dashboardResponse.success) {
      const data = dashboardResponse.data

      // 更新统计数据
      Object.assign(stats, data.stats)

      // 更新活跃流程
      activeWorkflows.value = data.activeWorkflows.map(w => ({
        ...w,
        updatedAt: w.updatedAt ? new Date(w.updatedAt) : new Date()
      }))

      // 更新最近活动
      recentActivities.value = data.recentActivities.map(activity => ({
        id: activity.id,
        type: activity.type,
        icon: getActivityIcon(activity.type),
        text: activity.message || `${activity.workflowName} ${getStatusText(activity.status)}`,
        time: new Date(activity.timestamp)
      }))
    }

    // 加载上传队列数据
    await uploadStore.fetchTasks()
    Object.assign(uploadStats, uploadStore.taskStats)

    // 加载系统状态
    await refreshSystemStatus()

  } catch (error) {
    console.error('加载仪表板数据失败:', error)
    // 如果API失败，使用备用方法
    await loadDashboardDataFallback()
  }
}

// 备用数据加载方法
const loadDashboardDataFallback = async () => {
  try {
    // 加载工作流数据
    await workflowStore.fetchWorkflows()

    // 计算统计数据
    const workflows = workflowStore.workflows || []
    stats.total = workflows.length
    stats.running = workflows.filter(w => ['TRAINING', 'PROCESSING', 'UPLOADING'].includes(w.status)).length
    stats.waiting = workflows.filter(w => ['CREATED', 'MATERIALS_READY', 'CONFIGURING'].includes(w.status)).length
    stats.completed = workflows.filter(w => w.status === 'COMPLETED').length

    // 获取活跃流程（非完成状态的前5个）
    activeWorkflows.value = workflows
        .filter(w => w.status !== 'COMPLETED' && w.status !== 'CANCELLED')
        .slice(0, 5)
        .map(w => ({
          id: w.id,
          name: w.name,
          status: w.status,
          progress: w.progress?.current || 0,
          updatedAt: w.updatedAt ? new Date(w.updatedAt) : new Date()
        }))

    // 清空最近活动
    recentActivities.value = []

  } catch (error) {
    console.error('备用数据加载失败:', error)
  }
}

// 根据活动类型获取图标
const getActivityIcon = (type) => {
  const iconMap = {
    'success': CircleCheck,
    'error': CircleClose,
    'info': Upload,
    'warning': Warning
  }
  return iconMap[type] || Upload
}

// Socket.IO事件处理
const handleWorkflowUpdate = (data) => {
  // 更新工作流状态
  const workflow = activeWorkflows.value.find(w => w.id === data.workflowId)
  if (workflow) {
    workflow.status = data.status
    workflow.progress = data.progress || workflow.progress
  }

  // 重新计算统计数据
  loadDashboardData()
}

const handleUploadProgress = (data) => {
  // 更新上传进度
  uploadStats.uploading = data.uploading || uploadStats.uploading
  uploadStats.completed = data.completed || uploadStats.completed
}

// 新增方法
const getStatusType = (status) => {
  switch (status) {
    case 'TRAINING':
    case 'PROCESSING':
      return 'primary'
    case 'COMPLETED':
      return 'success'
    case 'FAILED':
      return 'danger'
    case 'MATERIALS_READY':
    case 'CONFIGURING':
      return 'warning'
    default:
      return 'info'
  }
}

const getStatusText = (status) => {
  const statusMap = {
    'TRAINING': '训练中',
    'PROCESSING': '处理中',
    'COMPLETED': '已完成',
    'FAILED': '失败',
    'MATERIALS_READY': '准备中',
    'CONFIGURING': '配置中',
    'CREATED': '已创建'
  }
  return statusMap[status] || status
}

// 生命周期
onMounted(() => {
  loadDashboardData()

  // 设置定时刷新其他数据（减少频率，因为系统状态已实时）
  const interval = setInterval(() => {
    // 只刷新工作流和上传数据，系统状态通过Socket实时更新
    loadDashboardData()
  }, 60000) // 60秒刷新一次其他数据

  // 监听Socket.IO事件
  if ($socket) {
    // 等待Socket连接成功后再加入系统监控
    if ($socket.isConnected()) {
      $socket.joinSystemMonitor()
    } else {
      // 如果还没连接，等待连接后再加入
      $socket.on('connect', () => {
        $socket.joinSystemMonitor()
      })
    }

    // 监听系统状态更新
    $socket.onSystemStatus(handleSystemStatusUpdate)
    // 监听其他事件
    $socket.onWorkflowStatusUpdate(handleWorkflowUpdate)
    $socket.onUploadProgress(handleUploadProgress)
  }

  // 清理定时器和Socket监听
  onUnmounted(() => {
    clearInterval(interval)
    if ($socket) {
      // 离开系统监控
      $socket.leaveSystemMonitor()
      // 清除所有监听器
      $socket.offSystemStatus()
      $socket.offWorkflowStatusUpdate()
      $socket.offUploadProgress()
    }
  })
})
</script>

<style scoped>
.dashboard {
  padding: 16px;
  background: #f8fafc;
  min-height: 100vh;
  max-height: 100vh;
  overflow-y: auto;
}

.welcome-section {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%);
  border-radius: 12px;
  color: white;
  box-shadow: 0 8px 25px rgba(79, 70, 229, 0.15);
  overflow: hidden;
}

.welcome-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)" /></svg>') repeat;
  opacity: 0.5;
}

.welcome-content {
  position: relative;
  z-index: 1;
}

.welcome-content h1 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.title-icon {
  font-size: 28px;
  color: #fbbf24;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.welcome-text {
  margin: 0 0 16px 0;
  font-size: 14px;
  opacity: 0.95;
  line-height: 1.4;
}

.highlight {
  color: #fbbf24;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.quick-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  font-weight: 600;
  border-radius: 8px;
  padding: 8px 16px;
  transition: all 0.3s ease;
}

.primary-btn {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
}

.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(251, 191, 36, 0.6);
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.welcome-visual {
  position: relative;
  display: flex;
  align-items: center;
  z-index: 1;
}

.status-ring :deep(.el-progress-circle__text) {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.progress-text {
  font-size: 16px;
  font-weight: 700;
  color: white;
  line-height: 1;
}

.progress-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 2px;
}

.visual-decoration {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.floating-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  animation: float 3s ease-in-out infinite;
}

.dot-1 {
  top: -60px;
  left: -60px;
  animation-delay: 0s;
}

.dot-2 {
  top: -40px;
  right: -80px;
  animation-delay: 1s;
}

.dot-3 {
  bottom: -50px;
  left: -40px;
  animation-delay: 2s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.stats-section {
  margin-bottom: 20px;
}

.main-content {
  margin-top: 20px;
}

.content-card {
  margin-bottom: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.content-card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.content-card :deep(.el-card__header) {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
  border-radius: 12px 12px 0 0;
}

.content-card :deep(.el-card__body) {
  padding: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  color: #6366f1;
  box-shadow: 0 1px 4px rgba(99, 102, 241, 0.15);
}

.upload-icon {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #3b82f6;
  box-shadow: 0 1px 4px rgba(59, 130, 246, 0.15);
}

.system-icon {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #10b981;
  box-shadow: 0 1px 4px rgba(16, 185, 129, 0.15);
}

.activity-icon {
  background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
  color: #f59e0b;
  box-shadow: 0 1px 4px rgba(245, 158, 11, 0.15);
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.header-subtitle {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}

.workflow-list {
  min-height: 200px;
}

.workflow-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.3s ease;
}

.workflow-item:hover {
  background-color: #f8fafc;
  margin: 0 -16px;
  padding: 12px 16px;
  border-radius: 8px;
  transform: translateX(2px);
}

.workflow-item:last-child {
  border-bottom: none;
}

.workflow-info {
  flex: 1;
}

.workflow-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.name-text {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.status-tag {
  font-weight: 500;
  border-radius: 4px;
  font-size: 11px;
}

.workflow-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.workflow-time {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}

.workflow-progress {
  width: 140px;
  text-align: right;
}

.progress-info {
  margin-bottom: 6px;
}

.progress-percent {
  font-size: 12px;
  color: #1f2937;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.empty-icon {
  margin-bottom: 16px;
  color: #d1d5db;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.empty-state p {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: #6b7280;
}

.create-btn {
  font-weight: 600;
  border-radius: 8px;
  padding: 8px 16px;
}

.upload-summary {
  margin-bottom: 16px;
}

.upload-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}

.upload-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.upload-stat:hover {
  background: #f1f5f9;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-icon-mini {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.stat-icon-mini.waiting {
  background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
  color: #f59e0b;
}

.stat-icon-mini.uploading {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #3b82f6;
}

.stat-icon-mini.completed {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #10b981;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.stat-info .value {
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
}

.stat-info .label {
  font-size: 10px;
  color: #6b7280;
  font-weight: 500;
}

.upload-progress {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-title {
  font-size: 12px;
  color: #374151;
  font-weight: 600;
}

.progress-value {
  font-size: 12px;
  color: #3b82f6;
  font-weight: 700;
}

.status-badge {
  font-weight: 600;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 11px;
}

.status-badge.primary {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1d4ed8;
  border: 1px solid #3b82f6;
}

.status-badge.warning {
  background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
  color: #92400e;
  border: 1px solid #f59e0b;
}

.status-badge.success {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #065f46;
  border: 1px solid #10b981;
}

.system-metrics {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.metric-item:hover {
  background: #f1f5f9;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  font-size: 12px;
  color: #374151;
  font-weight: 600;
}

.metric-value {
  font-size: 12px;
  color: #1f2937;
  font-weight: 700;
}

.refresh-btn {
  color: #6b7280;
  transition: all 0.3s ease;
}

.refresh-btn:hover {
  color: #3b82f6;
  transform: rotate(180deg);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 200px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.activity-item:hover {
  background: #f1f5f9;
  transform: translateY(-1px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.activity-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.activity-icon.success {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #059669;
}

.activity-icon.info {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #2563eb;
}

.activity-icon.warning {
  background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
  color: #d97706;
}

.activity-content {
  flex: 1;
}

.activity-text {
  font-size: 12px;
  color: #1f2937;
  margin-bottom: 4px;
  font-weight: 500;
  line-height: 1.3;
}

.activity-time {
  font-size: 10px;
  color: #6b7280;
  font-weight: 500;
}

.empty-activity {
  text-align: center;
  padding: 30px 20px;
  color: #6b7280;
}

.empty-activity .empty-icon {
  margin-bottom: 12px;
  color: #d1d5db;
}

.empty-activity p {
  margin: 0;
  font-size: 12px;
}

.ml-1 {
  margin-left: 4px;
}

.system-status-header {
  display: flex;
  align-items: center;
}

.connection-status {
  font-size: 11px;
  border: none;
  background: rgba(103, 194, 58, 0.1);
}

.connection-status.el-tag--warning {
  background: rgba(230, 162, 60, 0.1);
}

.refresh-btn {
  color: #606266;
  padding: 4px;
}

.refresh-btn:hover {
  color: #409eff;
}

@media (max-width: 768px) {
  .dashboard {
    padding: 12px;
    background: #f8fafc;
  }

  .welcome-section {
    flex-direction: column;
    text-align: center;
    gap: 16px;
    padding: 16px;
  }

  .welcome-content h1 {
    font-size: 20px;
  }

  .welcome-visual {
    order: -1;
  }

  .visual-decoration {
    display: none;
  }

  .stats-section {
    margin-bottom: 24px;
  }

  .main-content {
    margin-top: 24px;
  }

  .content-card {
    margin-bottom: 20px;
  }

  .content-card :deep(.el-card__header) {
    padding: 16px 20px;
  }

  .content-card :deep(.el-card__body) {
    padding: 20px;
  }

  .workflow-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px 0;
  }

  .workflow-item:hover {
    margin: 0 -20px;
    padding: 16px 20px;
  }

  .workflow-progress {
    width: 100%;
    text-align: left;
  }

  .upload-stats {
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }

  .upload-stat {
    padding: 12px;
  }

  .system-metrics {
    gap: 16px;
  }

  .metric-item {
    padding: 12px;
  }

  .activity-list {
    gap: 12px;
    max-height: 250px;
  }

  .activity-item {
    padding: 10px;
  }

  .activity-icon {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .dashboard {
    padding: 12px;
  }

  .welcome-section {
    padding: 20px 16px;
  }

  .welcome-content h1 {
    font-size: 24px;
  }

  .quick-actions {
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }

  .action-btn {
    width: 100%;
  }


  .header-icon {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }

  .header-title {
    font-size: 14px;
  }

  .header-subtitle {
    font-size: 11px;
  }
}
</style> 