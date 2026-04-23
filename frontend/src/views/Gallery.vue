<template>
  <div class="gallery-page">
    <div class="page-header">
      <div class="header-left">
        <el-button link :icon="Back" @click="router.back()">返回</el-button>
        <h2 class="title">成长圈</h2>
      </div>
      <div class="header-actions">
        <el-radio-group v-model="albumType" size="small" class="type-filter">
          <el-radio-button label="growth">成长</el-radio-button>
          <el-radio-button label="moment">瞬间</el-radio-button>
          <el-radio-button label="all">全部</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div v-loading="loading && records.length === 0" class="feeds-container">
      <div v-if="records.length === 0 && !loading" class="empty-state">
        <el-empty description="还没有动态，快来发布第一条吧！">
          <el-button type="primary" round @click="showUpload = true">发布动态</el-button>
        </el-empty>
      </div>

      <div v-else class="feeds-list">
        <div v-for="item in records" :key="item.id" class="feed-card">
          <div class="feed-header">
            <el-avatar :size="44" :src="item.user?.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
            <div class="header-info">
              <div class="user-name">{{ item.user?.nickname || '匿名用户' }}</div>
              <div class="feed-meta">
                <span class="baby-tag">{{ item.baby?.name }}</span>
                <span class="time">{{ formatTime(item.createdAt) }}</span>
              </div>
            </div>
            <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, item)">
              <el-icon class="more-icon"><MoreFilled /></el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">编辑</el-dropdown-item>
                  <el-dropdown-item command="delete" divided style="color: var(--el-color-danger)">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <div class="feed-content">
            <p v-if="item.title" class="feed-title">{{ item.title }}</p>
            <p v-if="item.description" class="feed-desc">{{ item.description }}</p>
            <div class="feed-images" :class="{ 'multi': item.url.includes(',') }">
              <el-image
                v-for="(img, idx) in item.url.split(',')"
                :key="idx"
                :src="img.trim()"
                fit="cover"
                class="feed-img"
                :preview-src-list="item.url.split(',').map((s: string) => s.trim())"
                :initial-index="idx"
              />
            </div>
          </div>

          <div class="feed-actions">
            <div class="action-item" :class="{ active: item.isLiked }" @click="toggleLike(item)">
              <el-icon><Star /></el-icon>
              <span>{{ item._count?.likes || 0 }}</span>
            </div>
            <div class="action-item" @click="openComments(item)">
              <el-icon><ChatDotRound /></el-icon>
              <span>{{ item._count?.comments || 0 }}</span>
            </div>
            <div class="action-item" @click="openShare(item)">
              <el-icon><Share /></el-icon>
              <span>分享</span>
            </div>
          </div>

          <div v-if="item.comments && item.comments.length > 0" class="feed-comments">
            <div v-for="comment in item.comments" :key="comment.id" class="comment-item">
              <el-avatar :size="28" :src="comment.user?.avatar" class="comment-avatar" />
              <div class="comment-content">
                <div class="comment-header">
                  <span class="comment-author">{{ comment.user?.nickname }}</span>
                  <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
                </div>
                <div class="comment-text">{{ comment.content }}</div>
                <div v-if="comment.replies && comment.replies.length > 0" class="comment-replies">
                  <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
                    <span class="reply-author">{{ reply.user?.nickname }}：</span>
                    <span class="reply-text">{{ reply.content }}</span>
                  </div>
                </div>
                <div class="comment-actions">
                  <span class="reply-btn" @click="openReplyInput(item, comment)">回复</span>
                  <span v-if="comment.user?.id === currentUserId" class="delete-btn" @click="deleteComment(comment.id, item)">删除</span>
                </div>
              </div>
            </div>
            <div v-if="(item._count?.comments || 0) > 3" class="view-more" @click="openComments(item)">
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
          <el-button link @click="loadMore" :loading="loadingMore">加载更多...</el-button>
        </div>
      </div>
    </div>

    <div class="fab-container">
      <el-button circle size="large" type="primary" class="publish-btn" @click="showUpload = true">
        <el-icon><Plus /></el-icon>
      </el-button>
    </div>

    <el-drawer v-model="showUpload" title="发布动态" direction="btt" size="80%" class="upload-drawer">
      <el-form :model="uploadForm" label-position="top">
        <el-form-item label="选择宝宝">
          <el-select v-model="uploadForm.babyId" placeholder="请选择宝宝" style="width: 100%">
            <el-option v-for="baby in babyStore.babies" :key="baby.id" :label="baby.name" :value="baby.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="uploadForm.title" placeholder="给动态起个标题" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="uploadForm.description" type="textarea" :rows="3" placeholder="分享这一刻..." />
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
import { UploadFilled, Delete, Edit, Back, MoreFilled, Star, ChatDotRound, Promotion, Plus, Close, Share, Link } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import client from '@/api/client'
import { getAlbums, createAlbum, deleteAlbum, addComment, deleteComment as delComment, likeAlbum, unlikeAlbum, type AlbumRecord, type AlbumComment } from '@/api/album'
import { shareAlbum } from '@/api/share'
import { useBabyStore } from '@/stores/baby'
import { useUserStore } from '@/stores/user'

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

