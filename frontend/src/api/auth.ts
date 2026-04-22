import client from './client'

export const login = async (code: string) => {
    return client.post('/auth/login', { code })
}

export const loginCredential = async (data: any) => {
    return client.post('/auth/login_credential', data)
}

export const register = async (data: any) => {
    return client.post('/auth/register', data)
}

export const getUserInfo = async () => {
    return client.get('/user/info')
}
