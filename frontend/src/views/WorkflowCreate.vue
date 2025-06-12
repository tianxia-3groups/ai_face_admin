<template>
  <div class="workflow-create">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button 
          icon="ArrowLeft" 
          @click="goBack"
          class="back-btn"
        >
          返回
        </el-button>
        <div class="title-group">
          <h2>创建新训练流程</h2>
          <p class="subtitle">配置您的AI换脸模型训练任务</p>
        </div>
      </div>
    </div>

    <!-- 创建表单 -->
    <div class="create-form">
      <el-form 
        ref="formRef"
        :model="formData" 
        :rules="rules"
        label-width="120px"
        size="large"
      >
        <!-- 基本信息 -->
        <el-card class="form-section" shadow="never">
          <template #header>
            <div class="section-header">
              <el-icon><Document /></el-icon>
              <span>基本信息</span>
            </div>
          </template>
          
          <el-row :gutter="20">
            <el-col :xs="24" :md="12">
              <el-form-item label="流程名称" prop="name">
                <el-input 
                  v-model="formData.name"
                  placeholder="请输入训练流程的名称"
                  maxlength="50"
                  show-word-limit
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item label="训练类型" prop="trainType">
                <el-select v-model="formData.trainType" placeholder="选择训练类型" @change="handleTrainTypeChange">
                  <el-option 
                    v-for="type in trainTypes" 
                    :key="type.id" 
                    :label="type.name" 
                    :value="type.id"
                  >
                    <div class="train-type-option">
                      <span>{{ type.name }}</span>
                      <el-tag size="small" type="info">{{ type.id }}</el-tag>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="流程描述" prop="description">
            <el-input 
              v-model="formData.description"
              type="textarea"
              placeholder="描述这个训练流程的目标和用途..."
              :rows="3"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>

          <el-row :gutter="20">
            <el-col :xs="24" :md="12">
              <el-form-item label="优先级" prop="priority">
                <el-select v-model="formData.priority" placeholder="选择优先级">
                  <el-option label="高优先级" value="high" />
                  <el-option label="普通" value="medium" />
                  <el-option label="低优先级" value="low" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item label="优先级" prop="priority">
                <el-select v-model="formData.priority" placeholder="选择优先级">
                  <el-option label="低" value="low" />
                  <el-option label="中等" value="medium" />
                  <el-option label="高" value="high" />
                  <el-option label="紧急" value="urgent" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-card>

        <!-- 素材上传 -->
        <el-card class="form-section" shadow="never">
          <template #header>
            <div class="section-header">
              <el-icon><Upload /></el-icon>
              <span>素材上传</span>
              <el-tag :type="formData.trainType === 'face_swap' ? 'info' : 'success'" size="small" class="ml-2">
                {{ formData.trainType === 'face_swap' ? '分别上传脸源和模特素材' : '仅上传脸源素材' }}
              </el-tag>
            </div>
          </template>

          <!-- 训练类型说明 -->
          <div v-if="selectedTrainType" class="train-type-info">
            <div class="train-type-header">
              <el-icon :color="formData.trainType === 'face_swap' ? '#409eff' : '#67c23a'">
                <component :is="formData.trainType === 'face_swap' ? 'Switch' : 'Monitor'" />
              </el-icon>
              <h3>{{ selectedTrainType.name }}</h3>
            </div>
            <div class="train-type-description">
              {{ selectedTrainType.description }}
            </div>
            <div class="train-type-requirements">
              <div class="requirement-item">
                <el-icon color="#409eff"><User /></el-icon>
                <span>脸源素材: {{ selectedTrainType.requirements.source }}</span>
              </div>
              <div v-if="formData.trainType === 'face_swap'" class="requirement-item">
                <el-icon color="#67c23a"><VideoCamera /></el-icon>
                <span>模特素材: {{ selectedTrainType.requirements.target }}</span>
              </div>
            </div>
          </div>

          <!-- 脸源上传区域 -->
          <div class="upload-section">
            <div class="upload-header">
              <div class="upload-title">
                <el-icon color="#409eff"><User /></el-icon>
                <span>脸源素材</span>
                <el-tag type="primary" size="small">必需</el-tag>
              </div>
              <div class="upload-desc">
                上传要提取脸部特征的人物照片，这些脸将被用于给模特换脸
              </div>
            </div>
            
            <el-upload
              v-model:file-list="faceSourceFiles"
              drag
              multiple
              :auto-upload="false"
              accept=".jpg,.jpeg,.png,.webp"
              @change="handleFaceSourceChange"
              class="upload-dragger face-source-upload"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">
                拖拽脸源照片到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  上传要提取脸部特征的人物照片，用于给模特换脸<br/>
                  支持 JPG/PNG/WebP 格式，建议{{ formData.trainType === 'face_swap' ? '5-20' : '20-50' }}张多角度高清人脸照片
                </div>
              </template>
            </el-upload>
            
            <!-- 脸源文件列表 -->
            <div v-if="faceSourceFiles.length > 0" class="file-list">
              <h4>脸源文件 ({{ faceSourceFiles.length }})</h4>
              <div class="file-items">
                <div 
                  v-for="(file, index) in faceSourceFiles" 
                  :key="index"
                  class="file-item"
                >
                  <div class="file-info">
                    <el-icon color="#409eff"><Picture /></el-icon>
                    <div class="file-details">
                      <span class="file-name">{{ file.name }}</span>
                      <span class="file-size">{{ formatFileSize(file.size) }}</span>
                    </div>
                  </div>
                  <el-button 
                    icon="Delete" 
                    size="small" 
                    type="danger" 
                    text
                    @click="removeFaceSourceFile(index)"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 模特上传区域 - 只在face_swap类型显示 -->
          <div v-if="formData.trainType === 'face_swap'" class="upload-section">
            <div class="upload-header">
              <div class="upload-title">
                <el-icon color="#67c23a"><VideoCamera /></el-icon>
                <span>模特素材</span>
                <el-tag type="success" size="small">必需</el-tag>
              </div>
              <div class="upload-desc">
                上传要开直播的模特本人的照片或视频，将使用脸源进行换脸
              </div>
            </div>
            
            <el-upload
              v-model:file-list="modelFiles"
              drag
              multiple
              :auto-upload="false"
              accept=".jpg,.jpeg,.png,.webp,.mp4,.avi,.mov"
              @change="handleModelChange"
              class="upload-dragger model-upload"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">
                拖拽模特素材到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  上传要开直播的模特本人素材，支持图片和视频格式<br/>
                  单文件不超过500MB，用于提供身体姿态参考
                </div>
              </template>
            </el-upload>
            
            <!-- 模特文件列表 -->
            <div v-if="modelFiles.length > 0" class="file-list">
              <h4>模特文件 ({{ modelFiles.length }})</h4>
              <div class="file-items">
                <div 
                  v-for="(file, index) in modelFiles" 
                  :key="index"
                  class="file-item"
                >
                  <div class="file-info">
                    <el-icon :color="getFileIconColor(file.name)">
                      <component :is="getFileIcon(file.name)" />
                    </el-icon>
                    <div class="file-details">
                      <span class="file-name">{{ file.name }}</span>
                      <span class="file-size">{{ formatFileSize(file.size) }}</span>
                    </div>
                  </div>
                  <el-button 
                    icon="Delete" 
                    size="small" 
                    type="danger" 
                    text
                    @click="removeModelFile(index)"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 上传统计 -->
          <div class="upload-summary">
            <el-row :gutter="16">
              <el-col :span="8">
                <div class="summary-item">
                  <span class="label">脸源文件：</span>
                  <span class="value">{{ faceSourceFiles.length }} 个</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="summary-item">
                  <span class="label">模特文件：</span>
                  <span class="value">{{ modelFiles.length }} 个</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="summary-item">
                  <span class="label">总文件大小：</span>
                  <span class="value">{{ totalFileSize }}</span>
                </div>
              </el-col>
            </el-row>
          </div>
        </el-card>

        <!-- 训练配置 -->
        <el-card class="form-section" shadow="never">
          <template #header>
            <div class="section-header">
              <el-icon><Setting /></el-icon>
              <span>训练配置</span>
            </div>
          </template>

          <el-row :gutter="20">
            <el-col :xs="24" :md="12">
              <el-form-item label="训练模板" prop="configTemplate">
                <el-select 
                  v-model="formData.configTemplate" 
                  placeholder="选择预设模板"
                  @change="applyTemplate"
                >
                  <el-option label="快速训练 (推荐)" value="quick" />
                  <el-option label="标准训练" value="standard" />
                  <el-option label="精细训练" value="fine" />
                  <el-option label="自定义配置" value="custom" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item label="目标图片数量">
                <el-input-number 
                  v-model="formData.targetImageCount"
                  :min="50"
                  :max="2000"
                  :step="50"
                  placeholder="预期处理的图片数量"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </el-card>

        <!-- 操作按钮 -->
        <div class="form-actions">
          <el-space size="large">
            <el-button size="large" @click="goBack">
              取消
            </el-button>
            <el-button 
              size="large" 
              @click="saveAsDraft"
              :loading="saving"
            >
              保存草稿
            </el-button>
            <el-button 
              type="primary" 
              size="large"
              @click="createWorkflow"
              :loading="creating"
            >
              创建并开始
            </el-button>
          </el-space>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  ArrowLeft, Document, Upload, Setting, Delete, UploadFilled,
  User, VideoCamera, Picture, Film
} from '@element-plus/icons-vue'
import { workflowApi } from '@/api/workflow'
import { createUploadTask, uploadChunk, checkFileExists } from '@/api/upload'
import request from '@/utils/request'
import { useWorkflowStore } from '@/store/workflow'
import { uploadApi } from '@/api/upload'

