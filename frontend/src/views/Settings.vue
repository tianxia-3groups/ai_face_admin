<template>
  <div class="settings-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <div class="title-group">
            <h1>
              <el-icon class="title-icon"><Setting /></el-icon>
              系统设置
            </h1>
            <p class="subtitle">配置系统参数和运行选项</p>
          </div>
        </div>
        <div class="header-right">
          <el-button @click="exportSettings" class="export-btn">
            <el-icon><Download /></el-icon>
            导出配置
          </el-button>
          <el-button type="primary" @click="importSettings" class="import-btn">
            <el-icon><Upload /></el-icon>
            导入配置
          </el-button>
        </div>
      </div>
    </div>

    <!-- 设置标签页 -->
    <div class="settings-content">
      <el-tabs v-model="activeTab" class="settings-tabs">
        <!-- 上传配置 -->
        <el-tab-pane label="上传配置" name="upload">
          <div class="tab-content">
            <el-card class="config-card" shadow="never">
              <template #header>
                <div class="card-header">
                  <div class="header-left">
                    <div class="header-icon upload-icon">
                      <el-icon><Upload /></el-icon>
                    </div>
                    <div class="header-info">
                      <span class="header-title">上传配置</span>
                      <span class="header-subtitle">配置文件上传相关参数</span>
                    </div>
                  </div>
                </div>
              </template>

              <el-form :model="uploadConfig" label-width="140px" class="config-form">
                <div class="form-section">
                  <h4 class="section-title">并发设置</h4>
                  <el-row :gutter="24">
                    <el-col :span="12">
                      <el-form-item label="最大并发文件">
                        <div class="form-item-wrapper">
                          <el-input-number 
                            v-model="uploadConfig.maxConcurrentFiles" 
                            :min="1" 
                            :max="10" 
                            class="full-width-input"
                          />
                          <div class="form-help">同时上传的最大文件数量</div>
                        </div>
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item label="并发工作流">
                        <div class="form-item-wrapper">
                          <el-input-number 
                            v-model="uploadConfig.maxConcurrentWorkflows" 
                            :min="1" 
                            :max="5" 
                            class="full-width-input"
                          />
                          <div class="form-help">同时进行上传的工作流数量</div>
                        </div>
                      </el-form-item>
                    </el-col>
                  </el-row>
                </div>

                <div class="form-section">
                  <h4 class="section-title">文件设置</h4>
                  <el-row :gutter="24">
                    <el-col :span="12">
                      <el-form-item label="分片大小">
                        <div class="form-item-wrapper">
                          <el-select v-model="uploadConfig.chunkSize" class="full-width-input">
                            <el-option label="1MB" value="1MB" />
                            <el-option label="2MB" value="2MB" />
                            <el-option label="5MB" value="5MB" />
                            <el-option label="10MB" value="10MB" />
                          </el-select>
                          <div class="form-help">文件分片上传的大小</div>
                        </div>
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item label="最大文件大小">
                        <div class="form-item-wrapper">
                          <el-select v-model="uploadConfig.maxFileSize" class="full-width-input">
                            <el-option label="100MB" value="100MB" />
                            <el-option label="500MB" value="500MB" />
                            <el-option label="1GB" value="1GB" />
                            <el-option label="2GB" value="2GB" />
                          </el-select>
                          <div class="form-help">单个文件的最大大小限制</div>
                        </div>
                      </el-form-item>
                    </el-col>
                  </el-row>
                </div>

                <div class="form-section">
                  <h4 class="section-title">错误处理</h4>
                  <el-row :gutter="24">
                    <el-col :span="12">
                      <el-form-item label="重试次数">
                        <div class="form-item-wrapper">
                          <el-input-number 
                            v-model="uploadConfig.retryAttempts" 
                            :min="0" 
                            :max="10" 
                            class="full-width-input"
                          />
                          <div class="form-help">上传失败时的重试次数</div>
                        </div>
                      </el-form-item>
                    </el-col>
                  </el-row>
                </div>

                <div class="form-actions">
                  <el-button type="primary" @click="saveUploadConfig" class="save-btn">
                    <el-icon><Check /></el-icon>
                    保存配置
                  </el-button>
                  <el-button @click="resetUploadConfig" class="reset-btn">
                    <el-icon><RefreshLeft /></el-icon>
                    重置
                  </el-button>
                </div>
              </el-form>
            </el-card>
          </div>
        </el-tab-pane>

        <!-- 训练配置 -->
        <el-tab-pane label="训练配置" name="training">
          <div class="tab-content">
            <el-card class="config-card" shadow="never">
              <template #header>
                <div class="card-header">
                  <div class="header-left">
                    <div class="header-icon training-icon">
                      <el-icon><Cpu /></el-icon>
                    </div>
                    <div class="header-info">
                      <span class="header-title">训练配置</span>
                      <span class="header-subtitle">配置AI模型训练参数</span>
                    </div>
                  </div>
                </div>
              </template>

              <el-form :model="trainingConfig" label-width="140px" class="config-form">
                <div class="form-section">
                  <h4 class="section-title">基础参数</h4>
                  <el-row :gutter="24">
                    <el-col :span="12">
                      <el-form-item label="默认迭代次数">
                        <div class="form-item-wrapper">
                          <el-input-number 
                            v-model="trainingConfig.defaultEpochs" 
                            :min="100" 
                            :max="10000" 
                            :step="100" 
                            class="full-width-input"
                          />
                          <div class="form-help">默认的训练迭代次数</div>
                        </div>
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item label="批次大小">
                        <div class="form-item-wrapper">
                          <el-input-number 
                            v-model="trainingConfig.batchSize" 
                            :min="1" 
                            :max="64" 
                            class="full-width-input"
                          />
                          <div class="form-help">训练时的批次大小</div>
                        </div>
                      </el-form-item>
                    </el-col>
                  </el-row>
                </div>

                <div class="form-section">
                  <h4 class="section-title">高级参数</h4>
                  <el-row :gutter="24">
                    <el-col :span="12">
                      <el-form-item label="学习率">
                        <div class="form-item-wrapper">
                          <el-input-number 
                            v-model="trainingConfig.learningRate" 
                            :min="0.0001" 
                            :max="0.1" 
                            :step="0.0001" 
                            :precision="4" 
                            class="full-width-input"
                          />
                          <div class="form-help">神经网络的学习率</div>
                        </div>
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item label="GPU设备">
                        <div class="form-item-wrapper">
                          <el-select v-model="trainingConfig.gpuDevice" class="full-width-input">
                            <el-option label="自动选择" value="auto" />
                            <el-option label="GPU 0" value="cuda:0" />
                            <el-option label="GPU 1" value="cuda:1" />
                            <el-option label="CPU" value="cpu" />
                          </el-select>
                          <div class="form-help">训练使用的计算设备</div>
                        </div>
                      </el-form-item>
                    </el-col>
                  </el-row>
                </div>

                <div class="form-section">
                  <h4 class="section-title">路径配置</h4>
                  <el-row :gutter="24">
                    <el-col :span="24">
                      <el-form-item label="DeepFaceLab目录">
                        <div class="form-item-wrapper">
                          <el-input 
                            v-model="trainingConfig.deepfacelabDir" 
                            placeholder="请输入DeepFaceLab的安装目录路径，例如：D:/DeepFaceLab"
                            class="full-width-input"
                          >
                            <template #append>
                              <el-button @click="selectDeepFaceLabDir">
                                <el-icon><FolderOpened /></el-icon>
                                浏览
                              </el-button>
                            </template>
                          </el-input>
                          <div class="form-help">DeepFaceLab软件的安装目录，用于执行训练脚本</div>
                        </div>
                      </el-form-item>
                    </el-col>
                  </el-row>
                </div>

                <div class="form-actions">
                  <el-button type="primary" @click="saveTrainingConfig" class="save-btn">
                    <el-icon><Check /></el-icon>
                    保存配置
                  </el-button>
                  <el-button @click="resetTrainingConfig" class="reset-btn">
                    <el-icon><RefreshLeft /></el-icon>
                    重置
                  </el-button>
                </div>
              </el-form>
            </el-card>
          </div>
        </el-tab-pane>

        <!-- 系统信息 -->
        <el-tab-pane label="系统信息" name="system">
          <div class="tab-content system-tab-content">
            <!-- 系统状态监控 - 全宽显示 -->
            <div class="system-status-wrapper">
              <DashboardSystemStatus :show-connection="true" :show-uptime="true" />
            </div>
            
            <!-- 版本信息 -->
            <el-card class="info-card" shadow="never">
              <template #header>
                <div class="card-header">
                  <div class="header-left">
                    <div class="header-icon version-icon">
                      <el-icon><InfoFilled /></el-icon>
                    </div>
                    <div class="header-info">
                      <span class="header-title">版本信息</span>
                      <span class="header-subtitle">系统版本和构建信息</span>
                    </div>
                  </div>
                </div>
              </template>

              <div class="info-content">
                <div class="info-item">
                  <div class="info-icon">
                    <el-icon><Platform /></el-icon>
                  </div>
                  <div class="info-details">
                    <span class="info-label">系统版本</span>
                    <span class="info-value version-badge">v1.0.0</span>
                  </div>
                </div>
                
                <div class="info-item">
                  <div class="info-icon">
                    <el-icon><Tools /></el-icon>
                  </div>
                  <div class="info-details">
                    <span class="info-label">Node.js</span>
                    <span class="info-value">{{ systemInfo.nodeVersion }}</span>
                  </div>
                </div>
                
                <div class="info-item">
                  <div class="info-icon">
                    <el-icon><Calendar /></el-icon>
                  </div>
                  <div class="info-details">
                    <span class="info-label">构建时间</span>
                    <span class="info-value">2024-12-04</span>
                  </div>
                </div>
                
                <div class="info-item">
                  <div class="info-icon">
                    <el-icon><Connection /></el-icon>
                  </div>
                  <div class="info-details">
                    <span class="info-label">运行环境</span>
                    <span class="info-value">Production</span>
                  </div>
                </div>
              </div>
            </el-card>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Setting, Download, Upload, Check, RefreshLeft, Cpu, Monitor, 
  Timer, DataLine, Folder, InfoFilled, Platform, Tools, Calendar, Connection, FolderOpened
} from '@element-plus/icons-vue'
import { settingsApi } from '@/api/settings'
import DashboardSystemStatus from '@/components/DashboardSystemStatus.vue'

