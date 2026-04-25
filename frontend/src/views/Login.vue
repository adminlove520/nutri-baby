<template>
  <div class="login-page">
    <div class="login-bg">
       <div class="blob blob-1"></div>
       <div class="blob blob-2"></div>
       <div class="blob blob-3"></div>
    </div>
    
    <div class="login-container">
      <div class="login-header">
        <div class="logo-area">
          <img src="@/assets/vue.svg" alt="Logo" class="logo" />
          <div class="brand">
            <h1 class="title">Nutri-Baby</h1>
            <p class="subtitle">让科学育儿更简单、更温馨</p>
          </div>
        </div>
      </div>

      <el-card class="login-card" shadow="always">
        <el-tabs v-model="activeTab" class="login-tabs">
          <el-tab-pane label="账号登录" name="password">
             <el-form :model="loginForm" class="login-form" @submit.prevent="handlePasswordLogin">
                <div class="input-group">
                  <div class="input-icon">
                    <el-icon><User /></el-icon>
                  </div>
                  <el-input 
                    v-model="loginForm.account" 
                    placeholder="手机号 / 邮箱" 
                    class="custom-input"
                    size="large"
                  />
                </div>
                <div class="input-group">
                  <div class="input-icon">
                    <el-icon><Lock /></el-icon>
                  </div>
                  <el-input 
                    v-model="loginForm.password" 
                    type="password" 
                    placeholder="密码" 
                    class="custom-input"
                    size="large"
                    show-password
                  />
                </div>
                <div class="form-actions">
                   <el-button link type="primary" class="forget-btn" @click="handleForgotPassword">忘记密码？</el-button>
                </div>
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
                   <span>还没有账号？</span>
                   <el-button link type="primary" @click="activeTab = 'register'">立即注册</el-button>
                </div>
             </el-form>
          </el-tab-pane>

          <el-tab-pane label="新用户注册" name="register">
              <el-form :model="registerForm" class="login-form" @submit.prevent="handleRegister">
                <div class="input-group">
                  <div class="input-icon">
                    <el-icon><User /></el-icon>
                  </div>
                  <el-input v-model="registerForm.nickname" placeholder="您的昵称" class="custom-input" size="large" />
                </div>
                <div class="input-group">
                  <div class="input-icon">
                    <el-icon><Message /></el-icon>
                  </div>
                  <el-input v-model="registerForm.account" placeholder="手机号 / 邮箱" class="custom-input" size="large" />
                </div>
                <div class="input-group">
                  <div class="input-icon">
                    <el-icon><Lock /></el-icon>
                  </div>
                  <el-input v-model="registerForm.password" type="password" placeholder="设置密码（至少6位）" class="custom-input" size="large" show-password />
                </div>
                <el-button type="primary" size="large" round class="submit-btn" @click="handleRegister" :loading="loading">确认注册</el-button>
                <div class="form-footer">
                   <span>已有账号？</span>
                   <el-button link type="primary" @click="activeTab = 'password'">去登录</el-button>
                </div>
              </el-form>
          </el-tab-pane>
        </el-tabs>

        <div class="agreement">
          <span>登录即代表同意</span>
          <el-button link type="primary" @click="showAgreement('terms')">《用户协议》</el-button>
          <span>和</span>
          <el-button link type="primary" @click="showAgreement('privacy')">《隐私政策》</el-button>
        </div>
      </el-card>
    </div>

    <!-- Agreement Dialog -->
    <el-dialog v-model="showDialog" :title="dialogTitle" width="90%" class="agreement-dialog" destroy-on-close>
      <div class="dialog-content" v-html="dialogContent"></div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { User, Lock, Message } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const activeTab = ref('password')
const showDialog = ref(false)
const dialogTitle = ref('')

const loginForm = reactive({ account: '', password: '' })
const registerForm = reactive({ account: '', password: '', nickname: '' })

const TERMS_CONTENT = `
<h3>用户协议</h3>
<p>欢迎使用Nutri-Baby！</p>
<p>请在使用我们的服务前仔细阅读以下条款。一旦您开始使用本服务，即表示您同意遵守以下条款。</p>
<h4>一、服务说明</h4>
<p>Nutri-Baby 是一款科学育儿助手应用，为用户提供宝宝健康记录、疫苗接种管理、成长数据分析等服务。</p>
<h4>二、用户责任</h4>
<p>用户需保证所提供的信息真实、准确，并对自己的账户安全负责。</p>
<h4>三、隐私保护</h4>
<p>我们承诺保护您的隐私，不会未经授权向第三方透露您的个人信息。</p>
<h4>四、服务变更</h4>
<p>我们保留随时修改或中断服务的权利，恕不另行通知。</p>
<h4>五、联系我们</h4>
<p>如有任何问题，请通过应用内反馈功能联系我们。</p>
`

