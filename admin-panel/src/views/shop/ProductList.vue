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
            <button class="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1" @click="openAdd">
              <span class="material-symbols-outlined text-sm">add</span>
              新增商品
            </button>
            <button
              class="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-xl text-xs font-bold hover:brightness-95 transition-all disabled:opacity-50"
              :disabled="selectedIds.length === 0"
              @click="batchOffSale"
            >
              批量下架
            </button>
            <button class="bg-surface-container-highest text-on-surface-variant px-4 py-2 rounded-xl text-xs font-bold hover:brightness-95 transition-all" @click="exportProducts">导出表格</button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-on-surface-variant text-[11px] uppercase tracking-wider font-bold">
                <th class="px-6 py-4 w-10">
                  <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
                </th>
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
                <td class="px-6 py-4">
                  <input type="checkbox" :checked="selectedIds.includes(p.id)" @change="toggleSelect(p.id)" />
                </td>
                <td class="px-6 py-4 text-xs font-mono text-on-surface-variant">#{{ p.productNo }}</td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl overflow-hidden bg-surface-container-high shrink-0">
                      <img
                        class="w-full h-full object-cover"
                        :alt="p.name"
                        :src="
                          normalizeMediaUrl(p.imageUrl) ||
                          'https://lh3.googleusercontent.com/aida-public/AB6AXuAAaLiWXImN5PJWgR5nqpgLsQexKxjhClgcj39smxO1E-4iCKIKqHkthkChKilTi8_3Hc-6qxDKI9qcFLjRkJud9bFx4vdkZ7aPs8NTDjbFBptiLlTuSE9NKTw81WDnQKy0LfyhxccPB_a1hqIz3tD1stoDnDcEDk_ZSvYODQbKrdZVCkhcpZa9ZJy-iMutaUguVvtSVg25Z5EQ3LLD6vRZSF0-RuqXhPyGc0iqwzbvQv5KTJQuODLwaQdY-qvpfVligrP0J07irFM'
                        "
                        @error="(e) => onImgError(e, fallbackProductImg)"
                      />
                    </div>
                    <div>
                      <div class="max-w-[16rem]">
                        <p class="text-sm font-bold text-on-surface truncate whitespace-nowrap">{{ p.name }}</p>
                      </div>
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
                    <button
                      class="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors"
                      @click="openEdit(p)"
                    >
                      <span class="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button
                      class="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors"
                      :title="p.isActive ? '下架' : '上架'"
                      @click="toggleActive(p)"
                    >
                      <span class="material-symbols-outlined text-sm">{{ p.isActive ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                    <button
                      class="p-2 hover:bg-error-container/30 hover:text-error rounded-lg text-on-surface-variant transition-colors"
                      title="删除"
                      @click="deleteProduct(p)"
                    >
                      <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
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
            <button
              class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              :disabled="page <= 1"
              @click="goPage(page - 1)"
            >
              <span class="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button
              v-for="p in pageItems"
              :key="p"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors"
              :class="p === page ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-high'"
              @click="goPage(p)"
            >
              {{ p }}
            </button>
            <button
              class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              :disabled="page >= totalPages"
              @click="goPage(page + 1)"
            >
              <span class="material-symbols-outlined text-sm">chevron_right</span>
            </button>
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
          <span class="text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-full">实时</span>
        </div>
        <p class="text-on-surface-variant text-sm font-medium">总库存价值</p>
        <h3 class="text-3xl font-black text-on-surface mt-1">¥ {{ summary?.totalStockValue != null ? formatMoney(summary.totalStockValue) : '—' }}</h3>
        <p class="text-[10px] text-on-surface-variant mt-2 tracking-wide uppercase">按后台实时统计</p>
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
        <h3 class="text-3xl font-black text-white mt-1">{{ summary?.monthNewProducts ?? '—' }} <span class="text-sm font-normal text-white/70">款</span></h3>
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

  <el-dialog v-model="editVisible" :title="editingId ? '编辑商品' : '新增商品'" width="520">
    <el-form label-position="top">
      <el-form-item label="商品名称">
        <el-input v-model="editForm.title" />
      </el-form-item>
      <el-form-item label="价格(元)">
        <el-input v-model="editForm.priceYuan" inputmode="decimal" />
      </el-form-item>
      <el-form-item label="库存">
        <el-input v-model="editForm.stock" inputmode="numeric" />
      </el-form-item>
      <el-form-item label="商品图片">
        <div class="space-y-3">
          <div v-if="editForm.imageUrl" class="relative w-24 h-24 rounded-xl overflow-hidden bg-surface-container-high border border-outline-variant">
            <img :src="normalizeMediaUrl(editForm.imageUrl)" class="w-full h-full object-cover" />
            <button class="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors" @click="editForm.imageUrl = ''">
              <span class="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          <div v-else class="w-24 h-24 rounded-xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center text-on-surface-variant hover:border-primary/50 hover:text-primary transition-all cursor-pointer relative group">
            <span class="material-symbols-outlined text-2xl mb-1">add_a_photo</span>
            <span class="text-[10px] font-bold">上传图片</span>
            <input type="file" class="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" @change="handleFileUpload" />
          </div>
          <div class="text-[10px] text-on-surface-variant italic">
            支持 JPG/PNG/WebP，图片将存储于服务器 instance/uploads 目录。
          </div>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDateTime, formatMoney, normalizeMediaUrl } from '@/utils/format'

type ProductItem = {
  id: string
  productNo: string
  name: string
  categoryText: string | null
  price: number
  stockQty: number
  status: string
  isActive: boolean
  imageUrl: string | null
  createdAt: string
}

type ProductSummary = {
  totalProducts: number
  activeProducts: number
  monthNewProducts: number
  outOfStockProducts: number
  totalStockQty: number
  totalStockValue: number
}

const loading = ref(false)
const products = ref<ProductItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const summary = ref<ProductSummary | null>(null)

const editVisible = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)
const editForm = ref({ title: '', priceYuan: '', stock: '', imageUrl: '' })
const fallbackProductImg =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAAaLiWXImN5PJWgR5nqpgLsQexKxjhClgcj39smxO1E-4iCKIKqHkthkChKilTi8_3Hc-6qxDKI9qcFLjRkJud9bFx4vdkZ7aPs8NTDjbFBptiLlTuSE9NKTw81WDnQKy0LfyhxccPB_a1hqIz3tD1stoDnDcEDk_ZSvYODQbKrdZVCkhcpZa9ZJy-iMutaUguVvtSVg25Z5EQ3LLD6vRZSF0-RuqXhPyGc0iqwzbvQv5KTJQuODLwaQdY-qvpfVligrP0J07irFM'

