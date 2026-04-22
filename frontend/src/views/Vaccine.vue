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
             <div class="wiki-header">
                <el-icon><Opportunity /></el-icon>
                <span>专家提醒：接种疫苗是保护宝宝最经济有效的方法</span>
             </div>
             <el-collapse v-model="activeWiki" accordion>
                <el-collapse-item v-for="item in wikiItems" :key="item.id" :title="item.title" :name="item.id">
                   <div class="wiki-content">{{ item.content }}</div>
                </el-collapse-item>
             </el-collapse>
             
             <div class="ai-wiki-section mt-40">
                <el-card class="ai-card" shadow="hover">
                   <div class="ai-header">
                      <div class="ai-brand">
                         <div class="ai-icon">✨</div>
                         <span>AI 接种管家为您生成</span>
                      </div>
                      <el-button size="small" round @click="generateAiKnowledge" :loading="aiLoading">重新优化知识库</el-button>
                   </div>
                   <div class="ai-body">
                      <p v-if="!aiKnowledge">点击上方按钮，由 AI 根据您宝宝的情况生成个性化的疫苗知识百科...</p>
                      <div v-else class="markdown-body" v-html="aiKnowledge"></div>
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
        const res: any = await client.get('/ai/analyze', {
            params: { 
                babyId: babyStore.currentBaby?.id,
                query: '请作为一名专业的儿科医生，为我的宝宝提供一份针对其月龄的疫苗接种百科知识，包括接种意义、常见反应及护理、注意事项等。请使用Markdown格式返回。'
            }
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
    { id: '1', title: '什么是国家免疫规划疫苗？', content: '国家免疫规划疫苗（一类疫苗）是政府免费向公民提供，公民应当依照政府规定受种的疫苗。包括乙肝疫苗、卡介苗、脊灰疫苗、百白破疫苗、麻腮风疫苗等。' },
    { id: '2', title: '接种疫苗后可能有哪些反应？', content: '常见反应包括接种部位红肿、疼痛、硬结，以及全身反应如发热、哭闹、食欲不振等。多数反应较轻，1-3天可自行缓解。' },
    { id: '3', title: '接种前需要注意什么？', content: '1. 携带预防接种证；2. 告知医生孩子近期的健康状况；3. 确保孩子皮肤清洁，穿着宽松。' },
    { id: '4', title: '接种后应该如何护理？', content: '接种后应在诊室留观30分钟；接种当天不宜给宝宝洗澡，避免接种部位沾水；让宝宝多休息、多喝水。' }
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

.stats-row {
  margin-bottom: 30px;
}

.mini-stat-card {
    background: white;
    padding: 16px;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.02);
    border: 1px solid var(--el-border-color-lighter);
    
    .val { font-size: 20px; font-weight: 900; margin-bottom: 2px; }
    .lab { font-size: 11px; color: var(--el-text-color-secondary); font-weight: 600; }
    
    &.c1 .val { color: var(--el-color-success); }
    &.c2 .val { color: var(--el-color-warning); }
    &.c3 .val { color: var(--el-color-primary); }
}

.custom-tabs {
  :deep(.el-tabs__header) { margin-bottom: 24px; }
  :deep(.el-tabs__item) { font-weight: 800; font-size: 15px; }
  :deep(.el-tabs__nav-wrap::after) { height: 1px; background-color: var(--el-border-color-lighter); }
}

.section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    .section-title { font-size: 17px; font-weight: 900; color: var(--el-text-color-primary); }
}

.upcoming-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.vaccine-card {
    border-radius: 24px !important;
    border: none !important;
    transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    
    &:hover { transform: translateY(-3px); }

    .v-card-top {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
    }

    .v-icon-box {
        width: 48px;
        height: 48px;
        border-radius: 16px;
        background: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
    }

    .v-main-info {
        flex: 1;
        .v-name { font-size: 16px; font-weight: 800; color: var(--el-text-color-primary); margin-bottom: 4px; }
        .v-tags { display: flex; align-items: center; gap: 8px; .v-age { font-size: 11px; color: var(--el-text-color-secondary); font-weight: 600; } }
    }

    .v-date-badge {
        text-align: center;
        width: 50px;
        height: 54px;
        background: #f1f2f6;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        
        .d-month { font-size: 10px; font-weight: 800; color: var(--el-text-color-secondary); text-transform: uppercase; }
        .d-day { font-size: 20px; font-weight: 900; color: var(--el-text-color-primary); line-height: 1; }
        
        &.is-near { background: var(--el-color-primary); .d-month, .d-day { color: white; } box-shadow: 0 4px 12px rgba(255, 142, 148, 0.3); }
    }

    .v-card-body {
        padding: 12px 0;
        .v-desc { font-size: 13px; color: var(--el-text-color-regular); line-height: 1.6; margin: 0; }
    }

    .v-card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12px;
        border-top: 1px solid var(--el-border-color-lighter);
    }
}

.completed-table-card {
    border-radius: 24px !important;
    overflow: hidden;
    :deep(.el-card__body) { padding: 0; }
    
    .table-v-name { font-weight: 700; color: var(--el-text-color-primary); }
    .table-date { font-size: 13px; color: var(--el-text-color-secondary); font-weight: 500; }
}

.wiki-header {
    background: #fff9f9;
    padding: 16px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    color: var(--el-color-primary);
    font-size: 13px;
    font-weight: 700;
}

.wiki-content { font-size: 14px; line-height: 1.8; color: var(--el-text-color-regular); }

.ai-card {
    border-radius: 24px !important;
    background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
    border: 1px solid white !important;
    
    .ai-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        
        .ai-brand {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 800;
            color: #2c3e50;
            .ai-icon { font-size: 20px; }
        }
    }
    
    .ai-body {
        font-size: 14px;
        line-height: 1.8;
        color: #57606f;
        p { text-align: center; color: var(--el-text-color-secondary); font-style: italic; }
    }
}

.wiki-detail {
    .wiki-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; font-size: 12px; color: var(--el-text-color-secondary); font-weight: 600; }
    .wiki-text { line-height: 1.8; color: var(--el-text-color-primary); margin-bottom: 24px; }
    .wiki-tips { background: #f9fbfc; padding: 16px; border-radius: 16px; border-left: 4px solid var(--el-color-primary); .tips-title { font-weight: 800; font-size: 14px; color: var(--el-color-primary); margin-bottom: 4px; } p { margin: 0; font-size: 13px; color: var(--el-text-color-regular); } }
}

.mt-40 { margin-top: 40px; }
.mb-24 { margin-bottom: 24px; }
</style>
