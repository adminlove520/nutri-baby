<template>
  <div class="growth-page">
    <el-card class="header-card">
      <div class="page-header">
        <h2>📈 成长记录</h2>
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon> 添加记录
        </el-button>
      </div>
    </el-card>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="8">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-label">当前身高</div>
            <div class="stat-value">{{ latestHeight || '--' }} <span class="unit">cm</span></div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-label">当前体重</div>
            <div class="stat-value">{{ latestWeight || '--' }} <span class="unit">kg</span></div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-label">记录次数</div>
            <div class="stat-value">{{ records.length }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 成长曲线 -->
    <el-card class="chart-card">
      <template #header>
        <span>📊 成长趋势</span>
      </template>
      <div ref="chartRef" class="chart-container"></div>
    </el-card>

    <!-- 记录列表 -->
    <el-card class="records-card">
      <template #header>
        <span>📋 历史记录</span>
      </template>
      <el-table :data="records" stripe>
        <el-table-column prop="time" label="日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.time) }}
          </template>
        </el-table-column>
        <el-table-column prop="height" label="身高(cm)" width="100" />
        <el-table-column prop="weight" label="体重(kg)" width="100" />
        <el-table-column prop="headCircumference" label="头围(cm)" width="100" />
        <el-table-column prop="note" label="备注" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" @click="editRecord(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog v-model="showAddDialog" :title="editingRecord ? '编辑记录' : '添加记录'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="日期">
          <el-date-picker v-model="form.time" type="date" placeholder="选择日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="身高(cm)">
          <el-input-number v-model="form.height" :min="0" :max="200" :precision="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="体重(kg)">
          <el-input-number v-model="form.weight" :min="0" :max="50" :precision="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="头围(cm)">
          <el-input-number v-model="form.headCircumference" :min="0" :max="60" :precision="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.note" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useBabyStore } from '@/stores/baby'
import { getGrowthRecords, createGrowthRecord } from '@/api/record'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const babyStore = useBabyStore()
const chartRef = ref<HTMLElement>()
const records = ref<any[]>([])
const showAddDialog = ref(false)
const editingRecord = ref<any>(null)

const form = ref({
  time: new Date(),
  height: null as number | null,
  weight: null as number | null,
  headCircumference: null as number | null,
  note: ''
})

const latestHeight = computed(() => records.value[0]?.height || null)
const latestWeight = computed(() => records.value[0]?.weight || null)

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD')

const loadRecords = async () => {
  if (!babyStore.currentBaby?.id) return
  try {
    records.value = await getGrowthRecords(babyStore.currentBaby.id)
    await nextTick()
    renderChart()
  } catch (e) {
    ElMessage.error('加载记录失败')
  }
}

const renderChart = () => {
  if (!chartRef.value || records.value.length === 0) return
  
  const chart = echarts.init(chartRef.value)
  const sortedRecords = [...records.value].reverse()
  
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['身高', '体重'], bottom: 0 },
    xAxis: {
      type: 'category',
      data: sortedRecords.map(r => formatDate(r.time))
    },
    yAxis: [
      { type: 'value', name: '身高(cm)', min: 40, max: 120 },
      { type: 'value', name: '体重(kg)', min: 0, max: 30 }
    ],
    series: [
      {
        name: '身高',
        type: 'line',
        data: sortedRecords.map(r => r.height),
        smooth: true,
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '体重',
        type: 'line',
        yAxisIndex: 1,
        data: sortedRecords.map(r => r.weight),
        smooth: true,
        itemStyle: { color: '#67C23A' }
      }
    ]
  }
  chart.setOption(option)
}

const editRecord = (row: any) => {
  editingRecord.value = row
  form.value = {
    time: new Date(row.time),
    height: row.height,
    weight: row.weight,
    headCircumference: row.headCircumference,
    note: row.note || ''
  }
  showAddDialog.value = true
}

const submitForm = async () => {
  if (!babyStore.currentBaby?.id) return
  try {
    await createGrowthRecord({
      babyId: babyStore.currentBaby.id,
      time: new Date(form.value.time).getTime(),
      height: form.value.height,
      weight: form.value.weight,
      headCircumference: form.value.headCircumference,
      note: form.value.note
    })
    ElMessage.success(editingRecord.value ? '更新成功' : '添加成功')
    showAddDialog.value = false
    loadRecords()
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

onMounted(loadRecords)
</script>

<style scoped lang="scss">
.growth-page {
  padding: 16px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h2 {
    margin: 0;
    font-size: 18px;
    color: #303133;
  }
}

.stats-row {
  margin: 16px 0;
}

.stat-card {
  .stat-content {
    text-align: center;
    padding: 8px 0;
  }
  
  .stat-label {
    font-size: 13px;
    color: #909399;
    margin-bottom: 8px;
  }
  
  .stat-value {
    font-size: 28px;
    font-weight: bold;
    color: #303133;
    
    .unit {
      font-size: 14px;
      font-weight: normal;
      color: #909399;
    }
  }
}

.chart-card {
  margin-bottom: 16px;
}

.chart-container {
  height: 250px;
}

.records-card {
  margin-bottom: 16px;
}
</style>
