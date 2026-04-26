<template>
  <div class="gallery-page">
    <div class="page-header">
      <div class="header-left">
        <el-button link :icon="ArrowLeft" @click="router.back()">返回</el-button>
        <div class="title-area">
          <h2 class="title">
            <el-icon class="title-icon"><Picture /></el-icon>
            成长圈
          </h2>
          <p class="subtitle">记录美好瞬间</p>
        </div>
      </div>
      <div class="header-actions">
        <el-radio-group v-model="albumType" size="small" class="type-filter">
          <el-radio-button label="growth">
            <el-icon><TrendCharts /></el-icon> 成长
          </el-radio-button>
          <el-radio-button label="moment">
            <el-icon><Star /></el-icon> 瞬间
          </el-radio-button>
          <el-radio-button label="all">
            <el-icon><Grid /></el-icon> 全部
          </el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div v-loading="loading && records.length === 0" class="feeds-container">
      <div v-if="records.length === 0 && !loading" class="empty-state">
        <div class="empty-illustration">
          <el-icon class="empty-icon"><Picture /></el-icon>
        </div>
        <el-empty description="还没有动态，快来发布第一条吧！">
          <el-button type="primary" round @click="showUpload = true">
            <el-icon><Plus /></el-icon> 发布动态
          </el-button>
        </el-empty>
      </div>

      <div v-else class="feeds-list">
        <div v-for="item in records" :key="item.id" class="feed-card" :class="{ 'with-title': !!item.title }">
          <div class="feed-header">
            <div class="user-info">
              <el-avatar :size="48" :src="item.user?.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" class="user-avatar" />
              <div class="header-info">
                <div class="user-row">
                  <span class="user-name">{{ item.user?.nickname || '匿名用户' }}</span>
                  <span class="baby-tag">
                    <el-icon><User /></el-icon>
                    {{ item.baby?.name }}
                  </span>
                </div>
                <div class="time-row">
                  <el-icon><Clock /></el-icon>
                  <span class="time">{{ formatTime(item.createdAt) }}</span>
                </div>
              </div>
            </div>
            <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, item)">
              <el-icon class="more-icon"><MoreFilled /></el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">
                    <el-icon><Edit /></el-icon> 编辑
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided style="color: var(--el-color-danger)">
                    <el-icon><Delete /></el-icon> 删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <div class="feed-content">
            <p v-if="item.title" class="feed-title">
              <el-icon class="title-icon"><Collection /></el-icon>
              {{ item.title }}
            </p>
            <div v-if="item.description" class="feed-desc markdown-body" v-html="renderMarkdown(item.description)"></div>
            <div class="feed-images" :class="{ 'multi': item.url.includes(',') }">
              <el-image
                v-for="(img, idx) in item.url.split(',')"
                :key="idx"
                :src="img.trim()"
                fit="cover"
                class="feed-img"
                :preview-src-list="item.url.split(',').map((s: string) => s.trim())"
                :initial-index="idx"
                loading="lazy"
              />
            </div>
          </div>

          <div class="feed-actions">
            <div class="action-item" :class="{ active: item.isLiked }" @click="toggleLike(item)">
              <el-icon class="action-icon"><Star /></el-icon>
              <span>{{ item._count?.likes || 0 }}</span>
              <span class="action-label">{{ item.isLiked ? '已收藏' : '收藏' }}</span>
            </div>
            <div class="action-item" @click="openComments(item)">
              <el-icon class="action-icon"><ChatDotRound /></el-icon>
              <span>{{ item._count?.comments || 0 }}</span>
              <span class="action-label">评论</span>
            </div>
            <div class="action-item" @click="openShare(item)">
              <el-icon class="action-icon"><Share /></el-icon>
              <span>分享</span>
            </div>
          </div>

          <div v-if="item.comments && item.comments.length > 0" class="feed-comments">
            <div class="comments-header">
              <el-icon><ChatLineSquare /></el-icon>
              <span>评论 ({{ item._count?.comments }})</span>
            </div>
            <div v-for="comment in item.comments.slice(0, 2)" :key="comment.id" class="comment-item">
              <el-avatar :size="32" :src="comment.user?.avatar" class="comment-avatar" />
              <div class="comment-content">
                <div class="comment-header">
                  <span class="comment-author">{{ comment.user?.nickname }}</span>
                  <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
                </div>
                <div class="comment-text">{{ comment.content }}</div>
                <div v-if="comment.replies && comment.replies.length > 0" class="comment-replies">
                  <div v-for="reply in comment.replies.slice(0, 1)" :key="reply.id" class="reply-item">
                    <el-icon class="reply-icon"><CaretRight /></el-icon>
                    <span class="reply-author">{{ reply.user?.nickname }}：</span>
                    <span class="reply-text">{{ reply.content }}</span>
                  </div>
                </div>
                <div class="comment-actions">
                  <span class="reply-btn" @click="openReplyInput(item, comment)">
                    <el-icon><ChatLineSquare /></el-icon> 回复
                  </span>
                  <span v-if="comment.user?.id === currentUserId" class="delete-btn" @click="deleteComment(comment.id, item)">
                    <el-icon><Delete /></el-icon> 删除
                  </span>
                </div>
              </div>
            </div>
            <div v-if="(item._count?.comments || 0) > 2" class="view-more" @click="openComments(item)">
              <el-icon><More /></el-icon>
              查看全部 {{ item._count?.comments }} 条评论
            </div>
          </div>

          <div class="feed-input">
            <el-input v-model="commentInputs[item.id]" placeholder="写评论..." @keyup.enter="submitComment(item)">
              <template #append>
                <el-button :icon="Promotion" @click="submitComment(item)" :disabled="!commentInputs[item.id]" />
              </template>
            </el-input>
          </div>
        </div>

        <div v-if="hasMore" class="load-more">
          <el-button link @click="loadMore" :loading="loadingMore">
            <el-icon><RefreshRight /></el-icon>
            加载更多...
          </el-button>
        </div>
      </div>
    </div>

    <div class="fab-container">
      <el-button circle size="large" type="primary" class="publish-btn" @click="showUpload = true">
        <el-icon><Plus /></el-icon>
      </el-button>
      <div class="fab-hint">发布动态</div>
    </div>

    <el-drawer v-model="showUpload" title="发布动态" direction="btt" size="80%" class="upload-drawer">
      <el-form :model="uploadForm" label-position="top">
        <el-form-item label="选择宝宝">
          <el-select v-model="uploadForm.babyId" placeholder="请选择宝宝" style="width: 100%">
            <el-option v-for="baby in babyStore.babyList" :key="baby.id" :label="baby.name" :value="baby.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题">
          <div class="input-with-action">
            <el-input v-model="uploadForm.title" placeholder="给动态起个标题" />
            <el-tooltip content="AI 生成标题" placement="top" :show-after="300">
              <el-button :icon="MagicStick" circle @click="generateTitle" :loading="generatingTitle" class="ai-btn" />
            </el-tooltip>
          </div>
        </el-form-item>
        <el-form-item label="内容">
          <div class="input-with-action">
            <el-input v-model="uploadForm.description" type="textarea" :rows="3" placeholder="分享这一刻..." />
            <el-tooltip content="AI 生成内容" placement="top" :show-after="300">
              <el-button :icon="MagicStick" circle @click="generateContent" :loading="generatingContent" class="ai-btn" />
            </el-tooltip>
          </div>
        </el-form-item>
        <el-form-item label="分类">
          <el-radio-group v-model="uploadForm.albumType">
            <el-radio label="growth">成长记录</el-radio>
            <el-radio label="moment">精彩瞬间</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="上传照片">
          <div class="upload-area" @click="triggerUpload" @dragover.prevent @drop.prevent="handleDrop">
            <el-icon class="upload-icon"><UploadFilled /></el-icon>
            <div>点击或拖拽上传照片</div>
            <input type="file" ref="fileInput" class="hidden-input" @change="handleFileSelect" accept="image/*" multiple />
          </div>
          <div v-if="previewUrls.length > 0" class="preview-grid">
            <div v-for="(url, idx) in previewUrls" :key="idx" class="preview-item">
              <el-image :src="url" fit="cover" class="preview-img" />
              <el-icon class="remove-icon" @click="removePreview(idx)"><Close /></el-icon>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="drawer-footer">
          <el-button @click="showUpload = false" round>取消</el-button>
          <el-button type="primary" @click="handlePublish" :loading="publishing" round>发布</el-button>
        </div>
      </template>
    </el-drawer>

    <el-dialog v-model="showComments" title="评论" width="90%" class="rounded-dialog">
      <div class="comments-list">
        <div v-for="comment in currentItem?.comments" :key="comment.id" class="comment-item">
          <el-avatar :size="36" :src="comment.user?.avatar" class="comment-avatar" />
          <div class="comment-content">
            <div class="comment-header">
              <span class="comment-author">{{ comment.user?.nickname }}</span>
              <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
            </div>
            <div class="comment-text">{{ comment.content }}</div>
            <div class="comment-replies" v-if="comment.replies?.length">
              <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
                <span class="reply-author">{{ reply.user?.nickname }}：</span>
                <span class="reply-text">{{ reply.content }}</span>
              </div>
            </div>
            <div class="comment-actions">
              <span class="reply-btn" @click="openReplyInput(currentItem, comment)">回复</span>
              <span v-if="comment.user?.id === currentUserId" class="delete-btn" @click="deleteComment(comment.id, currentItem)">删除</span>
            </div>
          </div>
        </div>
        <el-empty v-if="!currentItem?.comments?.length" description="还没有评论" />
      </div>
      <div class="comment-input-fixed">
        <el-input v-model="replyContent" :placeholder="replyingTo ? `回复 @${replyingTo}` : '写评论...'" @keyup.enter="submitReply">
          <template #append>
            <el-button :icon="Promotion" @click="submitReply" :disabled="!replyContent" />
          </template>
        </el-input>
      </div>
    </el-dialog>

    <el-dialog v-model="showShareDialog" title="分享至" width="320px" class="share-dialog" destroy-on-close>
      <div class="share-content">
        <div class="share-card" v-if="shareData">
          <el-image :src="shareData.album?.url" fit="cover" class="share-img" />
          <div class="share-info">
            <div class="share-baby">{{ shareData.album?.babyName }}</div>
            <div class="share-title">{{ shareData.album?.title || '成长记录' }}</div>
          </div>
        </div>

        <div v-if="generatedCaption" class="caption-box">
          <div class="caption-label">朋友圈文案</div>
          <div class="caption-text">{{ generatedCaption }}</div>
          <el-button size="small" @click="copyCaption" :icon="Link">复制文案</el-button>
        </div>

        <div class="share-actions">
          <div class="share-btn" @click="copyLink">
            <div class="btn-icon"><el-icon><Link /></el-icon></div>
            <div class="btn-text">复制链接</div>
          </div>
          <div class="share-btn" @click="generateWechatCaption">
            <div class="btn-icon"><el-icon><ChatDotRound /></el-icon></div>
            <div class="btn-text">AI 文案</div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showShareDialog = false" round>关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { UploadFilled, Delete, Edit, ArrowLeft, MoreFilled, Star, ChatDotRound, Promotion, Plus, Close, Share, Link, MagicStick, Picture, TrendCharts, Grid, User, Clock, Collection, ChatLineSquare, CaretRight, More, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'
