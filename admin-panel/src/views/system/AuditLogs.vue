<template>
  <div class="audit-logs">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>操作日志</span>
          <el-button type="primary" icon="Refresh" @click="fetchLogs">刷新</el-button>
        </div>
      </template>

      <el-table :data="logs" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="日志 ID" width="280" />
        <el-table-column prop="admin_username" label="管理员" width="150" />
        <el-table-column prop="action" label="操作类型" width="200" />
        <el-table-column prop="target_type" label="目标类型" width="120" />
        <el-table-column prop="target_id" label="目标 ID" width="280" />
        <el-table-column prop="ip" label="IP 地址" width="150" />
        <el-table-column label="操作时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleString() }}
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="size"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchLogs"
          @current-change="fetchLogs"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const logs = ref([])
const loading = ref(false)
const page = ref(1)
const size = ref(10)
const total = ref(0)

const fetchLogs = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/v1/admin/system/logs', {
      params: { page: page.value, size: size.value },
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
    })
    if (res.data.ok || res.data.code === 0) {
      logs.value = res.data.data.items
      total.value = res.data.data.total
    } else {
      ElMessage.error(res.data.message || '获取操作日志失败')
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '网络错误')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
