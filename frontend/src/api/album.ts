import client from './client'

export interface AlbumRecord {
    id: number
    babyId: number
    userId: number
    title?: string
    description?: string
    url: string
    filename: string
    fileSize?: number
    mimeType?: string
    width?: number
    height?: number
    albumType: string
    time?: string
    createdAt: string
    baby?: { id: number; name: string }
}

export interface AlbumListResponse {
    records: AlbumRecord[]
    total: number
    page: number
    limit: number
    totalPages: number
}

export const getAlbums = async (params: {
    babyId?: string
    albumType?: string
    page?: number
    limit?: number
}): Promise<AlbumListResponse> => {
    return client.get('/album', { params })
}

export const createAlbum = async (data: {
    babyId: string
    title?: string
    description?: string
    url: string
    filename: string
    fileSize?: number
    mimeType?: string
    width?: number
    height?: number
    albumType?: string
    time?: string
}): Promise<AlbumRecord> => {
    return client.post('/album', data)
}

export const updateAlbum = async (id: number, data: {
    title?: string
    description?: string
    albumType?: string
    time?: string
}): Promise<AlbumRecord> => {
    return client.put('/album', { id, ...data })
}

export const deleteAlbum = async (id: number): Promise<void> => {
    return client.delete(`/album?id=${id}`)
}
