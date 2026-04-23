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
    isLiked?: boolean
    _count?: { comments: number; likes: number }
    comments?: AlbumComment[]
    likes?: AlbumLike[]
    baby?: { id: number; name: string }
    user?: { id: number; nickname: string; avatar?: string }
}

export interface AlbumComment {
    id: number
    albumId: number
    userId: number
    content: string
    parentId?: number
    createdAt: string
    replyCount?: number
    replies?: AlbumComment[]
    user?: { id: number; nickname: string; avatar?: string }
}

export interface AlbumLike {
    id: number
    albumId: number
    userId: number
    createdAt: string
    user?: { id: number; nickname: string }
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

export const addComment = async (data: {
    albumId: number
    content: string
    parentId?: number
}): Promise<AlbumComment> => {
    return client.post('/album?action=comment', data)
}

export const deleteComment = async (id: number): Promise<void> => {
    return client.delete(`/album?action=comment&id=${id}`)
}

export const likeAlbum = async (albumId: number): Promise<{ liked: boolean }> => {
    return client.post('/album?action=like', { albumId })
}

export const unlikeAlbum = async (albumId: number): Promise<{ liked: boolean }> => {
    return client.delete(`/album?action=like&albumId=${albumId}`)
}
