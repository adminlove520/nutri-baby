const GITHUB_API = 'https://api.github.com';

export interface GitHubConfig {
    token: string;
    owner: string;
    repo: string;
    branch: string;
    basePath?: string;
}

export interface UploadResult {
    success: boolean;
    url?: string;
    path?: string;
    error?: string;
}

export class GitHubUploader {
    private config: GitHubConfig;

    constructor(config: GitHubConfig) {
        this.config = config;
    }

    private getHeaders() {
        return {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        };
    }

    async testConnection(): Promise<{ valid: boolean; message: string }> {
        try {
            const response = await fetch(`${GITHUB_API}/repos/${this.config.owner}/${this.config.repo}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                return { valid: true, message: `已连接到 ${data.full_name}` };
            } else if (response.status === 404) {
                return { valid: false, message: '仓库不存在或无权访问' };
            } else if (response.status === 401) {
                return { valid: false, message: 'Token 无效或已过期' };
            } else {
                return { valid: false, message: `连接失败: ${response.status}` };
            }
        } catch (error: any) {
            return { valid: false, message: `连接错误: ${error.message}` };
        }
    }

    async uploadFile(
        content: Buffer | string,
        filename: string,
        path: string
    ): Promise<UploadResult> {
        try {
            const normalizedPath = path.replace(/^\//, '');
            const fullPath = this.config.basePath
                ? `${this.config.basePath}/${normalizedPath}/${filename}`
                : `${normalizedPath}/${filename}`;

            const url = `https://raw.githubusercontent.com/${this.config.owner}/${this.config.repo}/${this.config.branch}/${fullPath}`;

            const body = typeof content === 'string'
                ? btoa(unescape(encodeURIComponent(content)))
                : Buffer.from(content).toString('base64');

            const response = await fetch(`${GITHUB_API}/repos/${this.config.owner}/${this.config.repo}/contents/${fullPath}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    message: `Upload ${filename} via Nutri-Baby`,
                    content: body,
                    branch: this.config.branch
                })
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    url: data.content.download_url,
                    path: fullPath
                };
            } else {
                const error = await response.json();
                return {
                    success: false,
                    error: error.message || `Upload failed: ${response.status}`
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async checkFileExists(path: string): Promise<boolean> {
        try {
            const response = await fetch(`${GITHUB_API}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    async createFolder(path: string): Promise<boolean> {
        try {
            const readmePath = `${path.replace(/^\//, '')}/.gitkeep`;
            const response = await fetch(`${GITHUB_API}/repos/${this.config.owner}/${this.config.repo}/contents/${readmePath}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    message: `Create folder ${path} via Nutri-Baby`,
                    content: '',
                    branch: this.config.branch
                })
            });
            return response.ok || response.status === 422;
        } catch {
            return false;
        }
    }

    async listFolder(path: string): Promise<string[]> {
        try {
            const response = await fetch(`${GITHUB_API}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                return Array.isArray(data) ? data.map((f: any) => f.name) : [];
            }
            return [];
        } catch {
            return [];
        }
    }
}

export function generateAlbumPath(albumType: string, babyName: string, date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const typeMap: Record<string, string> = {
        'growth': '成长记录',
        'moment': '精彩瞬间',
        'default': '其他'
    };

    const typeName = typeMap[albumType] || typeMap['default'];

    return `${year}/${year}-${month}-${day}_${babyName}/${typeName}`;
}

export function generateFilename(originalName: string, index: number): string {
    const timestamp = Date.now();
    const nanoid = Math.random().toString(36).substring(2, 8);
    const ext = originalName.split('.').pop() || 'jpg';
    return `${timestamp}_${nanoid}_${String(index).padStart(3, '0')}.${ext}`;
}
