<template>
  <div class="baby-edit-page">
    <div class="page-header">
      <el-button link :icon="Back" @click="router.back()">返回</el-button>
      <h2 class="title">{{ isEdit ? '修改资料' : '添加宝宝' }}</h2>
    </div>

    <el-card class="form-card" shadow="hover">
      <el-form 
        ref="formRef" 
        :model="formData" 
        :rules="rules" 
        label-position="top"
        v-loading="loading"
      >
        <div class="avatar-uploader-section">
          <div class="avatar-uploader" @click="triggerUpload">
            <el-avatar :size="100" :src="formData.avatarUrl || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
            <div class="overlay"><el-icon><Camera /></el-icon></div>
          </div>
          <input type="file" ref="fileInput" class="hidden-input" @change="handleFileUpload" accept="image/*" />
          <p class="hint">点击更换头像</p>
        </div>

        <el-form-item label="宝宝姓名" prop="name">
          <el-input v-model="formData.name" placeholder="请输入宝宝真实姓名" size="large" />
        </el-form-item>

        <el-form-item label="小名/昵称" prop="nickname">
          <el-input v-model="formData.nickname" placeholder="例如：皮皮、心心" size="large" />
        </el-form-item>

        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="formData.gender" size="large" class="full-radio">
            <el-radio-button label="male">小王子 (男)</el-radio-button>
            <el-radio-button label="female">小公主 (女)</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="出生日期" prop="birthDate">
          <el-date-picker
            v-model="formData.birthDate"
            type="date"
            placeholder="请选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            size="large"
            :editable="false"
          />
        </el-form-item>

        <div class="submit-wrapper">
          <el-button type="primary" size="large" round @click="submitForm" :loading="submitting" class="submit-btn">
            {{ isEdit ? '保存修改' : '确认添加' }}
          </el-button>
        </div>
      </el-form>
    </el-card>

    <!-- Dangerous Zone -->
    <div v-if="isEdit" class="danger-zone">
       <el-button link type="danger" @click="handleDelete">删除此宝宝档案</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBabyStore } from '@/stores/baby'
import { Back, Camera } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const babyStore = useBabyStore()
const formRef = ref<FormInstance>()
const fileInput = ref<HTMLInputElement | null>(null)

const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const submitting = ref(false)

const formData = reactive({
  name: '',
  nickname: '',
  gender: 'male' as 'male' | 'female',
  birthDate: '',
  avatarUrl: ''
})

const triggerUpload = () => {
    fileInput.value?.click()
}

const handleFileUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) return ElMessage.warning('图片大小不能超过 2MB')

    const uploadLoading = ElMessage({ message: '正在上传...', duration: 0 })
    try {
        const token = localStorage.getItem('token')
        const res = await axios.post(`/api/upload?filename=${encodeURIComponent(file.name)}`, file, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': file.type
            }
        })
        formData.avatarUrl = res.data.url
        ElMessage.success('上传成功')
    } catch (e) {
        console.error('Upload Error:', e)
        ElMessage.error('上传失败')
    } finally {
        uploadLoading.close()
    }
}

const rules = reactive<FormRules>({
  name: [{ required: true, message: '请输入宝宝姓名', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  birthDate: [{ required: true, message: '请选择出生日期', trigger: 'change' }],
})

onMounted(async () => {
  if (isEdit.value) {
    loading.value = true
    const id = route.params.id as string
    // Ensure list is loaded
    if (babyStore.babyList.length === 0) await babyStore.fetchBabies()
    
    const baby = babyStore.babyList.find(b => b.id === id)
    if (baby) {
      formData.name = baby.name
      formData.nickname = baby.nickname || ''
      formData.gender = baby.gender
      formData.birthDate = baby.birthDate
      formData.avatarUrl = baby.avatarUrl || ''
    } else {
      ElMessage.error('找不到该宝宝档案')
      router.push('/baby/list')
    }
    loading.value = false
  }
})

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (isEdit.value) {
          await babyStore.updateBaby(route.params.id as string, formData)
          ElMessage.success('资料已更新')
        } else {
          await babyStore.addBaby(formData)
          ElMessage.success('宝宝添加成功')
        }
        router.push('/baby/list')
      } catch (e) {
        ElMessage.error('保存失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const handleDelete = () => {
  ElMessageBox.confirm('确定要删除此档案吗？', '警告', {
    confirmButtonText: '删除',
    confirmButtonClass: 'el-button--danger',
    type: 'warning'
  }).then(async () => {
    await babyStore.deleteBaby(route.params.id as string)
    ElMessage.success('已删除')
    router.push('/baby/list')
  })
}
</script>

<style scoped lang="scss">
.baby-edit-page { max-width: 500px; margin: 0 auto; padding-bottom: 60px; }
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; .title { font-size: 20px; font-weight: 800; color: #2c3e50; } }

.avatar-uploader-section {
    text-align: center;
    margin-bottom: 30px;
    
    .avatar-uploader {
        display: inline-block;
        position: relative;
        cursor: pointer;
    }
    
    .hidden-input {
        display: none;
    }
        
    .avatar-uploader .overlay {
            position: absolute;
            bottom: 0;
            right: 0;
            background: var(--el-color-primary);
            color: #fff;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid #fff;
        }
        .hint { font-size: 13px; color: #909399; margin-top: 10px; }
    }

.full-radio {
    width: 100%;
    display: flex;
    :deep(.el-radio-button) { flex: 1; .el-radio-button__inner { width: 100%; } }
}

.submit-wrapper { margin-top: 40px; .submit-btn { width: 100%; height: 50px; font-weight: bold; } }
.danger-zone { text-align: center; margin-top: 24px; }
</style>
