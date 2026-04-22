<template>
  <div class="home-page">
    <!-- Welcome Header -->
    <div class="welcome-header">
       <div class="welcome-text">
          <h1>{{ greeting }}, {{ userInfo.nickname || '新家长' }} 👋</h1>
          <p v-if="babyStore.currentBaby">宝宝 <b>{{ babyStore.currentBaby.name }}</b> 已经陪伴您 {{ joinDays }} 天了</p>
          <p v-else>欢迎加入 Nutri-Baby，开启科学育儿之旅</p>
       </div>
       <div class="header-actions">
          <el-badge :is-dot="hasNewNotifications">
             <el-button circle :icon="Bell" @click="router.push('/notifications')"></el-button>
          </el-badge>
       </div>
    </div>

    <!-- Important Alerts -->
    <transition name="el-zoom-in-top">
      <div v-if="upcomingVaccines.length > 0" class="vaccine-alert-card" @click="goToVaccine">
         <div class="alert-icon"><el-icon><WarningFilled /></el-icon></div>
         <div class="alert-body">
            <div class="alert-title">疫苗接种预警</div>
            <div class="alert-desc">{{ upcomingVaccines[0] }}</div>
         </div>
         <el-icon class="alert-arrow"><ArrowRight /></el-icon>
      </div>
    </transition>

    <el-row :gutter="24" class="main-content">
      <el-col :xs="24" :sm="15" :md="16" :lg="17">
        <!-- AI Insight -->
        <AIInsightCard v-if="babyStore.currentBaby" class="mb-24" />

        <!-- Daily Statistics -->
        <div class="section-header">
           <div class="section-title">今日概览</div>
           <el-button link type="primary" @click="router.push('/statistics')">详情数据</el-button>
        </div>
        
        <el-row :gutter="16" class="stats-grid" v-loading="loading">
          <el-col :xs="12" :span="6">
            <div class="stat-card-new p1">
              <div class="stat-inner">
                <el-icon class="icon"><Mug /></el-icon>
                <div class="stat-info">
                   <span class="val">{{ todayStats.feeding.totalCount }} <small>次</small></span>
                   <span class="lab">总喂养</span>
                </div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :span="6">
            <div class="stat-card-new p2">
              <div class="stat-inner">
                <el-icon class="icon"><Moon /></el-icon>
                <div class="stat-info">
                   <span class="val">{{ formatSleepDuration(todayStats.sleep.totalMinutes) }}</span>
                   <span class="lab">总睡眠</span>
                </div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :span="6">
            <div class="stat-card-new p3">
              <div class="stat-inner">
                <el-icon class="icon"><ToiletPaper /></el-icon>
                <div class="stat-info">
                   <span class="val">{{ todayStats.diaper.totalCount }} <small>次</small></span>
                   <span class="lab">换尿布</span>
                </div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :span="6">
            <div class="stat-card-new p4">
              <div class="stat-inner">
                <el-icon class="icon"><Pouring /></el-icon>
                <div class="stat-info">
                   <span class="val">{{ todayStats.feeding.bottleMl }} <small>ml</small></span>
                   <span class="lab">瓶喂奶量</span>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>

        <!-- Last Feeding -->
        <el-card class="compact-card clickable" shadow="hover" @click="handleFeeding">
            <div class="compact-row">
              <div class="icon-box-rounded p-bg">
                <el-icon :size="20"><Mug /></el-icon>
              </div>
              <div class="compact-body">
                <div class="label">最近喂养</div>
                <div class="value" v-if="todayStats.feeding.lastFeedingTime">{{ formatRelative(todayStats.feeding.lastFeedingTime) }}</div>
                <div class="value placeholder" v-else>今日暂无喂养记录</div>
              </div>
              <el-icon class="arrow"><ArrowRight /></el-icon>
            </div>
        </el-card>

        <!-- Expert Advice -->
        <div class="section-header mt-32">
           <div class="section-title">育儿锦囊</div>
        </div>
        <DailyTipsCard :tips="todayTips" :loading="tipsLoading" @tip-click="handleTipClick" @generate="manualGenerateTip" />
      </el-col>

      <el-col :xs="24" :sm="9" :md="8" :lg="7">
         <!-- Quick Actions -->
         <el-card class="side-card" shadow="hover">
            <template #header>
               <div class="side-header">
                 <span class="title">快速记录</span>
               </div>
            </template>
            <div class="action-buttons">
               <div class="action-btn p1" @click="handleFeeding">
                 <el-icon><Mug /></el-icon>
                 <span>喂养</span>
               </div>
               <div class="action-btn p2" @click="handleSleep">
                 <el-icon><Moon /></el-icon>
                 <span>睡眠</span>
               </div>
               <div class="action-btn p3" @click="handleDiaper">
                 <el-icon><ToiletPaper /></el-icon>
                 <span>尿布</span>
               </div>
               <div class="action-btn p4" @click="handleGrowth">
                 <el-icon><TrendCharts /></el-icon>
                 <span>生长</span>
               </div>
            </div>
         </el-card>

         <!-- Growth Preview -->
         <el-card class="side-card growth-card clickable" shadow="hover" @click="router.push('/statistics')">
            <template #header>
               <div class="side-header">
                 <span class="title">生长评估</span>
                 <el-icon><ArrowRight /></el-icon>
               </div>
            </template>
            <div class="growth-box">
                <div class="growth-data" v-if="todayStats.growth.latestHeight">
                   <div class="g-item">
                      <span class="v">{{ todayStats.growth.latestHeight }}<small>cm</small></span>
                      <span class="l">最新身高</span>
                   </div>
                   <div class="g-divider"></div>
                   <div class="g-item">
                      <span class="v">{{ todayStats.growth.latestWeight }}<small>kg</small></span>
                      <span class="l">最新体重</span>
                   </div>
                </div>
                <div class="placeholder-box" v-else>
                    <img src="https://sc02.alicdn.com/kf/S7180e037f00445d4b584a2f89b243379C.png" class="empty-img" />
                    <p>记录身高体重查看曲线</p>
                </div>
            </div>
         </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Mug, Moon, ToiletPaper, TrendCharts, ArrowRight, Pouring, 
  Bell, WarningFilled 
} from '@element-plus/icons-vue'
import DailyTipsCard from '@/components/DailyTipsCard.vue'
import AIInsightCard from './components/AIInsightCard.vue'
import { formatRelative } from '@/utils/date'
import { useBabyStore } from '@/stores/baby'
import { useUserStore } from '@/stores/user'
import { getStatistics } from '@/api/statistics'
import { getVaccines } from '@/api/baby'

