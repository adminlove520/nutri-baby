<template>
  <div class="vaccine-page" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <h2 class="title">疫苗接种管家</h2>
        <p class="subtitle">让每一次接种都准时、安心</p>
      </div>
      <el-button type="primary" round size="large" @click="fetchVaccines" :icon="Refresh" class="refresh-btn">
        刷新计划
      </el-button>
    </div>

    <!-- Stats Row -->
    <el-row :gutter="16" class="stats-row mb-24">
       <el-col :span="8">
          <div class="mini-stat-card c1">
             <div class="val">{{ completed.length }}</div>
             <div class="lab">已接种</div>
          </div>
       </el-col>
       <el-col :span="8">
          <div class="mini-stat-card c2">
             <div class="val">{{ upcoming.length }}</div>
             <div class="lab">待接种</div>
          </div>
       </el-col>
       <el-col :span="8">
          <div class="mini-stat-card c3">
             <div class="val">{{ nextVaccineDate }}</div>
             <div class="lab">下次预计</div>
          </div>
       </el-col>
    </el-row>

    <el-tabs v-model="activeTab" class="custom-tabs glass-tabs">
      <el-tab-pane label="接种清单" name="list">
        <div class="vaccine-list">
           <!-- AI Plan Section -->
           <div class="ai-plan-section mb-32" v-if="babyStore.currentBaby">
              <el-card class="ai-plan-card" shadow="hover">
                 <div class="ai-header">
                    <div class="title">✨ AI 定制接种计划表</div>
                    <el-button size="small" round @click="generateAiPlan" :loading="aiPlanLoading">智能生成</el-button>
                 </div>
                 <div class="ai-plan-content">
                    <div v-if="!aiPlan" class="plan-placeholder">
                       点击“智能生成”，由 AI 根据宝宝月龄定制专属接种路线图
                    </div>
                    <div v-else class="plan-text" v-html="aiPlan"></div>
                 </div>
              </el-card>
           </div>

           <div class="section-header">
              <div class="section-title">即将接种</div>
              <el-tag round effect="light" type="warning" size="small">{{ upcoming.length }} 个待办</el-tag>
           </div>
           
           <el-empty v-if="upcoming.length === 0" description="恭喜！目前没有待接种的疫苗" />
           
           <div class="upcoming-grid">
              <el-card v-for="v in upcoming" :key="v.id" class="vaccine-card upcoming" shadow="hover">
                <div class="v-card-top">
                   <div class="v-icon-box">
                      <el-icon><FirstAidKit /></el-icon>
                   </div>
                   <div class="v-main-info">
                      <div class="v-name">{{ v.vaccineName }}</div>
                      <div class="v-tags">
                         <el-tag size="small" :type="v.isRequired ? 'danger' : 'info'" effect="dark">
                           {{ v.isRequired ? '国家免疫规划' : '自费可选' }}
                         </el-tag>
                         <span class="v-age">{{ v.ageInMonths === 0 ? '出生' : v.ageInMonths + '月龄' }}推荐</span>
                      </div>
                   </div>
                   <div class="v-date-badge" :class="{ 'is-near': isNear(v.scheduledDate) }">
                      <div class="d-month">{{ getMonth(v.scheduledDate) }}</div>
                      <div class="d-day">{{ getDay(v.scheduledDate) }}</div>
                   </div>
                </div>
                
                <div class="v-card-body" v-if="v.description">
                   <p class="v-desc">{{ v.description }}</p>
                </div>
                
                <div class="v-card-footer">
                   <el-button link type="primary" :icon="InfoFilled" @click="showWiki(v)">查看科普</el-button>
                   <el-button round type="primary" @click="completeVaccine(v)">确认接种</el-button>
                </div>
              </el-card>
           </div>

           <div class="section-header mt-40">
              <div class="section-title">已接种记录</div>
           </div>
           
           <el-card class="completed-table-card" shadow="never">
              <el-table :data="completed" style="width: 100%" class="vaccine-table">
                 <el-table-column label="疫苗名称" prop="vaccineName" min-width="150">
                    <template #default="{ row }">
                       <div class="table-v-name">{{ row.vaccineName }}</div>
                    </template>
                 </el-table-column>
                 <el-table-column label="接种日期" width="140">
                    <template #default="{ row }">
                      <span class="table-date">{{ formatDate(row.vaccineDate) }}</span>
                    </template>
                 </el-table-column>
                 <el-table-column label="状态" width="100">
                    <template #default>
                       <el-tag type="success" size="small" effect="plain" round>已打</el-tag>
                    </template>
                 </el-table-column>
              </el-table>
           </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="百科知识" name="wiki">
          <div class="vaccine-wiki">
             <div class="wiki-grid">
                <el-card v-for="item in wikiItems" :key="item.id" class="wiki-item-card" shadow="hover">
                   <div class="item-header">
                      <div class="item-icon">{{ item.icon }}</div>
                      <span class="item-title">{{ item.title }}</span>
                   </div>
                   <div class="item-body">{{ item.content }}</div>
                </el-card>
             </div>
             
             <div class="ai-wiki-section mt-40">
                <el-card class="ai-card premium" shadow="hover">
                   <div class="ai-header">
                      <div class="ai-brand">
                         <div class="ai-spark">✨</div>
                         <div class="ai-text">
                            <span class="main">AI 接种深度百科</span>
                            <span class="sub">基于最新《国家免疫规划》动态生成</span>
                         </div>
                      </div>
                      <el-button type="primary" size="small" round @click="generateAiKnowledge" :loading="aiLoading">智能优化</el-button>
                   </div>
                   <div class="ai-body">
                      <div v-if="!aiKnowledge" class="ai-placeholder">
                         <el-empty :image-size="80" description="点击“智能优化”开启专属百科" />
                      </div>
                      <div v-else class="markdown-body rich-text" v-html="aiKnowledge"></div>
                   </div>
                </el-card>
             </div>
          </div>
      </el-tab-pane>
    </el-tabs>

    <!-- Wiki Detail Dialog -->
    <el-dialog v-model="wikiVisible" :title="currentWiki.title" width="90%" class="rounded-dialog">
       <div class="wiki-detail">
          <div class="wiki-meta">
             <el-tag size="small">{{ currentWiki.type }}</el-tag>
             <span>月龄推荐：{{ currentWiki.age }}</span>
          </div>
          <div class="wiki-text" v-html="currentWiki.content"></div>
          <div class="wiki-tips" v-if="currentWiki.tips">
             <div class="tips-title">💡 接种贴士</div>
             <p>{{ currentWiki.tips }}</p>
          </div>
       </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive } from 'vue'