import client from '@/api/client'
import { getAlbums, createAlbum, deleteAlbum, addComment, deleteComment as delComment, likeAlbum, unlikeAlbum, type AlbumRecord, type AlbumComment } from '@/api/album'
import { shareAlbum } from '@/api/share'
import { useBabyStore } from '@/stores/baby'
import { useUserStore } from '@/stores/user'

// 设置 marked 选项
marked.setOptions({ breaks: true, gfm: true } as any)

// 渲染 Markdown 为 HTML
const renderMarkdown = (text: string): string => {
    if (!text) return ''
    try {
        return marked.parse(text) as string
    } catch {
        return text.replace(/\n/g, '<br/>')
    }
}

const router = useRouter()
const babyStore = useBabyStore()
const userStore = useUserStore()

const currentUserId = computed(() => userStore.userInfo?.id)

const loading = ref(false)
const loadingMore = ref(false)
const records = ref<AlbumRecord[]>([])
const albumType = ref('all')
const page = ref(1)
const limit = 10
const hasMore = ref(true)

const showUpload = ref(false)
const publishing = ref(false)
const uploadForm = ref({
    babyId: null as number | null,
    title: '',
    description: '',
    albumType: 'growth'
})
const fileInput = ref<HTMLInputElement | null>(null)
const previewUrls = ref<string[]>([])