const router = useRouter()
const babyStore = useBabyStore()
const userStore = useUserStore()
const loading = ref(false)
const joinDays = ref(0)
const hasNewNotifications = ref(false)

const userInfo = computed(() => userStore.userInfo)
const greeting = computed(() => {
    const hour = new Date().getHours()
    if (hour < 6) return '凌晨好'
    if (hour < 12) return '早上好'
    if (hour < 18) return '下午好'
    return '晚上好'
})

const todayStats = ref({
    feeding: { totalCount: 0, bottleMl: 0, lastFeedingTime: null },
    sleep: { totalMinutes: 0 },
    diaper: { totalCount: 0 },
    growth: { latestHeight: 0, latestWeight: 0 }
})

const upcomingVaccines = ref<string[]>([])
const todayTips = ref<any[]>([])
const tipsLoading = ref(false)

const manualGenerateTip = async () => {
    tipsLoading.value = true
    try {
        await client.get('/cron?triggerAiTip=true')
        ElMessage.success('已为您生成最新的育儿锦囊')
        // Refresh tips
        const babyId = babyStore.currentBaby?.id
        const tipsRes: any = await client.get('/tips', { params: { babyId } })
        todayTips.value = tipsRes
    } catch (e) {
        // Handled
    } finally {
        tipsLoading.value = false
    }
}

const fetchData = async () => {
    if (!babyStore.currentBaby?.id) return
    loading.value = true
    try {
        const babyId = babyStore.currentBaby.id

        const [statsRes, vaccineRes, userStats] = await Promise.all([
            getStatistics(babyId),
            getVaccines(babyId),
            client.get('/user/stats')
        ])

        todayStats.value = statsRes.today
        joinDays.value = (userStats as any).joinDays

        // Fetch real tips
        const tipsRes: any = await client.get('/tips', { params: { babyId } })
        todayTips.value = tipsRes

        const pending = vaccineRes
            .filter((v: any) => v.vaccinationStatus === 'pending')
            .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())

        if (pending.length > 0) {
            const next = pending[0]
            upcomingVaccines.value = [`宝宝接种提醒：${next.vaccineName}（预计接种：${next.scheduledDate.split('T')[0]}）`]
        } else {
            upcomingVaccines.value = []
        }
        
        // Check notifications
        const notifs: any = await client.get('/notifications?unreadOnly=true')
        hasNewNotifications.value = notifs.length > 0
    } catch (e) {
        // Handled globally
    } finally {
        loading.value = false
    }
}

import client from '@/api/client'

const formatSleepDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const goToVaccine = () => router.push('/vaccine')
const handleTipClick = (tip: any) => ElMessage.info(`锦囊详情：${tip.title}`)
const handleFeeding = () => router.push('/record/feeding')
const handleSleep = () => router.push('/record/sleep')
const handleDiaper = () => router.push('/record/diaper')
const handleGrowth = () => router.push('/record/growth')

