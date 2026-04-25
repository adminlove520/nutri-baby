<template>
  <div class="vaccine-page" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <h2 class="title">疫苗接种管家</h2>
        <p class="subtitle">让每一次接种都准时、安心</p>
      </div>
      <el-button type="primary" round size="large" @click="fetchVaccines" :icon="Refresh" class="refresh-btn">
        刷新计划
      </el-button>
    </div>

    <!-- Stats Row -->
    <el-row :gutter="16" class="stats-row mb-24">
       <el-col :span="8">
          <div class="mini-stat-card c1">
             <div class="val">{{ completed.length }}</div>
             <div class="lab">已接种</div>
          </div>
       </el-col>
       <el-col :span="8">
          <div class="mini-stat-card c2">
             <div class="val">{{ upcoming.length }}</div>
             <div class="lab">待接种</div>
          </div>
       </el-col>
       <el-col :span="8">
          <div class="mini-stat-card c3">
             <div class="val">{{ nextVaccineDate }}</div>
             <div class="lab">下次预计</div>
          </div>
       </el-col>
    </el-row>

    <el-tabs v-model="activeTab" class="custom-tabs glass-tabs">
      <el-tab-pane label="接种清单" name="list">
        <div class="vaccine-list">
           <!-- AI Plan Section -->
           <div class="ai-plan-section mb-24">
              <el-card class="ai-plan-card" shadow="hover">
                 <div class="ai-header">
                    <div class="title">✨ AI 接种疫苗推荐</div>
                    <el-button size="small" round @click="generateAiPlan" :loading="aiPlanLoading">智能推荐</el-button>
                 </div>
                 <div class="ai-plan-content">
                    <div v-if="!aiPlan" class="plan-placeholder">
                       点击"智能推荐"，根据 2021 国家免疫规划标准及宝宝情况为您推荐近期疫苗
                    </div>
                    <div v-else class="plan-text markdown-body" v-html="aiPlan"></div>
                 </div>
              </el-card>
           </div>

           <!-- Stats Row -->
           <el-row :gutter="12" class="stats-row mb-16">
              <el-col :xs="8" :sm="8">
                 <div class="mini-stat-card c1">
                    <div class="val">{{ completed.length }}</div>
                    <div class="lab">已接种</div>
                 </div>
              </el-col>
              <el-col :xs="8" :sm="8">
                 <div class="mini-stat-card c2">
                    <div class="val">{{ upcoming.length }}</div>
                    <div class="lab">待接种</div>
                 </div>
              </el-col>
              <el-col :xs="8" :sm="8">
                 <div class="mini-stat-card c3">
                    <div class="val">{{ nextVaccineName || nextVaccineDate }}</div>
                    <div class="lab">下次预计</div>
                 </div>
              </el-col>
           </el-row>

           <!-- Nearby Hospitals Section -->
           <div class="nearby-hospitals mb-20">
              <div class="section-header">
                 <div class="section-title">🏥 附近接种点</div>
                 <el-button link type="primary" :icon="Refresh" @click="searchNearbyHospitals" :loading="mapLoading" size="small">重新搜索</el-button>
              </div>
              <div class="hospital-list" v-loading="mapLoading">
                 <el-empty v-if="hospitals.length === 0 && !mapLoading" description="未找到附近的接种点" :image-size="60" />
                 <div v-for="h in hospitals" :key="h.id" class="hospital-item" @click="openMap(h)">
                    <div class="h-info">
                       <div class="h-name">{{ h.name }}</div>
                       <div class="h-address">{{ h.address }}</div>
                       <div class="h-distance" v-if="h.distance">{{ (h.distance / 1000).toFixed(1) }}km</div>
                    </div>
                    <el-button type="primary" size="small" circle :icon="ArrowRight" />
                 </div>
              </div>
           </div>

           <div class="section-header">
              <div class="section-title">即将接种</div>
              <el-tag round effect="light" type="warning" size="small">{{ upcoming.length }} 个待办</el-tag>
           </div>
           
           <el-empty v-if="upcoming.length === 0" description="恭喜！近一个月内没有待接种的疫苗" :image-size="60" />
           
           <div class="upcoming-grid">
              <el-card v-for="v in upcoming" :key="v.id" class="vaccine-card upcoming" shadow="hover">
                <div class="v-card-top">
                   <div class="v-icon-box">
                      <el-icon><FirstAidKit /></el-icon>
                   </div>
                   <div class="v-main-info">
                      <div class="v-name">{{ v.vaccineName }}
                        <span class="v-dose" v-if="v.doseNumber">第{{ v.doseNumber }}针</span>
                      </div>
                      <div class="v-tags">
                         <el-tag size="small" :type="v.isRequired ? 'danger' : 'info'" effect="dark" round>
                           {{ v.isRequired ? '免费' : '自费' }}
                         </el-tag>
                         <span class="v-age">{{ formatAge(v.ageInMonths) }}</span>
                         <el-tag v-if="isNew(v.scheduledDate)" type="danger" size="small" effect="dark" round class="new-tag">NEW</el-tag>
                      </div>
                   </div>
                   <div class="v-date-badge" :class="{ 'is-near': isNear(v.scheduledDate) }">
                      <div class="d-month">{{ getMonth(v.scheduledDate) }}</div>
                      <div class="d-day">{{ getDay(v.scheduledDate) }}</div>
                   </div>
                </div>
                
                <div class="v-card-body" v-if="v.targetDisease || v.description">
                   <p class="v-desc line-clamp">{{ v.targetDisease || v.description }}</p>
                </div>
                
                <div class="v-card-footer">
                   <el-button link type="primary" size="small" :icon="InfoFilled" @click="showWiki(v)">科普</el-button>
                   <el-button round type="primary" size="small" @click="openCompleteDialog(v)">确认接种</el-button>
                </div>
              </el-card>
           </div>

           <div class="section-header mt-24">
              <div class="section-title">已接种记录</div>
              <el-button size="small" round type="primary" :icon="Plus" @click="openAddDialog">添加记录</el-button>
           </div>
           
           <el-card class="completed-card" shadow="never">
              <el-empty v-if="completed.length === 0" description="暂无接种记录" :image-size="60" />
              <div v-else class="completed-list">
                 <div v-for="item in completed" :key="item.id" class="completed-item">
                    <div class="item-left">
                       <div class="item-name">{{ item.vaccineName }}
                         <span class="v-dose" v-if="item.doseNumber">第{{ item.doseNumber }}针</span>
                       </div>
                       <div class="item-meta">
                         <span class="item-date">{{ formatDate(item.vaccineDate) }}</span>
                         <span class="item-hospital" v-if="item.hospital">{{ item.hospital }}</span>
                       </div>
                    </div>
                    <div class="item-actions">
                       <el-button link type="primary" size="small" :icon="Edit" @click="openEditDialog(item)">编辑</el-button>
                       <el-button link type="danger" size="small" :icon="Delete" @click="deleteRecord(item)">删除</el-button>
                    </div>
                 </div>
              </div>
           </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="百科知识" name="wiki">
          <div class="vaccine-wiki">
             <div class="wiki-grid">
                <el-card v-for="item in wikiItems" :key="item.id" class="wiki-item-card" shadow="hover">
                   <div class="item-header">
                      <div class="item-icon">{{ item.icon }}</div>
                      <span class="item-title">{{ item.title }}</span>
                   </div>
                   <div class="item-body">{{ item.content }}</div>
                </el-card>
             </div>

             <div class="ai-wiki-section mt-40">
                <el-card class="ai-card premium" shadow="hover">
                   <div class="ai-header">
                      <div class="ai-brand">
                         <div class="ai-spark">✨</div>
                         <div class="ai-text">
                            <span class="main">AI 接种深度百科</span>
                            <span class="sub">基于最新《国家免疫规划》动态生成</span>
                         </div>
                      </div>
                      <el-button type="primary" size="small" round @click="generateAiKnowledge" :loading="aiLoading">智能优化</el-button>
                   </div>
                   <div class="ai-body">
                      <div v-if="!aiKnowledge" class="ai-placeholder">
                         <el-empty :image-size="80" description="点击「智能优化」开启专属百科" />
                      </div>
                      <div v-else class="markdown-body rich-text" v-html="aiKnowledge"></div>
                   </div>
                </el-card>
             </div>
          </div>
      </el-tab-pane>
    </el-tabs>

    <!-- Wiki Detail Dialog -->
    <el-dialog v-model="wikiVisible" :title="currentWiki.title" width="90%" class="rounded-dialog">
       <div class="wiki-detail">
          <div class="wiki-meta">
             <el-tag size="small">{{ currentWiki.type }}</el-tag>
             <span>月龄推荐:{{ currentWiki.age }}</span>
          </div>
          <div class="wiki-text" v-html="currentWiki.content"></div>
          <div class="wiki-tips" v-if="currentWiki.tips">
             <div class="tips-title">💡 接种贴士</div>
             <p>{{ currentWiki.tips }}</p>
          </div>
       </div>
    </el-dialog>

    <!-- Add/Edit Vaccine Record Dialog -->
    <el-dialog v-model="showRecordDialog" :title="isEditing ? '编辑接种记录' : '添加接种记录'" width="90%" class="rounded-dialog" destroy-on-close>
       <el-form :model="recordForm" label-position="top" class="vaccine-form">
          <el-form-item label="疫苗名称">
             <el-input v-model="recordForm.vaccineName" placeholder="请输入疫苗名称" />
          </el-form-item>
          <el-row :gutter="12">
             <el-col :span="12">
                <el-form-item label="剂次">
                   <el-input-number v-model="recordForm.doseNumber" :min="1" :max="10" placeholder="第几针" />
                </el-form-item>
             </el-col>
             <el-col :span="12">
                <el-form-item label="接种日期">
                   <el-date-picker v-model="recordForm.vaccineDate" type="date" placeholder="选择日期" style="width: 100%" />
                </el-form-item>
             </el-col>
          </el-row>
          <el-form-item label="接种医院">
             <el-input v-model="recordForm.hospital" placeholder="请输入医院名称" />
          </el-form-item>
          <el-row :gutter="12">
             <el-col :span="12">
                <el-form-item label="疫苗批号">
                   <el-input v-model="recordForm.batchNumber" placeholder="可选" />
                </el-form-item>
             </el-col>
             <el-col :span="12">
                <el-form-item label="接种医生">
                   <el-input v-model="recordForm.doctor" placeholder="可选" />
                </el-form-item>
             </el-col>
          </el-row>
          <el-form-item label="接种反应">
             <el-input v-model="recordForm.reaction" placeholder="如：无反应/轻微发热" />
          </el-form-item>
          <el-form-item label="备注">
             <el-input v-model="recordForm.note" type="textarea" placeholder="其他备注信息" :rows="2" />
          </el-form-item>
       </el-form>
       <template #footer>
          <el-button @click="showRecordDialog = false" round>取消</el-button>
          <el-button type="primary" @click="saveRecord" :loading="savingRecord" round>保存</el-button>
       </template>
    </el-dialog>

    <!-- Complete Vaccine Dialog -->
    <el-dialog v-model="showCompleteDialog" title="确认接种" width="90%" class="rounded-dialog" destroy-on-close>
       <p class="complete-tip">请确认宝宝已完成 <b>{{ currentVaccine?.vaccineName }}</b> 的接种</p>
       <el-form :model="completeForm" label-position="top" class="vaccine-form">
          <el-form-item label="接种日期">
             <el-date-picker v-model="completeForm.vaccineDate" type="date" placeholder="选择日期" style="width: 100%" />
          </el-form-item>
          <el-form-item label="接种医院">
             <el-input v-model="completeForm.hospital" placeholder="请输入医院名称" />
          </el-form-item>
          <el-row :gutter="12">
             <el-col :span="12">
                <el-form-item label="疫苗批号">
                   <el-input v-model="completeForm.batchNumber" placeholder="可选" />
                </el-form-item>
             </el-col>
             <el-col :span="12">
                <el-form-item label="接种医生">
                   <el-input v-model="completeForm.doctor" placeholder="可选" />
                </el-form-item>
             </el-col>
          </el-row>
          <el-form-item label="接种反应">
             <el-input v-model="completeForm.reaction" placeholder="如：无反应/轻微发热" />
          </el-form-item>
          <el-form-item label="备注">
             <el-input v-model="completeForm.note" type="textarea" placeholder="其他备注信息" :rows="2" />
          </el-form-item>
       </el-form>
       <template #footer>
          <el-button @click="showCompleteDialog = false" round>取消</el-button>
          <el-button type="primary" @click="confirmComplete" :loading="savingRecord" round>确认登记</el-button>
       </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive } from 'vue'
