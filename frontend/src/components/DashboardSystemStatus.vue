<template>
  <el-card class="system-card" shadow="never">
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
        <div class="system-status-header" v-if="showConnection">
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
      <!-- 运行时间（可选显示） -->
      <div v-if="showUptime" class="metric-item uptime-item">
        <div class="metric-header">
          <span class="metric-label">运行时间</span>
          <span class="metric-value uptime-value">{{ formatUptime(systemStatus.uptime) }}</span>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { reactive, onMounted, onUnmounted, inject } from 'vue'
import { Monitor, Connection } from '@element-plus/icons-vue'
import request from '@/utils/request'

// Props
const props = defineProps({
  showConnection: {
    type: Boolean,
    default: true
  },
  showUptime: {
    type: Boolean,
    default: false
  }
})

const $socket = inject('$socket')

// 系统状态数据 - 完全使用仪表板相同的逻辑
const systemStatus = reactive({
  cpu: 0,
  gpu: 0,
  memory: 0,
  disk: 0,
  uptime: 0
})

// 格式化运行时间
const formatUptime = (seconds) => {
  if (!seconds) return '0分钟'
  
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) {
    return `${days}天 ${hours}小时`
  } else if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`
  } else {
    return `${minutes}分钟`
  }
}

// 刷新系统状态 - 与仪表板完全相同
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

// 处理实时系统状态更新 - 与仪表板完全相同
const handleSystemStatusUpdate = (data) => {
  systemStatus.cpu = data.cpu || 0
  systemStatus.memory = data.memory || 0
  systemStatus.disk = data.disk || 0
  systemStatus.gpu = data.gpu || 0
  systemStatus.uptime = data.uptime || 0
}

// 生命周期 - 与仪表板逻辑一致
onMounted(() => {
  // 加载系统状态
  refreshSystemStatus()

  // 监听Socket.IO事件 - 与仪表板完全相同
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
  }
})

// 清理 - 与仪表板一致
onUnmounted(() => {
  if ($socket) {
    // 离开系统监控
    $socket.leaveSystemMonitor()
    // 清除监听器
    $socket.offSystemStatus()
  }
})

// 暴露给父组件
defineExpose({
  systemStatus,
  refreshSystemStatus
})
</script>

<style scoped>
.system-card {
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.system-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.system-card :deep(.el-card__header) {
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
}

.system-card :deep(.el-card__body) {
  padding: 20px 24px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.system-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
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
  line-height: 1.2;
}

.header-subtitle {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.2;
}

.connection-status {
  border: none;
  font-size: 12px;
  padding: 4px 8px;
}

.connection-status.el-tag--success {
  background: rgba(34, 197, 94, 0.1);
  color: #059669;
}

.connection-status.el-tag--warning {
  background: rgba(251, 146, 60, 0.1);
  color: #ea580c;
}

.ml-1 {
  margin-left: 4px;
}

.system-metrics {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.uptime-item .metric-header {
  padding: 12px 0;
}

.uptime-value {
  color: #6366f1;
  font-size: 14px;
}

@media (max-width: 768px) {
  .system-card :deep(.el-card__header) {
    padding: 16px 20px;
  }
  
  .system-card :deep(.el-card__body) {
    padding: 16px 20px;
  }
  
  .header-icon {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }
  
  .header-title {
    font-size: 15px;
  }
  
  .system-metrics {
    gap: 16px;
  }
}
</style> 