import { Refresh, FirstAidKit, Check, InfoFilled, Opportunity, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import client from '@/api/client'
import { useBabyStore } from '@/stores/baby'

const babyStore = useBabyStore()
const activeTab = ref('list')
const activeWiki = ref(['1'])
const loading = ref(false)
const aiLoading = ref(false)
const vaccines = ref<any[]>([])
const aiKnowledge = ref('')
const aiPlan = ref('')
const aiPlanLoading = ref(false)

const generateAiPlan = async () => {
    aiPlanLoading.value = true
    try {
        const res: any = await client.post('/ai/analyze', {
            babyId: babyStore.currentBaby?.id,
            query: '请作为一名专业的儿科专家，根据我宝宝的月龄（如果是新出生则从0月开始），列出一份精简的未来6个月的接种计划清单表。包括：疫苗名称、推荐接种时间、主要预防疾病。请使用Markdown表格格式返回。'
        })
        aiPlan.value = res.insight.replace(/\n/g, '<br/>')
        ElMessage.success('计划表已生成')
    } catch (e) {
        // Handled
    } finally {
        aiPlanLoading.value = false
    }
}

const wikiVisible = ref(false)
const currentWiki = reactive({
    title: '',
    type: '',
    age: '',
    content: '',
    tips: ''
})

const upcoming = computed(() => {
    return vaccines.value
        .filter(v => v.vaccinationStatus === 'pending')
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
})

const completed = computed(() => {
    return vaccines.value
        .filter(v => v.vaccinationStatus === 'completed')
        .sort((a, b) => new Date(b.vaccineDate).getTime() - new Date(a.vaccineDate).getTime())
})

const nextVaccineDate = computed(() => {
    if (upcoming.value.length === 0) return '无计划'
    const date = new Date(upcoming.value[0].scheduledDate)
    return `${date.getMonth() + 1}/${date.getDate()}`
})

const fetchVaccines = async () => {
    if (!babyStore.currentBaby?.id) return
    loading.value = true
    try {
        const res: any = await client.get('/baby/vaccines', {
            params: { babyId: babyStore.currentBaby.id }
        })
        vaccines.value = res
    } catch (e) {
        // Handled
    } finally {
        loading.value = false
    }
}

const completeVaccine = async (v: any) => {
    try {
        await ElMessageBox.confirm(`确定宝宝已完成 ${v.vaccineName} 的接种吗？`, '接种登记', {
            confirmButtonText: '确定登记',
            cancelButtonText: '取消',
            type: 'success',
            roundButton: true
        })
        
        await client.post('/baby/vaccines', {
            id: v.id,
            status: 'completed',
            vaccineDate: new Date().toISOString()
        }, {
            params: { babyId: babyStore.currentBaby?.id }
        })
        
        ElMessage.success('已登记接种记录')
        fetchVaccines()
    } catch (e) {
        // Cancelled
    }
}

const showWiki = (v: any) => {
    currentWiki.title = v.vaccineName
    currentWiki.type = v.isRequired ? '一类疫苗' : '二类疫苗'
    currentWiki.age = v.ageInMonths === 0 ? '出生' : v.ageInMonths + '个月'
    currentWiki.content = v.description || '该疫苗暂无详细科普信息。'
    currentWiki.tips = v.isRequired ? '这是国家强制接种的免费疫苗，请务必按时接种。' : '这是自费可选疫苗，建议根据医生指导和家庭情况选择。'
    wikiVisible.value = true
}

const generateAiKnowledge = async () => {
    aiLoading.value = true
    try {
        const res: any = await client.post('/ai/analyze', {
            babyId: babyStore.currentBaby?.id,
            query: '请作为一名专业的儿科医生，为我的宝宝提供一份针对其月龄的疫苗接种百科知识，包括接种意义、常见反应及护理、注意事项等。请使用Markdown格式返回。'
        })
        aiKnowledge.value = res.insight.replace(/\n/g, '<br/>')
        ElMessage.success('知识库已优化')
    } catch (e) {
        // Handled
    } finally {
        aiLoading.value = false
    }
}

const wikiItems = [
    { id: '1', icon: '💉', title: '什么是免费一类疫苗？', content: '国家免疫规划疫苗是政府免费提供的必选接种，包括乙肝、卡介苗、脊灰等。' },
    { id: '2', icon: '🌡️', title: '发热了还能打吗？', content: '建议推迟。发热、严重过敏、急性传染病等情况需在医生指导下缓种。' },
    { id: '3', icon: '⏰', title: '接种前要准备什么？', content: '携带证件，告知近期健康状况，确保宝宝皮肤清洁，衣着宽松方便露臂。' },
    { id: '4', icon: '👶', title: '打完后如何护理？', content: '留观30分钟，接种当天避免洗澡沾水，多喝温开水，保持充足休息。' }
]

const isNear = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime()
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000 // Within 7 days
}

