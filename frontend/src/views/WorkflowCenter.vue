<template>
  <div class="workflow-center">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-group">
          <h2>流程中心</h2>
          <p class="subtitle">管理所有AI换脸训练流程</p>
        </div>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="createWorkflow">
          <el-icon><Plus /></el-icon>
          创建新流程
        </el-button>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchQuery"
          placeholder="搜索流程名称..."
          @input="handleSearch"
          clearable
          style="width: 300px"
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
          style="width: 150px"
        >
          <el-option label="全部状态" value="" />
          <el-option label="已创建" value="CREATED" />
          <el-option label="上传中" value="UPLOADING" />
          <el-option label="处理中" value="PROCESSING" />
          <el-option label="训练中" value="TRAINING" />
          <el-option label="已完成" value="COMPLETED" />
          <el-option label="失败" value="FAILED" />
        </el-select>

        <el-button @click="refreshList">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>

      <div class="toolbar-right">
        <el-dropdown @command="handleBatchAction" :disabled="selectedWorkflows.length === 0">
          <el-button>
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

    <!-- 流程列表 -->
    <div class="workflow-list">
      <el-table
        v-loading="loading"
        :data="filteredWorkflows"
        @selection-change="handleSelectionChange"
        empty-text="暂无训练流程"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column label="流程名称" min-width="200">
          <template #default="{ row }">
            <div class="workflow-name">
              <span class="name" @click="viewWorkflow(row.id)">{{ row.name }}</span>
              <el-tag v-if="row.priority === 'high'" type="danger" size="small">高优先级</el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="进度" width="150">
          <template #default="{ row }">
            <div class="progress-cell">
              <el-progress
                :percentage="row.progress || 0"
                :status="getProgressStatus(row.status)"
                :stroke-width="6"
                text-inside
              />
            </div>
          </template>
        </el-table-column>

        <el-table-column label="素材统计" width="120">
          <template #default="{ row }">
            <div class="material-stats">
              <span>脸源: {{ row.faceSourceCount || 0 }}</span><br>
              <span>模特: {{ row.modelCount || 0 }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="耗时" width="100">
          <template #default="{ row }">
            {{ getDuration(row) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-space>
              <el-button 
                size="small" 
                type="primary" 
                text
                @click="viewWorkflow(row.id)"
              >
                查看详情
              </el-button>
              
              <el-button 
                v-if="row.status === 'FAILED'"
                size="small" 
                type="success" 
                text
                @click="retryWorkflow(row.id)"
              >
                重试
              </el-button>
              
              <el-button 
                v-if="['CREATED', 'FAILED'].includes(row.status)"
                size="small" 
                type="danger" 
                text
                @click="deleteWorkflow(row.id)"
              >
                删除
              </el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalCount"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, Search, Refresh, ArrowDown, Delete, RefreshRight 
} from '@element-plus/icons-vue'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const selectedWorkflows = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)

// 工作流列表数据
const workflows = ref([
  {
    id: 'wf_001',
    name: '明星换脸直播训练',
    status: 'TRAINING',
    progress: 65,
    priority: 'high',
    faceSourceCount: 15,
    modelCount: 8,
    createdAt: '2024-12-11T10:30:00Z',
    startedAt: '2024-12-11T10:35:00Z',
    description: '为直播平台训练明星换脸模型'
  },
  {
    id: 'wf_002',
    name: '网红脸模型训练',
    status: 'COMPLETED',
    progress: 100,
    priority: 'medium',
    faceSourceCount: 25,
    modelCount: 12,
    createdAt: '2024-12-10T14:20:00Z',
    startedAt: '2024-12-10T14:25:00Z',
    completedAt: '2024-12-10T18:45:00Z',
    description: '训练网红风格的换脸模型'
  },
  {
    id: 'wf_003',
    name: '游戏主播换脸',
    status: 'FAILED',
    progress: 30,
    priority: 'low',
    faceSourceCount: 8,
    modelCount: 5,
    createdAt: '2024-12-09T16:15:00Z',
    startedAt: '2024-12-09T16:20:00Z',
    description: '游戏直播换脸效果训练'
  }
])

// 计算属性
const filteredWorkflows = computed(() => {
  let result = workflows.value

  // 按状态筛选
  if (statusFilter.value) {
    result = result.filter(w => w.status === statusFilter.value)
  }

  // 按名称搜索
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(w => 
      w.name.toLowerCase().includes(query) ||
      w.description.toLowerCase().includes(query)
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
    
    // TODO: 调用删除API
    ElMessage.success('删除成功')
    await refreshList()
  } catch (error) {
    // 用户取消
  }
}

const refreshList = async () => {
  loading.value = true
  try {
    // TODO: 调用API获取工作流列表
    await new Promise(resolve => setTimeout(resolve, 1000))
    totalCount.value = workflows.value.length
  } catch (error) {
    ElMessage.error('刷新失败: ' + error.message)
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

.title-group h2 {
  margin: 0 0 4px 0;
  color: #303133;
}

.subtitle {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workflow-list {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  overflow: hidden;
}

.workflow-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.workflow-name .name {
  cursor: pointer;
  color: #409eff;
  text-decoration: none;
}

.workflow-name .name:hover {
  text-decoration: underline;
}

.progress-cell {
  padding: 4px 0;
}

.material-stats {
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
}

.pagination {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: #fff;
  border-top: 1px solid #e6e8eb;
}

@media (max-width: 768px) {
  .workflow-center {
    padding: 15px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .toolbar-left {
    flex-wrap: wrap;
  }
  
  .workflow-name {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style> 