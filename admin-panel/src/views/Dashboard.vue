<template>
  <div class="p-8 max-w-7xl mx-auto space-y-8 relative">
    <!-- Hero Header -->
    <div class="relative overflow-hidden bg-surface-container-low rounded-[2rem] p-8 flex justify-between items-end">
      <div class="z-10">
        <h2 class="text-3xl font-extrabold text-primary mb-2">欢迎回来，管理员！</h2>
        <p class="text-on-surface-variant max-w-md">这是您爱宠家社区的今日概览。今日有 {{ overview?.orderCount ?? 0 }} 笔订单待处理。</p>
      </div>
      <div class="hidden lg:block absolute -right-4 -bottom-4 z-0">
        <div class="w-64 h-64 bg-primary-container/20 rounded-full blur-3xl absolute -right-10 -bottom-10"></div>
        <img alt="Pet mascot" class="w-56 h-56 object-cover rounded-2xl rotate-3 shadow-xl" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCex6QzbRWzD2LM1Lmt2vbf7L7Vc2D5yjRYEjDYSDRNtBbBqVWAHaNmnT8l3KyjGcFLncuE90mX0PhXUbx3amEQ466sRFTxMGmRXok0gdXr8LwKYlpV9S6W4YV5fx4OSToYk71GLPpJ-LPX0YW_I8OUxOxsS6R6NIauTQMawUhV0MGpvkxZqcfgaCsvtN_TEQVxj90UjGjZWMaijFaL9gTv_-qiByoyBrxh5V2b3M0OOU-PJGqFqBY_32lCcZAMIk6z4RDuHsvSQO8"/>
      </div>
    </div>

    <!-- Metric Cards (Bento Style) -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-sm hover:translate-y-[-4px] transition-transform duration-300 group">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-primary/10 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
            <span class="material-symbols-outlined">person</span>
          </div>
          <span class="text-xs font-bold text-primary px-2 py-1 bg-primary/5 rounded-full">+2 今日</span>
        </div>
        <p class="text-on-surface-variant text-sm font-medium">总用户数</p>
        <h3 class="text-3xl font-bold text-on-surface mt-1">{{ overview?.userCount ?? '-' }}</h3>
      </div>
      
      <div class="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-sm hover:translate-y-[-4px] transition-transform duration-300 group">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-secondary-container/50 text-secondary rounded-xl group-hover:bg-secondary group-hover:text-white transition-colors">
            <span class="material-symbols-outlined">article</span>
          </div>
          <span class="text-xs font-bold text-secondary px-2 py-1 bg-secondary/5 rounded-full">+5 今日</span>
        </div>
        <p class="text-on-surface-variant text-sm font-medium">总发帖数</p>
        <h3 class="text-3xl font-bold text-on-surface mt-1">{{ overview?.postCount ?? '-' }}</h3>
      </div>

      <div class="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-sm hover:translate-y-[-4px] transition-transform duration-300 group">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-tertiary-container/20 text-tertiary rounded-xl group-hover:bg-tertiary group-hover:text-white transition-colors">
            <span class="material-symbols-outlined">shopping_cart</span>
          </div>
          <span class="text-xs font-bold text-tertiary px-2 py-1 bg-tertiary/5 rounded-full">进行中</span>
        </div>
        <p class="text-on-surface-variant text-sm font-medium">总订单数</p>
        <h3 class="text-3xl font-bold text-on-surface mt-1">{{ overview?.orderCount ?? '-' }}</h3>
      </div>

      <div class="metric-gradient p-6 rounded-[1.5rem] shadow-lg hover:translate-y-[-4px] transition-transform duration-300 text-white">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-white/20 rounded-xl">
            <span class="material-symbols-outlined" style='font-variation-settings: "FILL" 1;'>payments</span>
          </div>
          <span class="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">较昨日 +12%</span>
        </div>
        <p class="text-white/80 text-sm font-medium">总营收额</p>
        <h3 class="text-3xl font-bold mt-1">¥{{ overview?.revenue != null ? formatMoney(overview.revenue) : '-' }}</h3>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Revenue Trend -->
      <div class="lg:col-span-2 bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm">
        <div class="flex justify-between items-center mb-8">
          <div>
            <h4 class="text-lg font-bold text-on-surface">营收与订单趋势</h4>
            <p class="text-sm text-on-surface-variant">过去7天的业务增长曲线</p>
          </div>
          <div class="flex gap-2">
            <button class="px-4 py-1.5 text-xs font-bold bg-surface-container-high rounded-full">订单</button>
            <button class="px-4 py-1.5 text-xs font-bold bg-primary text-white rounded-full">金额</button>
          </div>
        </div>
        <!-- Mock Chart Visualization -->
        <div class="h-64 flex items-end justify-between gap-2 px-2 relative">
          <div class="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none opacity-20">
            <div class="border-b border-outline"></div>
            <div class="border-b border-outline"></div>
            <div class="border-b border-outline"></div>
            <div class="border-b border-outline"></div>
          </div>
          <div class="flex-1 flex flex-col items-center group">
            <div class="w-full max-w-[40px] bg-primary-container/20 rounded-t-lg h-[40%] group-hover:bg-primary-container transition-all"></div>
            <span class="mt-4 text-[10px] text-on-surface-variant font-bold">10-18</span>
          </div>
          <div class="flex-1 flex flex-col items-center group">
            <div class="w-full max-w-[40px] bg-primary-container/20 rounded-t-lg h-[55%] group-hover:bg-primary-container transition-all"></div>
            <span class="mt-4 text-[10px] text-on-surface-variant font-bold">10-19</span>
          </div>
          <div class="flex-1 flex flex-col items-center group">
            <div class="w-full max-w-[40px] bg-primary-container/20 rounded-t-lg h-[35%] group-hover:bg-primary-container transition-all"></div>
            <span class="mt-4 text-[10px] text-on-surface-variant font-bold">10-20</span>
          </div>
          <div class="flex-1 flex flex-col items-center group">
            <div class="w-full max-w-[40px] bg-primary-container/20 rounded-t-lg h-[80%] group-hover:bg-primary-container transition-all"></div>
            <span class="mt-4 text-[10px] text-on-surface-variant font-bold">10-21</span>
          </div>
          <div class="flex-1 flex flex-col items-center group">
            <div class="w-full max-w-[40px] bg-primary-container/20 rounded-t-lg h-[65%] group-hover:bg-primary-container transition-all"></div>
            <span class="mt-4 text-[10px] text-on-surface-variant font-bold">10-22</span>
          </div>
          <div class="flex-1 flex flex-col items-center group">
            <div class="w-full max-w-[40px] bg-primary-container/20 rounded-t-lg h-[45%] group-hover:bg-primary-container transition-all"></div>
            <span class="mt-4 text-[10px] text-on-surface-variant font-bold">10-23</span>
          </div>
          <div class="flex-1 flex flex-col items-center group">
            <div class="w-full max-w-[40px] bg-primary rounded-t-lg h-[95%] shadow-[0_0_15px_rgba(230,126,34,0.3)]"></div>
            <span class="mt-4 text-[10px] text-primary font-bold">今天</span>
          </div>
        </div>
      </div>

      <!-- Content Distribution -->
      <div class="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm">
        <h4 class="text-lg font-bold text-on-surface mb-6">内容分布</h4>
        <div class="space-y-6">
          <div>
            <div class="flex justify-between text-sm mb-2">
              <span class="text-on-surface-variant">纯文本</span>
              <span class="font-bold">45%</span>
            </div>
            <div class="h-2 bg-surface-container-high rounded-full overflow-hidden">
              <div class="h-full bg-primary rounded-full w-[45%]"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-sm mb-2">
              <span class="text-on-surface-variant">图文</span>
              <span class="font-bold">35%</span>
            </div>
            <div class="h-2 bg-surface-container-high rounded-full overflow-hidden">
              <div class="h-full bg-secondary rounded-full w-[35%]"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-sm mb-2">
              <span class="text-on-surface-variant">视频</span>
              <span class="font-bold">20%</span>
            </div>
            <div class="h-2 bg-surface-container-high rounded-full overflow-hidden">
              <div class="h-full bg-tertiary rounded-full w-[20%]"></div>
            </div>
          </div>
        </div>
        <div class="mt-8 pt-6 border-t border-surface-container-high">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined">edit_note</span>
            </div>
            <div>
              <p class="text-xs text-on-surface-variant">内容形态占比最高</p>
              <p class="font-bold text-on-surface">{{ topContentForm || '-' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Interaction Performance -->
    <section class="bg-surface-container-low p-8 rounded-[2rem] mt-8">
      <div class="flex items-center justify-between mb-8">
        <h4 class="text-xl font-bold text-on-surface">互动表现</h4>
        <span class="text-sm text-primary font-medium cursor-pointer hover:underline">查看详细报表</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white p-6 rounded-2xl flex items-center gap-6">
          <div class="w-16 h-16 rounded-2xl bg-[#ffeee0] flex items-center justify-center text-primary">
            <span class="material-symbols-outlined text-3xl" style='font-variation-settings: "FILL" 1;'>favorite</span>
          </div>
          <div>
            <p class="text-on-surface-variant text-sm font-medium">近7日点赞</p>
            <h5 class="text-3xl font-black text-on-surface">{{ likes7d }}</h5>
          </div>
        </div>
        <div class="bg-white p-6 rounded-2xl flex items-center gap-6">
          <div class="w-16 h-16 rounded-2xl bg-[#e5f1ff] flex items-center justify-center text-blue-600">
            <span class="material-symbols-outlined text-3xl" style='font-variation-settings: "FILL" 1;'>forum</span>
          </div>
          <div>
            <p class="text-on-surface-variant text-sm font-medium">近7日评论</p>
            <h5 class="text-3xl font-black text-on-surface">{{ comments7d }}</h5>
          </div>
        </div>
        <div class="bg-white p-6 rounded-2xl flex items-center gap-6">
          <div class="w-16 h-16 rounded-2xl bg-[#f0fff4] flex items-center justify-center text-green-600">
            <span class="material-symbols-outlined text-3xl" style='font-variation-settings: "FILL" 1;'>share</span>
          </div>
          <div>
            <p class="text-on-surface-variant text-sm font-medium">分享数据</p>
            <h5 class="text-3xl font-black text-on-surface">—</h5>
          </div>
        </div>
      </div>
    </section>

    <!-- FAB for quick action -->
    <button class="fixed bottom-8 right-8 w-14 h-14 metric-gradient text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50">
      <span class="material-symbols-outlined">add</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { formatMoney } from '@/utils/format'

type Overview = {
  userCount: number
  postCount: number
  orderCount: number
  revenue: number
}

type DashboardStats = {
  charts: {
    likesTrend: number[]
    commentsTrend: number[]
    contentFormDistribution: { name: string; value: number }[]
  }
}

const overview = ref<Overview | null>(null)
const stats = ref<DashboardStats | null>(null)

const likes7d = computed(() => (stats.value?.charts.likesTrend || []).reduce((a, b) => a + b, 0))
const comments7d = computed(() => (stats.value?.charts.commentsTrend || []).reduce((a, b) => a + b, 0))
const topContentForm = computed(() => {
  const dist = stats.value?.charts.contentFormDistribution || []
  if (dist.length === 0) return ''
  const top = dist.reduce((best, cur) => (cur.value > best.value ? cur : best), dist[0])
  return top?.name || ''
})

onMounted(async () => {
  const [o, s] = await Promise.all([
    axios.get('/api/v1/admin/dashboard/overview'),
    axios.get('/api/v1/admin/dashboard/stats')
  ])
  if (o.data?.ok || o.data?.code === 0) overview.value = o.data.data
  if (s.data?.ok || s.data?.code === 0) stats.value = s.data.data
})
</script>

<style scoped>
</style>
