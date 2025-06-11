<template>
  <div class="workflow-status">
    <el-tag 
      :type="statusConfig.type" 
      :effect="statusConfig.effect"
      size="small"
    >
      <el-icon v-if="statusConfig.icon" class="status-icon">
        <component :is="statusConfig.icon" />
      </el-icon>
      {{ statusConfig.text }}
    </el-tag>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { 
  Clock, 
  Loading, 
  VideoPlay, 
  Check, 
  Close, 
  VideoPause,
  Upload,
  Document,
  Cpu,
  Download,
  Warning,
  QuestionFilled,
  DataLine
} from '@element-plus/icons-vue'

const props = defineProps({
  status: {
    type: String,
    required: true
  }
})

// 状态配置映射
const statusConfig = computed(() => {
  const configs = {
    // 等待阶段
    'created': {
      text: '已创建',
      type: 'info',
      effect: 'light',
      icon: Document
    },
    'waiting_materials': {
      text: '等待素材',
      type: 'warning',
      effect: 'light',
      icon: Upload
    },
    
    // 上传阶段
    'uploading_materials': {
      text: '上传中',
      type: 'primary',
      effect: 'light',
      icon: Loading
    },
    'materials_uploaded': {
      text: '素材已上传',
      type: 'success',
      effect: 'light',
      icon: Check
    },
    
    // 处理阶段  
    'processing_materials': {
      text: '处理素材',
      type: 'primary',
      effect: 'plain',
      icon: Loading
    },
    'materials_processed': {
      text: '素材已处理',
      type: 'success',
      effect: 'light',
      icon: Check
    },
    
    // 训练阶段
    'training_started': {
      text: '训练中',
      type: 'primary',
      effect: 'dark',
      icon: Cpu
    },
    'training_progress': {
      text: '训练进行中',
      type: 'primary',
      effect: 'plain',
      icon: DataLine
    },
    'training_completed': {
      text: '训练完成',
      type: 'success',
      effect: 'plain',
      icon: Check
    },
    
    // 完成阶段
    'model_generated': {
      text: '模型已生成',
      type: 'success',
      effect: 'light',
      icon: Check
    },
    'completed': {
      text: '已完成',
      type: 'success',
      effect: 'dark',
      icon: Check
    },
    
    // 异常状态
    'failed': {
      text: '失败',
      type: 'danger',
      effect: 'dark',
      icon: Close
    },
    'paused': {
      text: '已暂停',
      type: 'warning',
      effect: 'plain',
      icon: VideoPause
    },
    'cancelled': {
      text: '已取消',
      type: 'info',
      effect: 'plain',
      icon: Close
    },
    'error': {
      text: '错误',
      type: 'danger',
      effect: 'light',
      icon: Warning
    }
  }
  
  return configs[props.status] || {
    text: '未知状态',
    type: 'info',
    effect: 'light',
    icon: QuestionFilled
  }
})
</script>

<style scoped>
.workflow-status {
  display: inline-block;
}

.status-icon {
  margin-right: 4px;
}

:deep(.el-tag) {
  border-radius: 12px;
  padding: 0 8px;
  font-size: 12px;
  line-height: 20px;
  display: flex;
  align-items: center;
}

:deep(.el-tag .el-icon) {
  font-size: 12px;
}
</style> 