# Cloudflare KV setup (dễ, nhanh, an toàn)

## 1) Tạo KV namespace
- Vào Cloudflare Dashboard → Workers & Pages → KV → Create namespace
- Đặt tên: `WARRANTY_KV`

## 2) Bind KV vào Pages Functions
- Vào project Pages → Settings → Functions → KV Namespaces → Add binding
- Variable name: `WARRANTY_KV`
- KV namespace: chọn `WARRANTY_KV` vừa tạo
- Save → Redeploy

## 3) Test endpoints
- `/api/kv-warranty-data?diag=1` → should return `{ ok: true, hasKV: true }`
- `/api/kv-admin-state?diag=1`

## 4) Chuyển client sang KV
- Với trang khách: dùng `/api/kv-warranty-data`
- Với trang admin: dùng `/api/kv-warranty-data` và `/api/kv-admin-state`

## Ghi chú
- KV phù hợp để lưu JSON gọn nhẹ, tốc độ đọc rất nhanh.
- Toàn bộ truy cập qua Pages Functions nên không lộ key ra client.
