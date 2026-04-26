<template>
  <el-card class="expert-tips-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <div class="title-with-icon">
          <el-tooltip content="点击生成最新育儿锦囊" placement="top" :show-after="500">
            <div class="icon-bulb clickable" @click="$emit('generate')" :class="{ 'is-loading': loading }">
              <el-icon v-if="!loading"><Opportunity /></el-icon>
              <el-icon v-else class="is-loading"><Refresh /></el-icon>
            </div>
          </el-tooltip>
          <span class="card-title">育儿锦囊</span>
        </div>
        <el-button link type="primary" class="more-btn">查看更多</el-button>
      </div>
    </template>
    
    <div v-if="tips.length === 0" class="empty-state">
       <el-empty :image-size="60" description="暂无育儿锦囊，点击右上角💡生成" />
    </div>

    <div v-else class="tips-container">
      <div v-for="(tip, index) in tips.slice(0, maxDisplay)" :key="tip.id" 
           class="tip-row" @click="$emit('tip-click', tip)"
           :style="{ animationDelay: `${index * 0.1}s` }">
        <div class="tip-badge" :class="tip.priority"></div>
        <div class="tip-body">
          <div class="tip-meta">
            <span class="tip-tag">{{ tip.type }}</span>
            <span class="tip-date" v-if="tip.createdAt">{{ formatDate(tip.createdAt) }}</span>
          </div>
          <div class="tip-subject">{{ tip.title }}</div>
        </div>
        <el-icon class="tip-arrow"><ArrowRight /></el-icon>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { Opportunity, ArrowRight, Refresh } from '@element-plus/icons-vue'

interface DailyTip {
  id: string
  title: string
  description: string
  type: string
  priority: 'high' | 'medium' | 'low'
  createdAt?: string
}

defineProps({
  tips: {
    type: Array as PropType<DailyTip[]>,
    default: () => []
  },
  maxDisplay: {
    type: Number,
    default: 5
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['tip-click', 'generate'])

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}
</script>

<style scoped lang="scss">
.expert-tips-card {
  margin-bottom: 24px;
  border-radius: 24px !important;
  
  :deep(.el-card__header) {
    padding: 16px 20px;
    border-bottom: 1px solid var(--el-border-color-light);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 10px;
  
  .icon-bulb {
    width: 28px;
    height: 28px;
    background: #fff0e6;
    color: #ff9900;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: all 0.3s;

    &.clickable {
      cursor: pointer;
      &:hover { background: #ff9900; color: white; transform: rotate(15deg); }
      &:active { transform: scale(0.9); }
    }

    &.is-loading {
      .el-icon { animation: rotating 2s linear infinite; }
    }
  }
  
  .card-title {
    font-weight: 800;
    font-size: 16px;
    color: var(--el-text-color-primary);
  }
}

.more-btn {
  font-size: 13px;
  font-weight: 600;
}

.tips-container {
  display: flex;
  flex-direction: column;
}

.tip-row {
  display: flex;
  align-items: center;
  padding: 16px 0;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-light);
  transition: all 0.2s;
  animation: slideIn 0.5s ease-out forwards;
  opacity: 0;

  &:last-child { border-bottom: none; }
  &:active { background-color: #fcfcfc; }

  .tip-badge {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-right: 14px;
    flex-shrink: 0;
    
    &.high { background: var(--el-color-danger); box-shadow: 0 0 8px var(--el-color-danger); }
    &.medium { background: var(--el-color-warning); }
    &.low { background: var(--el-color-info); }
  }

  .tip-body {
    flex: 1;
    overflow: hidden;
  }

  .tip-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    
    .tip-tag {
      font-size: 10px;
      font-weight: 800;
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
      padding: 1px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    
    .tip-date {
      font-size: 11px;
      color: var(--el-text-color-secondary);
    }
  }

  .tip-subject {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tip-arrow {
    font-size: 14px;
    color: var(--el-border-color);
    margin-left: 10px;
  }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(10px); }
  to { opacity: 1; transform: translateX(0); }
}

.empty-state {
  padding: 20px 0;
}
</style>
