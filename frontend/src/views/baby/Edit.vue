<template>
  <div class="baby-edit-page">
    <div class="page-header">
      <el-button link :icon="ArrowLeft" @click="router.back()" class="back-btn"></el-button>
      <h2 class="title">{{ isEdit ? '修改宝宝档案' : '迎接新生命' }}</h2>
    </div>

    <el-card class="form-card" shadow="always">
      <el-form 
        ref="formRef" 
        :model="formData" 
        :rules="rules" 
        label-position="top"
        v-loading="loading"
        class="custom-form"
      >
        <div class="avatar-uploader-wrap">
          <div class="avatar-box" @click="triggerUpload">
            <el-avatar :size="110" :src="formData.avatarUrl || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" class="baby-avatar" />
            <div class="camera-btn"><el-icon><Camera /></el-icon></div>
          </div>
          <input type="file" ref="fileInput" class="hidden-input" @change="handleFileUpload" accept="image/*" />
          <p class="upload-hint">上传宝宝萌照</p>
        </div>

        <el-form-item label="宝宝姓名" prop="name">
          <el-input v-model="formData.name" placeholder="请输入宝宝真实姓名" size="large" />
        </el-form-item>

        <el-form-item label="可爱小名" prop="nickname">
          <el-input v-model="formData.nickname" placeholder="例如：糯米、饭团" size="large" />
        </el-form-item>

        <el-form-item label="宝宝性别" prop="gender">
          <div class="gender-selector">
             <div class="gender-option male" :class="{ active: formData.gender === 'male' }" @click="formData.gender = 'male'">
                <div class="gender-icon-wrap">
                  <div class="icon-circle">♂</div>
                </div>
                <div class="gender-label">
                  <span class="main">小王子</span>
                  <span class="sub">Prince</span>
                </div>
                <div class="check-mark"><el-icon><Check /></el-icon></div>
             </div>
             <div class="gender-option female" :class="{ active: formData.gender === 'female' }" @click="formData.gender = 'female'">
                <div class="gender-icon-wrap">
                  <div class="icon-circle">♀</div>
                </div>
                <div class="gender-label">
                  <span class="main">小公主</span>
                  <span class="sub">Princess</span>
                </div>
                <div class="check-mark"><el-icon><Check /></el-icon></div>
             </div>
          </div>
        </el-form-item>

        <el-form-item label="出生日期" prop="birthDate">
          <el-date-picker
            v-model="formData.birthDate"
            type="date"
            placeholder="请选择宝宝生日"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            size="large"
            :editable="false"
            class="custom-date-picker"
          />
        </el-form-item>

        <div class="action-footer">
          <el-button type="primary" size="large" round @click="submitForm" :loading="submitting" class="submit-button">
            {{ isEdit ? '保存所有修改' : '开启守护旅程' }}
          </el-button>
        </div>
      </el-form>
    </el-card>

    <div v-if="isEdit" class="danger-area">
       <el-button link type="danger" @click="handleDelete" class="delete-link">删除宝宝档案</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBabyStore } from '@/stores/baby'
import { ArrowLeft, Camera } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import client from '@/api/client'

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

const triggerUpload = () => fileInput.value?.click()

const handleFileUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) return ElMessage.warning('图片不能超过 2MB')

    const uploadLoading = ElMessage({ message: '正在处理照片...', duration: 0, type: 'info' })
    try {
        const res: any = await client.post(`/upload?filename=${encodeURIComponent(file.name)}`, file, {
            headers: { 'Content-Type': file.type }
        })
        formData.avatarUrl = res.url
        ElMessage.success('头像已上传')
    } catch (e) {
        // Error handled globally
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
    if (babyStore.babyList.length === 0) await babyStore.fetchBabies()
    
    const baby = babyStore.babyList.find(b => b.id === id)
    if (baby) {
      formData.name = baby.name
      formData.nickname = baby.nickname || ''
      formData.gender = baby.gender
      formData.birthDate = baby.birthDate
      formData.avatarUrl = baby.avatarUrl || ''
    } else {
      ElMessage.error('无法定位档案')
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
          ElMessage.success('档案更新成功')
        } else {
          await babyStore.addBaby(formData)
          ElMessage.success('欢迎新成员！宝宝添加成功')
        }
        router.push('/baby/list')
      } catch (e) {
        // Handled
      } finally {
        submitting.value = false
      }
    }
  })
}

