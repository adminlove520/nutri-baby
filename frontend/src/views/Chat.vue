<template>
  <div class="chat-page">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="bg-circle bg-circle-1"></div>
      <div class="bg-circle bg-circle-2"></div>
      <div class="bg-circle bg-circle-3"></div>
    </div>

    <!-- 主内容区 -->
    <div class="chat-container">
      <!-- 侧边栏 -->
      <aside class="chat-sidebar">
        <div class="sidebar-header">
          <div class="logo">
            <span class="logo-icon">🦞</span>
            <span class="logo-text">小溪</span>
          </div>
          <el-button type="primary" size="small" @click="startNewChat" circle>
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>

        <!-- 宝宝信息卡片 -->
        <div v-if="babyContext" class="baby-info-card">
          <div class="baby-avatar">{{ babyContext.name?.charAt(0) || '宝' }}</div>
          <div class="baby-details">
            <div class="baby-name">{{ babyContext.name }}</div>
            <div class="baby-age">{{ babyContext.ageStr }}</div>
          </div>
        </div>

        <!-- 对话列表 -->
        <div class="conversation-list">
          <div class="list-title">对话记录</div>
          <div
            v-for="conv in conversations"
            :key="conv.id"
            :class="['conversation-item', { active: conv.id === currentConversationId }]"
            @click="loadConversation(conv)"
          >
            <div class="conv-content">
              <div class="conv-title">{{ conv.title || '新对话' }}</div>
              <div class="conv-meta">
                <span class="conv-time">{{ formatTime(conv.updatedAt) }}</span>
                <span class="conv-count">{{ conv.messageCount }} 条</span>
              </div>
            </div>
            <el-dropdown trigger="click" @command="handleConvAction($event, conv)">
              <el-button text size="small" @click.stop>
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="pin">
                    <el-icon><Star /></el-icon>
                    {{ conv.isPinned ? '取消置顶' : '置顶' }}
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <div v-if="conversations.length === 0" class="empty-conversations">
            <p>暂无对话记录</p>
            <p class="hint">开始新对话吧～</p>
          </div>
        </div>
      </aside>

      <!-- 聊天区域 -->
      <main class="chat-main">
        <!-- 欢迎界面 -->
        <div v-if="messages.length === 0" class="welcome-area">
          <div class="welcome-avatar">🦞</div>
          <h2>你好，我是小溪！</h2>
          <p class="welcome-desc">
            您的智能育儿助手，可以帮您解答喂养、睡眠、健康、疫苗、早教等各类问题。
          </p>
          <p v-if="babyContext" class="baby-context-hint">
            我看到 {{ babyContext.name }} 现在 {{ babyContext.ageStr }} 啦～
          </p>

          <!-- 快捷问题分类 -->
          <div class="quick-categories">
            <div class="category-title">试试这样问：</div>
            <div class="category-list">
              <div
                v-for="cat in quickCategories"
                :key="cat.name"
                class="category-item"
                @click="expandCategory(cat)"
              >
                <span class="category-icon">{{ cat.icon }}</span>
                <span class="category-name">{{ cat.name }}</span>
              </div>
            </div>

            <!-- 展开的问题列表 -->
            <div v-if="expandedCategory" class="question-list">
              <el-tag
                v-for="q in expandedCategory.questions"
                :key="q"
                class="question-tag"
                @click="sendQuickQuestion(q)"
              >
                {{ q }}
              </el-tag>
            </div>
          </div>
        </div>

        <!-- 消息列表 -->
        <div v-else class="message-area">
          <div class="message-list" ref="messageListRef">
            <div
              v-for="(msg, index) in messages"
              :key="index"
              :class="['message-item', msg.role]"
            >
              <div v-if="msg.role === 'assistant'" class="message-avatar">
                <span>🦞</span>
              </div>
              <div class="message-content">
                <div class="message-bubble">
                  {{ msg.content }}
                </div>
                <div class="message-meta">
                  <span class="message-time">{{ formatTime(msg.createdAt) }}</span>
                </div>
              </div>
            </div>

            <!-- 正在输入 -->
            <div v-if="isTyping" class="message-item assistant">
              <div class="message-avatar"><span>🦞</span></div>
              <div class="message-content">
                <div class="message-bubble typing">
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-area">
          <div class="input-wrapper">
            <el-input
              v-model="inputMessage"
              type="textarea"
              :rows="1"
              :autosize="{ minRows: 1, maxRows: 4 }"
              placeholder="输入您的问题..."
              @keydown.enter.exact.prevent="sendMessage"
              resize="none"
            />
            <el-button
              type="primary"
              :disabled="!inputMessage.trim() || isSending"
              :loading="isSending"
              @click="sendMessage"
              class="send-btn"
            >
              <el-icon v-if="!isSending"><Promotion /></el-icon>
            </el-button>
          </div>
          <div class="input-hint">
            按 Enter 发送，Shift + Enter 换行
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, MoreFilled, Star, Delete, Promotion } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import client from '@/api/client'
import { useBabyStore } from '@/stores/baby'

