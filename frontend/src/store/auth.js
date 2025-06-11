import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '@/api/auth'
import { ElMessage } from 'element-plus'

export const useAuthStore = defineStore('auth', () => {
  // 安全地读取localStorage
  const getStoredToken = () => {
    try {
      return localStorage.getItem('token')
    } catch (error) {
      console.warn('无法读取token:', error)
      return null
    }
  }

  const getStoredUser = () => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.warn('无法读取用户信息:', error)
      return null
    }
  }

  // 状态
  const isLoggedIn = ref(!!getStoredToken())
  const user = ref(getStoredUser())
  const loading = ref(false)

  // 动作
  const login = async (credentials) => {
    try {
      loading.value = true
      const response = await authApi.login(credentials)
      
      if (response.success) {
        // 保存token和用户信息到localStorage
        localStorage.setItem('token', response.token)
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
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      isLoggedIn.value = false
      user.value = null
      ElMessage.success('已退出登录')
    }
  }

  const checkAuthStatus = async () => {
    try {
      const response = await authApi.check()
      isLoggedIn.value = response.isLoggedIn
      user.value = response.user
    } catch (error) {
      console.error('检查登录状态失败:', error)
      isLoggedIn.value = false
      user.value = null
    }
  }

  const getMe = async () => {
    try {
      const response = await authApi.me()
      user.value = response.user
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