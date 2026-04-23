<template>
  <div class="timeline-page">
    <div class="page-header">
      <div class="header-content">
        <h2 class="title">成长时光轴</h2>
        <p class="subtitle">记录宝宝的点滴进步</p>
      </div>
      <el-button type="primary" round @click="fetchTimeline(true)" :loading="loading">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
    </div>

    <div class="timeline-container" v-loading="loading && entries.length === 0">
      <el-timeline v-if="entries.length > 0">
        <el-timeline-item
          v-for="(entry, index) in entries"
          :key="index"
          :timestamp="formatTime(entry.time)"
          :type="getTimelineItemType(entry.type)"
          :hollow="true"
          placement="top"
        >
          <el-card class="timeline-card" shadow="hover">
            <div class="card-body">
              <div class="record-icon" :class="entry.type">
                 <el-icon :size="20"><component :is="getIcon(entry.type)" /></el-icon>
              </div>
              <div class="record-details">
                <div class="record-title">
                  <div class="title-left">
                    <span class="type-label">{{ getTypeName(entry.type) }}</span>
                    <span class="creator-tag" v-if="entry.data.creator">
                      by {{ entry.data.creator.nickname }}
                    </span>
                  </div>
                  <span class="time-ago">{{ formatRelative(entry.time) }}</span>
                </div>
                <div class="record-content">
                   <p v-if="entry.type === 'feeding'">
                     {{ getFeedingText(entry.data) }}
                   </p>
                   <p v-else-if="entry.type === 'sleep'">
                     {{ getSleepText(entry.data) }}
                   </p>
                   <p v-else-if="entry.type === 'diaper'">
                     {{ getDiaperText(entry.data) }}
                   </p>
                   <p v-else-if="entry.type === 'growth'">
                     {{ getGrowthText(entry.data) }}
                   </p>
                   <p v-else-if="entry.type === 'medication'">
                     💊 {{ entry.data.name }} - {{ entry.data.dosage }}
                   </p>
                   <p v-else-if="entry.type === 'health'">
                     {{ getHealthText(entry.data) }}
                   </p>
                   <div class="remark" v-if="entry.data.remark || entry.data.note">
                     <el-icon><ChatDotRound /></el-icon> {{ entry.data.remark || entry.data.note }}
                   </div>
                </div>
              </div>
              <div class="card-actions">
                  <el-dropdown trigger="click">
                     <el-icon class="more-icon"><MoreFilled /></el-icon>
                     <template #dropdown>
                        <el-dropdown-menu>
                           <el-dropdown-item :icon="Edit" @click="handleEdit(entry)">编辑</el-dropdown-item>
                           <el-dropdown-item :icon="Delete" @click="handleDelete(entry)" class="delete-item">删除</el-dropdown-item>
                        </el-dropdown-menu>
                     </template>
                  </el-dropdown>
              </div>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>

      <div class="load-more" v-if="hasMore">
         <el-button link @click="fetchTimeline(false)" :loading="loading">加载更多记录...</el-button>
      </div>

      <el-empty v-else-if="!loading && entries.length === 0" description="暂无记录，快去记录宝宝的生活吧！">
         <el-button type="primary" round @click="router.push('/')">去记录</el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { 
  Refresh, Mug, Moon, ToiletPaper, TrendCharts, 
  ChatDotRound, MoreFilled, Edit, Delete, FirstAidKit, DataLine
} from '@element-plus/icons-vue'
import { useBabyStore } from '@/stores/baby'
import { formatTime, formatRelative } from '@/utils/date'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { TimelineEntry } from '@/types'

const router = useRouter()
const babyStore = useBabyStore()
const loading = ref(false)
const entries = ref<TimelineEntry[]>([])
const hasMore = ref(true)
const offset = ref(0)
const limit = 20

const fetchTimeline = async (reset = false) => {
  if (!babyStore.currentBaby?.id) return
  
  if (reset) {
    offset.value = 0
    entries.value = []
    hasMore.value = true
  }

  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/timeline', {
      params: { 
        babyId: babyStore.currentBaby.id,
        limit,
        offset: offset.value
      },
      headers: { Authorization: `Bearer ${token}` }
    })
    
    const newRecords = res.data.records
    if (newRecords.length < limit) {
      hasMore.value = false
    }
    
    entries.value = [...entries.value, ...newRecords]
    offset.value += limit
  } catch (e) {
    console.error(e)
    ElMessage.error('无法加载时光轴记录')
  } finally {
    loading.value = false
  }
}

const getTimelineItemType = (type: string) => {
  switch (type) {
    case 'feeding': return 'primary'
    case 'sleep': return 'success'
    case 'diaper': return 'warning'
    case 'growth': return 'info'
    case 'medication': return 'danger'
    case 'health': return 'warning'
    default: return ''
  }
}

const getIcon = (type: string) => {
  switch (type) {
    case 'feeding': return Mug
    case 'sleep': return Moon
    case 'diaper': return ToiletPaper
    case 'growth': return TrendCharts
    case 'medication': return FirstAidKit
    case 'health': return DataLine
    default: return Mug
  }
}

