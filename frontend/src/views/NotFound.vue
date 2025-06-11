<template>
  <div class="not-found">
    <div class="not-found-content">
      <!-- 404 图标和标题 -->
      <div class="error-visual">
        <div class="error-code">404</div>
        <el-icon class="error-icon"><Warning /></el-icon>
      </div>
      
      <!-- 错误信息 -->
      <div class="error-info">
        <h2 class="error-title">页面未找到</h2>
        <p class="error-description">
          抱歉，您访问的页面不存在或已被移动。
          <br>
          请检查网址是否正确，或返回首页继续浏览。
        </p>
      </div>
      
      <!-- 导航按钮 -->
      <div class="error-actions">
        <el-space size="large">
          <el-button size="large" @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            返回上页
          </el-button>
          
          <el-button type="primary" size="large" @click="goHome">
            <el-icon><HomeFilled /></el-icon>
            回到首页
          </el-button>
          
          <el-button size="large" @click="goWorkflows">
            <el-icon><List /></el-icon>
            流程中心
          </el-button>
        </el-space>
      </div>
      
      <!-- 建议链接 -->
      <div class="helpful-links">
        <h3>您可能在寻找：</h3>
        <div class="link-grid">
          <el-card 
            class="link-card" 
            shadow="hover"
            @click="goHome"
          >
            <div class="link-content">
              <el-icon class="link-icon"><Monitor /></el-icon>
              <div class="link-info">
                <h4>仪表板</h4>
                <p>查看系统总览和活跃流程</p>
              </div>
            </div>
          </el-card>
          
          <el-card 
            class="link-card" 
            shadow="hover"
            @click="goWorkflows"
          >
            <div class="link-content">
              <el-icon class="link-icon"><List /></el-icon>
              <div class="link-info">
                <h4>流程中心</h4>
                <p>管理所有训练流程</p>
              </div>
            </div>
          </el-card>
          
          <el-card 
            class="link-card" 
            shadow="hover"
            @click="createWorkflow"
          >
            <div class="link-content">
              <el-icon class="link-icon"><Plus /></el-icon>
              <div class="link-info">
                <h4>创建流程</h4>
                <p>开始新的训练任务</p>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { 
  Warning, ArrowLeft, HomeFilled, List, Monitor, Plus 
} from '@element-plus/icons-vue'

const router = useRouter()

// 导航方法
const goBack = () => {
  // 如果有历史记录则返回，否则跳转到首页
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/')
  }
}

const goHome = () => {
  router.push('/')
}

const goWorkflows = () => {
  router.push('/workflows')
}

const createWorkflow = () => {
  router.push('/workflows/create')
}
</script>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.not-found::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
  opacity: 0.3;
}

.not-found-content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 800px;
  padding: 40px 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.error-visual {
  position: relative;
  margin-bottom: 40px;
}

.error-code {
  font-size: 120px;
  font-weight: 900;
  color: #409eff;
  line-height: 1;
  margin-bottom: 20px;
  text-shadow: 0 4px 8px rgba(64, 158, 255, 0.3);
  animation: float 3s ease-in-out infinite;
}

.error-icon {
  font-size: 80px;
  color: #e6a23c;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: pulse 2s ease-in-out infinite;
}

.error-info {
  margin-bottom: 40px;
}

.error-title {
  font-size: 28px;
  color: #303133;
  margin: 0 0 16px 0;
  font-weight: 600;
}

.error-description {
  font-size: 16px;
  color: #606266;
  line-height: 1.8;
  margin: 0;
}

.error-actions {
  margin-bottom: 50px;
}

.helpful-links {
  margin-top: 40px;
  text-align: left;
}

.helpful-links h3 {
  color: #303133;
  margin: 0 0 20px 0;
  font-size: 20px;
  text-align: center;
}

.link-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}

.link-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.link-card:hover {
  transform: translateY(-4px);
  border-color: #409eff;
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.2);
}

.link-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px;
}

.link-icon {
  font-size: 32px;
  color: #409eff;
  flex-shrink: 0;
}

.link-info h4 {
  margin: 0 0 4px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.link-info p {
  margin: 0;
  color: #909399;
  font-size: 14px;
  line-height: 1.4;
}

/* 动画效果 */
@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.8;
    transform: translate(-50%, -50%) scale(1.1);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .not-found-content {
    margin: 20px;
    padding: 30px 20px;
  }
  
  .error-code {
    font-size: 80px;
  }
  
  .error-icon {
    font-size: 60px;
  }
  
  .error-title {
    font-size: 24px;
  }
  
  .error-description {
    font-size: 14px;
  }
  
  .link-grid {
    grid-template-columns: 1fr;
  }
  
  .error-actions .el-space {
    flex-direction: column;
    width: 100%;
  }
  
  .error-actions .el-button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .error-code {
    font-size: 60px;
  }
  
  .error-icon {
    font-size: 40px;
  }
  
  .link-content {
    flex-direction: column;
    text-align: center;
  }
}
</style> 