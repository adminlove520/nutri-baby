<template>
  <div class="login-page">
    <div class="login-bg">
       <div class="blob blob-1"></div>
       <div class="blob blob-2"></div>
    </div>
    
    <el-card class="login-card" shadow="always">
      <div class="login-header">
        <img src="@/assets/vue.svg" alt="Logo" class="logo" />
        <h1 class="title">Nutri-Baby</h1>
        <p class="subtitle">让科学育儿更简单、更温馨</p>
      </div>

      <el-tabs v-model="activeTab" class="login-tabs">
        <el-tab-pane label="验证码登录" name="code">
           <div class="login-form">
              <el-button 
                type="primary" 
                size="large" 
                round 
                class="wechat-btn" 
                @click="handleWechatLogin"
                :loading="loading"
              >
                微信一键登录
              </el-button>
              <div class="divider">
                <span>或使用模拟登录</span>
              </div>
              <el-button 
                plain 
                size="large" 
                round 
                class="mock-btn" 
                @click="handleMockLogin"
              >
                开发者模拟入口
              </el-button>
           </div>
        </el-tab-pane>
        
        <el-tab-pane label="账号登录" name="password">
           <el-form :model="loginForm" class="login-form">
              <el-form-item>
                <el-input 
                  v-model="loginForm.phone" 
                  placeholder="手机号" 
                  prefix-icon="Iphone" 
                  size="large"
                />
              </el-form-item>
              <el-form-item>
                <el-input 
                  v-model="loginForm.password" 
                  type="password" 
                  placeholder="密码" 
                  prefix-icon="Lock" 
                  size="large"
                  show-password
                />
              </el-form-item>
              <el-button 
                type="primary" 
                size="large" 
                round 
                class="submit-btn" 
                @click="handlePasswordLogin"
                :loading="loading"
              >
                立即登录
              </el-button>
              <div class="form-footer">
                 <el-button link type="primary" @click="activeTab = 'register'">立即注册</el-button>
                 <el-button link type="info">忘记密码？</el-button>
              </div>
           </el-form>
        </el-tab-pane>

        <el-tab-pane label="注册" name="register">
            <el-form :model="registerForm" class="login-form">
              <el-form-item>
                <el-input v-model="registerForm.nickname" placeholder="您的昵称" prefix-icon="User" size="large" />
              </el-form-item>
              <el-form-item>
                <el-input v-model="registerForm.phone" placeholder="手机号" prefix-icon="Iphone" size="large" />
              </el-form-item>
              <el-form-item>
                <el-input v-model="registerForm.password" type="password" placeholder="设置密码" prefix-icon="Lock" size="large" show-password />
              </el-form-item>
              <el-button type="primary" size="large" round class="submit-btn" @click="handleRegister" :loading="loading">确认注册</el-button>
              <div class="form-footer">
                 <el-button link type="primary" @click="activeTab = 'password'">已有账号？去登录</el-button>
              </div>
           </el-form>
        </el-tab-pane>
      </el-tabs>

      <div class="agreement">
        登录即代表同意 <el-button link type="primary">《用户协议》</el-button> 和 <el-button link type="primary">《隐私政策》</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const activeTab = ref('code')

const loginForm = reactive({ phone: '', password: '' })
const registerForm = reactive({ phone: '', password: '', nickname: '' })

const handleWechatLogin = () => {
    ElMessage.info('正在唤起微信登录...')
    // handleMockLogin()
}

const handleMockLogin = async () => {
    loading.value = true
    try {
        await userStore.login('mock-user-' + Math.random().toString(36).slice(2, 6))
        ElMessage.success('登录成功')
        router.push('/')
    } catch (e) {
        ElMessage.error('登录失败')
    } finally {
        loading.value = false
    }
}

const handlePasswordLogin = async () => {
    if (!loginForm.phone || !loginForm.password) return ElMessage.warning('请输入账号密码')
    loading.value = true
    try {
        await userStore.loginCredential(loginForm.phone, loginForm.password)
        ElMessage.success('欢迎回来')
        router.push('/')
    } catch (e) {
        ElMessage.error('账号或密码错误')
    } finally {
        loading.value = false
    }
}

const handleRegister = async () => {
    if (!registerForm.phone || !registerForm.password) return ElMessage.warning('请填写完整信息')
    loading.value = true
    try {
        await userStore.register(registerForm.phone, registerForm.password, registerForm.nickname)
        ElMessage.success('注册成功，已自动登录')
        router.push('/')
    } catch (e) {
        ElMessage.error('注册失败，该号码可能已被注册')
    } finally {
        loading.value = false
    }
}
</script>

<style scoped lang="scss">
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  overflow: hidden;
  position: relative;
}

.login-bg {
    position: absolute;
    width: 100%;
    height: 100%;
    
    .blob {
        position: absolute;
        filter: blur(80px);
        opacity: 0.2;
        border-radius: 50%;
        z-index: 0;
    }
    
    .blob-1 {
        width: 500px;
        height: 500px;
        background-color: var(--el-color-primary);
        top: -100px;
        left: -100px;
    }
    
    .blob-2 {
        width: 400px;
        height: 400px;
        background-color: #ffd077;
        bottom: -50px;
        right: -50px;
    }
}

.login-card {
  width: 100%;
  max-width: 420px;
  border-radius: 30px !important;
  padding: 20px;
  position: relative;
  z-index: 10;
  border: none !important;
  box-shadow: 0 20px 60px rgba(255, 142, 148, 0.1) !important;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
  
  .logo {
    width: 64px;
    margin-bottom: 16px;
  }
  
  .title {
    font-size: 28px;
    font-weight: 900;
    color: var(--el-color-primary);
    margin-bottom: 8px;
  }
  
  .subtitle {
    font-size: 14px;
    color: #909399;
  }
}

.login-tabs {
    :deep(.el-tabs__header) { margin-bottom: 24px; }
    :deep(.el-tabs__nav-wrap::after) { height: 1px; opacity: 0.1; }
    :deep(.el-tabs__item) { font-weight: 700; font-size: 15px; }
}

.login-form {
    padding: 10px 0;
}

.wechat-btn {
    width: 100%;
    height: 54px;
    background: linear-gradient(135deg, #07c160 0%, #06ae56 100%);
    border: none;
    font-weight: 700;
    font-size: 16px;
    margin-bottom: 20px;
    
    &:hover { background: #06ad56; }
}

.divider {
    text-align: center;
    position: relative;
    margin: 20px 0;
    
    &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: #f0f0f0;
        z-index: 1;
    }
    
    span {
        background: #fff;
        padding: 0 15px;
        color: #C0C4CC;
        font-size: 13px;
        position: relative;
        z-index: 2;
    }
}

.mock-btn {
    width: 100%;
    height: 50px;
    border-color: #f0f0f0;
}

.submit-btn {
    width: 100%;
    height: 54px;
    font-weight: 700;
    font-size: 16px;
    margin-top: 10px;
}

.form-footer {
    display: flex;
    justify-content: space-between;
    margin-top: 16px;
    padding: 0 4px;
}

.agreement {
    margin-top: 32px;
    text-align: center;
    font-size: 12px;
    color: #909399;
}

/* Mobile Adjustments */
@media (max-width: 480px) {
    .login-card {
        border-radius: 0 !important;
        box-shadow: none !important;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
}
</style>
