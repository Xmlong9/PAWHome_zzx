<template>
  <section class="p-8 space-y-8 animate-in fade-in duration-700">
    <!-- Header Section with Breadcrumbs -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2 text-xs font-bold text-outline tracking-wider">
          <span>内容管理</span>
          <span class="material-symbols-outlined text-[14px]" data-icon="chevron_right">chevron_right</span>
          <span class="text-primary">评论管理</span>
        </div>
        <h2 class="text-3xl font-extrabold text-on-surface flex items-center gap-3 tracking-tight">
          互动社区反馈
          <span class="px-2.5 py-0.5 bg-orange-100 text-primary text-xs rounded-full">{{ todayComments }} 条新评论</span>
        </h2>
      </div>
    </div>

    <!-- Bento Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="md:col-span-2 p-6 bg-gradient-to-br from-primary to-primary-container rounded-3xl text-white relative overflow-hidden shadow-xl shadow-orange-200/40">
        <div class="relative z-10 space-y-4">
          <p class="text-white/80 font-medium tracking-wide">今日总计互动</p>
          <h3 class="text-5xl font-black tabular-nums">+{{ todayInteractions }}</h3>
          <div class="flex items-center gap-4 text-xs font-bold">
            <span class="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-lg">
              <span class="material-symbols-outlined text-sm" data-icon="trending_up">trending_up</span> {{ interactionChangeText }}
            </span>
            <span class="text-white/60">较昨日活跃度提升</span>
          </div>
        </div>
        <span class="material-symbols-outlined absolute -bottom-6 -right-6 text-[180px] text-white/10 rotate-12" data-icon="forum">forum</span>
      </div>
      <div class="p-6 bg-surface-container-lowest rounded-3xl space-y-4 shadow-sm group hover:shadow-md transition-shadow">
        <div class="w-12 h-12 bg-tertiary-container/10 rounded-2xl flex items-center justify-center text-tertiary">
          <span class="material-symbols-outlined" data-icon="pending_actions" style="font-variation-settings: 'FILL' 1;">pending_actions</span>
        </div>
        <div>
          <p class="text-on-surface-variant text-sm font-medium">待处理审核</p>
          <h4 class="text-2xl font-extrabold text-on-surface group-hover:text-primary transition-colors">0 条</h4>
        </div>
      </div>
      <div class="p-6 bg-surface-container-lowest rounded-3xl space-y-4 shadow-sm group hover:shadow-md transition-shadow">
        <div class="w-12 h-12 bg-secondary-container/30 rounded-2xl flex items-center justify-center text-secondary">
          <span class="material-symbols-outlined" data-icon="thumb_up" style="font-variation-settings: 'FILL' 1;">thumb_up</span>
        </div>
        <div>
          <p class="text-on-surface-variant text-sm font-medium">今日获赞总数</p>
          <h4 class="text-2xl font-extrabold text-on-surface group-hover:text-primary transition-colors">{{ todayLikes }}</h4>
        </div>
      </div>
    </div>

    <!-- Comment List Canvas -->
    <div class="bg-surface-container-low rounded-[2rem] p-4">
      <div class="bg-surface-container-lowest rounded-[1.5rem] overflow-hidden shadow-sm">
        <table class="w-full border-collapse">
          <thead class="bg-surface-container-low/50">
            <tr>
              <th class="px-6 py-5 text-left text-[11px] font-black text-outline uppercase tracking-widest">评论者</th>
              <th class="px-6 py-5 text-left text-[11px] font-black text-outline uppercase tracking-widest">关联帖子 / 评论内容</th>
              <th class="px-6 py-5 text-left text-[11px] font-black text-outline uppercase tracking-widest">获赞/时间</th>
              <th class="px-6 py-5 text-left text-[11px] font-black text-outline uppercase tracking-widest">状态</th>
              <th class="px-6 py-5 text-right text-[11px] font-black text-outline uppercase tracking-widest">管理操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-orange-100/10">
            <tr v-for="c in comments" :key="c.id" class="hover:bg-orange-50/30 transition-colors">
              <td class="px-6 py-6">
                <div class="flex items-center gap-3">
                  <img
                    class="w-10 h-10 rounded-full bg-orange-100 object-cover"
                    :src="
                      normalizeMediaUrl(c.user.avatarUrl) ||
                      'https://lh3.googleusercontent.com/aida-public/AB6AXuBmGhYNR97SFhMraNhoU8-wAKnrfhdaEKdiIIytW8NrPJaBqGHsa94zygtIDIbwi6A7dz24PcRu-DnpGSVq7d6vlrdarp9w6xg_RrP5CRe_Jtc0vtF3QODJTtqaOuzh-yzc9pdiiUzrHmeo4mDVKoB5Af-E3KoBF6YFwK3dzvDjvyWHr7TZMDzUSACzt4cFAecyZShR7o7v6yftZmYguW3YakNFC2wyugXC8FMtNu8OqisGzFzpHDZlA6EVaBVKpLquFw2eh3Izyis'
                    "
                    @error="(e) => onImgError(e, fallbackAvatarImg)"
                  />
                  <div>
                    <div class="max-w-[12rem]">
                      <p class="text-sm font-bold text-on-surface truncate whitespace-nowrap">{{ c.user.name }}</p>
                    </div>
                    <p class="text-[10px] text-outline font-medium">{{ c.user.levelText || '-' }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-6 max-w-md">
                <div class="space-y-1">
                  <p class="text-[10px] font-bold text-primary inline-flex items-center gap-1">
                    <span class="material-symbols-outlined text-[12px]" data-icon="article">article</span>
                    {{ c.post.title }}
                  </p>
                  <p class="text-sm text-on-surface-variant line-clamp-2 leading-relaxed">{{ c.content }}</p>
                </div>
              </td>
              <td class="px-6 py-6">
                <div class="flex flex-col gap-1">
                  <span class="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant">
                    <span class="material-symbols-outlined text-primary text-sm" data-icon="favorite" style="font-variation-settings: 'FILL' 1;">favorite</span> {{ c.likeCount }}
                  </span>
                  <span class="text-[10px] text-outline font-medium">{{ formatDateTime(c.createdAt) }}</span>
                </div>
              </td>
              <td class="px-6 py-6">
                <span class="px-3 py-1 text-[11px] font-black rounded-full inline-flex items-center gap-1" :class="statusBadgeClass(c.status)">
                  <span class="w-1.5 h-1.5 rounded-full" :class="statusDotClass(c.status)"></span> {{ statusLabel(c.status) }}
                </span>
              </td>
              <td class="px-6 py-6 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button class="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-all" title="通过" @click="approve(c)">
                    <span class="material-symbols-outlined text-sm" data-icon="done">done</span>
                  </button>
                  <button class="p-2 bg-secondary-container/40 text-on-secondary-container hover:bg-on-secondary-container hover:text-white rounded-lg transition-all" title="回复" @click="reply(c)">
                    <span class="material-symbols-outlined text-sm" data-icon="reply">reply</span>
                  </button>
                  <button class="p-2 bg-error-container/40 text-error hover:bg-error hover:text-white rounded-lg transition-all" title="删除" @click="deleteComment(c)">
                    <span class="material-symbols-outlined text-sm" data-icon="delete">delete</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && comments.length === 0" class="bg-surface-container-lowest">
              <td colspan="5" class="px-6 py-10 text-center text-sm text-on-surface-variant">暂无数据</td>
            </tr>
          </tbody>
        </table>
        <!-- Pagination -->
        <div class="px-6 py-6 border-t border-orange-100/20 flex items-center justify-between">
          <p class="text-xs font-medium text-outline">显示 {{ start }} 到 {{ end }} 条，共 {{ total }} 条评论</p>
          <div class="flex items-center gap-2">
            <button
              class="w-8 h-8 flex items-center justify-center rounded-lg text-outline hover:bg-orange-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              :disabled="page <= 1"
              @click="goPage(page - 1)"
            >
              <span class="material-symbols-outlined text-sm" data-icon="chevron_left">chevron_left</span>
            </button>
            <button
              v-for="p in pageItems"
              :key="p"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors"
              :class="p === page ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-orange-50'"
              @click="goPage(p)"
            >
              {{ p }}
            </button>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-lg text-outline hover:bg-orange-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              :disabled="page >= totalPages"
              @click="goPage(page + 1)"
            >
              <span class="material-symbols-outlined text-sm" data-icon="chevron_right">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDateTime, normalizeMediaUrl } from '@/utils/format'

