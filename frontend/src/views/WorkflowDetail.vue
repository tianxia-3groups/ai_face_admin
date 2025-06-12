<template>
  <div class="workflow-detail" v-loading="loading">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button circle @click="goBack" class="back-btn">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <div class="title-group">
          <h2>{{ workflow.name }}</h2>
          <p class="subtitle">{{ workflow.description || '流程详情和管理' }}</p>
        </div>
      </div>
      <div class="header-right">
        <el-dropdown @command="handleAction">
          <el-button type="primary">
            操作菜单
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item 
                v-if="workflow.status === 'FAILED'" 
                command="retry" 
                icon="RefreshRight"
              >
                重新训练
              </el-dropdown-item>
              <el-dropdown-item 
                v-if="['TRAINING'].includes(workflow.status)" 
                command="pause" 
                icon="VideoPause"
              >
                暂停训练
              </el-dropdown-item>
              <el-dropdown-item 
                v-if="workflow.status === 'COMPLETED'" 
                command="download" 
                icon="Download"
              >
                下载结果
              </el-dropdown-item>
              <el-dropdown-item command="clone" icon="CopyDocument">克隆流程</el-dropdown-item>
              <el-dropdown-item command="export" icon="Upload" divided>导出配置</el-dropdown-item>
              <el-dropdown-item command="delete" icon="Delete">删除流程</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 流程概览 -->
    <el-row :gutter="20" class="overview-section">
      <el-col :xs="24" :md="16">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon><InfoFilled /></el-icon>
              <span>流程概览</span>
            </div>
          </template>
          
          <div class="overview-content">
            <el-row :gutter="20">
              <el-col :span="12">
                <div class="info-item">
                  <span class="label">当前状态：</span>
                  <el-tag :type="getStatusType(workflow.status)" size="large">
                    {{ getStatusText(workflow.status) }}
                  </el-tag>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="info-item">
                  <span class="label">优先级：</span>
                  <el-tag 
                    :type="workflow.priority === 'high' ? 'danger' : 'info'" 
                    size="small"
                  >
                    {{ workflow.priority === 'high' ? '高优先级' : '普通' }}
                  </el-tag>
                </div>
              </el-col>
            </el-row>

            <div class="progress-section">
              <div class="progress-info">
                <span>整体进度</span>
                <span>{{ (typeof workflow.progress === 'object' ? workflow.progress.current : workflow.progress) || 0 }}%</span>
              </div>
              <el-progress 
                :percentage="(typeof workflow.progress === 'object' ? workflow.progress.current : workflow.progress) || 0"
                :status="getProgressStatus(workflow.status)"
                :stroke-width="8"
              />
            </div>

            <el-row :gutter="20" class="stats-row">
              <el-col :span="8">
                <div class="stat-item">
                  <div class="stat-number">{{ workflow.faceSourceCount || 0 }}</div>
                  <div class="stat-label">脸源文件</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="stat-item">
                  <div class="stat-number">{{ workflow.modelCount || 0 }}</div>
                  <div class="stat-label">模特文件</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="stat-item">
                  <div class="stat-number">{{ getDuration(workflow) }}</div>
                  <div class="stat-label">耗时</div>
                </div>
              </el-col>
            </el-row>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="8">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon><Clock /></el-icon>
              <span>时间轴</span>
            </div>
          </template>
          
          <div class="timeline-content">
            <el-timeline>
              <el-timeline-item
                v-for="event in timeline"
                :key="event.id"
                :timestamp="event.time"
                :type="event.type"
                :icon="event.icon"
              >
                {{ event.description }}
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 选项卡内容 -->
    <el-card shadow="never" class="main-content">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 素材管理 -->
        <el-tab-pane label="素材管理" name="materials">
          <div class="materials-section">
            <div class="section-header">
              <h3>上传的素材文件</h3>
              <el-button v-if="workflow.status === 'CREATED'" type="primary">
                <el-icon><Plus /></el-icon>
                添加素材
              </el-button>
            </div>

            <!-- 脸源素材 -->
            <div class="material-group">
              <h4>
                <el-icon color="#409eff"><User /></el-icon>
                脸源素材 ({{ faceSourceFiles.length }})
              </h4>
              <div class="file-grid">
                <div 
                  v-for="file in faceSourceFiles" 
                  :key="file.id"
                  class="file-item"
                >
                  <div class="file-preview">
                    <img v-if="file.thumbnail" :src="file.thumbnail" alt="预览" />
                    <el-icon v-else><Picture /></el-icon>
                  </div>
                  <div class="file-info">
                    <div class="file-name" :title="file.name">{{ file.name }}</div>
                    <div class="file-size">{{ formatFileSize(file.size) }}</div>
                  </div>
                  <div class="file-actions">
                    <el-button size="small" text @click="previewFile(file)">
                      <el-icon><View /></el-icon>
                    </el-button>
                    <el-button 
                      v-if="workflow.status === 'CREATED'"
                      size="small" 
                      text 
                      type="danger"
                      @click="deleteFile(file)"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 模特素材 -->
            <div class="material-group">
              <h4>
                <el-icon color="#67c23a"><VideoCamera /></el-icon>
                模特素材 ({{ modelFiles.length }})
              </h4>
              <div class="file-grid">
                <div 
                  v-for="file in modelFiles" 
                  :key="file.id"
                  class="file-item"
                >
                  <div class="file-preview">
                    <img v-if="file.thumbnail" :src="file.thumbnail" alt="预览" />
                    <el-icon v-else><VideoCamera /></el-icon>
                  </div>
                  <div class="file-info">
                    <div class="file-name" :title="file.name">{{ file.name }}</div>
                    <div class="file-size">{{ formatFileSize(file.size) }}</div>
                  </div>
                  <div class="file-actions">
                    <el-button size="small" text @click="previewFile(file)">
                      <el-icon><View /></el-icon>
                    </el-button>
                    <el-button 
                      v-if="workflow.status === 'CREATED'"
                      size="small" 
                      text 
                      type="danger"
                      @click="deleteFile(file)"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 训练配置 -->
        <el-tab-pane label="训练配置" name="config">
          <div class="config-section">
            <el-form :model="workflow.config" label-width="120px" size="large">
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="训练模板">
                    <el-input v-model="workflow.config.template" readonly />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="目标图片数量">
                    <el-input v-model="workflow.config.targetImageCount" readonly />
                  </el-form-item>
                </el-col>
              </el-row>
              <!-- 更多配置项... -->
            </el-form>
          </div>
        </el-tab-pane>

        <!-- 训练日志 -->
        <el-tab-pane label="训练日志" name="logs">
          <div class="logs-section">
            <div class="log-toolbar">
              <el-space>
                <el-button @click="refreshLogs">
                  <el-icon><Refresh /></el-icon>
                  刷新
                </el-button>
                <el-button @click="downloadLogs">
                  <el-icon><Download /></el-icon>
                  下载日志
                </el-button>
                <el-switch 
                  v-model="autoScrollLogs" 
                  active-text="自动滚动"
                />
              </el-space>
            </div>
            
            <div class="log-viewer" ref="logViewerRef">
              <div 
                v-for="log in logs" 
                :key="log.id"
                :class="['log-line', `log-${log.level}`]"
              >
                <span class="log-timestamp">{{ formatTime(log.timestamp) }}</span>
                <span class="log-level">{{ log.level.toUpperCase() }}</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft, ArrowDown, InfoFilled, Clock, Plus, User, VideoCamera,
  Picture, View, Delete, Refresh, Download, RefreshRight, VideoPause, 
  CopyDocument, Upload
} from '@element-plus/icons-vue'
import { workflowApi } from '@/api/workflow'

