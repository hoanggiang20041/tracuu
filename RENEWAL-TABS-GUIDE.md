# Hướng dẫn sử dụng chức năng Tab Yêu cầu Gia hạn

## Tổng quan

Hệ thống quản lý yêu cầu gia hạn đã được cải thiện với giao diện tab để chia yêu cầu thành 3 nhóm rõ ràng: **Chưa duyệt**, **Đã duyệt**, và **Từ chối**.

## Các tính năng mới

### 1. Giao diện Tab
- **3 tab chính**: Chưa duyệt, Đã duyệt, Từ chối
- **Badge đếm số**: Hiển thị số lượng yêu cầu trong mỗi tab
- **Chuyển đổi mượt mà**: Click để chuyển giữa các tab
- **URL bookmarking**: Lưu trạng thái tab trong URL

### 2. Tab "Chưa duyệt" (Pending)
- **Hiển thị**: Tất cả yêu cầu chờ xử lý
- **Thao tác**: Xem, Duyệt, Từ chối
- **Thông tin**: ID khách, tên, số ngày, số tiền, thời gian tạo
- **Action buttons**:
  - 👁️ **Xem phiếu bảo hành**: Hiển thị chi tiết phiếu bảo hành của khách
  - ✅ **Duyệt**: Duyệt yêu cầu và cộng ngày bảo hành
  - ❌ **Từ chối**: Từ chối yêu cầu gia hạn

### 3. Tab "Đã duyệt" (Approved)
- **Hiển thị**: Tất cả yêu cầu đã được duyệt
- **Thông tin**: ID khách, tên, số ngày, số tiền, thời gian duyệt
- **Kết quả**: Số phiếu bảo hành đã được cập nhật
- **Trạng thái**: ✅ Đã duyệt với thông tin chi tiết

### 4. Tab "Từ chối" (Rejected)
- **Hiển thị**: Tất cả yêu cầu đã bị từ chối
- **Thông tin**: ID khách, tên, số ngày, số tiền, thời gian từ chối
- **Trạng thái**: ❌ Đã từ chối

## Cách sử dụng

### 1. Xem danh sách yêu cầu
1. Vào trang `admin.html`
2. Chọn tab "Yêu cầu gia hạn"
3. Mặc định hiển thị tab "Chưa duyệt"
4. Click vào tab khác để xem yêu cầu đã xử lý

### 2. Duyệt yêu cầu gia hạn
1. Ở tab "Chưa duyệt", tìm yêu cầu cần duyệt
2. Click **👁️** để xem phiếu bảo hành của khách
3. Click **✅** để duyệt yêu cầu
4. Hệ thống sẽ:
   - Tự động cộng ngày cho TẤT CẢ phiếu bảo hành của khách
   - Chuyển sang tab "Đã duyệt" để hiển thị kết quả
   - Hiển thị thông báo thành công

### 3. Từ chối yêu cầu gia hạn
1. Ở tab "Chưa duyệt", tìm yêu cầu cần từ chối
2. Click **❌** để từ chối yêu cầu
3. Xác nhận trong dialog
4. Hệ thống sẽ:
   - Đánh dấu yêu cầu là "Từ chối"
   - Chuyển sang tab "Từ chối" để hiển thị kết quả
   - Hiển thị thông báo từ chối

### 4. Theo dõi kết quả
- **Tab "Đã duyệt"**: Xem tất cả yêu cầu đã được xử lý thành công
- **Tab "Từ chối"**: Xem tất cả yêu cầu đã bị từ chối
- **Badge đếm số**: Theo dõi số lượng yêu cầu trong mỗi trạng thái

## Cải tiến kỹ thuật

### 1. Cấu trúc HTML mới
```html
<!-- Renewal Tabs -->
<div class="renewal-tabs">
    <button class="renewal-tab-btn active" onclick="switchRenewalTab('pending')">
        <i class="fas fa-clock"></i> Chưa duyệt <span class="badge badge-warning">0</span>
    </button>
    <button class="renewal-tab-btn" onclick="switchRenewalTab('approved')">
        <i class="fas fa-check-circle"></i> Đã duyệt <span class="badge badge-success">0</span>
    </button>
    <button class="renewal-tab-btn" onclick="switchRenewalTab('rejected')">
        <i class="fas fa-times-circle"></i> Từ chối <span class="badge badge-danger">0</span>
    </button>
</div>
```

