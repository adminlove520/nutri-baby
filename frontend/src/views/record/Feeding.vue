<template>
  <div class="record-page feeding-page">
    <div class="page-header">
      <el-button link :icon="Back" @click="router.back()">返回</el-button>
      <h2 class="title">添加喂养记录</h2>
    </div>

    <el-card class="form-card" shadow="hover">
      <div class="type-selector">
        <div 
          v-for="item in types" 
          :key="item.name" 
          class="type-item" 
          :class="{ active: feedingType === item.name }"
          @click="feedingType = item.name"
        >
          <div class="icon-box" :style="{ backgroundColor: item.color }">
             <el-icon :size="24"><component :is="item.icon" /></el-icon>
          </div>
          <span>{{ item.label }}</span>
        </div>
      </div>

      <el-form label-position="top" class="record-form">
        <!-- Breast Feeding -->
        <div v-if="feedingType === 'breast'" class="form-section">
           <el-form-item label="喂养位置">
             <el-radio-group v-model="breastForm.side" size="large" class="full-radio">
               <el-radio-button label="left">左侧</el-radio-button>
               <el-radio-button label="right">右侧</el-radio-button>
               <el-radio-button label="both">双侧</el-radio-button>
             </el-radio-group>
           </el-form-item>

           <div class="timer-box">
              <div class="timer-display">{{ formattedTime }}</div>
              <div class="timer-actions">
                 <el-button 
                   v-if="!timerRunning" 
                   type="primary" 
                   size="large" 
                   circle 
                   :icon="VideoPlay"
                   @click="startTimer" 
                 />
                 <el-button 
                   v-else 
                   type="danger" 
                   size="large" 
                   circle 
                   :icon="VideoPause" 
                   @click="stopTimer" 
                 />
              </div>
           </div>

           <el-row :gutter="20">
             <el-col :span="12">
               <el-form-item label="左侧时长 (min)">
                 <el-input-number v-model="breastForm.leftBreastMinutes" :min="0" :step="1" controls-position="right" class="full-width" />
               </el-form-item>
             </el-col>
             <el-col :span="12">
               <el-form-item label="右侧时长 (min)">
                 <el-input-number v-model="breastForm.rightBreastMinutes" :min="0" :step="1" controls-position="right" class="full-width" />
               </el-form-item>
             </el-col>
           </el-row>
        </div>

        <!-- Bottle Feeding -->
        <div v-if="feedingType === 'bottle'" class="form-section">
           <el-form-item label="乳液类型">
             <el-radio-group v-model="bottleForm.milkType" class="full-radio">
               <el-radio-button label="formula">奶粉</el-radio-button>
               <el-radio-button label="breastmilk">母乳</el-radio-button>
             </el-radio-group>
           </el-form-item>
           
           <el-form-item label="喂奶量 (ml)">
              <el-input-number v-model="bottleForm.amount" :min="0" :step="10" controls-position="right" class="full-width" />
           </el-form-item>
        </div>

        <!-- Solids -->
        <div v-if="feedingType === 'food'" class="form-section">
           <el-form-item label="食物名称">
             <el-input v-model="foodForm.foodName" placeholder="例如：苹果泥、米粉" />
           </el-form-item>
        </div>

        <el-divider />

        <el-form-item label="记录时间">
          <el-date-picker
            v-model="recordTime"
            type="datetime"
            placeholder="选择日期时间"
            style="width: 100%"
            :editable="false"
            :clearable="false"
          />
        </el-form-item>
        
        <el-form-item label="备注">
          <el-input v-model="remark" type="textarea" :rows="2" placeholder="记录宝宝的反应..." />
        </el-form-item>

        <div class="submit-wrapper">
          <el-button type="primary" size="large" round class="submit-btn" :loading="loading" @click="saveRecord">保存记录</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Back, VideoPlay, VideoPause, Mug, Pouring, KnifeFork } from '@element-plus/icons-vue'