const router = useRouter()
const babyStore = useBabyStore()

// 状态
const inputMessage = ref('')
const isSending = ref(false)
const isTyping = ref(false)
const messages = ref<any[]>([])
const conversations = ref<any[]>([])
const currentConversationId = ref<string | null>(null)
const messageListRef = ref<HTMLElement | null>(null)
const expandedCategory = ref<any>(null)

// 宝宝上下文
const babyContext = computed(() => {
  const baby = babyStore.currentBaby
  if (!baby) return null

  const birthDate = new Date(baby.birthDate)
  const now = new Date()
  const days = Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24))
  const months = Math.floor(days / 30)

  return {
    id: baby.id?.toString(),
    name: baby.name,
    ageStr: months >= 1 ? `${months}个月` : `${days}天`
  }
})

// 快捷问题分类
const quickCategories = [
  {
    name: '喂养问题',
    icon: '🍼',
    questions: ['宝宝厌奶怎么办？', '辅食什么时候添加？', '怎么判断宝宝吃饱了？']
  },
  {
    name: '睡眠问题',
    icon: '😴',
    questions: ['宝宝夜醒怎么办？', '哄睡有什么好方法？', '多大可以睡整觉？']
  },
  {
    name: '健康护理',
    icon: '🏥',
    questions: ['宝宝发烧怎么护理？', '湿疹怎么护理？', '红屁股怎么处理？']
  },
  {
    name: '疫苗接种',
    icon: '💉',
    questions: ['疫苗接种时间表', '打完疫苗发烧怎么办？', '如何预约疫苗接种？']
  },
  {
    name: '早教游戏',
    icon: '🎮',
    questions: ['0-6个月适合什么游戏？', '亲子阅读从多大开始？', '怎么促进大运动发育？']
  },
  {
    name: '产品推荐',
    icon: '🛒',
    questions: ['纸尿裤怎么选？', '婴儿车推荐哪个？', '有什么好玩的早教玩具？']
  }
]

// 开始新对话
const startNewChat = () => {
  currentConversationId.value = null
  messages.value = []
  expandedCategory.value = null
}

// 展开分类
const expandCategory = (cat: any) => {
  expandedCategory.value = expandedCategory.value?.name === cat.name ? null : cat
}

// 加载对话列表
const loadConversations = async () => {
  try {
    const res: any = await client.get('/chat')
    if (res.conversations) {
      conversations.value = res.conversations
    }
  } catch (e) {
    console.error('加载对话列表失败:', e)
  }
}

// 加载对话详情
const loadConversation = async (conv: any) => {
  try {
    currentConversationId.value = conv.id
    const res: any = await client.get(`/chat?conversationId=${conv.id}`)
    if (res.messages) {
      messages.value = res.messages.map((m: any) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt
      }))
    }
    expandedCategory.value = null
    scrollToBottom()
  } catch (e) {
    console.error('加载对话失败:', e)
  }
}

// 处理对话操作
const handleConvAction = async (command: string, conv: any) => {
  if (command === 'pin') {
    try {
      await client.patch('/chat', { conversationId: conv.id, isPinned: !conv.isPinned })
      loadConversations()
      ElMessage.success(conv.isPinned ? '已取消置顶' : '已置顶')
    } catch (e) {
      console.error('置顶失败:', e)
    }
  } else if (command === 'delete') {
    try {
      await ElMessageBox.confirm('确定要删除这条对话吗？', '提示', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await client.delete(`/chat?conversationId=${conv.id}`)
      if (currentConversationId.value === conv.id) {
        startNewChat()
      }
      loadConversations()
      ElMessage.success('已删除')
    } catch (e: any) {
      if (e !== 'cancel') {
        console.error('删除失败:', e)
      }
    }
  }
}

// 发送消息
const sendMessage = async () => {
  const content = inputMessage.value.trim()
  if (!content || isSending.value) return

  inputMessage.value = ''
  isSending.value = true
  expandedCategory.value = null

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content,
    createdAt: new Date().toISOString()
  })
  scrollToBottom()

  try {
    const res: any = await client.post('/chat', {
      conversationId: currentConversationId.value,
      message: content
    })

    if (res.conversationId) {
      currentConversationId.value = res.conversationId
    }

    if (res.message) {
      isTyping.value = true
      await new Promise(resolve => setTimeout(resolve, 300))
      messages.value.push({
        role: 'assistant',
        content: res.message.content,
        createdAt: res.message.createdAt || new Date().toISOString()
      })
    }

    loadConversations()
    scrollToBottom()
  } catch (e: any) {
    ElMessage.error(e?.message || '发送失败，请重试')
  } finally {
    isSending.value = false
    isTyping.value = false
  }
}

