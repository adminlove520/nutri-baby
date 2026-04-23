import client from './client'

export interface GitHubSettings {
    configured: boolean
    config?: {
        owner: string
        repo: string
        branch: string
        basePath?: string
        autoSync: boolean
        syncInterval: string
        lastSyncAt?: string
    }
}

export interface SyncLog {
    id: number
    status: string
    message: string
    syncedCount: number
    errorLog?: string
    createdAt: string
}

export const getGitHubSettings = async (): Promise<GitHubSettings> => {
    return client.get('/settings?action=get')
}

export const saveGitHubSettings = async (data: {
    token: string
    owner: string
    repo: string
    branch?: string
    basePath?: string
    autoSync?: boolean
    syncInterval?: string
}): Promise<any> => {
    return client.post('/settings?action=save', data)
}

export const testGitHubConnection = async (data: {
    token: string
    owner: string
    repo: string
}): Promise<{ valid: boolean; message: string }> => {
    return client.post('/settings?action=test', data)
}

export const syncToGitHub = async (): Promise<{
    message: string
    syncedCount: number
    errors?: string[]
}> => {
    return client.post('/settings?action=sync')
}

export const getSyncLogs = async (): Promise<SyncLog[]> => {
    return client.get('/settings?action=logs')
}
