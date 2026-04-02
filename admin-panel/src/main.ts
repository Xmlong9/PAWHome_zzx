import { createApp } from 'vue'
import './style.css'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import axios from 'axios'

const app = createApp(App)

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || ''
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers = config.headers || {}
    ;(config.headers as any).Authorization = `Bearer ${token}`
  }
  return config
})

axios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status
    if (status === 401) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_info')
      if (router.currentRoute.value.path !== '/login') {
        await router.push('/login')
      }
    }
    return Promise.reject(error)
  }
)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus)
app.use(createPinia())
app.use(router)

app.mount('#app')
