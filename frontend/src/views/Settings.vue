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
            <el-select v-model="settings.defaultBabyId" placeholder="选择宝宝" size="default" style="width: 120px" @change="saveSettings">
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
              <span class="desc">开启护眼深色界面</span>
            </div>
            <el-switch v-model="settings.darkMode" @change="handleThemeChange" />
          </div>
        </el-card>
      </div>

      <div class="setting-group">
        <h3 class="group-title">消息通知</h3>
        <el-card class="setting-card" shadow="never">
          <div class="setting-item">
            <div class="item-info">
              <span class="label">站内消息</span>
              <span class="desc">在应用内接收重要的系统与任务提醒</span>
            </div>
            <el-switch v-model="settings.inAppNotify" @change="saveSettings" />
          </div>
          <div class="divider"></div>
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
              <span class="label">疫苗接种提醒</span>
              <span class="desc">在预计接种前 1 天为您发送提醒</span>
            </div>
            <el-switch v-model="settings.vaccineNotify" @change="saveSettings" />
          </div>
          <div class="divider"></div>
          <div class="setting-item">
            <div class="item-info">
              <span class="label">每日 AI 育儿锦囊</span>
              <span class="desc">由 AI 每天为您生成一则科学育儿建议</span>
            </div>
            <el-switch v-model="settings.aiTipsNotify" @change="saveSettings" />
          </div>
        </el-card>
      </div>

      <div class="setting-group">
        <h3 class="group-title">定时任务 (Cron)</h3>
        <el-card class="setting-card" shadow="never">
          <div class="setting-item">
            <div class="item-info">
              <span class="label">定时扫描频率</span>
              <span class="desc">系统每日凌晨自动扫描待接种疫苗</span>
            </div>
            <el-tag type="info" size="small">每日一次</el-tag>
          </div>
          <div class="divider"></div>
          <div class="setting-item">
            <div class="item-info">
              <span class="label">手动触发同步</span>
              <span class="desc">立即检查并推送明天的疫苗接种提醒</span>
            </div>
            <el-button type="primary" size="small" :loading="syncing" @click="handleManualSync" plain round>立即执行</el-button>
          </div>
        </el-card>
      </div>

      <div class="setting-group">
        <h3 class="group-title">GitHub 图床同步</h3>
        <el-card class="setting-card" shadow="never">
          <div class="setting-item">
            <div class="item-info">
              <span class="label">配置 GitHub</span>
              <span class="desc">设置 Token、仓库、分支等信息</span>
            </div>
            <el-button type="primary" size="small" @click="openGithubConfig" plain round>配置</el-button>
          </div>
          <div class="divider"></div>
          <div class="setting-item">
            <div class="item-info">
              <span class="label">同步频率</span>
              <span class="desc">自动同步的时间间隔</span>
            </div>
            <el-select v-model="githubSettings.syncInterval" style="width: 120px" @change="handleGithubSave">
              <el-option label="每天" value="daily" />
              <el-option label="每周" value="weekly" />
              <el-option label="每月" value="monthly" />
            </el-select>
          </div>
          <div class="divider"></div>
          <div class="setting-item">
            <div class="item-info">
              <span class="label">上次同步</span>
              <span class="desc">{{ githubSettings.lastSyncAt || '从未同步' }}</span>
            </div>
            <el-button type="primary" size="small" :loading="syncingGithub" @click="handleSyncNow" plain round>立即同步</el-button>
          </div>
          <div class="divider"></div>
          <div class="setting-item">
            <div class="item-info">
              <span class="label">同步日志</span>
              <span class="desc">查看历史同步记录</span>
            </div>
            <el-button size="small" @click="showSyncLogs = true" round>查看</el-button>
          </div>
        </el-card>
      </div>

      <div class="setting-group">
        <h3 class="group-title">账号与安全</h3>
        <el-card class="setting-card" shadow="never">
          <div class="setting-item clickable" @click="passwordDialogVisible = true">
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

    <!-- GitHub Config Dialog -->
    <el-dialog v-model="githubDialogVisible" title="配置 GitHub 同步" width="90%" class="rounded-dialog" destroy-on-close>
       <el-form :model="githubForm" label-position="top">
          <el-form-item label="GitHub Token">
             <el-input v-model="githubForm.token" placeholder="ghp_xxxxxx" />
             <div class="form-tip">需要 repo 权限的 Personal Access Token</div>
          </el-form-item>
          <el-form-item label="仓库所有者 (Owner)">
             <el-input v-model="githubForm.owner" placeholder="your-username" />
          </el-form-item>
          <el-form-item label="仓库名称 (Repo)">
             <el-input v-model="githubForm.repo" placeholder="nutri-baby-photos" />
          </el-form-item>
          <el-form-item label="分支 (Branch)">
             <el-input v-model="githubForm.branch" placeholder="main" />
          </el-form-item>
          <el-form-item label="存储路径 (可选)">
             <el-input v-model="githubForm.basePath" placeholder="Photos/NutriBaby" />
             <div class="form-tip">留空则存储在根目录，路径格式：文件夹1/文件夹2</div>
          </el-form-item>
       </el-form>
       <template #footer>
          <div class="dialog-footer">
            <el-button @click="testConnection" :loading="testingConnection" plain round>测试连接</el-button>
            <el-button type="primary" @click="saveGithubConfig" :loading="savingGithub" round>保存配置</el-button>
          </div>
       </template>
    </el-dialog>

    <!-- Sync Logs Dialog -->
    <el-dialog v-model="showSyncLogs" title="同步日志" width="90%" class="rounded-dialog">
       <div class="sync-logs-list" v-if="syncLogs.length > 0">
          <div v-for="log in syncLogs" :key="log.id" class="log-item">
             <div class="log-header">
                <el-tag :type="log.status === 'success' ? 'success' : log.status === 'failed' ? 'danger' : 'warning'" size="small">
                   {{ log.status === 'success' ? '成功' : log.status === 'failed' ? '失败' : '部分成功' }}
                </el-tag>
                <span class="log-time">{{ formatTime(log.createdAt) }}</span>
             </div>
             <div class="log-message">{{ log.message }}</div>
             <div v-if="log.syncedCount > 0" class="log-count">同步 {{ log.syncedCount }} 个文件</div>
             <div v-if="log.errorLog" class="log-error">{{ log.errorLog }}</div>
          </div>
       </div>
       <el-empty v-else description="暂无同步记录" />
    </el-dialog>

    <!-- Password Change Dialog -->
    <el-dialog v-model="passwordDialogVisible" title="修改登录密码" width="90%" class="rounded-dialog">
       <el-form :model="passwordForm" label-position="top">
          <el-form-item label="当前密码">
             <el-input v-model="passwordForm.oldPassword" type="password" show-password placeholder="请输入当前密码" />
          </el-form-item>
          <el-form-item label="新密码">
             <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="请输入新密码（不少于6位）" />
          </el-form-item>
          <el-form-item label="确认新密码">
             <el-input v-model="passwordForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
          </el-form-item>
       </el-form>
       <template #footer>
          <div class="dialog-footer">
            <el-button @click="passwordDialogVisible = false" round>取消</el-button>
            <el-button type="primary" @click="changePassword" :loading="changingPassword" round>提交修改</el-button>
          </div>
       </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import client from '@/api/client'