const processFiles = async (files: File[]) => {
    for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
            ElMessage.warning(`${file.name} 超过 5MB`)
            continue
        }
        const url = URL.createObjectURL(file)
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
    try {
        const uploadedUrls: string[] = []
        for (let i = 0; i < previewUrls.value.length; i++) {
            const url = previewUrls.value[i]
            if (url.startsWith('blob:')) {
                const blob = await fetch(url).then(r => r.blob())
                const filename = `${uploadForm.value.babyId}/${Date.now()}-${i}.jpg`
                const res: any = await client.post(`/upload?filename=${encodeURIComponent(filename)}`, blob, {
                    headers: { 'Content-Type': blob.type }
                })
                uploadedUrls.push(res.url)
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

        ElMessage.success('发布成功')
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
    } catch (e) {
        ElMessage.error('获取分享信息失败')
    }
    showShareDialog.value = true
}

const copyLink = async () => {
    if (!shareData.value?.shareUrl) return
    try {
        await navigator.clipboard.writeText(shareData.value.shareUrl)
        ElMessage.success('链接已复制到剪贴板')
    } catch (e) {
        ElMessage.error('复制失败')
    }
}

const generateWechatCaption = async () => {
    if (!shareData.value?.shareUrl) return
    try {
        const res: any = await shareAlbum(shareData.value.album.id, 'caption')
        generatedCaption.value = res.caption
    } catch (e) {
        ElMessage.error('生成文案失败')
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
    background: var(--el-fill-color-light);
    padding-bottom: 80px;
}

.page-header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);

    .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
        .title { font-size: 18px; font-weight: 800; margin: 0; }
    }
}

.feeds-container {
    padding: 12px;
}

.feed-card {
    background: white;
    border-radius: 12px;
    margin-bottom: 12px;
    overflow: hidden;
}

.feed-header {
    display: flex;
    align-items: center;
    padding: 12px;

    .header-info {
        flex: 1;
        margin-left: 12px;
        .user-name { font-weight: 600; font-size: 15px; }
        .feed-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 2px;
            .baby-tag {
                font-size: 11px;
                background: var(--el-color-primary-light-9);
                color: var(--el-color-primary);
                padding: 1px 6px;
                border-radius: 4px;
            }
            .time { font-size: 12px; color: #999; }
        }
    }

    .more-icon { color: #999; cursor: pointer; padding: 8px; }
}

.feed-content {
    padding: 0 12px 12px;

    .feed-title { font-weight: 600; font-size: 15px; margin-bottom: 6px; }
    .feed-desc { font-size: 14px; color: #666; line-height: 1.5; margin-bottom: 10px; }
}

.feed-images {
    display: grid;
    gap: 4px;
    border-radius: 8px;
    overflow: hidden;

    &.multi {
        grid-template-columns: repeat(2, 1fr);
    }

    .feed-img {
        width: 100%;
        aspect-ratio: 1;
        cursor: pointer;
    }
}

.feed-actions {
    display: flex;
    padding: 8px 12px;
    border-top: 1px solid var(--el-fill-color-light);

    .action-item {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px;
        color: #666;
        cursor: pointer;
        transition: color 0.2s;

        &:hover { color: var(--el-color-primary); }
        &.active { color: var(--el-color-danger); }
    }
}

.feed-comments {
    padding: 8px 12px;
    background: var(--el-fill-color-light);
}

.comment-item {
    display: flex;
    padding: 8px 0;

    .comment-avatar { flex-shrink: 0; }

    .comment-content {
        flex: 1;
        margin-left: 10px;

        .comment-header {
            display: flex;
            align-items: center;
            gap: 8px;
            .comment-author { font-weight: 600; font-size: 13px; }
            .comment-time { font-size: 11px; color: #999; }
        }

        .comment-text { font-size: 13px; color: #444; margin-top: 4px; line-height: 1.4; }

        .comment-replies {
            margin-top: 6px;
            padding: 6px 8px;
            background: white;
            border-radius: 6px;
            font-size: 12px;

            .reply-item { margin-bottom: 4px; &:last-child { margin-bottom: 0; } }
            .reply-author { color: #666; font-weight: 500; }
            .reply-text { color: #333; }
        }

        .comment-actions {
            display: flex;
            gap: 16px;
            margin-top: 6px;
            font-size: 12px;

            .reply-btn { color: #666; cursor: pointer; &:hover { color: var(--el-color-primary); } }
            .delete-btn { color: #999; cursor: pointer; &:hover { color: var(--el-color-danger); } }
        }
    }
}

.view-more {
    text-align: center;
    padding: 8px;
    color: var(--el-color-primary);
    font-size: 13px;
    cursor: pointer;
}

.feed-input {
    padding: 8px 12px;
    border-top: 1px solid var(--el-fill-color-light);
}

.fab-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 100;

    .publish-btn {
        width: 56px;
        height: 56px;
        box-shadow: 0 4px 16px rgba(255, 142, 148, 0.4);
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

.empty-state {
    margin-top: 80px;
}

.load-more {
    text-align: center;
    padding: 20px;
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
