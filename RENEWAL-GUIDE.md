# Hướng dẫn sử dụng chức năng gia hạn bảo hành

## Tổng quan

Hệ thống gia hạn bảo hành đã được cải thiện để đảm bảo khi admin duyệt đơn yêu cầu gia hạn, ngày bảo hành sẽ được tự động cộng thêm cho tất cả phiếu bảo hành của khách hàng.

## Các cải tiến chính

### 1. Sửa lỗi logic duyệt gia hạn
- **Trước**: Chỉ tìm 1 phiếu bảo hành đầu tiên
- **Sau**: Tìm TẤT CẢ phiếu bảo hành của khách hàng
- **Kết quả**: Tất cả phiếu bảo hành của khách đều được gia hạn

### 2. Cải thiện UI quản lý gia hạn
- **Status badges**: Hiển thị trạng thái rõ ràng (Chờ duyệt, Đã duyệt, Từ chối)
- **Action buttons**: Duyệt, Từ chối, Xem chi tiết phiếu bảo hành
- **Thông tin chi tiết**: Hiển thị thời gian tạo, duyệt, số phiếu được cập nhật

### 3. Thêm chức năng từ chối gia hạn
- **Confirm dialog**: Xác nhận trước khi từ chối
- **Status tracking**: Theo dõi thời gian từ chối
- **UI feedback**: Hiển thị trạng thái từ chối

### 4. Cải thiện thông báo
- **Chi tiết hơn**: Hiển thị số phiếu được cập nhật
- **Thông tin khách hàng**: Tên và ID khách hàng
- **Số ngày gia hạn**: Số ngày được cộng thêm

## Cách sử dụng

### 1. Khách hàng tạo yêu cầu gia hạn
1. Vào trang `renew.html?id=KH001&name=TênKhách`
2. Điền thông tin:
   - Số ngày muốn gia hạn
   - Số tiền thanh toán
   - Nội dung chuyển khoản
   - Upload hóa đơn (tùy chọn)
3. Nhấn "Gửi yêu cầu gia hạn"

### 2. Admin duyệt yêu cầu gia hạn
1. Vào trang `admin.html`
2. Chọn tab "Yêu cầu gia hạn"
3. Xem danh sách yêu cầu chờ duyệt
4. Các thao tác có thể thực hiện:

#### **Xem chi tiết phiếu bảo hành** (👁️)
- Hiển thị tất cả phiếu bảo hành của khách hàng
- Thông tin: Tiêu đề, ngày bắt đầu, ngày kết thúc
- Giúp admin hiểu rõ trước khi duyệt

#### **Duyệt gia hạn** (✅)
- Tự động cộng ngày cho TẤT CẢ phiếu bảo hành của khách
- Cập nhật ngày kết thúc = ngày cũ + số ngày gia hạn
- Lưu thay đổi vào database
- Đánh dấu yêu cầu là "Đã duyệt"

#### **Từ chối gia hạn** (❌)
- Hiển thị dialog xác nhận
- Đánh dấu yêu cầu là "Từ chối"
- Không thay đổi ngày bảo hành

### 3. Theo dõi kết quả
- **Thông báo thành công**: Hiển thị số phiếu được cập nhật
- **UI cập nhật**: Bảng gia hạn và danh sách phiếu bảo hành tự động refresh
- **Lịch sử**: Lưu thời gian duyệt/từ chối

## Cấu trúc dữ liệu

### Renewal Request
```json
{
  "id": "KH001",
  "name": "Nguyễn Văn An", 
  "days": 30,
  "amount": 200000,
  "content": "Gia hạn bảo hành 30 ngày",
  "billUrl": "https://example.com/bill.jpg",
  "status": "pending|approved|rejected",
  "createdAt": 1234567890,
  "approvedAt": 1234567890,
  "rejectedAt": 1234567890,
  "updatedWarranties": 2
}
```

### Warranty Record (sau khi gia hạn)
```json
{
  "id": "KH001",
  "name": "Nguyễn Văn An",
  "title": "Bảo hành điện thoại iPhone 14",
  "start": "2024-01-15",
  "end": "2025-02-14",  // Đã được cộng thêm 30 ngày
  "image": "https://example.com/warranty.jpg"
}
```

## Test và Debug

### 1. Sử dụng Test Tool
- Mở `test-renewal-system.html`
- Tạo dữ liệu test
- Test quy trình duyệt gia hạn
- Kiểm tra kết quả

### 2. Debug trong Console
```javascript
// Xem tất cả yêu cầu gia hạn
console.log(window.adminExtras.renewals);

// Xem tất cả phiếu bảo hành
console.log(window.allWarranties);

// Test function duyệt gia hạn
approveRenewal(0); // Duyệt yêu cầu đầu tiên
```

### 3. Kiểm tra kết quả
- Vào trang `index.html` để xem phiếu bảo hành của khách
- Kiểm tra ngày kết thúc đã được cộng thêm chưa
- Xác nhận tất cả phiếu bảo hành của khách đều được gia hạn

## Lưu ý quan trọng

### 1. Logic gia hạn
- **Tất cả phiếu**: Gia hạn TẤT CẢ phiếu bảo hành của khách hàng
- **Cộng ngày**: Ngày kết thúc mới = ngày cũ + số ngày gia hạn
- **Không ghi đè**: Chỉ cộng thêm, không thay thế ngày gốc

### 2. Xử lý lỗi
- **Không tìm thấy phiếu**: Hiển thị thông báo lỗi rõ ràng
- **Dữ liệu không hợp lệ**: Validate trước khi xử lý
- **Lỗi lưu database**: Rollback và thông báo lỗi

### 3. Performance
- **Batch update**: Cập nhật tất cả phiếu trong 1 lần
- **UI feedback**: Hiển thị loading và kết quả
- **Auto refresh**: Tự động cập nhật UI sau khi xử lý

## Troubleshooting

### Vấn đề: "Không tìm thấy phiếu bảo hành"
**Nguyên nhân**: Customer ID không khớp
**Giải pháp**: 
- Kiểm tra Customer ID trong yêu cầu gia hạn
- Kiểm tra Customer ID trong phiếu bảo hành
- Đảm bảo format ID nhất quán

### Vấn đề: "Chỉ 1 phiếu được gia hạn"
**Nguyên nhân**: Logic cũ chỉ tìm phiếu đầu tiên
**Giải pháp**: Đã sửa trong code mới, sử dụng `filter()` thay vì `find()`

### Vấn đề: "Ngày không được cộng đúng"
**Nguyên nhân**: Lỗi tính toán ngày
**Giải pháp**: 
- Kiểm tra format ngày (YYYY-MM-DD)
- Kiểm tra logic cộng ngày
- Test với dữ liệu mẫu

## Kết luận

Vấn đề **"khi duyệt đơn yêu cầu gia hạn sao không cộng ngày bảo hành cho khách"** đã được giải quyết hoàn toàn:

- ✅ **Tìm tất cả phiếu bảo hành** của khách hàng
- ✅ **Cộng ngày cho tất cả phiếu** bảo hành
- ✅ **UI cải thiện** với status badges và action buttons
- ✅ **Thêm chức năng từ chối** gia hạn
- ✅ **Thông báo chi tiết** về kết quả
- ✅ **Test tool** để kiểm tra chức năng
- ✅ **Error handling** và validation

Hệ thống bây giờ sẽ tự động cộng ngày bảo hành cho TẤT CẢ phiếu bảo hành của khách hàng khi admin duyệt yêu cầu gia hạn.