import { useUserStore } from '@/stores/user'
import { useBabyStore } from '@/stores/baby'
import { getGitHubSettings, saveGitHubSettings, testGitHubConnection, syncToGitHub, getSyncLogs } from '@/api/settings'

const router = useRouter()
const userStore = useUserStore()
const babyStore = useBabyStore()

const settings = reactive({
    defaultBabyId: '',
    emailNotify: true,
    vaccineNotify: true,
    inAppNotify: true,
    aiTipsNotify: true,
    darkMode: false
})

const passwordDialogVisible = ref(false)
const changingPassword = ref(false)
const syncing = ref(false)
const passwordForm = reactive({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
})

const githubDialogVisible = ref(false)
const githubSettings = reactive({
    autoSync: false,
    syncInterval: 'daily' as 'daily' | 'weekly' | 'monthly',
    lastSyncAt: '',
    token: '',
    owner: '',
    repo: '',
    branch: 'main',
    basePath: ''
})
const githubForm = reactive({
    token: '',
    owner: '',
    repo: '',
    branch: 'main',
    basePath: ''
})
const testingConnection = ref(false)
const savingGithub = ref(false)
const syncingGithub = ref(false)
const showSyncLogs = ref(false)
const syncLogs = ref<Array<{
    id: number
    status: string
    message: string
    syncedCount: number
    errorLog: string | null
    createdAt: string
}>>([])

