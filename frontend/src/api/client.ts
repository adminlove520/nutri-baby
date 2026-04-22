import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const client = axios.create({
    baseURL: '/api',
    timeout: 10000
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
client.interceptors.response.use(
    response => {
        return response.data
    },
    error => {
        let msg = '服务器开小差了，请稍后再试'
        
        if (error.response) {
            const { status, data } = error.response
            msg = data.message || msg
            
            if (status === 401) {
                // Unauthorized - clear session and redirect to login
                localStorage.removeItem('token')
                localStorage.removeItem('user_info')
                router.push('/login')
                msg = '登录已失效，请重新登录'
            } else if (status === 403) {
                msg = '您没有执行此操作的权限'
            } else if (status === 404) {
                msg = '请求的资源不存在'
            } else if (status === 429) {
                msg = '请求过于频繁，请稍后再试'
            }
        } else if (error.request) {
            msg = '网络连接超时，请检查您的网络'
        }
        
        ElMessage.error(msg)
        return Promise.reject(error)
    }
)

export default client
