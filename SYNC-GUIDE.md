# Hướng dẫn đồng bộ 2FA và mật khẩu giữa các máy

## Tổng quan

Hệ thống đã được cải thiện để đảm bảo 2FA và mật khẩu được đồng bộ chính xác giữa các máy khác nhau thông qua JSONBin remote storage.

## Các cải tiến chính

### 1. Cơ chế đồng bộ tự động
- **Auto sync**: Tự động đồng bộ mỗi 30 giây khi online
- **Login sync**: Tự động đồng bộ khi đăng nhập thành công
- **Cross-tab sync**: Đồng bộ giữa các tab trong cùng trình duyệt
- **Storage events**: Lắng nghe thay đổi từ các tab khác

### 2. Validation và error handling
- **Data integrity check**: Kiểm tra tính nhất quán của dữ liệu
- **Retry mechanism**: Thử lại tối đa 3 lần khi thất bại
- **Error logging**: Ghi log lỗi để debug
- **Health monitoring**: Theo dõi trạng thái đồng bộ

### 3. Cải thiện consistency
- **Fixed secret keys**: Secret key và challenge cố định cho tất cả máy
- **Unified hash system**: Hệ thống hash mật khẩu thống nhất
- **Version control**: Theo dõi phiên bản dữ liệu
- **Timestamp tracking**: Ghi nhận thời gian cập nhật

## Cách sử dụng

### 1. Đồng bộ tự động
Hệ thống sẽ tự động đồng bộ khi:
- Đăng nhập thành công
- Có thay đổi dữ liệu 2FA/mật khẩu
- Phát hiện thay đổi từ tab khác
- Kết nối mạng trở lại

### 2. Đồng bộ thủ công
Trong trang **Security** (`security.html`), sử dụng các button:

#### **Force Sync All** (Đồng bộ tất cả)
- Đồng bộ toàn bộ hệ thống từ remote
- Cập nhật auth system và security system
- Hiển thị thông báo kết quả

#### **Fix Sync Issues** (Sửa vấn đề đồng bộ)
- Kiểm tra và sửa các vấn đề đồng bộ
- Đồng bộ dữ liệu không nhất quán
- Sửa lỗi 2FA status mismatch

#### **Sync Status** (Trạng thái đồng bộ)
- Hiển thị thông tin chi tiết về trạng thái đồng bộ
- Số lần thất bại liên tiếp
- Thời gian đồng bộ cuối cùng
- Các vấn đề phát hiện

### 3. Kiểm tra trạng thái
```javascript
// Kiểm tra trạng thái đồng bộ
const status = window.syncManager.getSyncStatus();
console.log(status);

// Kiểm tra tính hợp lệ của dữ liệu
const validation = window.syncManager.validateSyncData();
console.log(validation);
```

## Các tính năng mới

### 1. Sync Manager (`assets/sync-manager.js`)
- Quản lý toàn bộ quá trình đồng bộ
- Auto sync với retry mechanism
- Validation và error handling
- Health monitoring

### 2. Cải thiện Remote Store (`assets/remote-store.js`)
- Cache với timestamp validation
- Version control cho dữ liệu
- Sync to global admin account
- Force sync functionality

### 3. Cải thiện Auth System (`assets/auth.js`)
- Consistent secret key và challenge
- Force sync from remote
- Improved persist to remote
- Better error handling

### 4. Cải thiện Security System (`assets/security.js`)
- Immediate persist to remote khi enable/disable 2FA
- Force sync 2FA from remote
- Better integration với sync manager

## Troubleshooting

### Vấn đề thường gặp

#### 1. "Remote store không được cấu hình"
- Kiểm tra JSONBin credentials trong environment variables
- Đảm bảo `/api/admin-state` endpoint hoạt động

#### 2. "2FA status inconsistent"
- Sử dụng button **Fix Sync Issues**
- Hoặc thực hiện **Force Sync All**

#### 3. "Đồng bộ thất bại liên tiếp"
- Kiểm tra kết nối mạng
- Kiểm tra JSONBin API status
- Reset sync status nếu cần

### Debug commands
```javascript
// Reset sync status
window.syncManager.resetSyncStatus();

// Force sync manually
window.syncManager.manualSync();

// Check validation
window.syncManager.validateSyncData();

// Get sync errors
JSON.parse(localStorage.getItem('sync_errors') || '[]');
```

## Cấu trúc dữ liệu

### Global Admin Account
```json
{
  "secretKey": "base64_encoded_secret",
  "challenge": "fixed_challenge_2024",
  "passwordHash": "hashed_password",
  "twoFactorEnabled": true,
  "twoFactorSecret": "base32_secret",
  "lastUpdated": 1234567890,
  "lastRemoteSync": 1234567890
}
```

### Global 2FA Status
```json
{
  "enabled": true,
  "secret": "base32_secret",
  "timestamp": 1234567890
}
```

### Sync Status
```json
{
  "lastSuccessfulSync": 1234567890,
  "lastFailedSync": null,
  "consecutiveFailures": 0,
  "isOnline": true,
  "remoteConfigured": true
}
```

## Lưu ý quan trọng

1. **Secret key cố định**: Tất cả máy sử dụng cùng secret key và challenge
2. **Auto sync**: Hệ thống tự động đồng bộ, không cần can thiệp thủ công
3. **Error handling**: Lỗi được ghi log và có cơ chế retry
4. **Data integrity**: Validation đảm bảo dữ liệu nhất quán
5. **Performance**: Cache và timestamp giúp tránh đồng bộ không cần thiết

## Kết luận

Hệ thống đồng bộ mới đảm bảo:
- ✅ 2FA và mật khẩu đồng bộ chính xác giữa các máy
- ✅ Tự động đồng bộ không cần can thiệp
- ✅ Error handling và retry mechanism
- ✅ Data validation và integrity check
- ✅ Performance optimization với cache
- ✅ User-friendly interface với các button đồng bộ

Vấn đề "2FA và mật khẩu vẫn chưa được đồng bộ qua từng máy" đã được giải quyết hoàn toàn.
