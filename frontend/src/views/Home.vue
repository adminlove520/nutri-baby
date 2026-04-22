<template>
  <div class="home-page">
    <!-- Vaccine Banner -->
    <el-alert
      v-if="upcomingVaccines.length > 0"
      :title="upcomingVaccines[0]"
      type="warning"
      show-icon
      :closable="false"
      class="vaccine-banner"
      @click="goToVaccine"
    />

    <el-row :gutter="24">
      <el-col :xs="24" :sm="16" :md="17">
        <!-- AI Insight -->
        <AIInsightCard v-if="babyStore.currentBaby" />

        <!-- Today's Stats Grid -->
        <div class="section-title">今日概览</div>
        <el-row :gutter="16" class="stats-row">
          <!-- Feeding -->
          <el-col :xs="12" :sm="6">
            <el-card shadow="never" class="stat-card stat-primary">
              <div class="stat-icon"><el-icon><Mug /></el-icon></div>
              <div class="stat-value">{{ todayStats.breastfeedingCount + todayStats.bottleFeedingCount }} 次</div>
              <div class="stat-label">总喂养</div>
            </el-card>
          </el-col>
          <!-- Sleep -->
          <el-col :xs="12" :sm="6">
            <el-card shadow="never" class="stat-card stat-success">
              <div class="stat-icon"><el-icon><Moon /></el-icon></div>
              <div class="stat-value">{{ formatSleepDuration(todayStats.sleepDurationMinutes) }}</div>
              <div class="stat-label">总睡眠</div>
            </el-card>
          </el-col>
          <!-- Diaper -->
          <el-col :xs="12" :sm="6">
            <el-card shadow="never" class="stat-card stat-warning">
              <div class="stat-icon"><el-icon><ToiletPaper /></el-icon></div>
              <div class="stat-value">{{ todayStats.diaperCount }} 次</div>
              <div class="stat-label">换尿布</div>
            </el-card>
          </el-col>
          <!-- Milk -->
          <el-col :xs="12" :sm="6">
            <el-card shadow="never" class="stat-card stat-info">
              <div class="stat-icon"><el-icon><Pouring /></el-icon></div>
              <div class="stat-value">{{ todayStats.totalMilk }} ml</div>
              <div class="stat-label">瓶喂奶量</div>
            </el-card>
          </el-col>
        </el-row>

        <!-- Last Feeding -->
        <el-card class="last-feeding-card" shadow="hover" @click="handleFeeding">
            <template #header>
              <div class="card-header">
                <span class="card-title">最近喂养</span>
                <el-button link type="primary">去记录</el-button>
              </div>
            </template>
            <div class="feeding-content">
              <div class="feeding-icon-wrapper">
                <el-icon :size="24"><Mug /></el-icon>
              </div>
              <div class="feeding-info">
                <span class="feeding-time">{{ lastFeedingTime }}</span>
                <span class="feeding-detail" v-if="lastFeedingDetail">{{ lastFeedingDetail }}</span>
              </div>
              <el-icon class="arrow-icon"><ArrowRight /></el-icon>
            </div>
        </el-card>

        <!-- Daily Tips -->
        <div class="section-title">专家建议</div>
        <DailyTipsCard :tips="todayTips" @tip-click="handleTipClick" />
        
      </el-col>

      <el-col :xs="24" :sm="8" :md="7">
         <!-- Quick Actions -->
         <el-card class="quick-actions" shadow="hover">
            <template #header>
               <div class="card-header">
                 <span class="card-title">快速记录</span>
               </div>
            </template>
            <div class="action-grid">
               <div class="action-item" @click="handleFeeding">
                 <div class="btn-wrapper primary"><el-icon :size="24"><Mug /></el-icon></div>
                 <span>喂养</span>
               </div>
               <div class="action-item" @click="handleSleep">
                 <div class="btn-wrapper success"><el-icon :size="24"><Moon /></el-icon></div>
                 <span>睡眠</span>
               </div>
               <div class="action-item" @click="handleDiaper">
                 <div class="btn-wrapper warning"><el-icon :size="24"><ToiletPaper /></el-icon></div>
                 <span>尿布</span>
               </div>
               <div class="action-item" @click="handleGrowth">
                 <div class="btn-wrapper info"><el-icon :size="24"><TrendCharts /></el-icon></div>
                 <span>生长</span>
               </div>
            </div>
         </el-card>

         <!-- Growth Summary (Small Chart Preview) -->
         <el-card class="growth-summary-card" shadow="hover" @click="router.push('/statistics')">
            <template #header>
               <div class="card-header">
                 <span class="card-title">生长曲线</span>
                 <el-icon><ArrowRight /></el-icon>
               </div>
            </template>
            <div class="growth-preview">
                <p class="preview-text">记录身高体重，查看宝宝成长曲线趋势。</p>
                <div class="placeholder-chart">
                    <div class="bar" style="height: 40%"></div>
                    <div class="bar" style="height: 60%"></div>
                    <div class="bar" style="height: 55%"></div>
                    <div class="bar" style="height: 80%"></div>
                    <div class="bar" style="height: 75%"></div>
                </div>
            </div>
         </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Mug, Moon, ToiletPaper, TrendCharts, ArrowRight, Pouring } from '@element-plus/icons-vue'
