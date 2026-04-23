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
        <el-tab-pane label="账号登录" name="password">
           <el-form :model="loginForm" class="login-form">
              <el-form-item>
                <el-input 
                  v-model="loginForm.account" 
                  placeholder="手机号 / 邮箱" 
                  prefix-icon="User" 
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
                  @keyup.enter="handlePasswordLogin"
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

        <el-tab-pane label="新用户注册" name="register">
            <el-form :model="registerForm" class="login-form">
              <el-form-item>
                <el-input v-model="registerForm.nickname" placeholder="您的昵称" prefix-icon="User" size="large" />
              </el-form-item>
              <el-form-item>
                <el-input v-model="registerForm.account" placeholder="手机号 / 邮箱" prefix-icon="Message" size="large" />
              </el-form-item>
              <el-form-item>
                <el-input v-model="registerForm.password" type="password" placeholder="设置密码" prefix-icon="Lock" size="large" show-password @keyup.enter="handleRegister" />
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
import { User, Lock, Message } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const activeTab = ref('password')

const loginForm = reactive({ account: '', password: '' })
const registerForm = reactive({ account: '', password: '', nickname: '' })

const handlePasswordLogin = async () => {
    if (!loginForm.account || !loginForm.password) return ElMessage.warning('请输入账号密码')
    loading.value = true
    try {
        await userStore.loginCredential(loginForm.account, loginForm.password)
        ElMessage.success('欢迎回来 👋')
        // 确保 token 已写入后再跳转
        await router.replace('/')
    } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || '登录失败，请检查账号密码'
        ElMessage.error(msg)
    } finally {
        loading.value = false
    }
}

const handleRegister = async () => {
    if (!registerForm.account || !registerForm.password) return ElMessage.warning('请填写完整信息')
    
    const isEmail = registerForm.account.includes('@')
    const isPhone = /^\d{11}$/.test(registerForm.account)
    
    if (!isEmail && !isPhone) return ElMessage.warning('请输入正确的手机号或邮箱')
    if (registerForm.password.length < 6) return ElMessage.warning('密码至少需要6位')
    
    loading.value = true
    try {
        await userStore.register(registerForm.account, registerForm.password, registerForm.nickname)
        ElMessage.success('注册成功，欢迎加入 🎉')
        await router.replace('/')
    } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || '注册失败，请稍后再试'
        ElMessage.error(msg)
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