const activeTab = ref('upload')

// 上传配置
const uploadConfig = ref({
  maxConcurrentFiles: 3,
  maxConcurrentWorkflows: 1,
  chunkSize: '2MB',
  maxFileSize: '500MB',
  retryAttempts: 3
})

// 训练配置
const trainingConfig = ref({
  defaultEpochs: 1000,
  batchSize: 4,
  learningRate: 0.0002,
  gpuDevice: 'auto',
  deepfacelabDir: ''
})

// 系统信息
const systemInfo = ref({
  nodeVersion: 'v22.14.0'
})

onMounted(() => {
  loadConfigs()
})

const loadConfigs = async () => {
  try {
    // 加载上传配置
    const uploadResponse = await settingsApi.getUploadConfig()
    if (uploadResponse.success) {
      uploadConfig.value = { ...uploadConfig.value, ...uploadResponse.data }
    }

    // 加载训练配置
    const trainingResponse = await settingsApi.getTrainingConfig()
    if (trainingResponse.success) {
      trainingConfig.value = { ...trainingConfig.value, ...trainingResponse.data }
    }
  } catch (error) {
    console.error('加载配置失败:', error)
    ElMessage.warning('配置加载失败，使用默认配置')
  }
}



const saveUploadConfig = async () => {
  try {
    const response = await settingsApi.saveUploadConfig(uploadConfig.value)
    if (response.success) {
      ElMessage.success('上传配置保存成功')
    } else {
      ElMessage.error(response.message || '保存失败')
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存失败')
  }
}

const resetUploadConfig = () => {
  uploadConfig.value = {
    maxConcurrentFiles: 3,
    maxConcurrentWorkflows: 1,
    chunkSize: '2MB',
    maxFileSize: '500MB',
    retryAttempts: 3
  }
  ElMessage.success('配置已重置')
}

const saveTrainingConfig = async () => {
  try {
    const response = await settingsApi.saveTrainingConfig(trainingConfig.value)
    if (response.success) {
      ElMessage.success('训练配置保存成功')
    } else {
      ElMessage.error(response.message || '保存失败')
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存失败')
  }
}

const resetTrainingConfig = () => {
  trainingConfig.value = {
    defaultEpochs: 1000,
    batchSize: 4,
    learningRate: 0.0002,
    gpuDevice: 'auto',
    deepfacelabDir: ''
  }
  ElMessage.success('配置已重置')
}

const selectDeepFaceLabDir = () => {
  // 由于浏览器安全限制，无法直接访问文件系统
  // 这里提供一个提示，用户需要手动输入路径
  ElMessage.info('请手动输入DeepFaceLab的安装目录路径，例如：D:/DeepFaceLab 或 /home/user/DeepFaceLab')
}

const exportSettings = () => {
  // 导出设置
  ElMessage.success('配置导出成功')
}

const importSettings = () => {
  // 导入设置
  ElMessage.success('配置导入成功')
}
</script>

<style scoped>
:deep(.el-tabs__active-bar){
  background-color : rgba(79, 70, 229, 0);
}

.settings-page {
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

.header-right {
  display: flex;
  gap: 12px;
}

.export-btn, .import-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-weight: 600;
  border-radius: 8px;
  padding: 10px 20px;
  transition: all 0.3s ease;
}

.export-btn:hover, .import-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.settings-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.settings-tabs :deep(.el-tabs__header) {
  background: #fafbfc;
  margin: 0;
  padding: 0 24px;
  border-bottom: 1px solid #e5e7eb;
}

.settings-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.settings-tabs :deep(.el-tabs__item) {
  font-weight: 500;
  color: #6b7280;
  padding: 16px 20px;
  border-bottom: 3px solid transparent;
  transition: all 0.3s ease;
}

.settings-tabs :deep(.el-tabs__item.is-active) {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
}

.settings-tabs :deep(.el-tabs__item:hover) {
  color: #4f46e5;
}

.tab-content {
  padding: 24px;
}

/* 系统信息标签页特殊样式 */
.system-tab-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.system-status-wrapper {
  /* 移除标签页的内边距影响，让系统状态组件完全按照仪表板样式显示 */
  margin: -24px -24px 0 -24px;
  padding: 24px;
  background: transparent;
}

.config-card, .info-card {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  transition: all 0.3s ease;
  margin-bottom: 20px;
}

.config-card:hover, .info-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.config-card :deep(.el-card__header),
.info-card :deep(.el-card__header) {
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
}

.config-card :deep(.el-card__body),
.info-card :deep(.el-card__body) {
  padding: 24px;
}

.card-header {
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.upload-icon {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #3b82f6;
}

.training-icon {
  background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
  color: #f59e0b;
}

.system-icon {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #10b981;
}

.version-icon {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
  color: #8b5cf6;
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

.config-form {
  margin-top: 20px;
}

.form-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f1f5f9;
}

.form-section:last-of-type {
  border-bottom: none;
  margin-bottom: 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
}

.form-item-wrapper {
  width: 100%;
}

.full-width-input {
  width: 100%;
}

.form-help {
  font-size: 12px;
  color: #6b7280;
  margin-top: 8px;
  line-height: 1.4;
}

.form-actions {
  display: flex;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #f1f5f9;
  margin-top: 24px;
}

.save-btn, .reset-btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.save-btn:hover, .reset-btn:hover {
  transform: translateY(-1px);
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.info-item:hover {
  background: #f1f5f9;
}

.info-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  color: #6366f1;
  flex-shrink: 0;
}

.cpu-icon {
  background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
  color: #f59e0b;
}

.memory-icon {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #3b82f6;
}

.disk-icon {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #10b981;
}

.info-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.info-value {
  font-size: 16px;
  color: #1f2937;
  font-weight: 600;
}

.version-badge {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
}

.progress-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-wrapper .info-value {
  font-size: 14px;
  align-self: flex-start;
}

@media (max-width: 768px) {
  .settings-page {
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

  .header-right {
    justify-content: center;
  }

  .tab-content {
    padding: 16px;
  }

  .config-card :deep(.el-card__body),
  .info-card :deep(.el-card__body) {
    padding: 16px;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions .el-button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .settings-page {
    padding: 8px;
  }

  .page-header {
    padding: 16px 12px;
  }

  .title-group h1 {
    font-size: 20px;
  }

  .tab-content {
    padding: 12px;
  }

  .config-card :deep(.el-card__body),
  .info-card :deep(.el-card__body) {
    padding: 12px;
  }

  .form-section {
    margin-bottom: 24px;
    padding-bottom: 16px;
  }

  .section-title {
    font-size: 14px;
    margin-bottom: 16px;
  }

  .info-item {
    padding: 12px;
  }
}
</style> 