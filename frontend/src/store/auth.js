import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '@/api/auth'
import { ElMessage } from 'element-plus'

export const useAuthStore = defineStore('auth', () => {
  // 安全地读取localStorage
  const getStoredUser = () => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.warn('无法读取用户信息:', error)
      return null
    }
  }

  // 状态 - 根据localStorage中的用户信息初始化登录状态
  const isLoggedIn = ref(!!getStoredUser())
  const user = ref(getStoredUser())
  const loading = ref(false)

  // 动作
  const login = async (credentials) => {
    try {
      loading.value = true
      const response = await authApi.login(credentials)
      
      if (response.success) {
        // 只保存用户信息到localStorage，不保存token
        localStorage.setItem('user', JSON.stringify(response.user))
        
        isLoggedIn.value = true
        user.value = response.user
        ElMessage.success('登录成功')
        return true
      }
      return false
    } catch (error) {
      ElMessage.error(error.message || '登录失败')
      return false
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('登出失败:', error)
    } finally {
      // 清除localStorage中的认证信息
      localStorage.removeItem('user')
      
      isLoggedIn.value = false
      user.value = null
      ElMessage.success('已退出登录')
    }
  }

  const checkAuthStatus = async () => {
    try {
      // 如果localStorage中有用户信息，先设置为已登录状态
      const storedUser = getStoredUser()
      if (storedUser) {
        isLoggedIn.value = true
        user.value = storedUser
      }
      
      // 向后端验证session是否有效
      const response = await authApi.check()
      isLoggedIn.value = response.isLoggedIn
      
      if (response.isLoggedIn && response.user) {
        user.value = response.user
        localStorage.setItem('user', JSON.stringify(response.user))
      } else {
        // session已失效，清除本地数据
        localStorage.removeItem('user')
        user.value = null
        isLoggedIn.value = false
      }
    } catch (error) {
      console.error('检查登录状态失败:', error)
      // 网络错误时，如果本地有用户信息就保持登录状态
      const storedUser = getStoredUser()
      if (storedUser) {
        isLoggedIn.value = true
        user.value = storedUser
        console.warn('网络错误，使用缓存的用户信息')
      } else {
        isLoggedIn.value = false
        user.value = null
        localStorage.removeItem('user')
      }
    }
  }

  const getMe = async () => {
    try {
      const response = await authApi.me()
      user.value = response.user
      localStorage.setItem('user', JSON.stringify(response.user))
      return response.user
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return null
    }
  }

  return {
    // 状态
    isLoggedIn,
    user,
    loading,
    
    // 动作
    login,
    logout,
    checkAuthStatus,
    getMe
  }
}) 