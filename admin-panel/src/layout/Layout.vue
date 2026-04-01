<template>
  <el-container class="layout-container" :class="{ 'is-dark': isDark }">
    <el-aside width="240px" class="aside">
      <div class="logo">
        <span class="logo-text">爱宠家管理后台</span>
      </div>
      <el-menu
        :default-active="$route.path"
        class="el-menu-vertical"
        background-color="#0f172a"
        text-color="#94a3b8"
        active-text-color="#38bdf8"
        router
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataLine /></el-icon>
          <span>数据看板</span>
        </el-menu-item>
        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-sub-menu index="/content">
          <template #title>
            <el-icon><Document /></el-icon>
            <span>内容管理</span>
          </template>
          <el-menu-item index="/posts">帖子管理</el-menu-item>
          <el-menu-item index="/comments">评论管理</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="/shop">
          <template #title>
            <el-icon><Goods /></el-icon>
            <span>商城管理</span>
          </template>
          <el-menu-item index="/products">商品管理</el-menu-item>
          <el-menu-item index="/orders">订单管理</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="/services">
          <template #title>
            <el-icon><Service /></el-icon>
            <span>服务管理</span>
          </template>
          <el-menu-item index="/appointments">预约管理</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="/system">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </template>
          <el-menu-item index="/system/admins">管理员账号</el-menu-item>
          <el-menu-item index="/system/logs">操作日志</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-right">
          <el-switch
            v-model="isDark"
            class="theme-switch"
            inline-prompt
            active-icon="Moon"
            inactive-icon="Sunny"
            @change="toggleTheme"
          />
          <span class="admin-name">{{ adminName }}</span>
          <el-button type="danger" size="small" @click="handleLogout">退出登录</el-button>
        </div>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useDark, useToggle } from '@vueuse/core'

const isDark = useDark()
const toggleTheme = useToggle(isDark)

const router = useRouter()
const route = useRoute()
const adminName = ref('Admin')

onMounted(() => {
  const info = localStorage.getItem('admin_info')
  if (info) {
    try {
      const parsed = JSON.parse(info)
      adminName.value = parsed.name || parsed.username || 'Admin'
    } catch (e) {}
  }
})

const handleLogout = async () => {
  try {
    await axios.post('/api/v1/admin/auth/logout', {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
    })
  } catch (e) {}
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_info')
  ElMessage.success('Logged out successfully')
  router.push('/login')
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}
.aside {
  background-color: #0f172a;
  color: white;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  box-shadow: 2px 0 8px 0 rgba(29, 35, 41, 0.05);
  z-index: 10;
}
.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0f172a;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.logo-text {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.5px;
}
.el-menu-vertical {
  border-right: none;
  flex: 1;
  padding-top: 16px;
}
:deep(.el-menu-item), :deep(.el-sub-menu__title) {
  margin: 4px 12px;
  border-radius: 8px;
  height: 44px;
  line-height: 44px;
}
:deep(.el-menu-item.is-active) {
  background-color: rgba(56, 189, 248, 0.1) !important;
  color: #38bdf8 !important;
  font-weight: 600;
}
:deep(.el-menu-item:hover), :deep(.el-sub-menu__title:hover) {
  background-color: rgba(255,255,255,0.05) !important;
}
.header {
  background-color: var(--el-bg-color);
  box-shadow: 0 1px 4px rgba(0,21,41,0.08);
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0 24px;
  height: 64px;
  border-bottom: none;
  z-index: 9;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}
.theme-switch {
  --el-switch-on-color: #334155;
  --el-switch-off-color: #e2e8f0;
}
.admin-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.admin-name::before {
  content: '';
  display: inline-block;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  border: 1px solid #e2e8f0;
}
html.dark .admin-name::before {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border-color: #475569;
}
.main {
  background-color: #f1f5f9;
  padding: 24px;
  transition: background-color 0.3s;
}

/* 覆盖 Element Plus 默认样式以支持暗黑模式的无缝切换 */
html.dark .header {
  background-color: #1e293b;
  box-shadow: 0 1px 4px rgba(0,0,0,0.5);
}
html.dark .main {
  background-color: #0f172a;
}
</style>