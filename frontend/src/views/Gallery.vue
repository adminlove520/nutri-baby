<template>
  <div class="gallery-page">
    <div class="page-header">
      <div class="header-left">
        <el-button link :icon="Back" @click="router.back()">返回</el-button>
        <h2 class="title">宝宝图库</h2>
      </div>
      <div class="header-actions">
        <el-radio-group v-model="albumType" size="small" class="type-filter">
          <el-radio-button label="growth">成长记录</el-radio-button>
          <el-radio-button label="moment">精彩瞬间</el-radio-button>
          <el-radio-button label="all">全部</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div class="upload-section">
      <el-card class="upload-card" shadow="hover">
        <div class="upload-area" :class="{ 'is-dragover': isDragover }" @click="triggerUpload" @dragover.prevent="isDragover = true" @dragleave="isDragover = false" @drop.prevent="handleDrop">
          <el-icon class="upload-icon"><UploadFilled /></el-icon>
          <div class="upload-text">点击或拖拽上传照片</div>
          <div class="upload-hint">支持多选，最多一次上传 9 张图片，每张不超过 5MB</div>
          <input type="file" ref="fileInput" class="hidden-input" @change="handleFileSelect" accept="image/*" multiple />
        </div>

        <el-progress v-if="uploading" :percentage="uploadProgress" :stroke-width="8" class="upload-progress" />
      </el-card>
    </div>

    <div v-loading="loading" class="gallery-content">
      <div v-if="records.length === 0 && !loading" class="empty-state">
        <el-empty description="还没有照片，上传第一张吧！" />
      </div>

      <div v-else class="gallery-grid">
        <div v-for="record in records" :key="record.id" class="gallery-item">
          <el-image :src="record.url" fit="cover" class="photo" :preview-src-list="previewList" :initial-index="previewList.indexOf(record.url)" />
          <div class="item-overlay">
            <div class="item-actions">
              <el-button circle size="small" @click="openEditDialog(record)" :icon="Edit" />
              <el-button circle size="small" type="danger" @click="handleDelete(record)" :icon="Delete" />
            </div>
          </div>
          <div class="item-info">
            <div class="item-date">{{ formatDate(record.createdAt) }}</div>
            <div v-if="record.title" class="item-title">{{ record.title }}</div>
          </div>
        </div>
      </div>

      <div v-if="hasMore" class="load-more">
        <el-button link @click="loadMore" :loading="loadingMore">加载更多...</el-button>
      </div>
    </div>

    <el-dialog v-model="editDialogVisible" title="编辑照片信息" width="90%" class="rounded-dialog">
      <el-form :model="editForm" label-position="top">
        <el-form-item label="照片标题">
          <el-input v-model="editForm.title" placeholder="给照片起个名字" />
        </el-form-item>
        <el-form-item label="照片描述">
          <el-input v-model="editForm.description" type="textarea" :rows="3" placeholder="记录这一刻的故事" />
        </el-form-item>
        <el-form-item label="照片类型">
          <el-select v-model="editForm.albumType" placeholder="选择照片类型">
            <el-option label="成长记录" value="growth" />
            <el-option label="精彩瞬间" value="moment" />
          </el-select>
        </el-form-item>
        <el-form-item label="拍照日期">
          <el-date-picker v-model="editForm.time" type="date" style="width: 100%" placeholder="选择日期" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDialogVisible = false" round>取消</el-button>
          <el-button type="primary" @click="saveEdit" :loading="saving" round>保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { UploadFilled, Delete, Edit, Back } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import client from '@/api/client'
import { getAlbums, createAlbum, updateAlbum, deleteAlbum, type AlbumRecord } from '@/api/album'
import { useBabyStore } from '@/stores/baby'

const router = useRouter()
const babyStore = useBabyStore()

const loading = ref(false)
const loadingMore = ref(false)
const records = ref<AlbumRecord[]>([])
const albumType = ref('all')
const page = ref(1)
const limit = 20
const hasMore = ref(true)
const fileInput = ref<HTMLInputElement | null>(null)
const isDragover = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const editDialogVisible = ref(false)
const saving = ref(false)
const editingRecord = ref<AlbumRecord | null>(null)
const editForm = ref({
    title: '',
    description: '',
    albumType: 'growth',
    time: null as Date | null
})

const previewList = computed(() => records.value.map(r => r.url))

const fetchAlbums = async (reset = false) => {
    if (reset) {
        page.value = 1
        records.value = []
        hasMore.value = true
    }

    if (!babyStore.currentBaby?.id) return
    if (!hasMore.value && !reset) return

    if (reset) {
        loading.value = true
    } else {
        loadingMore.value = true
    }

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
        ElMessage.error('获取图库失败')
    } finally {
        loading.value = false
        loadingMore.value = false
    }
}

const loadMore = () => {
    fetchAlbums(false)
}

const triggerUpload = () => {
    fileInput.value?.click()
}