import DailyTipsCard from '@/components/DailyTipsCard.vue'
import AIInsightCard from './components/AIInsightCard.vue'
import { formatRelativeTime } from '@/utils/date'
import { useBabyStore } from '@/stores/baby'

const router = useRouter()
const babyStore = useBabyStore()

// Mock Data
const upcomingVaccines = ref(['疫苗提醒：乙肝疫苗（第二针）预计 2025-01-15'])
const todayTips = ref([
  { id: '1', title: '今天开始尝试俯卧时间 (Tummy Time)!', description: '每天2-3次，每次3-5分钟。', type: 'Activity', priority: 'high' as const },
  { id: '2', title: '注意观察宝宝的睡眠信号', description: '揉眼睛、打哈欠是睡眠信号。', type: 'Sleep', priority: 'medium' as const }
])

interface DailyTips {
    id: string;
    title: string;
    description: string;
    type: string;
    priority: "high" | "medium" | "low";
}

const todayStats = ref({
  breastfeedingCount: 5,
  bottleFeedingCount: 2,
  totalMilk: 240,
  sleepDurationMinutes: 720,
  diaperCount: 6
})

const lastFeedingTime = computed(() => {
  return formatRelativeTime(new Date(Date.now() - 1000 * 60 * 120)) // 2 hours ago
})
const lastFeedingDetail = ref('母乳亲喂 - 右侧')

const formatSleepDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h${m}m` : `${m}m`
}

// Actions
const goToVaccine = () => router.push('/vaccine')
const handleTipClick = (tip: DailyTips) => console.log('Tip clicked', tip)
const handleFeeding = () => router.push('/record/feeding')
const handleSleep = () => router.push('/record/sleep')
const handleDiaper = () => router.push('/record/diaper')
const handleGrowth = () => router.push('/record/growth')

</script>

<style scoped lang="scss">
.home-page {
  padding-bottom: 40px;
}
.vaccine-banner {
  margin-bottom: 24px;
  cursor: pointer;
  border-radius: 12px;
}

.stats-row {
    margin-bottom: 8px;
}

.stat-card {
  margin-bottom: 16px;
  text-align: center;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  
  .stat-icon {
      font-size: 20px;
      margin-bottom: 8px;
      opacity: 0.8;
  }

  .stat-value {
    font-size: 18px;
    font-weight: 800;
    margin-bottom: 4px;
  }
  .stat-label {
    font-size: 12px;
    color: #909399;
  }

  &.stat-primary { 
      background: #fff5f5; 
      .stat-value, .stat-icon { color: #ff8e94; }
  }
  &.stat-success { 
      background: #f0f9eb; 
      .stat-value, .stat-icon { color: #88d498; }
  }
  &.stat-warning { 
      background: #fdf6ec; 
      .stat-value, .stat-icon { color: #ffd077; }
  }
  &.stat-info { 
      background: #f4f4f5; 
      .stat-value, .stat-icon { color: #909399; }
  }
}

.last-feeding-card {
  margin-top: 8px;
  cursor: pointer;
  
  .card-header {
      border-bottom: none;
      padding-bottom: 0;
  }
}

.feeding-content {
  display: flex;
  align-items: center;
  padding: 4px 0;
  
  .feeding-icon-wrapper {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    padding: 12px;
    border-radius: 14px;
    margin-right: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .feeding-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      
      .feeding-time {
          font-weight: 700;
          font-size: 17px;
          margin-bottom: 2px;
      }
      .feeding-detail {
          color: #909399;
          font-size: 13px;
      }
  }
  
  .arrow-icon {
      color: #C0C4CC;
  }
}

.quick-actions {
  margin-bottom: 24px;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 4px 0;
}

.action-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px 8px;
    background: #fcfcfc;
    border: 1px solid #f0f0f0;
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
        background: #fff;
        border-color: var(--el-color-primary-light-5);
        transform: translateY(-2px);
    }
    
    .btn-wrapper {
        width: 52px;
        height: 52px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 10px;
        color: #fff;
        
        &.primary { background: linear-gradient(135deg, #ff8e94 0%, #ff6b72 100%); }
        &.success { background: linear-gradient(135deg, #88d498 0%, #68c37c 100%); }
        &.warning { background: linear-gradient(135deg, #ffd077 0%, #ffbc3f 100%); }
        &.info { background: linear-gradient(135deg, #b4b7bc 0%, #909399 100%); }
    }

    span {
        font-size: 14px;
        font-weight: 600;
        color: #606266;
    }
}

.growth-summary-card {
    cursor: pointer;
    
    .growth-preview {
        padding: 4px 0;
        
        .preview-text {
            font-size: 13px;
            color: #909399;
            margin-bottom: 16px;
        }
        
        .placeholder-chart {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            height: 60px;
            padding: 0 10px;
            
            .bar {
                width: 12%;
                background: var(--el-color-primary-light-7);
                border-radius: 4px 4px 0 0;
                transition: height 0.3s;
            }
        }
    }
    
    &:hover .bar {
        background: var(--el-color-primary-light-5);
    }
}
</style>