const showComments = ref(false)
const currentItem = ref<AlbumRecord | null>(null)
const commentInputs = ref<Record<number, string>>({})
const replyContent = ref('')
const replyingTo = ref<string | null>(null)
const replyingComment = ref<AlbumComment | null>(null)

const showShareDialog = ref(false)
const shareData = ref<any>(null)
const generatedCaption = ref('')
const generatingTitle = ref(false)
const generatingContent = ref(false)

const generateTitle = async () => {
    if (!uploadForm.value.babyId) {
        ElMessage.warning('请先选择宝宝')
        return
    }
    generatingTitle.value = true
    try {
        // 如果已有标题，则优化；否则生成新标题
        const wasOptimizing = !!uploadForm.value.title
        const query = wasOptimizing
            ? `为一个${uploadForm.value.albumType === 'growth' ? '成长记录' : '精彩瞬间'}优化这个标题，使其更加吸引人，不超过20字：${uploadForm.value.title}`
            : `为一个${uploadForm.value.albumType === 'growth' ? '成长记录' : '精彩瞬间'}生成一个吸引人的标题，不超过20字`
        const res: any = await client.post('/ai', {
            babyId: uploadForm.value.babyId,
            query
        })
        if (res.insight) {
            uploadForm.value.title = res.insight.substring(0, 20)
            ElMessage.success(wasOptimizing ? '标题已优化' : '标题已生成')
        }
    } catch (e: any) {
        console.error('Generate Title Error:', e)
        ElMessage.error(e?.message || e?.response?.data?.message || '生成失败，请稍后再试')
    } finally {
        generatingTitle.value = false
    }
}