// 发送快捷问题
const sendQuickQuestion = async (question: string) => {
  inputMessage.value = question
  await sendMessage()
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

// 格式化时间
const formatTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`

  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 监听消息变化，自动滚动
watch(messages, () => {
  scrollToBottom()
}, { deep: true })

// 初始化
onMounted(() => {
  loadConversations()
  babyStore.fetchBabies()
})
</script>

<style scoped>
.chat-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.bg-circle-1 {
  width: 400px;
  height: 400px;
  top: -100px;
  right: -100px;
}

.bg-circle-2 {
  width: 300px;
  height: 300px;
  bottom: -50px;
  left: -50px;
}

.bg-circle-3 {
  width: 200px;
  height: 200px;
  top: 50%;
  left: 30%;
}

/* 主容器 */
.chat-container {
  display: flex;
  height: 100vh;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* 侧边栏 */
.chat-sidebar {
  width: 280px;
  background: white;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #eee;
}

.sidebar-header {
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f0f0f0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

/* 宝宝信息卡片 */
.baby-info-card {
  margin: 16px;
  padding: 12px;
  background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.baby-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
}

.baby-details {
  flex: 1;
}

.baby-name {
  font-weight: 600;
  color: #333;
}

.baby-age {
  font-size: 12px;
  color: #666;
}

/* 对话列表 */
.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.list-title {
  font-size: 12px;
  color: #999;
  padding: 8px 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  gap: 8px;
}

.conversation-item:hover {
  background: #f5f5f5;
}

.conversation-item.active {
  background: #f0f0ff;
}

.conv-content {
  flex: 1;
  min-width: 0;
}

.conv-title {
  font-size: 14px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.empty-conversations {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-conversations .hint {
  font-size: 12px;
  margin-top: 8px;
}

/* 主聊天区 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

/* 欢迎界面 */
.welcome-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}

.welcome-avatar {
  font-size: 80px;
  margin-bottom: 20px;
}

.welcome-area h2 {
  font-size: 28px;
  color: #333;
  margin-bottom: 12px;
}

.welcome-desc {
  font-size: 16px;
  color: #666;
  max-width: 400px;
  line-height: 1.6;
}

.baby-context-hint {
  font-size: 14px;
  color: #667eea;
  margin-top: 8px;
}

/* 快捷分类 */
.quick-categories {
  margin-top: 40px;
  width: 100%;
  max-width: 500px;
}

.category-title {
  font-size: 14px;
  color: #999;
  margin-bottom: 16px;
}

.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: white;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.category-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.category-icon {
  font-size: 16px;
}

.category-name {
  font-size: 14px;
  color: #333;
}

.question-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  justify-content: center;
}

.question-tag {
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 16px;
  transition: all 0.2s;
}

.question-tag:hover {
  transform: scale(1.05);
}

/* 消息区域 */
.message-area {
  flex: 1;
  overflow-y: auto;
}

.message-list {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-item {
  display: flex;
  gap: 12px;
  max-width: 80%;
}

.message-item.user {
  flex-direction: row-reverse;
  margin-left: auto;
}

.message-avatar {
  width: 36px;
  height: 36px;
  background: #e8e8ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;
}

.message-item.assistant .message-bubble {
  background: white;
  color: #333;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.message-item.user .message-bubble {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-bottom-right-radius: 4px;
}

.message-meta {
  font-size: 11px;
  color: #999;
  padding: 0 4px;
}

.message-item.user .message-meta {
  text-align: right;
}

/* 打字动画 */
.typing {
  display: flex;
  gap: 4px;
  padding: 16px;
}

.typing-dot {
  width: 8px;
  height: 8px;
  background: #999;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

/* 输入区域 */
.input-area {
  padding: 16px 20px;
  background: white;
  border-top: 1px solid #eee;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-wrapper .el-textarea {
  flex: 1;
}

.send-btn {
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 50%;
}

.input-hint {
  font-size: 11px;
  color: #ccc;
  margin-top: 8px;
  text-align: center;
}

/* 响应式 */
@media (max-width: 768px) {
  .chat-sidebar {
    position: fixed;
    left: -280px;
    top: 0;
    bottom: 0;
    z-index: 100;
    transition: left 0.3s;
  }

  .chat-sidebar.open {
    left: 0;
  }

  .message-item {
    max-width: 90%;
  }
}
</style>
