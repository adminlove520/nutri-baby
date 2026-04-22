<template>
  <div class="notifications-page" v-loading="loading">
    <div class="page-header">
       <div class="header-left">
          <el-button link :icon="ArrowLeft" @click="router.back()" class="back-btn"></el-button>
          <h2 class="title">站内信</h2>
       </div>
       <div class="header-right">
          <el-button v-if="notifications.some(n => !n.isRead)" link type="primary" @click="markAllAsRead" class="read-all-btn">
            全部已读
          </el-button>
       </div>
    </div>

    <div v-if="notifications.length === 0" class="empty-notif">
       <el-empty :image-size="120" description="暂时没有新的消息哦" />
    </div>

    <div class="notification-list" v-else>
      <div 
        v-for="n in notifications" 
        :key="n.id" 
        class="notification-item" 
        :class="{ unread: !n.isRead }"
        @click="markAsRead(n)"
      >
        <div class="item-icon-wrap" :class="n.type">
          <el-icon v-if="n.type === 'vaccine'"><FirstAidKit /></el-icon>
          <el-icon v-else-if="n.type === 'system'"><Bell /></el-icon>
          <el-icon v-else><InfoFilled /></el-icon>
        </div>
        <div class="item-main">
            <div class="item-top">
               <span class="item-title">{{ n.title }}</span>
               <span class="item-date">{{ formatRelativeDate(n.createdAt) }}</span>
            </div>
            <div class="item-desc">{{ n.content }}</div>
            <div v-if="!n.isRead" class="unread-badge">未读</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, FirstAidKit, Bell, InfoFilled } from '@element-plus/icons-vue'
import client from '@/api/client'
import { ElMessage } from 'element-plus'
import { formatRelative } from '@/utils/date'

const router = useRouter()
const loading = ref(false)
const notifications = ref<any[]>([])

const fetchNotifications = async () => {
    loading.value = true
    try {
        const res: any = await client.get('/notifications')
        notifications.value = res
    } catch (e) {
        // Error handled globally
    } finally {
        loading.value = false
    }
}

const markAsRead = async (n: any) => {
    if (n.isRead) return
    try {
        await client.post('/notifications', { ids: [n.id] })
        n.isRead = true
    } catch (e) {}
}

const markAllAsRead = async () => {
    const unreadIds = notifications.value.filter(n => !n.isRead).map(n => n.id)
    if (unreadIds.length === 0) return
    try {
        await client.post('/notifications', { ids: unreadIds })
        notifications.value.forEach(n => n.isRead = true)
        ElMessage.success('已标记全部消息为已读')
    } catch (e) {}
}

const formatRelativeDate = (dateStr: string) => {
    return formatRelative(dateStr)
}

onMounted(fetchNotifications)
</script>

<style scoped lang="scss">
.notifications-page {
  padding: 10px 16px 60px;
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    .back-btn { font-size: 20px; color: var(--el-text-color-primary); }
    .title { font-size: 22px; font-weight: 800; color: var(--el-text-color-primary); margin: 0; }
  }
  
  .read-all-btn { font-weight: 700; font-size: 14px; }
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 20px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.02);
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  border: 1px solid var(--el-border-color-lighter);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.04);
    border-color: var(--el-color-primary-light-7);
  }

  &.unread {
    background: linear-gradient(to right, #fff9f9, #fff);
    border-left: 4px solid var(--el-color-primary);
  }

  .item-icon-wrap {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 18px;
    font-size: 22px;
    flex-shrink: 0;

    &.vaccine { background: #fef0f0; color: #ff8e94; }
    &.system { background: #f0f9eb; color: #88d498; }
    &.tips { background: #ecf5ff; color: #409eff; }
  }

  .item-main {
    flex: 1;
    min-width: 0;
    position: relative;
  }

  .item-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 6px;
    
    .item-title { font-weight: 800; font-size: 16px; color: var(--el-text-color-primary); }
    .item-date { font-size: 11px; color: var(--el-text-color-secondary); font-weight: 500; }
  }

  .item-desc {
    font-size: 14px;
    color: var(--el-text-color-regular);
    line-height: 1.6;
    margin-bottom: 8px;
  }
  
  .unread-badge {
    display: inline-block;
    font-size: 10px;
    background: var(--el-color-primary);
    color: white;
    padding: 2px 8px;
    border-radius: 8px;
    font-weight: 700;
  }
}

.empty-notif {
  padding-top: 60px;
}
</style>
