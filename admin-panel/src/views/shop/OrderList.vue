<template>
  <div class="order-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>订单管理</span>
          <el-select v-model="statusFilter" placeholder="按状态筛选" clearable @change="fetchOrders" style="width: 200px; margin-left: 20px;">
            <el-option label="待支付" value="pending_pay" />
            <el-option label="待发货" value="pending_ship" />
            <el-option label="已发货" value="shipped" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
          <el-button type="primary" icon="Refresh" @click="fetchOrders" style="margin-left: auto;">刷新</el-button>
        </div>
      </template>

      <el-table :data="orders" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="订单 ID" width="280" />
        <el-table-column prop="receiver_name" label="收货人" width="150" />
        <el-table-column label="总金额" width="120">
          <template #default="{ row }">
            ￥{{ (row.total_cents / 100).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="150">
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
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending_ship'"
              size="small"
              type="primary"
              @click="handleShip(row)"
            >
              发货
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
          @size-change="fetchOrders"
          @current-change="fetchOrders"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const orders = ref([])
const loading = ref(false)
const page = ref(1)
const size = ref(10)
const total = ref(0)
const statusFilter = ref('')

const formatStatus = (status: string) => {
  const map: Record<string, string> = {
    'pending_pay': '待支付',
    'pending_ship': '待发货',
    'shipped': '已发货',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return map[status] || status
}

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    'pending_pay': 'warning',
    'pending_ship': 'primary',
    'shipped': 'success',
    'completed': 'success',
    'cancelled': 'info'
  }
  return map[status] || 'info'
}

const fetchOrders = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/v1/admin/shop/orders', {
      params: { page: page.value, size: size.value, status: statusFilter.value },
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
    })
    if (res.data.ok || res.data.code === 0) {
      orders.value = res.data.data.items
      total.value = res.data.data.total
    } else {
      ElMessage.error(res.data.message || '获取订单列表失败')
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '网络错误')
  } finally {
    loading.value = false
  }
}

const handleShip = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      '将此订单标记为已发货？',
      '确认发货',
      { confirmButtonText: '发货', cancelButtonText: '取消', type: 'info' }
    )
    
    await axios.put(`/api/v1/admin/shop/orders/${row.id}/ship`, {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
    })
    
    ElMessage.success('订单已成功发货')
    fetchOrders()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '操作失败')
    }
  }
}

onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
}
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
