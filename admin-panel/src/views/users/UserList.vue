<template>
  <div class="p-8 relative min-h-full">
    <!-- Header Section -->
    <div class="mb-8 flex justify-between items-end">
      <div>
        <h2 class="text-3xl font-extrabold text-primary tracking-tight">用户管理</h2>
        <div class="flex items-center gap-2 mt-2">
          <span class="px-2.5 py-0.5 rounded-full bg-tertiary-container/10 text-tertiary text-xs font-bold border border-tertiary-container/20">
            系统总注册用户: {{ total }}
          </span>
          <span class="text-on-surface-variant text-sm flex items-center gap-1">
            <span class="material-symbols-outlined text-xs">calendar_today</span>
            实时数据
          </span>
        </div>
      </div>
      <button class="bg-gradient-to-br from-primary to-primary-container text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-[0px_8px_24px_rgba(148,74,0,0.15)] hover:scale-[1.02] active:scale-95 transition-all">
        <span class="material-symbols-outlined">person_add</span>
        新增用户
      </button>
    </div>

    <!-- Table Container -->
    <div class="bg-surface-container-low rounded-xl shadow-[0px_8px_24px_rgba(86,67,55,0.08)] overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-surface-container-high/50">
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">ID (UUID)</th>
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">用户头像</th>
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">用户昵称</th>
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">手机号</th>
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-center">性别</th>
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">注册时间</th>
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">状态</th>
              <th class="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/10">
            <tr v-for="u in users" :key="u.id" class="bg-surface-container-lowest hover:bg-surface-container/50 transition-colors">
              <td class="px-6 py-4 text-xs font-mono text-on-surface-variant">{{ u.id.slice(0, 18) }}</td>
              <td class="px-6 py-4">
                <img
                  :alt="u.nickname"
                  class="w-10 h-10 rounded-xl bg-surface-container-high object-cover"
                  :src="
                    normalizeMediaUrl(u.avatarUrl) ||
                    fallbackAvatarImg
                  "
                  @error="(e) => onImgError(e, fallbackAvatarImg)"
                />
              </td>
              <td class="px-6 py-4">
                  <div class="max-w-[14rem]">
                  <span class="block font-bold text-on-surface truncate whitespace-nowrap">{{ u.nickname }}</span>
                  <div class="flex gap-1 mt-1">
                    <span v-if="u.tags?.isActive" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-secondary-container text-on-secondary-container">活跃用户</span>
                    <span v-if="u.tags?.isSeriousOwner" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-tertiary-container text-on-tertiary-container">认证宠主</span>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-on-surface-variant">{{ u.phoneMasked }}</td>
              <td class="px-6 py-4 text-center">
                <span v-if="u.gender === 'female'" class="material-symbols-outlined text-sm text-pink-400">female</span>
                <span v-else-if="u.gender === 'male'" class="material-symbols-outlined text-sm text-blue-400">male</span>
                <span v-else class="material-symbols-outlined text-sm text-on-surface-variant">help</span>
              </td>
              <td class="px-6 py-4 text-sm text-on-surface-variant">{{ formatDateTime(u.registeredAt) }}</td>
              <td class="px-6 py-4">
                <span v-if="u.status === 'active'" class="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">正常</span>
                <span v-else class="px-3 py-1 rounded-full bg-error-container text-error text-xs font-bold">封禁</span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                  <button class="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors" @click="editUser(u)">
                    <span class="material-symbols-outlined text-xl">edit</span>
                  </button>
                  <button class="p-2 rounded-lg text-error hover:bg-error/10 transition-colors" @click="toggleBan(u)">
                    <span class="material-symbols-outlined text-xl">block</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && users.length === 0" class="bg-surface-container-lowest">
              <td colspan="8" class="px-6 py-10 text-center text-sm text-on-surface-variant">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Pagination -->
      <div class="px-6 py-4 bg-surface-container-high/30 flex items-center justify-between">
        <span class="text-xs text-on-surface-variant font-medium">显示 {{ start }}-{{ end }} 条，共 {{ total }} 条用户</span>
        <div class="flex items-center gap-1">
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-white transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            :disabled="page <= 1"
            @click="goPage(page - 1)"
          >
            <span class="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          <button
            v-for="p in pageItems"
            :key="p"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors"
            :class="
              p === page
                ? 'bg-primary text-white'
                : 'border border-outline-variant/30 text-on-surface-variant hover:bg-white'
            "
            @click="goPage(p)"
          >
            {{ p }}
          </button>
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-white transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            :disabled="page >= totalPages"
            @click="goPage(page + 1)"
          >
            <span class="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Organic Graphic Element (Editorial Asymmetry) -->
    <div class="fixed -bottom-12 -right-12 w-64 h-64 bg-primary-fixed-dim/20 rounded-full blur-3xl -z-10"></div>
    <div class="fixed top-1/2 -right-20 w-40 h-40 bg-tertiary-fixed-dim/10 rounded-full blur-2xl -z-10"></div>

    <!-- Edit Dialog -->
    <el-dialog v-model="editDialogVisible" title="编辑用户" width="400px" class="rounded-2xl">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname"></el-input>
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="editForm.phone"></el-input>
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="editForm.gender">
            <el-radio label="male">男</el-radio>
            <el-radio label="female">女</el-radio>
            <el-radio label="unknown">未知</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveUser">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDateTime, normalizeMediaUrl } from '@/utils/format'

type UserItem = {
  id: string
  nickname: string
  phone: string | null
  phoneMasked: string
  gender: string
  avatarUrl: string | null
  status: string
  registeredAt: string
  tags?: {
    isActive: boolean
    isSeriousOwner: boolean
  }
}

const loading = ref(false)
const users = ref<UserItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const fallbackAvatarImg =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlMGUwZTAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iIzk5OSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5VPC90ZXh0Pjwvc3ZnPg=='

const editDialogVisible = ref(false)
const editForm = ref({
  id: '',
  nickname: '',
  phone: '',
  gender: 'unknown'
})

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

async function load() {
  loading.value = true
  try {
    const u = await axios.get('/api/v1/admin/users', { params: { page: page.value, pageSize: pageSize.value } })

    if (u.data?.ok || u.data?.code === 0) {
      users.value = u.data.data.items
      total.value = u.data.data.total
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

function editUser(u: UserItem) {
  editForm.value.id = u.id
  editForm.value.nickname = u.nickname
  editForm.value.phone = u.phone || ''
  editForm.value.gender = u.gender || 'unknown'
  editDialogVisible.value = true
}

async function saveUser() {
  try {
    await axios.put(`/api/v1/admin/users/${editForm.value.id}`, editForm.value)
    ElMessage.success('保存成功')
    editDialogVisible.value = false
    await load()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '保存失败')
  }
}

async function toggleBan(u: UserItem) {
  const next = u.status === 'active' ? 'banned' : 'active'
  const label = next === 'banned' ? '封禁' : '解除封禁'
  try {
    await ElMessageBox.confirm(`确认${label}该用户？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await axios.put(`/api/v1/admin/users/${u.id}/status`, { status: next })
    ElMessage.success(`${label}成功`)
    await load()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || `${label}失败`)
  }
}

onMounted(load)
</script>

<style scoped>
</style>
