<template>
  <div class="settings-page">
    <div class="page-header">
      <el-button link :icon="ArrowLeft" @click="router.back()" class="back-btn"></el-button>
      <h2 class="title">系统设置</h2>
    </div>

    <div class="settings-content">
      <div class="setting-group">
        <h3 class="group-title">偏好设置</h3>
        <el-card class="setting-card" shadow="never">
          <div class="setting-item">
            <div class="item-info">
              <span class="label">默认首页显示</span>
              <span class="desc">打开应用时首选显示的宝宝</span>
            </div>
            <el-select v-model="settings.defaultBabyId" placeholder="选择宝宝" size="default" style="width: 120px">
              <el-option 
                v-for="baby in babyStore.babyList" 
                :key="baby.id" 
                :label="baby.nickname || baby.name" 
                :value="baby.id" 
              />
            </el-select>
          </div>
          <div class="divider"></div>
          <div class="setting-item">
            <div class="item-info">
              <span class="label">深色模式</span>
              <span class="desc">根据系统自动切换 (开发中)</span>
            </div>
            <el-switch v-model="settings.darkMode" disabled />
          </div>
        </el-card>
      </div>

      <div class="setting-group">
        <h3 class="group-title">消息通知</h3>
        <el-card class="setting-card" shadow="never">
          <div class="setting-item">
            <div class="item-info">
              <span class="label">邮件提醒</span>
              <span class="desc">开启疫苗接种、成长建议的邮件推送</span>
            </div>
            <el-switch v-model="settings.emailNotify" @change="saveSettings" />
          </div>
          <div class="divider"></div>
          <div class="setting-item">
            <div class="item-info">
              <span class="label">应用内推送</span>
              <span class="desc">在首页和消息中心显示提醒</span>
            </div>
            <el-switch v-model="settings.inAppNotify" @change="saveSettings" />
          </div>
        </el-card>
      </div>

      <div class="setting-group">
        <h3 class="group-title">账号与安全</h3>
        <el-card class="setting-card" shadow="never">
          <div class="setting-item clickable" @click="handleResetPassword">
            <div class="item-info">
              <span class="label">修改登录密码</span>
              <span class="desc">定期更换密码更安全</span>
            </div>
            <el-icon><ArrowRight /></el-icon>
          </div>
          <div class="divider"></div>
          <div class="setting-item clickable" @click="handleDeleteAccount">
            <div class="item-info">
              <span class="label danger">注销账号</span>
              <span class="desc">永久删除您的所有育儿记录</span>
            </div>
            <el-icon class="danger"><ArrowRight /></el-icon>
          </div>
        </el-card>
      </div>

      <div class="footer-info">
        <p>Nutri-Baby v1.2.0 (Stable)</p>
        <p>已通过 SSL 加密传输，确保您的数据隐私安全</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import client from '@/api/client'
import { useUserStore } from '@/stores/user'
import { useBabyStore } from '@/stores/baby'

const router = useRouter()
const userStore = useUserStore()
const babyStore = useBabyStore()

const settings = reactive({
    defaultBabyId: '',
    emailNotify: true,
    inAppNotify: true,
    darkMode: false
})

onMounted(async () => {
    // Load current settings from user info
    const userSettings = userStore.userInfo.settings || {}
    Object.assign(settings, userSettings)
    
    if (babyStore.babyList.length === 0) {
        await babyStore.fetchBabies()
    }
})

const saveSettings = async () => {
    try {
        await client.post('/user/update', { settings })
        userStore.setUserInfo({ ...userStore.userInfo, settings: { ...settings } })
        ElMessage.success('设置已保存')
    } catch (e) {
        // Error handled globally
    }
}

const handleResetPassword = () => ElMessage.info('该功能正在维护中，请联系客服')

const handleDeleteAccount = () => {
    ElMessageBox.confirm(
        '账号注销后，所有宝宝记录、成长曲线和疫苗计划将永久删除且无法找回。确认注销？',
        '极端危险操作',
        {
            confirmButtonText: '确定注销',
            cancelButtonText: '我再想想',
            type: 'error',
            confirmButtonClass: 'el-button--danger',
            roundButton: true
        }
    ).then(() => {
        ElMessage.warning('为了您的数据安全，请联系 info@nutribaby.app 进行人工核验注销')
    }).catch(() => {})
}
</script>

<style scoped lang="scss">
.settings-page {
  padding: 10px 16px 40px;
  max-width: 600px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  .back-btn { font-size: 20px; color: var(--el-text-color-primary); }
  .title { font-size: 22px; font-weight: 800; color: var(--el-text-color-primary); margin: 0; }
}

.setting-group {
    margin-bottom: 30px;
    .group-title {
        font-size: 13px;
        font-weight: 800;
        color: var(--el-text-color-secondary);
        margin: 0 0 10px 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
}

.setting-card {
    border-radius: 24px !important;
    :deep(.el-card__body) { padding: 0; }
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    
    &.clickable {
        cursor: pointer;
        &:active { background: #f9fbfc; }
    }
    
    .item-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        .label { font-size: 15px; font-weight: 700; color: var(--el-text-color-primary); &.danger { color: var(--el-color-danger); } }
        .desc { font-size: 12px; color: var(--el-text-color-secondary); }
    }
    
    .el-icon { color: var(--el-border-color); font-size: 16px; &.danger { color: var(--el-color-danger); opacity: 0.5; } }
}

.divider { height: 1px; background: var(--el-border-color-lighter); margin: 0 20px; }

.footer-info {
    text-align: center;
    margin-top: 40px;
    p { font-size: 12px; color: var(--el-text-color-secondary); margin: 4px 0; }
}
</style>
