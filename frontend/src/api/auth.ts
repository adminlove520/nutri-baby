import axios from 'axios'

const api = axios.create({
    baseURL: '/api'
})

export const login = async (code: string) => {
    const response = await api.post('/auth/login', { code })
    return response.data
}

export const loginCredential = async (data: any) => {
    const response = await api.post('/auth/login', data)
    return response.data
}

export const register = async (data: any) => {
    const response = await api.post('/auth/register', data)
    return response.data
}

export const getUserInfo = async () => {
    // TODO: Implement me endpoint
}
