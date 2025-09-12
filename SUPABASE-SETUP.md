# Hướng dẫn setup Supabase thay thế JSONBin

## 1. Tạo tài khoản Supabase
- Truy cập: https://supabase.com
- Đăng ký/đăng nhập bằng GitHub/Google
- Tạo project mới

## 2. Tạo bảng dữ liệu
Vào SQL Editor và chạy:

```sql
-- Tạo bảng admin_state
CREATE TABLE admin_state (
    id SERIAL PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo bảng warranty_data  
CREATE TABLE warranty_data (
    id SERIAL PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cấp quyền public read/write
ALTER TABLE admin_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_data ENABLE ROW LEVEL SECURITY;

-- Policy cho phép mọi người đọc/ghi (tạm thời)
CREATE POLICY "Enable all access for admin_state" ON admin_state FOR ALL USING (true);
CREATE POLICY "Enable all access for warranty_data" ON warranty_data FOR ALL USING (true);
```

## 3. Lấy API credentials
- Vào Settings → API
- Copy:
  - **Project URL** (SUPABASE_URL)
  - **anon public** key (SUPABASE_ANON_KEY)

## 4. Cấu hình Cloudflare
Thêm vào Environment Variables:
- `SUPABASE_URL`: Project URL từ bước 3
- `SUPABASE_ANON_KEY`: anon public key từ bước 3

## 5. Test API mới
- `/api/supabase-admin-state?diag=1`
- `/api/supabase-warranty-data?diag=1`

## 6. Cập nhật client code
Thay đổi baseUrl trong `assets/remote-store.js`:
```javascript
this.baseUrl = '/api/supabase-admin-state'; // thay vì /api/admin-state
```

## Ưu điểm Supabase
- ✅ Free tier: 500MB, 50k requests/tháng
- ✅ PostgreSQL database
- ✅ REST API tương tự JSONBin
- ✅ Real-time sync (có thể dùng sau)
- ✅ Không giới hạn requests như JSONBin

## Migration từ JSONBin
1. Export dữ liệu từ JSONBin (nếu có)
2. Import vào Supabase bằng API PUT
3. Cập nhật client code
4. Test hoạt động
