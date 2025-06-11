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
              <el-form-item label="优先级" prop="priority">
                <el-select v-model="formData.priority" placeholder="选择优先级">
                  <el-option label="高优先级" value="high" />
                  <el-option label="普通" value="medium" />
                  <el-option label="低优先级" value="low" />
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
              <el-form-item label="预期完成时间">
                <el-select v-model="formData.estimatedTime" placeholder="选择预期时间">
                  <el-option label="1-2小时" value="1-2h" />
                  <el-option label="2-4小时" value="2-4h" />
                  <el-option label="4-8小时" value="4-8h" />
                  <el-option label="8-12小时" value="8-12h" />
                  <el-option label="12小时以上" value="12h+" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item label="训练类型" prop="trainingType">
                <el-select v-model="formData.trainingType" placeholder="选择训练类型">
                  <el-option label="人物肖像" value="portrait" />
                  <el-option label="风景场景" value="landscape" />
                  <el-option label="物体识别" value="object" />
                  <el-option label="自定义" value="custom" />
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
              <el-tag type="info" size="small" class="ml-2">分别上传脸源和模特素材</el-tag>
            </div>
          </template>

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
                  支持 JPG/PNG/WebP 格式，建议5-20张多角度高清人脸照片
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

          <!-- 模特上传区域 -->
          <div class="upload-section">
            <div class="upload-header">
              <div class="upload-title">
                <el-icon color="#67c23a"><VideoCamera /></el-icon>
                <span>模特素材</span>
                <el-tag type="success" size="small">可选</el-tag>
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
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  ArrowLeft, Document, Upload, Setting, Delete, UploadFilled,
  User, VideoCamera, Picture, Film
} from '@element-plus/icons-vue'

const router = useRouter()
const formRef = ref()
const faceSourceFiles = ref([])
const modelFiles = ref([])

// 表单数据
const formData = reactive({
  name: '',
  description: '',
  priority: 'medium',
  estimatedTime: '',
  trainingType: '',
  configTemplate: 'quick',
  targetImageCount: 200
})

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入流程名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  trainingType: [
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
}

const removeFaceSourceFile = (index) => {
  faceSourceFiles.value.splice(index, 1)
}

// 模特文件处理
const handleModelChange = (file, files) => {
  console.log('模特文件变化:', file, files)
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

const createWorkflow = async () => {
  try {
    creating.value = true
    
    const valid = await formRef.value.validate()
    if (!valid) return
    
    if (faceSourceFiles.value.length === 0) {
      ElMessage.warning('请至少上传一个脸源文件')
      return
    }
    
    // 确认创建
    await ElMessageBox.confirm(
      '确定要创建这个训练流程吗？创建后将自动开始处理。',
      '创建确认',
      { type: 'info' }
    )
    
    ElMessage.success('训练流程创建成功！')
    router.push('/workflows')
    
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('创建失败: ' + error.message)
    }
  } finally {
    creating.value = false
  }
}
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
</style> 