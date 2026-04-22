import client from './client'

export const login = async (code: string) => {
    return client.post('/auth?action=login', { code })
}

export const loginCredential = async (data: any) => {
    return client.post('/auth?action=login', data)
}

export const register = async (data: any) => {
    return client.post('/auth?action=register', data)
}

export const getUserInfo = async () => {
    return client.get('/user?action=info')
}
