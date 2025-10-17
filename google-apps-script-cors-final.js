// Google Apps Script - FINAL CORS FIX
// Deploy as Web App với quyền: Anyone with the link can access

// Cấu hình - THAY ĐỔI CÁC GIÁ TRỊ NÀY
const CONFIG = {
  // ID của Google Sheet chứa dữ liệu
  SHEET_ID: '1VjrQ2HfzMuSlqMH5MICCZn9wnSjnIY_co7SOfvHM-vw',
  
  // Tên các sheet
  SHEETS: {
    WARRANTIES: 'Warranties',      // Phiếu bảo hành
    CUSTOMERS: 'Customers',         // Khách hàng
    RENEWALS: 'Renewals',          // Yêu cầu gia hạn
    PRICING: 'Pricing',            // Giá gia hạn
    DISCOUNTS: 'Discounts',        // Mã giảm giá
    VERIFICATION_CODES: 'VerificationCodes' // Mã xác thực 6 số
  },
  
  // Email admin để gửi mã xác thực
  ADMIN_EMAIL: 'giang10012004@gmail.com',
  
  // Thời gian hết hạn mã xác thực (phút)
  CODE_EXPIRY_MINUTES: 10
};

// Hàm chính xử lý request với CORS headers
function doPost(e) {
  try {
    console.log('doPost called with:', e.postData.contents);
    
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    let result;
    switch(action) {
      case 'send_verification_code':
        result = sendVerificationCode(data.email);
        break;
      case 'verify_code':
        result = verifyCode(data.email, data.code);
        break;
      case 'test_gmail':
        result = testGmailAPI();
        break;
      default:
        result = createResponse({ error: 'Action not found' }, 400);
    }
    
    return result;
  } catch (error) {
    console.error('doPost error:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

function doGet(e) {
  console.log('doGet called');
  return createResponse({ 
    message: 'Google Apps Script API is running',
    timestamp: new Date().toISOString(),
    status: 'OK',
    version: '1.0.0'
  });
}

// Test Gmail API
function testGmailAPI() {
  try {
    console.log('Testing Gmail API...');
    
    // Test 1: Kiểm tra Gmail API có sẵn không
    if (typeof Gmail === 'undefined') {
      console.log('❌ Gmail API is undefined');
      return createResponse({ 
        error: 'Gmail API is undefined',
        message: 'Vui lòng thêm Gmail API service trong Apps Script'
      }, 500);
    }
    
    // Test 2: Lấy profile
    const profile = Gmail.Users.getProfile('me');
    console.log('Gmail profile:', profile);
    
    // Test 3: Gửi email bằng Gmail API
    const message = {
      to: CONFIG.ADMIN_EMAIL,
      subject: 'Test Gmail API - ' + new Date().toLocaleString(),
      htmlBody: `
        <h2>✅ Gmail API hoạt động bình thường!</h2>
        <p>Thời gian: ${new Date().toLocaleString('vi-VN')}</p>
        <p>Email: ${CONFIG.ADMIN_EMAIL}</p>
        <p>Profile: ${profile.emailAddress}</p>
      `
    };
    
    Gmail.Users.Messages.send(message, 'me');
    
    console.log('✅ Gmail API test thành công!');
    return createResponse({ 
      success: true,
      message: 'Gmail API hoạt động bình thường!',
      profile: profile
    });
    
  } catch (error) {
    console.error('❌ Gmail API error:', error);
    return createResponse({ 
      error: 'Lỗi Gmail API: ' + error.toString(),
      details: error.stack
    }, 500);
  }
}

// === XÁC THỰC 6 SỐ QUA EMAIL ===
function sendVerificationCode(email) {
  try {
    console.log('sendVerificationCode called with email:', email);
    
    // Kiểm tra email có phải admin không
    if (email !== CONFIG.ADMIN_EMAIL) {
      console.log('Email not allowed:', email);
      return createResponse({ error: 'Email không được phép đăng nhập' }, 403);
    }
    
    // Kiểm tra Gmail API có sẵn không
    if (typeof Gmail === 'undefined') {
      console.error('Gmail API is not available');
      return createResponse({ 
        error: 'Gmail API chưa được bật. Vui lòng thêm Gmail API service trong Apps Script.',
        details: 'Gmail API is undefined'
      }, 500);
    }
    
    // Tạo mã 6 số
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + CONFIG.CODE_EXPIRY_MINUTES * 60 * 1000);
    
    console.log('Generated code:', code, 'for email:', email);
    
    // Lưu mã vào sheet
    const sheet = getSheet(CONFIG.SHEETS.VERIFICATION_CODES);
    sheet.appendRow([email, code, expiry.toISOString(), 'pending']);
    
    console.log('Code saved to sheet');
    
    // Gửi email bằng Gmail API
    const subject = 'Mã xác thực đăng nhập - Hệ thống bảo hành';
    const htmlBody = `
      <h2>Mã xác thực đăng nhập</h2>
      <p>Mã xác thực của bạn là: <strong style="font-size: 24px; color: #007bff;">${code}</strong></p>
      <p>Mã này có hiệu lực trong ${CONFIG.CODE_EXPIRY_MINUTES} phút.</p>
      <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
      <hr>
      <p><small>Hệ thống quản lý bảo hành</small></p>
    `;
    
    const message = {
      to: email,
      subject: subject,
      htmlBody: htmlBody
    };
    
    console.log('Sending email...');
    Gmail.Users.Messages.send(message, 'me');
    
    console.log('Email sent successfully');
    
    return createResponse({ 
      success: true,
      message: 'Mã xác thực đã được gửi đến email của bạn'
    });
  } catch (error) {
    console.error('sendVerificationCode error:', error);
    return createResponse({ 
      error: 'Không thể gửi email. Vui lòng thử lại sau.',
      details: error.toString(),
      stack: error.stack
    }, 500);
  }
}

function verifyCode(email, code) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.VERIFICATION_CODES);
    const data = sheet.getDataRange().getValues();
    
    // Tìm mã gần nhất cho email này
    let latestRow = -1;
    let latestTime = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === email && data[i][3] === 'pending') {
        const codeTime = new Date(data[i][2]).getTime();
        if (codeTime > latestTime) {
          latestTime = codeTime;
          latestRow = i;
        }
      }
    }
    
    if (latestRow === -1) {
      return createResponse({ error: 'Không tìm thấy mã xác thực' }, 404);
    }
    
    const rowData = data[latestRow];
    const storedCode = rowData[1];
    const expiry = new Date(rowData[2]);
    
    // Kiểm tra mã và thời gian hết hạn
    if (code !== storedCode) {
      return createResponse({ error: 'Mã xác thực không đúng' }, 400);
    }
    
    if (new Date() > expiry) {
      return createResponse({ error: 'Mã xác thực đã hết hạn' }, 400);
    }
    
    // Đánh dấu mã đã sử dụng
    sheet.getRange(latestRow + 1, 4).setValue('used');
    
    return createResponse({ 
      success: true,
      message: 'Xác thực thành công'
    });
  } catch (error) {
    console.error('verifyCode error:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

// === HÀM HỖ TRỢ ===
function getSheet(sheetName) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      // Tạo sheet mới nếu chưa có
      sheet = spreadsheet.insertSheet(sheetName);
      
      // Thêm headers mặc định
      if (sheetName === CONFIG.SHEETS.VERIFICATION_CODES) {
        sheet.getRange(1, 1, 1, 4).setValues([[
          'email', 'code', 'expiry', 'status'
        ]]);
      }
    }
    
    return sheet;
  } catch (error) {
    console.error('getSheet error:', error);
    throw error;
  }
}

function createResponse(data, statusCode = 200) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
