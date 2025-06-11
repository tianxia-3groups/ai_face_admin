<template>
  <div class="global-upload-status">
    <!-- 上传状态图标 -->
    <el-dropdown
      v-if="uploadStore.hasUploading || uploadStore.totalFiles > 0"
      trigger="click"
      placement="bottom-end"
      :hide-on-click="false"
    >
      <el-button
        :type="uploadStore.hasUploading ? 'primary' : 'default'"
        :loading="uploadStore.hasUploading"
        circle
      >
        <el-badge 
          :value="uploadStore.uploadingCount" 
          :max="99"
          :hidden="!uploadStore.hasUploading"
          type="danger"
        >
          <el-icon>
            <Upload />
          </el-icon>
        </el-badge>
      </el-button>
      
      <template #dropdown>
        <div class="upload-panel">
          <UploadProgressPanel />
        </div>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup>
import { useUploadStore } from '@/store/upload'
import UploadProgressPanel from './UploadProgressPanel.vue'

const uploadStore = useUploadStore()
</script>

<style scoped>
.global-upload-status {
  position: relative;
}

.upload-panel {
  width: 400px;
  max-height: 500px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  padding: 0;
}

@media (max-width: 768px) {
  .upload-panel {
    width: 300px;
    max-height: 400px;
  }
}
</style> 