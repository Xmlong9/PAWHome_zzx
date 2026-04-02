<template>
  <div class="p-8 max-w-7xl mx-auto space-y-8 relative">
    <!-- Hero Header -->
    <div class="relative overflow-hidden bg-surface-container-low rounded-[2rem] p-8 flex justify-between items-end">
      <div class="z-10">
        <h2 class="text-3xl font-extrabold text-primary mb-2">欢迎回来，管理员！</h2>
        <p class="text-on-surface-variant max-w-md">这是您爱宠家社区的今日概览。今日新增 {{ stats?.orders?.today ?? 0 }} 笔订单。</p>
      </div>
      <div class="hidden lg:block absolute -right-4 -bottom-12 z-0">
        <div class="w-64 h-64 bg-primary-container/20 rounded-full blur-3xl absolute -right-10 -bottom-10"></div>
        <img
          alt="Pet mascot"
          class="w-56 h-56 object-cover rounded-2xl rotate-3 shadow-xl"
          :src="normalizeMediaUrl('/media/推送2.jpg')"
        />
      </div>
    </div>

    <!-- Metric Cards (Bento Style) -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-sm hover:translate-y-[-4px] transition-transform duration-300 group">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-primary/10 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
            <span class="material-symbols-outlined">person</span>
          </div>
          <span class="text-xs font-bold text-primary px-2 py-1 bg-primary/5 rounded-full">+{{ stats?.users?.today ?? 0 }} 今日</span>
        </div>
        <p class="text-on-surface-variant text-sm font-medium">总用户数</p>
        <h3 class="text-3xl font-bold text-on-surface mt-1">{{ overview?.userCount ?? stats?.users?.total ?? '-' }}</h3>
      </div>
      
      <div class="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-sm hover:translate-y-[-4px] transition-transform duration-300 group">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-secondary-container/50 text-secondary rounded-xl group-hover:bg-secondary group-hover:text-white transition-colors">
            <span class="material-symbols-outlined">article</span>
          </div>
          <span class="text-xs font-bold text-secondary px-2 py-1 bg-secondary/5 rounded-full">+{{ stats?.posts?.today ?? 0 }} 今日</span>
        </div>
        <p class="text-on-surface-variant text-sm font-medium">总发帖数</p>
        <h3 class="text-3xl font-bold text-on-surface mt-1">{{ overview?.postCount ?? stats?.posts?.total ?? '-' }}</h3>
      </div>

      <div class="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-sm hover:translate-y-[-4px] transition-transform duration-300 group">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-tertiary-container/20 text-tertiary rounded-xl group-hover:bg-tertiary group-hover:text-white transition-colors">
            <span class="material-symbols-outlined">shopping_cart</span>
          </div>
          <span class="text-xs font-bold text-tertiary px-2 py-1 bg-tertiary/5 rounded-full">进行中</span>
        </div>
        <p class="text-on-surface-variant text-sm font-medium">总订单数</p>
        <h3 class="text-3xl font-bold text-on-surface mt-1">{{ overview?.orderCount ?? stats?.orders?.total ?? '-' }}</h3>
      </div>

      <div class="metric-gradient p-6 rounded-[1.5rem] shadow-lg hover:translate-y-[-4px] transition-transform duration-300 text-white">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-white/20 rounded-xl">
            <span class="material-symbols-outlined" style='font-variation-settings: "FILL" 1;'>payments</span>
          </div>
          <span class="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">{{ revenueChangeText }}</span>
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
            <button
              class="px-4 py-1.5 text-xs font-bold rounded-full"
              :class="showOrders ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'"
              @click="showOrders = !showOrders"
            >
              订单
            </button>
            <button
              class="px-4 py-1.5 text-xs font-bold rounded-full"
              :class="showRevenue ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'"
              @click="showRevenue = !showRevenue"
            >
              金额
            </button>
          </div>
        </div>
        <div class="h-64 flex items-end justify-between gap-2 px-2 relative pb-2 w-full mt-4">
          <v-chart class="w-full h-full" :option="chartOption" autoresize />
        </div>
      </div>

      <!-- Content Distribution -->
      <div class="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm">
        <h4 class="text-lg font-bold text-on-surface mb-6">内容分布</h4>
        <div class="space-y-6">
          <div v-for="it in contentDist" :key="it.name">
            <div class="flex justify-between text-sm mb-2">
              <span class="text-on-surface-variant">{{ it.name }}</span>
              <span class="font-bold">{{ it.pct }}%</span>
            </div>
            <div class="h-2 bg-surface-container-high rounded-full overflow-hidden">
              <div class="h-full rounded-full" :class="it.colorClass" :style="{ width: `${it.pct}%` }"></div>
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

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { formatMoney, normalizeMediaUrl } from '@/utils/format'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent])

