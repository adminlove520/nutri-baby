<template>
  <div class="record-page growth-page">
    <div class="page-header">
      <el-button link :icon="Back" @click="router.back()">返回</el-button>
      <h2 class="title">记录生长</h2>
    </div>

    <el-card class="form-card" shadow="hover">
       <el-form label-position="top">
          <el-form-item label="身高 (cm)">
             <el-input-number v-model="form.height" :min="0" :step="0.1" precision="1" controls-position="right" class="full-width" />
          </el-form-item>

          <el-form-item label="体重 (kg)">
             <el-input-number v-model="form.weight" :min="0" :step="0.01" precision="2" controls-position="right" class="full-width" />
          </el-form-item>

          <el-form-item label="头围 (cm)">
             <el-input-number v-model="form.headCircumference" :min="0" :step="0.1" precision="1" controls-position="right" class="full-width" />
          </el-form-item>

          <el-divider />

          <el-form-item label="记录时间">
             <el-date-picker v-model="form.time" type="date" style="width: 100%" :editable="false" />
          </el-form-item>

          <el-form-item label="备注">
             <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="宝宝长得真快！" />
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
import { Back } from '@element-plus/icons-vue'
import { useRecordStore } from '@/stores/record'
import { useBabyStore } from '@/stores/baby'
import { ElMessage } from 'element-plus'

const router = useRouter()
const recordStore = useRecordStore()
const babyStore = useBabyStore()

const loading = ref(false)
const form = reactive({
    height: 50.0,
    weight: 3.50,
    headCircumference: 35.0,
    time: new Date(),
    remark: ''
})

const saveRecord = async () => {
  if (!babyStore.currentBaby?.id) return ElMessage.warning('请选择宝宝')

  loading.value = true
  try {
    await recordStore.addRecord({
        babyId: babyStore.currentBaby.id,
        type: 'growth',
        time: form.time.toISOString(),
        ...form
    })
    ElMessage.success('已保存生长记录')
    router.back()
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.growth-page { max-width: 500px; margin: 0 auto; }
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; .title { font-size: 20px; font-weight: 800; color: #2c3e50; } }
.full-width { width: 100%; }
.submit-wrapper { margin-top: 40px; .submit-btn { width: 100%; height: 50px; font-weight: bold; } }
</style>
