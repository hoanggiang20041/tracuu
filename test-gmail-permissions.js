// Test Gmail API permissions trong Google Apps Script
// Chạy function này trong Apps Script để test

function testGmailPermissions() {
  try {
    // Test 1: Kiểm tra Gmail API có sẵn không
    console.log('Testing Gmail API...');
    
    // Test 2: Lấy thông tin profile
    const profile = Gmail.Users.getProfile('me');
    console.log('Gmail profile:', profile);
    
    // Test 3: Gửi email test
    GmailApp.sendEmail(
      'giang10012004@gmail.com',
      'Test Gmail API - ' + new Date().toLocaleString(),
      'Test email từ Google Apps Script',
      {
        htmlBody: `
          <h2>✅ Gmail API hoạt động bình thường!</h2>
          <p>Thời gian: ${new Date().toLocaleString('vi-VN')}</p>
          <p>Profile: ${profile.emailAddress}</p>
        `
      }
    );
    
    console.log('✅ Gmail API test thành công!');
    return 'Gmail API hoạt động bình thường!';
    
  } catch (error) {
    console.error('❌ Gmail API error:', error);
    return 'Lỗi Gmail API: ' + error.toString();
  }
}

// Test gửi mã xác thực
function testSendVerificationCode() {
  try {
    const email = 'giang10012004@gmail.com';
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    GmailApp.sendEmail(
      email,
      'Test mã xác thực - ' + new Date().toLocaleString(),
      `Mã test: ${code}`,
      {
        htmlBody: `
          <h2>🔐 Test mã xác thực</h2>
          <p>Mã test: <strong style="font-size: 24px; color: #007bff;">${code}</strong></p>
          <p>Thời gian: ${new Date().toLocaleString('vi-VN')}</p>
          <p>Email: ${email}</p>
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