const generateContent = async () => {
    if (!uploadForm.value.babyId) {
        ElMessage.warning('请先选择宝宝')
        return
    }
    generatingContent.value = true
    try {
        // 如果已有描述，则优化；否则生成新描述
        const wasOptimizing = !!uploadForm.value.description
        const query = wasOptimizing
            ? `为一个${uploadForm.value.albumType === 'growth' ? '成长记录' : '精彩瞬间'}优化这个内容描述，使其更加温馨生动，50字左右：${uploadForm.value.description}`
            : `为一个${uploadForm.value.albumType === 'growth' ? '成长记录' : '精彩瞬间'}生成一段温馨的内容描述，50字左右`
        const res: any = await client.post('/ai', {
            babyId: uploadForm.value.babyId,
            query
        })
        if (res.insight) {
            uploadForm.value.description = res.insight.substring(0, 100)
            ElMessage.success(wasOptimizing ? '内容已优化' : '内容已生成')
        }
    } catch (e: any) {
        console.error('Generate Content Error:', e)
        ElMessage.error(e?.message || e?.response?.data?.message || '生成失败，请稍后再试')
    } finally {
        generatingContent.value = false
    }
}

const fetchAlbums = async (reset = false) => {
    if (reset) {
        page.value = 1
        records.value = []
        hasMore.value = true
    }

    if (!babyStore.currentBaby?.id) return
    if (!hasMore.value && !reset) return

    if (reset) loading.value = true
    else loadingMore.value = true

    try {
        const params: any = {
            babyId: babyStore.currentBaby.id.toString(),
            page: page.value,
            limit
        }
        if (albumType.value !== 'all') {
            params.albumType = albumType.value
        }

        const res: any = await getAlbums(params)
        if (reset) {
            records.value = res.records || []
        } else {
            records.value = [...records.value, ...(res.records || [])]
        }
        hasMore.value = records.value.length < res.total
        page.value++
    } catch (e) {
        ElMessage.error('获取动态失败')
    } finally {
        loading.value = false
        loadingMore.value = false
    }
}

const loadMore = () => fetchAlbums(false)

const triggerUpload = () => fileInput.value?.click()

const handleFileSelect = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const files = target.files
    if (files) await processFiles(Array.from(files))
    target.value = ''
}

const handleDrop = async (event: DragEvent) => {
    const files = event.dataTransfer?.files
    if (files) await processFiles(Array.from(files))
}

// 压缩图片（使用 Canvas）
async function compressImage(file: File, maxWidth = 1920, quality = 0.85): Promise<File> {
    return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            let { width, height } = img
            
            // 如果图片太大，等比缩放
            if (width > maxWidth) {
                height = (height * maxWidth) / width
                width = maxWidth
            }
            
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0, width, height)
            
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        })
                        console.log(`压缩: ${file.name} (${(file.size / 1024).toFixed(1)}KB -> ${(compressedFile.size / 1024).toFixed(1)}KB)`)
                        resolve(compressedFile)
                    } else {
                        resolve(file)
                    }
                },
                'image/jpeg',
                quality
            )
        }
        img.src = URL.createObjectURL(file)
    })
}

const processFiles = async (files: File[]) => {
    for (const file of files) {
        // 压缩超过 1MB 的图片
        let processedFile = file
        if (file.size > 1024 * 1024) {
            processedFile = await compressImage(file)
        }
        
        // 检查压缩后的大小（仍超过 5MB 则跳过）
        if (processedFile.size > 5 * 1024 * 1024) {
            ElMessage.warning(`${file.name} 压缩后仍超过 5MB，已跳过`)
            continue
        }
        
        const url = URL.createObjectURL(processedFile)
        previewUrls.value.push(url)
    }
}

