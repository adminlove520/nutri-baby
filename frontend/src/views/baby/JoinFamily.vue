<template>
  <div class="join-page">
    <div class="login-bg">
       <div class="blob blob-1"></div>
       <div class="blob blob-2"></div>
    </div>

    <el-card class="join-card" v-loading="loading" shadow="always">
       <div class="join-header">
          <div class="icon-wrapper">
             <el-icon :size="40"><CircleCheckFilled v-if="success" /><Share v-else /></el-icon>
          </div>
          <h2>{{ success ? '加入成功' : '加入家庭' }}</h2>
          <p>{{ success ? '您现在可以共同记录宝宝的成长了' : '您收到了一封加入宝宝家庭组的邀请' }}</p>
       </div>
       
       <div v-if="success" class="success-box">
           <el-button type="primary" size="large" round class="action-btn" @click="router.push('/')">进入工作台</el-button>
       </div>

       <div v-else class="action-box">
           <div class="token-display">
              <span class="label">邀请凭证</span>
              <span class="val">{{ token?.slice(0, 12) }}...</span>
           </div>
           <el-button type="primary" size="large" round class="action-btn" @click="handleJoin">接受邀请并加入</el-button>
           <el-button link @click="router.push('/')" class="later-btn">以后再说</el-button>
       </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { CircleCheckFilled, Share } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const success = ref(false)
const token = ref('')

onMounted(() => {
    token.value = route.query.token as string
    if (!token.value) {
        ElMessage.error('无效的邀请链接')
        router.push('/')
    }
})

const handleJoin = async () => {
    loading.value = true
    try {
        const authToken = localStorage.getItem('token')
        await axios.post('/api/baby/join', { token: token.value }, {
            headers: { Authorization: `Bearer ${authToken}` }
        })
        success.value = true
        ElMessage.success('欢迎加入大家庭！')
    } catch (e: any) {
        ElMessage.error(e.response?.data?.message || '加入失败，链接可能已过期')
    } finally {
        loading.value = false
    }
}
</script>

<style scoped lang="scss">
.join-page {
  height: 100vh; display: flex; align-items: center; justify-content: center;
  background-color: #fff; overflow: hidden; position: relative;
}

.login-bg {
    position: absolute; width: 100%; height: 100%;
    .blob { position: absolute; filter: blur(80px); opacity: 0.15; border-radius: 50%; }
    .blob-1 { width: 500px; height: 500px; background-color: var(--el-color-primary); top: -100px; left: -100px; }
    .blob-2 { width: 400px; height: 400px; background-color: #88d498; bottom: -50px; right: -50px; }
}

.join-card {
  width: 100%; max-width: 420px; border-radius: 30px !important; padding: 30px 20px;
  position: relative; z-index: 10; border: none !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.05) !important;
  text-align: center;
}

.join-header {
    margin-bottom: 40px;
    .icon-wrapper {
        width: 80px; height: 80px; border-radius: 24px; background: var(--el-color-primary-light-9);
        color: var(--el-color-primary); display: flex; align-items: center; justify-content: center;
        margin: 0 auto 20px;
    }
    h2 { font-size: 24px; font-weight: 800; color: #2c3e50; margin-bottom: 8px; }
    p { font-size: 14px; color: #909399; }
}

.token-display {
    background: #fcfcfc; border-radius: 12px; padding: 12px; margin-bottom: 24px;
    display: flex; justify-content: space-between; font-size: 13px;
    .label { color: #909399; }
    .val { font-family: monospace; color: #606266; }
}

.action-btn { width: 100%; height: 54px; font-weight: 700; font-size: 16px; }
.later-btn { margin-top: 16px; color: #C0C4CC; }

.success-box {
    padding-top: 10px;
}
</style>
