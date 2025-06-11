<template>
  <div class="workflow-center">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <div class="title-group">
            <h1>
              <el-icon class="title-icon"><VideoPlay /></el-icon>
              流程中心
            </h1>
            <p class="subtitle">管理所有AI换脸训练流程</p>
          </div>
        </div>
        <div class="header-right">
          <el-button type="primary" size="large" @click="createWorkflow" class="create-btn">
            <el-icon><Plus /></el-icon>
            创建新流程
          </el-button>
        </div>
      </div>
    </div>

    <!-- 快速统计 -->
    <div class="stats-section">
      <el-row :gutter="24">
        <el-col :xs="12" :sm="6" :lg="3">
          <div class="stat-card total-card">
            <div class="stat-icon">
              <el-icon><Folder /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ workflowStats.total }}</div>
              <div class="stat-label">总流程</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :lg="3">
          <div class="stat-card running-card">
            <div class="stat-icon">
              <el-icon><VideoPlay /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ workflowStats.running }}</div>
              <div class="stat-label">运行中</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :lg="3">
          <div class="stat-card completed-card">
            <div class="stat-icon">
              <el-icon><Check /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ workflowStats.completed }}</div>
              <div class="stat-label">已完成</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6" :lg="3">
          <div class="stat-card failed-card">
            <div class="stat-icon">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ workflowStats.failed }}</div>
              <div class="stat-label">失败</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar-section">
      <el-card class="toolbar-card" shadow="never">
        <div class="toolbar">
          <div class="toolbar-left">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索流程名称..."
              @input="handleSearch"
              clearable
              class="search-input"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>

            <el-select
              v-model="statusFilter"
              placeholder="筛选状态"
              @change="handleStatusFilter"
              clearable
              class="filter-select"
            >
              <el-option label="全部状态" value="" />
              <el-option label="已创建" value="CREATED" />
              <el-option label="上传中" value="UPLOADING" />
              <el-option label="处理中" value="PROCESSING" />
              <el-option label="训练中" value="TRAINING" />
              <el-option label="已完成" value="COMPLETED" />
              <el-option label="失败" value="FAILED" />
            </el-select>

            <el-button @click="refreshList" class="refresh-btn">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>

          <div class="toolbar-right">
            <el-dropdown @command="handleBatchAction" :disabled="selectedWorkflows.length === 0">
              <el-button class="batch-btn" :disabled="selectedWorkflows.length === 0">
                批量操作 ({{ selectedWorkflows.length }})
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="delete" icon="Delete">批量删除</el-dropdown-item>
                  <el-dropdown-item command="retry" icon="RefreshRight">批量重试</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 流程列表 -->
    <div class="workflow-list-section">
      <el-card class="list-card" shadow="never">
        <template #header>
          <div class="list-header">
            <div class="header-left">
              <div class="header-icon">
                <el-icon><List /></el-icon>
              </div>
              <div class="header-info">
                <span class="header-title">流程列表</span>
                <span class="header-subtitle">{{ filteredWorkflows.length }} 个流程</span>
              </div>
            </div>
          </div>
        </template>

        <el-table
          v-loading="loading"
          :data="filteredWorkflows"
          @selection-change="handleSelectionChange"
          empty-text="暂无训练流程"
          class="workflow-table"
        >
          <el-table-column type="selection" width="55" />
          
          <el-table-column label="流程名称" min-width="200">
            <template #default="{ row }">
              <div class="workflow-name-cell">
                <div class="workflow-avatar">
                  <el-icon><VideoPlay /></el-icon>
                </div>
                <div class="workflow-info">
                  <span class="name" @click="viewWorkflow(row.id)">{{ row.name }}</span>
                  <div class="tags">
                    <el-tag v-if="row.priority === 'high'" type="danger" size="small">高优先级</el-tag>
                  </div>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="default" class="status-tag">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="进度" width="180">
            <template #default="{ row }">
              <div class="progress-cell">
                <div class="progress-info">
                  <span class="progress-text">{{ row.progress || 0 }}%</span>
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

          <el-table-column label="素材统计" width="140">
            <template #default="{ row }">
              <div class="material-stats">
                <div class="stat-item">
                  <el-icon><User /></el-icon>
                  <span>脸源: {{ row.faceSourceCount || 0 }}</span>
                </div>
                <div class="stat-item">
                  <el-icon><Avatar /></el-icon>
                  <span>模特: {{ row.modelCount || 0 }}</span>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="创建时间" width="180">
            <template #default="{ row }">
              <div class="time-cell">
                <el-icon><Clock /></el-icon>
                <span>{{ formatTime(row.createdAt) }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="耗时" width="100">
            <template #default="{ row }">
              <span class="duration-text">{{ getDuration(row) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button 
                  size="small" 
                  type="primary" 
                  @click="viewWorkflow(row.id)"
                  class="action-btn"
                >
                  查看详情
                </el-button>
                
                <el-button 
                  v-if="row.status === 'FAILED'"
                  size="small" 
                  type="success" 
                  @click="retryWorkflow(row.id)"
                  class="action-btn"
                >
                  重试
                </el-button>
                
                <el-button 
                  v-if="['CREATED', 'FAILED'].includes(row.status)"
                  size="small" 
                  type="danger" 
                  @click="deleteWorkflow(row.id)"
                  class="action-btn"
                >
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-section">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="totalCount"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
            background
          />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, Search, Refresh, ArrowDown, Delete, RefreshRight, VideoPlay,
  Folder, Check, Warning, List, Clock, User, Avatar
} from '@element-plus/icons-vue'
import { useWorkflowStore } from '@/store/workflow'

const router = useRouter()
const workflowStore = useWorkflowStore()

// 响应式数据
const loading = ref(false)
const searchKeyword = ref('')
const statusFilter = ref('')
const selectedWorkflows = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)

// 工作流列表数据 - 使用store中的数据
const workflows = computed(() => workflowStore.workflows || [])

// 计算统计数据
const workflowStats = computed(() => {
  const workflows = workflowStore.workflows || []
  return {
    total: workflows.length,
    running: workflows.filter(w => ['TRAINING', 'PROCESSING', 'UPLOADING'].includes(w.status)).length,
    completed: workflows.filter(w => w.status === 'COMPLETED').length,
    failed: workflows.filter(w => w.status === 'FAILED').length
  }
})

// 计算属性
const filteredWorkflows = computed(() => {
  let result = workflows.value

  // 按状态筛选
  if (statusFilter.value) {
    result = result.filter(w => w.status === statusFilter.value)
  }

  // 按名称搜索
  if (searchKeyword.value.trim()) {
    const query = searchKeyword.value.toLowerCase()
    result = result.filter(w => 
      w.name.toLowerCase().includes(query) ||
      (w.description && w.description.toLowerCase().includes(query))
    )
  }

  return result
})

// 方法定义
const createWorkflow = () => {
  router.push('/workflows/create')
}

const viewWorkflow = (id) => {
  router.push(`/workflows/${id}`)
}

const handleSearch = () => {
  currentPage.value = 1
}

const handleStatusFilter = () => {
  currentPage.value = 1
}

const handleSelectionChange = (selection) => {
  selectedWorkflows.value = selection
}

const handleBatchAction = async (command) => {
  if (selectedWorkflows.value.length === 0) return

  if (command === 'delete') {
    try {
      await ElMessageBox.confirm(
        `确定要删除选中的 ${selectedWorkflows.value.length} 个流程吗？`,
        '批量删除确认',
        { type: 'warning' }
      )
      
      // TODO: 调用批量删除API
      ElMessage.success('批量删除成功')
      await refreshList()
    } catch (error) {
      // 用户取消
    }
  } else if (command === 'retry') {
    // TODO: 调用批量重试API
    ElMessage.success('批量重试已启动')
    await refreshList()
  }
}

const retryWorkflow = async (id) => {
  try {
    await ElMessageBox.confirm('确定要重新开始这个训练流程吗？', '重试确认', {
      type: 'info'
    })
    
    // TODO: 调用重试API
    ElMessage.success('重试已启动')
    await refreshList()
  } catch (error) {
    // 用户取消
  }
}

const deleteWorkflow = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个训练流程吗？删除后无法恢复。', '删除确认', {
      type: 'warning'
    })
    
    const success = await workflowStore.deleteWorkflow(id)
    if (success) {
      await refreshList()
    }
  } catch (error) {
    // 用户取消或删除失败
    if (error.message && !error.message.includes('cancel')) {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

const refreshList = async () => {
  loading.value = true
  try {
    await workflowStore.fetchWorkflows()
    ElMessage.success('数据刷新成功')
  } catch (error) {
    console.error('刷新流程列表失败:', error)
    ElMessage.error('刷新失败: ' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val) => {
  currentPage.value = val
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
onMounted(() => {
  refreshList()
})
</script>

<style scoped>
.workflow-center {
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

.create-btn {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border: none;
  color: white;
  font-weight: 600;
  border-radius: 10px;
  padding: 12px 24px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(251, 191, 36, 0.6);
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

.running-card {
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

.running-card .stat-icon {
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

.toolbar-section {
  margin-bottom: 20px;
}

.toolbar-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.toolbar-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-input {
  width: 320px;
}

.filter-select {
  width: 160px;
}

.refresh-btn {
  padding: 10px 20px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.refresh-btn:hover {
  transform: translateY(-1px);
}

.batch-btn {
  padding: 10px 20px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.batch-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.workflow-list-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.workflow-list-section:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.list-card :deep(.el-card__header) {
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
  border-radius: 12px 12px 0 0;
}

.list-card :deep(.el-card__body) {
  padding: 0;
}

.list-header {
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
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  color: #6366f1;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
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

.workflow-table :deep(.el-table__header) {
  background: #f8fafc;
}

.workflow-table :deep(.el-table th) {
  background: #f8fafc;
  color: #374151;
  font-weight: 600;
  border-bottom: 1px solid #e5e7eb;
}

.workflow-table :deep(.el-table td) {
  border-bottom: 1px solid #f1f5f9;
  padding: 16px 0;
}

.workflow-table :deep(.el-table__row:hover) {
  background: #f8fafc;
}

.workflow-name-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.workflow-avatar {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  color: #6366f1;
  font-size: 18px;
}

.workflow-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.workflow-info .name {
  font-size: 14px;
  font-weight: 600;
  color: #3b82f6;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.3s ease;
}

.workflow-info .name:hover {
  color: #1d4ed8;
}

.workflow-info .tags {
  display: flex;
  gap: 4px;
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

.material-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.material-stats .stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.time-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.duration-text {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.action-btn:hover {
  transform: translateY(-1px);
}

.pagination-section {
  display: flex;
  justify-content: center;
  padding: 20px;
  border-top: 1px solid #f1f5f9;
  background: #fafbfc;
  border-radius: 0 0 12px 12px;
}

@media (max-width: 768px) {
  .workflow-center {
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

  .toolbar {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .toolbar-left {
    flex-direction: column;
    gap: 12px;
  }

  .search-input {
    width: 100%;
  }

  .filter-select {
    width: 100%;
  }

  .workflow-name-cell {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .workflow-avatar {
    width: 32px;
    height: 32px;
    font-size: 16px;
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
  .workflow-center {
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

  .toolbar {
    padding: 16px;
  }
}
</style> 