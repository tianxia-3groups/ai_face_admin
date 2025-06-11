import { request } from '@/utils/request'

export const authApi = {
  // 用户登录
  login: (credentials) => {
    return request.post('/api/auth/login', credentials)
  },

  // 用户登出
  logout: () => {
    return request.post('/api/auth/logout')
  },

  // 检查登录状态
  check: () => {
    return request.get('/api/auth/check')
  },

  // 获取当前用户信息
  me: () => {
    return request.get('/api/auth/me')
  }
} 