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
              <div class="percentile-tag" v-if="growthPercentile">
                 {{ growthMode === 'height' ? '身高' : '体重' }}百分位: <strong>{{ growthPercentile }}</strong>
              </div>
              <el-button type="primary" size="small" round class="mr-12" @click="growthDialogVisible = true">记录成长</el-button>
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

      <!-- Growth Album -->
      <el-card class="chart-card album-card" shadow="hover" v-if="albumRecords.length > 0">
        <template #header>
          <div class="card-header">
            <span class="card-title"><div class="dot d4"></div> 成长相册</span>
          </div>
        </template>
        <div class="album-grid">
           <div v-for="item in albumRecords" :key="item.date" class="album-item">
              <el-image :src="item.imageUrl" fit="cover" class="album-img" :preview-src-list="[item.imageUrl]">
                 <template #error>
                    <div class="image-slot"><el-icon><Picture /></el-icon></div>
                 </template>
              </el-image>
              <div class="album-info">
                 <div class="album-date">{{ item.date }}</div>
                 <div class="album-growth">{{ item.height }}cm / {{ item.weight }}kg</div>
              </div>
           </div>
        </div>
      </el-card>

      <!-- Growth Album -->
      ...
      </el-card>

      <!-- Health & Medication Logs -->
      <el-row :gutter="20" class="logs-row">
        <el-col :xs="24" :sm="12">
           <el-card class="chart-card log-card" shadow="hover">
              <template #header>
                 <div class="card-header">
                    <span class="card-title"><div class="dot d1"></div> 最近用药</span>
                 </div>
              </template>
              <div v-if="chartData.medication.length === 0" class="empty-log">暂无用药记录</div>
              <ul v-else class="log-list">
                 <li v-for="(item, index) in chartData.medication.slice().reverse().slice(0, 5)" :key="index">
                    <span class="log-date">{{ item.date }}</span>
                    <span class="log-content">{{ item.name }} ({{ item.dosage }})</span>
                 </li>
              </ul>
           </el-card>
        </el-col>
        <el-col :xs="24" :sm="12">
           <el-card class="chart-card log-card" shadow="hover">
              <template #header>
                 <div class="card-header">
                    <span class="card-title"><div class="dot d2"></div> 健康监测</span>
                 </div>
              </template>
              <div v-if="chartData.health.length === 0" class="empty-log">暂无健康记录</div>
              <ul v-else class="log-list">
                 <li v-for="(item, index) in chartData.health.slice().reverse().slice(0, 5)" :key="index">
                    <span class="log-date">{{ item.date }}</span>
                    <span class="log-content">
                       <el-tag size="small" :type="item.type === 'TEMP' ? 'danger' : 'success'" effect="plain">{{ item.type }}</el-tag>
                       {{ item.value }}{{ item.type === 'TEMP' ? '°C' : '' }}
                       <span v-if="item.symptoms" class="symptom-text">({{ item.symptoms }})</span>
                    </span>
                 </li>
              </ul>
           </el-card>
        </el-col>
      </el-row>

      <!-- Growth Entry Dialog -->
      <el-dialog v-model="growthDialogVisible" title="记录成长数据" width="90%" class="rounded-dialog">
        <el-form :model="growthForm" label-position="top">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="身高 (cm)">
                <el-input v-model="growthForm.height" type="number" placeholder="0.0" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="体重 (kg)">
                <el-input v-model="growthForm.weight" type="number" placeholder="0.0" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="头围 (cm)">
            <el-input v-model="growthForm.headCircumference" type="number" placeholder="0.0" />
          </el-form-item>
          <el-form-item label="记录日期">
            <el-date-picker v-model="growthForm.time" type="date" style="width: 100%" />
          </el-form-item>
          <el-form-item label="上传照片">
            <el-upload
              class="growth-uploader"
              action="/api/upload"
              :show-file-list="false"
              :on-success="handleUploadSuccess"
              :before-upload="beforeUpload"
              :http-request="customUpload"
            >
              <img v-if="growthForm.imageUrl" :src="growthForm.imageUrl" class="uploaded-img" />
              <el-icon v-else class="uploader-icon"><Plus /></el-icon>
            </el-upload>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="growthForm.note" type="textarea" placeholder="记录宝宝这几天的趣事或变化" />
          </el-form-item>
        </el-form>
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="growthDialogVisible = false" round>取消</el-button>
            <el-button type="primary" @click="submitGrowth" :loading="submitting" round>提交记录</el-button>
          </div>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, reactive } from 'vue'
import { InfoFilled, Picture, Plus } from '@element-plus/icons-vue'
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
const growthDialogVisible = ref(false)
const submitting = ref(false)