const PRIVACY_CONTENT = `
<h3>隐私政策</h3>
<p>Nutri-Baby 高度重视您的隐私保护。</p>
<h4>一、信息收集</h4>
<p>我们收集您主动提供的信息，包括：宝宝档案、喂养记录、疫苗接种信息等。</p>
<h4>二、信息使用</h4>
<p>您的信息仅用于提供和改进我们的服务，不会用于广告推送。</p>
<h4>三、信息共享</h4>
<p>除法律要求外，我们不会与任何第三方共享您的个人信息。</p>
<h4>四、数据安全</h4>
<p>我们采用行业标准的安全措施保护您的数据。</p>
<h4>五、用户权利</h4>
<p>您有权随时查看、修改或删除您的账户信息。</p>
<h4>六、联系我们</h4>
<p>如对隐私政策有任何疑问，请联系我们。</p>
`

const dialogContent = computed(() => {
  if (dialogTitle.value.includes('用户协议')) return TERMS_CONTENT
  if (dialogTitle.value.includes('隐私政策')) return PRIVACY_CONTENT
  return ''
})

const dialogTitleMap: Record<string, string> = {
  terms: '用户协议',
  privacy: '隐私政策'
}

const showAgreement = (type: string) => {
  dialogTitle.value = dialogTitleMap[type]
  showDialog.value = true
}

const handleForgotPassword = async () => {
  const account = loginForm.account?.trim()
  if (!account) {
    ElMessage.warning('请先输入要找回的账号（手机号或邮箱）')
    return
  }
  try {
    await fetch('/api/auth?action=forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account })
    })
    ElMessage.success('如果该账号存在，重置链接已发送到您的邮箱或手机')
  } catch (e: any) {
    ElMessage.error(e?.message || '发送重置链接失败，请稍后重试')
  }
}

const handlePasswordLogin = async () => {
    if (!loginForm.account || !loginForm.password) {
        ElMessage.warning('请输入账号密码')
        return
    }
    loading.value = true
    try {
        await userStore.loginCredential(loginForm.account, loginForm.password)
        ElMessage({ message: '欢迎回来 👋', type: 'success', duration: 1500 })
        setTimeout(() => router.replace('/'), 300)
    } catch (e: any) {
        const serverMsg = e?.response?.data?.message
        const msg = serverMsg || e?.message || '登录失败，请检查账号密码'
        ElMessage({ message: msg, type: 'error', duration: 3000 })
    } finally {
        loading.value = false
    }
}

const handleRegister = async () => {
    if (!registerForm.account || !registerForm.password) {
        ElMessage.warning('请填写完整信息')
        return
    }

    const isEmail = registerForm.account.includes('@')
    const isPhone = /^\d{11}$/.test(registerForm.account)

    if (!isEmail && !isPhone) {
        ElMessage.warning('请输入正确的手机号或邮箱')
        return
    }
    if (registerForm.password.length < 6) {
        ElMessage.warning('密码至少需要6位')
        return
    }

    loading.value = true
    try {
        await userStore.register(registerForm.account, registerForm.password, registerForm.nickname)
        ElMessage({ message: '注册成功，欢迎加入 🎉', type: 'success', duration: 1500 })
        setTimeout(() => router.replace('/'), 300)
    } catch (e: any) {
        const serverMsg = e?.response?.data?.message
        const msg = serverMsg || e?.message || '注册失败，请稍后再试'
        ElMessage({ message: msg, type: 'error', duration: 3000 })
    } finally {
        loading.value = false
    }
}
</script>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fef6f6 0%, #f0f7ff 50%, #fff5f5 100%);
  overflow: hidden;
  position: relative;
}

