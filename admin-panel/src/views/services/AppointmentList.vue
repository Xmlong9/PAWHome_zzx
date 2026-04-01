<template>
  <div class="appointment-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>预约管理</span>
          <el-button type="primary" icon="Refresh" @click="fetchAppointments">刷新</el-button>
        </div>
      </template>

      <el-table :data="appointments" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="280" />
        <el-table-column prop="service_type" label="服务类型" width="150" />
        <el-table-column label="预约日期" width="150">
          <template #default="{ row }">
            {{ row.service_date || '无' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ formatStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'scheduled'"
              size="small"
              type="success"
              @click="handleStatusChange(row, 'completed')"
            >
              完成
            </el-button>
            <el-button
              v-if="row.status === 'scheduled'"
              size="small"
              type="danger"
              @click="handleStatusChange(row, 'cancelled')"
            >
              取消
            </el-button>
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
          @size-change="fetchAppointments"
          @current-change="fetchAppointments"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const appointments = ref([])
const loading = ref(false)
const page = ref(1)
const size = ref(10)
const total = ref(0)

const formatStatus = (status: string) => {
  const map: Record<string, string> = {
    'scheduled': '已预约',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return map[status] || status
}

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    'scheduled': 'primary',
    'completed': 'success',
    'cancelled': 'info'
  }
  return map[status] || 'info'
}

const fetchAppointments = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/v1/admin/services/appointments', {
      params: { page: page.value, size: size.value },
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
    })
    if (res.data.ok || res.data.code === 0) {
      appointments.value = res.data.data.items
      total.value = res.data.data.total
    } else {
      ElMessage.error(res.data.message || '获取预约列表失败')
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '网络错误')
  } finally {
    loading.value = false
  }
}

const handleStatusChange = async (row: any, newStatus: string) => {
  const statusLabel = formatStatus(newStatus)
  try {
    await ElMessageBox.confirm(
      `确定将此预约标记为${statusLabel}吗？`,
      '确认',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: newStatus === 'cancelled' ? 'warning' : 'info' }
    )
    
    await axios.put(`/api/v1/admin/services/appointments/${row.id}/status`, { status: newStatus }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
    })
    
    ElMessage.success(`预约已成功标记为${statusLabel}`)
    fetchAppointments()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '操作失败')
    }
  }
}

onMounted(() => {
  fetchAppointments()
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
