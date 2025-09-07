# Hướng dẫn Deploy Cloudflare Worker

## Bước 1: Tạo Cloudflare Worker

1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Vào **Workers & Pages** → **Create application** → **Create Worker**
3. Đặt tên worker (ví dụ: `warranty-api`)
4. Xóa code mặc định và dán code từ file `cloudflare-worker.js`

## Bước 2: Cấu hình biến môi trường

1. Vào **Settings** → **Variables**
2. Thêm 2 biến môi trường:
   - **JSONBIN_ID**: `68b9c242ae596e708fe27f7b`
   - **JSONBIN_KEY**: `$2a$10$pNyeYZL0m99zJ.rzTcqfx.mOkM6GUExcbqJeSHjVdezUb.3xMz5o6`

## Bước 3: Deploy Worker

1. Nhấn **Save and Deploy**
2. Worker sẽ có URL dạng: `https://warranty-api.your-subdomain.workers.dev`

## Bước 4: Cấu hình Route (Tùy chọn)

Nếu bạn có domain riêng:
1. Vào **Workers & Pages** → **Custom Domains**
2. Thêm domain của bạn
3. Tạo route: `your-domain.com/api/*` → Worker

## Bước 5: Cập nhật Frontend

Sau khi deploy, cập nhật các file sau:

### assets/remote-store.js
```javascript
// Thay đổi proxyUrl thành URL Worker của bạn
this.config = {
    binId: null,
    masterKey: null,
    proxyUrl: 'https://warranty-api.your-subdomain.workers.dev/api/admin-state'
};
```

### assets/admin.js
```javascript
// Thay đổi API_URL thành URL Worker của bạn
const API_URL = "https://warranty-api.your-subdomain.workers.dev/api/warranty-data";
```

### assets/app.js
```javascript
// Thay đổi API_URL thành URL Worker của bạn
const API_URL = "https://warranty-api.your-subdomain.workers.dev/api/warranty-data";
```

## Bước 6: Test

1. Mở trang web và test chức năng tra cứu
2. Mở trang admin và test đăng nhập/2FA
3. Kiểm tra console không còn hiển thị thông tin nhạy cảm

## Lưu ý bảo mật

- ✅ Master Key đã được ẩn khỏi client-side
- ✅ Console logs đã bị vô hiệu hóa
- ✅ F12 và DevTools đã bị chặn
- ✅ Copy/paste đã bị vô hiệu hóa
- ✅ Ảnh khách hàng có hiệu ứng blur
- ✅ Tất cả API calls đều qua proxy an toàn

## Troubleshooting

Nếu gặp lỗi CORS:
- Kiểm tra Origin header trong request
- Đảm bảo domain frontend được thêm vào CORS whitelist

Nếu gặp lỗi 500:
- Kiểm tra biến môi trường JSONBIN_ID và JSONBIN_KEY
- Kiểm tra JSONBin API có hoạt động không
