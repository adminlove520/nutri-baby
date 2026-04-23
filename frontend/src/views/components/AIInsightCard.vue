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
            <el-skeleton :rows="4" animated />
        </div>
        <div v-else-if="result" class="analysis-result">
             <div class="sentiment-badge" :class="result.sentiment">
                 {{ sentimentLabel }}
             </div>
             <div class="summary-box">
                <p class="insight-text">{{ result.insight }}</p>
             </div>
             
             <!-- Recommendations Section -->
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

             <div class="update-time" v-if="lastUpdated">
                <el-icon><Clock /></el-icon>
                <span>{{ lastUpdated }}</span>
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
import { MagicStick, Refresh, InfoFilled, Clock } from '@element-plus/icons-vue'
import client from '@/api/client'
import { useBabyStore } from '@/stores/baby'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const result = ref<any>(null)
const lastUpdated = ref<string>('')
const babyStore = useBabyStore()

// --- LocalStorage Persistence ---
const getCacheKey = (babyId: string | bigint) => `ai_insight_${babyId}`

const loadFromCache = (babyId: string | bigint) => {
    try {
        const key = getCacheKey(babyId)
        const cached = localStorage.getItem(key)
        if (!cached) return null
        const parsed = JSON.parse(cached)
        // Cache is valid for 6 hours
        if (Date.now() - parsed.timestamp < 6 * 60 * 60 * 1000) {
            return parsed
        }
        localStorage.removeItem(key)
        return null
    } catch {
        return null
    }
}

const saveToCache = (babyId: string | bigint, data: any) => {
    try {
        const key = getCacheKey(babyId)
        localStorage.setItem(key, JSON.stringify({
            ...data,
            timestamp: Date.now()
        }))
    } catch {}
}

const formatUpdateTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const h = date.getHours().toString().padStart(2, '0')
    const m = date.getMinutes().toString().padStart(2, '0')
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}月${day}日 ${h}:${m} 更新`
}

onMounted(() => {
    if (babyStore.currentBaby?.id) {
        const cached = loadFromCache(babyStore.currentBaby.id)
        if (cached) {
            result.value = { insight: cached.insight, recommendations: cached.recommendations, sentiment: cached.sentiment }
            lastUpdated.value = formatUpdateTime(cached.timestamp)
        }
        // AI analysis is now manual or cron-based to save tokens/cost
        // else { analyze() }
    }
})

watch(() => babyStore.currentBaby?.id, (newId) => {
    if (newId) {
        const cached = loadFromCache(newId)
        if (cached) {
            result.value = { insight: cached.insight, recommendations: cached.recommendations, sentiment: cached.sentiment }
            lastUpdated.value = formatUpdateTime(cached.timestamp)
        }
        // AI analysis is now manual or cron-based
        // else { analyze() }
    } else {
        result.value = null
        lastUpdated.value = ''
    }
})

const sentimentLabel = computed(() => {
    const s = result.value?.sentiment
    if (s === 'positive') return '状态优'
    if (s === 'concern') return '需关注'
    return '状态平稳'
})

const analyze = async () => {
    if (!babyStore.currentBaby?.id) return

    loading.value = true
    try {
        const baby = babyStore.currentBaby
        const birthDate = baby?.birthDate ? new Date(baby.birthDate) : null
        const birthTime = birthDate ? birthDate.getTime() : 0
        const nowMs = Date.now()
        const days = birthTime ? Math.floor((nowMs - birthTime) / (1000 * 60 * 60 * 24)) : 0
        const months = Math.floor(days / 30)
        const ageStr = months >= 1 ? `${months}个月` : `${days}天`

        const res: any = await client.post('/ai/analyze', {
            babyId: babyStore.currentBaby.id.toString(),
            query: `宝宝：${baby?.name || '未知'}，性别：${baby?.gender === 'male' ? '男' : '女'}，年龄：${ageStr}（出生${days}天）。请提供专业的育儿健康分析和建议。`
        })
        console.log('[AI Insight] Analysis Result:', res)
        
        // Ensure recommendations is always an array
        const normalized = {
            insight: res.insight || '',
            sentiment: res.sentiment || 'neutral',
            recommendations: Array.isArray(res.recommendations)
                ? res.recommendations
                : typeof res.recommendations === 'string'
                    ? (res.recommendations as string).split(/[;\n]/).map((s: string) => s.trim()).filter(Boolean)
                    : []
        }
        
        result.value = normalized
        
        // Persist to cache with timestamp
        const now = Date.now()
        saveToCache(babyStore.currentBaby.id, { ...normalized, timestamp: now })
        lastUpdated.value = formatUpdateTime(now)
        
    } catch (e: any) {
        console.error('[AI Insight] Error:', e)
        ElMessage.warning('AI 分析暂时不可用，请稍后再试')
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
            line-height: 1.7;
            color: #303133;
            font-weight: 500;
        }
    }
    
    .recommendations {
        background: #fafbff;
        border-radius: 12px;
        padding: 16px;
        border: 1px dashed var(--el-color-primary-light-7);
        margin-bottom: 12px;

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
                margin-bottom: 10px;
                line-height: 1.6;
                
                &:last-child { margin-bottom: 0; }
                
                .bullet {
                    color: var(--el-color-primary);
                    font-weight: bold;
                    flex-shrink: 0;
                    margin-top: 1px;
                }
            }
        }
    }

    .update-time {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: var(--el-text-color-placeholder);

        .el-icon { font-size: 11px; }
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
