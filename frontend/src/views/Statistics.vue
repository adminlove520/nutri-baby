<template>
  <div class="statistics-page">
    <div class="page-header">
      <div class="header-left">
        <h2 class="title">成长洞察</h2>
        <p class="subtitle">通过数据可视化，掌握宝宝发育动态</p>
      </div>
      <el-select v-model="range" size="large" class="range-select" effect="light">
        <el-option label="最近 7 天" value="7" />
        <el-option label="最近 30 天" value="30" />
        <el-option label="最近 90 天" value="90" />
      </el-select>
    </div>

    <div v-loading="loading" class="stats-content">
      <!-- Summary Info Cards -->
      <el-row :gutter="16" class="summary-grid">
         <el-col :xs="12" :sm="6">
            <div class="summary-card c1">
               <div class="val">{{ summary.avgFeeding }}<small>ml</small></div>
               <div class="lab">日均奶量</div>
            </div>
         </el-col>
         <el-col :xs="12" :sm="6">
            <div class="summary-card c2">
               <div class="val">{{ summary.avgSleep }}<small>h</small></div>
               <div class="lab">日均睡眠</div>
            </div>
         </el-col>
         <el-col :xs="12" :sm="6">
            <div class="summary-card c3">
               <div class="val">{{ summary.weightGain > 0 ? '+' : '' }}{{ summary.weightGain }}<small>kg</small></div>
               <div class="lab">体重增长</div>
            </div>
         </el-col>
         <el-col :xs="12" :sm="6">
            <div class="summary-card c4">
               <div class="val">{{ summary.heightGain > 0 ? '+' : '' }}{{ summary.heightGain }}<small>cm</small></div>
               <div class="lab">身高增长</div>
            </div>
         </el-col>
      </el-row>

      <!-- Feeding & Sleep Charts -->
      <el-row :gutter="20" class="chart-row">
        <el-col :xs="24" :md="12">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span class="card-title"><div class="dot d1"></div> 奶量摄入趋势</span>
              </div>
            </template>
            <div class="chart-container">
               <v-chart class="chart" :option="feedingChartOption" autoresize />
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span class="card-title"><div class="dot d2"></div> 每日睡眠时长</span>
              </div>
            </template>
            <div class="chart-container">
               <v-chart class="chart" :option="sleepChartOption" autoresize />
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- Growth Curves -->
      <el-card class="chart-card growth-main-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title"><div class="dot d3"></div> WHO 生长基准对比</span>
            <div class="header-right">
              <el-radio-group v-model="growthMode" size="small" class="custom-radio">
                <el-radio-button label="height">身高曲线</el-radio-button>
                <el-radio-button label="weight">体重曲线</el-radio-button>
              </el-radio-group>
            </div>
          </div>
        </template>
        <div class="chart-container tall">
           <v-chart class="chart" :option="growthChartOption" autoresize />
        </div>
        <div class="growth-tip">
           <el-icon><InfoFilled /></el-icon>
           <span>虚线为 WHO 标准中位数，阴影区域为 P3-P97 正常发育范围。</span>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, reactive } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import VChart from 'vue-echarts'
import client from '@/api/client'
import { useBabyStore } from '@/stores/baby'
import { ElMessage } from 'element-plus'

// Echarts imports
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components'

use([CanvasRenderer, BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent])

const babyStore = useBabyStore()
const loading = ref(false)
const range = ref('7')
const growthMode = ref('height')

const chartData = reactive({
  feeding: [] as any[],
  sleep: [] as any[],
  growth: [] as any[],
  standards: [] as any[]
})

const summary = reactive({
  avgFeeding: 0,
  avgSleep: 0,
  weightGain: 0,
  heightGain: 0
})