onMounted(fetchData)
watch(() => babyStore.currentBaby?.id, fetchData)
</script>

<style scoped lang="scss">
.home-page { padding-bottom: 20px; }

.welcome-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  
  .welcome-text {
    h1 { font-size: 26px; font-weight: 900; margin: 0 0 6px; color: var(--el-text-color-primary); }
    p { margin: 0; color: var(--el-text-color-secondary); font-size: 14px; b { color: var(--el-color-primary); } }
  }
}

.vaccine-alert-card {
  background: linear-gradient(90deg, #ffeff0 0%, #fff 100%);
  border-radius: 20px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  margin-bottom: 32px;
  cursor: pointer;
  border: 1px solid var(--el-color-primary-light-8);
  box-shadow: 0 10px 20px rgba(255, 142, 148, 0.05);
  transition: all 0.3s;
  
  &:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(255, 142, 148, 0.1); }
  
  .alert-icon {
    width: 44px;
    height: 44px;
    background: var(--el-color-primary);
    color: white;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    margin-right: 16px;
  }
  
  .alert-body {
    flex: 1;
    .alert-title { font-weight: 800; font-size: 16px; color: var(--el-color-primary); margin-bottom: 2px; }
    .alert-desc { font-size: 13px; color: var(--el-text-color-regular); }
  }
  
  .alert-arrow { color: var(--el-color-primary-light-3); font-size: 18px; }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  
  .section-title { margin: 0; font-weight: 800; font-size: 1.3rem; }
}

.stats-grid {
  margin-bottom: 24px;
}

.stat-card-new {
  background: white;
  border-radius: 24px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.02);
  border: 1px solid var(--el-border-color-lighter);
  
  .stat-inner {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .icon { font-size: 24px; }
    
    .stat-info {
      display: flex;
      flex-direction: column;
      .val { font-size: 18px; font-weight: 800; color: var(--el-text-color-primary); small { font-size: 12px; font-weight: 600; } }
      .lab { font-size: 11px; color: var(--el-text-color-secondary); font-weight: 600; }
    }
  }
  
  &.p1 { .icon { color: var(--el-color-primary); } }
  &.p2 { .icon { color: var(--el-color-success); } }
  &.p3 { .icon { color: var(--el-color-warning); } }
  &.p4 { .icon { color: #409eff; } }
}

.compact-card {
  border-radius: 20px !important;
  margin-bottom: 24px;
  :deep(.el-card__body) { padding: 16px 20px; }
}

.compact-row {
  display: flex;
  align-items: center;
  gap: 16px;
  
  .icon-box-rounded {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    &.p-bg { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  }
  
  .compact-body {
    flex: 1;
    .label { font-size: 11px; font-weight: 700; color: var(--el-text-color-secondary); text-transform: uppercase; margin-bottom: 2px; }
    .value { font-size: 16px; font-weight: 700; color: var(--el-text-color-primary); &.placeholder { opacity: 0.5; font-size: 14px; } }
  }
  
  .arrow { color: var(--el-border-color); font-size: 14px; }
}

.side-card {
  border-radius: 24px !important;
  margin-bottom: 24px;
  
  .side-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .title { font-weight: 800; font-size: 16px; }
  }
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  
  .action-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 8px;
    border-radius: 18px;
    cursor: pointer;
    transition: all 0.2s;
    background: #fcfcfc;
    border: 1px solid var(--el-border-color-lighter);
    
    .el-icon { font-size: 24px; }
    span { font-size: 13px; font-weight: 700; color: var(--el-text-color-regular); }
    
    &:active { transform: scale(0.95); }
    
    &.p1 { .el-icon { color: var(--el-color-primary); } }
    &.p2 { .el-icon { color: var(--el-color-success); } }
    &.p3 { .el-icon { color: var(--el-color-warning); } }
    &.p4 { .el-icon { color: #409eff; } }
  }
}

.growth-box {
  .growth-data {
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 10px 0;
    
    .g-item {
      text-align: center;
      .v { display: block; font-size: 18px; font-weight: 800; color: var(--el-text-color-primary); small { font-size: 11px; margin-left: 2px; } }
      .l { font-size: 11px; color: var(--el-text-color-secondary); font-weight: 600; }
    }
    .g-divider { width: 1px; height: 20px; background: var(--el-border-color-light); }
  }
  
  .placeholder-box {
    text-align: center;
    padding: 10px 0;
    .empty-img { width: 100px; margin-bottom: 8px; opacity: 0.6; }
    p { font-size: 12px; color: var(--el-text-color-secondary); margin: 0; }
  }
}

.mb-24 { margin-bottom: 24px; }
.mt-32 { margin-top: 32px; }
.clickable { cursor: pointer; }
</style>