const selectedIds = ref<string[]>([])
const isAllSelected = computed(() => products.value.length > 0 && selectedIds.value.length === products.value.length)

function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx > -1) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function toggleSelectAll() {
  if (isAllSelected.value) selectedIds.value = []
  else selectedIds.value = products.value.map((p) => p.id)
}

async function batchOffSale() {
  if (selectedIds.value.length === 0) return
  try {
    await ElMessageBox.confirm(`确认下架选中的 ${selectedIds.value.length} 个商品？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await axios.post('/api/v1/admin/shop/products/batch-status', {
      ids: selectedIds.value,
      is_active: false
    })
    ElMessage.success('批量下架成功')
    selectedIds.value = []
    await load()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '操作失败')
  }
}

async function exportProducts() {
  try {
    const res = await axios.get('/api/v1/admin/shop/products/export', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'products.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (e: any) {
    ElMessage.error('导出失败')
  }
}

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

function stockBarWidth(stockQty: number) {
  if (stockQty <= 0) return '0%'
  if (stockQty < 20) return '25%'
  if (stockQty < 100) return '50%'
  return '75%'
}

async function load() {
  loading.value = true
  try {
    const [listRes, sumRes] = await Promise.all([
      axios.get('/api/v1/admin/shop/products', { params: { page: page.value, pageSize: pageSize.value } }),
      axios.get('/api/v1/admin/shop/products/summary')
    ])
    if (listRes.data?.ok || listRes.data?.code === 0) {
      products.value = listRes.data.data.items
      total.value = listRes.data.data.total
    }
    if (sumRes.data?.ok || sumRes.data?.code === 0) {
      summary.value = sumRes.data.data
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

function openEdit(p: ProductItem) {
  editingId.value = p.id
  editForm.value = {
    title: p.name || '',
    priceYuan: String(p.price ?? ''),
    stock: String(p.stockQty ?? ''),
    imageUrl: p.imageUrl || ''
  }
  editVisible.value = true
}

function openAdd() {
  editingId.value = null
  editForm.value = {
    title: '',
    priceYuan: '',
    stock: '',
    imageUrl: ''
  }
  editVisible.value = true
}

async function handleFileUpload(e: Event) {
  const el = e.target as HTMLInputElement
  const file = el.files?.[0]
  if (!file) return
  
  const formData = new FormData()
  formData.append('file', file)
  
  loading.value = true
  try {
    const res = await axios.post('/api/v1/admin/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    if (res.data?.ok) {
      editForm.value.imageUrl = res.data.data.url
      ElMessage.success('图片上传成功')
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '图片上传失败')
  } finally {
    loading.value = false
  }
}

async function saveEdit() {
  const title = editForm.value.title.trim()
  if (!title) {
    ElMessage.error('请输入商品名称')
    return
  }
  const price = Number(editForm.value.priceYuan)
  const stock = Number(editForm.value.stock)
  if (!Number.isFinite(price) || price < 0) {
    ElMessage.error('价格格式不正确')
    return
  }
  if (!Number.isFinite(stock) || stock < 0) {
    ElMessage.error('库存格式不正确')
    return
  }
  
  const payload = {
    title,
    price_cents: Math.round(price * 100),
    stock: Math.round(stock),
    images_json: JSON.stringify(editForm.value.imageUrl ? [editForm.value.imageUrl] : [], null, 0)
  }
  
  saving.value = true
  try {
    if (editingId.value) {
      await axios.put(`/api/v1/admin/shop/products/${editingId.value}`, payload)
    } else {
      await axios.post('/api/v1/admin/shop/products', payload)
    }
    ElMessage.success('已保存')
    editVisible.value = false
    await load()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function toggleActive(p: ProductItem) {
  const nextActive = !p.isActive
  const action = nextActive ? '上架' : '下架'
  try {
    await ElMessageBox.confirm(`确认${action}该商品？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await axios.put(`/api/v1/admin/shop/products/${p.id}/status`, { is_active: nextActive })
    ElMessage.success(`${action}成功`)
    await load()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || `${action}失败`)
  }
}

async function deleteProduct(p: ProductItem) {
  try {
    await ElMessageBox.confirm('确认物理删除该商品？删除后不可恢复。', '警告', {
      type: 'error',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  try {
    await axios.delete(`/api/v1/admin/shop/products/${p.id}`)
    ElMessage.success('已物理删除')
    await load()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '删除失败')
  }
}

onMounted(load)
</script>

<style scoped>
</style>