import { useRecordStore } from '@/stores/record'
import { useBabyStore } from '@/stores/baby'
import { ElMessage } from 'element-plus'

const router = useRouter()
const recordStore = useRecordStore()
const babyStore = useBabyStore()

const feedingType = ref<any>('breast')
const recordTime = ref(new Date())
const remark = ref('')
const loading = ref(false)

const types = [
    { name: 'breast', label: '母乳', icon: Mug, color: '#ff8e94' },
    { name: 'bottle', label: '瓶喂', icon: Pouring, color: '#88d498' },
    { name: 'food', label: '辅食', icon: KnifeFork, color: '#ffd077' }
]

// Forms
const breastForm = reactive({
  side: 'left' as 'left' | 'right' | 'both',
  leftBreastMinutes: 0,
  rightBreastMinutes: 0
})

const bottleForm = reactive({
  milkType: 'formula',
  amount: 100
})

const foodForm = reactive({
  foodName: ''
})

// Timer
const timerRunning = ref(false)
const elapsedSeconds = ref(0)
let timerInterval: any = null

const formattedTime = computed(() => {
  const m = Math.floor(elapsedSeconds.value / 60).toString().padStart(2, '0')
  const s = (elapsedSeconds.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

const startTimer = () => {
  timerRunning.value = true
  const start = Date.now() - elapsedSeconds.value * 1000
  timerInterval = setInterval(() => {
    elapsedSeconds.value = Math.floor((Date.now() - start) / 1000)
  }, 1000)
}

const stopTimer = () => {
  clearInterval(timerInterval)
  timerRunning.value = false
  const mins = Math.ceil(elapsedSeconds.value / 60)
  if (breastForm.side === 'left') breastForm.leftBreastMinutes += mins
  else if (breastForm.side === 'right') breastForm.rightBreastMinutes += mins
  else {
      breastForm.leftBreastMinutes += Math.ceil(mins / 2)
      breastForm.rightBreastMinutes += Math.ceil(mins / 2)
  }
}

onUnmounted(() => clearInterval(timerInterval))

const saveRecord = async () => {
  if (!babyStore.currentBaby?.id) return ElMessage.warning('请选择宝宝')

  loading.value = true
  try {
    const payload: any = {
        babyId: babyStore.currentBaby.id,
        type: feedingType.value,
        time: recordTime.value.toISOString(),
        remark: remark.value
    }

    if (feedingType.value === 'breast') Object.assign(payload, breastForm)
    else if (feedingType.value === 'bottle') Object.assign(payload, bottleForm)
    else Object.assign(payload, foodForm)

    await recordStore.addRecord(payload)
    ElMessage.success('已保存记录')
    router.back()
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.record-page {
  max-width: 500px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  .title { font-size: 20px; font-weight: 800; color: #2c3e50; }
}

.type-selector {
    display: flex;
    justify-content: space-around;
    margin-bottom: 30px;
    
    .type-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        opacity: 0.5;
        transition: all 0.3s;
        
        &.active {
            opacity: 1;
            transform: scale(1.1);
            span { font-weight: bold; color: #2c3e50; }
        }
        
        .icon-box {
            width: 56px;
            height: 56px;
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        span { font-size: 14px; color: #909399; }
    }
}

.timer-box {
    background: #fcfcfc;
    border: 1px dashed var(--el-color-primary-light-7);
    border-radius: 20px;
    padding: 24px;
    text-align: center;
    margin: 20px 0 30px;
    
    .timer-display {
        font-size: 48px;
        font-family: 'Courier New', Courier, monospace;
        font-weight: 800;
        color: var(--el-color-primary);
        margin-bottom: 16px;
    }
}

.full-radio {
    width: 100%;
    display: flex;
    :deep(.el-radio-button) {
        flex: 1;
        .el-radio-button__inner { width: 100%; }
    }
}

.full-width { width: 100%; }

.submit-wrapper {
    margin-top: 40px;
    .submit-btn { width: 100%; height: 50px; font-weight: bold; }
}
</style>