onMounted(async () => {
    // Load current settings from user info
    const userSettings = userStore.userInfo.settings || {}
    Object.assign(settings, userSettings)
    
    // Apply theme on mount
    if (settings.darkMode) {
        document.documentElement.classList.add('dark')
    } else {
        document.documentElement.classList.remove('dark')
    }

    if (babyStore.babyList.length === 0) {
        await babyStore.fetchBabies()
    }

    await loadGithubSettings()
})

const openGithubConfig = () => {
    githubForm.token = githubSettings.token
    githubForm.owner = githubSettings.owner
    githubForm.repo = githubSettings.repo
    githubForm.branch = githubSettings.branch || 'main'
    githubForm.basePath = githubSettings.basePath
    githubDialogVisible.value = true
}

const handleThemeChange = (val: boolean) => {
    if (val) {
        document.documentElement.classList.add('dark')
    } else {
        document.documentElement.classList.remove('dark')
    }
    saveSettings()
}

const saveSettings = async () => {
    try {
        await client.post('/user/update', { settings })
        userStore.setUserInfo({ ...userStore.userInfo, settings: { ...settings } })
        // No message for auto-save to keep UI clean
    } catch (e) {
        // Error handled globally
    }
}

const changePassword = async () => {
    if (!passwordForm.oldPassword) return ElMessage.warning('请输入当前密码')
    if (passwordForm.newPassword.length < 6) return ElMessage.warning('新密码不能少于6位')
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return ElMessage.warning('两次输入的新密码不一致')
    
    changingPassword.value = true
    try {
        await client.post('/user/change-password', {
            oldPassword: passwordForm.oldPassword,
            newPassword: passwordForm.newPassword
        })
        ElMessage.success('密码修改成功，请重新登录')
        passwordDialogVisible.value = false
        userStore.logout()
        router.push('/login')
    } catch (e: any) {
        // Handled
    } finally {
        changingPassword.value = false
    }
}

const handleManualSync = async () => {
    syncing.value = true
    try {
        // Trigger the cron endpoint (assuming it allows manual trigger for the logged-in user's baby or general)
        // In this implementation, api/cron.ts processes all babies.
        await client.get('/cron')
        ElMessage.success('定时任务同步完成')
    } catch (e) {
        ElMessage.error('同步失败')
    } finally {
        syncing.value = false
    }
}

const handleDeleteAccount = () => {
    ElMessageBox.prompt(
        '账号注销后，所有数据将永久删除。请输入您的登录密码以确认身份：',
        '极端危险操作',
        {
            confirmButtonText: '确认注销',
            cancelButtonText: '取消',
            inputPlaceholder: '请输入密码',
            inputType: 'password',
            confirmButtonClass: 'el-button--danger',
            roundButton: true,
            inputValidator: (val) => val ? true : '密码不能为空'
        }
    ).then(async ({ value }) => {
        try {
            await client.post('/user/delete-account', { password: value })
            ElMessage.success('账号已成功注销')
            userStore.logout()
            router.push('/login')
        } catch (e) {}
    }).catch(() => {})
}

