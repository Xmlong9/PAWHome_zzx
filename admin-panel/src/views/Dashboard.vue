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
          <div class="stat-icon" :style="{ backgroundColor: stat.bgColor, color: stat.color }">
            <el-icon><component :is="stat.icon" /></el-icon>
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
      color: '#40c9c6',
      bgColor: 'rgba(64, 201, 198, 0.1)'
    },
    {
      title: '总帖子数',
      value: stats.value.posts.total,
      today: stats.value.posts.today,
      icon: 'Document',
      color: '#36a3f7',
      bgColor: 'rgba(54, 163, 247, 0.1)'
    },
    {
      title: '总订单数',
      value: stats.value.orders.total,
      today: stats.value.orders.today,
      icon: 'ShoppingCart',
      color: '#f4516c',
      bgColor: 'rgba(244, 81, 108, 0.1)'
    },
    {
      title: '总营收',
      value: '￥' + (stats.value.revenue.total_cents / 100).toFixed(2),
      today: '￥' + (stats.value.revenue.today_cents / 100).toFixed(2),
      icon: 'Money',
      color: '#34bfa3',
      bgColor: 'rgba(52, 191, 163, 0.1)'
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
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['营收 (元)', '订单数'],
        textStyle: { color: getTextColor() },
        top: '0%'
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: [
        {
          type: 'category',
          data: chartData.dates,
          axisPointer: { type: 'shadow' },
          axisLine: { lineStyle: { color: getTextColor() } }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: '营收',
          axisLine: { lineStyle: { color: getTextColor() } },
          splitLine: { lineStyle: { color: isDark.value ? '#333' : '#eee' } }
        },
        {
          type: 'value',
          name: '订单数',
          axisLine: { lineStyle: { color: getTextColor() } },
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
              { offset: 0, color: '#83bff6' },
              { offset: 0.5, color: '#188df0' },
              { offset: 1, color: '#188df0' }
            ]),
            borderRadius: [4, 4, 0, 0]
          },
          animationEasing: 'elasticOut',
          animationDelay: (idx: number) => idx * 10
        },
        {
          name: '订单数',
          type: 'line',
          yAxisIndex: 1,
          data: chartData.orderTrend,
          smooth: true,
          symbolSize: 8,
          itemStyle: { color: '#f4516c' },
          lineStyle: { width: 3, shadowColor: 'rgba(0,0,0,0.3)', shadowBlur: 10, shadowOffsetY: 8 },
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
      tooltip: { trigger: 'item', formatter: '{b} : {c} ({d}%)' },
      legend: { bottom: '0%', textStyle: { color: getTextColor() } },
      color: ['#5470c6', '#91cc75', '#fac858', '#ee6666'],
      series: [
        {
          name: '内容形态',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: isDark.value ? '#1d1e1f' : '#fff',
            borderWidth: 2
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
      tooltip: { trigger: 'axis' },
      legend: {
        data: ['点赞数', '评论数'],
        textStyle: { color: getTextColor() },
        top: '0%'
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: chartData.dates,
        axisLine: { lineStyle: { color: getTextColor() } }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: getTextColor() } },
        splitLine: { lineStyle: { color: isDark.value ? '#333' : '#eee', type: 'dashed' } }
      },
      series: [
        {
          name: '点赞数',
          type: 'line',
          data: chartData.likesTrend,
          smooth: true,
          itemStyle: { color: '#ee6666' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(238, 102, 102, 0.5)' },
              { offset: 1, color: 'rgba(238, 102, 102, 0.1)' }
            ])
          },
          animationEasing: 'cubicOut'
        },
        {
          name: '评论数',
          type: 'line',
          data: chartData.commentsTrend,
          smooth: true,
          itemStyle: { color: '#5470c6' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(84, 112, 198, 0.5)' },
              { offset: 1, color: 'rgba(84, 112, 198, 0.1)' }
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
  border-radius: 12px;
  border: none;
  transition: transform 0.3s, box-shadow 0.3s;
  margin-bottom: 20px;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stat-icon {
  font-size: 36px;
  width: 70px;
  height: 70px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 16px;
  margin-right: 15px;
  transition: all 0.3s ease;
}

.stat-card:hover .stat-icon {
  transform: scale(1.1);
}

.stat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stat-title {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.stat-value {
  color: var(--el-text-color-primary);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-desc {
  color: var(--el-text-color-regular);
  font-size: 13px;
  margin-top: 8px;
  display: flex;
  align-items: center;
}

.today-value {
  color: #67c23a;
  font-weight: 600;
  margin-left: 5px;
}

.chart-row {
  margin-bottom: 20px;
}

.chart-card {
  border-radius: 12px;
  border: none;
  margin-bottom: 20px;
  background-color: var(--el-bg-color-overlay);
  overflow: hidden;
}

.chart-card .card-header {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.chart-wrapper {
  height: 350px;
  width: 100%;
  position: relative;
}

.small-chart {
  height: 300px;
}

/* Dark Mode Overrides */
html.dark .stat-card {
  background-color: #1d1e1f;
}
html.dark .chart-card {
  background-color: #1d1e1f;
}
html.dark .today-value {
  color: #85ce61;
}
</style>