### 2. JavaScript Functions mới
- `switchRenewalTab(type)`: Chuyển đổi giữa các tab
- `updateRenewalTabCounts(counts)`: Cập nhật số đếm trên badge
- `renderRenewalSection(type, renewals)`: Render từng section riêng biệt
- `initializeRenewalTabs()`: Khởi tạo tab system

### 3. CSS Styling
- **Tab buttons**: Thiết kế đẹp mắt với hover effects
- **Active state**: Highlight tab đang được chọn
- **Badge styling**: Badge đếm số với màu sắc phù hợp
- **Responsive**: Tương thích với mobile

## Lợi ích

### 1. Quản lý dễ dàng hơn
- **Tách biệt rõ ràng**: Chưa duyệt vs Đã duyệt
- **Tập trung xử lý**: Chỉ hiển thị yêu cầu cần xử lý
- **Theo dõi lịch sử**: Xem lại các yêu cầu đã xử lý

### 2. UX tốt hơn
- **Badge đếm số**: Biết ngay có bao nhiêu yêu cầu chờ xử lý
- **Chuyển đổi mượt mà**: Không cần reload trang
- **URL bookmarking**: Có thể bookmark tab cụ thể

### 3. Workflow hiệu quả
- **Tự động chuyển tab**: Sau khi duyệt/từ chối
- **Thông tin chi tiết**: Hiển thị đầy đủ thông tin cần thiết
- **Action buttons**: Thao tác trực tiếp trên từng yêu cầu

## Test và Debug

### 1. Sử dụng Test Tool
- Mở `test-renewal-tabs.html`
- Test chức năng chuyển đổi tab
- Test quy trình duyệt/từ chối
- Test performance

### 2. Debug trong Console
```javascript
// Xem trạng thái tab hiện tại
console.log(currentTab);

// Chuyển sang tab cụ thể
switchRenewalTab('approved');

// Xem số lượng yêu cầu theo trạng thái
const counts = {
    pending: adminExtras.renewals.filter(r => r.status === 'pending').length,
    approved: adminExtras.renewals.filter(r => r.status === 'approved').length,
    rejected: adminExtras.renewals.filter(r => r.status === 'rejected').length
};
console.log(counts);
```

### 3. URL Hash Support
- `#renewals-pending`: Mở tab "Chưa duyệt"
- `#renewals-approved`: Mở tab "Đã duyệt"  
- `#renewals-rejected`: Mở tab "Từ chối"

## Cấu trúc dữ liệu

### Renewal Request với thông tin mới
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
  "approvedAt": 1234567890,      // Thời gian duyệt
  "rejectedAt": 1234567890,      // Thời gian từ chối
  "updatedWarranties": 2         // Số phiếu được cập nhật
}
```

## Lưu ý quan trọng

### 1. Tương thích ngược
- **Dữ liệu cũ**: Vẫn hoạt động với yêu cầu không có `approvedAt`/`rejectedAt`
- **Default status**: Yêu cầu không có status sẽ được coi là "pending"

### 2. Performance
- **Lazy rendering**: Chỉ render tab đang hiển thị
- **Efficient filtering**: Filter data một lần, render nhiều lần
- **Memory management**: Không lưu trữ DOM elements không cần thiết

### 3. Accessibility
- **Keyboard navigation**: Có thể dùng phím để chuyển tab
- **Screen reader**: Hỗ trợ đọc màn hình
- **Focus management**: Focus được quản lý đúng cách

## Kết luận

Chức năng **"trong yêu cầu gia hạn chia ra là chưa duyệt và đã duyệt"** đã được triển khai hoàn chỉnh với:

- ✅ **3 tab riêng biệt**: Chưa duyệt, Đã duyệt, Từ chối
- ✅ **Badge đếm số**: Hiển thị số lượng yêu cầu trong mỗi tab
- ✅ **Chuyển đổi mượt mà**: Click để chuyển giữa các tab
- ✅ **Tự động chuyển tab**: Sau khi duyệt/từ chối
- ✅ **URL bookmarking**: Lưu trạng thái tab trong URL
- ✅ **UI/UX cải thiện**: Giao diện đẹp và dễ sử dụng
- ✅ **Test tools**: Công cụ test toàn diện

Hệ thống bây giờ giúp admin quản lý yêu cầu gia hạn một cách hiệu quả và trực quan hơn rất nhiều.
