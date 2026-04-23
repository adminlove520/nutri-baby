import { defineStore } from 'pinia'
import axios from 'axios'

export interface RecordPayload {
    babyId: string
    modelType: 'feeding' | 'sleep' | 'diaper' | 'growth' | 'medication' | 'health'
    time: string | number | Date
    [key: string]: any
}

export const useRecordStore = defineStore('record', () => {
    
    const addRecord = async (payload: RecordPayload) => {
        try {
            const token = localStorage.getItem('token')
            const { modelType, ...data } = payload

            const res = await axios.post(`/api/record/${modelType}`, data, {
                headers: { Authorization: `Bearer ${token}` }
            })
            return res.data
        } catch (error) {
            console.error('Failed to add record:', error)
            throw error
        }
    }

    const deleteRecord = async (type: string, id: string) => {
        try {
            const token = localStorage.getItem('token')
            const res = await axios.delete(`/api/record/${type}/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            return res.data
        } catch (error) {
            console.error('Failed to delete record:', error)
            throw error
        }
    }

    return {
        addRecord,
        deleteRecord
    }
})
