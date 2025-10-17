// Alternative Gmail API implementation
// Sử dụng Gmail API thay vì GmailApp

function sendVerificationCodeAlternative(email) {
  try {
    console.log('sendVerificationCodeAlternative called with email:', email);
    
    // Kiểm tra email có phải admin không
    if (email !== CONFIG.ADMIN_EMAIL) {
      return createResponse({ error: 'Email không được phép đăng nhập' }, 403);
    }
    
    // Tạo mã 6 số
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + CONFIG.CODE_EXPIRY_MINUTES * 60 * 1000);
    
    // Lưu mã vào sheet
    const sheet = getSheet(CONFIG.SHEETS.VERIFICATION_CODES);
    sheet.appendRow([email, code, expiry.toISOString(), 'pending']);
    
    // Tạo email message
    const subject = 'Mã xác thực đăng nhập - Hệ thống bảo hành';
    const htmlBody = `
      <h2>Mã xác thực đăng nhập</h2>
      <p>Mã xác thực của bạn là: <strong style="font-size: 24px; color: #007bff;">${code}</strong></p>
      <p>Mã này có hiệu lực trong ${CONFIG.CODE_EXPIRY_MINUTES} phút.</p>
      <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
      <hr>
      <p><small>Hệ thống quản lý bảo hành</small></p>
    `;
    
    // Sử dụng Gmail API thay vì GmailApp
    const message = {
      to: email,
      subject: subject,
      htmlBody: htmlBody
    };
    
    // Gửi email bằng Gmail API
    Gmail.Users.Messages.send(message, 'me');
    
    return createResponse({ 
      success: true,
      message: 'Mã xác thực đã được gửi đến email của bạn'
    });
    
  } catch (error) {
    console.error('sendVerificationCodeAlternative error:', error);
    return createResponse({ 
      error: 'Không thể gửi email. Vui lòng thử lại sau.',
      details: error.toString()
    }, 500);
  }
}
