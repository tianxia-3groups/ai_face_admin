<template>
  <div class="stat-card" :class="`${type}-card`">
    <div class="stat-icon" :class="type">
      <el-icon>
        <component :is="icon" />
      </el-icon>
    </div>
    <div class="stat-content">
      <div class="stat-number">{{ number }}</div>
      <div class="stat-label">{{ label }}</div>
    </div>
    <div v-if="showTrend" class="stat-trend">
      <el-icon class="trend-icon">
        <TrendCharts />
      </el-icon>
    </div>
  </div>
</template>

<script setup>
import { TrendCharts } from '@element-plus/icons-vue'

// 定义props
defineProps({
  // 卡片类型，用于样式主题
  type: {
    type: String,
    required: true,
    validator: (value) => ['running', 'waiting', 'completed', 'total', 'failed'].includes(value)
  },
  // 图标组件
  icon: {
    type: [String, Object],
    required: true
  },
  // 数字
  number: {
    type: [Number, String],
    required: true
  },
  // 标签文字
  label: {
    type: String,
    required: true
  },
  // 是否显示趋势图标
  showTrend: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.stat-card {
  position: relative;
  display: flex;
  align-items: center;
  padding: 16px;
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

.running-card {
  --card-color: #3b82f6;
  --card-color-light: #60a5fa;
}

.waiting-card {
  --card-color: #f59e0b;
  --card-color-light: #fbbf24;
}

.completed-card {
  --card-color: #10b981;
  --card-color-light: #34d399;
}

.total-card {
  --card-color: #8b5cf6;
  --card-color-light: #a78bfa;
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
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 20px;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stat-icon.running {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #3b82f6;
}

.stat-icon.waiting {
  background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
  color: #f59e0b;
}

.stat-icon.completed {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #10b981;
}

.stat-icon.total {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
  color: #8b5cf6;
}

.stat-icon.failed {
  background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
  color: #ef4444;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.stat-trend {
  display: flex;
  align-items: center;
  color: #10b981;
}

.trend-icon {
  font-size: 20px;
}

@media (max-width: 768px) {
  .stat-card {
    padding: 20px;
  }
  
  .stat-icon {
    width: 48px;
    height: 48px;
    font-size: 24px;
    margin-right: 16px;
  }
  
  .stat-number {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
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
}
</style> 