import { Refresh, FirstAidKit, Check, InfoFilled, Opportunity, ArrowRight, Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, ElMessageBox as MsgBox } from 'element-plus'
import { marked } from 'marked'
import client from '@/api/client'
import { useBabyStore } from '@/stores/baby'

// 配置 marked 选项
marked.setOptions({ breaks: true, gfm: true } as any)

const renderMarkdown = (text: string): string => {
    if (!text) return ''
    try {
        return marked.parse(text) as string
    } catch {
        return text.replace(/\n/g, '<br/>')
    }
}

const babyStore = useBabyStore()
const activeTab = ref('list')
const loading = ref(false)
const aiLoading = ref(false)
const vaccines = ref<any[]>([])
const aiKnowledge = ref('')
const aiPlan = ref('')
const aiPlanLoading = ref(false)
const hospitals = ref<any[]>([])
const mapLoading = ref(false)

// Dialog state
const showRecordDialog = ref(false)
const showCompleteDialog = ref(false)
const isEditing = ref(false)
const savingRecord = ref(false)
const currentVaccine = ref<any>(null)
const editingRecord = ref<any>(null)

const recordForm = reactive({
    vaccineName: '',
    doseNumber: 1,
    vaccineDate: new Date(),
    hospital: '',
    batchNumber: '',
    doctor: '',
    reaction: '',
    note: ''
})
const completeForm = reactive({
    vaccineDate: new Date(),
    hospital: '',
    batchNumber: '',
    doctor: '',
    reaction: '',
    note: ''
})

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || 'a38d9863a8019c9c922aeae63ca94ff4'
const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE || 'f2f710ee6896c3f9501bb5d128755a70'

