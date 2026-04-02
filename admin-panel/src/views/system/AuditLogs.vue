<template>
  <div class="p-8 max-w-7xl mx-auto">
    <!-- Header Section -->
    <div class="mb-8 flex justify-between items-end">
      <div>
        <nav class="flex items-center gap-2 text-on-surface-variant/60 text-xs mb-2">
          <span>系统设置</span>
          <span class="material-symbols-outlined text-[10px]" data-icon="chevron_right">chevron_right</span>
          <span class="text-orange-600 font-medium">操作日志</span>
        </nav>
        <h2 class="text-3xl font-black text-on-surface tracking-tight">操作日志 <span class="text-sm font-normal text-on-surface-variant/50 ml-2">Audit Trails</span></h2>
      </div>
      <div class="flex gap-3">
        <button class="px-5 py-2.5 rounded-xl bg-surface-container-low text-on-surface-variant font-semibold text-sm hover:bg-surface-container-high transition-colors flex items-center gap-2">
          <span class="material-symbols-outlined text-sm" data-icon="download">download</span>
          导出日志
        </button>
      </div>
    </div>

    <!-- Bento Filter Section -->
    <section class="grid grid-cols-12 gap-4 mb-8">
      <div class="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-orange-100/10">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="space-y-2">
            <label class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">管理员账号</label>
            <select class="w-full bg-surface-container-low border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-200">
              <option>全部账号</option>
              <option>Admin_01 (王小橘)</option>
              <option>Admin_02 (三花队长)</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">操作模块</label>
            <select class="w-full bg-surface-container-low border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-200">
              <option>全部模块</option>
              <option>宠物档案</option>
              <option>预约系统</option>
              <option>订单财务</option>
              <option>账户安全</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">操作时间</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" data-icon="calendar_month">calendar_month</span>
              <input class="w-full bg-surface-container-low border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-200" placeholder="选择日期范围" type="text"/>
            </div>
          </div>
        </div>
      </div>
      <div class="col-span-12 lg:col-span-4 bg-primary rounded-xl p-6 shadow-lg shadow-orange-200/50 flex flex-col justify-between relative overflow-hidden">
        <div class="absolute top-[-20px] right-[-20px] opacity-10 text-[120px] rotate-12">
          <span class="material-symbols-outlined" data-icon="search_check">search_check</span>
        </div>
        <div class="relative z-10">
          <label class="text-xs font-bold text-white/70 uppercase tracking-wider">关键词搜索</label>
          <div class="mt-2 relative">
            <input class="w-full bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-white/40 outline-none" placeholder="搜索操作描述、流水号..." type="text"/>
          </div>
        </div>
        <button class="mt-4 w-full bg-white text-primary font-bold py-2.5 rounded-xl text-sm hover:bg-orange-50 transition-colors active:scale-[0.98]">
          执行筛选
        </button>
      </div>
    </section>

    <!-- Table Section -->
    <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-orange-100/10 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-surface-container-low/50 border-b border-orange-100/10">
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">流水号</th>
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">操作人员</th>
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">操作模块</th>
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">操作描述</th>
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">操作IP</th>
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">操作时间</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-orange-50">
            <tr v-for="l in logs" :key="l.id" class="hover:bg-orange-50/30 transition-colors group">
              <td class="px-6 py-4">
                <span class="text-xs font-mono text-on-surface-variant bg-surface-container-low px-2 py-1 rounded">{{ l.serialNo }}</span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-700">{{ initials(l.operator.name) }}</div>
                  <span class="text-sm font-medium">{{ l.operator.name }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold" :class="moduleClass(l.module)">
                  <span class="w-1 h-1 rounded-full" :class="moduleDotClass(l.module)"></span>
                  {{ l.module }}
                </span>
              </td>
              <td class="px-6 py-4">
                <p class="text-sm text-on-surface">{{ l.action }}</p>
              </td>
              <td class="px-6 py-4">
                <span class="text-xs text-on-surface-variant/70">{{ l.ip || '-' }}</span>
              </td>
              <td class="px-6 py-4">
                <span class="text-xs text-on-surface-variant/70 font-medium">{{ formatDateTime(l.createdAt) }}</span>
              </td>
            </tr>
            <tr v-if="!loading && logs.length === 0" class="bg-surface-container-lowest">
              <td colspan="6" class="px-6 py-10 text-center text-sm text-on-surface-variant">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div class="px-6 py-4 flex items-center justify-between border-t border-orange-50">
        <p class="text-xs text-on-surface-variant/60">显示 {{ start }} 到 {{ end }} 条，共 {{ total }} 条记录</p>
        <div class="flex items-center gap-1">
          <button
            class="p-1.5 rounded-lg hover:bg-orange-50 text-on-surface-variant disabled:opacity-30"
            :disabled="page <= 1"
            @click="goPage(page - 1)"
          >
            <span class="material-symbols-outlined text-lg" data-icon="chevron_left">chevron_left</span>
          </button>
          <button
            v-for="p in pageItems"
            :key="p"
            class="w-8 h-8 rounded-lg text-xs font-bold"
            :class="p === page ? 'bg-primary text-white' : 'hover:bg-orange-50 text-on-surface-variant'"
            @click="goPage(p)"
          >
            {{ p }}
          </button>
          <button
            class="p-1.5 rounded-lg hover:bg-orange-50 text-on-surface-variant disabled:opacity-30"
            :disabled="page >= totalPages"
            @click="goPage(page + 1)"
          >
            <span class="material-symbols-outlined text-lg" data-icon="chevron_right">chevron_right</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Dashboard Style Stats (Organic Layout) -->
    <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-surface-container rounded-xl p-6 relative overflow-hidden group">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-white rounded-xl shadow-sm">
            <span class="material-symbols-outlined text-orange-600" data-icon="security_update_good">security_update_good</span>
          </div>
          <span class="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">异常检测: 低</span>
        </div>
        <h3 class="text-sm font-bold text-on-surface-variant mb-1">今日高频操作模块</h3>
        <p class="text-2xl font-black text-on-surface">账户安全 <span class="text-xs font-medium text-on-surface-variant/50">(42%)</span></p>
      </div>
      <div class="bg-white rounded-xl p-6 shadow-[0_8px_24px_rgba(86,67,55,0.04)] border border-orange-50">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-2 h-8 bg-orange-400 rounded-full"></div>
          <h3 class="text-sm font-bold text-on-surface-variant">操作活跃时段</h3>
        </div>
        <div class="flex items-end gap-1.5 h-12">
          <div class="flex-1 bg-orange-100 rounded-t-sm h-[30%]"></div>
          <div class="flex-1 bg-orange-100 rounded-t-sm h-[45%]"></div>
          <div class="flex-1 bg-orange-200 rounded-t-sm h-[70%]"></div>
          <div class="flex-1 bg-orange-400 rounded-t-sm h-[100%]"></div>
          <div class="flex-1 bg-orange-300 rounded-t-sm h-[60%]"></div>
          <div class="flex-1 bg-orange-100 rounded-t-sm h-[25%]"></div>
        </div>
        <p class="mt-3 text-[10px] text-on-surface-variant/50 text-right font-medium">Peak: 14:00 - 16:00</p>
      </div>
      <div class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white relative overflow-hidden">
        <div class="relative z-10 h-full flex flex-col justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-orange-400 text-sm" data-icon="verified_user">verified_user</span>
            <span class="text-xs font-bold tracking-widest uppercase opacity-60">System Health</span>
          </div>
          <div>
            <p class="text-2xl font-black mb-1">99.9%</p>
            <p class="text-[10px] opacity-60">日志系统运行状态极佳，无延迟积压</p>
          </div>
        </div>
        <div class="absolute right-[-10px] bottom-[-20px] opacity-10">
          <span class="material-symbols-outlined text-[100px]" data-icon="analytics">analytics</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { formatDateTime } from '@/utils/format'

type AuditLogItem = {
  id: number
  serialNo: string
  module: string
  action: string
  ip: string | null
  createdAt: string
  operator: { id: number | null; name: string }
}

const loading = ref(false)
const logs = ref<AuditLogItem[]>([])
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

function initials(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return 'SYS'
  return trimmed.slice(0, 2)
}

function moduleClass(module: string) {
  if (module === '账户安全') return 'bg-tertiary-container text-on-tertiary-container'
  if (module === '订单财务') return 'bg-primary-fixed-dim text-on-primary-container'
  if (module === '宠物档案') return 'bg-secondary-container text-on-secondary-container'
  return 'bg-surface-variant text-on-surface-variant'
}

function moduleDotClass(module: string) {
  if (module === '账户安全') return 'bg-on-tertiary-container'
  if (module === '订单财务') return 'bg-on-primary-container'
  if (module === '宠物档案') return 'bg-on-secondary-container'
  return 'bg-on-surface-variant'
}

async function load() {
  loading.value = true
  try {
    const res = await axios.get('/api/v1/admin/system/logs', { params: { page: page.value, pageSize: pageSize.value } })
    if (res.data?.ok || res.data?.code === 0) {
      logs.value = res.data.data.items
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
