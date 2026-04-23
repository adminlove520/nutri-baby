import client from './client'

export const getStatistics = async (babyId: string | bigint) => {
    if (!babyId || babyId === 'null' || babyId === 'undefined') {
        return Promise.reject(new Error('babyId is required'))
    }
    return client.get('/statistics', { params: { babyId: babyId.toString() } })
}

export const getGrowthStandards = async (type: string, gender: string) => {
    return client.get('/statistics/standards', { params: { type, gender } })
}
