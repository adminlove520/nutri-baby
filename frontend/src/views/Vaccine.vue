<template>
  <div class="vaccine-page">
    <el-card class="header-card">
      <div class="page-header">
        <h2>💉 疫苗管理</h2>
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon> 添加疫苗
        </el-button>
      </div>
    </el-card>

    <!-- 统计概览 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="8">
        <el-card class="stat-card completed">
          <div class="stat-content">
            <div class="stat-value">{{ completedCount }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="stat-card pending">
          <div class="stat-content">
            <div class="stat-value">{{ pendingCount }}</div>
            <div class="stat-label">待接种</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="stat-card overdue">
          <div class="stat-content">
            <div class="stat-value">{{ overdueCount }}</div>
            <div class="stat-label">已逾期</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 疫苗列表 -->
    <el-card class="vaccine-list-card">
      <template #header>
        <span>📋 疫苗接种计划</span>
      </template>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="全部" name="all">
          <el-table :data="schedules" stripe>
            <el-table-column prop="vaccineName" label="疫苗名称" width="150" />
            <el-table-column prop="doseNumber" label="剂次" width="80" />
            <el-table-column prop="vaccinationStatus" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.vaccinationStatus)">
                  {{ getStatusText(row.vaccinationStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="scheduledDate" label="计划日期" width="120">
              <template #default="{ row }">
                {{ row.scheduledDate ? formatDate(row.scheduledDate) : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="vaccineDate" label="实际日期" width="120">
              <template #default="{ row }">
                {{ row.vaccineDate ? formatDate(row.vaccineDate) : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="hospital" label="接种医院" />
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button size="small" @click="editVaccine(row)">详情</el-button>
                <el-button v-if="row.vaccinationStatus !== 'completed'" size="small" type="success" @click="markCompleted(row)">完成</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="待接种" name="pending">
          <el-table :data="pendingSchedules" stripe>
            <el-table-column prop="vaccineName" label="疫苗名称" width="150" />
            <el-table-column prop="doseNumber" label="剂次" width="80" />
            <el-table-column prop="scheduledDate" label="计划日期" width="120">
              <template #default="{ row }">
                {{ row.scheduledDate ? formatDate(row.scheduledDate) : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button size="small" type="success" @click="markCompleted(row)">完成</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="已完成" name="completed">
          <el-table :data="completedSchedules" stripe>
            <el-table-column prop="vaccineName" label="疫苗名称" width="150" />
            <el-table-column prop="doseNumber" label="剂次" width="80" />
            <el-table-column prop="vaccineDate" label="接种日期" width="120">
              <template #default="{ row }">
                {{ row.vaccineDate ? formatDate(row.vaccineDate) : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="hospital" label="接种医院" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 完成接种对话框 -->
    <el-dialog v-model="showCompletedDialog" title="完成接种" width="500px">
      <el-form :model="completeForm" label-width="100px">
        <el-form-item label="接种日期">
          <el-date-picker v-model="completeForm.vaccineDate" type="date" style="width: 100%" />
        </el-form-item>
        <el-form-item label="接种医院">
          <el-input v-model="completeForm.hospital" placeholder="请输入医院名称" />
        </el-form-item>
        <el-form-item label="批号">
          <el-input v-model="completeForm.batchNumber" placeholder="疫苗批号" />
        </el-form-item>
        <el-form-item label="医生">
          <el-input v-model="completeForm.doctor" placeholder="接种医生" />
        </el-form-item>
        <el-form-item label="不良反应">
          <el-select v-model="completeForm.reaction" placeholder="请选择" style="width: 100%">
            <el-option label="无" value="none" />
            <el-option label="轻微" value="mild" />
            <el-option label="明显" value="obvious" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="completeForm.note" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCompletedDialog = false">取消</el-button>
        <el-button type="primary" @click="submitComplete">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBabyStore } from '@/stores/baby'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const babyStore = useBabyStore()
const activeTab = ref('all')
const showAddDialog = ref(false)
const showCompletedDialog = ref(false)
const editingVaccine = ref<any>(null)

// 示例数据（实际应从API获取）
const schedules = ref<any[]>([
  { id: 1, vaccineName: '乙肝疫苗', doseNumber: 1, vaccinationStatus: 'completed', scheduledDate: '2024-01-15', vaccineDate: '2024-01-15', hospital: '市妇幼保健院' },
  { id: 2, vaccineName: '卡介苗', doseNumber: 1, vaccinationStatus: 'completed', scheduledDate: '2024-01-20', vaccineDate: '2024-01-20', hospital: '市妇幼保健院' },
  { id: 3, vaccineName: '脊灰疫苗', doseNumber: 1, vaccinationStatus: 'pending', scheduledDate: '2024-03-15', hospital: '' },
  { id: 4, vaccineName: '百白破疫苗', doseNumber: 1, vaccinationStatus: 'pending', scheduledDate: '2024-04-15', hospital: '' },
])

const completedCount = computed(() => schedules.value.filter(s => s.vaccinationStatus === 'completed').length)
const pendingCount = computed(() => schedules.value.filter(s => s.vaccinationStatus === 'pending').length)
const overdueCount = computed(() => {
  const now = dayjs().format('YYYY-MM-DD')
  return schedules.value.filter(s => s.vaccinationStatus === 'pending' && s.scheduledDate < now).length
})
const pendingSchedules = computed(() => schedules.value.filter(s => s.vaccinationStatus === 'pending'))
const completedSchedules = computed(() => schedules.value.filter(s => s.vaccinationStatus === 'completed'))

const completeForm = ref({
  vaccineDate: new Date(),
  hospital: '',
  batchNumber: '',
  doctor: '',
  reaction: 'none',
  note: ''
})

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD')

const getStatusType = (status: string) => {
  switch (status) {
    case 'completed': return 'success'
    case 'pending': return 'warning'
    case 'skipped': return 'info'
    default: return ''
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'completed': return '已完成'
    case 'pending': return '待接种'
    case 'skipped': return '已跳过'
    default: return status
  }
}

const editVaccine = (row: any) => {
  editingVaccine.value = row
}

const markCompleted = (row: any) => {
  editingVaccine.value = row
  completeForm.value = {
    vaccineDate: new Date(),
    hospital: '',
    batchNumber: '',
    doctor: '',
    reaction: 'none',
    note: ''
  }
  showCompletedDialog.value = true
}

const submitComplete = async () => {
  ElMessage.success('接种记录已保存')
  showCompletedDialog.value = false
}
</script>

<style scoped lang="scss">
.vaccine-page {
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
  
  .stat-value {
    font-size: 32px;
    font-weight: bold;
  }
  
  .stat-label {
    font-size: 13px;
    color: #909399;
    margin-top: 4px;
  }
  
  &.completed .stat-value { color: #67C23A; }
  &.pending .stat-value { color: #E6A23C; }
  &.overdue .stat-value { color: #F56C6C; }
}

.vaccine-list-card {
  margin-bottom: 16px;
}
</style>
