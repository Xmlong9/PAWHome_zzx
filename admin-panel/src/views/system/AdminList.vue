<template>
  <div class="p-8 max-w-7xl mx-auto">
    <!-- Editorial Header Section -->
    <div class="flex justify-between items-end mb-10">
      <div>
        <h1 class="text-4xl font-extrabold text-primary tracking-tight mb-2">管理员角色矩阵</h1>
        <p class="text-on-surface-variant max-w-md leading-relaxed">
          通过精细化的权限分配，确保爱宠家社区运营的高效与安全。您可以在此管理所有的核心团队成员。
        </p>
      </div>
      <button class="bg-gradient-to-r from-[#944a00] to-[#e67e22] text-white px-6 py-3 rounded-xl shadow-lg shadow-orange-200/50 flex items-center gap-2 font-bold hover:scale-105 active:scale-95 transition-all">
        <span class="material-symbols-outlined" data-icon="add">add</span>
        添加管理员
      </button>
    </div>

    <!-- Dashboard Stats Bento (Small) -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex items-center gap-5">
        <div class="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
          <span class="material-symbols-outlined" data-icon="group">group</span>
        </div>
        <div>
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">总计账号</p>
          <p class="text-2xl font-black text-on-surface">{{ total }} <span class="text-sm font-normal text-slate-400">位</span></p>
        </div>
      </div>
      <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex items-center gap-5">
        <div class="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
          <span class="material-symbols-outlined" data-icon="check_circle">check_circle</span>
        </div>
        <div>
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">活跃状态</p>
          <p class="text-2xl font-black text-on-surface">{{ activeCount }} <span class="text-sm font-normal text-slate-400">位</span></p>
        </div>
      </div>
      <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex items-center gap-5 border border-orange-100/50">
        <div class="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-700">
          <span class="material-symbols-outlined" data-icon="shield">shield</span>
        </div>
        <div>
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">角色分组</p>
          <p class="text-2xl font-black text-on-surface">{{ roleGroupCount }} <span class="text-sm font-normal text-slate-400">组</span></p>
        </div>
      </div>
    </div>

    <!-- Table Container (Editorial Style) -->
    <div class="bg-surface-container-lowest rounded-xl shadow-[0_8px_24px_rgba(86,67,55,0.04)] overflow-hidden">
      <div class="p-6 flex items-center justify-between">
        <div class="flex gap-4 items-center">
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-sm" data-icon="search">search</span>
            <input class="pl-10 pr-4 py-2 bg-surface-container-highest border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/40 w-64 transition-all" placeholder="搜索姓名或账号..." type="text"/>
          </div>
          <select class="bg-surface-container-highest border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/40 px-4 py-2 pr-10">
            <option>所有角色</option>
            <option>超级管理员</option>
            <option>客服</option>
            <option>内容运营</option>
            <option>商城管理员</option>
          </select>
        </div>
        <div class="flex gap-2">
          <button class="p-2 text-slate-400 hover:text-primary transition-colors">
            <span class="material-symbols-outlined" data-icon="filter_list">filter_list</span>
          </button>
          <button class="p-2 text-slate-400 hover:text-primary transition-colors">
            <span class="material-symbols-outlined" data-icon="file_download">file_download</span>
          </button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-surface-container-low/50">
              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">姓名 &amp; 账号</th>
              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">手机号</th>
              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">所属角色</th>
              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">最后登录</th>
              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">状态</th>
              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="a in admins" :key="a.id" class="hover:bg-slate-50/50 transition-colors group">
              <td class="px-6 py-5">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{{ initials(a.name) }}</div>
                  <div>
                    <div class="max-w-[14rem]">
                      <p class="text-sm font-bold text-on-surface truncate whitespace-nowrap">{{ a.name }}</p>
                      <p class="text-xs text-slate-400 truncate whitespace-nowrap">{{ a.username }}</p>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-5 text-sm font-medium text-on-surface-variant">{{ a.phone || '-' }}</td>
              <td class="px-6 py-5">
                <span class="px-3 py-1 rounded-full text-[11px] font-bold" :class="roleClass(a.role.id)">{{ a.role.name }}</span>
              </td>
              <td class="px-6 py-5 text-sm text-slate-400">{{ formatDateTime(a.lastLoginAt) || '-' }}</td>
              <td class="px-6 py-5">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" :class="a.status === 'active' ? 'bg-green-500' : 'bg-slate-300'"></span>
                  <span class="text-sm font-medium" :class="a.status === 'active' ? 'text-on-surface' : 'text-slate-400'">{{ a.status === 'active' ? '正常' : '禁用' }}</span>
                </div>
              </td>
              <td class="px-6 py-5 text-right">
                <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button class="p-2 hover:bg-orange-50 text-slate-400 hover:text-orange-600 rounded-lg transition-colors" title="权限分配">
                    <span class="material-symbols-outlined text-xl" data-icon="key">key</span>
                  </button>
                  <button class="p-2 hover:bg-orange-50 text-slate-400 hover:text-orange-600 rounded-lg transition-colors" title="编辑">
                    <span class="material-symbols-outlined text-xl" data-icon="edit">edit</span>
                  </button>
                  <button class="p-2 hover:bg-error-container/20 text-slate-400 hover:text-error rounded-lg transition-colors" title="删除">
                    <span class="material-symbols-outlined text-xl" data-icon="delete">delete</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && admins.length === 0" class="bg-surface-container-lowest">
              <td colspan="6" class="px-6 py-10 text-center text-sm text-on-surface-variant">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="px-6 py-4 flex items-center justify-between border-t border-slate-50">
        <p class="text-xs text-slate-400 font-medium">显示 {{ start }} 到 {{ end }}，共 {{ total }} 条记录</p>
        <div class="flex gap-1">
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-40 disabled:hover:bg-transparent"
            :disabled="page <= 1"
            @click="goPage(page - 1)"
          >
            <span class="material-symbols-outlined text-lg" data-icon="chevron_left">chevron_left</span>
          </button>
          <button
            v-for="p in pageItems"
            :key="p"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold"
            :class="p === page ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-600'"
            @click="goPage(p)"
          >
            {{ p }}
          </button>
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-40 disabled:hover:bg-transparent"
            :disabled="page >= totalPages"
            @click="goPage(page + 1)"
          >
            <span class="material-symbols-outlined text-lg" data-icon="chevron_right">chevron_right</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Permission Insight Card (Asymmetric Layout) -->
    <div class="mt-12 grid grid-cols-1 lg:grid-cols-5 gap-8">
      <div class="lg:col-span-3 bg-tertiary-container/10 p-8 rounded-[1.5rem] relative overflow-hidden">
        <div class="relative z-10">
          <h3 class="text-xl font-black text-on-tertiary-container mb-4">关于权限分配的温馨提示</h3>
          <p class="text-on-tertiary-container/80 text-sm leading-relaxed mb-6">
            超级管理员拥有最高系统权限，请谨慎分配该角色。客服人员仅能查看订单与处理聊天对话。内容运营可管理社区发帖与评论。商城管理员专注于库存与发货流程。
          </p>
          <div class="flex gap-4">
            <button class="text-xs font-bold text-on-tertiary-container underline decoration-2 underline-offset-4">查看完整权限说明文档</button>
          </div>
        </div>
        <div class="absolute -right-8 -bottom-8 opacity-10">
          <span class="material-symbols-outlined text-[160px]" data-icon="pets">pets</span>
        </div>
      </div>
      <div class="lg:col-span-2 bg-secondary-container p-8 rounded-[1.5rem] flex flex-col justify-center">
        <div class="flex items-start gap-4 mb-4">
          <span class="material-symbols-outlined text-secondary text-4xl" data-icon="security">security</span>
          <div>
            <h4 class="font-bold text-on-secondary-container">安全合规性</h4>
            <p class="text-xs text-on-secondary-container/70 mt-1">系统已启用动态审计，所有管理员的操作都将被记录在日志中以备核查。</p>
          </div>
        </div>
        <div class="w-full h-1 bg-white/30 rounded-full overflow-hidden">
          <div class="w-3/4 h-full bg-secondary"></div>
        </div>
        <p class="text-[10px] font-bold text-secondary mt-2 text-right">已通过安全等级二级认证</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { formatDateTime } from '@/utils/format'