const fetchData = async () => {
  if (!babyStore.currentBaby?.id) return

  loading.value = true
  try {
    const res: any = await client.get('/statistics/charts', {
      params: { babyId: babyStore.currentBaby.id, range: range.value }
    })
    
    chartData.feeding = res.feeding
    chartData.sleep = res.sleep
    chartData.growth = res.growth
    chartData.standards = res.standards

    // Stats Calculation
    if (chartData.feeding.length > 0) {
      const feedingSum = chartData.feeding.reduce((acc, curr) => acc + curr.amount, 0)
      summary.avgFeeding = Math.round(feedingSum / chartData.feeding.length)
    }
    
    if (chartData.sleep.length > 0) {
      const sleepSum = chartData.sleep.reduce((acc, curr) => acc + curr.hours, 0)
      summary.avgSleep = parseFloat((sleepSum / chartData.sleep.length).toFixed(1))
    }

    if (chartData.growth.length >= 2) {
       const sorted = [...chartData.growth].sort((a, b) => a.month - b.month)
       const first = sorted[0]
       const last = sorted[sorted.length - 1]
       summary.weightGain = parseFloat((last.weight - first.weight).toFixed(2))
       summary.heightGain = parseFloat((last.height - first.height).toFixed(1))
    } else {
       summary.weightGain = 0
       summary.heightGain = 0
    }
  } catch (e) {
    ElMessage.error('无法同步最新数据')
  } finally {
    loading.value = false
  }
}

const feedingChartOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { top: 20, left: 10, right: 10, bottom: 0, containLabel: true },
  xAxis: {
    type: 'category',
    data: chartData.feeding.map(i => i.date.split('-').slice(1).join('/')),
    axisLine: { lineStyle: { color: '#f0f0f0' } },
    axisLabel: { color: '#a4b0be', fontSize: 11 }
  },
  yAxis: { 
    type: 'value', 
    axisLabel: { color: '#a4b0be' }, 
    splitLine: { lineStyle: { type: 'dashed', color: '#f1f2f6' } } 
  },
  series: [{
    name: '奶量 (ml)',
    type: 'bar',
    data: chartData.feeding.map(i => i.amount),
    itemStyle: { 
      borderRadius: [6, 6, 0, 0],
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: '#ff8e94' }, { offset: 1, color: '#ffdee0' }]
      }
    },
    barWidth: '35%'
  }]
}))

const sleepChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { top: 20, left: 10, right: 10, bottom: 0, containLabel: true },
  xAxis: {
    type: 'category',
    data: chartData.sleep.map(i => i.date.split('-').slice(1).join('/')),
    axisLine: { lineStyle: { color: '#f0f0f0' } },
    axisLabel: { color: '#a4b0be', fontSize: 11 }
  },
  yAxis: { 
    type: 'value', 
    axisLabel: { color: '#a4b0be' }, 
    splitLine: { lineStyle: { type: 'dashed', color: '#f1f2f6' } } 
  },
  series: [{
    name: '睡眠 (h)',
    type: 'line',
    smooth: true,
    data: chartData.sleep.map(i => i.hours),
    itemStyle: { color: '#88d498' },
    lineStyle: { width: 3 },
    areaStyle: {
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: 'rgba(136, 212, 152, 0.25)' }, { offset: 1, color: 'rgba(136, 212, 152, 0)' }]
      }
    },
    symbol: 'circle',
    symbolSize: 8
  }]
}))

