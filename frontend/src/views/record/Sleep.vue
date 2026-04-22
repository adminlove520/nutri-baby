<template>
  <div class="record-page sleep-page">
    <div class="page-header">
      <el-button link :icon="Back" @click="router.back()">返回</el-button>
      <h2 class="title">记录睡眠</h2>
    </div>

    <el-card class="form-card" shadow="hover">
       <div class="timer-box">
          <div class="status-label">{{ timerRunning ? '正在睡觉...' : '点击开始记录睡眠' }}</div>
          <div class="timer-display">{{ formattedTime }}</div>
          <div class="timer-actions">
             <el-button 
               v-if="!timerRunning" 
               type="success" 
               size="large" 
               round
               :icon="VideoPlay"
               @click="startTimer" 
             >开始睡眠</el-button>
             <el-button 
               v-else 
               type="danger" 
               size="large" 
               round
               :icon="VideoPause" 
               @click="stopTimer" 
             >结束睡眠</el-button>
          </div>
       </div>

       <el-form label-position="top">
          <el-form-item label="睡眠类型">
             <el-radio-group v-model="form.type" class="full-radio">
                <el-radio-button label="nap">白刻小睡</el-radio-button>
                <el-radio-button label="night">夜晚长觉</el-radio-button>
             </el-radio-group>
          </el-form-item>

          <el-row :gutter="20">
             <el-col :span="12">
                <el-form-item label="开始时间">
                   <el-date-picker v-model="form.startTime" type="datetime" style="width: 100%" :editable="false" />
                </el-form-item>
             </el-col>
             <el-col :span="12">
                <el-form-item label="结束时间">
                   <el-date-picker v-model="form.endTime" type="datetime" style="width: 100%" :editable="false" />
                </el-form-item>
             </el-col>
          </el-row>

          <el-form-item label="睡眠时长 (分钟)">
             <el-input-number v-model="form.duration" :min="0" :step="10" controls-position="right" class="full-width" />
          </el-form-item>

          <el-form-item label="备注">
             <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="睡眠质量如何？" />
          </el-form-item>

          <div class="submit-wrapper">
             <el-button type="primary" size="large" round class="submit-btn" :loading="loading" @click="saveRecord">保存记录</el-button>
          </div>
       </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Back, VideoPlay, VideoPause } from '@element-plus/icons-vue'
import { useRecordStore } from '@/stores/record'
import { useBabyStore } from '@/stores/baby'
import { ElMessage } from 'element-plus'

const router = useRouter()
const recordStore = useRecordStore()
const babyStore = useBabyStore()

const loading = ref(false)
const form = reactive({
    type: 'nap',
    startTime: new Date(),
    endTime: new Date(),
    duration: 0,
    remark: ''
})

// Timer
const timerRunning = ref(false)
const elapsedSeconds = ref(0)
let timerInterval: any = null

const formattedTime = computed(() => {
  const h = Math.floor(elapsedSeconds.value / 3600).toString().padStart(2, '0')
  const m = Math.floor((elapsedSeconds.value % 3600) / 60).toString().padStart(2, '0')
  const s = (elapsedSeconds.value % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
})

const startTimer = () => {
  timerRunning.value = true
  form.startTime = new Date()
  const start = Date.now()
  timerInterval = setInterval(() => {
    elapsedSeconds.value = Math.floor((Date.now() - start) / 1000)
  }, 1000)
}

const stopTimer = () => {
  clearInterval(timerInterval)
  timerRunning.value = false
  form.endTime = new Date()
  form.duration = Math.ceil(elapsedSeconds.value / 60)
}

onUnmounted(() => clearInterval(timerInterval))

// Watcher to sync duration if start/end time changes manually
watch(() => [form.startTime, form.endTime], () => {
    if (!timerRunning.value && form.endTime && form.startTime) {
        const diff = form.endTime.getTime() - form.startTime.getTime()
        if (diff > 0) form.duration = Math.floor(diff / 60000)
    }
})

const saveRecord = async () => {
  if (!babyStore.currentBaby?.id) return ElMessage.warning('请选择宝宝')
  if (form.duration <= 0) return ElMessage.warning('请输入有效的睡眠时长')

  loading.value = true
  try {
    await recordStore.addRecord({
        babyId: babyStore.currentBaby.id,
        modelType: 'sleep',
        ...form,
        time: form.startTime.toISOString(),
        startTime: form.startTime.toISOString(),
        endTime: form.endTime.toISOString()
    })
    ElMessage.success('已保存睡眠记录')
    router.back()
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.sleep-page { max-width: 500px; margin: 0 auto; }
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; .title { font-size: 20px; font-weight: 800; color: #2c3e50; } }

.timer-box {
    background: #f0f9eb;
    border-radius: 20px;
    padding: 30px;
    text-align: center;
    margin-bottom: 30px;
    
    .status-label { font-size: 14px; color: #67c23a; margin-bottom: 12px; font-weight: bold; }
    .timer-display { font-size: 48px; font-family: monospace; font-weight: 800; color: #67c23a; margin-bottom: 24px; }
}

.full-radio {
    width: 100%;
    display: flex;
    :deep(.el-radio-button) { flex: 1; .el-radio-button__inner { width: 100%; } }
}
.full-width { width: 100%; }
.submit-wrapper { margin-top: 40px; .submit-btn { width: 100%; height: 50px; font-weight: bold; } }
</style>