type CommentItem = {
  id: string
  user: { id: string; name: string; avatarUrl: string | null; levelText: string | null }
  post: { id: string; title: string }
  content: string
  likeCount: number
  status: string
  createdAt: string
}

type DashboardStats = {
  charts: {
    likesTrend: number[]
    commentsTrend: number[]
  }
}

const loading = ref(false)
const comments = ref<CommentItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const stats = ref<DashboardStats | null>(null)
const fallbackAvatarImg =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBmGhYNR97SFhMraNhoU8-wAKnrfhdaEKdiIIytW8NrPJaBqGHsa94zygtIDIbwi6A7dz24PcRu-DnpGSVq7d6vlrdarp9w6xg_RrP5CRe_Jtc0vtF3QODJTtqaOuzh-yzc9pdiiUzrHmeo4mDVKoB5Af-E3KoBF6YFwK3dzvDjvyWHr7TZMDzUSACzt4cFAecyZShR7o7v6yftZmYguW3YakNFC2wyugXC8FMtNu8OqisGzFzpHDZlA6EVaBVKpLquFw2eh3Izyis'

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const pageItems = computed(() => {
  const tp = totalPages.value
  const cur = page.value
  if (tp <= 5) return Array.from({ length: tp }, (_, i) => i + 1)
  if (cur <= 3) return [1, 2, 3, 4, tp]
  if (cur >= tp - 2) return [1, tp - 3, tp - 2, tp - 1, tp]
  return [1, cur - 1, cur, cur + 1, tp]
})

