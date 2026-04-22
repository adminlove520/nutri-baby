import client from './client'

export const getStatistics = async (babyId: string) => {
    return client.get('/statistics', { params: { babyId } })
}

export const getGrowthStandards = async (type: string, gender: string) => {
    return client.get('/statistics/standards', { params: { type, gender } })
}
