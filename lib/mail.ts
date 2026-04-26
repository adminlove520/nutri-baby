import nodemailer from 'nodemailer';

// Email SMTP Configuration - 从环境变量读取
const EMAIL_CONFIG = {
    host: process.env.EMAIL_HOST || 'smtp.qq.com',
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: true, // SSL
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
};

// 检查配置是否完整
function checkConfig(): boolean {
    if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
        console.warn('[Mail] Email configuration incomplete - EMAIL_USER or EMAIL_PASS not set');
        return false;
    }
    return true;
}

// 创建 transporter（延迟初始化）
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
    if (!checkConfig()) return null;
    
    if (!transporter) {
        transporter = nodemailer.createTransport(EMAIL_CONFIG);
    }
    return transporter;
}

export const sendEmail = async (to: string, subject: string, html: string): Promise<any> => {
    const mailTransport = getTransporter();
    
    if (!mailTransport) {
        console.error('[Mail] Cannot send email - configuration incomplete');
        throw new Error('Email configuration incomplete');
    }
    
    try {
        const info = await mailTransport.sendMail({
            from: `"Nutri-Baby" <${EMAIL_CONFIG.auth.user}>`,
            to,
            subject,
            html
        });
        console.log('[Mail] Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('[Mail] Error sending email:', error);
        throw error;
    }
};
