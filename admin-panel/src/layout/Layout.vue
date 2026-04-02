<template>
  <div class="bg-background text-on-background min-h-screen">
    <!-- SideNavBar -->
    <aside class="fixed left-0 top-0 h-full w-64 bg-[#f4fafe] flex flex-col p-4 gap-2 z-50 border-r border-outline-variant/10">
      <div class="flex items-center gap-3 px-4 py-6 mb-4 shrink-0">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#944a00] to-[#e67e22] flex items-center justify-center text-white">
          <span class="material-symbols-outlined" style='font-variation-settings: "FILL" 1;'>pets</span>
        </div>
        <div>
          <h1 class="text-2xl font-black bg-gradient-to-br from-[#944a00] to-[#e67e22] bg-clip-text text-transparent leading-none">爱宠家</h1>
          <p class="text-xs text-on-surface-variant/70 mt-1">社区管理门户</p>
        </div>
      </div>
      <nav class="flex flex-col gap-1 flex-1 overflow-y-auto sidebar-scroll pr-2">
        <!-- Dashboard -->
        <router-link 
          to="/dashboard" 
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform hover:scale-[1.02] active:scale-98 duration-150"
          :class="route.path === '/dashboard' ? 'bg-gradient-to-r from-[#944a00] to-[#e67e22] text-white shadow-sm' : 'text-[#564337] hover:bg-[#eff4f8]'"
        >
          <span class="material-symbols-outlined">dashboard</span>
          <span class="font-medium">数据看板</span>
        </router-link>
        
        <!-- User Management -->
        <router-link 
          to="/users" 
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform hover:scale-[1.02] active:scale-98 duration-150"
          :class="route.path.startsWith('/users') ? 'bg-gradient-to-r from-[#944a00] to-[#e67e22] text-white shadow-sm' : 'text-[#564337] hover:bg-[#eff4f8]'"
        >
          <span class="material-symbols-outlined">group</span>
          <span class="font-medium">用户管理</span>
        </router-link>

        <!-- Content Management -->
        <div class="flex flex-col gap-1">
          <div 
            class="flex items-center gap-3 px-4 py-3 text-[#564337] hover:bg-[#eff4f8] rounded-xl transition-transform hover:scale-[1.02] active:scale-98 duration-150 cursor-pointer"
            @click="contentMenuOpen = !contentMenuOpen"
          >
            <span class="material-symbols-outlined">description</span>
            <span class="font-medium" :class="{ 'text-primary': route.path.includes('/posts') || route.path.includes('/comments') }">内容管理</span>
            <span class="material-symbols-outlined ml-auto text-sm transition-transform duration-200" :class="{ 'rotate-180': contentMenuOpen }">expand_more</span>
          </div>
          <div v-show="contentMenuOpen" class="flex flex-col gap-1 ml-9 border-l border-outline-variant/30 pl-3">
            <router-link to="/posts" class="py-2 text-sm transition-colors" :class="route.path === '/posts' ? 'text-primary font-bold' : 'text-[#564337]/80 hover:text-primary'">帖子管理</router-link>
            <router-link to="/comments" class="py-2 text-sm transition-colors" :class="route.path === '/comments' ? 'text-primary font-bold' : 'text-[#564337]/80 hover:text-primary'">评论管理</router-link>
          </div>
        </div>

        <!-- Store Management -->
        <div class="flex flex-col gap-1">
          <div 
            class="flex items-center gap-3 px-4 py-3 text-[#564337] hover:bg-[#eff4f8] rounded-xl transition-transform hover:scale-[1.02] active:scale-98 duration-150 cursor-pointer"
            @click="storeMenuOpen = !storeMenuOpen"
          >
            <span class="material-symbols-outlined">storefront</span>
            <span class="font-medium" :class="{ 'text-primary': route.path.includes('/products') || route.path.includes('/orders') }">商城管理</span>
            <span class="material-symbols-outlined ml-auto text-sm transition-transform duration-200" :class="{ 'rotate-180': storeMenuOpen }">expand_more</span>
          </div>
          <div v-show="storeMenuOpen" class="flex flex-col gap-1 ml-9 border-l border-outline-variant/30 pl-3">
            <router-link to="/products" class="py-2 text-sm transition-colors" :class="route.path === '/products' ? 'text-primary font-bold' : 'text-[#564337]/80 hover:text-primary'">商品管理</router-link>
            <router-link to="/orders" class="py-2 text-sm transition-colors" :class="route.path === '/orders' ? 'text-primary font-bold' : 'text-[#564337]/80 hover:text-primary'">订单管理</router-link>
          </div>
        </div>

        <!-- Service Management -->
        <div class="flex flex-col gap-1">
          <div 
            class="flex items-center gap-3 px-4 py-3 text-[#564337] hover:bg-[#eff4f8] rounded-xl transition-transform hover:scale-[1.02] active:scale-98 duration-150 cursor-pointer"
            @click="serviceMenuOpen = !serviceMenuOpen"
          >
            <span class="material-symbols-outlined">medical_services</span>
            <span class="font-medium" :class="{ 'text-primary': route.path.includes('/appointments') }">服务管理</span>
            <span class="material-symbols-outlined ml-auto text-sm transition-transform duration-200" :class="{ 'rotate-180': serviceMenuOpen }">expand_more</span>
          </div>
          <div v-show="serviceMenuOpen" class="flex flex-col gap-1 ml-9 border-l border-outline-variant/30 pl-3">
            <router-link to="/appointments" class="py-2 text-sm transition-colors" :class="route.path === '/appointments' ? 'text-primary font-bold' : 'text-[#564337]/80 hover:text-primary'">预约管理</router-link>
          </div>
        </div>

        <!-- System Settings -->
        <div class="flex flex-col gap-1">
          <div 
            class="flex items-center gap-3 px-4 py-3 text-[#564337] hover:bg-[#eff4f8] rounded-xl transition-transform hover:scale-[1.02] active:scale-98 duration-150 cursor-pointer"
            @click="systemMenuOpen = !systemMenuOpen"
          >
            <span class="material-symbols-outlined">settings</span>
            <span class="font-medium" :class="{ 'text-primary': route.path.includes('/system') }">系统设置</span>
            <span class="material-symbols-outlined ml-auto text-sm transition-transform duration-200" :class="{ 'rotate-180': systemMenuOpen }">expand_more</span>
          </div>
          <div v-show="systemMenuOpen" class="flex flex-col gap-1 ml-9 border-l border-outline-variant/30 pl-3">
            <router-link to="/system/admins" class="py-2 text-sm transition-colors" :class="route.path === '/system/admins' ? 'text-primary font-bold' : 'text-[#564337]/80 hover:text-primary'">管理员账号</router-link>
            <router-link to="/system/logs" class="py-2 text-sm transition-colors" :class="route.path === '/system/logs' ? 'text-primary font-bold' : 'text-[#564337]/80 hover:text-primary'">操作日志</router-link>
          </div>
        </div>
      </nav>

      <div class="mt-auto p-4 bg-surface-container-low rounded-xl shrink-0">
        <div class="flex items-center gap-3 mb-3">
          <img alt="Admin" class="w-10 h-10 rounded-full bg-white object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDVx8-nnebgD57B6CL10HZbymdP_ggMeNIAf-YsMfXpR33oqmJKn1sDJrPpXTPmUZGf0mks_Figmbsgs0CQH4NiG2c6sWoAZZt14adP3g8E-FBw-bMoE1HCVOeTWPgL8GLSiDpM3ZSJ5iyYMfoQej30-RQKXmbdyoclIySzOf5qYKxFNSUEi0OWRBH05GNJwxCmDGopNTxRIva9TRXz41ck8YJ9alwqsr_Xx_JyhQx-uBdMXlxT54oOaduk2ejdWTjHHoy-ABzuqRE"/>
          <div class="overflow-hidden">
            <p class="text-sm font-bold text-on-surface truncate">{{ adminName }}</p>
            <p class="text-xs text-on-surface-variant flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              在线
            </p>
          </div>
        </div>
        <button @click="handleLogout" class="w-full py-2 text-xs font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors">退出登录</button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="ml-64 min-h-screen flex flex-col bg-surface-container-lowest">
      <!-- TopNavBar -->
      <header class="sticky top-0 z-40 bg-surface-container-lowest/80 backdrop-blur-md px-8 py-4 flex justify-between items-center shadow-[0px_8px_24px_rgba(86,67,55,0.08)]">
        <div class="flex items-center bg-surface-container-highest px-4 py-2 rounded-xl w-96">
          <span class="material-symbols-outlined text-on-surface-variant text-sm">search</span>
          <input class="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-on-surface-variant/50 outline-none" placeholder="搜索订单、用户或文章..." type="text"/>
        </div>
        <div class="flex items-center gap-4">
          <button class="w-10 h-10 flex items-center justify-center text-[#564337] hover:bg-[#dde3e7] rounded-xl transition-colors active:scale-95">
            <span class="material-symbols-outlined">notifications</span>
          </button>
          <div class="h-8 w-[1px] bg-outline-variant/30"></div>
          <div class="flex items-center gap-3 pl-2">
            <span class="text-sm font-medium text-on-surface-variant">{{ currentDate }}</span>
          </div>
        </div>
      </header>

      <!-- Router View -->
      <div class="flex-1">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const route = useRoute()
const adminName = ref('超级管理员')

const contentMenuOpen = ref(true)
const storeMenuOpen = ref(true)
const serviceMenuOpen = ref(true)
const systemMenuOpen = ref(true)

const currentDate = ref('')

onMounted(() => {
  const info = localStorage.getItem('admin_info')
  if (info) {
    try {
      const parsed = JSON.parse(info)
      adminName.value = parsed.name || parsed.username || '超级管理员'
    } catch (e) {}
  }
  
  const date = new Date()
  currentDate.value = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
})

const handleLogout = async () => {
  try {
    await axios.post('/api/v1/admin/auth/logout', {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
    })
  } catch (e) {}
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_info')
  router.push('/login')
}
</script>
