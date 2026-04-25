<template>
  <div class="reset-page">
    <div class="reset-bg">
       <div class="blob blob-1"></div>
       <div class="blob blob-2"></div>
    </div>
    
    <div class="reset-container">
      <el-card class="reset-card" shadow="always">
        <div v-if="!resetSuccess" class="reset-form">
          <div class="reset-header">
            <img src="@/assets/vue.svg" alt="Logo" class="logo" />
            <h2 class="title">重置密码</h2>
            <p class="subtitle">设置您的新密码</p>
          </div>

          <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="handleReset">
            <div class="input-group">
              <div class="input-icon">
                <el-icon><Lock /></el-icon>
              </div>
              <el-input 
                v-model="form.password" 
                type="password" 
                placeholder="新密码（至少6位）" 
                class="custom-input"
                size="large"
                show-password
              />
            </div>
            <div class="input-group">
              <div class="input-icon">
                <el-icon><Lock /></el-icon>
              </div>
              <el-input 
                v-model="form.confirmPassword" 
                type="password" 
                placeholder="确认新密码" 
                class="custom-input"
                size="large"
                show-password
              />
            </div>
            <el-button 
              type="primary" 
              size="large" 
              round 
              class="submit-btn" 
              @click="handleReset"
              :loading="loading"
            >
              确认重置
            </el-button>
          </el-form>
        </div>

        <div v-else class="success-view">
          <div class="success-icon">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <h3>密码重置成功！</h3>
          <p>请使用新密码登录您的账户</p>
          <el-button type="primary" round class="login-btn" @click="goToLogin">去登录</el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock, CircleCheck } from '@element-plus/icons-vue'
import axios from 'axios'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const resetSuccess = ref(false)
const formRef = ref()

const form = reactive({
    password: '',
    confirmPassword: ''
})

const rules = {
    password: [
        { required: true, message: '请输入新密码', trigger: 'blur' },
        { min: 6, message: '密码长度至少为6位', trigger: 'blur' }
    ],
    confirmPassword: [
        { required: true, message: '请确认新密码', trigger: 'blur' },
        { 
            validator: (rule: any, value: string, callback: Function) => {
                if (value !== form.password) {
                    callback(new Error('两次密码不一致'))
                } else {
                    callback()
                }
            },
            trigger: 'blur'
        }
    ]
}

onMounted(() => {
    const token = route.query.token as string
    if (!token) {
        ElMessage.error('无效的重置链接')
        router.push('/login')
    }
})

const handleReset = async () => {
    const token = route.query.token as string
    if (!token) {
        ElMessage.error('无效的重置链接')
        return
    }

    if (!form.password || form.password.length < 6) {
        ElMessage.warning('密码长度至少为6位')
        return
    }

    if (form.password !== form.confirmPassword) {
        ElMessage.warning('两次密码不一致')
        return
    }

    loading.value = true
    try {
        await axios.post(`/api/auth?action=reset-password`, {
            token,
            password: form.password
        })
        resetSuccess.value = true
        ElMessage.success('密码重置成功！')
    } catch (e: any) {
        const msg = e?.response?.data?.message || '重置失败，请稍后再试'
        ElMessage.error(msg)
    } finally {
        loading.value = false
    }
}

const goToLogin = () => {
    router.push('/login')
}
</script>

<style scoped lang="scss">
.reset-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fef6f6 0%, #f0f7ff 50%, #fff5f5 100%);
  overflow: hidden;
  position: relative;
}

.reset-bg {
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: hidden;
    
    .blob {
        position: absolute;
        border-radius: 50%;
        z-index: 0;
    }
    
    .blob-1 {
        width: 500px;
        height: 500px;
        background: linear-gradient(135deg, rgba(255, 143, 148, 0.3), rgba(255, 174, 142, 0.3));
        filter: blur(80px);
        top: -150px;
        right: -100px;
    }
    
    .blob-2 {
        width: 400px;
        height: 400px;
        background: linear-gradient(135deg, rgba(64, 158, 255, 0.2), rgba(255, 208, 119, 0.2));
        filter: blur(60px);
        bottom: -100px;
        left: -50px;
    }
}

.reset-container {
    width: 100%;
    max-width: 400px;
    padding: 20px;
    position: relative;
    z-index: 10;
}

.reset-card {
    border-radius: 24px !important;
    padding: 32px 28px;
    border: none !important;
    box-shadow: 0 20px 60px rgba(255, 142, 148, 0.15) !important;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
}

.reset-header {
    text-align: center;
    margin-bottom: 28px;
    
    .logo {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        margin-bottom: 16px;
    }
    
    .title {
        font-size: 24px;
        font-weight: 800;
        color: var(--el-color-primary);
        margin: 0 0 8px 0;
    }
    
    .subtitle {
        font-size: 14px;
        color: #909399;
        margin: 0;
    }
}

.input-group {
    position: relative;
    margin-bottom: 18px;
    
    .input-icon {
        position: absolute;
        left: 16px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 10;
        color: var(--el-text-color-placeholder);
        font-size: 18px;
    }
    
    :deep(.custom-input) {
        .el-input__wrapper {
            padding: 4px 16px 4px 48px;
            border-radius: 16px;
            background: var(--el-fill-color-light);
            border: 2px solid transparent;
            box-shadow: none !important;
            transition: all 0.3s;
            
            &:hover {
                border-color: var(--el-border-color);
            }
            
            &.is-focus {
                border-color: var(--el-color-primary);
                background: white;
            }
        }
        
        .el-input__inner {
            font-size: 15px;
            height: 44px;
            line-height: 44px;
        }
    }
}

.submit-btn {
    width: 100%;
    height: 52px;
    font-weight: 700;
    font-size: 16px;
    margin-top: 8px;
    background: linear-gradient(135deg, var(--el-color-primary) 0%, #ff6b8a 100%) !important;
    border: none !important;
    box-shadow: 0 8px 24px rgba(255, 143, 148, 0.4);
}

.success-view {
    text-align: center;
    padding: 20px 0;
    
    .success-icon {
        font-size: 64px;
        color: var(--el-color-success);
        margin-bottom: 20px;
    }
    
    h3 {
        font-size: 22px;
        font-weight: 700;
        color: var(--el-text-color-primary);
        margin: 0 0 12px 0;
    }
    
    p {
        font-size: 14px;
        color: var(--el-text-color-secondary);
        margin: 0 0 28px 0;
    }
    
    .login-btn {
        width: 100%;
        height: 48px;
        font-weight: 600;
    }
}

@media (max-width: 480px) {
    .reset-card {
        border-radius: 20px !important;
    }
}
</style>
