<template>
  <div class="admin-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>管理员账号</span>
          <el-button type="primary" icon="Refresh" @click="fetchAdmins">刷新</el-button>
        </div>
      </template>

      <el-table :data="admins" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="280" />
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="name" label="姓名" width="150" />
        <el-table-column prop="role_name" label="角色" width="150" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '正常' : '已禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
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
          @size-change="fetchAdmins"
          @current-change="fetchAdmins"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const admins = ref([])
const loading = ref(false)
const page = ref(1)
const size = ref(10)
const total = ref(0)

const fetchAdmins = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/v1/admin/system/admins', {
      params: { page: page.value, size: size.value },
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
    })
    if (res.data.ok || res.data.code === 0) {
      admins.value = res.data.data.items
      total.value = res.data.data.total
    } else {
      ElMessage.error(res.data.message || '获取管理员列表失败')
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '网络错误')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAdmins()
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
