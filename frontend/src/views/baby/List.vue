<template>
  <div class="baby-list-page">
    <div class="page-header">
      <div class="header-left">
        <h2 class="title">宝宝管理</h2>
        <p class="subtitle">管理您的宝宝档案与家庭成员</p>
      </div>
      <el-button type="primary" round size="large" @click="goToAdd">
        <el-icon><Plus /></el-icon> 添加宝宝
      </el-button>
    </div>

    <el-row :gutter="24">
      <el-col :xs="24" :sm="12" :lg="8" v-for="baby in babyList" :key="baby.id">
        <el-card 
          class="baby-card" 
          :class="{ 'active': isCurrentBaby(baby.id) }"
          shadow="hover"
        >
          <div class="card-body" @click="handleSelect(baby.id)">
              <div class="avatar-wrapper">
                 <el-avatar :size="72" :src="baby.avatarUrl || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
                 <div class="gender-icon" :class="baby.gender">
                    <el-icon :size="12"><component :is="baby.gender === 'male' ? Male : Female" /></el-icon>
                 </div>
              </div>
              <div class="info-wrapper">
                <div class="name-row">
                  <span class="name">{{ baby.name }}</span>
                  <el-tag size="small" effect="plain" round v-if="isCurrentBaby(baby.id)">当前选择</el-tag>
                </div>
                <div class="age-text">{{ calculateAge(baby.birthDate) }}</div>
                <div class="meta-tags">
                   <el-tag size="small" type="info" v-if="baby.nickname">{{ baby.nickname }}</el-tag>
                   <el-tag size="small" type="success" effect="light">{{ baby.gender === 'male' ? '小王子' : '小公主' }}</el-tag>
                </div>
              </div>
          </div>
          
          <div class="card-footer">
            <div class="actions">
               <el-button link type="primary" :icon="Edit" @click.stop="handleEdit(baby.id)">修改资料</el-button>
               <el-divider direction="vertical" />
               <el-button link type="primary" :icon="Share" @click.stop="handleInvite(baby.id)">邀请家人</el-button>
            </div>
            <el-button link type="danger" :icon="Delete" @click.stop="handleDelete(baby.id)"></el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <div v-if="babyList.length === 0" class="empty-container">
       <el-empty description="还没有添加宝宝哦">
          <el-button type="primary" round @click="goToAdd">立即添加第一个宝宝</el-button>
       </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBabyStore } from '@/stores/baby'
import { calculateAge } from '@/utils/date'
import { Plus, Edit, Delete, Share, Female, Male } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'

const router = useRouter()
const babyStore = useBabyStore()

const babyList = computed(() => babyStore.babyList)
const currentBabyId = computed(() => babyStore.currentBaby?.id)

const isCurrentBaby = (id: string) => currentBabyId.value === id

const goToAdd = () => router.push('/baby/edit')

const handleSelect = (id: string) => {
  if (isCurrentBaby(id)) return
  babyStore.setCurrentBaby(id)
  ElMessage.success('已切换当前宝宝')
}

const handleEdit = (id: string) => {
  router.push(`/baby/edit/${id}`)
}

const handleDelete = (id: string) => {
  ElMessageBox.confirm(
    '确定要删除这个宝宝的档案吗？删除后所有记录都将无法找回。',
    '危险操作',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
      type: 'warning',
    }
  ).then(async () => {
    try {
        await babyStore.deleteBaby(id)
        ElMessage.success('删除成功')
    } catch (e) {
        ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

const handleInvite = (id: string) => {
  router.push(`/baby/invite/${id}`)
}

onMounted(() => {
    babyStore.fetchBabies()
})
</script>

<style scoped lang="scss">
.baby-list-page {
  padding-bottom: 60px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  
  .title { font-size: 24px; font-weight: 800; color: #2c3e50; margin-bottom: 4px; }
  .subtitle { font-size: 14px; color: #909399; }
}

.baby-card {
  margin-bottom: 24px;
  cursor: pointer;
  border: 1px solid #f0f0f0 !important;
  transition: all 0.3s;
  
  &.active {
    background: linear-gradient(135deg, #fff9f9 0%, #ffffff 100%);
    border-color: var(--el-color-primary-light-5) !important;
    position: relative;
    
    &::after {
        content: '✓';
        position: absolute;
        top: 12px;
        right: 12px;
        background: var(--el-color-primary);
        color: #fff;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
    }
  }
}

.card-body {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.avatar-wrapper {
  margin-right: 20px;
  position: relative;
  
  .gender-icon {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #fff;
      color: #fff;
      
      &.male { background-color: #409EFF; }
      &.female { background-color: #ff8e94; }
  }
}

.info-wrapper {
  flex: 1;
  
  .name-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    
    .name { font-size: 18px; font-weight: 800; color: #303133; }
  }
  
  .age-text { font-size: 14px; color: #909399; margin-bottom: 8px; }
  
  .meta-tags {
      display: flex;
      gap: 6px;
  }
}

.card-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f5f7fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .actions {
      display: flex;
      align-items: center;
  }
}

.empty-container {
    padding-top: 60px;
}
</style>
