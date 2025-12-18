// File email.js - Email system disabled

const testSMTP = async () => {
  console.log('📧 Email system is DISABLED - Using internal notifications instead');
  return { 
    success: true, 
    message: 'Email system is disabled. Using internal notifications.',
    tip: 'All notifications will appear in the website notification center'
  };
};

const sendVerificationEmail = async (email, verificationCode) => {
  console.log(`📧 Verification email DISABLED for: ${email}`);
  return { 
    success: true, 
    message: 'Email verification disabled. Account is automatically activated.',
    tip: 'Users can login immediately after registration'
  };
};

const sendNotificationEmail = async (email, title, message, reportId = null) => {
  console.log(`📧 Notification email DISABLED for: ${email} - "${title}"`);
  return { 
    success: true, 
    message: 'Email notifications disabled. Using internal notifications.',
    tip: 'Check notification bell in the website header'
  };
};

module.exports = { 
  sendVerificationEmail, 
  sendNotificationEmail,
  testSMTP 
};
