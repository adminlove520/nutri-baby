import client from './client'

export const getRecords = async (type: string, babyId: string, limit = 50) => {
    return client.get(`/record?type=${type}&babyId=${babyId}&limit=${limit}`)
}

export const createRecord = async (type: string, data: any) => {
    return client.post(`/record?type=${type}`, data)
}

export const deleteRecord = async (type: string, id: string) => {
    return client.delete(`/record?type=${type}&id=${id}`)
}