const removePreview = (idx: number) => {
    URL.revokeObjectURL(previewUrls.value[idx])
    previewUrls.value.splice(idx, 1)
}

const handlePublish = async () => {
    if (!uploadForm.value.babyId) {
        ElMessage.warning('请选择宝宝')
        return
    }
    if (previewUrls.value.length === 0) {
        ElMessage.warning('请上传照片')
        return
    }

    publishing.value = true
    const totalFiles = previewUrls.value.length
    
    // 检查是否配置了 GitHub 图床
    let useGitHub = false
    try {
        const ghSettings = await fetch('/api/settings').then(r => r.json()).catch(() => null)
        if (ghSettings?.githubConfig?.configured) {
            useGitHub = true
        }
    } catch (e) {
        useGitHub = false
    }
    
    try {
        const uploadedUrls: string[] = []
        for (let i = 0; i < previewUrls.value.length; i++) {
            const url = previewUrls.value[i]
            if (url.startsWith('blob:')) {
                ElMessage.info(`正在上传 ${i + 1}/${totalFiles} ${useGitHub ? '(GitHub图床)' : ''}...`)
                
                if (useGitHub) {
                    // 使用 GitHub 图床上传
                    const blob = await fetch(url).then(r => r.blob())
                    const arrayBuffer = await blob.arrayBuffer()
                    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
                    const filename = `photo_${Date.now()}_${i}.jpg`
                    
                    const res: any = await client.post('/upload/github', {
                        filename,
                        data: base64,
                        babyId: uploadForm.value.babyId,
                        albumType: uploadForm.value.albumType
                    })
                    uploadedUrls.push(res.url)
                } else {
                    // 使用 Vercel Blob 上传
                    const blob = await fetch(url).then(r => r.blob())
                    const filename = `${uploadForm.value.babyId}/${Date.now()}-${i}.jpg`
                    const res: any = await client.post(`/upload?filename=${encodeURIComponent(filename)}`, blob, {
                        headers: { 'Content-Type': blob.type }
                    })
                    uploadedUrls.push(res.url)
                }
            } else {
                uploadedUrls.push(url)
            }
        }

        await createAlbum({
            babyId: uploadForm.value.babyId.toString(),
            title: uploadForm.value.title,
            description: uploadForm.value.description,
            url: uploadedUrls.join(','),
            filename: 'album.jpg',
            albumType: uploadForm.value.albumType
        })

        ElMessage.success(`发布成功！共上传 ${uploadedUrls.length} 张照片 📸`)
        showUpload.value = false
        previewUrls.value = []
        uploadForm.value = { babyId: uploadForm.value.babyId, title: '', description: '', albumType: 'growth' }
        fetchAlbums(true)
    } catch (e: any) {
        ElMessage.error(`发布失败: ${e.message}`)
    } finally {
        publishing.value = false
    }
}

const toggleLike = async (item: AlbumRecord) => {
    try {
        if (item.isLiked) {
            await unlikeAlbum(item.id)
            item.isLiked = false
            if (item._count) item._count.likes = Math.max(0, item._count.likes - 1)
        } else {
            await likeAlbum(item.id)
            item.isLiked = true
            if (item._count) item._count.likes++
        }
    } catch (e) {
        ElMessage.error('操作失败')
    }
}

const openComments = (item: AlbumRecord) => {
    currentItem.value = item
    showComments.value = true
}

const openReplyInput = (item: AlbumRecord, comment: AlbumComment) => {
    replyingTo.value = comment.user?.nickname || '某人'
    replyingComment.value = comment
}

const submitComment = async (item: AlbumRecord) => {
    const content = commentInputs.value[item.id]
    if (!content?.trim()) return

    try {
        const comment: any = await addComment({
            albumId: item.id,
            content: content.trim()
        })
        if (!item.comments) item.comments = []
        item.comments.push(comment)
        if (item._count) item._count.comments++
        commentInputs.value[item.id] = ''
    } catch (e) {
        ElMessage.error('评论失败')
    }
}

const submitReply = async () => {
    if (!replyContent.value.trim() || !currentItem.value || !replyingComment.value) return

    try {
        const comment: any = await addComment({
            albumId: currentItem.value.id,
            content: replyContent.value.trim(),
            parentId: replyingComment.value.id
        })
        const parent = currentItem.value.comments?.find(c => c.id === replyingComment.value!.id)
        if (parent) {
            if (!parent.replies) parent.replies = []
            parent.replies.push(comment)
        }
        replyContent.value = ''
        replyingTo.value = null
        replyingComment.value = null
    } catch (e) {
        ElMessage.error('回复失败')
    }
}

