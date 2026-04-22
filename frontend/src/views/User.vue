<template>
  <div class="user-page">
    <div class="page-header">
      <h2 class="title">个人中心</h2>
    </div>

    <!-- User Profile Card -->
    <el-card class="profile-card" shadow="hover">
       <div class="profile-body">
          <div class="avatar-section" @click="triggerUpload">
             <el-avatar :size="80" :src="userInfo.avatarUrl || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
             <div class="edit-btn">
                <el-icon><Camera /></el-icon>
             </div>
             <input type="file" ref="fileInput" class="hidden-input" @change="handleFileUpload" accept="image/*" />
          </div>
          <div class="info-section">
             <div class="nickname-row">
                <span class="nickname">{{ userInfo.nickname || '新用户' }}</span>
                <el-button link :icon="Edit" @click="openEditDialog" style="color: white; margin-left: 8px;"></el-button>
             </div>
             <div class="phone-text">{{ userInfo.phone || userInfo.email || '未绑定账号' }}</div>
          </div>
       </div>
       
       <el-row class="stat-bar" :gutter="20">
          <el-col :span="8" class="stat-item">
             <div class="val">{{ babyCount }}</div>
             <div class="lab">守护宝宝</div>
          </el-col>
          <el-col :span="8" class="stat-item">
             <div class="val">{{ totalRecords }}</div>
             <div class="lab">记录条数</div>
          </el-col>
          <el-col :span="8" class="stat-item">
             <div class="val">{{ joinDays }}</div>
             <div class="lab">加入天数</div>
          </el-col>
       </el-row>
    </el-card>

    <!-- Menu List -->
    <div class="menu-groups">
       <div class="menu-group">
          <div class="group-title">宝宝管理</div>
          <el-card class="menu-card" shadow="never">
             <div class="menu-item" @click="router.push('/baby/list')">
                <div class="item-left">
                   <div class="icon-box p1"><el-icon><UserIcon /></el-icon></div>
                   <span>我的宝宝</span>
                </div>
                <el-icon class="arrow"><ArrowRight /></el-icon>
             </div>
             <el-divider />
             <div class="menu-item" @click="router.push('/baby/edit')">
                <div class="item-left">
                   <div class="icon-box p2"><el-icon><Plus /></el-icon></div>
                   <span>添加宝宝</span>
                </div>
                <el-icon class="arrow"><ArrowRight /></el-icon>
             </div>
          </el-card>
       </div>

       <div class="menu-group">
          <div class="group-title">工具与服务</div>
          <el-card class="menu-card" shadow="never">
             <div class="menu-item" @click="router.push('/vaccine')">
                <div class="item-left">
                   <div class="icon-box s1"><el-icon><Memo /></el-icon></div>
                   <span>疫苗接种计划</span>
                </div>
                <el-icon class="arrow"><ArrowRight /></el-icon>
             </div>
             <el-divider />
             <div class="menu-item" @click="sendTestEmail">
                <div class="item-left">
                   <div class="icon-box s3"><el-icon><Message /></el-icon></div>
                   <span>发送测试邮件</span>
                </div>
                <el-icon class="arrow"><ArrowRight /></el-icon>
             </div>
             <el-divider />
             <div class="menu-item" @click="showComingSoon">
                <div class="item-left">
                   <div class="icon-box s2"><el-icon><Setting /></el-icon></div>
                   <span>系统设置</span>
                </div>
                <el-icon class="arrow"><ArrowRight /></el-icon>
             </div>
          </el-card>
       </div>

       <div class="menu-group">
          <div class="group-title">关于</div>
          <el-card class="menu-card" shadow="never">
             <div class="menu-item" @click="showAbout">
                <div class="item-left">
                   <div class="icon-box a1"><el-icon><InfoFilled /></el-icon></div>
                   <span>关于 Nutri-Baby</span>
                </div>
                <div class="item-right">
                   <span class="version">v1.2.0</span>
                   <el-icon class="arrow"><ArrowRight /></el-icon>
                </div>
             </div>
          </el-card>
       </div>
    </div>

    <div class="logout-btn-wrapper">
       <el-button type="danger" plain size="large" round @click="handleLogout">退出登录</el-button>
    </div>

    <!-- Edit Profile Dialog -->
    <el-dialog v-model="editDialogVisible" title="修改个人信息" width="90%" class="custom-dialog">
       <el-form :model="editForm" label-position="top">
          <el-form-item label="昵称">
             <el-input v-model="editForm.nickname" placeholder="请输入昵称" />
          </el-form-item>
          <el-form-item label="绑定邮箱 (用于接收疫苗提醒)">
             <el-input v-model="editForm.email" placeholder="请输入邮箱地址" />
          </el-form-item>
       </el-form>
       <template #footer>
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveProfile" :loading="saving">保存修改</el-button>
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
        const res = await client.post('/user?action=update', editForm)
        userStore.setUserInfo(res)
        ElMessage.success('信息已更新')
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

    if (file.size > 2 * 1024 * 1024) return ElMessage.warning('图片大小不能超过 2MB')

    const loading = ElMessage({ message: '正在上传...', duration: 0 })
    try {
        const res: any = await client.post(`/upload?filename=${encodeURIComponent(file.name)}`, file, {
            headers: { 'Content-Type': file.type }
        })
        
        const avatarUrl = res.url
        // Update user profile with new avatar
        await client.post('/user?action=update', { avatarUrl })
        
        userStore.setUserInfo({ avatarUrl })
        ElMessage.success('头像更新成功')
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
        const res: any = await client.get('/user?action=stats')
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

const showComingSoon = () => ElMessage.info('该功能正在开发中，敬请期待')

const sendTestEmail = async () => {
    if (!userInfo.value.email) return ElMessage.warning('请先绑定邮箱')
    try {
        await ElMessageBox.confirm(`系统将向 ${userInfo.value.email} 发送一封测试邮件，是否继续？`, '发送测试', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'info'
        })
        await client.post('/cron?testEmail=true')
        ElMessage.success('测试邮件已发送，请检查收件箱')
    } catch (e) {
        // Error handled globally or ignored if cancelled
    }
}

