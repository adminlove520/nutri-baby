<template>
  <div class="vaccine-page">
    <div class="page-header">
      <div class="header-left">
        <h2 class="title">疫苗计划</h2>
        <p class="subtitle">让每一次接种都准时、安心</p>
      </div>
      <el-button type="primary" round size="large" @click="showAddVaccine">
        <el-icon><Plus /></el-icon> 记录接种
      </el-button>
    </div>

    <el-tabs v-model="activeTab" class="custom-tabs">
      <el-tab-pane label="接种清单" name="list">
        <div class="vaccine-list">
           <div class="section-title">即将接种</div>
           <el-row :gutter="16">
              <el-col :xs="24" :sm="12" v-for="v in upcoming" :key="v.name">
                 <el-card class="vaccine-card upcoming" shadow="hover">
                    <div class="card-content">
                       <div class="v-icon"><el-icon><FirstAidKit /></el-icon></div>
                       <div class="v-info">
                          <div class="v-name">{{ v.name }}</div>
                          <div class="v-meta">
                             <el-tag size="small" type="warning" effect="plain">{{ v.targetAge }}</el-tag>
                             <span class="v-date">预计日期: {{ v.targetDate }}</span>
                          </div>
                       </div>
                    </div>
                    <el-button link type="primary" @click="completeVaccine(v)">标记已打</el-button>
                 </el-card>
              </el-col>
           </el-row>

           <div class="section-title">已接种</div>
           <el-table :data="completed" style="width: 100%" class="vaccine-table">
              <el-table-column label="疫苗名称" prop="name" min-width="150" />
              <el-table-column label="接种日期" prop="date" width="120" />
              <el-table-column label="状态" width="100">
                 <template #default>
                    <el-tag type="success" effect="light">已接种</el-tag>
                 </template>
              </el-table-column>
           </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="百科知识" name="wiki">
         <el-empty description="疫苗百科正在整理中..." />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Plus, FirstAidKit } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const activeTab = ref('list')

const upcoming = ref([
    { name: '乙肝疫苗（第二剂）', targetAge: '1月龄', targetDate: '2025-01-20' },
    { name: '卡介苗', targetAge: '出生24h', targetDate: '2024-12-25' }
])

const completed = ref([
    { name: '乙肝疫苗（第一剂）', date: '2024-12-24' }
])

const showAddVaccine = () => ElMessage.info('接种记录功能开发中')

const completeVaccine = (v: any) => {
    upcoming.value = upcoming.value.filter(item => item !== v)
    completed.value.unshift({ name: v.name, date: new Date().toLocaleDateString() })
    ElMessage.success('已更新接种状态')
}
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

.vaccine-card {
    margin-bottom: 16px;
    border-radius: 20px !important;
    
    :deep(.el-card__body) {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
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
    
    .v-name { font-weight: 700; font-size: 16px; margin-bottom: 6px; }
    .v-meta {
        display: flex;
        align-items: center;
        gap: 10px;
        .v-date { font-size: 12px; color: #909399; }
    }
    
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
