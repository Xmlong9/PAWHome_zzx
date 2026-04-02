<template>
  <div class="p-8 space-y-8">
    <!-- Table Section (Asymmetric Editorial Style) -->
    <section class="bg-surface-container-low rounded-3xl p-1 overflow-hidden">
      <div class="bg-surface-container-lowest rounded-[1.4rem] shadow-sm">
        <div class="p-6 border-b border-surface-variant/30 flex justify-between items-end">
          <div>
            <h2 class="text-2xl font-bold text-primary">商品库</h2>
            <p class="text-sm text-on-surface-variant mt-1">管理您的商品目录、价格及库存状态</p>
          </div>
          <div class="flex gap-2">
            <button class="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-xl text-xs font-bold hover:brightness-95 transition-all">批量下架</button>
            <button class="bg-surface-container-highest text-on-surface-variant px-4 py-2 rounded-xl text-xs font-bold hover:brightness-95 transition-all">导出表格</button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-on-surface-variant text-[11px] uppercase tracking-wider font-bold">
                <th class="px-6 py-4">商品ID</th>
                <th class="px-6 py-4">商品信息</th>
                <th class="px-6 py-4 text-right">价格</th>
                <th class="px-6 py-4 text-center">库存</th>
                <th class="px-6 py-4">状态</th>
                <th class="px-6 py-4">创建时间</th>
                <th class="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-variant/20">
              <tr v-for="p in products" :key="p.id" class="group hover:bg-surface-container-low/50 transition-colors">
                <td class="px-6 py-4 text-xs font-mono text-on-surface-variant">#{{ p.productNo }}</td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl overflow-hidden bg-surface-container-high shrink-0">
                      <img class="w-full h-full object-cover" :alt="p.name" :src="p.imageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAaLiWXImN5PJWgR5nqpgLsQexKxjhClgcj39smxO1E-4iCKIKqHkthkChKilTi8_3Hc-6qxDKI9qcFLjRkJud9bFx4vdkZ7aPs8NTDjbFBptiLlTuSE9NKTw81WDnQKy0LfyhxccPB_a1hqIz3tD1stoDnDcEDk_ZSvYODQbKrdZVCkhcpZa9ZJy-iMutaUguVvtSVg25Z5EQ3LLD6vRZSF0-RuqXhPyGc0iqwzbvQv5KTJQuODLwaQdY-qvpfVligrP0J07irFM'"/>
                    </div>
                    <div>
                      <p class="text-sm font-bold text-on-surface">{{ p.name }}</p>
                      <p class="text-[10px] text-on-surface-variant">分类: {{ p.categoryText || '-' }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 text-right text-sm font-bold text-primary">¥ {{ formatMoney(p.price) }}</td>
                <td class="px-6 py-4 text-center">
                  <div class="text-sm font-medium">{{ p.stockQty.toLocaleString('zh-CN') }}</div>
                  <div class="w-16 h-1 bg-surface-container-high rounded-full mx-auto mt-1 overflow-hidden">
                    <div class="h-full" :class="p.stockQty === 0 ? 'bg-surface-dim' : p.stockQty < 100 ? 'bg-error' : 'bg-primary-container'" :style="{ width: stockBarWidth(p.stockQty) }"></div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span v-if="p.status === 'on_sale'" class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold"><span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>销售中</span>
                  <span v-else-if="p.status === 'low_stock'" class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-tertiary-container/20 text-on-tertiary-container text-[10px] font-bold"><span class="w-1.5 h-1.5 rounded-full bg-tertiary-container"></span>库存紧张</span>
                  <span v-else class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-variant text-on-surface-variant text-[10px] font-bold"><span class="w-1.5 h-1.5 rounded-full bg-on-surface-variant/40"></span>已下架</span>
                </td>
                <td class="px-6 py-4 text-xs text-on-surface-variant">{{ formatDateTime(p.createdAt) }}</td>
                <td class="px-6 py-4 text-right">
                  <div class="flex justify-end gap-1">
                    <button class="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors"><span class="material-symbols-outlined text-sm">edit</span></button>
                    <button class="p-2 hover:bg-error-container/30 hover:text-error rounded-lg text-on-surface-variant transition-colors"><span class="material-symbols-outlined text-sm">delete</span></button>
                  </div>
                </td>
              </tr>
              <tr v-if="!loading && products.length === 0" class="bg-surface-container-lowest">
                <td colspan="7" class="px-6 py-10 text-center text-sm text-on-surface-variant">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="p-6 border-t border-surface-variant/30 flex justify-between items-center">
          <span class="text-xs text-on-surface-variant">显示 {{ start }} 到 {{ end }} 条，共 {{ total }} 条商品</span>
          <div class="flex gap-1">
            <button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"><span class="material-symbols-outlined text-sm">chevron_left</span></button>
            <button class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-white text-xs font-bold">1</button>
            <button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors text-xs font-bold">2</button>
            <button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors text-xs font-bold">3</button>
            <button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"><span class="material-symbols-outlined text-sm">chevron_right</span></button>
          </div>
        </div>
      </div>
    </section>

    <!-- Summary Bento Grid -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Total Stock Value -->
      <div class="bg-surface-container-lowest rounded-3xl p-6 shadow-[0px_8px_24px_rgba(86,67,55,0.04)] relative overflow-hidden group hover:scale-[1.02] transition-transform">
        <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">account_balance_wallet</span>
          </div>
          <span class="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+12.5%</span>
        </div>
        <p class="text-on-surface-variant text-sm font-medium">总库存价值</p>
        <h3 class="text-3xl font-black text-on-surface mt-1">¥ 1,245,800</h3>
        <p class="text-[10px] text-on-surface-variant mt-2 tracking-wide uppercase">截止今日 08:00</p>
      </div>
      
      <!-- Active Products -->
      <div class="bg-surface-container-lowest rounded-3xl p-6 shadow-[0px_8px_24px_rgba(86,67,55,0.04)] relative overflow-hidden group hover:scale-[1.02] transition-transform">
        <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-tertiary-container/5 rounded-full blur-2xl group-hover:bg-tertiary-container/10 transition-colors"></div>
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 rounded-2xl bg-tertiary-fixed flex items-center justify-center text-tertiary">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">inventory_2</span>
          </div>
          <span class="text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-full">稳定</span>
        </div>
        <p class="text-on-surface-variant text-sm font-medium">商品总数</p>
        <h3 class="text-3xl font-black text-on-surface mt-1">{{ total }} <span class="text-sm font-normal text-on-surface-variant">款</span></h3>
        <p class="text-[10px] text-on-surface-variant mt-2 tracking-wide uppercase">按后台实时统计</p>
      </div>
      
      <!-- New This Month -->
      <div class="bg-gradient-to-br from-primary to-primary-container rounded-3xl p-6 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform">
        <div class="absolute right-0 top-0 p-4 opacity-20">
          <span class="material-symbols-outlined text-6xl text-white">auto_awesome</span>
        </div>
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">new_releases</span>
          </div>
        </div>
        <p class="text-white/80 text-sm font-medium">本月新增</p>
        <h3 class="text-3xl font-black text-white mt-1">— <span class="text-sm font-normal text-white/70">款</span></h3>
        <div class="mt-4 flex items-center gap-2">
          <div class="flex -space-x-2">
            <div class="w-6 h-6 rounded-full border-2 border-primary-container bg-surface-container-high overflow-hidden"><img alt="user" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCMFM0JINixvEka4hgitxuTp9YHihV7r7Gg8u9VLIxTyAW0N2jMxVNuquAO0ZkfwXXtv5KR_-LPjaNyk7G6-_-IiAl45Ey1Ll04OJ_9YdgYadlTqJVx-EVa7EA8U9Gqaw0jnDDUVm1kXY5QTPZl4hsWuh48cz03FlNdg4JxGtfspTLnoEk2Xm2zTIk7biu9Q66c6CwINOi0I6GfNTz0QPo2P5bt8pykcKqCVqoJFAInwmlK9IrHSGGJWcEjh-jfF-RMZVEoTFCF6n0"/></div>
            <div class="w-6 h-6 rounded-full border-2 border-primary-container bg-surface-container-high overflow-hidden"><img alt="user" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCx_JkIGIUm-a-69xTJ8CbRLHOEswFWXdE3DMwGCEOFQh1blGKzLgQ3rnHVdtVqeejN3x3zWm5PN7LP_6ijEsM6H7qZg-pxxyul0fsxBhh0kh2GM4lbho1LheOcEcaq6tU0pLL-of36bLhDXpIAGegB6DmMrj_l8OR1NxX3ic23XgaOvwwoT5JVjp40MV8C_9HFu9YTpkBpOZ-RpBmCh7jgNVQoXW2_Uv0IRoyApViM14iaLMd-eJdOgk-G2DbHpDeleEsypBWlOR4"/></div>
            <div class="w-6 h-6 rounded-full border-2 border-primary-container bg-surface-container-high overflow-hidden"><img alt="user" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzuWaFmFX-VTUVl5RqA33SuXIK-TMuSEfhugsd2HhUIoDriDAPmo6hUXVl-QqISIqCEdUg2uJ3V2WU9LVo3cPgYA6MO2GcDckkTu2UYyXy1Etr2nhTGcmkv4n96d7tczYnY8fBVIDcugmRIfuQYFMjv-LzDvQt9S-7dpq-QIkTNnUSEn1QUfvzOVCf2X7EY4__SYuFC1hTi0TxpVfzA-XJv4EaEe1ccARK2L2ZkC3ZRqayhbVP3Gqh61XoD2MPohKQGf6jN9zk6yg"/></div>
          </div>
          <span class="text-[10px] text-white/90 font-bold">运营团队近期活跃新增</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { formatDateTime, formatMoney } from '@/utils/format'

type ProductItem = {
  id: string
  productNo: string
  name: string
  categoryText: string | null
  price: number
  stockQty: number
  status: string
  imageUrl: string | null
  createdAt: string
}

const loading = ref(false)
const products = ref<ProductItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const start = computed(() => {
  if (total.value === 0) return 0
  return (page.value - 1) * pageSize.value + 1
})

const end = computed(() => {
  if (total.value === 0) return 0
  return Math.min(total.value, page.value * pageSize.value)
})

function stockBarWidth(stockQty: number) {
  if (stockQty <= 0) return '0%'
  if (stockQty < 20) return '25%'
  if (stockQty < 100) return '50%'
  return '75%'
}

async function load() {
  loading.value = true
  try {
    const res = await axios.get('/api/v1/admin/shop/products', { params: { page: page.value, pageSize: pageSize.value } })
    if (res.data?.ok || res.data?.code === 0) {
      products.value = res.data.data.items
      total.value = res.data.data.total
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
</style>
