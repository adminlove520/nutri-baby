import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as authApi from '@/api/auth'
import type { UserInfo } from '@/types'

export const useUserStore = defineStore('user', () => {
    const isLoggedIn = ref(!!localStorage.getItem('token'))
    const userInfo = ref<UserInfo>({
        id: '',
        nickname: '访客',
        avatarUrl: '',
        phone: '',
        email: ''
    })

    const login = async (code: string) => {
        try {
            const data = await authApi.login(code)
            setSession(data)
        } catch (error) {
            console.error('Login failed:', error)
            throw error
        }
    }

    const loginCredential = async (account: string, pass: string) => {
        const data = await authApi.loginCredential({ account, password: pass })
        setSession(data)
    }

    const register = async (account: string, pass: string, nickname: string) => {
        const data = await authApi.register({ account, password: pass, nickname })
        setSession(data)
    }

    const setSession = (data: any) => {
        isLoggedIn.value = true
        userInfo.value = {
            id: String(data.userInfo.id),
            nickname: data.userInfo.nickname || 'Parent',
            avatarUrl: data.userInfo.avatarUrl || '',
            phone: data.userInfo.phone || '',
            email: data.userInfo.email || ''
        }
        localStorage.setItem('token', data.token)
        localStorage.setItem('user_info', JSON.stringify(userInfo.value))
    }

    const setUserInfo = (info: Partial<UserInfo>) => {
        userInfo.value = { ...userInfo.value, ...info }
        localStorage.setItem('user_info', JSON.stringify(userInfo.value))
    }

    const logout = () => {
        isLoggedIn.value = false
        userInfo.value = { id: '', nickname: '', avatarUrl: '', phone: '', email: '' }
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
        logout,
        setUserInfo
    }
})
