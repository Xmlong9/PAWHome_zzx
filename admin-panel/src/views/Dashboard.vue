<template>
  <div class="dashboard-container" :class="{ 'is-dark': isDark }">
    <div class="dashboard-header">
      <h2>数据看板</h2>
      <el-switch
        v-model="isDark"
        class="theme-switch"
        inline-prompt
        active-icon="Moon"
        inactive-icon="Sunny"
        @change="toggleTheme"
      />
    </div>
    
    <!-- 顶部数据卡片 -->
    <el-row :gutter="20" class="stat-cards" v-loading="loading">
      <el-col :xs="24" :sm="12" :md="6" v-for="(stat, index) in statCards" :key="index">
        <el-card shadow="hover" class="stat-card" :class="'card-' + index">
          <div class="stat-icon-wrapper" :style="{ background: stat.bgColor, boxShadow: stat.shadow }">
            <el-icon class="stat-icon" :style="{ color: stat.color }"><component :is="stat.icon" /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-title">{{ stat.title }}</div>
            <div class="stat-value">
              <span class="value-text">{{ stat.value }}</span>
            </div>
            <div class="stat-desc">
              今日新增: <span class="today-value">+{{ stat.today }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 中部图表：营收与订单趋势 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="24">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span>近 7 天营收与订单趋势</span>
            </div>
          </template>
          <div class="chart-wrapper" ref="trendChartRef"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 底部图表：服务分布、内容形态、社区互动趋势 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :xs="24" :md="8">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span>内容形态分布</span>
            </div>
          </template>
          <div class="chart-wrapper small-chart" ref="contentPieRef"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="16">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span>近 7 天社区互动趋势 (点赞/评论)</span>
            </div>
          </template>
          <div class="chart-wrapper small-chart" ref="engagementLineRef"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { useDark, useToggle } from '@vueuse/core'

const isDark = useDark()
const toggleTheme = useToggle(isDark)

const stats = ref<any>(null)
const loading = ref(false)

const trendChartRef = ref<HTMLElement | null>(null)
const contentPieRef = ref<HTMLElement | null>(null)
const engagementLineRef = ref<HTMLElement | null>(null)

let trendChart: echarts.ECharts | null = null
let contentPie: echarts.ECharts | null = null
let engagementLine: echarts.ECharts | null = null

const statCards = computed(() => {
  if (!stats.value) return []
  return [
    {
      title: '总用户数',
      value: stats.value.users.total,
      today: stats.value.users.today,
      icon: 'User',
      color: '#38bdf8',
      bgColor: 'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(56,189,248,0.05) 100%)',
      shadow: '0 4px 12px rgba(56,189,248,0.2)'
    },
    {
      title: '总帖子数',
      value: stats.value.posts.total,
      today: stats.value.posts.today,
      icon: 'Document',
      color: '#818cf8',
      bgColor: 'linear-gradient(135deg, rgba(129,140,248,0.15) 0%, rgba(129,140,248,0.05) 100%)',
      shadow: '0 4px 12px rgba(129,140,248,0.2)'
    },
    {
      title: '总订单数',
      value: stats.value.orders.total,
      today: stats.value.orders.today,
      icon: 'ShoppingCart',
      color: '#f472b6',
      bgColor: 'linear-gradient(135deg, rgba(244,114,182,0.15) 0%, rgba(244,114,182,0.05) 100%)',
      shadow: '0 4px 12px rgba(244,114,182,0.2)'
    },
    {
      title: '总营收',
      value: '￥' + (stats.value.revenue.total_cents / 100).toFixed(2),
      today: '￥' + (stats.value.revenue.today_cents / 100).toFixed(2),
      icon: 'Money',
      color: '#34d399',
      bgColor: 'linear-gradient(135deg, rgba(52,211,153,0.15) 0%, rgba(52,211,153,0.05) 100%)',
      shadow: '0 4px 12px rgba(52,211,153,0.2)'
    }
  ]
})

const fetchStats = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/v1/admin/dashboard/stats', {
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
    })
    if (res.data.ok || res.data.code === 0) {
      stats.value = res.data.data
      await nextTick()
      initCharts()
    } else {
      ElMessage.error(res.data.message || '获取数据看板数据失败')
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '网络错误')
  } finally {
    loading.value = false
  }
}