const growthForm = reactive({
  height: '',
  weight: '',
  headCircumference: '',
  time: new Date().toISOString(),
  imageUrl: '',
  note: ''
})

const beforeUpload = (file: File) => {
  const isImg = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 5
  if (!isImg) ElMessage.error('只能上传图片!')
  if (!isLt2M) ElMessage.error('图片大小不能超过 5MB!')
  return isImg && isLt2M
}

const customUpload = async (options: any) => {
  const { file } = options
  try {
    const res: any = await client.post(`/upload?filename=${file.name}`, file, {
      headers: { 'Content-Type': file.type }
    })
    growthForm.imageUrl = res.url
  } catch (e) {
    ElMessage.error('图片上传失败')
  }
}

const handleUploadSuccess = (res: any) => {
  // Not used if customUpload is defined, but here for reference
}

const submitGrowth = async () => {
  if (!babyStore.currentBaby?.id) return
  if (!growthForm.height && !growthForm.weight) {
    return ElMessage.warning('请输入身高或体重')
  }

  submitting.value = true
  try {
    await client.post('/record/growth', {
      babyId: babyStore.currentBaby.id,
      ...growthForm
    })
    ElMessage.success('成长记录已添加')
    growthDialogVisible.value = false
    // Reset form
    growthForm.height = ''
    growthForm.weight = ''
    growthForm.headCircumference = ''
    growthForm.imageUrl = ''
    growthForm.note = ''
    fetchData()
  } catch (e) {
  } finally {
    submitting.value = false
  }
}

const chartData = reactive({
  feeding: [] as any[],
  sleep: [] as any[],
  growth: [] as any[],
  medication: [] as any[],
  health: [] as any[],
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
    chartData.medication = res.medication || []
    chartData.health = res.health || []
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

const growthPercentile = computed(() => {
  if (chartData.growth.length === 0 || chartData.standards.length === 0) return null
  
  const latest = chartData.growth[chartData.growth.length - 1]
  const isHeight = growthMode.value === 'height'
  const val = isHeight ? latest.height : latest.weight
  const typeKey = isHeight ? 'height' : 'weight'
  
  if (!val) return null
  
  const standard = chartData.standards.find(s => s.month === latest.month && s.type === typeKey)
  if (!standard) return null
  
  if (val < standard.p3) return '低于 P3'
  if (val < standard.p15) return 'P3 - P15'
  if (val < standard.p50) return 'P15 - P50'
  if (val < standard.p85) return 'P50 - P85'
  if (val < standard.p97) return 'P85 - P97'
  return '高于 P97'
})

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

const albumRecords = computed(() => {
  return chartData.growth.filter(r => r.imageUrl).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
    .dot { width: 8px; height: 8px; border-radius: 50%; &.d1 { background: var(--el-color-primary); } &.d2 { background: var(--el-color-success); } &.d3 { background: var(--el-color-warning); } &.d4 { background: #409eff; } }
  }
}

.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  padding: 10px 0;
}

.album-item {
  background: #f9fbfc;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s;
  &:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.05); }
}

.album-img {
  width: 100%;
  height: 140px;
  display: block;
}

.album-info {
  padding: 10px;
  text-align: center;
  .album-date { font-size: 11px; font-weight: 700; color: var(--el-text-color-secondary); margin-bottom: 2px; }
  .album-growth { font-size: 13px; font-weight: 800; color: var(--el-text-color-primary); }
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-placeholder);
  font-size: 30px;
}

.chart-container {
  height: 280px;
  &.tall { height: 420px; }
}

.chart { width: 100%; height: 100%; }

.logs-row { margin-bottom: 24px; }

.log-list {
  list-style: none;
  padding: 0;
  margin: 0;
  li {
    padding: 12px 0;
    border-bottom: 1px solid #f5f6f7;
    display: flex;
    justify-content: space-between;
    align-items: center;
    &:last-child { border-bottom: none; }
  }
  .log-date { font-size: 11px; font-weight: 700; color: var(--el-text-color-secondary); }
  .log-content { font-size: 13px; font-weight: 800; color: var(--el-text-color-primary); display: flex; align-items: center; gap: 8px; }
  .symptom-text { font-size: 11px; font-weight: normal; color: var(--el-text-color-placeholder); }
}

.empty-log {
  text-align: center;
  padding: 30px 0;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}

.percentile-tag {
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  margin-right: 12px;
  strong { margin-left: 4px; color: var(--el-color-primary); }
}

.growth-uploader {
  :deep(.el-upload) {
    border: 1px dashed var(--el-border-color);
    border-radius: 12px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: var(--el-transition-duration-fast);
    width: 100px;
    height: 100px;
    &:hover { border-color: var(--el-color-primary); }
  }
}

.uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  text-align: center;
  line-height: 100px;
}

.uploaded-img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  display: block;
}

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
