const nodemailer = require('nodemailer');

// Konfigurasi SMTP untuk Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    debug: true, // Aktifkan debug
    logger: true
  });
};

// Test koneksi SMTP
const testSMTPConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ SMTP connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    return false;
  }
};

// Fungsi untuk mengirim email verifikasi
const sendVerificationEmail = async (email, verificationCode) => {
  try {
    console.log(`📧 Attempting to send verification email to: ${email}`);
    
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"CivitasFix" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Kode Verifikasi CivitasFix',
      text: `Kode verifikasi Anda: ${verificationCode}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verifikasi Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 10px; text-align: center; color: #10b981; padding: 20px; background: white; border: 2px dashed #d1d5db; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CivitasFix</h1>
            <p>Sistem Laporan Kerusakan Kampus</p>
          </div>
          <div class="content">
            <h2>Verifikasi Email Anda</h2>
            <p>Halo,</p>
            <p>Terima kasih telah mendaftar di CivitasFix. Gunakan kode verifikasi berikut untuk melengkapi pendaftaran:</p>
            <div class="code">${verificationCode}</div>
            <p>Kode ini berlaku selama 15 menit.</p>
            <p><strong>Jangan bagikan kode ini kepada siapapun.</strong></p>
            <p>Jika Anda tidak merasa mendaftar, abaikan email ini.</p>
            <p>Salam,<br>Tim CivitasFix</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} CivitasFix. Semua hak dilindungi.</p>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send verification email to ${email}:`, error);
    return { success: false, error: error.message };
  }
};

// Fungsi untuk mengirim email notifikasi
const sendNotificationEmail = async (email, title, message, reportId = null) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"CivitasFix" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `CivitasFix: ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10b981; padding: 20px; text-align: center; color: white;">
            <h1>CivitasFix</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2>${title}</h2>
            <p>${message}</p>
            ${reportId ? `<p>ID Laporan: ${reportId}</p>` : ''}
            <p style="margin-top: 30px; color: #666;">
              Login ke akun Anda untuk melihat detail lengkap.
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} CivitasFix</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Failed to send notification email to ${email}:`, error);
    return { success: false, error: error.message };
  }
};

module.exports = { 
  sendVerificationEmail, 
  sendNotificationEmail,
  testSMTPConnection 
};
