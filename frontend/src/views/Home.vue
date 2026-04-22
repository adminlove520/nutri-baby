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
        <el-row :gutter="16" class="stats-row" v-loading="loading">
          <!-- Feeding -->
          <el-col :xs="12" :sm="6">
            <el-card shadow="never" class="stat-card stat-primary">
              <div class="stat-icon"><el-icon><Mug /></el-icon></div>
              <div class="stat-value">{{ todayStats.feeding.totalCount }} 次</div>
              <div class="stat-label">总喂养</div>
            </el-card>
          </el-col>
          <!-- Sleep -->
          <el-col :xs="12" :sm="6">
            <el-card shadow="never" class="stat-card stat-success">
              <div class="stat-icon"><el-icon><Moon /></el-icon></div>
              <div class="stat-value">{{ formatSleepDuration(todayStats.sleep.totalMinutes) }}</div>
              <div class="stat-label">总睡眠</div>
            </el-card>
          </el-col>
          <!-- Diaper -->
          <el-col :xs="12" :sm="6">
            <el-card shadow="never" class="stat-card stat-warning">
              <div class="stat-icon"><el-icon><ToiletPaper /></el-icon></div>
              <div class="stat-value">{{ todayStats.diaper.totalCount }} 次</div>
              <div class="stat-label">换尿布</div>
            </el-card>
          </el-col>
          <!-- Milk -->
          <el-col :xs="12" :sm="6">
            <el-card shadow="never" class="stat-card stat-info">
              <div class="stat-icon"><el-icon><Pouring /></el-icon></div>
              <div class="stat-value">{{ todayStats.feeding.bottleMl }} ml</div>
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
            <div class="feeding-content" v-if="todayStats.feeding.lastFeedingTime">
              <div class="feeding-icon-wrapper">
                <el-icon :size="24"><Mug /></el-icon>
              </div>
              <div class="feeding-info">
                <span class="feeding-time">{{ formatRelative(todayStats.feeding.lastFeedingTime) }}</span>
                <span class="feeding-detail">喂哺宝宝</span>
              </div>
              <el-icon class="arrow-icon"><ArrowRight /></el-icon>
            </div>
            <div class="empty-state-text" v-else>
               今日暂无喂养记录
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
                <div class="growth-data" v-if="todayStats.growth.latestHeight">
                   <div class="data-item">
                      <span class="val">{{ todayStats.growth.latestHeight }}cm</span>
                      <span class="lab">身高</span>
                   </div>
                   <div class="data-item">
                      <span class="val">{{ todayStats.growth.latestWeight }}kg</span>
                      <span class="lab">体重</span>
                   </div>
                </div>
                <div class="placeholder-chart" v-else>
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
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Mug, Moon, ToiletPaper, TrendCharts, ArrowRight, Pouring } from '@element-plus/icons-vue'
import DailyTipsCard from '@/components/DailyTipsCard.vue'
import AIInsightCard from './components/AIInsightCard.vue'
import { formatRelative } from '@/utils/date'
import { useBabyStore } from '@/stores/baby'
import { getStatistics } from '@/api/statistics'
import { getVaccines } from '@/api/baby'

const router = useRouter()
const babyStore = useBabyStore()
const loading = ref(false)

interface DailyTips {
    id: string;
    title: string;
    description: string;
    type: string;
    priority: "high" | "medium" | "low";
}

// Today Stats
const todayStats = ref({
    feeding: { totalCount: 0, bottleMl: 0, lastFeedingTime: null },
    sleep: { totalMinutes: 0 },
    diaper: { totalCount: 0 },
    growth: { latestHeight: 0, latestWeight: 0 }
})

const upcomingVaccines = ref<string[]>([])
const todayTips = ref<DailyTips[]>([])

