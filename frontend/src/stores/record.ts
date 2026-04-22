import { defineStore } from 'pinia'
import axios from 'axios'

export interface RecordPayload {
    babyId: string
    type: string // feeding, sleep, diaper, growth
    time: string | number | Date
    [key: string]: any
}

export const useRecordStore = defineStore('record', () => {
    
    const addRecord = async (payload: RecordPayload) => {
        try {
            const token = localStorage.getItem('token')
            // Map specialized types to unified /api/record/[type]
            let endpointType = payload.type
            if (['breast', 'bottle', 'food'].includes(payload.type)) {
                endpointType = 'feeding'
            }

            const res = await axios.post(`/api/record/${endpointType}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            })
            return res.data
        } catch (error) {
            console.error('Failed to add record:', error)
            throw error
        }
    }

    const deleteRecord = async (type: string, id: string) => {
        // TODO: Implement DELETE in api/record/[type].ts
        console.log('Delete record', type, id)
    }

    return {
        addRecord,
        deleteRecord
    }
})
