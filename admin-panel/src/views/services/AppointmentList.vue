<template>
  <div class="p-8 min-h-screen">
    <!-- Header Section -->
    <div class="flex justify-between items-end mb-8">
      <div>
        <h2 class="text-3xl font-black text-on-surface tracking-tight">预约概览</h2>
        <p class="text-on-surface-variant mt-1">欢迎回来，今日共有 <span class="font-bold text-primary">{{ pendingCount }}</span> 个待处理预约。</p>
      </div>
      <div class="flex gap-3">
        <button class="flex items-center gap-2 px-5 py-2.5 bg-white border-none shadow-sm hover:shadow-md rounded-xl text-on-surface-variant font-semibold transition-all">
          <span class="material-symbols-outlined">download</span>
          导出报表
        </button>
      </div>
    </div>

    <!-- Bento Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
      <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-b-4 border-primary/20">
        <div class="flex justify-between items-start mb-4">
          <div class="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-primary">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">pending_actions</span>
          </div>
          <span class="text-xs font-bold text-primary bg-primary-fixed px-2 py-1 rounded-full">+12%</span>
        </div>
        <p class="text-sm font-medium text-on-surface-variant">待服务</p>
        <h3 class="text-2xl font-black mt-1">{{ pendingCount }}</h3>
      </div>
      <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-b-4 border-tertiary/20">
        <div class="flex justify-between items-start mb-4">
          <div class="w-12 h-12 rounded-xl bg-tertiary-fixed flex items-center justify-center text-tertiary">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">location_home</span>
          </div>
          <span class="text-xs font-bold text-tertiary bg-tertiary-fixed-dim px-2 py-1 rounded-full">进行中</span>
        </div>
        <p class="text-sm font-medium text-on-surface-variant">已到店</p>
        <h3 class="text-2xl font-black mt-1">{{ arrivedCount }}</h3>
      </div>
      <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-b-4 border-green-200">
        <div class="flex justify-between items-start mb-4">
          <div class="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">check_circle</span>
          </div>
          <span class="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">今日完成</span>
        </div>
        <p class="text-sm font-medium text-on-surface-variant">已完成</p>
        <h3 class="text-2xl font-black mt-1">{{ completedCount }}</h3>
      </div>
      <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-b-4 border-error-container">
        <div class="flex justify-between items-start mb-4">
          <div class="w-12 h-12 rounded-xl bg-error-container/20 flex items-center justify-center text-error">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">cancel</span>
          </div>
          <span class="text-xs font-bold text-error bg-error-container px-2 py-1 rounded-full">-3%</span>
        </div>
        <p class="text-sm font-medium text-on-surface-variant">已取消</p>
        <h3 class="text-2xl font-black mt-1">{{ cancelledCount }}</h3>
      </div>
    </div>

    <!-- Filter & View Controls -->
    <div class="bg-surface-container-low rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-2 bg-surface-container-lowest p-1 rounded-xl shadow-inner">
        <button class="px-6 py-2 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-lg font-bold text-sm flex items-center gap-2">
          <span class="material-symbols-outlined text-sm">list</span>
          列表视图
        </button>
        <button class="px-6 py-2 text-on-surface-variant hover:bg-orange-50 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
          <span class="material-symbols-outlined text-sm">calendar_month</span>
          日历视图
        </button>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">服务类型:</span>
          <div class="flex gap-2">
            <button class="px-3 py-1.5 rounded-lg bg-primary-fixed text-on-primary-fixed-variant text-xs font-bold">全部</button>
            <button class="px-3 py-1.5 rounded-lg bg-surface-container-highest text-on-surface-variant text-xs font-bold hover:bg-primary-fixed/50 transition-colors">美容</button>
            <button class="px-3 py-1.5 rounded-lg bg-surface-container-highest text-on-surface-variant text-xs font-bold hover:bg-primary-fixed/50 transition-colors">洗澡</button>
            <button class="px-3 py-1.5 rounded-lg bg-surface-container-highest text-on-surface-variant text-xs font-bold hover:bg-primary-fixed/50 transition-colors">医疗</button>
            <button class="px-3 py-1.5 rounded-lg bg-surface-container-highest text-on-surface-variant text-xs font-bold hover:bg-primary-fixed/50 transition-colors">寄养</button>
          </div>
        </div>
        <div class="h-6 w-[1px] bg-slate-300"></div>
        <button class="p-2 text-on-surface-variant hover:bg-surface-container-highest rounded-lg transition-colors">
          <span class="material-symbols-outlined">filter_alt</span>
        </button>
      </div>
    </div>

    <!-- Appointment Table Container -->
    <div class="bg-surface-container-lowest rounded-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-surface-container-low/50">
            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">预约详情</th>
            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">宠物信息</th>
            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">服务项目</th>
            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">主人信息</th>
            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">预约时段</th>
            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">当前状态</th>
            <th class="px-6 py-4 text-right"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-orange-50">
          <tr v-for="a in appointments" :key="a.id" class="hover:bg-orange-50/30 transition-colors group">
            <td class="px-6 py-5">
              <span class="block text-xs font-mono font-bold text-primary">#{{ a.bookingNo }}</span>
              <span class="text-[10px] text-slate-400">下单时间: {{ formatTime(a.createdAt) }}</span>
            </td>
            <td class="px-6 py-5">
              <div class="flex items-center gap-3">
                <img
                  :alt="a.pet.nameCn || '宠物'"
                  class="w-10 h-10 rounded-lg bg-orange-100 object-cover"
                  :src="
                    normalizeMediaUrl(a.pet.avatarUrl) ||
                    fallbackPetImg
                  "
                  @error="(e) => onImgError(e, fallbackPetImg)"
                />
                <div>
                  <div class="max-w-[10rem]">
                    <span class="block font-bold text-on-surface truncate whitespace-nowrap">{{ a.pet.nameCn || '-' }}</span>
                  </div>
                  <span class="text-xs text-on-surface-variant">{{ a.pet.breed || '-' }}</span>
                </div>
              </div>
            </td>
            <td class="px-6 py-5">
              <span class="inline-flex items-center px-2.5 py-1 rounded-md bg-secondary-container text-on-secondary-container text-xs font-bold">{{ a.service.name }}</span>
            </td>
            <td class="px-6 py-5">
              <div class="max-w-[10rem]">
                <span class="block font-medium text-on-surface truncate whitespace-nowrap">{{ a.owner.name }}</span>
              </div>
              <span class="text-xs text-on-surface-variant">{{ a.owner.phoneMasked }}</span>
            </td>
            <td class="px-6 py-5">
              <div class="flex flex-col">
                <span class="font-bold text-on-surface">{{ scheduleText(a) }}</span>
                <span v-if="a.schedule.durationMinutes" class="text-[10px] text-orange-600 font-bold">预计时长 {{ a.schedule.durationMinutes }}min</span>
              </div>
            </td>
            <td class="px-6 py-5">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" :class="statusClass(a.status)">
                <span class="w-1.5 h-1.5 rounded-full" :class="statusDotClass(a.status)"></span>
                {{ statusLabel(a.status) }}
              </span>
            </td>
            <td class="px-6 py-5 text-right">
              <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  v-if="a.status === 'pending_service'"
                  class="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-colors"
                  @click="updateStatus(a, 'arrived')"
                >
                  到店
                </button>
                <button
                  v-if="a.status === 'arrived'"
                  class="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-bold hover:bg-green-600 hover:text-white transition-colors"
                  @click="updateStatus(a, 'completed')"
                >
                  完成
                </button>
                <button
                  v-if="a.status !== 'completed' && a.status !== 'cancelled'"
                  class="px-3 py-1.5 rounded-lg bg-error-container/40 text-error text-xs font-bold hover:bg-error hover:text-white transition-colors"
                  @click="updateStatus(a, 'cancelled')"
                >
                  取消
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && appointments.length === 0" class="bg-surface-container-lowest">
            <td colspan="7" class="px-6 py-10 text-center text-sm text-on-surface-variant">暂无数据</td>
          </tr>
        </tbody>
      </table>
      <!-- Pagination -->
      <div class="px-6 py-4 bg-surface-container-low/30 flex items-center justify-between">
        <span class="text-xs font-bold text-on-surface-variant">显示 {{ start }} 到 {{ end }} 条，共 {{ total }} 条预约记录</span>
        <div class="flex gap-1">
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-on-surface-variant transition-colors disabled:opacity-30"
            :disabled="page <= 1"
            @click="goPage(page - 1)"
          >
            <span class="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          <button
            v-for="p in pageItems"
            :key="p"
            class="w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs transition-colors"
            :class="p === page ? 'bg-primary text-white' : 'hover:bg-white text-on-surface-variant'"
            @click="goPage(p)"
          >
            {{ p }}
          </button>
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-on-surface-variant transition-colors disabled:opacity-30"
            :disabled="page >= totalPages"
            @click="goPage(page + 1)"
          >
            <span class="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Secondary Information Cards (Asymmetric Layout) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
      <!-- Promotion / Announcement Card -->
      <div class="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 to-primary-container p-8 text-white shadow-xl">
        <div class="relative z-10 flex flex-col h-full justify-between">
          <div>
            <h4 class="text-2xl font-black mb-2">春季驱虫季特别提醒</h4>
            <p class="text-orange-100 max-w-md">本周寄养与医疗预约量激增，请各门店店长合理调配美容师排班。由于近期流感频发，请务必核实进店宠物的疫苗情况。</p>
          </div>
          <div class="mt-8 flex items-center gap-4">
            <button class="px-6 py-2 bg-white text-primary font-bold rounded-xl shadow-lg transition-transform active:scale-95">查看详情</button>
            <span class="text-xs text-orange-100 font-medium">截止日期: 2024年4月1日</span>
          </div>
        </div>
        <div class="absolute -right-8 -bottom-8 opacity-20 transform rotate-12">
          <span class="material-symbols-outlined text-[200px]" style="font-variation-settings: 'FILL' 1;">medical_services</span>
        </div>
      </div>
      
      <!-- Shop Efficiency Widget -->
      <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
        <h4 class="text-lg font-black mb-6 text-on-surface flex items-center gap-2">
          <span class="material-symbols-outlined text-primary">analytics</span>
          资源占用率
        </h4>
        <div class="space-y-6">
          <div>
            <div class="flex justify-between text-xs font-bold mb-2">
              <span class="text-on-surface-variant">美容间</span>
              <span class="text-primary">85%</span>
            </div>
            <div class="w-full h-2 bg-surface-container rounded-full overflow-hidden">
              <div class="h-full bg-primary rounded-full" style="width: 85%"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-xs font-bold mb-2">
              <span class="text-on-surface-variant">寄养仓</span>
              <span class="text-tertiary">42%</span>
            </div>
            <div class="w-full h-2 bg-surface-container rounded-full overflow-hidden">
              <div class="h-full bg-tertiary rounded-full" style="width: 42%"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-xs font-bold mb-2">
              <span class="text-on-surface-variant">医疗科室</span>
              <span class="text-orange-400">60%</span>
            </div>
            <div class="w-full h-2 bg-surface-container rounded-full overflow-hidden">
              <div class="h-full bg-orange-400 rounded-full" style="width: 60%"></div>
            </div>
          </div>
        </div>
        <div class="mt-8 pt-6 border-t border-slate-100">
          <p class="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-4">今日值班店长</p>
          <div class="flex items-center gap-3">
            <img alt="店长头像" class="w-8 h-8 rounded-full border border-orange-200" data-alt="professional female shop manager avatar with auburn hair and a confident expression in vector illustration style" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDH1wCCQ2MygdcNvWhOArQ8fPpqIhdP4mg5bIrwWtn8DXnWHDSwGsVBqGCh9l38Pw6rQ4bjI5qkDDyw0_Uk-UUnzVNFqTYBuv3_5k_RlBU2PzVTnJMEwl43w0EbeVx1ktyPT3QkOpEc3JBhmsAr2nb834j_EXJzL6FvXgY24sL3ZNtgnIyWIgrEY2fUZYNfNcyYsk3A3yyeVxBW2yyBaX96IGaSjrSSYaw9wu7rvmmkk-E1ag-fXirz2C3qeQTZQukT-NnQ2JGajUI"/>
            <span class="text-sm font-bold text-on-surface">Sara Chen</span>
            <span class="ml-auto text-[10px] px-2 py-1 bg-green-100 text-green-700 rounded-lg font-bold">在岗</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDateTime, normalizeMediaUrl } from '@/utils/format'

