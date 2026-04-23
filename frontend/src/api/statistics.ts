import client from './client'

export const getStatistics = async (babyId: string) => {
    // 获取当前时区偏移量（小时）
    const tz = (new Date().getTimezoneOffset() / -60).toString();
    return client.get('/statistics', { params: { babyId, tz } })
}

export const getGrowthStandards = async (type: string, gender: string) => {
    return client.get('/statistics/standards', { params: { type, gender } })
}
