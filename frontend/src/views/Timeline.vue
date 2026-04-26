<template>
  <div class="timeline-page">
    <div class="page-header">
      <div class="header-content">
        <h2 class="title">
          <el-icon class="title-icon"><Timer /></el-icon>
          成长时光轴
        </h2>
        <p class="subtitle">记录宝宝的每一个珍贵瞬间</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" round @click="fetchTimeline(true)" :loading="loading" class="refresh-btn">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <div class="timeline-container" v-loading="loading && entries.length === 0">
      <div v-if="entries.length > 0" class="timeline-content">
        <el-timeline>
          <el-timeline-item
            v-for="(entry, index) in entries"
            :key="index"
            :timestamp="formatDate(entry.time)"
            :type="getTimelineItemType(entry.type)"
            :hollow="true"
            placement="top"
          >
            <el-card class="timeline-card" shadow="hover">
              <div class="card-body">
                <div class="record-icon" :class="entry.type">
                  <el-icon :size="22"><component :is="getIcon(entry.type)" /></el-icon>
                </div>
                <div class="record-details">
                  <div class="record-header">
                    <div class="title-left">
                      <span class="type-badge" :class="entry.type">
                        <el-icon :size="12"><component :is="getIcon(entry.type)" /></el-icon>
                        {{ getTypeName(entry.type) }}
                      </span>
                      <span class="creator-tag" v-if="entry.data.creator">
                        <el-icon><User /></el-icon>
                        {{ entry.data.creator.nickname }}
                      </span>
                    </div>
                    <span class="time-ago">
                      <el-icon><Clock /></el-icon>
                      {{ formatRelative(entry.time) }}
                    </span>
                  </div>
                  <div class="record-content">
                    <p v-if="entry.type === 'feeding'" class="content-text">
                      <span class="emoji">🍼</span> {{ getFeedingText(entry.data) }}
                    </p>
                    <p v-else-if="entry.type === 'sleep'" class="content-text">
                      <span class="emoji">🌙</span> {{ getSleepText(entry.data) }}
                    </p>
                    <p v-else-if="entry.type === 'diaper'" class="content-text">
                      <span class="emoji">👶</span> {{ getDiaperText(entry.data) }}
                    </p>
                    <p v-else-if="entry.type === 'growth'" class="content-text">
                      <span class="emoji">📈</span> {{ getGrowthText(entry.data) }}
                    </p>
                    <p v-else-if="entry.type === 'medication'" class="content-text">
                      <span class="emoji">💊</span> {{ entry.data.name }} - {{ entry.data.dosage }}
                    </p>
                    <p v-else-if="entry.type === 'health'" class="content-text">
                      <span class="emoji">🏥</span> {{ getHealthText(entry.data) }}
                    </p>
                    <p v-else class="content-text">
                      <span class="emoji">📝</span> {{ entry.data ? JSON.stringify(entry.data).substring(0, 50) : '未知记录' }}
                    </p>
                    <div class="remark" v-if="entry.data.remark || entry.data.note">
                      <el-icon><ChatLineSquare /></el-icon>
                      {{ entry.data.remark || entry.data.note }}
                    </div>
                  </div>
                </div>
                <div class="card-actions">
                  <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, entry)">
                    <el-icon class="more-icon"><MoreFilled /></el-icon>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="edit">
                          <el-icon><Edit /></el-icon> 编辑
                        </el-dropdown-item>
                        <el-dropdown-item command="delete" class="delete-item">
                          <el-icon><Delete /></el-icon> 删除
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>

        <div class="load-more" v-if="hasMore">
          <el-button link @click="fetchTimeline(false)" :loading="loading">
            <el-icon><RefreshRight /></el-icon>
            加载更多记录...
          </el-button>
        </div>
      </div>

      <div v-else-if="!loading && entries.length === 0" class="empty-state">
        <div class="empty-illustration">
          <el-icon class="empty-icon"><Calendar /></el-icon>
        </div>
        <el-empty description="暂无记录，快去记录宝宝的生活吧！">
          <el-button type="primary" round @click="router.push('/')">
            <el-icon><Plus /></el-icon> 去记录
          </el-button>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import {
  Refresh, Mug, Moon, ToiletPaper, TrendCharts,
  ChatDotRound, ChatLineSquare, MoreFilled, Edit, Delete,
  FirstAidKit, DataLine, User, Clock, Timer, RefreshRight, Plus, Calendar
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

const formatDate = (time: string) => {
  const d = new Date(time)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
}

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
    console.error('Timeline load error:', e)
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
    text = `母乳喂养 ${detail.leftBreastMinutes || 0}分钟(左) / ${detail.rightBreastMinutes || 0}分钟(右)`
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
  return `睡眠 ${Math.floor(duration / 60)}小时${duration % 60}分钟`
}

