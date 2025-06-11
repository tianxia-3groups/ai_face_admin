<template>
  <el-container class="layout-container">
    <!-- 顶部导航 -->
    <el-header height="60px" class="layout-header">
      <div class="header-left">
        <h1 class="system-title">AI人脸训练管理系统</h1>
      </div>
      
      <div class="header-right">
        <!-- 全局上传状态 -->
        <!-- <GlobalUploadStatus /> -->
        
        <!-- 用户菜单 -->
        <el-dropdown>
          <el-button text>
            <el-icon><UserFilled /></el-icon>
            {{ authStore.user?.username || '管理员' }}
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleLogout">
                <el-icon><SwitchButton /></el-icon>
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <el-container>
      <!-- 侧边栏 -->
      <el-aside width="240px" class="layout-aside">
        <el-menu
          :default-active="$route.path"
          :router="true"
          background-color="#fff"
          text-color="#606266"
          active-text-color="#409eff"
        >
          <el-menu-item index="/dashboard">
            <el-icon><Monitor /></el-icon>
            <span>仪表板</span>
          </el-menu-item>
          
          <el-menu-item index="/workflows">
            <el-icon><List /></el-icon>
            <span>流程中心</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 主内容区域 -->
      <el-main class="layout-main">
        <transition name="fade" mode="out-in">
          <router-view />
        </transition>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { ElMessageBox } from 'element-plus'
import { UserFilled, ArrowDown, SwitchButton, Monitor, List } from '@element-plus/icons-vue'
// import GlobalUploadStatus from '@/components/Upload/GlobalUploadStatus.vue'

const router = useRouter()
const authStore = useAuthStore()

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await authStore.logout()
    router.push('/login')
  } catch (error) {
    // 用户取消
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.layout-header {
  background: #fff;
  border-bottom: 1px solid #e6e8eb;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
}

.system-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.layout-aside {
  background: #fff;
  border-right: 1px solid #e6e8eb;
  box-shadow: 2px 0 8px rgba(0,0,0,0.06);
}

.layout-main {
  background: #f5f7fa;
  padding: 20px;
  height: calc(100vh - 60px);
  overflow-y: auto;
}

.el-menu {
  border-right: none;
}

.el-menu-item {
  margin: 4px 8px;
  border-radius: 6px;
}

.el-menu-item:hover {
  background: #f0f9ff;
}

.el-menu-item.is-active {
  background: #e1f3ff;
  color: #409eff;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .layout-aside {
    width: 200px !important;
  }
  
  .system-title {
    font-size: 16px;
  }
  
  .layout-main {
    padding: 10px;
  }
}
</style> 