const router = useRouter()
const route = useRoute()

// 响应式数据
const activeTab = ref('materials')
const autoScrollLogs = ref(true)
const logViewerRef = ref(null)
const loading = ref(false)

// 工作流数据
const workflow = ref({
  id: route.params.id,
  name: '',
  description: '',
  status: '',
  progress: { current: 0, total: 100 },
  priority: 'normal',
  faceSourceCount: 0,
  modelCount: 0,
  createdAt: '',
  startedAt: '',
  completedAt: '',
  config: {
    template: '',
    targetImageCount: 0
  }
})

// 时间轴数据
const timeline = ref([])

// 素材文件数据
const faceSourceFiles = ref([])
const modelFiles = ref([])

// 日志数据
const logs = ref([])

// 方法定义
const goBack = () => {
  router.push('/workflows')
}

// 加载工作流详情数据
const loadWorkflowDetail = async () => {
  if (!route.params.id) {
    ElMessage.error('工作流ID不存在')
    goBack()
    return
  }

  loading.value = true
  try {
    // 获取工作流详情
    const response = await workflowApi.get(route.params.id)
    if (response.success) {
      const data = response.data
      workflow.value = {
        ...workflow.value,
        ...data,
        // 确保progress格式正确
        progress: data.progress || { current: 0, total: 100 }
      }
      
      // 处理素材文件
      if (data.materials) {
        faceSourceFiles.value = data.materials.faceSource || []
        modelFiles.value = data.materials.model || []
      }
      
      // 处理时间轴数据
      if (data.timeline) {
        timeline.value = data.timeline
      } else {
        // 如果没有时间轴数据，根据状态生成基本时间轴
        generateTimeline(data)
      }
      
      // 处理日志数据
      if (data.logs) {
        logs.value = data.logs
      }
    } else {
      ElMessage.error(response.message || '获取工作流详情失败')
    }
  } catch (error) {
    console.error('加载工作流详情失败:', error)
    ElMessage.error('加载工作流详情失败: ' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

// 生成基本时间轴
const generateTimeline = (workflowData) => {
  const timelineItems = []
  
  if (workflowData.createdAt) {
    timelineItems.push({
      id: 1,
      time: formatTime(workflowData.createdAt),
      type: 'primary',
      icon: 'Plus',
      description: '创建训练流程'
    })
  }
  
  if (workflowData.startedAt) {
    timelineItems.push({
      id: 2,
      time: formatTime(workflowData.startedAt),
      type: 'warning',
      icon: 'VideoPlay',
      description: '开始训练过程'
    })
  }
  
  if (workflowData.completedAt) {
    timelineItems.push({
      id: 3,
      time: formatTime(workflowData.completedAt),
      type: workflowData.status === 'COMPLETED' ? 'success' : 'danger',
      icon: workflowData.status === 'COMPLETED' ? 'Check' : 'Close',
      description: workflowData.status === 'COMPLETED' ? '训练完成' : '训练失败'
    })
  }
  
  timeline.value = timelineItems
}

const handleAction = async (command) => {
  switch (command) {
    case 'retry':
      await retryTraining()
      break
    case 'pause':
      await pauseTraining()
      break
    case 'download':
      await downloadResults()
      break
    case 'clone':
      await cloneWorkflow()
      break
    case 'export':
      await exportConfig()
      break
    case 'delete':
      await deleteWorkflow()
      break
  }
}

const retryTraining = async () => {
  try {
    await ElMessageBox.confirm('确定要重新开始训练吗？', '重试确认', {
      type: 'info'
    })
    
    // 调用重试API
    const response = await workflowApi.updateStatus(workflow.value.id, 'CREATED', '重新开始训练')
    if (response.success) {
      ElMessage.success('重新训练已启动')
      await loadWorkflowDetail() // 重新加载数据
    } else {
      ElMessage.error(response.message || '重试失败')
    }
  } catch (error) {
    if (error.message && !error.message.includes('cancel')) {
      ElMessage.error('重试失败: ' + error.message)
    }
  }
}

const pauseTraining = async () => {
  try {
    await ElMessageBox.confirm('确定要暂停当前训练吗？', '暂停确认', {
      type: 'warning'
    })
    
    ElMessage.success('训练已暂停')
    // TODO: 调用暂停API
  } catch (error) {
    // 用户取消
  }
}

const downloadResults = () => {
  // TODO: 实现下载结果
  ElMessage.success('开始下载训练结果')
}

const cloneWorkflow = () => {
  // TODO: 实现克隆功能
  ElMessage.info('克隆功能开发中...')
}

const exportConfig = () => {
  // TODO: 实现导出配置
  ElMessage.success('配置已导出')
}

const deleteWorkflow = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个训练流程吗？删除后无法恢复。',
      '删除确认',
      { type: 'warning' }
    )
    
    // 调用删除API
    const response = await workflowApi.delete(workflow.value.id)
    if (response.success) {
      ElMessage.success('删除成功')
      router.push('/workflows')
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error.message && !error.message.includes('cancel')) {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

const handleTabChange = (tab) => {
  if (tab === 'logs' && autoScrollLogs.value) {
    nextTick(() => {
      scrollLogsToBottom()
    })
  }
}

const previewFile = (file) => {
  // TODO: 实现文件预览
  ElMessage.info(`预览文件: ${file.name}`)
}

const deleteFile = async (file) => {
  try {
    await ElMessageBox.confirm(`确定要删除文件 "${file.name}" 吗？`, '删除确认', {
      type: 'warning'
    })
    
    ElMessage.success('文件已删除')
    // TODO: 调用删除文件API
  } catch (error) {
    // 用户取消
  }
}

const refreshLogs = async () => {
  try {
    // 重新加载工作流详情，包括最新的日志
    await loadWorkflowDetail()
    ElMessage.success('日志已刷新')
    
    // 如果开启了自动滚动，滚动到底部
    if (autoScrollLogs.value) {
      nextTick(() => {
        scrollLogsToBottom()
      })
    }
  } catch (error) {
    ElMessage.error('刷新日志失败: ' + (error.message || '未知错误'))
  }
}

const downloadLogs = () => {
  ElMessage.success('开始下载日志文件')
  // TODO: 实现日志下载
}

const scrollLogsToBottom = () => {
  if (logViewerRef.value) {
    logViewerRef.value.scrollTop = logViewerRef.value.scrollHeight
  }
}

// 工具函数
const getStatusType = (status) => {
  const typeMap = {
    'CREATED': 'info',
    'UPLOADING': 'warning', 
    'PROCESSING': 'warning',
    'TRAINING': 'primary',
    'COMPLETED': 'success',
    'FAILED': 'danger'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status) => {
  const textMap = {
    'CREATED': '已创建',
    'UPLOADING': '上传中',
    'PROCESSING': '处理中', 
    'TRAINING': '训练中',
    'COMPLETED': '已完成',
    'FAILED': '失败'
  }
  return textMap[status] || status
}

const getProgressStatus = (status) => {
  if (status === 'COMPLETED') return 'success'
  if (status === 'FAILED') return 'exception'
  return null
}

const formatTime = (timeStr) => {
  return new Date(timeStr).toLocaleString('zh-CN')
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const getDuration = (workflow) => {
  if (!workflow.startedAt) return '-'
  
  const start = new Date(workflow.startedAt)
  const end = workflow.completedAt ? new Date(workflow.completedAt) : new Date()
  const diff = Math.floor((end - start) / 1000 / 60) // 分钟
  
  if (diff < 60) return `${diff}分钟`
  if (diff < 1440) return `${Math.floor(diff / 60)}小时${diff % 60}分钟`
  return `${Math.floor(diff / 1440)}天`
}

// 生命周期
onMounted(async () => {
  // 加载工作流详情数据
  await loadWorkflowDetail()
  
  // 如果是日志标签页且开启了自动滚动，滚动到底部
  if (activeTab.value === 'logs' && autoScrollLogs.value) {
    nextTick(() => {
      scrollLogsToBottom()
    })
  }
})
</script>

<style scoped>
.workflow-detail {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e6e8eb;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  border: none;
}

.title-group h2 {
  margin: 0 0 4px 0;
  color: #303133;
}

.subtitle {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.overview-section {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.overview-content {
  padding: 8px 0;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.info-item .label {
  color: #606266;
  font-weight: 500;
}

.progress-section {
  margin: 24px 0;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #606266;
  font-size: 14px;
}

.stats-row {
  margin-top: 24px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-number {
  font-size: 24px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 4px;
}

.stat-label {
  color: #909399;
  font-size: 14px;
}

.timeline-content {
  max-height: 300px;
  overflow-y: auto;
}

.main-content {
  margin-top: 20px;
}

.materials-section {
  padding: 16px 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h3 {
  margin: 0;
  color: #303133;
}

.material-group {
  margin-bottom: 32px;
}

.material-group h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
}

.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.file-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s;
}

.file-item:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.file-preview {
  width: 100%;
  height: 120px;
  background: #f5f7fa;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  overflow: hidden;
}

.file-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-preview .el-icon {
  font-size: 32px;
  color: #909399;
}

.file-info {
  margin-bottom: 12px;
}

.file-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: #909399;
  font-size: 12px;
}

.file-actions {
  display: flex;
  justify-content: space-between;
}

.config-section {
  padding: 16px 0;
}

.logs-section {
  padding: 16px 0;
}

.log-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.log-viewer {
  height: 400px;
  background: #1e1e1e;
  border-radius: 6px;
  padding: 16px;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.log-line {
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
  line-height: 1.5;
}

.log-timestamp {
  color: #6b7280;
  min-width: 140px;
}

.log-level {
  min-width: 50px;
  font-weight: 600;
}

.log-level.info {
  color: #10b981;
}

.log-level.warning {
  color: #f59e0b;
}

.log-level.error {
  color: #ef4444;
}

.log-message {
  color: #e5e7eb;
  flex: 1;
}

@media (max-width: 768px) {
  .workflow-detail {
    padding: 15px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-left {
    gap: 12px;
  }
  
  .stats-row {
    margin-top: 16px;
  }
  
  .stat-item {
    padding: 12px;
  }
  
  .stat-number {
    font-size: 20px;
  }
  
  .file-grid {
    grid-template-columns: 1fr;
  }
  
  .log-viewer {
    height: 300px;
    padding: 12px;
    font-size: 12px;
  }
  
  .log-toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
}
</style> 