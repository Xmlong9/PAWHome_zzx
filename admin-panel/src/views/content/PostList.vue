<template>
  <div class="p-8 space-y-8">
    <!-- Header Section -->
    <div class="flex justify-between items-end">
      <div>
        <h2 class="text-3xl font-extrabold text-primary mb-2 tracking-tight">帖子管理</h2>
        <p class="text-on-surface-variant">监控社区活力，筛选优质萌宠内容。</p>
      </div>
      <div class="flex gap-3">
        <button class="px-5 py-2.5 bg-surface-container-highest text-on-surface-variant font-semibold rounded-xl hover:bg-surface-container-high transition-colors flex items-center gap-2">
          <span class="material-symbols-outlined text-lg">filter_list</span> 筛选
        </button>
        <button class="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-container text-white font-semibold rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center gap-2">
          <span class="material-symbols-outlined text-lg">add</span> 发布官方公告
        </button>
      </div>
    </div>
    
    <!-- Bento Content Table -->
    <section class="bg-surface-container-low rounded-[2rem] p-6 shadow-sm">
      <div class="overflow-hidden rounded-xl bg-surface-container-lowest">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-surface-container-high/50 text-on-surface-variant text-xs uppercase tracking-widest font-bold">
              <th class="px-6 py-4">帖子ID</th>
              <th class="px-6 py-4">作者</th>
              <th class="px-6 py-4">内容预览</th>
              <th class="px-6 py-4">数据统计</th>
              <th class="px-6 py-4">发布时间</th>
              <th class="px-6 py-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-container-low">
            <tr v-for="p in posts" :key="p.id" class="hover:bg-surface-container-low/30 transition-colors group">
              <td class="px-6 py-5 font-mono text-xs text-on-surface-variant">#{{ p.id.slice(0, 8) }}</td>
              <td class="px-6 py-5">
                <div class="flex items-center gap-3">
                  <img :alt="p.author.name" class="w-8 h-8 rounded-full object-cover" :src="p.author.avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBIvxHKmr7So5dzh74C3QDP_wm6ScBxEEmIZESJ-KMlch-N0WlhPN21rQSCTYur5RiGQiq99fT-QGXoE8DLsKwei17IqjbGCjHNWqNmn0wxkKJC2bniAS-EdCWgb1jllMMa5hwNEO3aWFz3LYDGnb8er0SH89BN8_eJSBo70gJeDfW49ZuO2YcuXIivbhkdPVUo0fed34ldPQuVcB8qQwB9BxsQKjD0MCFqB_WP4p6jp9RiGbFZo3B5IHOzjqUW4GTaEI0HzHMhKdY'"/>
                  <span class="font-medium">{{ p.author.name }}</span>
                </div>
              </td>
              <td class="px-6 py-5 max-w-xs">
                <div class="flex flex-col gap-1">
                  <p class="text-sm line-clamp-1 font-medium">{{ p.contentPreview }}</p>
                  <div class="flex gap-2">
                    <span v-if="p.mediaStats.imageCount > 0" class="inline-flex items-center gap-1 text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full"><span class="material-symbols-outlined text-[12px]">image</span> {{ p.mediaStats.imageCount }}</span>
                    <span v-if="p.mediaStats.videoCount > 0" class="inline-flex items-center gap-1 text-[10px] bg-tertiary-container/10 text-tertiary px-2 py-0.5 rounded-full"><span class="material-symbols-outlined text-[12px]">videocam</span> {{ p.mediaStats.videoCount }}</span>
                    <span v-if="p.mediaStats.imageCount === 0 && p.mediaStats.videoCount === 0" class="inline-flex items-center gap-1 text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full"><span class="material-symbols-outlined text-[12px]">description</span> 纯文字</span>
                  </div>
                </div>
              </td>
              <td class="px-6 py-5">
                <div class="flex gap-4">
                  <div class="flex items-center gap-1 text-sm">
                    <span class="material-symbols-outlined text-primary text-lg" style="font-variation-settings: 'FILL' 1;">favorite</span>
                    <span class="font-bold">{{ formatCount(p.engagement.likeCount) }}</span>
                  </div>
                  <div class="flex items-center gap-1 text-sm">
                    <span class="material-symbols-outlined text-secondary text-lg">chat_bubble</span>
                    <span class="font-bold">{{ formatCount(p.engagement.commentCount) }}</span>
                  </div>
                </div>
              </td>
              <td class="px-6 py-5 text-sm text-on-surface-variant">{{ formatDateTime(p.publishedAt) }}</td>
              <td class="px-6 py-5">
                <div class="flex justify-center gap-2">
                  <button class="p-2 text-on-surface-variant hover:text-primary transition-colors"><span class="material-symbols-outlined">visibility</span></button>
                  <button class="p-2 text-on-surface-variant hover:text-primary transition-colors"><span class="material-symbols-outlined">edit</span></button>
                  <button class="p-2 text-on-surface-variant hover:text-error transition-colors"><span class="material-symbols-outlined">delete</span></button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && posts.length === 0" class="bg-surface-container-lowest">
              <td colspan="6" class="px-6 py-10 text-center text-sm text-on-surface-variant">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-4 flex justify-between items-center px-4">
        <p class="text-xs text-on-surface-variant">显示 {{ start }} 到 {{ end }}，共 {{ total }} 条内容</p>
        <div class="flex gap-2">
          <button class="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-highest text-on-surface-variant"><span class="material-symbols-outlined text-sm">chevron_left</span></button>
          <button class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-white font-bold text-xs">1</button>
          <button class="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-highest transition-colors font-bold text-xs">2</button>
          <button class="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-highest transition-colors font-bold text-xs">3</button>
          <button class="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-highest text-on-surface-variant"><span class="material-symbols-outlined text-sm">chevron_right</span></button>
        </div>
      </div>
    </section>

    <!-- Bottom Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Stat Card: New Posts -->
      <div class="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-sm border border-outline-variant/10 flex flex-col relative overflow-hidden group">
        <div class="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12 transition-transform group-hover:rotate-0">
          <span class="material-symbols-outlined text-6xl text-primary">post_add</span>
        </div>
        <h4 class="text-sm font-bold text-on-surface-variant mb-4 uppercase tracking-wider">今日新增帖子</h4>
        <div class="flex items-baseline gap-2">
          <span class="text-4xl font-black text-on-surface tracking-tighter">1,024</span>
          <span class="text-sm font-bold text-tertiary bg-tertiary-container/10 px-2 py-0.5 rounded-full">+24 增长</span>
        </div>
        <div class="mt-6 flex items-end gap-1 h-12">
          <div class="flex-1 bg-primary/10 rounded-t-sm h-[40%]"></div>
          <div class="flex-1 bg-primary/20 rounded-t-sm h-[60%]"></div>
          <div class="flex-1 bg-primary/30 rounded-t-sm h-[50%]"></div>
          <div class="flex-1 bg-primary/40 rounded-t-sm h-[80%]"></div>
          <div class="flex-1 bg-primary/50 rounded-t-sm h-[70%]"></div>
          <div class="flex-1 bg-primary/70 rounded-t-sm h-[90%]"></div>
          <div class="flex-1 bg-primary rounded-t-sm h-[100%]"></div>
        </div>
      </div>
      
      <!-- Stat Card: Content Diversity Chart -->
      <div class="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-sm border border-outline-variant/10 flex flex-col">
        <h4 class="text-sm font-bold text-on-surface-variant mb-4 uppercase tracking-wider">内容多样性</h4>
        <div class="flex-1 flex flex-col justify-center gap-4">
          <div class="space-y-1">
            <div class="flex justify-between text-xs font-bold mb-1">
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-primary"></span> 图片帖子</span>
              <span>65%</span>
            </div>
            <div class="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div class="bg-primary h-full rounded-full" style="width: 65%"></div>
            </div>
          </div>
          <div class="space-y-1">
            <div class="flex justify-between text-xs font-bold mb-1">
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-tertiary"></span> 视频帖子</span>
              <span>25%</span>
            </div>
            <div class="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div class="bg-tertiary h-full rounded-full" style="width: 25%"></div>
            </div>
          </div>
          <div class="space-y-1">
            <div class="flex justify-between text-xs font-bold mb-1">
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-secondary"></span> 纯文字</span>
              <span>10%</span>
            </div>
            <div class="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div class="bg-secondary h-full rounded-full" style="width: 10%"></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Stat Card: Top Author -->
      <div class="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-sm border border-outline-variant/10 flex flex-col">
        <h4 class="text-sm font-bold text-on-surface-variant mb-4 uppercase tracking-wider">最活跃作者</h4>
        <div class="flex-1 flex items-center gap-4">
          <div class="relative">
            <img alt="金毛墩子" class="w-20 h-20 rounded-[1.5rem] object-cover ring-4 ring-primary-container/20" data-alt="portrait of a cheerful man in casual attire, looking directly at the camera with a friendly expression" src="https://lh3.googleusercontent.com/aida-public/AB6AXuByhY3cixa9JkJswX0qHVINhv_dXK05j_0zIUUMpJkOM6gqvbPxlm0Lg10IymmZsTF5lPY0acwgpp8zYbi0ijtinuFpCHYUg6xzxTY0uUiCfpCpcf66_ngOsP4zwf4PwY9c8l3KwjZoAsgi43SE7ErM3WRXcHUPwnWGbKIRsalo0G-K511lVTvQkd9lYJEP1DPhKmy0HgVbj6q8lH2VvjidtXLkrfpZ50EEPPVsAwoJ-iAY3ui0lOL1j4Zo8CJFLk7tGAhvcNYqtm4"/>
            <div class="absolute -bottom-2 -right-2 bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
              <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">workspace_premium</span>
            </div>
          </div>
          <div class="overflow-hidden">
            <h5 class="text-xl font-bold text-on-surface">金毛墩子</h5>
            <p class="text-xs text-on-surface-variant mb-2">本周发布 18 篇 | 获赞 4.2k</p>
            <button class="text-xs font-extrabold text-primary hover:underline flex items-center gap-1">
              查看主页 <span class="material-symbols-outlined text-xs">arrow_forward_ios</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { formatDateTime } from '@/utils/format'

type PostItem = {
  id: string
  author: { id: string; name: string; avatarUrl: string | null }
  contentPreview: string
  mediaStats: { imageCount: number; videoCount: number; textType: string }
  engagement: { likeCount: number; commentCount: number }
  publishedAt: string
}

const loading = ref(false)
const posts = ref<PostItem[]>([])
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

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

async function load() {
  loading.value = true
  try {
    const res = await axios.get('/api/v1/admin/content/posts', { params: { page: page.value, pageSize: pageSize.value } })
    if (res.data?.ok || res.data?.code === 0) {
      posts.value = res.data.data.items
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
