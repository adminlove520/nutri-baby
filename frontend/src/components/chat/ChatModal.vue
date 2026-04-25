<template>
  <div class="chat-modal-container" ref="containerRef">
    <!-- 悬浮按钮 - 可拖动 -->
    <transition name="el-zoom-in-bottom">
      <div 
        v-if="!isOpen" 
        class="chat-fab" 
        @click="openChat"
        @mousedown="startDrag"
        @touchstart="startDrag"
        style="cursor: move; user-select: none;"
      >
        <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
          <div class="fab-icon">
            <el-icon size="28"><ChatDotRound /></el-icon>
          </div>
        </el-badge>
        <div class="fab-label">咨询小溪</div>
      </div>
    </transition>

    <!-- 聊天窗口 -->
    <transition name="el-zoom-in-bottom">
      <div v-if="isOpen" :class="['chat-window', { maximized: isMaximized }]">
        <!-- 头部 -->
        <div class="chat-header">
          <div class="header-info">
            <div class="avatar">
              <span>🦞</span>
            </div>
            <div class="info-text">
              <div class="name">小溪</div>
              <div class="status">
                <span class="online-dot"></span>
                在线
              </div>
            </div>
          </div>
          <div class="header-actions">
            <el-button text @click="toggleMaximize" :icon="isMaximized ? Minus : FullScreen" circle />
            <el-button text @click="closeChat" :icon="Close" circle />
          </div>
        </div>

        <!-- 对话列表（侧边栏） -->
        <div v-if="showSidebar" class="chat-sidebar">
          <div class="sidebar-header">
            <span>对话记录</span>
            <el-button text size="small" @click="startNewChat">+ 新对话</el-button>
          </div>
          <div class="conversation-list">
            <div
              v-for="conv in conversations"
              :key="conv.id"
              :class="['conversation-item', { active: conv.id === currentConversationId }]"
              @click="loadConversation(conv)"
            >
              <div class="conv-title">{{ conv.title || '新对话' }}</div>
              <div class="conv-time">{{ formatTime(conv.updatedAt) }}</div>
              <el-button
                v-if="conv.id === currentConversationId"
                text
                size="small"
                type="danger"
                @click.stop="deleteConversation(conv.id)"
              >
                删除
              </el-button>
            </div>
            <div v-if="conversations.length === 0" class="empty-list">
              暂无对话记录
            </div>
          </div>
        </div>

        <!-- 消息区域 -->
        <div class="chat-body" ref="chatBodyRef">
          <!-- 欢迎消息 -->
          <div v-if="messages.length === 0" class="welcome-area">
            <div class="welcome-avatar">🦞</div>
            <div class="welcome-title">你好，我是小溪！</div>
            <div class="welcome-desc">
              您的智能育儿助手，可以帮您解答喂养、睡眠、健康、疫苗、早教等各类问题。
            </div>

            <!-- 快捷问题 -->
            <div class="quick-questions">
              <div class="question-label">试试这样问：</div>
              <div class="question-list">
                <el-tag
                  v-for="q in quickQuestions"
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
          <div v-else class="message-list">
            <div
              v-for="(msg, index) in messages"
              :key="index"
              :class="['message-item', msg.role]"
            >
              <div v-if="msg.role === 'assistant'" class="message-avatar">
                <span>🦞</span>
              </div>
              <div class="message-content">
                <div class="message-bubble" v-html="renderMarkdown(msg.content)"></div>
                <div class="message-time">{{ formatTime(msg.createdAt) }}</div>
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
        <div class="chat-input">
          <div class="input-row">
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
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { ChatDotRound, Close, Expand, Promotion, FullScreen } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'
import client from '@/api/client'
import { useBabyStore } from '@/stores/baby'

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true
})

const babyStore = useBabyStore()

// 状态
const isOpen = ref(false)
const isMinimized = ref(false)
const isMaximized = ref(false)
const showSidebar = ref(false)
const containerRef = ref<HTMLElement | null>(null)

// 拖动状态
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

// 拖动函数
const startDrag = (e: MouseEvent | TouchEvent) => {
  isDragging.value = true
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  dragOffset.value = { x: clientX, y: clientY }
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDrag)
  document.addEventListener('touchend', stopDrag)
}

