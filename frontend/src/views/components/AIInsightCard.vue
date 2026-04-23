<template>
  <el-card class="ai-insight-card" v-loading="loading">
    <template #header>
      <div class="card-header">
        <div class="header-left">
             <div class="ai-icon-wrapper">
                <el-icon :size="18"><MagicStick /></el-icon>
             </div>
             <span class="card-title">AI 健康分析</span>
        </div>
        <el-button link type="primary" size="small" :loading="loading" @click="analyze">
             <el-icon><Refresh /></el-icon>
             {{ loading ? '分析中...' : '重新分析' }}
        </el-button>
      </div>
    </template>
    
    <div class="insight-content">
        <div v-if="loading" class="loading-state">
            <el-skeleton :rows="3" animated />
        </div>
        <div v-else-if="result" class="analysis-result">
             <div class="sentiment-badge" :class="result.sentiment">
                 {{ sentimentLabel }}
             </div>
             <div class="summary-box">
                <p class="insight-text">{{ result.insight }}</p>
             </div>
             
             <div class="recommendations" v-if="result.recommendations && result.recommendations.length > 0">
                <div class="rec-title">
                    <el-icon><InfoFilled /></el-icon>
                    <span>建议与对策</span>
                </div>
                <ul class="rec-list">
                    <li v-for="(rec, index) in result.recommendations" :key="index">
                        <span class="bullet">•</span>
                        <span class="text">{{ rec }}</span>
                    </li>
                </ul>
             </div>
        </div>
        <div v-else class="empty-state">
            <div class="empty-icon">🤖</div>
            <p>通过 AI 分析宝宝最近的喂养和睡眠情况</p>
            <el-button type="primary" round @click="analyze">立即生成报告</el-button>
        </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { MagicStick, Refresh, InfoFilled } from '@element-plus/icons-vue'
import client from '@/api/client'
import { useBabyStore } from '@/stores/baby'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const result = ref<any>(null)
const babyStore = useBabyStore()

onMounted(() => {
    if (babyStore.currentBaby?.id) {
        analyze()
    }
})

watch(() => babyStore.currentBaby?.id, (newId) => {
    if (newId) {
        analyze()
    } else {
        result.value = null
    }
})

const sentimentLabel = computed(() => {
    const s = result.value?.sentiment
    if (s === 'positive') return '状态优'
    if (s === 'concern') return '需关注'
    return '状态平稳'
})

const analyze = async () => {
    if (!babyStore.currentBaby?.id) {
        return
    }

    loading.value = true
    try {
        const res = await client.post('/ai/analyze', {
            babyId: babyStore.currentBaby.id
        })
        console.log('[AI Insight] Analysis Result:', res)
        result.value = res
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}
</script>

<style scoped lang="scss">
.ai-insight-card {
    margin-bottom: 24px;
    background: linear-gradient(135deg, #fff9f9 0%, #ffffff 100%);
    border: 1px solid var(--el-color-primary-light-8) !important;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .ai-icon-wrapper {
        background: var(--el-color-primary);
        color: #fff;
        width: 32px;
        height: 32px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .card-title {
        font-weight: 800;
        font-size: 16px;
        color: #2c3e50;
    }
}

.insight-content {
    min-height: 100px;
}

.analysis-result {
    position: relative;
    padding-top: 10px;

    .sentiment-badge {
        position: absolute;
        top: -45px;
        right: 0;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        
        &.positive { background: #f0f9eb; color: #67C23A; }
        &.concern { background: #fef0f0; color: #F56C6C; }
        &.neutral { background: #f4f4f5; color: #909399; }
    }

    .summary-box {
        margin-bottom: 20px;
        .insight-text {
            font-size: 15px;
            line-height: 1.6;
            color: #303133;
            font-weight: 500;
        }
    }
    
    .recommendations {
        background: #fff;
        border-radius: 12px;
        padding: 16px;
        border: 1px dashed var(--el-color-primary-light-7);

        .rec-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 700;
            color: var(--el-color-primary);
            margin-bottom: 12px;
        }
        
        .rec-list {
            list-style: none;
            padding: 0;
            margin: 0;
            
            li {
                display: flex;
                gap: 8px;
                font-size: 13.5px;
                color: #606266;
                margin-bottom: 8px;
                line-height: 1.5;
                
                .bullet {
                    color: var(--el-color-primary);
                    font-weight: bold;
                }
            }
        }
    }
}

.empty-state {
    text-align: center;
    padding: 30px 20px;
    
    .empty-icon {
        font-size: 40px;
        margin-bottom: 16px;
    }
    
    p {
        color: #909399;
        font-size: 14px;
        margin-bottom: 20px;
    }
}

.loading-state {
    padding: 10px 0;
}
</style>
