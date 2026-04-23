<template>
  <div class="user-page">
    <div class="page-header">
      <h2 class="title">个人中心</h2>
    </div>

    <!-- User Profile Card -->
    <el-card class="profile-card" shadow="always">
       <div class="profile-content">
          <div class="avatar-wrapper" @click="triggerUpload">
             <el-avatar :size="84" :src="userInfo.avatarUrl || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" class="main-avatar" />
             <div class="camera-overlay">
                <el-icon><Camera /></el-icon>
             </div>
             <input type="file" ref="fileInput" class="hidden-input" @change="handleFileUpload" accept="image/*" />
          </div>
          <div class="user-info">
             <div class="name-box">
                <span class="nickname">{{ userInfo.nickname || '新用户' }}</span>
                <el-button link :icon="Edit" @click="openEditDialog" class="edit-icon-btn"></el-button>
             </div>
             <div class="account-id">{{ userInfo.phone || userInfo.email || '未绑定账号' }}</div>
          </div>
       </div>
       
       <div class="stat-grid">
          <div class="stat-box">
             <span class="stat-val">{{ babyCount }}</span>
             <span class="stat-label">守护宝宝</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-box">
             <span class="stat-val">{{ totalRecords }}</span>
             <span class="stat-label">记录总数</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-box">
             <span class="stat-val">{{ joinDays }}</span>
             <span class="stat-label">加入天数</span>
          </div>
       </div>
    </el-card>

    <!-- Menu List -->
    <div class="menu-sections">
       <div class="menu-section">
          <h3 class="section-label">宝宝管理</h3>
          <el-card class="action-card" shadow="never">
             <div class="action-item" @click="router.push('/baby/list')">
                <div class="action-left">
                   <div class="icon-wrap color-1"><el-icon><UserIcon /></el-icon></div>
                   <span>宝宝档案</span>
                </div>
                <el-icon class="arrow-icon"><ArrowRight /></el-icon>
             </div>
             <div class="action-divider"></div>
             <div class="action-item" @click="router.push('/baby/edit')">
                <div class="action-left">
                   <div class="icon-wrap color-2"><el-icon><Plus /></el-icon></div>
                   <span>添加宝宝</span>
                </div>
                <el-icon class="arrow-icon"><ArrowRight /></el-icon>
             </div>
          </el-card>
       </div>

       <div class="menu-section">
          <h3 class="section-label">功能与服务</h3>
          <el-card class="action-card" shadow="never">
             <div class="action-item" @click="router.push('/vaccine')">
                <div class="action-left">
                   <div class="icon-wrap color-3"><el-icon><Memo /></el-icon></div>
                   <span>疫苗接种助手</span>
                </div>
                <el-icon class="arrow-icon"><ArrowRight /></el-icon>
             </div>
             <div class="action-divider"></div>
             <div class="action-item" @click="sendTestEmail">
                <div class="action-left">
                   <div class="icon-wrap color-5"><el-icon><Message /></el-icon></div>
                   <span>提醒邮件测试</span>
                </div>
                <el-icon class="arrow-icon"><ArrowRight /></el-icon>
             </div>
             <div class="action-divider"></div>
             <div class="action-item" @click="router.push('/settings')">
                <div class="action-left">
                   <div class="icon-wrap color-4"><el-icon><Setting /></el-icon></div>
                   <span>系统偏好设置</span>
                </div>
                <el-icon class="arrow-icon"><ArrowRight /></el-icon>
             </div>
          </el-card>
       </div>

       <div class="menu-section">
          <h3 class="section-label">更多</h3>
          <el-card class="action-card" shadow="never">
             <div class="action-item" @click="router.push('/about')">
                <div class="action-left">
                   <div class="icon-wrap color-6"><el-icon><InfoFilled /></el-icon></div>
                   <span>关于 Nutri-Baby</span>
                </div>
                <div class="action-right">
                   <span class="version-tag">v1.2.0</span>
                   <el-icon class="arrow-icon"><ArrowRight /></el-icon>
                </div>
             </div>
          </el-card>
       </div>
    </div>

    <div class="bottom-actions">
       <el-button type="danger" plain class="full-width-btn" @click="handleLogout">退出当前账号</el-button>
    </div>

    <!-- Edit Profile Dialog -->
    <el-dialog v-model="editDialogVisible" title="个人信息设置" width="90%" class="rounded-dialog">
       <el-form :model="editForm" label-position="top">
          <el-form-item label="显示昵称">
             <el-input v-model="editForm.nickname" placeholder="想让我们怎么称呼您？" />
          </el-form-item>
          <el-form-item label="提醒邮箱">
             <el-input v-model="editForm.email" placeholder="用于接收疫苗接种通知" />
          </el-form-item>
       </el-form>
       <template #footer>
          <div class="dialog-footer">
            <el-button @click="editDialogVisible = false" round>取消</el-button>
            <el-button type="primary" @click="saveProfile" :loading="saving" round>保存更改</el-button>
          </div>
       </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { 
  User as UserIcon, ArrowRight, Plus, Memo, Setting, InfoFilled, Camera, Message, Edit 
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import client from '@/api/client'
import { useUserStore } from '@/stores/user'
import { useBabyStore } from '@/stores/baby'

const router = useRouter()
const userStore = useUserStore()
const babyStore = useBabyStore()
const fileInput = ref<HTMLInputElement | null>(null)

const userInfo = computed(() => userStore.userInfo)

const editDialogVisible = ref(false)
const saving = ref(false)
const editForm = reactive({
    nickname: '',
    email: ''
})

const openEditDialog = () => {
    editForm.nickname = userInfo.value.nickname
    editForm.email = userInfo.value.email || ''
    editDialogVisible.value = true
}

const saveProfile = async () => {
    if (!editForm.nickname) return ElMessage.warning('昵称不能为空')
    saving.value = true
    try {
        const res: any = await client.post('/user/update', editForm)
        userStore.setUserInfo(res)
        ElMessage.success('信息更新成功')
        editDialogVisible.value = false
    } catch (e) {
        // Error handled globally
    } finally {
        saving.value = false
    }
}

const triggerUpload = () => {
    fileInput.value?.click()
}

const handleFileUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) return ElMessage.warning('图片不能超过 2MB')

    const loading = ElMessage({ message: '正在同步头像...', duration: 0, type: 'info' })
    try {
        const res: any = await client.post(`/upload?filename=${encodeURIComponent(file.name)}`, file, {
            headers: { 'Content-Type': file.type }
        })
        
        const avatarUrl = res.url
        await client.post('/user/update', { avatarUrl })
        
        userStore.setUserInfo({ avatarUrl })
        ElMessage.success('头像已焕新')
    } catch (e) {
        // Error handled globally
    } finally {
        loading.close()
    }
}

