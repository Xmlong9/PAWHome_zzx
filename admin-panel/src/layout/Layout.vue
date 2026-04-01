<template>
  <el-container class="layout-container" :class="{ 'is-dark': isDark }">
    <el-aside width="200px" class="aside">
      <div class="logo">爱宠家管理后台</div>
      <el-menu
        :default-active="$route.path"
        class="el-menu-vertical"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
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
}
.aside {
  background-color: #304156;
  color: white;
  display: flex;
  flex-direction: column;
}
.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  font-size: 20px;
  font-weight: bold;
  background-color: #2b3643;
}
.el-menu-vertical {
  border-right: none;
  flex: 1;
}
.header {
  background-color: var(--el-bg-color);
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid var(--el-border-color-light);
}
.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}
.theme-switch {
  margin-right: 10px;
}
.admin-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
}
.main {
  background-color: var(--el-bg-color-page);
  padding: 20px;
  transition: background-color 0.3s;
}

/* 覆盖 Element Plus 默认样式以支持暗黑模式的无缝切换 */
html.dark .header {
  background-color: #141414;
  box-shadow: 0 1px 4px rgba(0,0,0,0.5);
  border-bottom: 1px solid #333;
}
html.dark .main {
  background-color: #000000;
}
</style>