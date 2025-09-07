# 🔐 Hướng dẫn Bảo mật

## ⚠️ QUAN TRỌNG: Bảo vệ thông tin nhạy cảm

### 1. Cấu hình mật khẩu admin
- **Mật khẩu mặc định**: `admin123`
- **Hash SHA-256**: `5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8`
- **Thay đổi mật khẩu**: Sửa `ADMIN_PASSWORD_HASH` trong `login.html`

### 2. Bảo vệ Token và API Key
- **KHÔNG commit** file `config.js` lên Git
- **Sử dụng** file `.gitignore` để bảo vệ
- **Thay đổi** tất cả token/API key trước khi deploy

### 3. Cấu hình JSONBin.io
```javascript
// Trong config.js (KHÔNG commit)
const CONFIG = {
    JSONBIN_ID: "your_bin_id_here",
    JSONBIN_SECRET: "your_secret_key_here",
    IMGBB_API_KEY: "your_imgbb_key_here"
};
```

### 4. Bảo mật nâng cao
- ✅ **Rate Limiting**: Khóa tài khoản sau 5 lần đăng nhập sai
- ✅ **Session Timeout**: Tự động đăng xuất sau 24 giờ
- ✅ **Mã hóa mật khẩu**: SHA-256 hash
- ✅ **Xóa dữ liệu nhạy cảm**: Tự động xóa khỏi memory
- ✅ **Session Token**: Token ngẫu nhiên cho mỗi phiên

### 5. Deploy an toàn
1. **Thay đổi** tất cả mật khẩu và token
2. **Xóa** file `config.js` khỏi repository
3. **Sử dụng** biến môi trường cho production
4. **Kiểm tra** file `.gitignore` đã đúng

### 6. Kiểm tra bảo mật
- [ ] Mật khẩu admin đã được thay đổi
- [ ] Token API đã được cập nhật
- [ ] File `config.js` không có trong Git
- [ ] Rate limiting hoạt động
- [ ] Session timeout hoạt động

## 🚨 Cảnh báo
- **KHÔNG** để mật khẩu gốc trong code
- **KHÔNG** commit token lên Git
- **THAY ĐỔI** tất cả thông tin mặc định
- **KIỂM TRA** quyền truy cập thường xuyên
