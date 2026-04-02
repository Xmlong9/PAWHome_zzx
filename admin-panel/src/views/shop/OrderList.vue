<template>
  <div class="flex-1 p-8 space-y-8">
    <!-- Header Editorial Section -->
    <div class="flex justify-between items-end">
      <div>
        <h2 class="text-3xl font-extrabold text-primary tracking-tight">订单中心</h2>
        <p class="text-on-surface-variant mt-1">处理来自全球爱宠人士的每一份关怀与责任。</p>
      </div>
      <div class="flex gap-3">
        <button class="px-6 py-2.5 bg-secondary-container text-on-secondary-container rounded-xl font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all">
          <span class="material-symbols-outlined text-lg">download</span>
          导出数据
        </button>
        <button class="px-6 py-2.5 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold shadow-lg shadow-orange-200 flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all">
          <span class="material-symbols-outlined text-lg">add</span>
          手动录单
        </button>
      </div>
    </div>

    <!-- Bento Stats Grid -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-orange-50 relative overflow-hidden group">
        <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-orange-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-700"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
              <span class="material-symbols-outlined">today</span>
            </div>
            <span class="font-bold text-on-surface-variant">今日订单</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-black text-on-surface tracking-tighter">{{ todayOrders }}</span>
            <span class="text-green-600 text-xs font-bold flex items-center gap-1">
              <span class="material-symbols-outlined text-xs">trending_up</span>
              实时
            </span>
          </div>
        </div>
      </div>
      
      <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-orange-50 relative overflow-hidden group">
        <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-700"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <span class="material-symbols-outlined">local_shipping</span>
            </div>
            <span class="font-bold text-on-surface-variant">待发货订单</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-black text-on-surface tracking-tighter">{{ toShipCount }}</span>
            <span class="text-red-500 text-xs font-bold">需尽快处理</span>
          </div>
        </div>
      </div>
      
      <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-orange-50 relative overflow-hidden group">
        <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-tertiary-fixed rounded-full opacity-30 group-hover:scale-125 transition-transform duration-700"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-tertiary-fixed text-tertiary rounded-lg flex items-center justify-center">
              <span class="material-symbols-outlined">payments</span>
            </div>
            <span class="font-bold text-on-surface-variant">总订单额</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-sm font-bold text-on-surface-variant">¥</span>
            <span class="text-4xl font-black text-on-surface tracking-tighter">{{ formatMoney(totalPaid) }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Filter Section -->
    <section class="bg-surface-container-low p-6 rounded-xl">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-on-surface-variant ml-1 uppercase tracking-wider">订单号 / 手机号</label>
          <div class="relative">
            <input class="w-full bg-surface-container-highest border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/40 transition-all" placeholder="输入搜索内容..." type="text"/>
          </div>
        </div>
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-on-surface-variant ml-1 uppercase tracking-wider">收货人姓名</label>
          <input class="w-full bg-surface-container-highest border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/40 transition-all" placeholder="姓名关键词" type="text"/>
        </div>
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-on-surface-variant ml-1 uppercase tracking-wider">订单状态</label>
          <select class="w-full bg-surface-container-highest border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/40 transition-all appearance-none cursor-pointer">
            <option>全部状态</option>
            <option>待付款</option>
            <option>待发货</option>
            <option>已发货</option>
            <option>已完成</option>
            <option>已取消</option>
          </select>
        </div>
        <div class="flex items-end gap-3">
          <button class="flex-1 px-4 py-2.5 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-all">
            查询
          </button>
          <button class="px-4 py-2.5 bg-white border border-outline-variant text-on-surface-variant font-bold rounded-xl hover:bg-slate-50 transition-all">
            重置
          </button>
        </div>
      </div>
    </section>

    <!-- Table Section -->
    <section class="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden border border-orange-50">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead class="bg-surface-container-low border-b border-orange-100/30">
            <tr>
              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">订单信息</th>
              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">商品详情</th>
              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">买家信息</th>
              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">实付金额</th>
              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">状态</th>
              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-orange-50">
            <tr v-for="o in orders" :key="o.id" class="hover:bg-orange-50/30 transition-colors">
              <td class="px-6 py-5">
                <p class="font-bold text-on-surface">#{{ o.orderNo }}</p>
                <p class="text-xs text-slate-400 mt-1">{{ formatDateTime(o.createdAt) }}</p>
              </td>
              <td class="px-6 py-5">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                    <img
                      :alt="firstItem(o)?.product.name || '商品'"
                      class="w-full h-full object-cover"
                      :src="
                        normalizeMediaUrl(firstItem(o)?.product.imageUrl) ||
                        'https://lh3.googleusercontent.com/aida-public/AB6AXuAAaLiWXImN5PJWgR5nqpgLsQexKxjhClgcj39smxO1E-4iCKIKqHkthkChKilTi8_3Hc-6qxDKI9qcFLjRkJud9bFx4vdkZ7aPs8NTDjbFBptiLlTuSE9NKTw81WDnQKy0LfyhxccPB_a1hqIz3tD1stoDnDcEDk_ZSvYODQbKrdZVCkhcpZa9ZJy-iMutaUguVvtSVg25Z5EQ3LLD6vRZSF0-RuqXhPyGc0iqwzbvQv5KTJQuODLwaQdY-qvpfVligrP0J07irFM'
                      "
                      @error="(e) => onImgError(e, fallbackProductImg)"
                    />
                  </div>
                  <div>
                    <p class="text-sm font-bold text-on-surface line-clamp-1">{{ firstItem(o)?.product.name || '-' }}</p>
                    <p class="text-xs text-slate-500">{{ firstItem(o)?.skuText || '-' }} x {{ totalQty(o) }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-5">
                <div class="max-w-[10rem]">
                  <p class="text-sm font-bold text-on-surface truncate whitespace-nowrap">{{ o.buyer.name }}</p>
                </div>
                <p class="text-xs text-slate-500">{{ o.buyer.phoneMasked }}</p>
              </td>
              <td class="px-6 py-5">
                <p class="text-sm font-black text-primary">¥{{ formatMoney(o.pay.amountPaid) }}</p>
                <p class="text-[10px] text-slate-400">{{ payMethodText(o.pay.method) }}</p>
              </td>
              <td class="px-6 py-5">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold" :class="statusClass(o.status)">{{ statusLabel(o.status) }}</span>
              </td>
              <td class="px-6 py-5">
                <div class="flex justify-end gap-2">
                  <button v-if="o.status === 'to_ship'" class="p-2 hover:bg-orange-100 text-orange-700 rounded-lg transition-colors group relative" title="立即发货" @click="ship(o)">
                    <span class="material-symbols-outlined text-lg">local_shipping</span>
                  </button>
                  <button class="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors group relative" title="订单详情" @click="viewOrder(o)">
                    <span class="material-symbols-outlined text-lg">visibility</span>
                  </button>
                  <button class="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors group relative" title="修改价格" @click="editPrice(o)">
                    <span class="material-symbols-outlined text-lg">edit_note</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && orders.length === 0" class="bg-white">
              <td colspan="6" class="px-6 py-10 text-center text-sm text-on-surface-variant">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div class="px-6 py-4 bg-slate-50/50 flex items-center justify-between">
        <p class="text-xs font-bold text-slate-400">显示第 {{ start }} 至 {{ end }} 条，共 {{ total }} 条记录</p>
        <div class="flex items-center gap-1">
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-slate-400 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            :disabled="page <= 1"
            @click="goPage(page - 1)"
          >
            <span class="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          <button
            v-for="p in pageItems"
            :key="p"
            class="w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm transition-colors"
            :class="p === page ? 'bg-primary text-white shadow-md shadow-orange-200' : 'hover:bg-white text-slate-600'"
            @click="goPage(p)"
          >
            {{ p }}
          </button>
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-slate-400 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            :disabled="page >= totalPages"
            @click="goPage(page + 1)"
          >
            <span class="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDateTime, formatMoney, normalizeMediaUrl } from '@/utils/format'

type OrderItem = {
  id: string
  skuText: string | null
  quantity: number
  product: { id: string; name: string; imageUrl: string | null }
}

type Order = {
  id: string
  orderNo: string
  createdAt: string
  buyer: { id: string; name: string; phoneMasked: string }
  pay: { amountPaid: number; method: string }
  status: string
  items: OrderItem[]
}

const loading = ref(false)
const orders = ref<Order[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const stats = ref<any>(null)
const fallbackProductImg =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAAaLiWXImN5PJWgR5nqpgLsQexKxjhClgcj39smxO1E-4iCKIKqHkthkChKilTi8_3Hc-6qxDKI9qcFLjRkJud9bFx4vdkZ7aPs8NTDjbFBptiLlTuSE9NKTw81WDnQKy0LfyhxccPB_a1hqIz3tD1stoDnDcEDk_ZSvYODQbKrdZVCkhcpZa9ZJy-iMutaUguVvtSVg25Z5EQ3LLD6vRZSF0-RuqXhPyGc0iqwzbvQv5KTJQuODLwaQdY-qvpfVligrP0J07irFM'

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

const todayOrders = computed(() => Number(stats.value?.orders?.today ?? 0))

const toShipCount = computed(() => orders.value.filter((o) => o.status === 'to_ship').length)
const totalPaid = computed(() => Number(stats.value?.revenue?.total_cents ?? 0) / 100)

function firstItem(o: Order) {
  return o.items?.[0]
}

function totalQty(o: Order) {
  return (o.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0)
}

function payMethodText(method: string) {
  if (method === 'wechat') return '微信支付'
  if (method === 'alipay') return '支付宝支付'
  return method
}

function statusLabel(status: string) {
  if (status === 'unpaid') return '待付款'
  if (status === 'to_ship') return '待发货'
  if (status === 'shipped') return '已发货'
  if (status === 'completed') return '已完成'
  if (status === 'cancelled') return '已取消'
  return status
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

function viewOrder(_o: Order) {
  ElMessage.info('暂未提供订单详情页')
}

function editPrice(_o: Order) {
  ElMessage.info('暂未提供改价功能')
}

async function ship(o: Order) {
  try {
    await ElMessageBox.confirm('确认将该订单标记为已发货？', '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await axios.put(`/api/v1/admin/shop/orders/${o.id}/ship`)
    ElMessage.success('已发货')
    await load()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '操作失败')
  }
}

function statusClass(status: string) {
  if (status === 'to_ship') return 'bg-blue-100 text-blue-700'
  if (status === 'completed') return 'bg-green-100 text-green-700'
  if (status === 'unpaid') return 'bg-orange-100 text-orange-700'
  if (status === 'shipped') return 'bg-slate-100 text-slate-600'
  return 'bg-surface-variant text-on-surface-variant'
}

async function load() {
  loading.value = true
  try {
    const [listRes, statsRes] = await Promise.all([
      axios.get('/api/v1/admin/shop/orders', { params: { page: page.value, pageSize: pageSize.value } }),
      axios.get('/api/v1/admin/dashboard/stats')
    ])
    if (listRes.data?.ok || listRes.data?.code === 0) {
      orders.value = listRes.data.data.items
      total.value = listRes.data.data.total
    }
    if (statsRes.data?.ok || statsRes.data?.code === 0) {
      stats.value = statsRes.data.data
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
</style>