const handleFileSelect = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const files = target.files
    if (files) {
        await uploadFiles(Array.from(files))
    }
    target.value = ''
}

const handleDrop = async (event: DragEvent) => {
    isDragover.value = false
    const files = event.dataTransfer?.files
    if (files) {
        await uploadFiles(Array.from(files))
    }
}

const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return
    if (files.length > 9) {
        ElMessage.warning('一次最多上传 9 张图片')
        files = files.slice(0, 9)
    }

    if (!babyStore.currentBaby?.id) {
        ElMessage.warning('请先选择宝宝')
        return
    }

    uploading.value = true
    uploadProgress.value = 0

    const totalFiles = files.length
    let uploadedCount = 0

    for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
            ElMessage.warning(`${file.name} 超过 5MB，跳过`)
            continue
        }

        try {
            const filename = `${babyStore.currentBaby.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
            const res: any = await client.post(`/upload?filename=${encodeURIComponent(filename)}`, file, {
                headers: { 'Content-Type': file.type }
            })

            await createAlbum({
                babyId: babyStore.currentBaby.id.toString(),
                url: res.url,
                filename: file.name,
                fileSize: file.size,
                mimeType: file.type,
                albumType: albumType.value === 'all' ? 'growth' : albumType.value
            })

            uploadedCount++
            uploadProgress.value = Math.round((uploadedCount / totalFiles) * 100)
        } catch (e: any) {
            ElMessage.error(`${file.name} 上传失败: ${e.message}`)
        }
    }

    uploading.value = false
    uploadProgress.value = 0
    ElMessage.success(`成功上传 ${uploadedCount} 张照片`)
    fetchAlbums(true)
}

const openEditDialog = (record: AlbumRecord) => {
    editingRecord.value = record
    editForm.value = {
        title: record.title || '',
        description: record.description || '',
        albumType: record.albumType,
        time: record.time ? new Date(record.time) : null
    }
    editDialogVisible.value = true
}

const saveEdit = async () => {
    if (!editingRecord.value) return
    saving.value = true

    try {
        await updateAlbum(editingRecord.value.id, {
            title: editForm.value.title || undefined,
            description: editForm.value.description || undefined,
            albumType: editForm.value.albumType,
            time: editForm.value.time?.toISOString()
        })
        ElMessage.success('更新成功')
        editDialogVisible.value = false
        fetchAlbums(true)
    } catch (e) {
        ElMessage.error('更新失败')
    } finally {
        saving.value = false
    }
}

const handleDelete = (record: AlbumRecord) => {
    ElMessageBox.confirm('确定要删除这张照片吗？删除后可在回收站恢复。', '删除照片', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
    }).then(async () => {
        try {
            await deleteAlbum(record.id)
            ElMessage.success('已删除')
            fetchAlbums(true)
        } catch (e) {
            ElMessage.error('删除失败')
        }
    }).catch(() => {})
}

const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

watch(albumType, () => {
    fetchAlbums(true)
})

onMounted(() => {
    fetchAlbums(true)
})

watch(() => babyStore.currentBaby?.id, () => {
    fetchAlbums(true)
})
</script>

<style scoped lang="scss">
.gallery-page {
    padding: 16px;
    max-width: 1200px;
    margin: 0 auto;
    padding-bottom: 80px;
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
        .title {
            font-size: clamp(18px, 4vw, 24px);
            font-weight: 800;
            margin: 0;
        }
    }

    .type-filter {
        :deep(.el-radio-button__inner) {
            border-radius: 8px;
        }
    }
}

.upload-section {
    margin-bottom: 24px;
}

.upload-card {
    border-radius: 20px !important;
}

.upload-area {
    border: 2px dashed var(--el-border-color);
    border-radius: 16px;
    padding: 40px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;

    &:hover, &.is-dragover {
        border-color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
    }

    .upload-icon {
        font-size: 48px;
        color: var(--el-text-color-placeholder);
        margin-bottom: 16px;
    }

    .upload-text {
        font-size: 16px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        margin-bottom: 8px;
    }

    .upload-hint {
        font-size: 12px;
        color: var(--el-text-color-secondary);
    }
}

.hidden-input {
    display: none;
}

.upload-progress {
    margin-top: 16px;
}

.gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;

    @media (max-width: 480px) {
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
    }
}

.gallery-item {
    position: relative;
    aspect-ratio: 1;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;

    .photo {
        width: 100%;
        height: 100%;
    }

    &:hover .item-overlay {
        opacity: 1;
    }

    .item-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s;

        .item-actions {
            display: flex;
            gap: 8px;
        }
    }

    .item-info {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 8px;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
        color: white;

        .item-date {
            font-size: 11px;
            opacity: 0.9;
        }

        .item-title {
            font-size: 12px;
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    }
}

.empty-state {
    margin-top: 60px;
}

.load-more {
    text-align: center;
    padding: 24px 0;
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

.rounded-dialog {
    :deep(.el-dialog) {
        border-radius: 24px !important;
    }
}
</style>
