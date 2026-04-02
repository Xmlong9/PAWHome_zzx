<template>
  <el-config-provider :builtin-theme="isDark ? 'dark' : 'light'">
    <router-view />
  </el-config-provider>
</template>

<script setup lang="ts">
import { useDark } from '@vueuse/core'
import { watchEffect } from 'vue'

const isDark = useDark()

watchEffect(() => {
  document.documentElement.className = isDark.value ? 'dark' : ''
})
</script>

<style>
/* 全局样式覆盖，移除默认 margin */
html, body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100vh;
  width: 100vw;
}

/* Element Plus Dark Mode Overrides */
html.dark {
  --el-bg-color: #1e293b;
  --el-bg-color-page: #0f172a;
  --el-bg-color-overlay: #1e293b;
  --el-text-color-primary: #f8fafc;
  --el-text-color-regular: #cbd5e1;
  --el-text-color-secondary: #94a3b8;
  --el-border-color: rgba(255,255,255,0.1);
  --el-border-color-light: rgba(255,255,255,0.05);
  --el-border-color-lighter: rgba(255,255,255,0.02);
  --el-fill-color-blank: transparent;
}

/* 优化 Element Plus 的一些基础配色 */
:root {
  --el-color-primary: #38bdf8;
  --el-color-primary-light-3: #7dd3fc;
  --el-color-primary-light-5: #bae6fd;
  --el-color-primary-light-7: #e0f2fe;
  --el-color-primary-light-8: #f0f9ff;
  --el-color-primary-light-9: #f8fafc;
  --el-color-primary-dark-2: #0284c7;
}

/* 隐藏滚动条但保留滚动功能 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.4);
  border-radius: 3px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
</style>