const handleDelete = () => {
  ElMessageBox.confirm('档案一旦删除将无法恢复，确认继续？', '严重警告', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    confirmButtonClass: 'el-button--danger',
    type: 'error',
    roundButton: true
  }).then(async () => {
    await babyStore.deleteBaby(route.params.id as string)
    ElMessage.success('档案已永久移除')
    router.push('/baby/list')
  }).catch(() => {})
}
</script>

<style scoped lang="scss">
.baby-edit-page { max-width: 540px; margin: 0 auto; padding: 10px 16px 60px; }

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  .back-btn { font-size: 20px; color: var(--el-text-color-primary); }
  .title { font-size: 22px; font-weight: 800; color: var(--el-text-color-primary); margin: 0; }
}

.form-card {
  border-radius: 28px !important;
  :deep(.el-card__body) { padding: 32px 24px; }
}

.avatar-uploader-wrap {
    text-align: center;
    margin-bottom: 32px;
    
    .avatar-box {
        display: inline-block;
        position: relative;
        cursor: pointer;
        
        .baby-avatar {
          border: 4px solid var(--el-color-primary-light-9);
          box-shadow: 0 10px 25px rgba(255, 142, 148, 0.15);
        }
        
        .camera-btn {
          position: absolute;
          bottom: 5px;
          right: 5px;
          background: var(--el-color-primary);
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
        }
    }
    
    .hidden-input { display: none; }
    .upload-hint { font-size: 13px; color: var(--el-text-color-secondary); margin-top: 12px; font-weight: 600; }
}

.gender-selector {
  display: flex;
  gap: 16px;
  margin-top: 4px;
  
  .gender-option {
    flex: 1;
    height: 80px;
    border-radius: 20px;
    background: #f9fbfc;
    display: flex;
    align-items: center;
    padding: 0 16px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    border: 2px solid transparent;
    position: relative;
    overflow: hidden;
    
    .gender-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      font-size: 20px;
      font-weight: 900;
      transition: all 0.3s;
    }

    .gender-label {
      display: flex;
      flex-direction: column;
      .main { font-size: 15px; font-weight: 800; line-height: 1.2; }
      .sub { font-size: 10px; opacity: 0.6; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
    }

    .check-mark {
      position: absolute;
      top: -10px;
      right: -10px;
      background: currentColor;
      color: white;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      transform: scale(0);
      transition: transform 0.3s;
      padding-top: 6px;
      padding-right: 6px;
    }
    
    &.male { 
      color: #409eff; 
      .gender-icon-wrap { background: #eaf4ff; }
      &.active { 
        background: #eaf4ff; 
        border-color: #409eff; 
        transform: translateY(-2px);
        .check-mark { transform: scale(1); }
      } 
    }
    &.female { 
      color: #ff8e94; 
      .gender-icon-wrap { background: #fff5f5; }
      &.active { 
        background: #fff5f5; 
        border-color: #ff8e94; 
        transform: translateY(-2px);
        .check-mark { transform: scale(1); }
      } 
    }
  }
}

.custom-form {
  :deep(.el-form-item__label) {
    font-weight: 800;
    font-size: 14px;
    color: var(--el-text-color-primary);
    padding-bottom: 8px;
  }
  
  :deep(.el-input__wrapper) {
    border-radius: 14px;
    padding: 4px 12px;
  }
}

.custom-date-picker {
  :deep(.el-input__wrapper) { width: 100%; box-sizing: border-box; }
}

.action-footer {
  margin-top: 48px;
  .submit-button { width: 100%; height: 54px; font-size: 16px; font-weight: 800; background: linear-gradient(90deg, #ff8e94 0%, #ffb1b5 100%); border: none; box-shadow: 0 10px 20px rgba(255, 142, 148, 0.2); }
}

.danger-area { text-align: center; margin-top: 32px; .delete-link { font-weight: 600; opacity: 0.6; &:hover { opacity: 1; } } }
</style>