const onDrag = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  const deltaX = clientX - dragOffset.value.x
  const deltaY = clientY - dragOffset.value.y
  dragOffset.value = { x: clientX, y: clientY }
  
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    const newLeft = rect.left + deltaX
    const newTop = rect.top + deltaY
    // 限制在视口内
    const maxLeft = window.innerWidth - rect.width
    const maxTop = window.innerHeight - rect.height
    containerRef.value.style.left = `${Math.max(0, Math.min(maxLeft, newLeft))}px`
    containerRef.value.style.top = `${Math.max(0, Math.min(maxTop, newTop))}px`
    containerRef.value.style.right = 'auto'
    containerRef.value.style.bottom = 'auto'
  }
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
}
const inputMessage = ref('')
const isSending = ref(false)
const isTyping = ref(false)
const unreadCount = ref(0)
const currentConversationId = ref<string | null>(null)
const messages = ref<any[]>([])
const conversations = ref<any[]>([])

// 快捷问题
const quickQuestions = [
  '宝宝厌奶怎么办？',
  '辅食什么时候添加？',
  '疫苗接种时间表',
  '如何培养宝宝睡眠？',
  '有什么好玩的早教游戏？',
  '纸尿裤怎么选？'
]

// 配置 marked 为同步模式
marked.setOptions({ async: false })

const renderMarkdown = (text: string): string => {
  if (!text) return ''
  try {
    const result = marked.parse(text)
    return typeof result === 'string' ? result : text
  } catch (e) {
    console.error('Markdown parse error:', e)
    return text
  }
}

// 打开聊天
const openChat = () => {
  isOpen.value = true
  unreadCount.value = 0
  loadConversations()
}

// 最小化（已改为全屏切换）
const minimize = () => {
  isOpen.value = false
  isMinimized.value = false
  isMaximized.value = false
  showSidebar.value = false
}

// 切换全屏
const toggleMaximize = () => {
  isMaximized.value = !isMaximized.value
}

// 关闭聊天
const closeChat = () => {
  isOpen.value = false
  isMinimized.value = false
  showSidebar.value = false
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

// 开始新对话
const startNewChat = () => {
  currentConversationId.value = null
  messages.value = []
  showSidebar.value = false
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
    showSidebar.value = false
    scrollToBottom()
  } catch (e) {
    console.error('加载对话失败:', e)
  }
}

// 删除对话
const deleteConversation = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这条对话吗？', '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await client.delete(`/chat?conversationId=${id}`)
    messages.value = []
    currentConversationId.value = null
    loadConversations()
    ElMessage.success('已删除')
  } catch (e: any) {
    if (e !== 'cancel') {
      console.error('删除失败:', e)
    }
  }
}

// 发送消息
const sendMessage = async () => {
  const content = inputMessage.value.trim()
  if (!content || isSending.value) return

  inputMessage.value = ''
  isSending.value = true
  isTyping.value = true  // 开始请求时显示打字动画

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
      message: content,
      babyId: babyStore.currentBaby?.id?.toString()
    })

    if (res.conversationId) {
      currentConversationId.value = res.conversationId
    }

    if (res.message) {
      // 收到响应，隐藏打字动画，添加消息
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
    isTyping.value = false  // 确保 finally 中也关闭
  }
}

// 发送快捷问题
const sendQuickQuestion = async (question: string) => {
  inputMessage.value = question
  await sendMessage()
}

