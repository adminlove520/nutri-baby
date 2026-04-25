<template>
  <div class="share-page">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error">
      <div class="error-icon">😢</div>
      <h2>{{ error }}</h2>
      <p>该分享可能已失效或不存在</p>
    </div>

    <!-- 分享内容 -->
    <div v-else class="share-content">
      <!-- 头部 -->
      <div class="share-header">
        <div class="app-brand">
          <span class="brand-icon">👶</span>
          <span class="brand-name">Nutri-Baby</span>
        </div>
      </div>

      <!-- 宝宝信息 -->
      <div class="baby-info" v-if="shareData.babyName">
        <div class="baby-avatar">{{ shareData.babyName.charAt(0) }}</div>
        <div class="baby-details">
          <h1>{{ shareData.babyName }}的成长记录</h1>
          <p v-if="shareData.babyBirthDate">
            出生于 {{ formatDate(shareData.babyBirthDate) }}
          </p>
        </div>
      </div>

      <!-- 照片/视频 -->
      <div class="media-section">
        <div class="media-type-badge">{{ getTypeName(shareData.type) }}</div>
        
        <!-- 单图模式 -->
        <div v-if="shareData.allUrls?.length === 1" class="single-media">
          <img :src="shareData.url" :alt="shareData.title" @error="handleImgError" />
        </div>
        
        <!-- 多图模式 -->
        <div v-else class="multi-media">
          <div 
            v-for="(url, index) in shareData.allUrls" 
            :key="index"
            class="media-item"
            @click="previewIndex = index"
          >
            <img :src="url" :alt="`照片 ${index + 1}`" @error="handleImgError" />
          </div>
        </div>
      </div>

      <!-- 标题和描述 -->
      <div class="content-section" v-if="shareData.title || shareData.description">
        <h2 v-if="shareData.title">{{ shareData.title }}</h2>
        <p v-if="shareData.description">{{ shareData.description }}</p>
      </div>

      <!-- 时间 -->
      <div class="time-section">
        <span class="icon">📅</span>
        {{ formatDateTime(shareData.createdAt) }}
      </div>

      <!-- 底部 -->
      <div class="share-footer">
        <p>来自 <strong>Nutri-Baby</strong> 育儿助手</p>
        <p class="hint">记录宝宝成长，分享美好瞬间</p>
      </div>
    </div>

    <!-- 图片预览 -->
    <div v-if="previewIndex >= 0" class="preview-overlay" @click="previewIndex = -1">
      <div class="preview-content">
        <img :src="shareData.allUrls[previewIndex]" alt="预览" />
        <div class="preview-close">×</div>
        <div class="preview-nav" v-if="shareData.allUrls?.length > 1">
          <button @click.stop="previewIndex = (previewIndex - 1 + shareData.allUrls.length) % shareData.allUrls.length">‹</button>
          <span>{{ previewIndex + 1 }} / {{ shareData.allUrls.length }}</span>
          <button @click.stop="previewIndex = (previewIndex + 1) % shareData.allUrls.length">›</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const loading = ref(true)
const error = ref('')
const previewIndex = ref(-1)
const shareData = ref<any>({
  type: 'growth',
  title: '',
  description: '',
  url: '',
  allUrls: [],
  babyName: '',
  babyBirthDate: null,
  userName: '',
  createdAt: ''
})

onMounted(async () => {
  const token = route.params.token as string
  
  if (!token) {
    error.value = '分享链接无效'
    loading.value = false
    return
  }

  try {
    const API_BASE = import.meta.env.VITE_API_URL || ''
    const res = await fetch(`${API_BASE}/api/share?token=${token}`)
    const data = await res.json()
    
    if (!res.ok) {
      error.value = data.message || '获取分享内容失败'
      loading.value = false
      return
    }

    shareData.value = data.data || data
  } catch (e: any) {
    error.value = '加载分享内容失败'
    console.error('Share page error:', e)
  } finally {
    loading.value = false
  }
})

const getTypeName = (type: string) => {
  switch (type) {
    case 'growth': return '📈 成长记录'
    case 'moment': return '📸 精彩瞬间'
    case 'vaccine': return '💉 疫苗接种'
    default: return '📝 记录'
  }
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

const handleImgError = (e: Event) => {
  const img = e.target as HTMLImageElement
  img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="%23f5f5f5" width="200" height="200"/><text x="100" y="110" text-anchor="middle" fill="%23999" font-size="14">图片加载失败</text></svg>'
}
</script>

<style scoped>
.share-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fef9fb 0%, #fff 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.loading, .error {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 64px;
}

.error h2 {
  color: #333;
  margin: 0;
}

.error p {
  color: #999;
}

.share-content {
  max-width: 480px;
  margin: 0 auto;
  padding: 20px;
}

.share-header {
  text-align: center;
  padding: 20px 0;
}

.app-brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.brand-icon {
  font-size: 24px;
}

.brand-name {
  font-size: 16px;
  font-weight: 600;
  color: #667eea;
}

.baby-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.baby-avatar {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  font-weight: 600;
}

.baby-details h1 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.baby-details p {
  margin: 4px 0 0;
  font-size: 14px;
  color: #999;
}

.media-section {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.media-type-badge {
  padding: 12px 16px;
  font-size: 14px;
  color: #667eea;
  border-bottom: 1px solid #f5f5f5;
}

.single-media img {
  width: 100%;
  display: block;
  max-height: 400px;
  object-fit: cover;
}

.multi-media {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
}

.media-item {
  aspect-ratio: 1;
  overflow: hidden;
  cursor: pointer;
}

.media-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}

.media-item:hover img {
  transform: scale(1.05);
}

.content-section {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.content-section h2 {
  margin: 0 0 8px;
  font-size: 18px;
  color: #333;
}

.content-section p {
  margin: 0;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.time-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: white;
  border-radius: 12px;
  font-size: 14px;
  color: #999;
  margin-bottom: 24px;
}

.share-footer {
  text-align: center;
  padding: 24px 0;
  color: #999;
  font-size: 14px;
}

.share-footer strong {
  color: #667eea;
}

.share-footer .hint {
  margin-top: 8px;
  font-size: 12px;
}

/* 图片预览 */
.preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.preview-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.preview-content img {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
}

.preview-close {
  position: absolute;
  top: -40px;
  right: 0;
  font-size: 32px;
  color: white;
  cursor: pointer;
}

.preview-nav {
  position: absolute;
  bottom: -50px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  color: white;
}

.preview-nav button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
}

.preview-nav button:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
