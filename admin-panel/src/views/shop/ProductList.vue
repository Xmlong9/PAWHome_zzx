<template>
  <div class="product-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>商品管理</span>
          <el-button type="primary" icon="Refresh" @click="fetchProducts">刷新</el-button>
        </div>
      </template>

      <el-table :data="products" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="商品 ID" width="280" />
        <el-table-column prop="title" label="商品名称" show-overflow-tooltip />
        <el-table-column label="价格" width="120">
          <template #default="{ row }">
            ￥{{ (row.price_cents / 100).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'info'">
              {{ row.is_active ? '已上架' : '已下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              :type="row.is_active ? 'warning' : 'success'"
              @click="handleStatusChange(row)"
            >
              {{ row.is_active ? '下架' : '上架' }}
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
          @size-change="fetchProducts"
          @current-change="fetchProducts"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const products = ref([])
const loading = ref(false)
const page = ref(1)
const size = ref(10)
const total = ref(0)

const fetchProducts = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/v1/admin/shop/products', {
      params: { page: page.value, size: size.value },
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
    })
    if (res.data.ok || res.data.code === 0) {
      products.value = res.data.data.items
      total.value = res.data.data.total
    } else {
      ElMessage.error(res.data.message || '获取商品列表失败')
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '网络错误')
  } finally {
    loading.value = false
  }
}

const handleStatusChange = async (row: any) => {
  const newStatus = !row.is_active
  const action = newStatus ? '上架' : '下架'
  
  try {
    await ElMessageBox.confirm(
      `确定要${action}此商品吗？`,
      '提示',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    
    await axios.put(`/api/v1/admin/shop/products/${row.id}/status`, { is_active: newStatus }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
    })
    
    ElMessage.success(`商品已成功${action}`)
    fetchProducts()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '操作失败')
    }
  }
}

onMounted(() => {
  fetchProducts()
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
