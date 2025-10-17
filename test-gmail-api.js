// Test Gmail API trong Google Apps Script
// Chạy function này để test Gmail API

function testGmailAPI() {
  try {
    // Test gửi email đơn giản
    GmailApp.sendEmail(
      'giang10012004@gmail.com',
      'Test Gmail API',
      'Test email từ Google Apps Script',
      {
        htmlBody: '<h2>Test thành công!</h2><p>Gmail API hoạt động bình thường.</p>'
      }
    );
    
    console.log('✅ Gmail API hoạt động bình thường!');
    return 'Gmail API test thành công!';
  } catch (error) {
    console.error('❌ Lỗi Gmail API:', error);
    return 'Lỗi Gmail API: ' + error.toString();
  }
}

// Test xác thực 6 số
function testVerificationCode() {
  try {
    const email = 'giang10012004@gmail.com';
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Gửi email test
    GmailApp.sendEmail(
      email,
      'Test mã xác thực',
      `Mã test: ${code}`,
      {
        htmlBody: `
          <h2>Test mã xác thực</h2>
          <p>Mã test: <strong style="font-size: 24px; color: #007bff;">${code}</strong></p>
          <p>Thời gian: ${new Date().toLocaleString('vi-VN')}</p>
        `
      }
    );
    
    console.log('✅ Test gửi mã thành công!');
    return 'Test gửi mã thành công!';
  } catch (error) {
    console.error('❌ Lỗi gửi mã:', error);
    return 'Lỗi gửi mã: ' + error.toString();
  }
}