type Overview = {
  userCount: number
  postCount: number
  orderCount: number
  revenue: number
}

type DashboardStats = {
  users: { total: number; today: number }
  posts: { total: number; today: number }
  orders: { total: number; today: number }
  revenue: { total_cents: number; today_cents: number }
  charts: {
    dates: string[]
    revenueTrend: number[]
    orderTrend: number[]
    likesTrend: number[]
    commentsTrend: number[]
    contentFormDistribution: { name: string; value: number }[]
  }
}

const overview = ref<Overview | null>(null)
const stats = ref<DashboardStats | null>(null)
const showOrders = ref(true)
const showRevenue = ref(true)

const revenueChangeText = computed(() => {
  const arr = stats.value?.charts?.revenueTrend || []
  if (arr.length < 2) return '较昨日 —'
  const prev = Number(arr[arr.length - 2] || 0)
  const cur = Number(arr[arr.length - 1] || 0)
  if (prev === 0 && cur === 0) return '较昨日 0%'
  if (prev === 0) return '较昨日 +100%'
  const pct = Math.round(((cur - prev) / prev) * 100)
  const sign = pct > 0 ? '+' : ''
  return `较昨日 ${sign}${pct}%`
})

const likes7d = computed(() => (stats.value?.charts.likesTrend || []).reduce((a, b) => a + b, 0))
const comments7d = computed(() => (stats.value?.charts.commentsTrend || []).reduce((a, b) => a + b, 0))
const topContentForm = computed(() => {
  const dist = stats.value?.charts.contentFormDistribution || []
  if (dist.length === 0) return ''
  const top = dist.reduce((best, cur) => (cur.value > best.value ? cur : best), dist[0])
  return top?.name || ''
})

const orderSeries = computed(() => stats.value?.charts?.orderTrend || [])
const revenueSeries = computed(() => stats.value?.charts?.revenueTrend || [])

const chartOption = computed(() => {
  const dates = stats.value?.charts?.dates || []
  const orderData = orderSeries.value
  const revenueData = revenueSeries.value

  const xAxisData = dates.map((d, i) => {
    return i === dates.length - 1 ? '今天' : d.slice(5)
  })

  const series: any[] = []

  if (showOrders.value) {
    series.push({
      name: '订单',
      type: 'bar',
      data: orderData,
      yAxisIndex: 0,
      barMaxWidth: 30,
      itemStyle: {
        color: '#e67e22',
        borderRadius: [6, 6, 0, 0]
      },
      label: {
        show: true,
        position: 'top',
        color: '#e67e22',
        fontWeight: 'bold',
        formatter: (params: any) => params.value > 0 ? params.value : ''
      }
    })
  }

  if (showRevenue.value) {
    series.push({
      name: '金额',
      type: 'line',
      data: revenueData,
      yAxisIndex: 1,
      smooth: true,
      symbolSize: 8,
      itemStyle: {
        color: '#d35400'
      },
      lineStyle: {
        width: 3,
        color: '#d35400'
      },
      label: {
        show: true,
        position: 'top',
        color: '#d35400',
        fontWeight: 'bold',
        formatter: (params: any) => params.value > 0 ? '¥' + params.value : ''
      }
    })
  }

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    grid: {
      left: '2%',
      right: '2%',
      bottom: '5%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#888',
        fontWeight: 'bold',
        fontSize: 10,
        margin: 16
      }
    },
    yAxis: [
      {
        type: 'value',
        show: false,
        min: 0,
        splitLine: { show: true, lineStyle: { type: 'dashed', color: '#eee' } }
      },
      {
        type: 'value',
        show: false,
        min: 0,
        splitLine: { show: false }
      }
    ],
    series
  }
})

const contentDist = computed(() => {
  const dist = stats.value?.charts?.contentFormDistribution || []
  const total = dist.reduce((sum, it) => sum + (Number(it.value) || 0), 0)
  const colorOf = (name: string) => {
    if (name.includes('图') || name.includes('图文')) return 'bg-secondary'
    if (name.includes('视频')) return 'bg-tertiary'
    return 'bg-primary'
  }
  return dist.map((it) => {
    const v = Number(it.value) || 0
    const pct = total === 0 ? 0 : Math.round((v / total) * 100)
    return { name: it.name, pct, colorClass: colorOf(it.name) }
  })
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
