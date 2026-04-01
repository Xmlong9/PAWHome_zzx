<template>
  <div class="post-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>帖子管理</span>
          <el-button type="primary" icon="Refresh" @click="fetchPosts">刷新</el-button>
        </div>
      </template>

      <el-table :data="posts" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="帖子 ID" width="280" />
        <el-table-column prop="author_name" label="作者" width="150" />
        <el-table-column prop="content" label="内容" show-overflow-tooltip />
        <el-table-column label="数据" width="200">
          <template #default="{ row }">
            <el-space>
              <el-tag size="small" type="info">点赞: {{ row.like_count }}</el-tag>
              <el-tag size="small" type="warning">评论: {{ row.comment_count }}</el-tag>
            </el-space>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
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
          @size-change="fetchPosts"
          @current-change="fetchPosts"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const posts = ref([])
const loading = ref(false)
const page = ref(1)
const size = ref(10)
const total = ref(0)

const fetchPosts = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/v1/admin/posts', {
      params: { page: page.value, size: size.value },
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
    })
    if (res.data.ok || res.data.code === 0) {
      posts.value = res.data.data.items
      total.value = res.data.data.total
    } else {
      ElMessage.error(res.data.message || '获取帖子列表失败')
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '网络错误')
  } finally {
    loading.value = false
  }
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这条帖子吗？此操作无法撤销。',
      '警告',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'error' }
    )
    
    await axios.delete(`/api/v1/admin/posts/${row.id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
    })
    
    ElMessage.success('帖子删除成功')
    fetchPosts()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '操作失败')
    }
  }
}

onMounted(() => {
  fetchPosts()
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
