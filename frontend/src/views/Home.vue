<template>
  <div class="home-page">
    <!-- Welcome Header -->
    <div class="welcome-header">
       <div class="welcome-text">
          <h1>{{ greeting }}, {{ userInfo.nickname || '新家长' }} 👋</h1>
          <div class="baby-quick-info" v-if="babyStore.currentBaby">
             <el-tag size="small" round effect="dark" class="age-tag">{{ babyAgeText }}</el-tag>
             <span class="companion-text">已陪伴您 <b>{{ joinDays }}</b> 天</span>
          </div>
          <p v-else>欢迎加入 Nutri-Baby，开启科学育儿之旅</p>
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

        <!-- Expert Advice (Moved up for better visibility) -->
        <div class="section-header" v-if="babyStore.currentBaby">
           <div class="section-title">育儿锦囊</div>
        </div>
        <DailyTipsCard 
            v-if="babyStore.currentBaby" 
            :tips="todayTips" 
            :loading="tipsLoading" 
            class="mb-32" 
            @tip-click="handleTipClick" 
            @generate="manualGenerateTip" 
        />

        <!-- Flash Actions -->
        <div class="section-header" v-if="babyStore.currentBaby">
           <div class="section-title">闪电记录</div>
           <span class="section-subtitle">凌晨3点的得力助手</span>
        </div>
        <div class="quick-action-grid mb-24" v-if="babyStore.currentBaby">
           <!-- 第一排：核心记录 -->
           <div class="q-btn-wrap" @click="quickFeeding(120)">
              <div class="q-btn b1"><el-icon><Mug /></el-icon></div>
              <span>120ml奶</span>
           </div>
           <div class="q-btn-wrap" @click="quickBreastfeeding('left')">
              <div class="q-btn b1" style="background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);"><el-icon><Pouring /></el-icon></div>
              <span>左亲喂</span>
           </div>
           <div class="q-btn-wrap" @click="quickBreastfeeding('right')">
              <div class="q-btn b1" style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);"><el-icon><Pouring /></el-icon></div>
              <span>右亲喂</span>
           </div>
           <div class="q-btn-wrap" @click="quickSleepToggle">
              <div class="q-btn b2">
                <el-icon v-if="!isSleeping"><Moon /></el-icon>
                <el-icon v-else class="is-loading"><Refresh /></el-icon>
              </div>
              <span>{{ isSleeping ? `已睡 ${sleepDuration}` : '睡了' }}</span>
           </div>

           <!-- 第二排：日常护理 -->
           <div class="q-btn-wrap" @click="quickDiaper('wet')">
              <div class="q-btn b3"><el-icon><ToiletPaper /></el-icon></div>
              <span>尿尿</span>
           </div>
           <div class="q-btn-wrap" @click="quickDiaper('dirty')">
              <div class="q-btn b3" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);"><el-icon><TrendCharts /></el-icon></div>
              <span>臭臭</span>
           </div>
           <div class="q-btn-wrap" @click="quickBath">
              <div class="q-btn b5" style="background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);"><el-icon><Umbrella /></el-icon></div>
              <span>洗澡</span>
           </div>
           <div class="q-btn-wrap" @click="quickTummyTime">
              <div class="q-btn b6"><el-icon><Checked /></el-icon></div>
              <span>趴卧</span>
           </div>

           <!-- 第三排：补剂与健康 -->
           <div class="q-btn-wrap" @click="quickVitaminD">
              <div class="q-btn b4"><el-icon><Opportunity /></el-icon></div>
              <span>补维D</span>
           </div>
           <div class="q-btn-wrap" @click="quickDHA">
               <div class="q-btn b3" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"><el-icon><Coffee /></el-icon></div>
               <span>补DHA</span>
           </div>
           <div class="q-btn-wrap" @click="quickProbiotics">
               <div class="q-btn b6" style="background: linear-gradient(135deg, #5ee7df 0%, #b490ca 100%);"><el-icon><StarFilled /></el-icon></div>
               <span>益生菌</span>
           </div>
           <div class="q-btn-wrap" @click="quickCalcium">
               <div class="q-btn b2" style="background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);"><el-icon><Food /></el-icon></div>
               <span>补钙</span>
           </div>

           <!-- 第四排：其他 -->
           <div class="q-btn-wrap" @click="medicationDialogVisible = true">
              <div class="q-btn b5"><el-icon><FirstAidKit /></el-icon></div>
              <span>用药</span>
           </div>
           <div class="q-btn-wrap" @click="healthDialogVisible = true">
              <div class="q-btn b4" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);"><el-icon><DataLine /></el-icon></div>
              <span>体温</span>
           </div>
           <div class="q-btn-wrap" @click="quickSpitUp">
              <div class="q-btn b1"><el-icon><Warning /></el-icon></div>
              <span>吐奶</span>
           </div>
           <div class="q-btn-wrap" @click="router.push('/statistics')">
              <div class="q-btn b4" style="background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%);"><el-icon><ArrowRight /></el-icon></div>
              <span>更多</span>
           </div>
        </div>

        
        <!-- Gallery Overview -->
        <div class="section-header" v-if="babyStore.currentBaby">
           <div class="section-title">
             <el-icon class="section-icon"><Picture /></el-icon>
             成长圈
           </div>
           <el-button link type="primary" @click="router.push('/gallery')">查看全部 <el-icon><ArrowRight /></el-icon></el-button>
        </div>
        <div class="gallery-overview" v-loading="albumsLoading" v-if="babyStore.currentBaby && recentAlbums.length > 0">
          <div class="gallery-grid">
            <div v-for="album in recentAlbums" :key="album.id" class="gallery-item" @click="router.push('/gallery')">
              <el-image :src="album.url.split(',')[0]" fit="cover" class="gallery-img" loading="lazy" />
              <div class="gallery-overlay">
                <div class="overlay-content">
                  <p class="album-title">{{ album.title || '成长记录' }}</p>
                  <div class="album-meta">
                    <span class="meta-item">
                      <el-icon><Star /></el-icon>
                      {{ album._count?.likes || 0 }}
                    </span>
                    <span class="meta-item">
                      <el-icon><ChatDotRound /></el-icon>
                      {{ album._count?.comments || 0 }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="gallery-empty-card" v-else-if="babyStore.currentBaby && !albumsLoading" v-loading="albumsLoading">
          <div class="empty-content">
            <el-icon class="empty-icon"><Picture /></el-icon>
            <p class="empty-title">还没有成长记录</p>
            <p class="empty-desc">记录宝宝的每一个精彩瞬间</p>
            <el-button size="small" type="primary" round @click="router.push('/gallery')">
              <el-icon><Plus /></el-icon> 发布第一条
            </el-button>
          </div>
        </div>

        <div class="section-header">
           <div class="section-title">
             <el-icon class="section-icon"><DataLine /></el-icon>
             今日概览
           </div>
           <el-button link type="primary" @click="router.push('/statistics')">详情数据 <el-icon><ArrowRight /></el-icon></el-button>
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

        <!-- Expert Advice Section Moved Up -->

        <!-- Tip Detail Dialog -->
        <el-dialog v-model="tipDetailVisible" :title="tipDetail?.title || '育儿锦囊'" width="90%" class="rounded-dialog">
           <div class="tip-detail-content">
              <div class="detail-tag" v-if="tipDetail?.type">
                 <el-tag effect="plain" round size="small">{{ tipDetail?.type }}</el-tag>
              </div>
              <div class="detail-body">
                 {{ tipDetail?.description }}
              </div>
           </div>
           <template #footer>
              <div class="dialog-footer">
                <el-button type="primary" @click="tipDetailVisible = false" round>我学到了</el-button>
              </div>
           </template>
        </el-dialog>
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

    <!-- Medication Record Dialog -->
    <el-dialog v-model="medicationDialogVisible" title="用药记录" width="90%" class="rounded-dialog">
       <el-form :model="medForm" label-position="top">
          <el-form-item label="药品名称">
             <el-input v-model="medForm.name" placeholder="如：布洛芬、益生菌" />
             <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px;">
                <el-tag 
                   v-for="tag in ['维D3', '益生菌', '钙剂', '布洛芬', '泰诺林']" 
                   :key="tag"
                   class="clickable"
                   size="small"
                   round
                   @click="medForm.name = tag"
                >{{ tag }}</el-tag>
             </div>
          </el-form-item>
          <el-form-item label="剂量">
             <el-input v-model="medForm.dosage" placeholder="如：2.5ml、1包" />
          </el-form-item>
          <el-form-item label="记录时间">
             <el-date-picker v-model="medForm.time" type="datetime" style="width: 100%" />
          </el-form-item>
          <el-form-item label="备注">
             <el-input v-model="medForm.notes" type="textarea" placeholder="记录宝宝的反应或用药原因" />
          </el-form-item>
       </el-form>
       <template #footer>
          <div class="dialog-footer">
            <el-button @click="medicationDialogVisible = false" round>取消</el-button>
            <el-button type="primary" @click="submitMedication" :loading="submitting" round>提交记录</el-button>
          </div>
       </template>
    </el-dialog>

    <!-- Health Record Dialog -->
    <el-dialog v-model="healthDialogVisible" title="健康监测" width="90%" class="rounded-dialog">
       <el-form :model="healthForm" label-position="top">
          <el-form-item label="指标类型">
             <el-radio-group v-model="healthForm.type" size="small">
                <el-radio-button label="TEMP">体温 (°C)</el-radio-button>
                <el-radio-button label="ILLNESS">生病/症状</el-radio-button>
                <el-radio-button label="OXYGEN">血氧 (%)</el-radio-button>
                <el-radio-button label="HEART_RATE">心率 (bpm)</el-radio-button>
             </el-radio-group>
          </el-form-item>
          <el-form-item label="数值">
             <el-input v-model="healthForm.value" type="number" placeholder="输入测量数值" />
          </el-form-item>
          <el-form-item label="记录时间">
             <el-date-picker v-model="healthForm.time" type="datetime" style="width: 100%" />
          </el-form-item>
          <el-form-item label="症状描述">
             <el-input v-model="healthForm.symptoms" placeholder="如：流鼻涕、咳嗽、精神良好" />
          </el-form-item>
          <el-form-item label="备注">
             <el-input v-model="healthForm.notes" type="textarea" placeholder="其他需要记录的信息" />
          </el-form-item>
       </el-form>
       <template #footer>
          <div class="dialog-footer">
            <el-button @click="healthDialogVisible = false" round>取消</el-button>
            <el-button type="primary" @click="submitHealth" :loading="submitting" round>提交记录</el-button>
          </div>
       </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import client from '@/api/client'
import { useRouter } from 'vue-router'
import {
  Mug, Moon, ToiletPaper, TrendCharts, ArrowRight, Pouring,
  WarningFilled, Opportunity, Refresh, FirstAidKit, DataLine,
  StarFilled, Checked, Food, Coffee, Umbrella, Warning, Picture
} from '@element-plus/icons-vue'
import DailyTipsCard from '@/components/DailyTipsCard.vue'
import AIInsightCard from './components/AIInsightCard.vue'
import { formatRelative } from '@/utils/date'
import { useBabyStore } from '@/stores/baby'
import { useUserStore } from '@/stores/user'
import { getStatistics } from '@/api/statistics'
import { getVaccines } from '@/api/baby'
import { getBeijingNow } from '@/utils/beijing'

const router = useRouter()
const babyStore = useBabyStore()
const userStore = useUserStore()
const loading = ref(false)
const joinDays = ref(0)
const isSleeping = ref(false)
const lastSleepId = ref<string | null>(null)
const sleepStartTime = ref<string | null>(null)
const sleepDuration = ref('00:00:00')
let sleepTimer: any = null

const updateSleepDuration = () => {
    if (!sleepStartTime.value) return
    const diff = getBeijingNow().valueOf() - new Date(sleepStartTime.value).getTime()
    const h = Math.floor(diff / 3600000).toString().padStart(2, '0')
    const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0')
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0')
    sleepDuration.value = `${h}:${m}:${s}`
}

const startSleepTimer = () => {
    stopSleepTimer()
    updateSleepDuration()
    sleepTimer = setInterval(updateSleepDuration, 1000)
}

const stopSleepTimer = () => {
    if (sleepTimer) {
        clearInterval(sleepTimer)
        sleepTimer = null
    }
}

const quickFeeding = async (amount: number) => {
    if (!babyStore.currentBaby?.id) return
    try {
        await client.post('/record/feeding', {
            babyId: babyStore.currentBaby.id,
            type: 'bottle',
            amount,
            time: getBeijingNow().toISOString()
        })
        ElMessage.success(`闪电记录：瓶喂 ${amount}ml`)
        fetchData()
    } catch (e) {}
}

const quickBreastfeeding = async (side: 'left' | 'right') => {
    if (!babyStore.currentBaby?.id) return
    try {
        await client.post('/record/feeding', {
            babyId: babyStore.currentBaby.id,
            type: 'breast',
            leftBreastMinutes: side === 'left' ? 10 : 0,
            rightBreastMinutes: side === 'right' ? 10 : 0,
            time: getBeijingNow().toISOString()
        })
        ElMessage.success(`闪电记录：亲喂 (${side === 'left' ? '左侧' : '右侧'}) 10min`)
        fetchData()
    } catch (e) {}
}

const quickSleepToggle = async () => {
    if (!babyStore.currentBaby?.id) return
    try {
        if (!isSleeping.value) {
            // Start Sleep
            const res: any = await client.post('/record/sleep', {
                babyId: babyStore.currentBaby.id,
                startTime: getBeijingNow().toISOString(),
                type: 'day'
            })
            isSleeping.value = true
            lastSleepId.value = (res as any).id
            sleepStartTime.value = getBeijingNow().toISOString()
            startSleepTimer()
            ElMessage.success('宝宝开始睡觉了')
        } else {
            // End Sleep
            await client.patch('/record/sleep', {
                id: lastSleepId.value,
                endTime: getBeijingNow().toISOString()
            })
            isSleeping.value = false
            lastSleepId.value = null
            stopSleepTimer()
            ElMessage.success('宝宝醒了')
        }
        fetchData()
    } catch (e) {}
}

const quickDiaper = async (type: 'dry' | 'wet' | 'dirty' | 'both' = 'dry') => {
    if (!babyStore.currentBaby?.id) return
    try {
        const typeMap: Record<string, string> = {
            'dry': '干爽',
            'wet': '嘘嘘',
            'dirty': '臭臭',
            'both': '嘘嘘 + 臭臭'
        }
        const apiTypeMap: Record<string, string> = {
            'dry': 'dry',
            'wet': 'pee',
            'dirty': 'poop',
            'both': 'both'
        }
        await client.post('/record/diaper', {
            babyId: babyStore.currentBaby.id,
            type: apiTypeMap[type] || 'dry',
            time: getBeijingNow().toISOString()
        })
        ElMessage.success(`闪电记录：${typeMap[type] || '尿布'}`)
        fetchData()
    } catch (e) {}
}

const quickBath = async () => {
    if (!babyStore.currentBaby?.id) return
    try {
        await client.post('/record/health', {
            babyId: babyStore.currentBaby.id,
            type: 'ACTIVITY',
            symptoms: '洗澡',
            time: getBeijingNow().toISOString()
        })
        ElMessage.success('闪电记录：洗澡')
        fetchData()
    } catch (e) {}
}

const quickTummyTime = async () => {
    if (!babyStore.currentBaby?.id) return
    try {
        await client.post('/record/health', {
            babyId: babyStore.currentBaby.id,
            type: 'ACTIVITY',
            symptoms: '趴卧/Tummy Time',
            time: getBeijingNow().toISOString()
        })
        ElMessage.success('闪电记录：趴卧')
        fetchData()
    } catch (e) {}
}

const quickProbiotics = async () => {
    if (!babyStore.currentBaby?.id) return
    try {
        await client.post('/record/medication', {
            babyId: babyStore.currentBaby.id,
            name: '益生菌',
            dosage: '1包',
            time: getBeijingNow().toISOString()
        })
        ElMessage.success('闪电记录：益生菌')
        fetchData()
    } catch (e) {
        ElMessage.error('记录失败')
    }
}

const quickVitaminD = async () => {
    if (!babyStore.currentBaby?.id) return
    try {
        await client.post('/record/medication', {
            babyId: babyStore.currentBaby.id,
            name: '维生素 D3',
            dosage: '1 滴',
            time: getBeijingNow().toISOString()
        })
        ElMessage.success('闪电记录：补维D')
        fetchData()
    } catch (e) {}
}

const quickDHA = async () => {
    if (!babyStore.currentBaby?.id) return
    try {
        await client.post('/record/medication', {
            babyId: babyStore.currentBaby.id,
            name: 'DHA',
            dosage: '1粒',
            time: getBeijingNow().toISOString()
        })
        ElMessage.success('闪电记录：补DHA')
        fetchData()
    } catch (e) {}
}

const quickCalcium = async () => {
    if (!babyStore.currentBaby?.id) return
    try {
        await client.post('/record/medication', {
            babyId: babyStore.currentBaby.id,
            name: '钙剂',
            dosage: '1包',
            time: getBeijingNow().toISOString()
        })
        ElMessage.success('闪电记录：补钙')
        fetchData()
    } catch (e) {}
}

const quickSpitUp = async () => {
    if (!babyStore.currentBaby?.id) return
    try {
        await client.post('/record/health', {
            babyId: babyStore.currentBaby.id,
            type: 'ILLNESS',
            symptoms: '吐奶',
            time: getBeijingNow().toISOString()
        })
        ElMessage.success('闪电记录：吐奶')
        fetchData()
    } catch (e) {}
}

const quickCrying = async () => {
    if (!babyStore.currentBaby?.id) return
    try {
        await client.post('/record/health', {
            babyId: babyStore.currentBaby.id,
            type: 'ILLNESS',
            symptoms: '哭闹',
            time: getBeijingNow().toISOString()
        })
        ElMessage.success('闪电记录：哭闹')
        fetchData()
    } catch (e) {}
}

const babyAgeText = computed(() => {
    if (!babyStore.currentBaby?.birthDate) return ''
    const birth = new Date(babyStore.currentBaby.birthDate)
    const now = getBeijingNow().toDate()
    let diffMonth = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    const diffDay = now.getDate() - birth.getDate()
    if (diffDay < 0) diffMonth--
    
    if (diffMonth < 1) {
        const days = Math.floor((now.getTime() - birth.getTime()) / 86400000)
        return `${days}天`
    }
    if (diffMonth < 12) return `${diffMonth}个月`
    return `${Math.floor(diffMonth / 12)}岁${diffMonth % 12}个月`
})

const userInfo = computed(() => userStore.userInfo)
const greeting = computed(() => {
    const hour = getBeijingNow().hour()
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
const recentAlbums = ref<any[]>([])
const albumsLoading = ref(false)

const fetchRecentAlbums = async () => {
    if (!babyStore.currentBaby?.id) return
    albumsLoading.value = true
    try {
        const res: any = await client.get('/album', {
            params: {
                babyId: babyStore.currentBaby.id,
                limit: 4
            }
        })
        const records = res.records || res || []
        recentAlbums.value = Array.isArray(records) ? records.slice(0, 4) : []
    } catch (e) {
        console.error('Fetch albums error:', e)
    } finally {
        albumsLoading.value = false
    }
}

const manualGenerateTip = async () => {
    tipsLoading.value = true
    try {
        const babyId = babyStore.currentBaby?.id
        // Call tips with forceAI=true to regenerate fresh AI tips
        const tipsRes: any = await client.get('/tips', { params: { babyId: babyId?.toString(), forceAI: 'true' } })
        todayTips.value = Array.isArray(tipsRes) ? tipsRes : []
        ElMessage.success('已为您生成最新的育儿锦囊')
    } catch (e) {
        ElMessage.warning('生成失败，请稍后再试')
    } finally {
        tipsLoading.value = false
    }
}

const fetchData = async () => {
    loading.value = true
    tipsLoading.value = true
    albumsLoading.value = true
    try {
        const babyId = babyStore.currentBaby?.id

        upcomingVaccines.value = []

        const babyIdStr = babyId?.toString()
        const results = await Promise.allSettled([
            client.get('/tips', { params: { babyId: babyIdStr } }),
            babyIdStr ? getStatistics(babyIdStr) : Promise.reject('No babyId'),
            babyIdStr ? getVaccines(babyIdStr) : Promise.reject('No babyId'),
            babyIdStr ? client.get('/record/sleep', { params: { babyId: babyIdStr, limit: 1 } }) : Promise.reject('No babyId'),
            babyIdStr ? client.get('/album', { params: { babyId: babyIdStr, limit: 4 } }) : Promise.reject('No babyId')
        ])

        if (results[0].status === 'fulfilled') {
            todayTips.value = results[0].value as any[]
        }
        tipsLoading.value = false 

        if (results[1].status === 'fulfilled') {
            const data = results[1].value as any
            if (data.joinDays !== undefined) joinDays.value = data.joinDays
            if (data && data.today) {
                const t = data.today
                if (t.feeding) {
                    todayStats.value.feeding.totalCount = t.feeding.totalCount ?? 0
                    todayStats.value.feeding.bottleMl = t.feeding.bottleMl ?? 0
                    todayStats.value.feeding.lastFeedingTime = t.feeding.lastFeedingTime ?? null
                }
                if (t.sleep) todayStats.value.sleep.totalMinutes = t.sleep.totalMinutes ?? 0
                if (t.diaper) todayStats.value.diaper.totalCount = t.diaper.totalCount ?? 0
                if (t.growth) {
                    todayStats.value.growth.latestHeight = t.growth.latestHeight ?? 0
                    todayStats.value.growth.latestWeight = t.growth.latestWeight ?? 0
                }
            }
        } else {
            if (babyIdStr) {
                ElMessage.error('今日概览数据加载失败')
            }
        }
        
        if (results[3].status === 'fulfilled') {
            const sleepRes = results[3].value as any
            const lastSleep = sleepRes.records?.[0]
            if (lastSleep && !lastSleep.endTime) {
                isSleeping.value = true
                lastSleepId.value = lastSleep.id
                sleepStartTime.value = lastSleep.startTime
                startSleepTimer()
            } else {
                isSleeping.value = false
                stopSleepTimer()
            }
        }

        if (results[2].status === 'fulfilled') {
            const vaccineRes = results[2].value as any[]
            if (Array.isArray(vaccineRes)) {
                const pending = vaccineRes
                    .filter((v: any) => v.vaccinationStatus === 'pending')
                    .sort((a: any, b: any) => {
                        const dateA = new Date(a.scheduledDate || a.scheduled_date || 0).getTime()
                        const dateB = new Date(b.scheduledDate || b.scheduled_date || 0).getTime()
                        return dateA - dateB
                    })

                if (pending.length > 0) {
                    const next = pending[0]
                    const vName = next.vaccineName || next.vaccine_name || '未知疫苗'
                    const sDate = next.scheduledDate || next.scheduled_date
                    const dateStr = sDate ? (typeof sDate === 'string' ? sDate.split('T')[0] : new Date(sDate).toISOString().split('T')[0]) : '待定'
                    upcomingVaccines.value = [`宝宝接种提醒：${vName}（预计接种：${dateStr}）`]
                }
            }
        }

        if (results[4]?.status === 'fulfilled') {
            const albumRes = results[4].value as any
            const records = albumRes?.records || albumRes || []
            recentAlbums.value = Array.isArray(records) ? records.slice(0, 4) : []
        }
    } catch (e) {
        console.error('Home fetchData error:', e)
    } finally {
        loading.value = false
        tipsLoading.value = false
        albumsLoading.value = false
    }
}

const formatSleepDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const goToVaccine = () => router.push('/vaccine')
const handleTipClick = (tip: any) => {
    tipDetail.value = tip
    tipDetailVisible.value = true
}

const tipDetailVisible = ref(false)
const tipDetail = ref<any>(null)
const medicationDialogVisible = ref(false)
const healthDialogVisible = ref(false)

const medForm = reactive({
    name: '',
    dosage: '',
    time: getBeijingNow().toISOString(),
    notes: ''
})

const healthForm = reactive({
    type: 'TEMP',
    value: '',
    symptoms: '',
    time: getBeijingNow().toISOString(),
    notes: ''
})

const submitting = ref(false)

const submitMedication = async () => {
    if (!babyStore.currentBaby?.id) return
    submitting.value = true
    try {
        await client.post('/record/medication', {
            babyId: babyStore.currentBaby.id,
            ...medForm
        })
        ElMessage.success('用药记录已添加')
        medicationDialogVisible.value = false
        // Reset form
        medForm.name = ''
        medForm.dosage = ''
        medForm.notes = ''
        fetchData()
    } catch (e) {
    } finally {
        submitting.value = false
    }
}

const submitHealth = async () => {
    if (!babyStore.currentBaby?.id) return
    submitting.value = true
    try {
        await client.post('/record/health', {
            babyId: babyStore.currentBaby.id,
            ...healthForm
        })
        ElMessage.success('健康数据已添加')
        healthDialogVisible.value = false
        // Reset form
        healthForm.value = ''
        healthForm.symptoms = ''
        healthForm.notes = ''
        fetchData()
    } catch (e) {
    } finally {
        submitting.value = false
    }
}
const handleFeeding = () => router.push('/record/feeding')
const handleSleep = () => router.push('/record/sleep')
const handleDiaper = () => router.push('/record/diaper')
const handleGrowth = () => router.push('/record/growth')

onMounted(async () => {
    // 等待 babyStore 完成加载（MainLayout 也会并发调用 fetchBabies）
    if (babyStore.babyList.length === 0) {
        if (babyStore.loading) {
            // 已在加载中，等待完成
            await new Promise<void>(resolve => {
                const stop = watch(() => babyStore.loading, (v) => {
                    if (!v) { stop(); resolve() }
                })
            })
        } else {
            await babyStore.fetchBabies()
        }
    }
    fetchData()
})

// 切换宝宝时重新拉数据
watch(() => babyStore.currentBaby?.id, (newId, oldId) => {
    if (newId !== oldId) fetchData()
})

onUnmounted(() => {
    stopSleepTimer()
})
</script>

<style scoped lang="scss">
.home-page { padding-bottom: 20px; }

.welcome-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  
  .welcome-text {
    h1 {
      font-size: clamp(20px, 5vw, 26px);
      font-weight: 900;
      margin: 0 0 6px;
      color: var(--el-text-color-primary);
      word-break: break-word;
    }
    .baby-quick-info {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
      .age-tag { background: var(--el-color-primary); border: none; font-size: 12px; }
      .companion-text {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        b { color: var(--el-color-primary); }
      }
    }
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
    width: 100%;

    .section-title { margin: 0; font-weight: 800; font-size: 1.3rem; }
    .section-subtitle { font-size: 12px; color: var(--el-text-color-secondary); margin-left: 8px; font-weight: 500; }
}

.quick-action-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-top: 16px;

    .q-btn-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        transition: transform 0.2s;
        
        &:active { transform: scale(0.95); }
        
        span { font-size: 12px; font-weight: 700; color: var(--el-text-color-primary); }
    }

    .q-btn {
        width: 100%;
        aspect-ratio: 1;
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: white;
        box-shadow: 0 8px 16px rgba(0,0,0,0.05);

        &.b1 { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); }
        &.b2 { background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); }
        &.b3 { background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%); }
        &.b4 { background: linear-gradient(135deg, #fccb90 0%, #d57eeb 100%); }
        &.b5 { background: linear-gradient(135deg, #a6c1ee 0%, #fbc2eb 100%); }
        &.b6 { background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%); }
    }
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

.gallery-overview {
    margin-bottom: 24px;
    background: white;
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.gallery-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;

    .gallery-item {
        position: relative;
        aspect-ratio: 1;
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

        &:hover {
            transform: translateY(-4px) scale(1.02);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);

            .gallery-overlay {
                opacity: 1;
            }
        }

        .gallery-img {
            width: 100%;
            height: 100%;
        }

        .gallery-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, rgba(255,107,138,0.85) 0%, rgba(255,142,148,0.85) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s;

            .overlay-content {
                text-align: center;
                padding: 12px;

                .album-title {
                    font-size: 13px;
                    color: white;
                    font-weight: 600;
                    margin: 0 0 8px 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                }

                .album-meta {
                    display: flex;
                    justify-content: center;
                    gap: 16px;

                    .meta-item {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        font-size: 12px;
                        color: white;

                        .el-icon {
                            font-size: 14px;
                        }
                    }
                }
            }
        }
    }
}

.gallery-empty-card {
    margin-bottom: 24px;
    background: linear-gradient(135deg, #fff5f6 0%, #fff9f9 100%);
    border: 2px dashed #ffb4c0;
    border-radius: 16px;
    padding: 32px;

    .empty-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;

        .empty-icon {
            font-size: 56px;
            color: #ffb4c0;
            margin-bottom: 12px;
        }

        .empty-title {
            font-size: 16px;
            font-weight: 600;
            color: #606266;
            margin: 0 0 4px 0;
        }

        .empty-desc {
            font-size: 13px;
            color: #909399;
            margin: 0 0 16px 0;
        }
    }
}

.section-icon {
    margin-right: 6px;
    vertical-align: middle;
}

.tip-detail-content {
    .detail-tag { margin-bottom: 16px; }
    .detail-body {
        font-size: 16px;
        line-height: 1.8;
        color: var(--el-text-color-primary);
        white-space: pre-wrap;
        background: var(--el-fill-color-light);
        padding: 20px;
        border-radius: 16px;
    }
}

.rounded-dialog {
  :deep(.el-dialog) { border-radius: 28px !important; max-width: 500px; }
  :deep(.el-dialog__header) { padding-bottom: 0; }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
}
</style>