const babyCount = ref(0)
const totalRecords = ref(0)
const joinDays = ref(0)

const fetchStats = async () => {
    try {
        const res: any = await client.get('/user/stats')
        babyCount.value = res.babyCount
        totalRecords.value = res.totalRecords
        joinDays.value = res.joinDays
    } catch (e) {
        // Error handled globally
    }
}

onMounted(() => {
    fetchStats()
})

const showComingSoon = () => ElMessage.info('敬请期待，该功能正在加速开发中')

const sendTestEmail = async () => {
    if (!userInfo.value.email) return ElMessage.warning('请先在个人资料中绑定邮箱')
    try {
        await ElMessageBox.confirm(
            `系统将向您的邮箱 ${userInfo.value.email} 发送一封科学育儿测试邮件，请确认是否继续？`, 
            '发送提醒测试', 
            {
                confirmButtonText: '确定发送',
                cancelButtonText: '取消',
                type: 'info',
                roundButton: true,
                center: true
            }
        )
        const loading = ElMessage({ message: '正在通过 QQ Mail 安全通道发送...', duration: 0, type: 'info' })
        await client.post('/cron?testEmail=true')
        loading.close()
        ElMessage.success('测试邮件已发出，请检查您的收件箱（或垃圾箱）')
    } catch (e) {
        // Cancelled or error
    }
}