const todayLikes = computed(() => {
  const arr = stats.value?.charts?.likesTrend || []
  return Number(arr[arr.length - 1] || 0)
})

const todayComments = computed(() => {
  const arr = stats.value?.charts?.commentsTrend || []
  return Number(arr[arr.length - 1] || 0)
})

const todayInteractions = computed(() => todayLikes.value + todayComments.value)
const interactionChangeText = computed(() => {
  const likes = stats.value?.charts?.likesTrend || []
  const commentsArr = stats.value?.charts?.commentsTrend || []
  if (likes.length < 2 || commentsArr.length < 2) return '—'
  const prev = Number(likes[likes.length - 2] || 0) + Number(commentsArr[commentsArr.length - 2] || 0)
  const cur = Number(likes[likes.length - 1] || 0) + Number(commentsArr[commentsArr.length - 1] || 0)
  if (prev === 0 && cur === 0) return '0%'
  if (prev === 0) return '+100%'
  const pct = Math.round(((cur - prev) / prev) * 100)
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct}%`
})

const start = computed(() => {
  if (total.value === 0) return 0
  return (page.value - 1) * pageSize.value + 1
})

const end = computed(() => {
  if (total.value === 0) return 0
  return Math.min(total.value, page.value * pageSize.value)
})

function statusLabel(status: string) {
  if (status === 'pending') return '待审核'
  if (status === 'approved') return '已通过'
  if (status === 'hidden') return '已隐藏'
  return status
}

function statusBadgeClass(status: string) {
  if (status === 'pending') return 'bg-tertiary-container/20 text-tertiary'
  if (status === 'approved') return 'bg-green-100 text-green-700'
  if (status === 'hidden') return 'bg-slate-200 text-slate-500'
  return 'bg-surface-variant text-on-surface-variant'
}

function statusDotClass(status: string) {
  if (status === 'pending') return 'bg-tertiary'
  if (status === 'approved') return 'bg-green-500'
  if (status === 'hidden') return 'bg-slate-400'
  return 'bg-on-surface-variant/40'
}

async function load() {
  loading.value = true
  try {
    const [listRes, statsRes] = await Promise.all([
      axios.get('/api/v1/admin/content/comments', { params: { page: page.value, pageSize: pageSize.value } }),
      axios.get('/api/v1/admin/dashboard/stats')
    ])
    if (listRes.data?.ok || listRes.data?.code === 0) {
      comments.value = listRes.data.data.items
      total.value = listRes.data.data.total
    }
    if (statsRes.data?.ok || statsRes.data?.code === 0) {
      stats.value = statsRes.data.data
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

function approve(_c?: CommentItem) {
  ElMessage.success('当前接口默认已通过')
}

function reply(_c?: CommentItem) {
  ElMessage.info('暂不支持回复')
}

async function deleteComment(c: CommentItem) {
  try {
    await ElMessageBox.confirm('确认删除该评论？', '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await axios.delete(`/api/v1/admin/comments/${c.id}`)
    ElMessage.success('已删除')
    await load()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '操作失败')
  }
}

onMounted(load)
</script>

<style scoped>
</style>
