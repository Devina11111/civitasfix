const nodemailer = require('nodemailer');

// ==============================================
// OPTION 1: GMAIL SMTP (Production)
// ==============================================
let transporter;

if (process.env.NODE_ENV === 'production') {
  // Production: Gmail SMTP
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  console.log('📧 Using Gmail SMTP for production');
} else {
  // Development: Ethereal Email (Testing)
  // Create free account at: https://ethereal.email/
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'vernie40@ethereal.email', // Ganti dengan user ethereal kamu
      pass: '3BQKZPBh2tm2cvj7h7'        // Ganti dengan password ethereal kamu
    }
  });
  console.log('📧 Using Ethereal Email for development');
}

// Test SMTP connection
const testSMTP = async () => {
  try {
    await transporter.verify();
    console.log('✅ SMTP Connection: SUCCESS');
    
    // Jika pakai Ethereal, tampilkan credentials
    if (process.env.NODE_ENV !== 'production') {
      const testAccount = await nodemailer.createTestAccount();
      console.log('📧 Test Email Account Created:');
      console.log(`   Email: ${testAccount.user}`);
      console.log(`   Pass: ${testAccount.pass}`);
      console.log(`   Web: https://ethereal.email`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ SMTP Connection Failed:', error.message);
    console.log('💡 TIPS:');
    console.log('   1. Untuk development: Gunakan Ethereal Email');
    console.log('   2. Untuk production: Pastikan App Password dari Gmail benar');
    console.log('   3. Aktifkan 2FA di Gmail dan buat App Password');
    return false;
  }
};

// Send verification email
const sendVerificationEmail = async (email, verificationCode) => {
  try {
    console.log(`📧 Sending verification email to: ${email}`);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'CivitasFix <noreply@civitasfix.com>',
      to: email,
      subject: 'Kode Verifikasi CivitasFix',
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifikasi Email - CivitasFix</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
        }
        .container {
            background-color: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .content {
            padding: 40px;
        }
        .code-container {
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border: 2px solid #10b981;
            border-radius: 10px;
            padding: 25px;
            text-align: center;
            margin: 30px 0;
        }
        .verification-code {
            font-size: 42px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #065f46;
            font-family: 'Courier New', monospace;
        }
        .instructions {
            background-color: #f3f4f6;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        .button {
            display: inline-block;
            background-color: #10b981;
            color: white;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
        }
        @media (max-width: 600px) {
            .content {
                padding: 20px;
            }
            .verification-code {
                font-size: 32px;
                letter-spacing: 6px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CivitasFix</h1>
            <p style="margin-top: 10px; opacity: 0.9;">Sistem Laporan Kerusakan Kampus</p>
        </div>
        <div class="content">
            <h2 style="color: #065f46; margin-bottom: 10px;">Verifikasi Email Anda</h2>
            <p>Halo,</p>
            <p>Terima kasih telah mendaftar di <strong>CivitasFix</strong>. Untuk melengkapi pendaftaran, masukkan kode verifikasi berikut:</p>
            
            <div class="code-container">
                <div class="verification-code">${verificationCode}</div>
                <p style="margin-top: 15px; color: #047857; font-weight: 500;">Kode berlaku selama 15 menit</p>
            </div>
            
            <div class="instructions">
                <p style="margin: 0;"><strong>Instruksi:</strong></p>
                <ol style="margin: 10px 0 0 20px; padding: 0;">
                    <li>Salin atau catat kode di atas</li>
                    <li>Kembali ke halaman verifikasi CivitasFix</li>
                    <li>Masukkan 6-digit kode tersebut</li>
                    <li>Klik tombol "Verifikasi"</li>
                </ol>
            </div>
            
            <p><strong>⚠️ Peringatan Keamanan:</strong></p>
            <ul style="margin-top: 5px; padding-left: 20px;">
                <li>Jangan bagikan kode ini kepada siapapun</li>
                <li>Tim CivitasFix tidak akan pernah meminta kode verifikasi Anda</li>
                <li>Jika tidak merasa mendaftar, abaikan email ini</li>
            </ul>
            
            <p style="margin-top: 30px;">Jika mengalami masalah, silakan hubungi:</p>
            <p style="color: #10b981; font-weight: 500;">support@civitasfix.com</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} CivitasFix. Semua hak dilindungi.</p>
            <p style="font-size: 12px; margin-top: 5px;">Email ini dikirim otomatis, mohon tidak dibalas.</p>
        </div>
    </div>
</body>
</html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Email sent to ${email}`);
    console.log(`   Message ID: ${info.messageId}`);
    
    // Jika pakai Ethereal, tampilkan preview URL
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`   📋 Preview URL: ${previewUrl}`);
      console.log(`   👁️  View email at: https://ethereal.email/messages/${info.messageId}`);
    }
    
    return { 
      success: true, 
      messageId: info.messageId,
      previewUrl: process.env.NODE_ENV !== 'production' ? nodemailer.getTestMessageUrl(info) : null
    };
  } catch (error) {
    console.error(`❌ Failed to send email to ${email}:`, error.message);
    console.error('Full error:', error);
    
    return { 
      success: false, 
      error: error.message,
      details: 'Check SMTP configuration in Railway Variables'
    };
  }
};

// Send notification email
const sendNotificationEmail = async (email, title, message, reportId = null) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'CivitasFix <noreply@civitasfix.com>',
      to: email,
      subject: `CivitasFix: ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">CivitasFix</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Notifikasi Sistem</p>
          </div>
          <div style="padding: 30px; background-color: white; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #065f46; margin-bottom: 20px;">${title}</h2>
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
              <p style="margin: 0; color: #065f46;">${message}</p>
            </div>
            ${reportId ? `
            <div style="margin-top: 25px; padding: 15px; background-color: #f8fafc; border-radius: 6px;">
              <p style="margin: 0; color: #475569;">
                <strong>ID Laporan:</strong> ${reportId}<br>
                <strong>Waktu:</strong> ${new Date().toLocaleString('id-ID')}
              </p>
            </div>
            ` : ''}
            <div style="margin-top: 30px; text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://civitasfix.netlify.app'}" 
                 style="display: inline-block; background-color: #10b981; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold;">
                Buka CivitasFix
              </a>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} CivitasFix</p>
            <p>Email ini dikirim otomatis oleh sistem CivitasFix</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Notification sent to ${email}: ${title}`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send notification to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Export functions
module.exports = { 
  sendVerificationEmail, 
  sendNotificationEmail,
  testSMTP 
};