const generateAiPlan = async () => {
    aiPlanLoading.value = true
    try {
        const baby = babyStore.currentBaby
        const birthStr = baby?.birthDate ? new Date(baby.birthDate).toLocaleDateString() : '未知'
        const res: any = await client.post('/ai/analyze', {
            babyId: baby?.id?.toString(),
            query: `请根据《国家免疫规划疫苗儿童免疫程序及说明(2021年版)》政策标准,结合宝宝出生日期(${birthStr})和当前月龄,推荐近期接种疫苗清单及接种建议。
            返回格式要求:
            1. 推荐接种的疫苗清单(包含:疫苗名称、推荐接种月龄、预防疾病)
            2. 相关疫苗接种的建议tips (包含:接种前准备、接种后护理等)
            请使用清晰美观的Markdown格式返回。`
        })
        // 合并 insight + recommendations 为完整 Markdown
        const parts = [res.insight || '']
        if (Array.isArray(res.recommendations) && res.recommendations.length > 0) {
            parts.push('\n\n**专家建议**\n' + res.recommendations.map((r: string) => `- ${r}`).join('\n'))
        }
        aiPlan.value = renderMarkdown(parts.join(''))
        ElMessage.success('AI 接种推荐已生成')
    } catch (e: any) {
        console.error('AI Plan Error:', e)
        ElMessage.error(e?.message || e?.response?.data?.message || '网络连接超时,请检查您的网络')
    } finally {
        aiPlanLoading.value = false
    }
}

