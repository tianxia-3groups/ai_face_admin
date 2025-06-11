<template>
  <div class="training-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <el-breadcrumb>
        <el-breadcrumb-item :to="{ path: '/workflows' }">流程中心</el-breadcrumb-item>
        <el-breadcrumb-item>训练管理</el-breadcrumb-item>
      </el-breadcrumb>
      <h1 class="page-title">训练管理</h1>
    </div>

    <!-- 训练配置卡片 -->
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>训练配置</span>
          <el-button v-if="!isTraining" type="primary" @click="startTraining">
            <el-icon><VideoPlay /></el-icon>
            开始训练
          </el-button>
          <el-button v-else type="danger" @click="stopTraining">
            <el-icon><VideoPause /></el-icon>
            停止训练
          </el-button>
        </div>
      </template>

      <el-form :model="trainingConfig" label-width="120px" :disabled="isTraining">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="模型名称">
              <el-input v-model="trainingConfig.modelName" placeholder="请输入模型名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="训练轮数">
              <el-input-number
                v-model="trainingConfig.epochs"
                :min="1"
                :max="1000"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="学习率">
              <el-input-number
                v-model="trainingConfig.learningRate"
                :min="0.0001"
                :max="1"
                :step="0.0001"
                :precision="4"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="批次大小">
              <el-select v-model="trainingConfig.batchSize" style="width: 100%">
                <el-option label="4" :value="4" />
                <el-option label="8" :value="8" />
                <el-option label="16" :value="16" />
                <el-option label="32" :value="32" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="训练描述">
          <el-input
            v-model="trainingConfig.description"
            type="textarea"
            :rows="3"
            placeholder="请输入训练描述"
          />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 训练状态卡片 -->
    <el-card class="status-card">
      <template #header>
        <span>训练状态</span>
      </template>

      <div v-if="!isTraining && !trainingHistory.length" class="empty-state">
        <el-empty description="暂无训练记录" />
      </div>

      <div v-else>
        <!-- 当前训练状态 -->
        <div v-if="isTraining" class="current-training">
          <div class="training-info">
            <h3>{{ currentTraining.modelName }}</h3>
            <p>{{ currentTraining.description }}</p>
          </div>

          <div class="progress-section">
            <div class="progress-header">
              <span>训练进度</span>
              <span>{{ currentTraining.currentEpoch }}/{{ currentTraining.totalEpochs }}</span>
            </div>
            <el-progress
              :percentage="trainingProgress"
              :status="trainingStatus"
              :stroke-width="8"
            />
          </div>

          <div class="metrics-grid">
            <div class="metric-item">
              <div class="metric-label">损失值</div>
              <div class="metric-value">{{ currentTraining.loss?.toFixed(4) || 'N/A' }}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">准确率</div>
              <div class="metric-value">{{ (currentTraining.accuracy * 100)?.toFixed(2) || 'N/A' }}%</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">用时</div>
              <div class="metric-value">{{ formatTime(currentTraining.elapsedTime) }}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">预计剩余</div>
              <div class="metric-value">{{ formatTime(currentTraining.estimatedTime) }}</div>
            </div>
          </div>

          <!-- 实时日志 -->
          <div class="logs-section">
            <div class="logs-header">
              <span>训练日志</span>
              <el-button size="small" @click="clearLogs">清空日志</el-button>
            </div>
            <div class="logs-container">
              <div
                v-for="(log, index) in trainingLogs"
                :key="index"
                class="log-item"
                :class="log.level"
              >
                <span class="log-time">{{ formatLogTime(log.timestamp) }}</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 训练历史 -->
        <div v-if="trainingHistory.length" class="training-history">
          <h3>训练历史</h3>
          <el-table :data="trainingHistory" style="width: 100%">
            <el-table-column prop="modelName" label="模型名称" />
            <el-table-column prop="epochs" label="训练轮数" width="100" />
            <el-table-column prop="finalLoss" label="最终损失" width="120">
              <template #default="{ row }">
                {{ row.finalLoss?.toFixed(4) || 'N/A' }}
              </template>
            </el-table-column>
            <el-table-column prop="finalAccuracy" label="最终准确率" width="120">
              <template #default="{ row }">
                {{ (row.finalAccuracy * 100)?.toFixed(2) || 'N/A' }}%
              </template>
            </el-table-column>
            <el-table-column prop="duration" label="训练时长" width="120">
              <template #default="{ row }">
                {{ formatTime(row.duration) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="150">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button size="small" @click="downloadModel(row)">下载</el-button>
                <el-button size="small" type="danger" @click="deleteTraining(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { VideoPlay, VideoPause } from '@element-plus/icons-vue'

const route = useRoute()
const workflowId = route.params.workflowId

// 训练配置
const trainingConfig = ref({
  modelName: '',
  epochs: 100,
  learningRate: 0.001,
  batchSize: 16,
  description: ''
})

// 训练状态
const isTraining = ref(false)
const currentTraining = ref({})
const trainingLogs = ref([])
const trainingHistory = ref([])

// 计算属性
const trainingProgress = computed(() => {
  if (!currentTraining.value.currentEpoch || !currentTraining.value.totalEpochs) return 0
  return Math.round((currentTraining.value.currentEpoch / currentTraining.value.totalEpochs) * 100)
})

const trainingStatus = computed(() => {
  if (trainingProgress.value === 100) return 'success'
  if (isTraining.value) return 'active'
  return ''
})

// 定时器
let trainingTimer = null

// 方法
const startTraining = async () => {
  if (!trainingConfig.value.modelName.trim()) {
    ElMessage.error('请输入模型名称')
    return
  }

  try {
    isTraining.value = true
    currentTraining.value = {
      ...trainingConfig.value,
      totalEpochs: trainingConfig.value.epochs,
      currentEpoch: 0,
      loss: null,
      accuracy: 0,
      elapsedTime: 0,
      estimatedTime: 0,
      startTime: Date.now()
    }

    // 开始模拟训练过程
    simulateTraining()
    ElMessage.success('训练已开始')
  } catch (error) {
    ElMessage.error('启动训练失败')
    isTraining.value = false
  }
}

const stopTraining = async () => {
  try {
    await ElMessageBox.confirm('确定要停止当前训练吗？', '确认停止', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    isTraining.value = false
    clearInterval(trainingTimer)
    
    // 保存到历史记录
    trainingHistory.value.unshift({
      ...currentTraining.value,
      status: '已停止',
      duration: currentTraining.value.elapsedTime,
      finalLoss: currentTraining.value.loss,
      finalAccuracy: currentTraining.value.accuracy,
      createdAt: new Date(currentTraining.value.startTime)
    })
    
    ElMessage.success('训练已停止')
  } catch (error) {
    // 用户取消
  }
}

const simulateTraining = () => {
  trainingTimer = setInterval(() => {
    if (!isTraining.value) return

    currentTraining.value.currentEpoch += 1
    currentTraining.value.elapsedTime = Date.now() - currentTraining.value.startTime
    
    // 模拟训练指标变化
    currentTraining.value.loss = Math.max(0.001, 2 * Math.exp(-currentTraining.value.currentEpoch / 50) + Math.random() * 0.1)
    currentTraining.value.accuracy = Math.min(0.99, 1 - Math.exp(-currentTraining.value.currentEpoch / 30) + Math.random() * 0.05)
    
    // 估算剩余时间
    const avgTimePerEpoch = currentTraining.value.elapsedTime / currentTraining.value.currentEpoch
    const remainingEpochs = currentTraining.value.totalEpochs - currentTraining.value.currentEpoch
    currentTraining.value.estimatedTime = avgTimePerEpoch * remainingEpochs

    // 添加日志
    if (currentTraining.value.currentEpoch % 10 === 0) {
      addLog(`Epoch ${currentTraining.value.currentEpoch}/${currentTraining.value.totalEpochs} - Loss: ${currentTraining.value.loss.toFixed(4)} - Accuracy: ${(currentTraining.value.accuracy * 100).toFixed(2)}%`)
    }

    // 训练完成
    if (currentTraining.value.currentEpoch >= currentTraining.value.totalEpochs) {
      isTraining.value = false
      clearInterval(trainingTimer)
      
      // 保存到历史记录
      trainingHistory.value.unshift({
        ...currentTraining.value,
        status: '已完成',
        duration: currentTraining.value.elapsedTime,
        finalLoss: currentTraining.value.loss,
        finalAccuracy: currentTraining.value.accuracy,
        createdAt: new Date(currentTraining.value.startTime)
      })
      
      addLog('训练完成！', 'success')
      ElMessage.success('训练已完成')
    }
  }, 1000) // 每秒更新一次
}

const addLog = (message, level = 'info') => {
  trainingLogs.value.push({
    timestamp: Date.now(),
    message,
    level
  })
  
  // 限制日志数量
  if (trainingLogs.value.length > 100) {
    trainingLogs.value = trainingLogs.value.slice(-100)
  }
}

const clearLogs = () => {
  trainingLogs.value = []
}

const downloadModel = (training) => {
  ElMessage.info('模型下载功能开发中...')
}

const deleteTraining = async (training) => {
  try {
    await ElMessageBox.confirm('确定要删除这个训练记录吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const index = trainingHistory.value.findIndex(t => t === training)
    if (index > -1) {
      trainingHistory.value.splice(index, 1)
      ElMessage.success('删除成功')
    }
  } catch (error) {
    // 用户取消
  }
}

const getStatusType = (status) => {
  const typeMap = {
    '已完成': 'success',
    '已停止': 'warning',
    '失败': 'danger'
  }
  return typeMap[status] || 'info'
}

const formatTime = (ms) => {
  if (!ms) return '0s'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

const formatLogTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString()
}

const formatDate = (date) => {
  return new Date(date).toLocaleString()
}

// 生命周期
onMounted(() => {
  // 初始化模拟数据
  trainingHistory.value = [
    {
      modelName: 'face_model_v1',
      epochs: 100,
      finalLoss: 0.0234,
      finalAccuracy: 0.956,
      duration: 1800000, // 30分钟
      status: '已完成',
      createdAt: new Date(Date.now() - 86400000) // 1天前
    }
  ]
})

onUnmounted(() => {
  if (trainingTimer) {
    clearInterval(trainingTimer)
  }
})
</script>

<style scoped>
.training-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  margin: 10px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.config-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-card {
  min-height: 400px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.current-training {
  padding: 20px;
}

.training-info {
  margin-bottom: 30px;
}

.training-info h3 {
  margin: 0 0 8px 0;
  color: #303133;
}

.training-info p {
  margin: 0;
  color: #606266;
}

.progress-section {
  margin-bottom: 30px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
  color: #606266;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-item {
  text-align: center;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.metric-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.logs-section {
  margin-top: 30px;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.logs-container {
  max-height: 300px;
  overflow-y: auto;
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
}

.log-item {
  display: flex;
  margin-bottom: 8px;
  font-family: monospace;
  font-size: 12px;
}

.log-item.success {
  color: #67c23a;
}

.log-item.warning {
  color: #e6a23c;
}

.log-item.error {
  color: #f56c6c;
}

.log-time {
  color: #909399;
  margin-right: 12px;
  flex-shrink: 0;
}

.log-message {
  color: #303133;
}

.training-history {
  margin-top: 30px;
}

.training-history h3 {
  margin-bottom: 16px;
  color: #303133;
}
</style> 