.login-bg {
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
        width: 600px;
        height: 600px;
        background: linear-gradient(135deg, rgba(255, 143, 148, 0.3), rgba(255, 174, 142, 0.3));
        filter: blur(100px);
        top: -200px;
        right: -100px;
        animation: float 15s ease-in-out infinite;
    }
    
    .blob-2 {
        width: 400px;
        height: 400px;
        background: linear-gradient(135deg, rgba(64, 158, 255, 0.2), rgba(255, 208, 119, 0.2));
        filter: blur(80px);
        bottom: -100px;
        left: -50px;
        animation: float 12s ease-in-out infinite reverse;
    }
    
    .blob-3 {
        width: 300px;
        height: 300px;
        background: linear-gradient(135deg, rgba(64, 201, 138, 0.15), rgba(255, 142, 148, 0.15));
        filter: blur(60px);
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        animation: pulse 8s ease-in-out infinite;
    }
}

@keyframes float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(30px, -30px) scale(1.05); }
}

@keyframes pulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
}

.login-container {
    width: 100%;
    max-width: 420px;
    padding: 20px;
    position: relative;
    z-index: 10;
}

.login-header {
    text-align: center;
    margin-bottom: 24px;
    
    .logo-area {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
    }
    
    .logo {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        box-shadow: 0 8px 24px rgba(255, 143, 148, 0.3);
    }
    
    .brand {
        text-align: left;
    }
    
    .title {
        font-size: 28px;
        font-weight: 900;
        background: linear-gradient(135deg, var(--el-color-primary) 0%, #ff6b8a 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0;
        line-height: 1.2;
    }
    
    .subtitle {
        font-size: 13px;
        color: #909399;
        margin: 4px 0 0 0;
    }
}

.login-card {
    border-radius: 28px !important;
    padding: 24px 20px;
    position: relative;
    z-index: 10;
    border: none !important;
    box-shadow: 0 20px 60px rgba(255, 142, 148, 0.15), 0 4px 20px rgba(0, 0, 0, 0.05) !important;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
}

.login-tabs {
    :deep(.el-tabs__header) { 
        margin-bottom: 24px;
        background: var(--el-fill-color-light);
        border-radius: 16px;
        padding: 4px;
    }
    :deep(.el-tabs__nav-wrap::after) { display: none; }
    :deep(.el-tabs__item) { 
        font-weight: 600;
        font-size: 14px;
        height: 40px;
        line-height: 40px;
        border-radius: 12px;
        transition: all 0.3s;
    }
    :deep(.el-tabs__item.is-active) {
        background: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    :deep(.el-tabs__active-bar) { display: none; }
    :deep(.el-tabs__nav) { width: 100%; }
    :deep(.el-tabs__nav .el-tabs__item) { width: 50%; text-align: center; }
}

.login-form {
    padding: 8px 0;
}

.input-group {
    position: relative;
    margin-bottom: 16px;
    
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
            
            &::placeholder {
                color: var(--el-text-color-placeholder);
            }
        }
    }
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 16px;
    
    .forget-btn {
        font-size: 13px;
    }
}

.submit-btn {
    width: 100%;
    height: 52px;
    font-weight: 700;
    font-size: 16px;
    background: linear-gradient(135deg, var(--el-color-primary) 0%, #ff6b8a 100%) !important;
    border: none !important;
    box-shadow: 0 8px 24px rgba(255, 143, 148, 0.4);
    
    &:hover {
        opacity: 0.9;
        transform: translateY(-2px);
        box-shadow: 0 12px 32px rgba(255, 143, 148, 0.5);
    }
    
    &:active {
        transform: translateY(0);
    }
}

.form-footer {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--el-border-color-extra-light);
    font-size: 14px;
    color: var(--el-text-color-secondary);
}

.agreement {
    margin-top: 24px;
    text-align: center;
    font-size: 12px;
    color: #909399;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 2px;
}

.agreement-dialog {
    :deep(.el-dialog) {
        border-radius: 24px !important;
        max-width: 600px;
    }
    
    .dialog-content {
        max-height: 60vh;
        overflow-y: auto;
        padding: 0 8px;
        
        h3 {
            font-size: 20px;
            font-weight: 700;
            color: var(--el-color-primary);
            margin-bottom: 16px;
            text-align: center;
        }
        
        h4 {
            font-size: 15px;
            font-weight: 600;
            color: var(--el-text-color-primary);
            margin: 20px 0 8px 0;
        }
        
        p {
            font-size: 14px;
            line-height: 1.8;
            color: var(--el-text-color-regular);
            margin-bottom: 12px;
        }
    }
}

/* Mobile Adjustments */
@media (max-width: 480px) {
    .login-container {
        padding: 16px;
    }
    
    .login-card {
        border-radius: 24px !important;
    }
    
    .login-header {
        .title {
            font-size: 24px;
        }
    }
}
</style>
