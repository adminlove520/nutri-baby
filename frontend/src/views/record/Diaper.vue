<template>
  <div class="record-page diaper-page">
    <div class="page-header">
      <el-button link :icon="Back" @click="router.back()">返回</el-button>
      <h2 class="title">记录尿布</h2>
    </div>

    <el-card class="form-card" shadow="hover">
       <el-form label-position="top">
          <el-form-item label="尿布状态">
             <div class="diaper-selector-new">
                <div 
                   v-for="item in diaperTypes" 
                   :key="item.value" 
                   class="diaper-card" 
                   :class="[item.value, { active: form.type === item.value }]"
                   @click="form.type = item.value"
                >
                   <div class="icon-blob">{{ item.emoji }}</div>
                   <div class="info">
                      <span class="name">{{ item.label }}</span>
                      <span class="desc">{{ item.desc }}</span>
                   </div>
                   <div class="selection-indicator">
                      <el-icon><Check /></el-icon>
                   </div>
                </div>
             </div>
          </el-form-item>

          <el-divider v-if="form.type === 'poop' || form.type === 'both'" />

          <div v-if="form.type === 'poop' || form.type === 'both'" class="poop-details">
             <el-form-item label="便便颜色">
                <div class="color-picker">
                   <div 
                      v-for="c in colors" 
                      :key="c" 
                      class="color-dot" 
                      :style="{ backgroundColor: c }"
                      :class="{ active: form.poopColor === c }"
                      @click="form.poopColor = c"
                   ></div>
                </div>
             </el-form-item>
             <el-form-item label="便便质地">
                <el-radio-group v-model="form.poopTexture" size="small">
                   <el-radio-button label="soft">软</el-radio-button>
                   <el-radio-button label="watery">稀</el-radio-button>
                   <el-radio-button label="hard">硬</el-radio-button>
                   <el-radio-button label="normal">正常</el-radio-button>
                </el-radio-group>
             </el-form-item>
          </div>

          <el-divider />

          <el-form-item label="记录时间">
             <el-date-picker v-model="form.time" type="datetime" style="width: 100%" :editable="false" />
          </el-form-item>

          <el-form-item label="备注">
             <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="有什么异常吗？" />
          </el-form-item>

          <div class="submit-wrapper">
             <el-button type="primary" size="large" round class="submit-btn" :loading="loading" @click="saveRecord">保存记录</el-button>
          </div>
       </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Back, Check } from '@element-plus/icons-vue'
import { useRecordStore } from '@/stores/record'
import { useBabyStore } from '@/stores/baby'
import { ElMessage } from 'element-plus'

const router = useRouter()
const recordStore = useRecordStore()
const babyStore = useBabyStore()

const loading = ref(false)
const form = reactive({
    type: 'pee',
    poopColor: '#F4D03F',
    poopTexture: 'normal',
    time: new Date(),
    remark: ''
})

const diaperTypes = [
    { value: 'pee', label: '嘘嘘', desc: '单纯排尿', emoji: '💧' },
    { value: 'poop', label: '臭臭', desc: '排便记录', emoji: '💩' },
    { value: 'both', label: '都有', desc: '嘘嘘+臭臭', emoji: '🌟' },
    { value: 'dry', label: '干爽', desc: '检查/更换', emoji: '☁️' }
]

const colors = ['#F4D03F', '#D35400', '#229954', '#7D6608', '#5D6D7E']

const saveRecord = async () => {
  if (!babyStore.currentBaby?.id) return ElMessage.warning('请选择宝宝')

  loading.value = true
  try {
    await recordStore.addRecord({
        babyId: babyStore.currentBaby.id,
        modelType: 'diaper',
        ...form,
        time: form.time.toISOString()
    })
    ElMessage.success('已保存尿布记录')
    router.back()
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.diaper-page { max-width: 500px; margin: 0 auto; }
.page-header { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 24px; .title { font-size: clamp(16px, 4vw, 20px); font-weight: 800; color: #2c3e50; } }

.diaper-selector-new {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    
    .diaper-card {
        background: #f9fbfc;
        border: 2px solid transparent;
        border-radius: 20px;
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
        overflow: hidden;

        .icon-blob {
            width: 44px;
            height: 44px;
            background: white;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.02);
        }

        .info {
            display: flex;
            flex-direction: column;
            .name { font-size: 15px; font-weight: 800; color: var(--el-text-color-primary); }
            .desc { font-size: 11px; color: var(--el-text-color-secondary); font-weight: 500; }
        }

        .selection-indicator {
            position: absolute;
            top: 6px;
            right: 6px;
            font-size: 12px;
            color: var(--el-color-primary);
            opacity: 0;
            transform: scale(0.5);
            transition: all 0.3s;
        }
        
        &.active {
            background: white;
            border-color: var(--el-color-primary);
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(255, 142, 148, 0.1);
            
            .selection-indicator { opacity: 1; transform: scale(1); }
            .icon-blob { background: var(--el-color-primary-light-9); }
        }
    }
}

.color-picker {
    display: flex;
    gap: 12px;
    .color-dot {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        border: 3px solid transparent;
        transition: transform 0.2s;
        &.active { transform: scale(1.2); border-color: #eee; }
    }
}

.submit-wrapper { margin-top: 40px; .submit-btn { width: 100%; height: 50px; font-weight: bold; } }
</style>
