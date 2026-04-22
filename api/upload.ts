import { put } from '@vercel/blob';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest } from '../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { filename } = req.query;
    if (!filename) return res.status(400).json({ message: 'Filename required' });

    try {
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            console.error('Missing BLOB_READ_WRITE_TOKEN environment variable');
            return res.status(500).json({ 
                message: 'Vercel Blob Storage not configured. Please connect a Blob store in Vercel dashboard.' 
            });
        }

        // Vercel Blob expects the body to be the file content
        // If the body is already parsed by Vercel, we use it directly
        const body = (req as any).body || req;

        // Fix: Removed hardcoded access: 'public' because the user's store might be private
        const blob = await put(filename as string, body, {
            // By omitting access, it uses the store's default or we can try 'public' only if allowed
            // To be safe and respect user's store config:
            ...(process.env.BLOB_ACCESS_MODE === 'public' ? { access: 'public' } : {})
        });

        return res.status(200).json(blob);
    } catch (error: any) {
        console.error('Upload Error Details:', error);
        return res.status(500).json({ 
            message: `Upload Failed: ${error.message || 'Unknown Error'}` 
        });
    }
}
