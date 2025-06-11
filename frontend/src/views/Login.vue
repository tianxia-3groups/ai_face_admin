<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">AI人脸训练管理系统</h1>
        <p class="login-subtitle">请登录您的账户</p>
      </div>
      
      <el-form
        :model="loginForm"
        :rules="loginRules"
        ref="loginFormRef"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="用户名"
            size="large"
            prefix-icon="User"
            clearable
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            size="large"
            prefix-icon="Lock"
            show-password
            clearable
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="authStore.loading"
            @click="handleLogin"
            class="login-button"
          >
            {{ authStore.loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-footer">
        <p class="copyright">© 2024 AI人脸训练管理系统. All rights reserved.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()

const loginFormRef = ref()
const loginForm = reactive({
  username: '',
  password: ''
})

const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度为 6 到 20 个字符', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      const success = await authStore.login(loginForm)
      if (success) {
        // 登录成功后跳转到仪表板
        await router.push('/dashboard')
      }
    }
  })
}

// 删除重复的登录检查，路由守卫已经处理了这个逻辑
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.login-header {
  text-align: center;
  padding: 40px 30px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.login-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.login-subtitle {
  font-size: 14px;
  opacity: 0.9;
  margin: 0;
}

.login-form {
  padding: 30px;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.login-button {
  width: 100%;
  height: 44px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
}

.login-footer {
  text-align: center;
  padding: 20px 30px 30px;
  border-top: 1px solid #f0f0f0;
}

.copyright {
  font-size: 12px;
  color: #999;
  margin: 0;
}

@media (max-width: 480px) {
  .login-container {
    padding: 10px;
  }
  
  .login-header {
    padding: 30px 20px 15px;
  }
  
  .login-title {
    font-size: 20px;
  }
  
  .login-form {
    padding: 20px;
  }
}
</style> 