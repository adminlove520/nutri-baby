<template>
  <div class="growth-album-page">
    <div class="page-header">
       <div class="header-left">
         <el-button link :icon="Back" @click="router.back()">返回</el-button>
         <h2 class="title">成长相册</h2>
       </div>
       <el-button type="primary" round @click="router.push('/record/growth')">记录生长</el-button>
    </div>

    <div v-loading="loading" class="album-content">
      <div v-if="records.length === 0" class="empty-state">
        <el-empty description="暂无成长照片，快去记录宝宝的第一张照片吧！" />
      </div>
      
      <div v-else class="album-grid">
        <div v-for="record in records" :key="record.id" class="album-card">
          <div class="card-image">
            <el-image 
              :src="record.imageUrl" 
              fit="cover" 
              class="photo"
              :preview-src-list="[record.imageUrl]"
            >
              <template #error>
                <div class="image-slot"><el-icon><Picture /></el-icon></div>
              </template>
            </el-image>
          </div>
          <div class="card-info">
            <div class="date">{{ formatDate(record.time) }}</div>
            <div class="growth-info">
              <span v-if="record.height">{{ record.height }}cm</span>
              <span v-if="record.weight" class="ml-8">{{ record.weight }}kg</span>
            </div>
            <div v-if="record.note" class="note">{{ record.note }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Back, Picture } from '@element-plus/icons-vue'
import client from '@/api/client'
import { useBabyStore } from '@/stores/baby'
import { ElMessage } from 'element-plus'

const router = useRouter()
const babyStore = useBabyStore()
const loading = ref(false)
const records = ref<any[]>([])

const fetchData = async () => {
  if (!babyStore.currentBaby?.id) return
  loading.value = true
  try {
    const res: any = await client.get('/record', {
      params: { 
        babyId: babyStore.currentBaby.id,
        type: 'growth',
        limit: 100
      }
    })
    // Only show records with images
    records.value = (res.records || []).filter((r: any) => r.imageUrl)
  } catch (e) {
    ElMessage.error('获取相册失败')
  } finally {
    loading.value = false
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

onMounted(fetchData)
watch(() => babyStore.currentBaby?.id, fetchData)
</script>

<style scoped lang="scss">
.growth-album-page {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 30px;
  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    .title { font-size: clamp(18px, 4vw, 24px); font-weight: 800; margin: 0; }
  }
}

.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

.album-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  transition: transform 0.3s;
  &:hover { transform: translateY(-5px); }
  
  .card-image {
    width: 100%;
    aspect-ratio: 1;
    .photo { width: 100%; height: 100%; }
    .image-slot {
      width: 100%;
      height: 100%;
      background: #f5f7fa;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      color: #dcdfe6;
    }
  }
  
  .card-info {
    padding: 16px;
    .date { font-size: 14px; color: #909399; margin-bottom: 4px; }
    .growth-info { font-size: 16px; font-weight: 700; color: #303133; margin-bottom: 8px; }
    .note { font-size: 13px; color: #606266; line-height: 1.5; }
  }
}

.empty-state {
  margin-top: 100px;
}

.ml-8 { margin-left: 8px; }
</style>