type AdminItem = {
  id: number
  username: string
  name: string
  phone: string | null
  role: { id: string; name: string }
  status: string
  lastLoginAt: string | null
}

const loading = ref(false)
const admins = ref<AdminItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const pageItems = computed(() => {
  const tp = totalPages.value
  const cur = page.value
  if (tp <= 5) return Array.from({ length: tp }, (_, i) => i + 1)
  if (cur <= 3) return [1, 2, 3, 4, tp]
  if (cur >= tp - 2) return [1, tp - 3, tp - 2, tp - 1, tp]
  return [1, cur - 1, cur, cur + 1, tp]
})

const start = computed(() => {
  if (total.value === 0) return 0
  return (page.value - 1) * pageSize.value + 1
})

const end = computed(() => {
  if (total.value === 0) return 0
  return Math.min(total.value, page.value * pageSize.value)
})

const activeCount = computed(() => admins.value.filter((a) => a.status === 'active').length)
const roleGroupCount = computed(() => new Set(admins.value.map((a) => a.role?.id)).size)

function initials(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return 'A'
  const parts = trimmed.split(/\s+/g)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return trimmed.slice(0, 2).toUpperCase()
}

function roleClass(roleId: string) {
  if (roleId === 'super_admin') return 'bg-orange-100 text-orange-700'
  return 'bg-slate-100 text-slate-600'
}

async function load() {
  loading.value = true
  try {
    const res = await axios.get('/api/v1/admin/system/admins', { params: { page: page.value, pageSize: pageSize.value } })
    if (res.data?.ok || res.data?.code === 0) {
      admins.value = res.data.data.items
      total.value = res.data.data.total
    }
  } finally {
    loading.value = false
  }
}

async function goPage(next: number) {
  const p = Math.min(Math.max(1, next), totalPages.value)
  if (p === page.value) return
  page.value = p
  await load()
}

onMounted(load)
</script>

<style scoped>
</style>
