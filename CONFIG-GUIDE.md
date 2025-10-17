# 🔐 Hướng dẫn cấu hình bảo mật

## Tại sao cần ẩn token?

- **Bảo mật**: Token và API key không được hiển thị trong code
- **Bảo vệ tài khoản**: Tránh lộ thông tin Google OAuth
- **Tuân thủ best practices**: Code sạch, dễ bảo trì

## Cách cấu hình

### 1. Tạo file cấu hình
```bash
# Sao chép file mẫu
cp config.example.js config.js
```

### 2. Điền thông tin vào `config.js`
```javascript
window.APP_CONFIG = {
    // Google OAuth - Lấy từ Google Cloud Console
    GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    ADMIN_GOOGLE_EMAIL: 'admin@gmail.com',
    
    // Google Sheets (Excel online)
    GS_PUBLISHED_CSV_URL: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/pub?output=csv',
    
    // Các cấu hình khác
    API_BASE_URL: '/api',
    APP_NAME: 'Hệ thống tra cứu bảo hành',
    VERSION: '1.0.0',
    DEBUG: false
};
```

### 3. Lấy Google OAuth Client ID
1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Chọn project hoặc tạo mới
3. APIs & Services → Credentials
4. Create Credentials → OAuth 2.0 Client IDs
5. Application type: Web application
6. Authorized JavaScript origins:
   - `http://localhost:5500`
   - `http://127.0.0.1:5500`
   - Domain deploy của bạn (nếu có)
7. Copy Client ID vào `config.js`

### 4. Cấu hình Google Sheets
1. Mở Google Sheets của bạn
2. File → Publish to the web
3. Chọn tab chứa dữ liệu
4. Format: Comma-separated values (.csv)
5. Publish → Copy link
6. Paste vào `GS_PUBLISHED_CSV_URL`

### 5. Cấu hình Git (quan trọng!)
File `config.js` đã được thêm vào `.gitignore` để không commit lên Git.

## Cấu trúc file

```
tracuu/
├── config.js              # ⚠️ KHÔNG commit - chứa token thật
├── config.example.js       # ✅ Có thể commit - file mẫu
├── .gitignore             # ✅ Có thể commit - loại trừ config.js
├── login.html             # ✅ Có thể commit - load config.js
├── admin.html             # ✅ Có thể commit - load config.js
├── index.html             # ✅ Có thể commit - load config.js
└── assets/
    ├── app.js             # ✅ Có thể commit - sử dụng config
    └── google-auth.js     # ✅ Có thể commit - sử dụng config
```

## Lưu ý bảo mật

1. **KHÔNG BAO GIỜ** commit file `config.js` lên Git
2. **KHÔNG BAO GIỜ** chia sẻ file `config.js` với ai
3. **LUÔN** sử dụng `config.example.js` làm mẫu
4. **KIỂM TRA** `.gitignore` có chứa `config.js`
5. **BACKUP** file `config.js` ở nơi an toàn

## Troubleshooting

### Lỗi: "Không tìm thấy file config.js"
- Tạo file `config.js` từ `config.example.js`
- Điền đầy đủ thông tin cấu hình

### Lỗi: "The given origin is not allowed"
- Thêm domain vào Google Cloud Console
- Đảm bảo chạy trên localhost:5500, không mở file trực tiếp

### Lỗi: "Failed to load resource: 403"
- Kiểm tra Google OAuth Client ID
- Kiểm tra Authorized JavaScript origins

## Deploy lên server

1. Tạo file `config.js` trên server
2. Điền thông tin cấu hình thật
3. Đảm bảo file có quyền đọc
4. Cập nhật Google OAuth origins với domain thật