// 创建简单的分片上传函数
const uploadFilesWithMaterialType = async (workflowId, files, materialType) => {
  for (const file of files) {
    const actualFile = file.raw || file
    
    // 简单起见，对于小文件直接上传，对于大文件使用分片
    if (actualFile.size <= 10 * 1024 * 1024) { // 10MB以下直接上传
      await uploadSingleFile(workflowId, actualFile, materialType)
    } else {
      await uploadFileInChunks(workflowId, actualFile, materialType)
    }
  }
}

// 单文件直接上传
const uploadSingleFile = async (workflowId, file, materialType) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('materialType', materialType)
  
  return await request.post(`/api/upload/${workflowId}/direct`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// 分片上传
const uploadFileInChunks = async (workflowId, file, materialType) => {
  const chunkSize = 2 * 1024 * 1024 // 2MB
  const totalChunks = Math.ceil(file.size / chunkSize)
  const fileHash = await generateFileHash(file)
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const chunk = file.slice(start, end)
    
    const formData = new FormData()
    formData.append('chunk', chunk)
    formData.append('chunkIndex', i)
    formData.append('totalChunks', totalChunks)
    formData.append('fileHash', fileHash)
    formData.append('fileName', file.name)
    formData.append('materialType', materialType)
    
    await request.post(`/api/upload/${workflowId}/chunks`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

// 生成文件哈希（简化版本）
const generateFileHash = async (file) => {
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const router = useRouter()
const workflowStore = useWorkflowStore()
const formRef = ref()
const faceSourceFiles = ref([])
const modelFiles = ref([])
const loading = ref(false)
const trainTypes = ref([])
const selectedTrainType = ref(null)

// 表单数据
const formData = reactive({
  name: '',
  description: '',
  priority: 'medium',
  trainType: 'face_swap', // 默认为单对单训练
  estimatedTime: '4-8h',
  configTemplate: 'quick',
  targetImageCount: 200
})

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入流程名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  priority: [
    { required: true, message: '请选择优先级', trigger: 'change' }
  ],
  trainType: [
    { required: true, message: '请选择训练类型', trigger: 'change' }
  ],
  configTemplate: [
    { required: true, message: '请选择训练模板', trigger: 'change' }
  ]
}

// 控制状态
const creating = ref(false)
const saving = ref(false)

// 计算属性
const totalFileSize = computed(() => {
  const totalSize = [...faceSourceFiles.value, ...modelFiles.value]
    .reduce((total, file) => total + file.size, 0)
  return formatFileSize(totalSize)
})

// 方法
const goBack = () => {
  router.go(-1)
}

const applyTemplate = (templateKey) => {
  // 应用预设模板
  console.log('应用模板:', templateKey)
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 脸源文件处理
const handleFaceSourceChange = (file, files) => {
  console.log('脸源文件变化:', file, files)
  faceSourceFiles.value = files
  
  // 检查文件类型和大小
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const maxSize = 50 * 1024 * 1024 // 50MB
  
  const invalidFiles = files.filter(f => 
    !validTypes.includes(f.raw?.type || f.type) || 
    (f.raw?.size || f.size) > maxSize
  )
  
  if (invalidFiles.length > 0) {
    ElMessage.warning(`有 ${invalidFiles.length} 个文件格式不支持或大小超过50MB`)
  }
}

const removeFaceSourceFile = (index) => {
  faceSourceFiles.value.splice(index, 1)
}

// 模特文件处理
const handleModelChange = (file, files) => {
  console.log('模特文件变化:', file, files)
  modelFiles.value = files
  
  // 检查文件类型和大小
  const validTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'video/mp4', 'video/avi', 'video/mov', 'video/quicktime'
  ]
  const maxSize = 500 * 1024 * 1024 // 500MB
  
  const invalidFiles = files.filter(f => 
    !validTypes.includes(f.raw?.type || f.type) || 
    (f.raw?.size || f.size) > maxSize
  )
  
  if (invalidFiles.length > 0) {
    ElMessage.warning(`有 ${invalidFiles.length} 个文件格式不支持或大小超过500MB`)
  }
}

const removeModelFile = (index) => {
  modelFiles.value.splice(index, 1)
}

// 获取文件图标
const getFileIcon = (fileName) => {
  const ext = fileName.toLowerCase().split('.').pop()
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return Picture
  } else if (['mp4', 'avi', 'mov'].includes(ext)) {
    return Film
  }
  return Document
}

const getFileIconColor = (fileName) => {
  const ext = fileName.toLowerCase().split('.').pop()
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return '#67c23a'
  } else if (['mp4', 'avi', 'mov'].includes(ext)) {
    return '#e6a23c'
  }
  return '#909399'
}

const saveAsDraft = async () => {
  try {
    saving.value = true
    
    const valid = await formRef.value.validate()
    if (!valid) return
    
    ElMessage.success('草稿已保存')
    
  } catch (error) {
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    saving.value = false
  }
}

// 创建工作流
const createWorkflow = async () => {
  try {
    // 表单验证
    await formRef.value.validate()
    
    // 文件验证
    if (faceSourceFiles.value.length === 0) {
      ElMessage.error('请上传脸源素材')
      return
    }
    
    // 如果是单对单训练，还需要检查模特素材
    if (formData.trainType === 'face_swap' && modelFiles.value.length === 0) {
      ElMessage.error('单对单训练模式需要上传模特素材')
      return
    }
    
    // 开始创建工作流
    loading.value = true
    
    // 1. 创建工作流
    const workflow = await workflowStore.createWorkflow({
      name: formData.name,
      description: formData.description,
      priority: formData.priority,
      trainType: formData.trainType,
      expectedDuration: formData.estimatedTime,
      configTemplate: formData.configTemplate,
      targetImageCount: formData.targetImageCount
    })
    
    if (!workflow) {
      throw new Error('创建工作流失败')
    }
    
    // 2. 上传脸源素材
    await uploadApi.uploadSourceMaterial(
      workflow.id, 
      faceSourceFiles.value.map(f => f.raw),
      (progress) => {
        console.log(`脸源上传进度: ${progress}%`)
      }
    )
    
    // 3. 如果是换脸类型，上传模特素材
    if (formData.trainType === 'face_swap' && modelFiles.value.length > 0) {
      await uploadApi.uploadTargetMaterial(
        workflow.id, 
        modelFiles.value.map(f => f.raw),
        (progress) => {
          console.log(`模特上传进度: ${progress}%`)
        }
      )
    }
    
    ElMessage.success('工作流创建成功，正在上传素材...')
    
    // 跳转到详情页
    router.push(`/workflow/${workflow.id}`)
  } catch (error) {
    console.error('创建工作流错误:', error)
    ElMessage.error(error.message || '创建工作流失败')
  } finally {
    loading.value = false
  }
}

// 处理训练类型变更
const handleTrainTypeChange = (type) => {
  selectedTrainType.value = trainTypes.value.find(t => t.id === type)
  // 如果切换到单人脸提取，清空模特文件
  if (type === 'face_extract') {
    modelFiles.value = []
  }
}

// 加载训练类型数据
const loadTrainTypes = async () => {
  try {
    trainTypes.value = await workflowStore.fetchTrainTypes() || []
    if (trainTypes.value.length > 0) {
      formData.trainType = trainTypes.value[0].id
      selectedTrainType.value = trainTypes.value[0]
    }
  } catch (error) {
    console.error('加载训练类型失败:', error)
    ElMessage.error('加载训练类型失败')
  }
}

// 页面加载时获取训练类型数据
onMounted(() => {
  loadTrainTypes()
})
</script>

<style scoped>
.workflow-create {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
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

.create-form {
  max-width: 1000px;
}

.form-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.upload-section {
  margin: 24px 0;
  padding: 24px;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  background: #fafbfc;
}

.upload-section:first-child {
  margin-top: 16px;
}

.upload-header {
  margin-bottom: 20px;
}

.upload-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 16px;
}

.upload-desc {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}

.face-source-upload {
  border: 2px dashed #409eff !important;
  background: #f8fbff !important;
}

.face-source-upload:hover {
  border-color: #66b1ff !important;
  background: #f0f8ff !important;
}

.model-upload {
  border: 2px dashed #67c23a !important;
  background: #f8fff8 !important;
}

.model-upload:hover {
  border-color: #85ce61 !important;
  background: #f0fff0 !important;
}

.upload-summary {
  margin-top: 24px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 12px;
  border: 1px solid #e4e7ed;
}

.summary-item {
  text-align: center;
}

.summary-item .label {
  color: #909399;
  font-size: 14px;
  display: block;
  margin-bottom: 4px;
}

.summary-item .value {
  color: #303133;
  font-weight: 600;
  font-size: 18px;
}

.file-list {
  margin-top: 20px;
}

.file-list h4 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
}