const fetchData = async () => {
    if (!babyStore.currentBaby?.id) return
    loading.value = true
    try {
        const babyId = babyStore.currentBaby.id
        
        // Fetch stats, vaccines, and tips in parallel
        const [statsRes, vaccineRes] = await Promise.all([
            getStatistics(babyId),
            getVaccines(babyId)
        ])
        
        todayStats.value = statsRes.today
        
        // Mock tips for now
        todayTips.value = [
            { id: '1', title: '母乳喂养建议', description: '坚持按需哺乳，帮助宝宝建立良好的消化系统。', type: 'feeding', priority: 'high' },
            { id: '2', title: '睡眠环境优化', description: '保持室内温度在 22-24 度，营造舒适的睡眠氛围。', type: 'sleep', priority: 'medium' }
        ]
        
        const pending = vaccineRes
            .filter((v: any) => v.vaccinationStatus === 'pending')
            .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
        
        if (pending.length > 0) {
            const next = pending[0]
            upcomingVaccines.value = [`提醒：${next.vaccineName} 即将到期（预计 ${next.scheduledDate.split('T')[0]}）`]
        } else {
            upcomingVaccines.value = []
        }
    } catch (e) {
        // Global interceptor handles this
    } finally {
        loading.value = false
    }
}

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

onMounted(fetchData)
watch(() => babyStore.currentBaby?.id, fetchData)
</script>

<style scoped lang="scss">
.home-page { padding-bottom: 40px; }
.vaccine-banner { 
    margin-bottom: 24px; 
    cursor: pointer; 
    border-radius: 16px; 
    border: 1px solid #ffd07744;
    padding: 12px;
    :deep(.el-alert__title) { font-weight: bold; }
}
.section-title { margin: 24px 0 16px; font-weight: 700; font-size: 1.2rem; display: flex; align-items: center; }

.stat-card {
  margin-bottom: 16px; text-align: center; border-radius: 16px; position: relative; overflow: hidden;
  .stat-icon { font-size: 20px; margin-bottom: 8px; opacity: 0.8; }
  .stat-value { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
  .stat-label { font-size: 12px; color: #909399; }
  &.stat-primary { background: #fff5f5; .stat-value, .stat-icon { color: #ff8e94; } }
  &.stat-success { background: #f0f9eb; .stat-value, .stat-icon { color: #88d498; } }
  &.stat-warning { background: #fdf6ec; .stat-value, .stat-icon { color: #ffd077; } }
  &.stat-info { background: #f4f4f5; .stat-value, .stat-icon { color: #909399; } }
}

.last-feeding-card { margin-top: 8px; cursor: pointer; .card-header { border-bottom: none; padding-bottom: 0; } }
.feeding-content {
  display: flex; align-items: center; padding: 4px 0;
  .feeding-icon-wrapper { background: var(--el-color-primary-light-9); color: var(--el-color-primary); padding: 12px; border-radius: 14px; margin-right: 16px; }
  .feeding-info { flex: 1; display: flex; flex-direction: column; .feeding-time { font-weight: 700; font-size: 17px; } .feeding-detail { color: #909399; font-size: 13px; } }
  .arrow-icon { color: #C0C4CC; }
}
.empty-state-text { color: #909399; font-size: 14px; text-align: center; padding: 10px 0; }

.action-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.action-item {
    display: flex; flex-direction: column; align-items: center; padding: 16px 8px; background: #fcfcfc; border: 1px solid #f0f0f0; border-radius: 16px; cursor: pointer; transition: all 0.2s;
    &:hover { background: #fff; border-color: var(--el-color-primary-light-5); transform: translateY(-2px); }
    .btn-wrapper { 
        width: 52px; height: 52px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; color: #fff;
        &.primary { background: linear-gradient(135deg, #ff8e94 0%, #ff6b72 100%); }
        &.success { background: linear-gradient(135deg, #88d498 0%, #68c37c 100%); }
        &.warning { background: linear-gradient(135deg, #ffd077 0%, #ffbc3f 100%); }
        &.info { background: linear-gradient(135deg, #b4b7bc 0%, #909399 100%); }
    }
}

.growth-preview {
    .data-row { display: flex; justify-content: space-around; margin-top: 10px; }
    .growth-data {
        display: flex; justify-content: space-around; padding: 10px 0;
        .data-item { text-align: center; .val { display: block; font-size: 18px; font-weight: 800; color: #2c3e50; } .lab { font-size: 12px; color: #909399; } }
    }
}

.placeholder-chart { display: flex; align-items: flex-end; justify-content: space-between; height: 60px; padding: 0 10px; .bar { width: 12%; background: var(--el-color-primary-light-7); border-radius: 4px 4px 0 0; } }
</style>