const handleLogout = () => {
    ElMessageBox.confirm('确定要退出当前账号吗？', '安全登出', {
        confirmButtonText: '确定退出',
        cancelButtonText: '取消',
        type: 'warning',
        roundButton: true
    }).then(() => {
        userStore.logout()
        router.push('/login')
        ElMessage.success('已安全登出系统')
    }).catch(() => {})
}
</script>

<style scoped lang="scss">
.user-page {
  padding: 10px 16px 100px;
}

.page-header {
  margin: 10px 0 20px;
  .title { font-size: clamp(18px, 4vw, 24px); font-weight: 800; color: var(--el-text-color-primary); }
}

.profile-card {
  border-radius: 28px !important;
  background: linear-gradient(135deg, #ff8e94 0%, #ffb1b5 100%);
  border: none !important;
  color: white;
  padding: 6px;
  margin-bottom: 24px;
  
  :deep(.el-card__body) { padding: 24px; }
}

.profile-content {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}

.avatar-wrapper {
  position: relative;
  margin-right: 20px;
  cursor: pointer;
  
  .main-avatar {
    border: 4px solid rgba(255, 255, 255, 0.4);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  }
  
  .camera-overlay {
    position: absolute;
    bottom: 2px;
    right: 2px;
    background: rgba(0, 0, 0, 0.3);
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
    font-size: 14px;
  }
  
  .hidden-input { display: none; }
}

.user-info {
  .name-box {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    
    .nickname { font-size: 22px; font-weight: 900; }
    .edit-icon-btn { color: white; opacity: 0.8; padding: 0; height: auto; }
  }
  .account-id { font-size: 14px; opacity: 0.85; }
}

.stat-grid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  
  .stat-box {
    flex: 1;
    text-align: center;
    display: flex;
    flex-direction: column;
    
    .stat-val { font-size: 20px; font-weight: 800; margin-bottom: 2px; }
    .stat-label { font-size: 11px; opacity: 0.8; font-weight: 600; }
  }
  
  .stat-divider { width: 1px; height: 24px; background: rgba(255, 255, 255, 0.2); }
}

.menu-sections {
  .menu-section {
    margin-bottom: 24px;
    
    .section-label {
      font-size: 13px;
      font-weight: 800;
      color: var(--el-text-color-secondary);
      margin: 0 0 10px 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }
}

.action-card {
  border-radius: 24px !important;
  overflow: hidden;
  :deep(.el-card__body) { padding: 0; }
}

.action-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:active { background-color: #f7f8fa; }
  
  .action-left {
    display: flex;
    align-items: center;
    gap: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    
    .icon-wrap {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
      
      &.color-1 { background: #ff8e94; }
      &.color-2 { background: #ffb1b5; }
      &.color-3 { background: #88d498; }
      &.color-4 { background: #ffd077; }
      &.color-5 { background: #409eff; }
      &.color-6 { background: #909399; }
    }
  }
  
  .action-right {
    display: flex;
    align-items: center;
    gap: 8px;
    .version-tag { font-size: 12px; color: var(--el-text-color-secondary); font-weight: 500; }
  }
  
  .arrow-icon { color: var(--el-border-color); font-size: 14px; }
}

.action-divider { height: 1px; background: var(--el-border-color-light); margin: 0 20px; }

.bottom-actions {
  margin-top: 20px;
  .full-width-btn { width: 100%; height: 52px; border-radius: 16px; font-weight: 700; border: none; background: white; }
}

.rounded-dialog {
  :deep(.el-dialog) { border-radius: 28px !important; }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 10px;
}
</style>
