// Google Apps Script - Lưu trữ dữ liệu khách hàng và phiếu bảo hành
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

// Hàm chính xử lý request
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch(action) {
      case 'get_warranties':
        return getWarranties();
      case 'get_customers':
        return getCustomers();
      case 'add_warranty':
        return addWarranty(data.warranty);
      case 'update_warranty':
        return updateWarranty(data.id, data.warranty);
      case 'delete_warranty':
        return deleteWarranty(data.id);
      case 'add_customer':
        return addCustomer(data.customer);
      case 'update_customer':
        return updateCustomer(data.id, data.customer);
      case 'delete_customer':
        return deleteCustomer(data.id);
      case 'get_renewals':
        return getRenewals();
      case 'add_renewal':
        return addRenewal(data.renewal);
      case 'approve_renewal':
        return approveRenewal(data.id);
      case 'reject_renewal':
        return rejectRenewal(data.id);
      case 'get_pricing':
        return getPricing();
      case 'update_pricing':
        return updatePricing(data.pricing);
      case 'get_discounts':
        return getDiscounts();
      case 'add_discount':
        return addDiscount(data.discount);
      case 'update_discount':
        return updateDiscount(data.id, data.discount);
      case 'delete_discount':
        return deleteDiscount(data.id);
      case 'send_verification_code':
        return sendVerificationCode(data.email);
      case 'verify_code':
        return verifyCode(data.email, data.code);
      default:
        return createResponse({ error: 'Action not found' }, 400);
    }
  } catch (error) {
    return createResponse({ error: error.toString() }, 500);
  }
}

function doGet(e) {
  // Chỉ cho phép GET để test
  return createResponse({ 
    message: 'Google Apps Script API is running',
    timestamp: new Date().toISOString()
  });
}

// === PHIẾU BẢO HÀNH ===
function getWarranties() {
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
}

function addWarranty(warranty) {
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
}

function updateWarranty(id, warranty) {
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
}

function deleteWarranty(id) {
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
}

// === KHÁCH HÀNG ===
function getCustomers() {
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
}

function addCustomer(customer) {
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
}

function updateCustomer(id, customer) {
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
}

function deleteCustomer(id) {
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
}

// === YÊU CẦU GIA HẠN ===
function getRenewals() {
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
}

function addRenewal(renewal) {
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
}

function approveRenewal(id) {
  return updateRenewalStatus(id, 'approved');
}

function rejectRenewal(id) {
  return updateRenewalStatus(id, 'rejected');
}

function updateRenewalStatus(id, status) {
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
}

// === XÁC THỰC 6 SỐ QUA EMAIL ===
function sendVerificationCode(email) {
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
  
  try {
    GmailApp.sendEmail(email, subject, '', {
      htmlBody: body
    });
    
    return createResponse({ 
      success: true,
      message: 'Mã xác thực đã được gửi đến email của bạn'
    });
  } catch (error) {
    return createResponse({ 
      error: 'Không thể gửi email. Vui lòng thử lại sau.',
      details: error.toString()
    }, 500);
  }
}

function verifyCode(email, code) {
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
}

// === GIÁ GIA HẠN ===
function getPricing() {
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
}

function updatePricing(pricing) {
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
}

// === MÃ GIẢM GIÁ ===
function getDiscounts() {
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
}

function addDiscount(discount) {
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
}

function updateDiscount(id, discount) {
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
}

function deleteDiscount(id) {
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
}

// === HÀM HỖ TRỢ ===
function getSheet(sheetName) {
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
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function createResponse(data, statusCode = 200) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