const growthChartOption = computed(() => {
  const isHeight = growthMode.value === 'height'
  const typeKey = isHeight ? 'height' : 'weight'
  const relevantStandards = chartData.standards.filter(s => s.type === typeKey)
  
  const maxMonthInRecord = chartData.growth.length > 0 ? Math.max(...chartData.growth.map(i => i.month)) : 0
  const months = Array.from({ length: Math.max(maxMonthInRecord + 2, 7) }, (_, i) => i)

  return {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 10, icon: 'roundRect', textStyle: { color: '#57606f', fontWeight: 600 } },
    grid: { top: 30, left: 10, right: 20, bottom: 60, containLabel: true },
    xAxis: {
      type: 'category',
      name: '月龄',
      data: months,
      axisLabel: { color: '#a4b0be', fontSize: 11 },
      axisLine: { lineStyle: { color: '#f0f0f0' } }
    },
    yAxis: { 
      type: 'value', 
      scale: true, 
      name: isHeight ? 'cm' : 'kg',
      axisLabel: { color: '#a4b0be' },
      splitLine: { lineStyle: { type: 'dashed', color: '#f1f2f6' } }
    },
    series: [
      {
        name: 'WHO 标准 (P50)',
        type: 'line',
        smooth: true,
        data: months.map(m => relevantStandards.find(s => s.month === m)?.p50),
        lineStyle: { type: 'dashed', width: 2, color: '#ced6e0' },
        symbol: 'none',
        z: 1
      },
      {
        name: '参考发育区间 (P3-P97)',
        type: 'line',
        stack: 'range',
        smooth: true,
        data: months.map(m => relevantStandards.find(s => s.month === m)?.p3),
        lineStyle: { opacity: 0 },
        symbol: 'none',
        areaStyle: { color: 'rgba(164, 176, 190, 0.1)' },
        z: 0
      },
      {
        name: 'Upper Range',
        type: 'line',
        stack: 'range',
        smooth: true,
        data: months.map(m => {
           const s = relevantStandards.find(st => st.month === m)
           return s ? (s.p97 - s.p3) : null
        }),
        lineStyle: { opacity: 0 },
        symbol: 'none',
        areaStyle: { color: 'rgba(164, 176, 190, 0.1)' },
        z: 0
      },
      {
        name: '宝宝实测数据',
        type: 'line',
        smooth: true,
        data: months.map(m => {
           const record = chartData.growth.find(r => r.month === m)
           return record ? (isHeight ? record.height : record.weight) : null
        }),
        itemStyle: { color: isHeight ? '#ff8e94' : '#ffd077' },
        symbol: 'circle',
        symbolSize: 10,
        lineStyle: { width: 5, shadowBlur: 10, shadowColor: isHeight ? 'rgba(255, 142, 148, 0.3)' : 'rgba(255, 208, 119, 0.3)' },
        connectNulls: true,
        z: 10
      }
    ]
  }
})

onMounted(fetchData)
watch([range, () => babyStore.currentBaby?.id], fetchData)
</script>

<style scoped lang="scss">
.statistics-page { padding: 10px 16px 40px; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
  
  .title { font-size: 26px; font-weight: 900; color: var(--el-text-color-primary); margin: 0 0 4px; }
  .subtitle { font-size: 14px; color: var(--el-text-color-secondary); font-weight: 500; }
  .range-select { width: 140px; :deep(.el-input__wrapper) { border-radius: 12px; } }
}

.summary-grid {
  margin-bottom: 24px;
}

.summary-card {
  background: white;
  padding: 24px 16px;
  border-radius: 24px;
  text-align: center;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.02);
  margin-bottom: 16px;
  border: 1px solid var(--el-border-color-lighter);
  
  .val { font-size: 22px; font-weight: 900; margin-bottom: 4px; display: block; small { font-size: 12px; margin-left: 2px; opacity: 0.7; } }
  .lab { font-size: 11px; color: var(--el-text-color-secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  
  &.c1 .val { color: var(--el-color-primary); }
  &.c2 .val { color: var(--el-color-success); }
  &.c3 .val { color: var(--el-color-warning); }
  &.c4 .val { color: #409eff; }
}

.chart-card {
  margin-bottom: 24px;
  border-radius: 24px !important;
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .card-title { font-weight: 800; font-size: 16px; display: flex; align-items: center; gap: 10px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; &.d1 { background: var(--el-color-primary); } &.d2 { background: var(--el-color-success); } &.d3 { background: var(--el-color-warning); } }
  }
}

.chart-container {
  height: 280px;
  &.tall { height: 420px; }
}

.chart { width: 100%; height: 100%; }

.growth-main-card {
  margin-top: 10px;
}

.custom-radio {
  :deep(.el-radio-button__inner) { border-radius: 10px; border: none; background: #f1f2f6; margin-left: 4px; }
  :deep(.el-radio-button:first-child .el-radio-button__inner) { border-radius: 10px; border-left: none; }
  :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) { background: var(--el-color-primary); box-shadow: 0 4px 12px rgba(255, 142, 148, 0.3); }
}

.growth-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 12px 16px;
  background: #f9fbfc;
  border-radius: 14px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  .el-icon { font-size: 16px; color: var(--el-color-info); }
}
</style>
