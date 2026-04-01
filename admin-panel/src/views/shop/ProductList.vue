<template>
  <div class="product-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>商品管理</span>
          <div>
            <el-button type="success" icon="Plus" @click="openDialog('create')">新增商品</el-button>
            <el-button type="primary" icon="Refresh" @click="fetchProducts">刷新</el-button>
          </div>
        </div>
      </template>

      <el-table :data="products" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="商品 ID" width="280" />
        <el-table-column prop="title" label="商品名称" show-overflow-tooltip />
        <el-table-column label="图片" width="100">
          <template #default="{ row }">
            <el-image 
              v-if="getFirstImage(row.images_json)" 
              :src="getFirstImage(row.images_json)" 
              style="width: 50px; height: 50px" 
              fit="cover"
              :preview-src-list="[getFirstImage(row.images_json)]"
              preview-teleported
            />
            <span v-else>无图</span>
          </template>
        </el-table-column>
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
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              @click="openDialog('edit', row)"
            >
              编辑
            </el-button>
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

    <!-- 新增/编辑商品弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'create' ? '新增商品' : '编辑商品'"
      width="600px"
      @close="resetForm"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="商品名称" prop="title">
          <el-input v-model="form.title" placeholder="请输入商品名称" />
        </el-form-item>
        
        <el-form-item label="价格(元)" prop="price">
          <el-input-number v-model="form.price" :precision="2" :step="1" :min="0" style="width: 100%;" />
        </el-form-item>
        
        <el-form-item label="库存" prop="stock">
          <el-input-number v-model="form.stock" :step="1" :min="0" :precision="0" style="width: 100%;" />
        </el-form-item>
        
        <el-form-item label="商品图片" prop="imageUrl">
          <el-upload
            class="avatar-uploader"
            action="/api/v1/admin/uploads"
            :headers="{ Authorization: `Bearer ${adminToken}` }"
            :show-file-list="false"
            :on-success="handleUploadSuccess"
            :before-upload="beforeUpload"
            :on-error="handleUploadError"
            accept="image/*"
          >
            <img v-if="form.imageUrl" :src="form.imageUrl" class="avatar" />
            <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
          </el-upload>
          <div class="upload-tip">点击上传商品图片 (将保存至 F:\PAWHome\backend\instance\uploads)</div>
        </el-form-item>
        
        <el-form-item label="商品描述" prop="description">
          <el-input type="textarea" v-model="form.description" :rows="4" placeholder="请输入商品描述" />
        </el-form-item>
        
        <el-form-item label="是否上架" prop="is_active">
          <el-switch v-model="form.is_active" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="submitLoading">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus'
import type { UploadProps } from 'element-plus'
import axios from 'axios'
import { Plus } from '@element-plus/icons-vue'

const adminToken = computed(() => localStorage.getItem('admin_token') || '')

const products = ref([])
const loading = ref(false)
const page = ref(1)
const size = ref(10)
const total = ref(0)

const dialogVisible = ref(false)
const dialogType = ref<'create' | 'edit'>('create')
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  id: '',
  title: '',
  price: 0,
  stock: 0,
  description: '',
  imageUrl: '',
  is_active: true
})

const rules = reactive<FormRules>({
  title: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  stock: [{ required: true, message: '请输入库存', trigger: 'blur' }]
})

const getFirstImage = (imagesJson: string) => {
  if (!imagesJson) return ''
  try {
    const images = JSON.parse(imagesJson)
    if (Array.isArray(images) && images.length > 0) {
      let url = images[0]
      // 如果后端返回的是 http://localhost:5001/media/xxx 或 /media/xxx，前端直接使用
      return url
    }
  } catch (e) {}
  return ''
}

const handleUploadSuccess: UploadProps['onSuccess'] = (response, uploadFile) => {
  if (response.ok || response.code === 0) {
    form.imageUrl = response.data.url
    ElMessage.success('图片上传成功')
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

const handleUploadError: UploadProps['onError'] = (error) => {
  ElMessage.error('图片上传失败，请检查网络或后端服务')
  console.error(error)
}

const beforeUpload: UploadProps['beforeUpload'] = (rawFile) => {
  const isImage = rawFile.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  const isLt5M = rawFile.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB!')
    return false
  }
  return true
}

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

const openDialog = (type: 'create' | 'edit', row?: any) => {
  dialogType.value = type
  if (type === 'edit' && row) {
    form.id = row.id
    form.title = row.title
    form.price = row.price_cents / 100
    form.stock = row.stock
    form.description = row.description || ''
    form.imageUrl = getFirstImage(row.images_json)
    form.is_active = row.is_active
  } else {
    form.id = ''
    form.title = ''
    form.price = 0
    form.stock = 0
    form.description = ''
    form.imageUrl = ''
    form.is_active = true
  }
  dialogVisible.value = true
}

const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true
      try {
        const payload = {
          title: form.title,
          price_cents: Math.round(form.price * 100),
          stock: form.stock,
          description: form.description,
          images_json: form.imageUrl ? JSON.stringify([form.imageUrl]) : "[]",
          is_active: form.is_active
        }
        
        const config = {
          headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
        }
        
        if (dialogType.value === 'create') {
          await axios.post('/api/v1/admin/shop/products', payload, config)
          ElMessage.success('添加商品成功')
        } else {
          await axios.put(`/api/v1/admin/shop/products/${form.id}`, payload, config)
          ElMessage.success('更新商品成功')
        }
        
        dialogVisible.value = false
        fetchProducts()
      } catch (error: any) {
        ElMessage.error(error.response?.data?.message || '保存失败')
      } finally {
        submitLoading.value = false
      }
    }
  })
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
.avatar-uploader .avatar {
  width: 100px;
  height: 100px;
  display: block;
  object-fit: cover;
  border-radius: 6px;
}
.avatar-uploader :deep(.el-upload) {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}
.avatar-uploader :deep(.el-upload:hover) {
  border-color: var(--el-color-primary);
}
.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  text-align: center;
  line-height: 100px;
}
.upload-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
  line-height: 1.2;
}
</style>
