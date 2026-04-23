import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as babyApi from '@/api/baby'
import type { BabyProfile } from '@/types'

export const useBabyStore = defineStore('baby', () => {
    const babyList = ref<BabyProfile[]>([])
    const currentBaby = ref<BabyProfile | null>(null)
    const loading = ref(false)

    const fetchBabies = async () => {
        loading.value = true
        try {
            const data = await babyApi.getBabies()
            babyList.value = data.map((b: any) => ({
                ...b,
                id: String(b.id)
            }))
            
            // Set current baby
            const savedId = localStorage.getItem('current_baby_id')
            let found = babyList.value.find(b => b.id === savedId)
            if (!found && babyList.value.length > 0) {
                found = babyList.value[0]
            }
            
            if (found) {
                currentBaby.value = found
                localStorage.setItem('current_baby_id', found.id)
            }
        } catch (error) {
            console.error('Failed to load babies', error)
        } finally {
            loading.value = false
        }
    }

    const setCurrentBaby = (id: string) => {
        const baby = babyList.value.find(b => b.id === id)
        if (baby) {
            currentBaby.value = baby
            localStorage.setItem('current_baby_id', id)
        }
    }

    const addBaby = async (baby: Omit<BabyProfile, 'id'>) => {
        try {
            const res = await babyApi.createBaby(baby)
            const newBaby = { ...res, id: String(res.id) }
            babyList.value.push(newBaby)
            if (!currentBaby.value) {
                setCurrentBaby(newBaby.id)
            }
            return newBaby
        } catch (error) {
            console.error('Add baby failed', error)
            throw error
        }
    }

    const updateBaby = async (id: string, updates: Partial<BabyProfile>) => {
        try {
            const res = await babyApi.updateBaby(id, updates)
            const updated = { ...res, id: String(res.id) }

            const index = babyList.value.findIndex(b => b.id === id)
            if (index !== -1) {
                babyList.value[index] = updated
                if (currentBaby.value?.id === id) {
                    currentBaby.value = updated
                }
            }
            return updated
        } catch (error) {
            console.error('Update baby failed', error)
            throw error
        }
    }

    const deleteBaby = async (id: string) => {
        try {
            await babyApi.deleteBaby(id)
            babyList.value = babyList.value.filter(b => b.id !== id)
            if (currentBaby.value && currentBaby.value.id === id) {
                const next = babyList.value[0] || null
                currentBaby.value = next
                if (next) localStorage.setItem('current_baby_id', next.id)
                else localStorage.removeItem('current_baby_id')
            }
        } catch (error) {
            console.error('Delete baby failed', error)
            throw error
        }
    }

    return {
        babyList,
        currentBaby,
        loading,
        fetchBabies,
        setCurrentBaby,
        addBaby,
        updateBaby,
        deleteBaby
    }
})
