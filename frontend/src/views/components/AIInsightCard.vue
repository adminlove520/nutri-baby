<template>
  <el-card class="ai-insight-card" v-loading="loading">
    <template #header>
      <div class="card-header">
        <div class="header-left">
             <span class="ai-icon">✨</span>
             <span class="card-title">宝宝健康周报 (AI)</span>
        </div>
        <el-button text size="small" :loading="loading" @click="analyze">
             {{ loading ? '分析中...' : '刷新分析' }}
        </el-button>
      </div>
    </template>
    
    <div class="insight-content">
        <div v-if="loading" class="loading-state">
            <el-skeleton :rows="3" animated />
        </div>
        <div v-else-if="result" class="markdown-body">
             <div class="summary">{{ result.insight }}</div>
             <!-- Recommendations list logic here if changed from previous view -->
        </div>
        <div v-else class="empty-state">
            <p>暂无分析数据，点击刷新获取 AI 建议</p>
            <el-button type="primary" plain @click="analyze">开始分析</el-button>
        </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MagicStick } from '@element-plus/icons-vue'
import axios from 'axios'
import { useBabyStore } from '@/stores/baby'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const result = ref<any>(null)
const babyStore = useBabyStore()

const analyze = async () => {
    if (!babyStore.currentBaby?.babyId) return

    loading.value = true
    try {
        const token = localStorage.getItem('token')
        const res = await axios.post('/api/ai/analyze', {
            babyId: babyStore.currentBaby.babyId
        }, {
             headers: { Authorization: `Bearer ${token}` }
        })
        result.value = res.data
    } catch (e) {
        ElMessage.error('Failed to generate insights')
    } finally {
        loading.value = false
    }
}
</script>

<style scoped lang="scss">
.ai-insight-card {
    margin-bottom: 20px;
    background: linear-gradient(135deg, #f0f9eb 0%, #ffffff 100%);
    border: 1px solid #e1f3d8;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: bold;
        color: #67C23A;
    }
    
    .icon-sparkle {
        font-size: 18px;
    }
}

.insight-content {
    .summary {
        font-size: 14px;
        line-height: 1.6;
        color: #303133;
        margin-bottom: 15px;
    }
    
    .recommendations {
        h4 {
            font-size: 13px;
            color: #909399;
            margin-bottom: 8px;
        }
        
        ul {
            padding-left: 20px;
            margin: 0;
            
            li {
                font-size: 13px;
                color: #606266;
                margin-bottom: 5px;
            }
        }
    }
}

.placeholder {
    text-align: center;
    color: #909399;
    font-size: 13px;
    padding: 10px;
}
</style>
