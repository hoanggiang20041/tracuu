// Google Apps Script - FIXED VERSION với CORS headers
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
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    let result;
    switch(action) {
      case 'get_warranties':
        result = getWarranties();
        break;
      case 'get_customers':
        result = getCustomers();
        break;
      case 'add_warranty':
        result = addWarranty(data.warranty);
        break;
      case 'update_warranty':
        result = updateWarranty(data.id, data.warranty);
        break;
      case 'delete_warranty':
        result = deleteWarranty(data.id);
        break;
      case 'add_customer':
        result = addCustomer(data.customer);
        break;
      case 'update_customer':
        result = updateCustomer(data.id, data.customer);
        break;
      case 'delete_customer':
        result = deleteCustomer(data.id);
        break;
      case 'get_renewals':
        result = getRenewals();
        break;
      case 'add_renewal':
        result = addRenewal(data.renewal);
        break;
      case 'approve_renewal':
        result = approveRenewal(data.id);
        break;
      case 'reject_renewal':
        result = rejectRenewal(data.id);
        break;
      case 'get_pricing':
        result = getPricing();
        break;
      case 'update_pricing':
        result = updatePricing(data.pricing);
        break;
      case 'get_discounts':
        result = getDiscounts();
        break;
      case 'add_discount':
        result = addDiscount(data.discount);
        break;
      case 'update_discount':
        result = updateDiscount(data.id, data.discount);
        break;
      case 'delete_discount':
        result = deleteDiscount(data.id);
        break;
      case 'send_verification_code':
        result = sendVerificationCode(data.email);
        break;
      case 'verify_code':
        result = verifyCode(data.email, data.code);
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
  // Chỉ cho phép GET để test
  return createResponse({ 
    message: 'Google Apps Script API is running',
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
}

// === PHIẾU BẢO HÀNH ===
function getWarranties() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.WARRANTIES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const warranties = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    return createResponse({ warranties });
  } catch (error) {
    console.error('getWarranties error:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

function addWarranty(warranty) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.WARRANTIES);
    
    // Tạo ID duy nhất
    warranty.id = generateId();
    warranty.created_at = new Date().toISOString();
    
    // Thêm vào sheet
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = headers.map(header => warranty[header] || '');
    sheet.appendRow(newRow);
    
    return createResponse({ 
      success: true, 
      warranty,
      message: 'Phiếu bảo hành đã được thêm thành công'
    });
  } catch (error) {
    console.error('addWarranty error:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

function updateWarranty(id, warranty) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.WARRANTIES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColumn = headers.indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idColumn] === id) {
        warranty.updated_at = new Date().toISOString();
        const newRow = headers.map(header => warranty[header] || data[i][headers.indexOf(header)]);
        sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
        return createResponse({ 
          success: true, 
          warranty,
          message: 'Phiếu bảo hành đã được cập nhật thành công'
        });
      }
    }
    
    return createResponse({ error: 'Không tìm thấy phiếu bảo hành' }, 404);
  } catch (error) {
    console.error('updateWarranty error:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

function deleteWarranty(id) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.WARRANTIES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColumn = headers.indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idColumn] === id) {
        sheet.deleteRow(i + 1);
        return createResponse({ 
          success: true,
          message: 'Phiếu bảo hành đã được xóa thành công'
        });
      }
    }
    
    return createResponse({ error: 'Không tìm thấy phiếu bảo hành' }, 404);
  } catch (error) {
    console.error('deleteWarranty error:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

// === KHÁCH HÀNG ===
function getCustomers() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.CUSTOMERS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const customers = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    return createResponse({ customers });
  } catch (error) {
    console.error('getCustomers error:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

function addCustomer(customer) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.CUSTOMERS);
    
    customer.id = generateId();
    customer.created_at = new Date().toISOString();
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = headers.map(header => customer[header] || '');
    sheet.appendRow(newRow);
    
    return createResponse({ 
      success: true, 
      customer,
      message: 'Khách hàng đã được thêm thành công'
    });
  } catch (error) {
    console.error('addCustomer error:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

function updateCustomer(id, customer) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.CUSTOMERS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColumn = headers.indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idColumn] === id) {
        customer.updated_at = new Date().toISOString();
        const newRow = headers.map(header => customer[header] || data[i][headers.indexOf(header)]);
        sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
        return createResponse({ 
          success: true, 
          customer,
          message: 'Khách hàng đã được cập nhật thành công'
        });
      }
    }
    
    return createResponse({ error: 'Không tìm thấy khách hàng' }, 404);
  } catch (error) {
    console.error('updateCustomer error:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

function deleteCustomer(id) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.CUSTOMERS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColumn = headers.indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idColumn] === id) {
        sheet.deleteRow(i + 1);
        return createResponse({ 
          success: true,
          message: 'Khách hàng đã được xóa thành công'
        });
      }
    }
    
    return createResponse({ error: 'Không tìm thấy khách hàng' }, 404);
  } catch (error) {
    console.error('deleteCustomer error:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

// === YÊU CẦU GIA HẠN ===
function getRenewals() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.RENEWALS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const renewals = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    return createResponse({ renewals });
  } catch (error) {
    console.error('getRenewals error:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

function addRenewal(renewal) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.RENEWALS);
    
    renewal.id = generateId();
    renewal.status = 'pending';
    renewal.created_at = new Date().toISOString();
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = headers.map(header => renewal[header] || '');
    sheet.appendRow(newRow);
    
    return createResponse({ 
      success: true, 
      renewal,
      message: 'Yêu cầu gia hạn đã được gửi thành công'
    });
  } catch (error) {
    console.error('addRenewal error:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

function approveRenewal(id) {
  return updateRenewalStatus(id, 'approved');
}

function rejectRenewal(id) {
  return updateRenewalStatus(id, 'rejected');
}

function updateRenewalStatus(id, status) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.RENEWALS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColumn = headers.indexOf('id');
    const statusColumn = headers.indexOf('status');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idColumn] === id) {
        sheet.getRange(i + 1, statusColumn + 1).setValue(status);
        sheet.getRange(i + 1, headers.indexOf('updated_at') + 1).setValue(new Date().toISOString());
        return createResponse({ 
          success: true,
          message: `Yêu cầu gia hạn đã được ${status === 'approved' ? 'duyệt' : 'từ chối'} thành công`
        });
      }
    }
    
    return createResponse({ error: 'Không tìm thấy yêu cầu gia hạn' }, 404);
  } catch (error) {
    console.error('updateRenewalStatus error:', error);
    return createResponse({ error: error.toString() }, 500);
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
    if (typeof GmailApp === 'undefined') {
      console.error('GmailApp is not available');
      return createResponse({ 
        error: 'Gmail API chưa được bật. Vui lòng thêm Gmail API service trong Apps Script.',
        details: 'GmailApp is undefined'
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
    
    // Gửi email
    const subject = 'Mã xác thực đăng nhập - Hệ thống bảo hành';
    const body = `
      <h2>Mã xác thực đăng nhập</h2>
      <p>Mã xác thực của bạn là: <strong style="font-size: 24px; color: #007bff;">${code}</strong></p>
      <p>Mã này có hiệu lực trong ${CONFIG.CODE_EXPIRY_MINUTES} phút.</p>
      <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
      <hr>
      <p><small>Hệ thống quản lý bảo hành</small></p>
    `;
    
    console.log('Sending email...');
    GmailApp.sendEmail(email, subject, '', {
      htmlBody: body
    });
    
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

// === GIÁ GIA HẠN ===
function getPricing() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.PRICING);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const pricing = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    return createResponse({ pricing });
  } catch (error) {
    console.error('getPricing error:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

function updatePricing(pricing) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.PRICING);
    
    // Xóa dữ liệu cũ
    sheet.clear();
    
    // Thêm headers
    const headers = Object.keys(pricing);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Thêm dữ liệu
    const values = headers.map(header => pricing[header]);
    sheet.getRange(2, 1, 1, values.length).setValues([values]);
    
    return createResponse({ 
      success: true,
      message: 'Giá gia hạn đã được cập nhật thành công'
    });
  } catch (error) {
    console.error('updatePricing error:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

// === MÃ GIẢM GIÁ ===
function getDiscounts() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DISCOUNTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const discounts = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    return createResponse({ discounts });
  } catch (error) {
    console.error('getDiscounts error:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

function addDiscount(discount) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DISCOUNTS);
    
    discount.id = generateId();
    discount.created_at = new Date().toISOString();
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = headers.map(header => discount[header] || '');
    sheet.appendRow(newRow);
    
    return createResponse({ 
      success: true, 
      discount,
      message: 'Mã giảm giá đã được thêm thành công'
    });
  } catch (error) {
    console.error('addDiscount error:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

function updateDiscount(id, discount) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DISCOUNTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColumn = headers.indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idColumn] === id) {
        discount.updated_at = new Date().toISOString();
        const newRow = headers.map(header => discount[header] || data[i][headers.indexOf(header)]);
        sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
        return createResponse({ 
          success: true, 
          discount,
          message: 'Mã giảm giá đã được cập nhật thành công'
        });
      }
    }
    
    return createResponse({ error: 'Không tìm thấy mã giảm giá' }, 404);
  } catch (error) {
    console.error('updateDiscount error:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

function deleteDiscount(id) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DISCOUNTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColumn = headers.indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idColumn] === id) {
        sheet.deleteRow(i + 1);
        return createResponse({ 
          success: true,
          message: 'Mã giảm giá đã được xóa thành công'
        });
      }
    }
    
    return createResponse({ error: 'Không tìm thấy mã giảm giá' }, 404);
  } catch (error) {
    console.error('deleteDiscount error:', error);
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
      switch(sheetName) {
        case CONFIG.SHEETS.WARRANTIES:
          sheet.getRange(1, 1, 1, 8).setValues([[
            'id', 'customer_id', 'customer_name', 'title', 'image', 'start_date', 'end_date', 'created_at'
          ]]);
          break;
        case CONFIG.SHEETS.CUSTOMERS:
          sheet.getRange(1, 1, 1, 6).setValues([[
            'id', 'name', 'phone', 'email', 'address', 'created_at'
          ]]);
          break;
        case CONFIG.SHEETS.RENEWALS:
          sheet.getRange(1, 1, 1, 8).setValues([[
            'id', 'customer_id', 'customer_name', 'amount', 'content', 'bill_url', 'status', 'created_at'
          ]]);
          break;
        case CONFIG.SHEETS.PRICING:
          sheet.getRange(1, 1, 1, 3).setValues([[
            'type', 'price', 'description'
          ]]);
          break;
        case CONFIG.SHEETS.DISCOUNTS:
          sheet.getRange(1, 1, 1, 6).setValues([[
            'id', 'code', 'type', 'value', 'is_active', 'created_at'
          ]]);
          break;
        case CONFIG.SHEETS.VERIFICATION_CODES:
          sheet.getRange(1, 1, 1, 4).setValues([[
            'email', 'code', 'expiry', 'status'
          ]]);
          break;
      }
    }
    
    return sheet;
  } catch (error) {
    console.error('getSheet error:', error);
    throw error;
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function createResponse(data, statusCode = 200) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
