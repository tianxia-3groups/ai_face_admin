<template>
  <div class="materials-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <el-breadcrumb>
        <el-breadcrumb-item :to="{ path: '/workflows' }">流程中心</el-breadcrumb-item>
        <el-breadcrumb-item>素材管理</el-breadcrumb-item>
      </el-breadcrumb>
      <h1 class="page-title">素材管理</h1>
    </div>

    <!-- 工具栏 -->
    <el-card class="toolbar-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button type="primary" @click="handleUpload">
            <el-icon><Upload /></el-icon>
            上传素材
          </el-button>
          <el-button @click="handleRefresh">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
        <div class="toolbar-right">
          <el-input
            v-model="searchText"
            placeholder="搜索素材..."
            style="width: 200px;"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </div>
    </el-card>

    <!-- 素材网格 -->
    <el-card class="materials-card">
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="4" animated />
      </div>
      <div v-else-if="filteredMaterials.length === 0" class="empty-state">
        <el-empty description="暂无素材" />
      </div>
      <div v-else class="materials-grid">
        <div
          v-for="material in filteredMaterials"
          :key="material.id"
          class="material-item"
          @click="handlePreview(material)"
        >
          <div class="material-preview">
            <img
              v-if="material.type === 'image'"
              :src="material.thumbnail"
              :alt="material.name"
              class="material-image"
            />
            <div v-else class="material-placeholder">
              <el-icon size="40"><Document /></el-icon>
            </div>
          </div>
          <div class="material-info">
            <div class="material-name" :title="material.name">{{ material.name }}</div>
            <div class="material-meta">
              <span class="material-size">{{ formatFileSize(material.size) }}</span>
              <span class="material-date">{{ formatDate(material.createdAt) }}</span>
            </div>
          </div>
          <div class="material-actions">
            <el-button size="small" text @click.stop="handleDownload(material)">
              <el-icon><Download /></el-icon>
            </el-button>
            <el-button size="small" text type="danger" @click.stop="handleDelete(material)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 上传对话框 -->
    <el-dialog v-model="uploadDialogVisible" title="上传素材" width="500px">
      <el-upload
        ref="uploadRef"
        class="upload-demo"
        drag
        :action="uploadUrl"
        :headers="uploadHeaders"
        multiple
        :before-upload="beforeUpload"
        :on-success="handleUploadSuccess"
        :on-error="handleUploadError"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 jpg/png/gif 图片格式，文件大小不超过10MB
          </div>
        </template>
      </el-upload>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="uploadDialogVisible = false">取消</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 预览对话框 -->
    <el-dialog v-model="previewDialogVisible" title="素材预览" width="60%">
      <div v-if="currentMaterial" class="preview-content">
        <img
          v-if="currentMaterial.type === 'image'"
          :src="currentMaterial.url"
          :alt="currentMaterial.name"
          class="preview-image"
        />
        <div v-else class="preview-info">
          <el-icon size="60"><Document /></el-icon>
          <p>{{ currentMaterial.name }}</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Upload,
  Refresh,
  Search,
  Document,
  Download,
  Delete,
  UploadFilled
} from '@element-plus/icons-vue'

const route = useRoute()
const workflowId = route.params.workflowId

// 数据状态
const loading = ref(false)
const materials = ref([])
const searchText = ref('')
const uploadDialogVisible = ref(false)
const previewDialogVisible = ref(false)
const currentMaterial = ref(null)

// 计算属性
const filteredMaterials = computed(() => {
  if (!searchText.value) return materials.value
  return materials.value.filter(material =>
    material.name.toLowerCase().includes(searchText.value.toLowerCase())
  )
})

const uploadUrl = computed(() => `/api/workflows/${workflowId}/materials`)
const uploadHeaders = computed(() => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`
}))

// 方法
const loadMaterials = async () => {
  loading.value = true
  try {
    // 模拟数据
    materials.value = [
      {
        id: '1',
        name: 'sample1.jpg',
        type: 'image',
        size: 1024000,
        url: '/api/materials/1/download',
        thumbnail: '/api/materials/1/thumbnail',
        createdAt: new Date()
      },
      {
        id: '2',
        name: 'sample2.jpg',
        type: 'image',
        size: 2048000,
        url: '/api/materials/2/download',
        thumbnail: '/api/materials/2/thumbnail',
        createdAt: new Date()
      }
    ]
  } catch (error) {
    ElMessage.error('加载素材失败')
  } finally {
    loading.value = false
  }
}

const handleUpload = () => {
  uploadDialogVisible.value = true
}

const handleRefresh = () => {
  loadMaterials()
}

const handlePreview = (material) => {
  currentMaterial.value = material
  previewDialogVisible.value = true
}

const handleDownload = (material) => {
  window.open(material.url, '_blank')
}

const handleDelete = async (material) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除素材 "${material.name}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 执行删除
    materials.value = materials.value.filter(m => m.id !== material.id)
    ElMessage.success('删除成功')
  } catch (error) {
    // 用户取消
  }
}

const beforeUpload = (file) => {
  const isValidType = ['image/jpeg', 'image/png', 'image/gif'].includes(file.type)
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isValidType) {
    ElMessage.error('只能上传 JPG/PNG/GIF 格式的图片!')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('图片大小不能超过 10MB!')
    return false
  }
  return true
}

const handleUploadSuccess = (response, file) => {
  ElMessage.success('上传成功')
  uploadDialogVisible.value = false
  loadMaterials()
}

const handleUploadError = (error) => {
  ElMessage.error('上传失败')
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString()
}

// 生命周期
onMounted(() => {
  loadMaterials()
})
</script>

<style scoped>
.materials-page {
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

.toolbar-card {
  margin-bottom: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-left {
  display: flex;
  gap: 10px;
}

.materials-card {
  min-height: 500px;
}

.loading-container {
  padding: 20px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.materials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  padding: 16px 0;
}

.material-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.material-item:hover {
  border-color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.material-preview {
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 8px;
}

.material-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.material-placeholder {
  color: #c0c4cc;
}

.material-info {
  margin-bottom: 8px;
}

.material-name {
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.material-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
}

.material-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}

.material-item:hover .material-actions {
  opacity: 1;
}

.preview-content {
  text-align: center;
}

.preview-image {
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
}

.preview-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #909399;
}
</style> 