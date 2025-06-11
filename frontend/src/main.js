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

app.use(createPinia())
app.use(router)
app.use(ElementPlus, {
  locale: zhCn,
})

// 在应用挂载后初始化Socket.IO连接
app.mount('#app')

// 初始化Socket.IO连接
socketService.connect() 