// 搜索附近医院(先用精准定位,失败后用IP定位兜底)
const doSearch = (lng: number, lat: number) => {
    const AMap = (window as any).AMap
    AMap.plugin(['AMap.PlaceSearch'], () => {
        // 搜索医院
        const placeSearch = new AMap.PlaceSearch({
            type: '医疗卫生|医院',
            pageSize: 8,
            pageIndex: 1,
            extensions: 'all'
        })
        placeSearch.searchNearBy('医院', [lng, lat], 10000, (s: string, r: any) => {
            if (s === 'complete' && r.poiList?.pois?.length > 0) {
                mapLoading.value = false
                hospitals.value = r.poiList.pois
            } else {
                // 搜索诊所/卫生院
                const placeSearch2 = new AMap.PlaceSearch({
                    type: '诊所|卫生院|社区卫生服务站',
                    pageSize: 8,
                    pageIndex: 1,
                    extensions: 'all'
                })
                placeSearch2.searchNearBy('卫生', [lng, lat], 10000, (s2: string, r2: any) => {
                    if (s2 === 'complete' && r2.poiList?.pois?.length > 0) {
                        mapLoading.value = false
                        hospitals.value = r2.poiList.pois
                    } else {
                        // 搜索妇产医院/综合医院
                        const placeSearch3 = new AMap.PlaceSearch({
                            type: '妇产医院|综合医院',
                            pageSize: 8,
                            pageIndex: 1,
                            extensions: 'all'
                        })
                        placeSearch3.searchNearBy('', [lng, lat], 15000, (s3: string, r3: any) => {
                            mapLoading.value = false
                            if (s3 === 'complete' && r3.poiList?.pois?.length > 0) {
                                hospitals.value = r3.poiList.pois
                            } else {
                                hospitals.value = []
                                ElMessage.info('未找到附近接种点,建议前往当地社区卫生服务中心咨询')
                            }
                        })
                    }
                })
            }
        })
    })
}

const searchNearbyHospitals = () => {
    if (typeof (window as any).AMap === 'undefined') {
        loadAMap()
        return
    }

    mapLoading.value = true
    hospitals.value = []
    const AMap = (window as any).AMap

    // 优先GPS精准定位,失败后降级到IP城市级定位
    AMap.plugin(['AMap.Geolocation', 'AMap.CitySearch'], () => {
        const geolocation = new AMap.Geolocation({
            enableHighAccuracy: true,
            timeout: 8000,
            GeoLocationFirst: false,
            noIpLocate: 0,   // 0=允许IP定位兜底
            getCityWhenFail: true
        })

        geolocation.getCurrentPosition((status: string, result: any) => {
            if (status === 'complete') {
                // GPS定位成功
                doSearch(result.position.lng, result.position.lat)
            } else {
                // GPS失败 → 用IP定位获取城市中心坐标
                console.warn('[AMap] GPS失败,降级IP定位:', result?.info)
                const citySearch = new AMap.CitySearch()
                citySearch.getLocalCity((ipStatus: string, ipResult: any) => {
                    if (ipStatus === 'complete' && ipResult?.bounds) {
                        const center = ipResult.bounds.getCenter()
                        doSearch(center.lng, center.lat)
                        ElMessage.info(`已使用IP定位(${ipResult.city || '当前城市'}),结果可能不够精准`)
                    } else {
                        mapLoading.value = false
                        ElMessage.warning('定位失败,请允许浏览器访问位置信息后重试')
                    }
                })
            }
        })
    })
}

