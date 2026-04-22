<template>
  <div class="vaccine-page" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <h2 class="title">疫苗计划</h2>
        <p class="subtitle">让每一次接种都准时、安心</p>
      </div>
      <el-button type="primary" round size="large" @click="fetchVaccines" :icon="Refresh">
        刷新
      </el-button>
    </div>

    <el-tabs v-model="activeTab" class="custom-tabs">
      <el-tab-pane label="接种清单" name="list">
        <div class="vaccine-list">
           <div class="section-title">即将接种</div>
           <el-empty v-if="upcoming.length === 0" description="暂无待接种疫苗" />
           <el-row :gutter="16">
              <el-col :xs="24" :sm="12" v-for="v in upcoming" :key="v.id">
                 <el-card class="vaccine-card upcoming" shadow="hover">
                    <div class="card-content">
                       <div class="v-icon"><el-icon><FirstAidKit /></el-icon></div>
                       <div class="v-info">
                          <div class="v-name">{{ v.vaccineName }}</div>
                          <div class="v-meta">
                             <el-tag size="small" :type="v.isRequired ? 'danger' : 'warning'" effect="plain">
                               {{ v.ageInMonths === 0 ? '出生' : v.ageInMonths + '月龄' }}
                             </el-tag>
                             <span class="v-date">预计日期: {{ formatDate(v.scheduledDate) }}</span>
                          </div>
                          <div class="v-desc" v-if="v.description">{{ v.description }}</div>
                       </div>
                    </div>
                    <el-button round type="primary" size="small" @click="completeVaccine(v)">标记已打</el-button>
                 </el-card>
              </el-col>
           </el-row>

           <div class="section-title mt-4">已接种</div>
           <el-table :data="completed" style="width: 100%" class="vaccine-table">
              <el-table-column label="疫苗名称" prop="vaccineName" min-width="150" />
              <el-table-column label="接种日期" width="120">
                 <template #default="{ row }">
                   {{ formatDate(row.vaccineDate) }}
                 </template>
              </el-table-column>
              <el-table-column label="状态" width="100">
                 <template #default>
                    <el-tag type="success" effect="light">已接种</el-tag>
                 </template>
              </el-table-column>
              <el-table-column label="详情" prop="note" show-overflow-tooltip />
           </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="百科知识" name="wiki">
         <div class="vaccine-wiki">
            <el-collapse v-model="activeWiki">
               <el-collapse-item title="什么是国家免疫规划疫苗？" name="1">
                  <div>国家免疫规划疫苗（一类疫苗）是政府免费向公民提供，公民应当依照政府规定受种的疫苗。包括乙肝疫苗、卡介苗、脊灰疫苗、百白破疫苗、麻腮风疫苗等。</div>
               </el-collapse-item>
               <el-collapse-item title="接种疫苗后可能有哪些反应？" name="2">
                  <div>常见反应包括接种部位红肿、疼痛、硬结，以及全身反应如发热、哭闹、食欲不振等。多数反应较轻，1-3天可自行缓解。</div>
               </el-collapse-item>
               <el-collapse-item title="接种前需要注意什么？" name="3">
                  <div>1. 携带预防接种证；2. 告知医生孩子近期的健康状况；3. 确保孩子皮肤清洁，穿着宽松。</div>
               </el-collapse-item>
               <el-collapse-item title="非免疫规划疫苗（二类疫苗）有必要打吗？" name="4">
                  <div>二类疫苗（如流感疫苗、水痘疫苗、手足口疫苗等）是自费自愿接种的。它们是对一类疫苗的重要补充，能为孩子提供更全面的保护，专家通常建议在经济条件允许的情况下尽量接种。</div>
               </el-collapse-item>
            </el-collapse>
         </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { Refresh, FirstAidKit, Check } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import { useBabyStore } from '@/stores/baby'

const babyStore = useBabyStore()
const activeTab = ref('list')
const activeWiki = ref(['1'])
const loading = ref(false)
const vaccines = ref<any[]>([])

const upcoming = computed(() => vaccines.value.filter(v => v.vaccinationStatus === 'pending'))
const completed = computed(() => vaccines.value.filter(v => v.vaccinationStatus === 'completed'))

const fetchVaccines = async () => {
    if (!babyStore.currentBaby?.id) return
    loading.value = true
    try {
        const token = localStorage.getItem('token')
        const res = await axios.get('/api/baby/vaccines', {
            params: { babyId: babyStore.currentBaby.id },
            headers: { Authorization: `Bearer ${token}` }
        })
        vaccines.value = res.data
    } catch (e) {
        console.error(e)
        ElMessage.error('无法加载疫苗计划')
    } finally {
        loading.value = false
    }
}

const completeVaccine = async (v: any) => {
    try {
        await ElMessageBox.confirm(`确定已接种 ${v.vaccineName} 吗？`, '确认接种', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'success'
        })
        
        const token = localStorage.getItem('token')
        await axios.post('/api/baby/vaccines', {
            id: v.id,
            status: 'completed',
            vaccineDate: new Date().toISOString()
        }, {
            params: { babyId: babyStore.currentBaby?.id },
            headers: { Authorization: `Bearer ${token}` }
        })
        
        ElMessage.success('已更新接种状态')
        fetchVaccines()
    } catch (e) {
        if (e !== 'cancel') {
            console.error(e)
            ElMessage.error('更新失败')
        }
    }
}

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

onMounted(fetchVaccines)
watch(() => babyStore.currentBaby?.id, fetchVaccines)
</script>

<style scoped lang="scss">
.vaccine-page {
  padding-bottom: 60px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  
  .title { font-size: 24px; font-weight: 800; color: #2c3e50; margin-bottom: 4px; }
  .subtitle { font-size: 14px; color: #909399; }
}

.custom-tabs {
    :deep(.el-tabs__item) { font-weight: 700; font-size: 16px; height: 50px; }
    :deep(.el-tabs__active-bar) { background-color: var(--el-color-primary); }
}

.vaccine-list {
    padding-top: 10px;
}

.section-title {
    font-size: 18px;
    font-weight: 700;
    margin: 20px 0 16px;
    color: #303133;
}

.mt-4 { margin-top: 32px; }

.vaccine-card {
    margin-bottom: 16px;
    border-radius: 20px !important;
    
    :deep(.el-card__body) {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        
        @media (max-width: 600px) {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
            
            .el-button {
                width: 100%;
            }
        }
    }
    
    .card-content {
        display: flex;
        align-items: center;
        gap: 16px;
    }
    
    .v-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background-color: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .v-name { font-weight: 700; font-size: 16px; margin-bottom: 4px; }
    .v-meta {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 4px;
        .v-date { font-size: 12px; color: #909399; }
    }
    .v-desc { font-size: 12px; color: #c0c4cc; }
    
    &.upcoming {
        border: 1px dashed var(--el-color-primary-light-7) !important;
    }
}

.vaccine-table {
    border-radius: 20px;
    overflow: hidden;
    box-shadow: var(--card-shadow);
}
</style>
