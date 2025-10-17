# 🚀 Hướng dẫn triển khai Google Apps Script

## Tại sao cần Google Apps Script?

- **Lưu trữ dữ liệu**: Thay thế local storage bằng Google Sheets
- **Xác thực 6 số**: Gửi mã xác thực qua Gmail
- **API backend**: Xử lý CRUD operations
- **Bảo mật**: Token và dữ liệu nhạy cảm được ẩn

## Bước 1: Tạo Google Apps Script

1. Truy cập [Google Apps Script](https://script.google.com/)
2. Click "New Project"
3. Xóa code mặc định và paste code từ `google-apps-script.js`
4. Lưu project với tên "Warranty Management API"

## Bước 2: Cấu hình Google Sheet

1. Mở Google Sheet của bạn: `https://docs.google.com/spreadsheets/d/1VjrQ2HfzMuSlqMH5MICCZn9wnSjnIY_co7SOfvHM-vw/edit`
2. Tạo các sheet sau (nếu chưa có):
   - **Warranties**: Phiếu bảo hành
   - **Customers**: Khách hàng  
   - **Renewals**: Yêu cầu gia hạn
   - **Pricing**: Giá gia hạn
   - **Discounts**: Mã giảm giá
   - **VerificationCodes**: Mã xác thực 6 số

3. Cập nhật `SHEET_ID` trong Apps Script:
   ```javascript
   const CONFIG = {
     SHEET_ID: '1VjrQ2HfzMuSlqMH5MICCZn9wnSjnIY_co7SOfvHM-vw', // ID của sheet bạn
     ADMIN_EMAIL: 'giang10012004@gmail.com', // Email admin
     // ...
   };
   ```

## Bước 3: Cấu hình Gmail API

1. Trong Apps Script, click "Services" (+)
2. Tìm và thêm "Gmail API"
3. Chọn version mới nhất
4. Click "Add"

## Bước 4: Deploy Web App

1. Click "Deploy" → "New deployment"
2. Type: "Web app"
3. Execute as: "Me"
4. Who has access: "Anyone with the link"
5. Click "Deploy"
6. Copy Web App URL (dạng: `https://script.google.com/macros/s/SCRIPT_ID/exec`)

## Bước 5: Cập nhật config.js

```javascript
window.APP_CONFIG = {
    // ... các config khác
    GAS_API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
    // ...
};
```

## Bước 6: Test API

Mở browser console và test:

```javascript
// Test gửi mã xác thực
fetch('YOUR_GAS_API_URL', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        action: 'send_verification_code',
        email: 'giang10012004@gmail.com'
    })
}).then(r => r.json()).then(console.log);
```

## Cấu trúc dữ liệu trong Google Sheets

### Sheet: Warranties
| id | customer_id | customer_name | title | image | start_date | end_date | created_at |
|----|-------------|---------------|-------|-------|------------|----------|------------|

### Sheet: Customers  
| id | name | phone | email | address | created_at |
|----|------|-------|-------|---------|------------|

### Sheet: Renewals
| id | customer_id | customer_name | amount | content | bill_url | status | created_at |
|----|-------------|---------------|--------|---------|----------|--------|------------|

### Sheet: Pricing
| type | price | description |
|------|-------|-------------|

### Sheet: Discounts
| id | code | type | value | is_active | created_at |
|----|------|------|-------|-----------|------------|

### Sheet: VerificationCodes
| email | code | expiry | status |
|-------|------|--------|--------|

## API Endpoints

### Xác thực
- `POST /` với `action: 'send_verification_code'`
- `POST /` với `action: 'verify_code'`

### Phiếu bảo hành
- `POST /` với `action: 'get_warranties'`
- `POST /` với `action: 'add_warranty'`
- `POST /` với `action: 'update_warranty'`
- `POST /` với `action: 'delete_warranty'`

### Khách hàng
- `POST /` với `action: 'get_customers'`
- `POST /` với `action: 'add_customer'`
- `POST /` với `action: 'update_customer'`
- `POST /` với `action: 'delete_customer'`

### Yêu cầu gia hạn
- `POST /` với `action: 'get_renewals'`
- `POST /` với `action: 'add_renewal'`
- `POST /` với `action: 'approve_renewal'`
- `POST /` với `action: 'reject_renewal'`

### Giá và mã giảm giá
- `POST /` với `action: 'get_pricing'`
- `POST /` với `action: 'update_pricing'`
- `POST /` với `action: 'get_discounts'`
- `POST /` với `action: 'add_discount'`
- `POST /` với `action: 'update_discount'`
- `POST /` với `action: 'delete_discount'`

## Troubleshooting

### Lỗi: "Script function not found"
- Kiểm tra tên function trong Apps Script
- Đảm bảo function `doPost` và `doGet` tồn tại

### Lỗi: "Gmail API not enabled"
- Bật Gmail API trong Google Cloud Console
- Thêm Gmail API service trong Apps Script

### Lỗi: "Permission denied"
- Kiểm tra quyền truy cập Google Sheet
- Đảm bảo script có quyền edit sheet

### Lỗi: "CORS policy"
- Apps Script tự động xử lý CORS
- Kiểm tra URL API có đúng không

## Bảo mật

1. **Không commit** `config.js` lên Git
2. **Giới hạn quyền** truy cập Google Sheet
3. **Sử dụng HTTPS** cho production
4. **Kiểm tra email** trước khi gửi mã xác thực
5. **Xóa mã cũ** sau khi sử dụng

## Monitoring

- Xem logs trong Apps Script → Executions
- Monitor Gmail API usage
- Kiểm tra Google Sheet changes
- Track failed authentication attempts