const getChartTheme = () => isDark.value ? 'dark' : 'light'
const getTextColor = () => isDark.value ? '#E5EAF3' : '#333'

const initCharts = () => {
  if (!stats.value || !stats.value.charts) return
  const chartData = stats.value.charts

  // 1. Trend Chart (Line + Bar)
  if (trendChartRef.value) {
    if (trendChart) trendChart.dispose()
    trendChart = echarts.init(trendChartRef.value)
    trendChart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: isDark.value ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: isDark.value ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        textStyle: { color: getTextColor() },
        backdropFilter: 'blur(10px)',
        padding: [12, 16],
        borderRadius: 8
      },
      legend: {
        data: ['营收 (元)', '订单数'],
        textStyle: { color: getTextColor() },
        top: '0%',
        icon: 'circle'
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: [
        {
          type: 'category',
          data: chartData.dates,
          axisPointer: { type: 'shadow' },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#94a3b8', margin: 16 }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: '营收',
          nameTextStyle: { color: '#94a3b8', padding: [0, 0, 0, 20] },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#94a3b8' },
          splitLine: { lineStyle: { color: isDark.value ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', type: 'dashed' } }
        },
        {
          type: 'value',
          name: '订单数',
          nameTextStyle: { color: '#94a3b8', padding: [0, 20, 0, 0] },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#94a3b8' },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: '营收 (元)',
          type: 'bar',
          data: chartData.revenueTrend,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#38bdf8' },
              { offset: 1, color: '#818cf8' }
            ]),
            borderRadius: [6, 6, 0, 0]
          },
          barWidth: '35%',
          animationEasing: 'elasticOut',
          animationDelay: (idx: number) => idx * 10
        },
        {
          name: '订单数',
          type: 'line',
          yAxisIndex: 1,
          data: chartData.orderTrend,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: { 
            color: '#f472b6',
            borderWidth: 2,
            borderColor: '#fff'
          },
          lineStyle: { width: 4, shadowColor: 'rgba(244,114,182,0.3)', shadowBlur: 10, shadowOffsetY: 5 },
          animationEasing: 'cubicOut',
          animationDelay: (idx: number) => idx * 100 + 100
        }
      ]
    })
  }

  // 2. Content Form Pie Chart
  if (contentPieRef.value) {
    if (contentPie) contentPie.dispose()
    contentPie = echarts.init(contentPieRef.value)
    contentPie.setOption({
      backgroundColor: 'transparent',
      tooltip: { 
        trigger: 'item', 
        formatter: '{b} : {c} ({d}%)',
        backgroundColor: isDark.value ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: isDark.value ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        textStyle: { color: getTextColor() },
        padding: [12, 16],
        borderRadius: 8
      },
      legend: { bottom: '0%', icon: 'circle', textStyle: { color: '#94a3b8' } },
      color: ['#38bdf8', '#818cf8', '#34d399', '#f472b6'],
      series: [
        {
          name: '内容形态',
          type: 'pie',
          radius: ['45%', '75%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: isDark.value ? '#1e293b' : '#fff',
            borderWidth: 3
          },
          label: { show: false, position: 'center' },
          emphasis: {
            label: { show: true, fontSize: 18, fontWeight: 'bold' }
          },
          labelLine: { show: false },
          data: chartData.contentFormDistribution,
          animationType: 'scale',
          animationEasing: 'elasticOut',
          animationDelay: (idx: number) => Math.random() * 200
        }
      ]
    })
  }

  // 3. Engagement Line Chart
  if (engagementLineRef.value) {
    if (engagementLine) engagementLine.dispose()
    engagementLine = echarts.init(engagementLineRef.value)
    engagementLine.setOption({
      backgroundColor: 'transparent',
      tooltip: { 
        trigger: 'axis',
        backgroundColor: isDark.value ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: isDark.value ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        textStyle: { color: getTextColor() },
        padding: [12, 16],
        borderRadius: 8
      },
      legend: {
        data: ['点赞数', '评论数'],
        textStyle: { color: getTextColor() },
        top: '0%',
        icon: 'circle'
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: chartData.dates,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', margin: 16 }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: isDark.value ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', type: 'dashed' } }
      },
      series: [
        {
          name: '点赞数',
          type: 'line',
          data: chartData.likesTrend,
          smooth: true,
          showSymbol: false,
          itemStyle: { color: '#f472b6' },
          lineStyle: { width: 3 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(244, 114, 182, 0.3)' },
              { offset: 1, color: 'rgba(244, 114, 182, 0)' }
            ])
          },
          animationEasing: 'cubicOut'
        },
        {
          name: '评论数',
          type: 'line',
          data: chartData.commentsTrend,
          smooth: true,
          showSymbol: false,
          itemStyle: { color: '#38bdf8' },
          lineStyle: { width: 3 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(56, 189, 248, 0.3)' },
              { offset: 1, color: 'rgba(56, 189, 248, 0)' }
            ])
          },
          animationEasing: 'cubicOut'
        }
      ]
    })
  }
}