const getTypeName = (type: string) => {
  switch (type) {
    case 'feeding': return '喂养'
    case 'sleep': return '睡眠'
    case 'diaper': return '尿布'
    case 'growth': return '生长'
    case 'medication': return '用药'
    case 'health': return '健康'
    default: return '记录'
  }
}

const getFeedingText = (data: any) => {
  let text = ''
  const detail = data.detail || {}
  if (data.feedingType === 'breast') {
    text = `母乳喂养 ${detail.leftBreastMinutes || 0}m(左) / ${detail.rightBreastMinutes || 0}m(右)`
  } else if (data.feedingType === 'bottle') {
    text = `瓶喂 ${detail.milkType === 'formula' ? '奶粉' : '母乳'} ${data.amount}ml`
  } else {
    text = `辅食: ${detail.foodName || '未填写'}`
  }
  return text
}

const getSleepText = (data: any) => {
  const start = new Date(data.startTime)
  const end = data.endTime ? new Date(data.endTime) : null
  const duration = data.duration || (end ? Math.floor((end.getTime() - start.getTime()) / 60000) : 0)
  return `睡眠时长: ${Math.floor(duration / 60)}h ${duration % 60}m`
}

const getDiaperText = (data: any) => {
  const types: Record<string, string> = { 'pee': '嘘嘘', 'poop': '臭臭', 'both': '嘘嘘 + 臭臭', 'dry': '干爽' }
  return `尿布状态: ${types[data.type] || data.type}`
}

const getGrowthText = (data: any) => {
  const parts = []
  if (data.height) parts.push(`身高 ${data.height}cm`)
  if (data.weight) parts.push(`体重 ${data.weight}kg`)
  if (data.headCircumference) parts.push(`头围 ${data.headCircumference}cm`)
  return parts.join(' / ')
}

const getHealthText = (data: any) => {
  if (data.type === 'TEMP') {
    return `体温: ${data.value}°C`
  } else if (data.type === 'ILLNESS') {
    return `症状: ${data.symptoms || '未填写'}`
  } else {
    return `${data.type}: ${data.value}`
  }
}

const handleEdit = (entry: any) => {
    router.push(`/record/${entry.type}?id=${entry.data.id}`)
}

const handleDelete = (entry: any) => {
  ElMessageBox.confirm('确定要删除这条记录吗？', '提醒', {
    confirmButtonText: '确认删除',
    cancelButtonText: '取消',
    confirmButtonClass: 'el-button--danger',
    type: 'warning'
  }).then(async () => {
    try {
        const token = localStorage.getItem('token')
        await axios.delete(`/api/record/${entry.type}`, {
            params: { id: entry.data.id },
            headers: { Authorization: `Bearer ${token}` }
        })
        ElMessage.success('已删除记录')
        fetchTimeline(true)
    } catch (e) {
        ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

onMounted(() => {
  fetchTimeline(true)
})

watch(() => babyStore.currentBaby?.id, () => {
  fetchTimeline(true)
})
</script>

<style scoped lang="scss">
.timeline-page {
  padding-bottom: 60px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  
  .title {
    font-size: 24px;
    font-weight: 800;
    color: #2c3e50;
    margin-bottom: 4px;
  }
  
  .subtitle {
    font-size: 14px;
    color: #909399;
  }
}

.timeline-container {
  padding: 0 10px;
}

.timeline-card {
  margin-bottom: 10px;
  border-radius: 16px !important;
  
  .card-body {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }
}

.record-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  &.feeding { background-color: #fff5f5; color: #ff8e94; }
  &.sleep { background-color: #f0f9eb; color: #88d498; }
  &.diaper { background-color: #fdf6ec; color: #ffd077; }
  &.growth { background-color: #f4f4f5; color: #909399; }
}

.record-details {
  flex: 1;
  
  .record-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    
    .title-left {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .type-label {
      font-weight: 700;
      font-size: 16px;
      color: #303133;
    }

    .creator-tag {
        font-size: 11px;
        background: #f0f2f5;
        padding: 2px 6px;
        border-radius: 4px;
        color: #909399;
    }
    
    .time-ago {
      font-size: 12px;
      color: #C0C4CC;
    }
  }
  
  .record-content {
    font-size: 14px;
    color: #606266;
    line-height: 1.6;
    
    .remark {
      margin-top: 8px;
      font-size: 13px;
      color: #909399;
      display: flex;
      align-items: center;
      gap: 5px;
      font-style: italic;
    }
  }
}

.card-actions {
  padding-top: 2px;
  .more-icon {
    color: #C0C4CC;
    cursor: pointer;
    &:hover { color: var(--el-color-primary); }
  }
}

.delete-item {
    color: var(--el-color-danger);
}

.load-more {
  text-align: center;
  padding: 20px 0;
}

:deep(.el-timeline-item__timestamp) {
  font-weight: bold;
  font-size: 14px;
  color: #2c3e50;
  margin-bottom: 12px !important;
}
</style>
