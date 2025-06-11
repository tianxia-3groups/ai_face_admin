// Vite配置文件
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // 设置根目录为public
  root: './public',
  
  // 服务器配置
  server: {
    port: 5173,
    host: true,
    proxy: {
      // 代理API请求到后端服务器
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true
      }
    }
  },
  
  // 构建配置
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html')
      }
    }
  },
  
  // 解析配置
  resolve: {
    alias: {
      '@': resolve(__dirname, 'public')
    }
  },
  
  // 插件配置
  plugins: [],
  
  // 开发工具
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false
  }
}); 