const loadAMap = () => {
    if ((window as any).AMap) {
        searchNearbyHospitals()
        return
    }

    // 设置高德地图安全密钥(JS API 2.0 必须在加载脚本前设置)
    if (AMAP_SECURITY_CODE) {
        (window as any)._AMapSecurityConfig = {
            securityJsCode: AMAP_SECURITY_CODE,
        }
    }

    mapLoading.value = true
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.Geolocation,AMap.PlaceSearch,AMap.CitySearch`
    script.onload = () => searchNearbyHospitals()
    script.onerror = () => {
        mapLoading.value = false
        ElMessage.error('地图加载失败,请检查网络')
    }
    document.head.appendChild(script)
}

const openMap = (h: any) => {
    const isPC = !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    if (isPC) {
        window.open(`https://www.amap.com/search?query=${encodeURIComponent(h.name)}`, '_blank')
    } else {
        window.location.href = `https://uri.amap.com/marker?position=${h.location.lng},${h.location.lat}&name=${encodeURIComponent(h.name)}`
    }
}

const wikiVisible = ref(false)
const currentWiki = reactive({
    title: '',
    type: '',
    age: '',
    content: '',
    tips: ''
})

const upcoming = computed(() => {
    const now = new Date()
    const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    return vaccines.value
        .filter(v => {
            if (v.vaccinationStatus !== 'pending') return false
            if (!v.scheduledDate) return false
            const scheduled = new Date(v.scheduledDate)
            // 只显示未来1个月内的
            return scheduled >= now && scheduled <= oneMonthLater
        })
        .sort((a, b) => {
            const dateA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0
            const dateB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0
            return dateA - dateB
        })
})

const completed = computed(() => {
    return vaccines.value
        .filter(v => v.vaccinationStatus === 'completed')
        .sort((a, b) => {
            const dateA = a.vaccineDate ? new Date(a.vaccineDate).getTime() : 0
            const dateB = b.vaccineDate ? new Date(b.vaccineDate).getTime() : 0
            return dateB - dateA
        })
})

const nextVaccineDate = computed(() => {
    if (upcoming.value.length === 0) return '无计划'
    if (!upcoming.value[0].scheduledDate) return '时间未定'
    const date = new Date(upcoming.value[0].scheduledDate)
    return `${date.getMonth() + 1}/${date.getDate()}`
})

const nextVaccineName = computed(() => {
    if (upcoming.value.length === 0) return ''
    const v = upcoming.value[0]
    return v.vaccineName + (v.doseNumber ? ` 第${v.doseNumber}针` : '')
})

const fetchVaccines = async () => {
    if (!babyStore.currentBaby?.id) {
        vaccines.value = []
        return
    }
    loading.value = true
    try {
        // Route: GET /api/baby/:babyId/vaccines → action=vaccines&babyId=:babyId
        const babyId = babyStore.currentBaby.id.toString()
        const res: any = await client.get(`/baby/${babyId}/vaccines`)
        vaccines.value = res
    } catch (e) {
        // Handled
    } finally {
        loading.value = false
    }
}

const openCompleteDialog = (v: any) => {
    currentVaccine.value = v
    completeForm.vaccineDate = new Date()
    completeForm.hospital = ''
    completeForm.batchNumber = ''
    completeForm.doctor = ''
    completeForm.reaction = ''
    completeForm.note = ''
    showCompleteDialog.value = true
}

const confirmComplete = async () => {
    if (!currentVaccine.value) return
    savingRecord.value = true
    try {
        const babyId = babyStore.currentBaby?.id?.toString()
        const res: any = await client.post(`/baby/${babyId}/vaccines`, {
            id: currentVaccine.value.id?.toString(),
            status: 'completed',
            vaccineDate: completeForm.vaccineDate ? new Date(completeForm.vaccineDate).toISOString() : new Date().toISOString(),
            hospital: completeForm.hospital,
            batchNumber: completeForm.batchNumber,
            doctor: completeForm.doctor,
            reaction: completeForm.reaction,
            note: completeForm.note
        })
        ElMessage.success('已登记接种记录')
        showCompleteDialog.value = false
        fetchVaccines()
    } catch (e: any) {
        ElMessage.error(e?.message || '登记失败')
    } finally {
        savingRecord.value = false
    }
}