const deleteComment = async (commentId: number, item: AlbumRecord | null) => {
    try {
        await delComment(commentId)
        ElMessage.success('删除成功')
        if (item) {
            item.comments = item.comments?.filter(c => c.id !== commentId)
            if (item._count) item._count.comments--
        }
        showComments.value = false
    } catch (e) {
        ElMessage.error('删除失败')
    }
}

const handleCommand = (cmd: string, item: AlbumRecord) => {
    if (cmd === 'delete') {
        ElMessageBox.confirm('确定要删除这条动态吗？', '删除', { type: 'warning' })
            .then(async () => {
                await deleteAlbum(item.id)
                ElMessage.success('已删除')
                fetchAlbums(true)
            }).catch(() => {})
    }
}

const formatTime = (time: string) => {
    const now = Date.now()
    const diff = now - new Date(time).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return new Date(time).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

const openShare = async (item: AlbumRecord) => {
    shareData.value = null
    generatedCaption.value = ''
    try {
        const res: any = await shareAlbum(item.id)
        shareData.value = res
        if (!res.shareUrl) {
            ElMessage.error('获取分享链接失败')
            return
        }
    } catch (e: any) {
        ElMessage.error(e?.message || '获取分享信息失败')
        return
    }
    showShareDialog.value = true
}

const copyLink = async () => {
    if (!shareData.value?.shareUrl) {
        ElMessage.warning('分享链接不存在')
        return
    }
    try {
        await navigator.clipboard.writeText(shareData.value.shareUrl)
        ElMessage.success('链接已复制到剪贴板')
    } catch (e) {
        // Fallback for older browsers
        const input = document.createElement('input')
        input.value = shareData.value.shareUrl
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
        ElMessage.success('链接已复制到剪贴板')
    }
}

const generateWechatCaption = async () => {
    if (!shareData.value?.album?.id) {
        ElMessage.warning('无法生成文案，请先获取分享信息')
        return
    }
    generatedCaption.value = '生成中...'
    try {
        const res: any = await shareAlbum(shareData.value.album.id, 'caption')
        if (res.caption) {
            generatedCaption.value = res.caption
        } else {
            generatedCaption.value = ''
            ElMessage.error('生成文案失败')
        }
    } catch (e: any) {
        generatedCaption.value = ''
        ElMessage.error(e?.message || '生成文案失败')
    }
}

const copyCaption = async () => {
    if (!generatedCaption.value) return
    try {
        await navigator.clipboard.writeText(generatedCaption.value)
        ElMessage.success('文案已复制到剪贴板')
    } catch (e) {
        ElMessage.error('复制失败')
    }
}

watch(albumType, () => fetchAlbums(true))
watch(() => babyStore.currentBaby?.id, () => fetchAlbums(true))

onMounted(() => {
    if (babyStore.currentBaby?.id) {
        uploadForm.value.babyId = babyStore.currentBaby.id
    }
    fetchAlbums(true)
})
</script>

<style scoped lang="scss">
.gallery-page {
    min-height: 100vh;
    background: linear-gradient(180deg, var(--el-fill-color-light) 0%, #f8f9fa 100%);
    padding-bottom: 100px;
}

.page-header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);

    .header-left {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
    }

    .title-area {
        .title {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 17px;
            font-weight: 800;
            margin: 0;
            background: linear-gradient(135deg, var(--el-color-primary) 0%, #ff6b8a 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            line-height: 1.2;
            .title-icon {
                -webkit-text-fill-color: var(--el-color-primary);
                font-size: 16px;
            }
        }

        .subtitle {
            font-size: 11px;
            color: #999;
            margin: 1px 0 0 0;
            line-height: 1.2;
        }
    }

    .header-actions {
        flex-shrink: 0;
    }

    .type-filter {
        :deep(.el-radio-button__inner) {
            display: flex;
            align-items: center;
            gap: 4px;
        }
    }
}

.feeds-container {
    padding: 16px;
}

.feed-card {
    background: white;
    border-radius: 16px;
    margin-bottom: 16px;
    overflow: hidden;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
    transition: transform 0.2s, box-shadow 0.2s;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    }

    &.with-title {
        border-top: 3px solid var(--el-color-primary);
    }
}