type AppointmentItem = {
  id: string
  bookingNo: string
  createdAt: string
  status: string
  pet: { id: string; nameCn: string | null; avatarUrl: string | null; breed: string | null }
  service: { id: string; name: string }
  owner: { id: string; name: string; phoneMasked: string }
  schedule: { type: string; startAt: string | null; endAt: string | null; durationMinutes: number | null }
}

const loading = ref(false)
const appointments = ref<AppointmentItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const fallbackPetImg =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAmDUm175YZBeiBAHZklM_l0qb3v9vLz0VoKRv3RoHCKTwl2KXVgnHAh86rOIoKx_D22E9V2HQ1afvuNobpYivHILk6p-nE5TvDMn1L7ghuiOWXvU1wEWV5h-sQFH04uDRstuGZFLxgcz-UX5C2n2Tm4ZZaYq8Edqeh8hn6mG4UjcMMFq1EsAEzIaCmBiYXNWirz0-_4PGfR6Sh7sxCZgpLu6BXnIcp_1CTi5h7Iaca4nUxw_FTrfmW1jt4SqkfevzD13TPrNB0oRM'

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

const pendingCount = computed(() => appointments.value.filter((a) => a.status === 'pending_service').length)
const arrivedCount = computed(() => appointments.value.filter((a) => a.status === 'arrived').length)
const completedCount = computed(() => appointments.value.filter((a) => a.status === 'completed').length)
const cancelledCount = computed(() => appointments.value.filter((a) => a.status === 'cancelled').length)