const openAddDialog = () => {
    isEditing.value = false
    editingRecord.value = null
    recordForm.vaccineName = ''
    recordForm.doseNumber = 1
    recordForm.vaccineDate = new Date()
    recordForm.hospital = ''
    recordForm.batchNumber = ''
    recordForm.doctor = ''
    recordForm.reaction = ''
    recordForm.note = ''
    showRecordDialog.value = true
}

const openEditDialog = (item: any) => {
    isEditing.value = true
    editingRecord.value = item
    recordForm.vaccineName = item.vaccineName
    recordForm.doseNumber = item.doseNumber || 1
    recordForm.vaccineDate = item.vaccineDate ? new Date(item.vaccineDate) : new Date()
    recordForm.hospital = item.hospital || ''
    recordForm.batchNumber = item.batchNumber || ''
    recordForm.doctor = item.doctor || ''
    recordForm.reaction = item.reaction || ''
    recordForm.note = item.note || ''
    showRecordDialog.value = true
}

const saveRecord = async () => {
    if (!recordForm.vaccineName) {
        ElMessage.warning('请输入疫苗名称')
        return
    }
    savingRecord.value = true
    try {
        const babyId = babyStore.currentBaby?.id?.toString()
        const payload = {
            vaccineName: recordForm.vaccineName,
            doseNumber: recordForm.doseNumber,
            vaccineDate: recordForm.vaccineDate ? new Date(recordForm.vaccineDate).toISOString() : new Date().toISOString(),
            hospital: recordForm.hospital,
            batchNumber: recordForm.batchNumber,
            doctor: recordForm.doctor,
            reaction: recordForm.reaction,
            note: recordForm.note
        }
        if (isEditing.value && editingRecord.value) {
            // Update existing record
            await client.put(`/baby/${babyId}/vaccines/${editingRecord.value.id}`, payload)
            ElMessage.success('记录已更新')
        } else {
            // Create new record
            await client.post(`/baby/${babyId}/vaccines`, {
                ...payload,
                status: 'completed'
            })
            ElMessage.success('记录已添加')
        }
        showRecordDialog.value = false
        fetchVaccines()
    } catch (e: any) {
        ElMessage.error(e?.message || '保存失败')
    } finally {
        savingRecord.value = false
    }
}

const deleteRecord = async (item: any) => {
    try {
        await ElMessageBox.confirm(`确定要删除"${item.vaccineName}"这条接种记录吗?`, '删除确认', {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning',
            roundButton: true
        })
        const babyId = babyStore.currentBaby?.id?.toString()
        await client.delete(`/baby/${babyId}/vaccines/${item.id}`)
        ElMessage.success('记录已删除')
        fetchVaccines()
    } catch (e: any) {
        if (e !== 'cancel') ElMessage.error(e?.message || '删除失败')
    }
}

const formatAge = (months: number) => {
    if (!months && months !== 0) return '-'
    if (months === 0) return '出生时'
    if (months < 12) return `${months}月龄`
    const years = Math.floor(months / 12)
    const remain = months % 12
    return remain ? `${years}岁${remain}月` : `${years}岁`
}

const showWiki = (v: any) => {
    currentWiki.title = v.vaccineName
    currentWiki.type = v.isRequired ? '一类疫苗' : '二类疫苗'
    currentWiki.age = v.ageInMonths === 0 ? '出生' : v.ageInMonths + '个月'
    currentWiki.content = `【主要预防疾病】\n${v.targetDisease || '系统暂无记录'}\n\n【科普详情】\n${v.description || '该疫苗暂无详细科普信息。'}`
    currentWiki.tips = v.tips || (v.isRequired ? '这是国家强制接种的免费疫苗,请务必按时接种。' : '这是自费可选疫苗,建议根据医生指导和家庭情况选择。')
    wikiVisible.value = true
}

const generateAiKnowledge = async () => {
    aiLoading.value = true
    try {
        const res: any = await client.post('/ai/analyze', {
            babyId: babyStore.currentBaby?.id?.toString(),
            query: '请作为一名专业的儿科医生,提供一份疫苗接种百科知识,包括接种意义、常见反应及护理、注意事项等。如果宝宝信息存在,请针对宝宝月龄定制。请使用Markdown格式返回。'
        })
        // 合并 insight + recommendations 为完整 Markdown
        const parts = [res.insight || '']
        if (Array.isArray(res.recommendations) && res.recommendations.length > 0) {
            parts.push('\n\n## 接种建议\n' + res.recommendations.map((r: string) => `- ${r}`).join('\n'))
        }
        aiKnowledge.value = renderMarkdown(parts.join(''))
        ElMessage.success('知识库已优化')
    } catch (e: any) {
        console.error('AI Knowledge Error:', e)
        ElMessage.error(e?.message || e?.response?.data?.message || '网络连接超时,请检查您的网络')
    } finally {
        aiLoading.value = false
    }
}

