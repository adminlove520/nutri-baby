<template>
  <div class="invite-page">
    <div class="page-header">
      <el-button link :icon="Back" @click="router.back()">返回</el-button>
      <h2 class="title">邀请家人</h2>
    </div>

    <el-card class="invite-card" shadow="hover" v-loading="loading">
       <div class="invite-header">
          <div class="icon-wrapper">
             <el-icon :size="32"><Share /></el-icon>
          </div>
          <h3>开启共享育儿</h3>
          <p>邀请家人共同记录和守护宝宝的成长</p>
       </div>

       <div v-if="inviteUrl" class="url-box">
          <div class="url-text">{{ inviteUrl }}</div>
          <el-button type="primary" round class="copy-btn" @click="copyUrl">复制链接发送给家人</el-button>
          <p class="hint">链接 24 小时内有效，仅限一人使用</p>
       </div>

       <div v-else class="empty-state">
          <el-button type="primary" size="large" round @click="generateLink">生成邀请链接</el-button>
       </div>
    </el-card>

    <div class="faq-section">
       <h4>常见问题</h4>
       <div class="faq-item">
          <h5>1. 家人加入后可以看到什么？</h5>
          <p>家人加入后可以查看和记录宝宝的所有数据，包括喂养、睡眠和生长记录。</p>
       </div>
       <div class="faq-item">
          <h5>2. 如何取消家人的权限？</h5>
          <p>目前版本仅支持加入，取消权限功能将在后续版本中推出。</p>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Back, Share } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import client from '@/api/client'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const inviteUrl = ref('')

const generateLink = async () => {
    loading.value = true
    try {
        const babyId = route.params.id as string
        if (!babyId) {
            ElMessage.error('宝宝 ID 无效，请返回重试')
            return
        }
        // GET /api/baby/:babyId/invite → action=invite&babyId=:babyId
        const res: any = await client.get(`/baby/${babyId}/invite`)
        // Backend returns { token } — build the invite URL
        const token = res.token || res
        inviteUrl.value = `${window.location.origin}/join?token=${token}`
    } catch (e: any) {
        console.error('[Invite] Error:', e)
        ElMessage.error('生成失败，请稍后再试')
    } finally {
        loading.value = false
    }
}

const copyUrl = () => {
    navigator.clipboard.writeText(inviteUrl.value)
    ElMessage.success('链接已复制到剪贴板')
}
</script>

<style scoped lang="scss">
.invite-page { max-width: 500px; margin: 0 auto; padding-bottom: 60px; }
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; .title { font-size: 20px; font-weight: 800; color: #2c3e50; } }

.invite-card {
    border-radius: 24px !important;
    text-align: center;
    padding: 20px 0;
    
    .invite-header {
        margin-bottom: 30px;
        .icon-wrapper {
            width: 72px; height: 72px; border-radius: 24px; background: var(--el-color-primary-light-9);
            color: var(--el-color-primary); display: flex; align-items: center; justify-content: center;
            margin: 0 auto 16px;
        }
        h3 { font-size: 20px; font-weight: 800; color: #2c3e50; margin-bottom: 8px; }
        p { font-size: 14px; color: #909399; }
    }
}

.url-box {
    background: #fcfcfc; border: 1px dashed var(--el-color-primary-light-7);
    border-radius: 16px; padding: 20px; margin: 0 10px;
    
    .url-text {
        font-family: monospace; font-size: 12px; color: #606266;
        word-break: break-all; margin-bottom: 20px; padding: 12px;
        background: #fff; border-radius: 8px; border: 1px solid #f0f0f0;
    }
    
    .copy-btn { width: 100%; height: 50px; font-weight: bold; }
    .hint { font-size: 12px; color: #C0C4CC; margin-top: 12px; }
}

.faq-section {
    margin-top: 40px; padding: 0 10px;
    h4 { font-size: 16px; font-weight: 800; color: #2c3e50; margin-bottom: 20px; }
    .faq-item {
        margin-bottom: 20px;
        h5 { font-size: 14px; font-weight: 700; color: #303133; margin-bottom: 8px; }
        p { font-size: 13px; color: #909399; line-height: 1.6; }
    }
}
</style>