// 监听主题变化，重绘图表
watch(isDark, () => {
  initCharts()
})

const handleResize = () => {
  trendChart?.resize()
  contentPie?.resize()
  engagementLine?.resize()
}

onMounted(() => {
  fetchStats()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  contentPie?.dispose()
  engagementLine?.dispose()
})
</script>

<style scoped>
.dashboard-container {
  padding: 10px;
  transition: all 0.3s ease;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.dashboard-header h2 {
  margin: 0;
  color: var(--el-text-color-primary);
}

.stat-cards {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.02);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 20px;
  background: #ffffff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
}

.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  padding: 24px;
}

.stat-icon-wrapper {
  width: 64px;
  height: 64px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 16px;
  margin-right: 20px;
  transition: all 0.3s ease;
}

.stat-icon {
  font-size: 32px;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.stat-card:hover .stat-icon {
  transform: scale(1.15) rotate(5deg);
}

.stat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stat-title {
  color: #64748b;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  color: #0f172a;
  font-size: 32px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.stat-desc {
  color: #94a3b8;
  font-size: 13px;
  margin-top: 8px;
  display: flex;
  align-items: center;
  font-weight: 500;
}

.today-value {
  color: #10b981;
  font-weight: 700;
  margin-left: 6px;
  background: rgba(16, 185, 129, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.chart-row {
  margin-bottom: 24px;
}

.chart-card {
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.02);
  margin-bottom: 20px;
  background-color: #ffffff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  transition: box-shadow 0.3s;
}
.chart-card:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
}

.chart-card .card-header {
  font-weight: 700;
  font-size: 16px;
  color: #1e293b;
  display: flex;
  align-items: center;
}
.chart-card .card-header::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 16px;
  background: linear-gradient(to bottom, #38bdf8, #818cf8);
  border-radius: 2px;
  margin-right: 10px;
}

.chart-wrapper {
  height: 380px;
  width: 100%;
  position: relative;
}

.small-chart {
  height: 320px;
}

/* Dark Mode Overrides */
html.dark .stat-card {
  background-color: #1e293b;
  border-color: rgba(255,255,255,0.05);
}
html.dark .stat-title {
  color: #94a3b8;
}
html.dark .stat-value {
  color: #f8fafc;
}
html.dark .chart-card {
  background-color: #1e293b;
  border-color: rgba(255,255,255,0.05);
}
html.dark .chart-card .card-header {
  color: #f8fafc;
}
html.dark .today-value {
  color: #34d399;
  background: rgba(52, 211, 153, 0.15);
}
</style>