.feed-header {
    display: flex;
    align-items: center;
    padding: 14px;

    .user-info {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
    }

    .user-avatar {
        border: 2px solid var(--el-color-primary-light-8);
    }

    .header-info {
        flex: 1;

        .user-row {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }

        .user-name {
            font-weight: 700;
            font-size: 15px;
            color: #2c3e50;
        }

        .baby-tag {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            font-size: 11px;
            background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, #fff5f6 100%);
            color: var(--el-color-primary);
            padding: 2px 8px;
            border-radius: 20px;
            font-weight: 500;
        }

        .time-row {
            display: flex;
            align-items: center;
            gap: 4px;
            margin-top: 3px;
            font-size: 12px;
            color: #b0b0b0;

            .el-icon {
                font-size: 12px;
            }
        }
    }

    .more-icon {
        color: #ccc;
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        transition: all 0.2s;

        &:hover {
            color: var(--el-color-primary);
            background: var(--el-color-primary-light-9);
        }
    }
}

.feed-content {
    padding: 0 14px 14px;

    .feed-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 700;
        font-size: 16px;
        color: #2c3e50;
        margin-bottom: 8px;

        .title-icon {
            color: var(--el-color-primary);
        }
    }

    .feed-desc {
        font-size: 14px;
        color: #606266;
        line-height: 1.6;
        margin-bottom: 12px;
    }
}

.feed-images {
    display: grid;
    gap: 4px;
    border-radius: 12px;
    overflow: hidden;
    background: var(--el-fill-color-light);

    &.multi {
        grid-template-columns: repeat(2, 1fr);
    }

    .feed-img {
        width: 100%;
        aspect-ratio: 1;
        cursor: pointer;
        transition: transform 0.3s;

        &:hover {
            transform: scale(1.02);
        }
    }
}

.feed-actions {
    display: flex;
    padding: 8px 10px;
    border-top: 1px solid var(--el-fill-color-light);

    .action-item {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 8px 4px;
        color: #909399;
        cursor: pointer;
        transition: all 0.2s;
        border-radius: 8px;
        min-width: 0;

        .action-icon {
            font-size: 16px;
            transition: transform 0.2s;
            flex-shrink: 0;
        }

        span:not(.action-label) {
            font-size: 13px;
            font-weight: 500;
        }

        .action-label {
            font-size: 12px;
            white-space: nowrap;
        }

        &:active {
            transform: scale(0.95);
        }

        &:hover {
            color: var(--el-color-primary);
            background: var(--el-color-primary-light-9);

            .action-icon {
                transform: scale(1.15);
            }
        }

        &.active {
            color: #ff6b8a;

            .action-icon {
                animation: heartBeat 0.3s ease-in-out;
            }
        }
    }
}

@keyframes heartBeat {
    0% { transform: scale(1); }
    50% { transform: scale(1.3); }
    100% { transform: scale(1); }
}

.feed-comments {
    padding: 12px 14px;
    background: linear-gradient(180deg, var(--el-fill-color-light) 0%, #fff 100%);
    border-top: 1px solid var(--el-fill-color-light);

    .comments-header {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        color: #909399;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px dashed var(--el-border-color-light);
    }
}

.comment-item {
    display: flex;
    gap: 10px;
    padding: 8px 0;

    .comment-avatar {
        flex-shrink: 0;
        border: 1px solid var(--el-border-color-light);
    }

    .comment-content {
        flex: 1;

        .comment-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;

            .comment-author {
                font-weight: 600;
                font-size: 13px;
                color: #2c3e50;
            }

            .comment-time {
                font-size: 11px;
                color: #c0c4cc;
            }
        }

        .comment-text {
            font-size: 14px;
            color: #606266;
            line-height: 1.5;
        }

        .comment-replies {
            margin-top: 8px;
            padding: 8px 10px;
            background: white;
            border-radius: 8px;
            font-size: 13px;

            .reply-item {
                display: flex;
                align-items: flex-start;
                gap: 4px;
                margin-bottom: 6px;

                &:last-child {
                    margin-bottom: 0;
                }

                .reply-icon {
                    color: var(--el-color-primary);
                    font-size: 12px;
                    margin-top: 2px;
                }

                .reply-author {
                    color: #606266;
                    font-weight: 500;
                }

                .reply-text {
                    color: #303133;
                }
            }
        }

        .comment-actions {
            display: flex;
            gap: 16px;
            margin-top: 8px;
            font-size: 12px;

            .reply-btn,
            .delete-btn {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;

                .el-icon {
                    font-size: 12px;
                }
            }

            .reply-btn {
                color: #909399;

                &:hover {
                    color: var(--el-color-primary);
                    background: var(--el-color-primary-light-9);
                }
            }

            .delete-btn {
                color: #c0c4cc;

                &:hover {
                    color: var(--el-color-danger);
                    background: #fef0f0;
                }
            }
        }
    }
}

