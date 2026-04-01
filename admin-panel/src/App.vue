<template>
  <el-config-provider :builtin-theme="isDark ? 'dark' : 'light'">
    <router-view />
  </el-config-provider>
</template>

<script setup lang="ts">
import { useDark } from '@vueuse/core'

const isDark = useDark()
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* Element Plus Dark Mode Overrides */
html.dark {
  --el-bg-color: #141414;
  --el-bg-color-page: #000000;
  --el-bg-color-overlay: #1d1e1f;
  --el-text-color-primary: #E5EAF3;
  --el-text-color-regular: #CFD3DC;
  --el-text-color-secondary: #A3A6AD;
  --el-border-color: #4C4D4F;
  --el-border-color-light: #414243;
  --el-border-color-lighter: #363637;
  --el-fill-color-blank: transparent;
}
</style>