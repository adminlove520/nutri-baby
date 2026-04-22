<template>
  <div class="notifications-page" v-loading="loading">
    <div class="page-header">
       <el-button link :icon="Back" @click="router.back()">返回</el-button>
       <h2 class="title">站内信</h2>
       <el-button v-if="notifications.some(n => !n.isRead)" link type="primary" @click="markAllAsRead">
         全部已读
       </el-button>
    </div>

    <el-empty v-if="notifications.length === 0" description="暂无通知消息" />

    <div class="notification-list" v-else>
      <div 
        v-for="n in notifications" 
        :key="n.id" 
        class="notification-item" 
        :class="{ unread: !n.isRead }"
        @click="markAsRead(n)"
      >
        <div class="item-icon" :class="n.type">
          <el-icon v-if="n.type === 'vaccine'"><FirstAidKit /></el-icon>
          <el-icon v-else-if="n.type === 'system'"><Bell /></el-icon>
          <el-icon v-else><InfoFilled /></el-icon>
        </div>
        <div class="item-body">
           <div class="item-header">
              <span class="item-title">{{ n.title }}</span>
              <span class="item-time">{{ formatDate(n.createdAt) }}</span>
           </div>
           <div class="item-content">{{ n.content }}</div>
        </div>
        <div v-if="!n.isRead" class="unread-dot"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Back, FirstAidKit, Bell, InfoFilled } from '@element-plus/icons-vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const notifications = ref<any[]>([])

const fetchNotifications = async () => {
    loading.value = true
    try {
        const token = localStorage.getItem('token')
        const res = await axios.get('/api/notifications', {
            headers: { Authorization: `Bearer ${token}` }
        })
        notifications.value = res.data
    } catch (e) {
        ElMessage.error('加载通知失败')
    } finally {
        loading.value = false
    }
}

const markAsRead = async (n: any) => {
    if (n.isRead) return
    try {
        const token = localStorage.getItem('token')
        await axios.post('/api/notifications', { ids: [n.id] }, {
            headers: { Authorization: `Bearer ${token}` }
        })
        n.isRead = true
    } catch (e) {}
}

const markAllAsRead = async () => {
    const unreadIds = notifications.value.filter(n => !n.isRead).map(n => n.id)
    if (unreadIds.length === 0) return
    try {
        const token = localStorage.getItem('token')
        await axios.post('/api/notifications', { ids: unreadIds }, {
            headers: { Authorization: `Bearer ${token}` }
        })
        notifications.value.forEach(n => n.isRead = true)
        ElMessage.success('已全部标记为已读')
    } catch (e) {}
}

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

onMounted(fetchNotifications)
</script>

<style scoped lang="scss">
.notifications-page {
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 40px;
}

.page-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  gap: 12px;
  
  .title { flex: 1; font-size: 20px; font-weight: 800; color: #2c3e50; }
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  border: 1px solid transparent;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.05);
  }

  &.unread {
    background: #fff9f9;
    border-color: #ff8e9433;
  }

  .item-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16px;
    font-size: 20px;
    flex-shrink: 0;

    &.vaccine { background: #fef0f0; color: #f56c6c; }
    &.system { background: #f0f9eb; color: #67c23a; }
    &.tips { background: #ecf5ff; color: #409eff; }
  }

  .item-body {
    flex: 1;
    min-width: 0;
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    
    .item-title { font-weight: 700; font-size: 15px; color: #303133; }
    .item-time { font-size: 12px; color: #909399; }
  }

  .item-content {
    font-size: 13px;
    color: #606266;
    line-height: 1.5;
  }

  .unread-dot {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 8px;
    height: 8px;
    background: #f56c6c;
    border-radius: 50%;
  }
}
</style>
