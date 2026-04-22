import client from './client'
import type { BabyProfile } from '@/stores/baby'

export const getBabies = async (): Promise<BabyProfile[]> => {
    return client.get('/baby')
}

export const createBaby = async (data: Partial<BabyProfile>) => {
    return client.post('/baby', data)
}

export const updateBaby = async (id: string, data: Partial<BabyProfile>) => {
    return client.put(`/baby?babyId=${id}`, data)
}

export const deleteBaby = async (id: string) => {
    return client.delete(`/baby?babyId=${id}`)
}

export const getVaccines = async (babyId: string) => {
    return client.get(`/baby/${babyId}/vaccines`)
}

export const updateVaccine = async (babyId: string, data: any) => {
    return client.post(`/baby/${babyId}/vaccines`, data)
}

export const getInviteToken = async (babyId: string) => {
    return client.get(`/baby/${babyId}/invite`)
}

export const joinTeam = async (token: string, role: string) => {
    return client.post('/baby/join', { token, role })
}
