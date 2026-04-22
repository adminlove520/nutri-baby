import { put } from '@vercel/blob';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest } from '../../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { filename } = req.query;
    if (!filename) return res.status(400).json({ message: 'Filename required' });

    try {
        // Vercel Blob expects the body to be the file content
        // In a real browser environment, we might use a multipart parser if needed,
        // but Vercel Blob 'put' can take the request body directly if it's the file.
        const blob = await put(filename as string, req, {
            access: 'public',
        });

        return res.status(200).json(blob);
    } catch (error) {
        console.error('Upload Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
