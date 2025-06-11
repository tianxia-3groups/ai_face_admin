import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

import App from './App.vue'
import router from './router'
import socketService from './utils/socket'
import './assets/styles/main.css'

const app = createApp(App)

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 提供Socket.IO服务给全局使用
app.provide('$socket', socketService)

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus, {
  locale: zhCn,
})

// 在应用挂载后初始化认证状态检查
app.mount('#app')

// 检查认证状态
import { useAuthStore } from './store/auth'
const authStore = useAuthStore()

// 静默检查认证状态，不显示错误消息
authStore.checkAuthStatus().then(() => {
  console.log('认证状态检查完成', { isLoggedIn: authStore.isLoggedIn, user: authStore.user })
}).catch((error) => {
  console.warn('认证状态检查失败，使用本地缓存状态', error)
})

// 初始化Socket.IO连接
socketService.connect() 