const getDiaperText = (data: any) => {
  const types: Record<string, string> = { 'pee': '嘘嘘', 'poop': '臭臭', 'both': '嘘嘘 + 臭臭', 'dry': '干爽' }
  return `尿布: ${types[data.type] || data.type}`
}

const milestoneLabels: Record<string, string> = {
  first_smile: '😊 第一次微笑',
  first_lift_head: '🙆 第一次抬头',
  first_roll: '🔄 第一次翻身',
  first_sit: '🧘 第一次独坐',
  first_crawl: '🐛 第一次爬行',
  first_stand: '🧍 第一次站立',
  first_walk: '🚶 第一次走路',
  first_tooth: '🦷 第一颗牙',
  first_word: '🗣️ 第一次说话',
  other: '⭐ 其他里程碑'
}

const getGrowthText = (data: any) => {
  const parts = []
  if (data.milestone) {
    parts.push(`🎉 ${milestoneLabels[data.milestone] || data.milestone}`)
  }
  if (data.height) parts.push(`身高 ${data.height}cm`)
  if (data.weight) parts.push(`体重 ${data.weight}kg`)
  if (data.headCircumference) parts.push(`头围 ${data.headCircumference}cm`)
  return parts.join(' / ') || '暂无数据'
}

const getHealthText = (data: any) => {
  if (data.type === 'TEMP') {
    return `体温 ${data.value}°C`
  } else if (data.type === 'ILLNESS') {
    return `症状: ${data.symptoms || '未填写'}`
  } else if (data.type === 'ACTIVITY') {
    return data.symptoms || '活动记录'
  } else {
    return data.symptoms || data.value || '健康记录'
  }
}

const handleCommand = (cmd: string, entry: any) => {
  if (cmd === 'edit') {
    handleEdit(entry)
  } else if (cmd === 'delete') {
    handleDelete(entry)
  }
}

const handleEdit = (entry: any) => {
  router.push(`/record/${entry.type}?id=${entry.data.id}`)
}