const getMonth = (dateStr: string) => new Date(dateStr).getMonth() + 1 + '月'
const getDay = (dateStr: string) => new Date(dateStr).getDate()
const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return dateStr.split('T')[0]
}

onMounted(fetchVaccines)
watch(() => babyStore.currentBaby?.id, fetchVaccines)
</script>

<style scoped lang="scss">
.vaccine-page { padding: 10px 16px 60px; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  .title { font-size: 22px; font-weight: 900; color: var(--el-text-color-primary); margin: 0; }
  .subtitle { font-size: 13px; color: var(--el-text-color-secondary); margin-top: 4px; }
  .refresh-btn { box-shadow: 0 4px 12px rgba(255, 142, 148, 0.2); }
}

.ai-plan-card {
    border-radius: 28px !important;
    background: linear-gradient(135deg, #fffcfc 0%, #fff5f5 100%);
    border: 1px solid var(--el-color-primary-light-8) !important;
    
    .ai-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        .title { font-weight: 900; color: var(--el-color-primary); font-size: 16px; }
    }
    
    .ai-plan-content {
        background: rgba(255, 255, 255, 0.6);
        border-radius: 16px;
        padding: 16px;
        min-height: 80px;
        
        .plan-placeholder { 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            height: 100%; 
            color: var(--el-text-color-secondary); 
            font-size: 13px; 
            font-style: italic;
        }
        
        .plan-text {
            font-size: 13px;
            line-height: 1.8;
            color: var(--el-text-color-primary);
            :deep(table) {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                th, td { border: 1px solid var(--el-border-color-light); padding: 8px; text-align: left; }
                th { background: var(--el-color-primary-light-9); font-weight: 800; }
            }
        }
    }
}

.wiki-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
}

.wiki-item-card {
    border-radius: 20px !important;
    :deep(.el-card__body) { padding: 20px; }
    
    .item-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        .item-icon { font-size: 20px; }
        .item-title { font-weight: 800; font-size: 14px; color: var(--el-text-color-primary); }
    }
    
    .item-body { font-size: 12px; line-height: 1.6; color: var(--el-text-color-regular); }
}

.ai-card.premium {
    background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
    border: none !important;
    box-shadow: 0 15px 35px rgba(0,0,0,0.05) !important;
    
    .ai-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 20px;
        border-bottom: 1px dashed rgba(0,0,0,0.05);
        
        .ai-brand {
            display: flex;
            gap: 12px;
            .ai-spark { font-size: 24px; }
            .ai-text {
                display: flex;
                flex-direction: column;
                .main { font-size: 16px; font-weight: 900; color: #2c3e50; }
                .sub { font-size: 11px; color: #a4b0be; font-weight: 600; margin-top: 2px; }
            }
        }
    }
    
    .ai-body {
        padding-top: 20px;
        .rich-text {
            font-size: 14px;
            line-height: 2;
            color: #4b5563;
        }
    }
}

.mb-32 { margin-bottom: 32px; }
.mt-40 { margin-top: 40px; }
</style>