.file-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  background: #fff;
  transition: all 0.3s;
}

.file-item:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  word-break: break-all;
}

.file-size {
  font-size: 12px;
  color: #909399;
}

.form-actions {
  margin-top: 32px;
  text-align: center;
  padding: 24px 0;
  border-top: 1px solid #f0f0f0;
}

.ml-2 {
  margin-left: 8px;
}

@media (max-width: 768px) {
  .workflow-create {
    padding: 15px;
  }
  
  .create-form {
    max-width: 100%;
  }
  
  .upload-section {
    padding: 16px;
    margin: 16px 0;
  }
  
  .file-items {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    padding: 16px 0;
  }
  
  .form-actions .el-space {
    flex-direction: column;
    width: 100%;
  }
  
  .form-actions .el-button {
    width: 100%;
  }
}

.train-type-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.train-type-info {
  background-color: var(--el-color-info-light-9);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.train-type-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.train-type-header h3 {
  margin: 0;
  margin-left: 8px;
  font-size: 16px;
}

.train-type-description {
  color: var(--el-text-color-secondary);
  margin-bottom: 12px;
  font-size: 14px;
}

.train-type-requirements {
  background-color: var(--el-color-white);
  border-radius: 6px;
  padding: 12px;
}

.requirement-item {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.requirement-item:last-child {
  margin-bottom: 0;
}

.requirement-item span {
  margin-left: 8px;
  font-size: 14px;
}
</style> 