const handleDelete = (entry: any) => {
  ElMessageBox.confirm('确定要删除这条记录吗？此操作不可恢复。', '删除确认', {
    confirmButtonText: '确认删除',
    cancelButtonText: '取消',
    confirmButtonClass: 'el-button--danger',
    type: 'warning',
    roundButton: true
  }).then(async () => {
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`/api/record/${entry.type}?id=${entry.data.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      ElMessage.success('已删除')
      fetchTimeline(true)
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || ''
      ElMessage.error('删除失败' + (msg ? ': ' + msg : ''))
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
  min-height: 100vh;
  background: linear-gradient(180deg, #f8f9fa 0%, var(--el-fill-color-light) 100%);
  padding-bottom: 80px;
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;

  .header-content {
    .title {
      display: flex;
      align-items: center;
      gap: 6px;
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
      color: #909399;
      margin: 2px 0 0 0;
      line-height: 1.2;
    }
  }

  .refresh-btn {
    background: linear-gradient(135deg, var(--el-color-primary) 0%, #ff6b8a 100%);
    border: none;
    color: #fff;
    font-weight: 700;
    font-size: 13px;
    padding: 8px 14px;
    height: auto;

    .el-icon {
      font-size: 14px;
    }

    &:hover {
      opacity: 0.9;
    }
  }
}

.timeline-container {
  padding: 0 16px;
}

.timeline-content {
  padding: 8px 0;
}

.timeline-card {
  margin-bottom: 8px;
  border-radius: 16px !important;
  border: none;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08) !important;
  }

  .card-body {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }
}

.record-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }

  &.feeding {
    background: linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%);
    color: #ff8e94;
  }
  &.sleep {
    background: linear-gradient(135deg, #f0f9eb 0%, #d8f3dc 100%);
    color: #88d498;
  }
  &.diaper {
    background: linear-gradient(135deg, #fdf6ec 0%, #fef0d9 100%);
    color: #ffc97d;
  }
  &.growth {
    background: linear-gradient(135deg, #f4f4f5 0%, #e8e8ed 100%);
    color: #909399;
  }
  &.medication {
    background: linear-gradient(135deg, #fef0f0 0%, #ffe0e0 100%);
    color: #ff7875;
  }
  &.health {
    background: linear-gradient(135deg, #ecf5ff 0%, #d4ecff 100%);
    color: #69b1ff;
  }
}

.record-details {
  flex: 1;

  .record-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    flex-wrap: wrap;
    gap: 8px;

    .title-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .type-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;

      &.feeding {
        background: #fff5f5;
        color: #ff8e94;
      }
      &.sleep {
        background: #f0f9eb;
        color: #88d498;
      }
      &.diaper {
        background: #fdf6ec;
        color: #ffc97d;
      }
      &.growth {
        background: #f4f4f5;
        color: #909399;
      }
      &.medication {
        background: #fef0f0;
        color: #ff7875;
      }
      &.health {
        background: #ecf5ff;
        color: #69b1ff;
      }
    }

    .creator-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      background: var(--el-fill-color-light);
      padding: 3px 8px;
      border-radius: 10px;
      color: #909399;

      .el-icon {
        font-size: 11px;
      }
    }

    .time-ago {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #c0c4cc;

      .el-icon {
        font-size: 12px;
      }
    }
  }

  .record-content {
    .content-text {
      font-size: 14px;
      color: #606266;
      line-height: 1.6;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 6px;

      .emoji {
        font-size: 16px;
      }
    }

    .remark {
      margin-top: 10px;
      font-size: 13px;
      color: #909399;
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 8px 10px;
      background: var(--el-fill-color-light);
      border-radius: 8px;
      font-style: normal;
      line-height: 1.5;

      .el-icon {
        color: var(--el-color-primary);
        margin-top: 2px;
        flex-shrink: 0;
      }
    }
  }
}

.card-actions {
  padding-top: 2px;
  flex-shrink: 0;


  .more-icon {
    color: #909399;
    cursor: pointer;
    padding: 10px;
    border-radius: 50%;
    font-size: 20px;
    transition: all 0.2s;
    background: var(--el-fill-color-light);

    &:hover {
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }
  }
}

.delete-item {
  color: var(--el-color-danger) !important;
  font-weight: 600;
  &:hover {
    background: var(--el-color-danger-light-9) !important;
    color: var(--el-color-danger) !important;
  }
}

:deep(.el-dropdown-menu__item) {
  padding: 12px 20px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.load-more {
  text-align: center;
  padding: 24px 0;

  .el-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--el-color-primary);
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
      opacity: 0.5;
    }
  }
}

:deep(.el-timeline-item__wrapper) {
  padding-left: 28px;
}

:deep(.el-timeline-item__timestamp) {
  font-weight: 600;
  font-size: 14px;
  color: #606266 !important;
  margin-bottom: 12px !important;
  padding: 6px 12px;
  background: var(--el-fill-color-light);
  border-radius: 20px;
  display: inline-block;
}

:deep(.el-timeline-item__node) {
  background: linear-gradient(135deg, var(--el-color-primary) 0%, #ff6b8a 100%);
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(255, 107, 138, 0.3);
}

:deep(.el-timeline-item__tail) {
  border-left: 2px dashed var(--el-color-primary-light-6);
}
</style>