// 滚动到底部
const chatBodyRef = ref<HTMLElement | null>(null)
const scrollToBottom = () => {
  nextTick(() => {
    if (chatBodyRef.value) {
      chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
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

// 挂载时检查是否有未读
onMounted(() => {
  // 可以在这里检查是否有新的消息
})
</script>

<style scoped>
.chat-modal-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 悬浮按钮 */
.chat-fab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.fab-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  transition: all 0.3s;
}

.fab-icon:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 30px rgba(102, 126, 234, 0.5);
}

.fab-label {
  font-size: 12px;
  color: #666;
  background: white;
  padding: 4px 12px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

/* 聊天窗口 */
.chat-window {
  width: 380px;
  height: 580px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 50px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
}

.chat-window.maximized {
  position: fixed;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  border-radius: 0;
  z-index: 10000;
}

/* 头部 */
.chat-header {
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.info-text .name {
  font-size: 16px;
  font-weight: 600;
}

.info-text .status {
  font-size: 12px;
  opacity: 0.8;
  display: flex;
  align-items: center;
  gap: 4px;
}

.online-dot {
  width: 8px;
  height: 8px;
  background: #4ade80;
  border-radius: 50%;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.header-actions .el-button {
  color: white;
}

/* 侧边栏 */
.chat-sidebar {
  position: absolute;
  top: 72px;
  left: 0;
  width: 100%;
  height: calc(100% - 72px);
  background: white;
  z-index: 10;
}

.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.conversation-list {
  overflow-y: auto;
  max-height: calc(100% - 52px);
}

.conversation-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background 0.2s;
}

.conversation-item:hover {
  background: #f9f9f9;
}

.conversation-item.active {
  background: #f0f0ff;
}

.conv-title {
  font-size: 14px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.empty-list {
  padding: 40px;
  text-align: center;
  color: #999;
}

/* 消息区域 */
.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f5f7fa;
}

.welcome-area {
  text-align: center;
  padding: 40px 20px;
}

.welcome-avatar {
  font-size: 64px;
  margin-bottom: 16px;
}

.welcome-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.welcome-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 24px;
}

.quick-questions {
  text-align: left;
}

.question-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 12px;
}

.question-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.question-tag {
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 16px;
  font-size: 13px;
  transition: all 0.2s;
}

.question-tag:hover {
  transform: scale(1.05);
}

/* 消息列表 */
.message-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-item {
  display: flex;
  gap: 8px;
  max-width: 85%;
}

.message-item.user {
  flex-direction: row-reverse;
  margin-left: auto;
}

.message-avatar {
  width: 32px;
  height: 32px;
  background: #e8e8ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-bubble {
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.message-item.assistant .message-bubble {
  background: white;
  color: #333;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  text-align: left;
}

/* Markdown 样式 */
.message-item.assistant .message-bubble :deep(h1),
.message-item.assistant .message-bubble :deep(h2),
.message-item.assistant .message-bubble :deep(h3) {
  font-size: 15px;
  font-weight: 600;
  margin: 8px 0 4px;
  color: #1a1a1a;
}

.message-item.assistant .message-bubble :deep(p) {
  margin: 6px 0;
}

.message-item.assistant .message-bubble :deep(ul),
.message-item.assistant .message-bubble :deep(ol) {
  margin: 6px 0;
  padding-left: 20px;
}

.message-item.assistant .message-bubble :deep(li) {
  margin: 3px 0;
}

.message-item.assistant .message-bubble :deep(strong) {
  font-weight: 600;
  color: #1a1a1a;
}

.message-item.assistant .message-bubble :deep(em) {
  font-style: italic;
}

.message-item.assistant .message-bubble :deep(code) {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

.message-item.assistant .message-bubble :deep(blockquote) {
  border-left: 3px solid #667eea;
  margin: 8px 0;
  padding: 4px 12px;
  background: #f8f8ff;
  color: #666;
}

.message-item.assistant .message-bubble :deep(hr) {
  border: none;
  border-top: 1px solid #eee;
  margin: 12px 0;
}

.message-item.assistant .message-bubble :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
  font-size: 13px;
}

.message-item.assistant .message-bubble :deep(th),
.message-item.assistant .message-bubble :deep(td) {
  border: 1px solid #eee;
  padding: 6px 10px;
  text-align: left;
}

.message-item.assistant .message-bubble :deep(th) {
  background: #f5f7fa;
}

.message-item.user .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.message-time {
  font-size: 10px;
  color: #999;
  padding: 0 4px;
}

.message-item.user .message-time {
  text-align: right;
}

/* 打字动画 */
.typing {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
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
.chat-input {
  padding: 12px 16px;
  background: white;
  border-top: 1px solid #eee;
}

.input-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.input-row .el-textarea {
  flex: 1;
}

.send-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 50%;
  flex-shrink: 0;
}

.input-hint {
  font-size: 11px;
  color: #ccc;
  margin-top: 6px;
  text-align: center;
}

/* 响应式 */
@media (max-width: 480px) {
  .chat-modal-container {
    bottom: 16px;
    right: 16px;
  }

  .chat-window {
    width: calc(100vw - 32px);
    height: calc(100vh - 100px);
    max-height: 600px;
  }
}
</style>
