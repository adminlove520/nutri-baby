import client from './client'

export interface ShareResponse {
    shareUrl: string
    shareToken?: string
    caption?: string
    album?: {
        id: number
        title?: string
        description?: string
        url: string
        babyName?: string
        userName?: string
    }
}

export const shareAlbum = async (albumId: number, type?: 'link' | 'caption'): Promise<ShareResponse> => {
    return client.post('/share', { albumId, type })
}