function formatTime(input: string) {
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return input
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function scheduleText(a: AppointmentItem) {
  if (a.schedule.startAt && a.schedule.endAt) {
    return `${formatDateTime(a.schedule.startAt)} - ${formatTime(a.schedule.endAt)}`
  }
  return '-'
}

function statusLabel(status: string) {
  if (status === 'pending_service') return '待服务'
  if (status === 'arrived') return '已到店'
  if (status === 'unpaid') return '待支付'
  if (status === 'completed') return '已完成'
  if (status === 'cancelled') return '已取消'
  return status
}

function statusClass(status: string) {
  if (status === 'pending_service') return 'bg-primary-fixed text-on-primary-fixed-variant'
  if (status === 'arrived') return 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
  if (status === 'completed') return 'bg-green-100 text-green-700'
  if (status === 'unpaid') return 'bg-surface-container text-on-surface-variant'
  return 'bg-error-container/40 text-error'
}

function statusDotClass(status: string) {
  if (status === 'pending_service') return 'bg-primary'
  if (status === 'arrived') return 'bg-tertiary'
  if (status === 'completed') return 'bg-green-600'
  if (status === 'unpaid') return 'bg-slate-400'
  return 'bg-error'
}

async function load() {
  loading.value = true
  try {
    const res = await axios.get('/api/v1/admin/services/appointments', { params: { page: page.value, pageSize: pageSize.value } })
    if (res.data?.ok || res.data?.code === 0) {
      appointments.value = res.data.data.items
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

function onImgError(e: Event, fallback: string) {
  const el = e.target as HTMLImageElement | null
  if (!el) return
  if (el.src === fallback) return
  el.src = fallback
}

async function updateStatus(a: AppointmentItem, status: string) {
  const label = statusLabel(status)
  try {
    await ElMessageBox.confirm(`确认将该预约更新为「${label}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await axios.put(`/api/v1/admin/services/appointments/${a.id}/status`, { status })
    ElMessage.success('已更新')
    await load()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '操作失败')
  }
}

onMounted(load)
</script>

<style scoped>
</style>
