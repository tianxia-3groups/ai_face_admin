import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/workflow/:pathMatch(.*)*',
    redirect: to => `/workflows/${to.params.pathMatch}`
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/components/Layout/MainLayout.vue'),
    meta: { requiresAuth: true },
    redirect: '/dashboard',
    children: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '仪表板' }
      },
      {
        path: '/workflows',
        name: 'WorkflowCenter',
        component: () => import('@/views/WorkflowCenter.vue'),
        meta: { title: '流程中心' }
      },
      {
        path: '/workflows/create',
        name: 'WorkflowCreate',
        component: () => import('@/views/WorkflowCreate.vue'),
        meta: { title: '创建流程' }
      },
      {
        path: '/workflows/:id',
        name: 'WorkflowDetail',
        component: () => import('@/views/WorkflowDetail.vue'),
        meta: { title: '流程详情' },
        props: true
      },
      {
        path: '/materials/:workflowId',
        name: 'Materials',
        component: () => import('@/views/Materials.vue'),
        meta: { title: '素材管理' },
        props: true
      },
      {
        path: '/training/:workflowId',
        name: 'Training',
        component: () => import('@/views/Training.vue'),
        meta: { title: '训练管理' },
        props: true
      },
      {
        path: '/upload-queue',
        name: 'UploadQueue',
        component: () => import('@/views/UploadQueue.vue'),
        meta: { title: '上传队列' }
      },
      {
        path: '/settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
        meta: { title: '系统设置' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  // 避免死循环检查
  if (from.path === to.path) {
    next()
    return
  }

  const authStore = useAuthStore()
  
  // 如果是首次访问需要认证的页面，先检查认证状态
  if (to.meta.requiresAuth && !authStore.isLoggedIn && from.name === undefined) {
    try {
      await authStore.checkAuthStatus()
    } catch (error) {
      console.warn('路由守卫中认证检查失败', error)
    }
  }
  
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next('/login')
  } else if (to.meta.requiresGuest && authStore.isLoggedIn) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router 