const loadGithubSettings = async () => {
    try {
        const res = await getGitHubSettings()
        if (res) {
            githubSettings.autoSync = res.autoSync || false
            githubSettings.syncInterval = res.syncInterval || 'daily'
            githubSettings.lastSyncAt = res.lastSyncAt ? new Date(res.lastSyncAt).toLocaleString('zh-CN') : ''
            githubSettings.token = res.token || ''
            githubSettings.owner = res.owner || ''
            githubSettings.repo = res.repo || ''
            githubSettings.branch = res.branch || 'main'
            githubSettings.basePath = res.basePath || ''
        }
    } catch (e) {
        console.error('Failed to load GitHub settings', e)
    }
}

const handleGithubSave = async () => {
    await saveGitHubSettings({
        autoSync: githubSettings.autoSync,
        syncInterval: githubSettings.syncInterval
    })
    ElMessage.success('设置已保存')
}

const testConnection = async () => {
    if (!githubForm.token || !githubForm.owner || !githubForm.repo) {
        return ElMessage.warning('请填写必填项')
    }
    testingConnection.value = true
    try {
        const res = await testGitHubConnection({
            token: githubForm.token,
            owner: githubForm.owner,
            repo: githubForm.repo,
            branch: githubForm.branch
        })
        if (res.valid) {
            ElMessage.success('连接成功！')
        } else {
            ElMessage.error(res.message || '连接失败')
        }
    } catch (e: any) {
        ElMessage.error(e.message || '连接失败')
    } finally {
        testingConnection.value = false
    }
}

const saveGithubConfig = async () => {
    if (!githubForm.token) return ElMessage.warning('请填写 Token')
    if (!githubForm.owner) return ElMessage.warning('请填写仓库所有者')
    if (!githubForm.repo) return ElMessage.warning('请填写仓库名称')
    savingGithub.value = true
    try {
        await saveGitHubSettings({
            token: githubForm.token,
            owner: githubForm.owner,
            repo: githubForm.repo,
            branch: githubForm.branch,
            basePath: githubForm.basePath,
            autoSync: githubSettings.autoSync,
            syncInterval: githubSettings.syncInterval
        })
        ElMessage.success('配置已保存')
        githubDialogVisible.value = false
        await loadGithubSettings()
    } catch (e: any) {
        ElMessage.error(e.message || '保存失败')
    } finally {
        savingGithub.value = false
    }
}

const handleSyncNow = async () => {
    syncingGithub.value = true
    try {
        const res = await syncToGitHub()
        if (res.syncedCount !== undefined) {
            ElMessage.success(`同步完成！已同步 ${res.syncedCount} 个文件`)
            githubSettings.lastSyncAt = new Date().toLocaleString('zh-CN')
        } else {
            ElMessage.success(res.message || '同步完成')
        }
        await loadGithubSettings()
    } catch (e: any) {
        ElMessage.error(e.message || '同步失败')
    } finally {
        syncingGithub.value = false
    }
}

const loadSyncLogs = async () => {
    try {
        syncLogs.value = await getSyncLogs()
    } catch (e) {
        console.error('Failed to load sync logs', e)
    }
}

const formatTime = (time: string) => {
    if (!time) return ''
    return new Date(time).toLocaleString('zh-CN')
}

watch(showSyncLogs, (val) => {
    if (val) loadSyncLogs()
})
</script>

<style scoped lang="scss">
.settings-page {
  padding: 10px 16px 40px;
  max-width: 600px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  .back-btn { font-size: 20px; color: var(--el-text-color-primary); }
  .title { font-size: clamp(18px, 4vw, 22px); font-weight: 800; color: var(--el-text-color-primary); margin: 0; }
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

.rounded-dialog {
  :deep(.el-dialog) {
    border-radius: 28px !important;
    max-width: 500px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 10px;
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.sync-logs-list {
  max-height: 400px;
  overflow-y: auto;
}

.log-item {
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  &:last-child { border-bottom: none; }
}

.log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.log-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.log-message {
  font-size: 14px;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.log-count {
  font-size: 12px;
  color: var(--el-color-success);
}

.log-error {
  font-size: 12px;
  color: var(--el-color-danger);
  margin-top: 4px;
  word-break: break-all;
}
</style>