.view-more {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 10px;
    color: var(--el-color-primary);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;

    .el-icon {
        font-size: 14px;
    }

    &:hover {
        color: var(--el-color-primary-dark);
    }
}

.feed-input {
    padding: 10px 14px;
    border-top: 1px solid var(--el-fill-color-light);
}

.fab-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;

    .publish-btn {
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, var(--el-color-primary) 0%, #ff6b8a 100%);
        border: none;
        box-shadow: 0 6px 20px rgba(255, 107, 138, 0.4);
        transition: all 0.3s;

        &:hover {
            transform: scale(1.1);
            box-shadow: 0 8px 28px rgba(255, 107, 138, 0.5);
        }

        .el-icon {
            font-size: 28px;
        }
    }

    .fab-hint {
        font-size: 12px;
        color: #909399;
        background: white;
        padding: 4px 12px;
        border-radius: 20px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.3s;
    }

    &:hover .fab-hint {
        opacity: 1;
        transform: translateY(0);
    }
}

.empty-state {
    margin-top: 60px;

    .empty-illustration {
        text-align: center;
        margin-bottom: 20px;

        .empty-icon {
            font-size: 80px;
            color: var(--el-color-primary-light-5);
            opacity: 0.6;
        }
    }
}

.load-more {
    text-align: center;
    padding: 20px;

    .el-button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }
}

.upload-drawer {
    :deep(.el-drawer__body) { padding-bottom: 80px; }
}

.upload-area {
    border: 2px dashed var(--el-border-color);
    border-radius: 12px;
    padding: 40px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
        border-color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
    }

    .upload-icon { font-size: 40px; color: #ccc; margin-bottom: 12px; }
}

.hidden-input { display: none; }

.input-with-action {
    display: flex;
    gap: 8px;
    align-items: flex-start;

    :deep(.el-input) { flex: 1; }
    .ai-btn {
        margin-top: 2px;
        flex-shrink: 0;
    }
}

.preview-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-top: 12px;

    .preview-item {
        position: relative;
        aspect-ratio: 1;
        border-radius: 8px;
        overflow: hidden;

        .preview-img { width: 100%; height: 100%; }
        .remove-icon {
            position: absolute;
            top: 4px;
            right: 4px;
            background: rgba(0,0,0,0.5);
            color: white;
            border-radius: 50%;
            padding: 4px;
            cursor: pointer;
        }
    }
}

.drawer-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px;
    border-top: 1px solid var(--el-border-color-light);
}

.comments-list {
    max-height: 50vh;
    overflow-y: auto;
    padding-bottom: 60px;
}

.comment-input-fixed {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px 16px;
    background: white;
    border-top: 1px solid var(--el-border-color-light);
}

.rounded-dialog {
    :deep(.el-dialog) { border-radius: 20px 20px 0 0 !important; max-height: 80vh; }
    :deep(.el-dialog__body) { padding: 0 16px 16px; }
}

.share-dialog {
    :deep(.el-dialog) { border-radius: 16px !important; }
}

.share-content {
    .share-card {
        display: flex;
        gap: 12px;
        padding: 12px;
        background: var(--el-fill-color-light);
        border-radius: 12px;
        margin-bottom: 16px;

        .share-img {
            width: 80px;
            height: 80px;
            border-radius: 8px;
            flex-shrink: 0;
        }

        .share-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;

            .share-baby {
                font-size: 12px;
                color: var(--el-color-primary);
                margin-bottom: 4px;
            }

            .share-title {
                font-size: 14px;
                font-weight: 600;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }
        }
    }

    .caption-box {
        background: var(--el-fill-color-light);
        border-radius: 12px;
        padding: 12px;
        margin-bottom: 16px;

        .caption-label {
            font-size: 12px;
            color: #999;
            margin-bottom: 8px;
        }

        .caption-text {
            font-size: 14px;
            line-height: 1.6;
            white-space: pre-wrap;
            margin-bottom: 12px;
        }
    }

    .share-actions {
        display: flex;
        gap: 24px;
        justify-content: center;

        .share-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            cursor: pointer;

            .btn-icon {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: var(--el-color-primary-light-9);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                color: var(--el-color-primary);
                transition: all 0.2s;

                &:hover {
                    background: var(--el-color-primary);
                    color: white;
                }
            }

            .btn-text {
                font-size: 12px;
                color: #666;
            }
        }
    }
}
</style>