const showAbout = () => {
    ElMessageBox.alert(
        'Nutri-Baby 是一款为新手爸妈设计的育儿助手。通过科学的记录与 AI 分析，帮助您更好地呵护宝宝成长。',
        '关于我们',
        { confirmButtonText: '知道了' }
    )
}

const handleLogout = () => {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '退出',
        cancelButtonText: '取消',
        type: 'warning'
    }).then(() => {
        userStore.logout()
        router.push('/login')
        ElMessage.success('已安全退出')
    }).catch(() => {})
}
</script>

<style scoped lang="scss">
.user-page {
  padding-bottom: 80px;
}

.page-header {
  margin-bottom: 24px;
  .title { font-size: 24px; font-weight: 800; color: #2c3e50; }
}

.profile-card {
  margin-bottom: 30px;
  background: linear-gradient(135deg, #ff8e94 0%, #ffb1b5 100%);
  color: #fff;
  border: none !important;
  
  .profile-body {
     display: flex;
     align-items: center;
     padding: 10px 0 20px;
  }
  
  .avatar-section {
     position: relative;
     margin-right: 20px;
     cursor: pointer;

     .hidden-input {
        display: none;
     }
     
     .edit-btn {
        position: absolute;
        bottom: 0;
        right: 0;
        background: rgba(0,0,0,0.3);
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        backdrop-filter: blur(4px);
     }
  }
  
  .info-section {
     .nickname-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 6px;
        
        .nickname { font-size: 20px; font-weight: 800; }
        .el-tag { background: rgba(255,255,255,0.2); border: none; color: #fff; }
     }
     .phone-text { font-size: 14px; opacity: 0.9; }
  }
  
  .stat-bar {
      border-top: 1px solid rgba(255,255,255,0.2);
      padding-top: 20px;
      
      .stat-item {
          text-align: center;
          .val { font-size: 18px; font-weight: 800; margin-bottom: 2px; }
          .lab { font-size: 11px; opacity: 0.8; }
          
          &:not(:last-child) { border-right: 1px solid rgba(255,255,255,0.2); }
      }
  }
}

.menu-group {
    margin-bottom: 24px;
    
    .group-title {
        font-size: 14px;
        font-weight: 700;
        color: #909399;
        margin-bottom: 12px;
        margin-left: 4px;
    }
}

.menu-card {
    border-radius: 20px !important;
    overflow: hidden;
    :deep(.el-card__body) { padding: 0; }
    
    .el-divider { margin: 0; opacity: 0.5; }
}

.menu-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    cursor: pointer;
    transition: background 0.2s;
    
    &:hover { background: #fcfcfc; }
    
    .item-left {
        display: flex;
        align-items: center;
        gap: 14px;
        font-weight: 500;
        color: #303133;
        
        .icon-box {
            width: 32px;
            height: 32px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            
            &.p1 { background-color: #ff8e94; }
            &.p2 { background-color: #ffc7ca; }
            &.s1 { background-color: #88d498; }
            &.s2 { background-color: #ffd077; }
            &.s3 { background-color: #409eff; }
            &.a1 { background-color: #909399; }
        }
    }
    
    .item-right {
        display: flex;
        align-items: center;
        gap: 8px;
        .version { font-size: 12px; color: #C0C4CC; }
    }
    
    .arrow { color: #C0C4CC; font-size: 14px; }
}

.logout-btn-wrapper {
    margin-top: 40px;
    padding: 0 10px;
    .el-button { width: 100%; height: 50px; font-weight: bold; }
}
</style>
