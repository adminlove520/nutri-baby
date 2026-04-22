import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as authApi from '@/api/auth'

export interface UserInfo {
    id: string
    nickname: string
    avatarUrl: string
    phone?: string
}

export const useUserStore = defineStore('user', () => {
    const isLoggedIn = ref(!!localStorage.getItem('token'))
    const userInfo = ref<UserInfo>({
        id: '',
        nickname: '访客',
        avatarUrl: '',
        phone: ''
    })

    const login = async (code: string) => {
        try {
            const data = await authApi.login(code)
            setSession(data)
        } catch (error) {
            console.error('Login failed', error)
            throw error
        }
    }

    const loginCredential = async (phone: string, pass: string) => {
        const data = await authApi.loginCredential({ phone, password: pass })
        setSession(data)
    }

    const register = async (phone: string, pass: string, nickname: string) => {
        const data = await authApi.register({ phone, password: pass, nickname })
        setSession(data)
    }

    const setSession = (data: any) => {
        isLoggedIn.value = true
        userInfo.value = {
            id: String(data.userInfo.id),
            nickname: data.userInfo.nickname || 'Parent',
            avatarUrl: data.userInfo.avatarUrl || '',
            phone: data.userInfo.phone || ''
        }
        localStorage.setItem('token', data.token)
        localStorage.setItem('user_info', JSON.stringify(userInfo.value))
    }

    const logout = () => {
        isLoggedIn.value = false
        userInfo.value = { id: '', nickname: '', avatarUrl: '', phone: '' }
        localStorage.removeItem('token')
        localStorage.removeItem('user_info')
    }

    // Try load from local
    const savedUser = localStorage.getItem('user_info')
    if (savedUser) {
        try {
            userInfo.value = JSON.parse(savedUser)
        } catch (e) {}
    }

    return {
        isLoggedIn,
        userInfo,
        login,
        loginCredential,
        register,
        logout
    }
})