const wikiItems = [
    { id: '1', icon: '💉', title: '什么是免费一类疫苗?', content: '国家免疫规划疫苗是政府免费提供的必选接种,包括乙肝、卡介苗、脊灰等。' },
    { id: '2', icon: '🌡️', title: '发热了还能打吗?', content: '建议推迟。发热、严重过敏、急性传染病等情况需在医生指导下缓种。' },
    { id: '3', icon: '⏰', title: '接种前要准备什么?', content: '携带证件,告知近期健康状况,确保宝宝皮肤清洁,衣着宽松方便露臂。' },
    { id: '4', icon: '👶', title: '打完后如何护理?', content: '留观30分钟,接种当天避免洗澡沾水,多喝温开水,保持充足休息。' }
]

const isNear = (dateStr: string) => {
    if (!dateStr) return false
    const diff = new Date(dateStr).getTime() - new Date().getTime()
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000 // Within 7 days
}

const isNew = (dateStr: string) => {
    if (!dateStr) return false
    const diff = new Date(dateStr).getTime() - new Date().getTime()
    // NEW标签：7天内即将接种
    return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000
}

const getMonth = (dateStr: string) => dateStr ? new Date(dateStr).getMonth() + 1 + '月' : '-'
const getDay = (dateStr: string) => dateStr ? new Date(dateStr).getDate() : '-'
const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return dateStr.split('T')[0]
}

onMounted(() => {
    fetchVaccines()
    loadAMap()
})
watch(() => babyStore.currentBaby?.id, fetchVaccines)
</script>

<style scoped lang="scss">
.vaccine-page { padding: 10px 16px 60px; max-width: 800px; margin: 0 auto; }

.page-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  .title { font-size: clamp(18px, 4vw, 22px); font-weight: 900; color: var(--el-text-color-primary); margin: 0; }
  .subtitle { font-size: clamp(11px, 2vw, 13px); color: var(--el-text-color-secondary); margin-top: 4px; }
}

.mini-stat-card {
    background: white;
    padding: 16px;
    border-radius: 20px;
    text-align: center;
    border: 1px solid var(--el-border-color-lighter);
    .val { font-size: 20px; font-weight: 900; color: var(--el-text-color-primary); }
    .lab { font-size: 11px; color: var(--el-text-color-secondary); margin-top: 4px; font-weight: 600; }
    &.c1 .val { color: var(--el-color-success); }
    &.c2 .val { color: var(--el-color-primary); }
    &.c3 .val { color: #409eff; }
}

.ai-plan-card {
    border-radius: 28px !important;
    background: linear-gradient(135deg, #fffcfc 0%, #fff5f5 100%);
    border: 1px solid var(--el-color-primary-light-8) !important;

    .ai-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        .title { font-weight: 900; color: var(--el-color-primary); font-size: 16px; }
    }

    .ai-plan-content {
        background: rgba(255, 255, 255, 0.6);
        border-radius: 16px;
        padding: 16px;
        min-height: 80px;

        .plan-placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--el-text-color-secondary);
            font-size: 13px;
            font-style: italic;
        }

        .plan-text {
            font-size: 13px;
            line-height: 1.8;
            color: var(--el-text-color-primary);
            :deep(table) {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                th, td { border: 1px solid var(--el-border-color-light); padding: 8px; text-align: left; }
                th { background: var(--el-color-primary-light-9); font-weight: 800; }
            }
        }
    }
}

.nearby-hospitals {
    .hospital-list {
        background: white;
        border-radius: 24px;
        padding: 10px;
        border: 1px solid var(--el-border-color-lighter);
    }
    .hospital-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid var(--el-border-color-extra-light);
        cursor: pointer;
        transition: background 0.2s;
        &:last-child { border-bottom: none; }
        &:hover { background: var(--el-fill-color-light); border-radius: 16px; }
        .h-name { font-weight: 800; font-size: 15px; color: var(--el-text-color-primary); margin-bottom: 4px; }
        .h-address { font-size: 12px; color: var(--el-text-color-secondary); }
        .h-distance { font-size: 11px; color: var(--el-color-primary); font-weight: 700; margin-top: 4px; }
    }
}

