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
        @click="showDetail(n)"
      >
        <div class="item-icon-wrap" :class="n.type">
          <el-icon v-if="n.type === 'vaccine'"><FirstAidKit /></el-icon>
          <el-icon v-else-if="n.type === 'system'"><Bell /></el-icon>
          <el-icon v-else-if="n.type === 'tips'"><Opportunity /></el-icon>
          <el-icon v-else-if="n.type === 'ai_analysis' || n.type === 'ai'"><ChatDotRound /></el-icon>
          <el-icon v-else><InfoFilled /></el-icon>
        </div>
        <div class="item-main">
            <div class="item-top">
               <span class="item-title">{{ n.title }}</span>
               <span class="item-date">{{ formatRelativeDate(n.createdAt) }}</span>
            </div>
            <div class="item-desc line-clamp" v-html="renderMarkdown(n.content || '')"></div>
            <div v-if="!n.isRead" class="unread-badge">未读</div>
        </div>
      </div>
    </div>

    <!-- Notification Detail Dialog -->
    <el-dialog v-model="detailVisible" :title="currentNotif?.title || '消息详情'" width="90%" class="rounded-dialog">
       <div class="notif-detail-content">
          <div class="detail-meta">
             <el-tag size="small" :type="getNotifTagType(currentNotif?.type)">{{ getNotifTypeName(currentNotif?.type) }}</el-tag>
             <span class="detail-time">{{ currentNotif ? formatRelativeDate(currentNotif.createdAt) : '' }}</span>
          </div>
          <div class="detail-body" v-html="renderMarkdown(currentNotif?.content || '')"></div>
       </div>
       <template #footer>
          <div class="dialog-footer">
            <el-button type="primary" @click="detailVisible = false" round>我知道了</el-button>
          </div>
       </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, FirstAidKit, Bell, InfoFilled, Opportunity, ChatDotRound } from '@element-plus/icons-vue'
import client from '@/api/client'
import { ElMessage } from 'element-plus'
import { formatRelative } from '@/utils/date'
import { marked } from 'marked'

const router = useRouter()
const loading = ref(false)
const notifications = ref<any[]>([])
const detailVisible = ref(false)
const currentNotif = ref<any>(null)

// 渲染 Markdown 为 HTML
const renderMarkdown = (text: string): string => {
    if (!text) return ''
    try {
        return marked.parse(text) as string
    } catch {
        return text.replace(/\n/g, '<br/>')
    }
}

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

const showDetail = (n: any) => {
    currentNotif.value = n
    detailVisible.value = true
    if (!n.isRead) {
        markAsRead(n)
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

const getNotifTagType = (type: string) => {
    switch(type) {
        case 'vaccine': return 'danger'
        case 'system': return 'success'
        case 'tips': return 'primary'
        case 'ai_analysis': return 'warning'
        case 'ai': return 'warning'
        default: return 'info'
    }
}

const getNotifTypeName = (type: string) => {
    switch(type) {
        case 'vaccine': return '疫苗接种'
        case 'system': return '系统通知'
        case 'tips': return '育儿锦囊'
        case 'ai_analysis': return 'AI 分析'
        case 'ai': return 'AI 助手'
        default: return '其他消息'
    }
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
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    .back-btn { font-size: 20px; color: var(--el-text-color-primary); }
    .title { font-size: clamp(18px, 4vw, 22px); font-weight: 800; color: var(--el-text-color-primary); margin: 0; }
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
    &.line-clamp {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
    }
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

.notif-detail-content {
    .detail-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        .detail-time { font-size: 12px; color: var(--el-text-color-secondary); }
    }
    .detail-body {
        font-size: 16px;
        line-height: 1.8;
        color: var(--el-text-color-primary);
        white-space: pre-wrap;
        background: var(--el-fill-color-light);
        padding: 20px;
        border-radius: 16px;
    }
}

.empty-notif {
  padding-top: 60px;
}

.rounded-dialog {
  :deep(.el-dialog) { border-radius: 28px !important; }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
}
</style>
