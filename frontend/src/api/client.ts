import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000
})

// Request Interceptor: Inject Token
client.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    error => {
        return Promise.reject(error)
    }
)

// Response Interceptor: Global Error Handling
let isRelogging = false
let lastMessage = ''
let messageTimer: any = null

// 这些路径的错误由业务层自行处理，不在此处弹框
const SILENT_PATHS = ['/auth/login', '/auth/register', '/auth/login_credential']

client.interceptors.response.use(
    response => {
        return response.data
    },
    err => {
        const reqUrl: string = err?.config?.url || ''
        const isSilent = SILENT_PATHS.some(p => reqUrl.includes(p))

        let msg = '服务器开小差了，请稍后再试'

        if (err.response) {
            const { status, data } = err.response
            msg = data?.message || msg

            if (status === 401) {
                // 如果是登录/注册请求本身返回 401，让业务层处理，不跳转也不清 token
                if (isSilent) return Promise.reject(err)

                // 其他接口 401：token 过期，清除 session 并跳转登录
                localStorage.removeItem('token')
                localStorage.removeItem('user_info')
                if (!isRelogging) {
                    isRelogging = true
                    ElMessage({
                        message: '登录已失效，请重新登录',
                        type: 'error',
                        grouping: true,
                        duration: 3000,
                        onClose: () => { isRelogging = false }
                    })
                    router.push('/login')
                }
                return Promise.reject(err)
            } else if (status === 403) {
                msg = '您没有执行此操作的权限'
            } else if (status === 404) {
                msg = '请求的资源不存在'
            } else if (status === 429) {
                msg = '请求过于频繁，请稍后再试'
            }
        } else if (err.request) {
            msg = '网络连接超时，请检查您的网络'
        }

        // 业务层自行处理的路径，不弹全局提示
        if (isSilent) return Promise.reject(err)

        // 相同消息 2 秒内只弹一次
        if (msg !== lastMessage) {
            lastMessage = msg
            ElMessage({
                message: msg,
                type: 'error',
                grouping: true,
                center: true,
                duration: 3500
            })
            if (messageTimer) clearTimeout(messageTimer)
            messageTimer = setTimeout(() => { lastMessage = '' }, 2000)
        }

        return Promise.reject(err)
    }
)

export default client