.upcoming-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.vaccine-card {
    border-radius: 24px !important;
    .v-card-top {
        display: flex;
        align-items: center;
        gap: 16px;
    }
    .v-icon-box {
        width: 44px; height: 44px;
        background: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
        border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px;
    }
    .v-main-info {
        flex: 1;
        .v-name { font-weight: 800; font-size: 16px; color: var(--el-text-color-primary); margin-bottom: 4px; }
        .v-tags { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--el-text-color-secondary); flex-wrap: wrap; }
        .new-tag { font-size: 10px; padding: 0 4px; font-weight: 900; letter-spacing: 1px; animation: pulse 1.5s infinite; }
    }
    .v-date-badge {
        text-align: center;
        min-width: 50px;
        padding: 6px;
        border-radius: 12px;
        background: var(--el-fill-color-light);
        .d-month { font-size: 10px; font-weight: 700; color: var(--el-text-color-secondary); }
        .d-day { font-size: 18px; font-weight: 900; color: var(--el-text-color-primary); }
        &.is-near { background: var(--el-color-primary-light-9); .d-month, .d-day { color: var(--el-color-primary); } }
    }
    .v-desc { font-size: 13px; color: var(--el-text-color-regular); line-height: 1.6; margin: 12px 0; }
    .line-clamp {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
    }
    .v-card-footer {
        display: flex; justify-content: space-between; align-items: center;
        border-top: 1px solid var(--el-border-color-extra-light);
        padding-top: 12px;
    }
}

.wiki-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    @media (max-width: 480px) {
        grid-template-columns: 1fr;
        gap: 10px;
    }
}

.wiki-item-card {
    border-radius: 20px !important;
    :deep(.el-card__body) { padding: 20px; }

    .item-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        .item-icon { font-size: 20px; }
        .item-title { font-weight: 800; font-size: 14px; color: var(--el-text-color-primary); }
    }

    .item-body { font-size: 12px; line-height: 1.6; color: var(--el-text-color-regular); }
}

.ai-card.premium {
    background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
    border: none !important;
    box-shadow: 0 15px 35px rgba(0,0,0,0.05) !important;

    .ai-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 20px;
        border-bottom: 1px dashed rgba(0,0,0,0.05);

        .ai-brand {
            display: flex;
            gap: 12px;
            .ai-spark { font-size: 24px; }
            .ai-text {
                display: flex;
                flex-direction: column;
                .main { font-size: 16px; font-weight: 900; color: #2c3e50; }
                .sub { font-size: 11px; color: #a4b0be; font-weight: 600; margin-top: 2px; }
            }
        }
    }

    .ai-body {
        padding-top: 20px;
        .rich-text {
            font-size: 14px;
            line-height: 2;
            color: #4b5563;
        }
    }
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    .section-title { font-size: 17px; font-weight: 800; color: var(--el-text-color-primary); }
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
}

.mb-24 { margin-bottom: 24px; }
.mb-16 { margin-bottom: 16px; }
.mb-20 { margin-bottom: 20px; }
.mb-32 { margin-bottom: 32px; }
.mt-24 { margin-top: 24px; }
.mt-40 { margin-top: 40px; }

.v-dose {
    font-size: 11px;
    color: var(--el-color-primary);
    font-weight: 600;
    margin-left: 4px;
}

.vaccine-form {
    .el-form-item { margin-bottom: 12px; }
    .el-input, .el-input-number, .el-date-picker { width: 100%; }
}

.complete-tip {
    text-align: center;
    margin-bottom: 20px;
    font-size: 15px;
    color: var(--el-text-color-primary);
}

.completed-card {
    border-radius: 20px !important;
}

.completed-list {
    .completed-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 0;
        border-bottom: 1px solid var(--el-border-color-extra-light);
        &:last-child { border-bottom: none; }
    }
    .item-left {
        flex: 1;
        min-width: 0;
        .item-name {
            font-weight: 700;
            font-size: 15px;
            color: var(--el-text-color-primary);
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .item-meta {
            display: flex;
            gap: 8px;
            font-size: 12px;
            color: var(--el-text-color-secondary);
        }
    }
    .item-actions {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
    }
}

.rounded-dialog {
  :deep(.el-dialog) { border-radius: 28px !important; }
}

.wiki-detail {
    .wiki-meta { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; font-size: 12px; color: var(--el-text-color-secondary); }
    .wiki-text { font-size: 15px; line-height: 1.8; color: var(--el-text-color-primary); }
    .wiki-tips { background: var(--el-color-primary-light-9); padding: 16px; border-radius: 12px; margin-top: 20px; .tips-title { font-weight: 800; margin-bottom: 4px; } p { font-size: 13px; margin: 0; } }
}
</style>
