import nodemailer from 'nodemailer';

// QQ Mail SMTP Configuration
const transporter = nodemailer.createTransport({
    host: 'smtp.qq.com',
    port: 465,
    secure: true, // use SSL
    auth: {
        user: process.env.EMAIL_USER || '791751568@qq.com', // Replace with your QQ email if different
        pass: process.env.EMAIL_PASS || 'emmtentkuombdcca'  // Use the authorization code
    }
});

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        const info = await transporter.sendMail({
            from: `"Nutri-Baby" <${process.env.EMAIL_USER || '791751568@qq.com'}>`,
            to,
            subject,
            html
        });
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};
