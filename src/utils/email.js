const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendVerificationEmail = async (email, verificationCode) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Kode Verifikasi CivitasFix',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #10b981; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">CivitasFix</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #374151;">Verifikasi Email Anda</h2>
          <p style="color: #6b7280;">Gunakan kode berikut untuk verifikasi akun CivitasFix Anda:</p>
          <div style="background-color: #ffffff; border: 2px dashed #d1d5db; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #10b981;">${verificationCode}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Kode ini berlaku selama 15 menit. Jangan bagikan kode ini kepada siapapun.</p>
          <p style="color: #6b7280; font-size: 14px;">Jika Anda tidak meminta kode verifikasi, abaikan email ini.</p>
        </div>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} CivitasFix. Semua hak dilindungi.</p>
        </div>
      </div>
    `,
    };

    return transporter.sendMail(mailOptions);
};

const sendNotificationEmail = async (email, title, message, reportId = null) => {
    const reportLink = reportId
        ? `${process.env.FRONTEND_URL}/reports/${reportId}`
        : `${process.env.FRONTEND_URL}/dashboard`;

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: `CivitasFix: ${title}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #10b981; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">CivitasFix</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #374151;">${title}</h2>
          <div style="background-color: #ffffff; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <p style="color: #374151; margin: 0;">${message}</p>
          </div>
          ${reportId ? `
          <a href="${reportLink}" style="display: inline-block; background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
            Lihat Detail Laporan
          </a>
          ` : ''}
        </div>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} CivitasFix. Semua hak dilindungi.</p>
        </div>
      </div>
    `,
    };

    return transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail, sendNotificationEmail };