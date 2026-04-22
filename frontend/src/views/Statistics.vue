<template>
  <div class="statistics-page">
    <div class="page-header">
      <div class="header-left">
        <h2 class="title">数据统计</h2>
        <p class="subtitle">洞察宝宝的成长趋势</p>
      </div>
      <el-select v-model="range" size="large" class="range-select">
        <el-option label="最近 7 天" value="7" />
        <el-option label="最近 30 天" value="30" />
        <el-option label="最近 90 天" value="90" />
      </el-select>
    </div>

    <div v-loading="loading" class="stats-content">
      <!-- Feeding & Sleep -->
      <el-row :gutter="24">
        <el-col :xs="24" :md="12">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span class="card-title"><el-icon><Mug /></el-icon> 奶量趋势</span>
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
                <span class="card-title"><el-icon><Moon /></el-icon> 睡眠趋势</span>
              </div>
            </template>
            <div class="chart-container">
               <v-chart class="chart" :option="sleepChartOption" autoresize />
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- Growth -->
      <el-card class="chart-card growth-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title"><el-icon><TrendCharts /></el-icon> 生长曲线</span>
            <div class="header-right">
              <el-radio-group v-model="growthMode" size="small">
                <el-radio-button label="height">身高</el-radio-button>
                <el-radio-button label="weight">体重</el-radio-button>
              </el-radio-group>
            </div>
          </div>
        </template>
        <div class="chart-container tall">
           <v-chart class="chart" :option="growthChartOption" autoresize />
        </div>
      </el-card>

      <!-- Summary Info -->
      <div class="section-title">本周期汇总</div>
      <el-row :gutter="24" class="summary-row">
         <el-col :xs="12" :sm="6">
            <div class="summary-item">
               <div class="val">{{ summary.avgFeeding }} ml</div>
               <div class="lab">日均奶量</div>
            </div>
         </el-col>
         <el-col :xs="12" :sm="6">
            <div class="summary-item">
               <div class="val">{{ summary.avgSleep }} h</div>
               <div class="lab">日均睡眠</div>
            </div>
         </el-col>
         <el-col :xs="12" :sm="6">
            <div class="summary-item">
               <div class="val">{{ summary.weightGain }} kg</div>
               <div class="lab">体重增长</div>
            </div>
         </el-col>
         <el-col :xs="12" :sm="6">
            <div class="summary-item">
               <div class="val">{{ summary.heightGain }} cm</div>
               <div class="lab">身高增长</div>
            </div>
         </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, reactive } from 'vue'
import { Mug, Moon, TrendCharts } from '@element-plus/icons-vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import axios from 'axios'
import { useBabyStore } from '@/stores/baby'
import { ElMessage } from 'element-plus'

use([CanvasRenderer, BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent])

const babyStore = useBabyStore()
const loading = ref(false)
const range = ref('7')
const growthMode = ref('height')

const chartData = reactive({
  feeding: [] as any[],
  sleep: [] as any[],
  growth: [] as any[]
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
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/statistics/charts', {
      params: { babyId: babyStore.currentBaby.id, range: range.value },
      headers: { Authorization: `Bearer ${token}` }
    })
    
    chartData.feeding = res.data.feeding
    chartData.sleep = res.data.sleep
    chartData.growth = res.data.growth

    // Calculate Summary
    const feedingSum = chartData.feeding.reduce((acc, curr) => acc + curr.amount, 0)
    summary.avgFeeding = Math.round(feedingSum / parseInt(range.value))
    
    const sleepSum = chartData.sleep.reduce((acc, curr) => acc + curr.hours, 0)
    summary.avgSleep = parseFloat((sleepSum / parseInt(range.value)).toFixed(1))

    if (chartData.growth.length >= 2) {
       const first = chartData.growth[0]
       const last = chartData.growth[chartData.growth.length - 1]
       summary.weightGain = parseFloat((last.weight - first.weight).toFixed(2))
       summary.heightGain = parseFloat((last.height - first.height).toFixed(1))
    } else {
       summary.weightGain = 0
       summary.heightGain = 0
    }

  } catch (e) {
    console.error(e)
    ElMessage.error('无法加载统计数据')
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
    axisLabel: { color: '#909399', fontSize: 11 }
  },
  yAxis: { type: 'value', axisLabel: { color: '#909399' }, splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } } },
  series: [{
    name: '奶量 (ml)',
    type: 'bar',
    data: chartData.feeding.map(i => i.amount),
    itemStyle: { 
      borderRadius: [4, 4, 0, 0],
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: '#ffb1b5' }, { offset: 1, color: '#ff8e94' }]
      }
    },
    barWidth: '40%'
  }]
}))

const sleepChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { top: 20, left: 10, right: 10, bottom: 0, containLabel: true },
  xAxis: {
    type: 'category',
    data: chartData.sleep.map(i => i.date.split('-').slice(1).join('/')),
    axisLabel: { color: '#909399', fontSize: 11 }
  },
  yAxis: { type: 'value', axisLabel: { color: '#909399' }, splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } } },
  series: [{
    name: '睡眠 (h)',
    type: 'line',
    smooth: true,
    data: chartData.sleep.map(i => i.hours),
    itemStyle: { color: '#88d498' },
    areaStyle: {
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: 'rgba(136, 212, 152, 0.3)' }, { offset: 1, color: 'rgba(136, 212, 152, 0)' }]
      }
    },
    symbolSize: 6
  }]
}))

const growthChartOption = computed(() => {
  const isHeight = growthMode.value === 'height'
  return {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    grid: { top: 40, left: 10, right: 10, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: chartData.growth.map(i => i.date),
      axisLabel: { color: '#909399', fontSize: 11 }
    },
    yAxis: { type: 'value', axisLabel: { color: '#909399' }, scale: true },
    series: [{
      name: isHeight ? '身高 (cm)' : '体重 (kg)',
      type: 'line',
      smooth: true,
      data: chartData.growth.map(i => isHeight ? i.height : i.weight),
      itemStyle: { color: isHeight ? '#ff8e94' : '#ffd077' },
      symbolSize: 8,
      lineStyle: { width: 3 }
    }]
  }
})

onMounted(fetchData)
watch([range, () => babyStore.currentBaby?.id], fetchData)
</script>

<style scoped lang="scss">
.statistics-page {
  padding-bottom: 60px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 30px;
  
  .title { font-size: 24px; font-weight: 800; color: #2c3e50; margin-bottom: 4px; }
  .subtitle { font-size: 14px; color: #909399; }
  .range-select { width: 130px; }
}

.chart-card {
  margin-bottom: 24px;
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .card-title { font-weight: 700; display: flex; align-items: center; gap: 8px; }
  }
}

.chart-container {
  height: 260px;
  &.tall { height: 360px; }
}

.chart { width: 100%; height: 100%; }

.summary-row {
  margin-top: 16px;
}

.summary-item {
   background: #fff;
   padding: 20px 10px;
   border-radius: 16px;
   text-align: center;
   box-shadow: var(--card-shadow);
   margin-bottom: 16px;
   
   .val { font-size: 18px; font-weight: 800; color: var(--el-color-primary); margin-bottom: 4px; }
   .lab { font-size: 12px; color: #909399; }
}
</style>
