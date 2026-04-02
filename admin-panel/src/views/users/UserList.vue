<template>
  <div class="p-8 relative min-h-full">
    <!-- Header Section -->
    <div class="mb-8 flex justify-between items-end">
      <div>
        <h2 class="text-3xl font-extrabold text-primary tracking-tight">用户管理</h2>
        <div class="flex items-center gap-2 mt-2">
          <span class="px-2.5 py-0.5 rounded-full bg-tertiary-container/10 text-tertiary text-xs font-bold border border-tertiary-container/20">
            系统总注册用户: {{ total }}
          </span>
          <span class="text-on-surface-variant text-sm flex items-center gap-1">
            <span class="material-symbols-outlined text-xs">calendar_today</span>
            实时数据
          </span>
        </div>
      </div>
      <button class="bg-gradient-to-br from-primary to-primary-container text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-[0px_8px_24px_rgba(148,74,0,0.15)] hover:scale-[1.02] active:scale-95 transition-all">
        <span class="material-symbols-outlined">person_add</span>
        新增用户
      </button>
    </div>

    <!-- Bento Stats Grid -->
    <div class="grid grid-cols-4 gap-6 mb-8">
      <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-none flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-[#eff4f8] flex items-center justify-center text-primary">
          <span class="material-symbols-outlined">trending_up</span>
        </div>
        <div>
          <p class="text-xs text-on-surface-variant font-medium">今日新增</p>
          <p class="text-2xl font-black text-on-surface">{{ todayNewText }}</p>
        </div>
      </div>
      <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-none flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-[#eff4f8] flex items-center justify-center text-secondary">
          <span class="material-symbols-outlined">verified_user</span>
        </div>
        <div>
          <p class="text-xs text-on-surface-variant font-medium">活跃用户</p>
          <p class="text-2xl font-black text-on-surface">—</p>
        </div>
      </div>
      <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-none flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-[#eff4f8] flex items-center justify-center text-tertiary">
          <span class="material-symbols-outlined">pets</span>
        </div>
        <div>
          <p class="text-xs text-on-surface-variant font-medium">认证宠主</p>
          <p class="text-2xl font-black text-on-surface">—</p>
        </div>
      </div>
      <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-none flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-error-container/20 flex items-center justify-center text-error">
          <span class="material-symbols-outlined">block</span>
        </div>
        <div>
          <p class="text-xs text-on-surface-variant font-medium">已封禁</p>
          <p class="text-2xl font-black text-on-surface">—</p>
        </div>
      </div>
    </div>

    <!-- Table Container -->
    <div class="bg-surface-container-low rounded-xl shadow-[0px_8px_24px_rgba(86,67,55,0.08)] overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-surface-container-high/50">
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">ID (UUID)</th>
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">用户头像</th>
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">用户昵称</th>
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">手机号</th>
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-center">性别</th>
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">注册时间</th>
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">状态</th>
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/10">
            <tr v-for="u in users" :key="u.id" class="bg-surface-container-lowest hover:bg-surface-container/50 transition-colors">
              <td class="px-6 py-4 text-xs font-mono text-on-surface-variant">{{ u.id.slice(0, 18) }}</td>
              <td class="px-6 py-4">
                <img :alt="u.nickname" class="w-10 h-10 rounded-xl bg-surface-container-high object-cover" :src="u.avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDVx8-nnebgD57B6CL10HZbymdP_ggMeNIAf-YsMfXpR33oqmJKn1sDJrPpXTPmUZGf0mks_Figmbsgs0CQH4NiG2c6sWoAZZt14adP3g8E-FBw-bMoE1HCVOeTWPgL8GLSiDpM3ZSJ5iyYMfoQej30-RQKXmbdyoclIySzOf5qYKxFNSUEi0OWRBH05GNJwxCmDGopNTxRIva9TRXz41ck8YJ9alwqsr_Xx_JyhQx-uBdMXlxT54oOaduk2ejdWTjHHoy-ABzuqRE'"/>
              </td>
              <td class="px-6 py-4">
                <span class="font-bold text-on-surface">{{ u.nickname }}</span>
              </td>
              <td class="px-6 py-4 text-sm text-on-surface-variant">{{ u.phoneMasked }}</td>
              <td class="px-6 py-4 text-center">
                <span v-if="u.gender === 'female'" class="material-symbols-outlined text-sm text-pink-400">female</span>
                <span v-else-if="u.gender === 'male'" class="material-symbols-outlined text-sm text-blue-400">male</span>
                <span v-else class="material-symbols-outlined text-sm text-on-surface-variant">help</span>
              </td>
              <td class="px-6 py-4 text-sm text-on-surface-variant">{{ formatDateTime(u.registeredAt) }}</td>
              <td class="px-6 py-4">
                <span v-if="u.status === 'active'" class="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">正常</span>
                <span v-else class="px-3 py-1 rounded-full bg-error-container text-error text-xs font-bold">封禁</span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                  <button class="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors">
                    <span class="material-symbols-outlined text-xl">edit</span>
                  </button>
                  <button class="p-2 rounded-lg text-error hover:bg-error/10 transition-colors">
                    <span class="material-symbols-outlined text-xl">block</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && users.length === 0" class="bg-surface-container-lowest">
              <td colspan="8" class="px-6 py-10 text-center text-sm text-on-surface-variant">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Pagination -->
      <div class="px-6 py-4 bg-surface-container-high/30 flex items-center justify-between">
        <span class="text-xs text-on-surface-variant font-medium">显示 {{ start }}-{{ end }} 条，共 {{ total }} 条用户</span>
        <div class="flex items-center gap-1">
          <button class="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-white transition-colors">
            <span class="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          <button class="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs">1</button>
          <button class="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-white transition-colors text-xs font-bold">2</button>
          <button class="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-white transition-colors">
            <span class="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Organic Graphic Element (Editorial Asymmetry) -->
    <div class="fixed -bottom-12 -right-12 w-64 h-64 bg-primary-fixed-dim/20 rounded-full blur-3xl -z-10"></div>
    <div class="fixed top-1/2 -right-20 w-40 h-40 bg-tertiary-fixed-dim/10 rounded-full blur-2xl -z-10"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { formatDateTime } from '@/utils/format'

type UserItem = {
  id: string
  nickname: string
  phoneMasked: string
  gender: string
  avatarUrl: string | null
  status: string
  registeredAt: string
}

const loading = ref(false)
const users = ref<UserItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const todayNew = ref<number | null>(null)

const todayNewText = computed(() => (todayNew.value === null ? '—' : String(todayNew.value)))

const start = computed(() => {
  if (total.value === 0) return 0
  return (page.value - 1) * pageSize.value + 1
})

const end = computed(() => {
  if (total.value === 0) return 0
  return Math.min(total.value, page.value * pageSize.value)
})

async function load() {
  loading.value = true
  try {
    const [u, s] = await Promise.all([
      axios.get('/api/v1/admin/users', { params: { page: page.value, pageSize: pageSize.value } }),
      axios.get('/api/v1/admin/dashboard/stats')
    ])

    if (u.data?.ok || u.data?.code === 0) {
      users.value = u.data.data.items
      total.value = u.data.data.total
    }
    if (s.data?.ok || s.data?.code === 0) {
      todayNew.value = s.data.data?.users?.today ?? null
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
</style>
