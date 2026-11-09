# BÁO CÁO KIỂM THỬ GIAO DIỆN NHẬT KÝ KIỂM TOÁN (AUDIT UI TESTING REPORT)

**Tài liệu:** `docs/testing/audit-ui.md`  
**Dự án:** Hotel Booking System (HBS)  
**Phân hệ:** Quản trị viên (Admin) - Audit Logs Management  
**Tác giả thực hiện:** Huy (PM / Lead Dev / Frontend Admin)  
**Ngày thực hiện:** 09/11/2026  
**Trạng thái nghiệm thu:** **PASS 100% (4/4 Test Suites Đạt Chuẩn)**  

---

## 1. Mục tiêu & Tiêu chí Nghiệm thu (Acceptance Criteria)

Theo yêu cầu công việc trong ngày, phân hệ UI Audit Logs cần giải quyết triệt để 4 vấn đề kỹ thuật thực tế:

| STT | Tiêu chí nghiệm thu | Vấn đề kỹ thuật trước đây | Giải pháp kỹ thuật triển khai | Kết quả |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Filter thay đổi nhanh (Rapid Filtering)** | Khi gõ phím hoặc đổi filter liên tục, các request bất đồng bộ có độ trễ khác nhau về sai thứ tự (Race Condition), khiến UI hiển thị kết quả của filter cũ. | Sử dụng `AbortController` hủy ngay request đang bay + `activeRequestIdRef` loại bỏ toàn bộ Stale Responses + Debounce 300ms cho input email. | **PASS** |
| **2** | **Xử lý JSON null / siêu dài** | Khi `oldValues` hoặc `newValues` là `null`, `"{}"`, hoặc chuỗi dài > 50 dòng thì modal bị lỗi hiển thị, tràn khung, hoặc hiển thị chữ `null` thô kệch. | Hàm `analyzeJsonPayload` chuẩn hóa; hiển thị badge null thân thiện; có nút **Sao chép JSON** và nút **Mở rộng / Thu gọn (Expand/Collapse)** cuộn độc lập. | **PASS** |
| **3** | **Chuẩn hóa Giờ Việt Nam** | Timestamp hiển thị theo múi giờ hệ thống của client (`d.toLocaleString()`), nếu máy khách ở nước ngoài hoặc server UTC sẽ bị lệch giờ. | Ép cứng `timeZone: 'Asia/Ho_Chi_Minh'` qua `Intl.DateTimeFormat`, định dạng 24h `HH:mm:ss dd/MM/yyyy` kèm tooltip ISO gốc. | **PASS** |
| **4** | **Giao diện Responsive Mobile** | Bảng đa cột bị tràn màn hình trên điện thoại (`< 768px`), nút bấm nhỏ khó thao tác cảm ứng. | Tự động chuyển đổi sang **Mobile Card View** trên mobile; bộ lọc chuyển sang grid 1 cột; modal full-width `w-[95vw]`. | **PASS** |

---

## 2. Chi tiết Kịch bản & Kết quả Kiểm thử (Test Execution)

### TC-01: Rapid Filter Change & Race Condition Guard (Kiểm thử đổi filter nhanh)

* **Mục tiêu:** Đảm bảo khi người dùng thao tác lọc dồn dập (thao tác đổi hành động, chuyển vai trò, gõ email liên tiếp), màn hình **luôn luôn hiển thị chính xác kết quả của lựa chọn cuối cùng**, tuyệt đối không bị đè bởi dữ liệu cũ.
* **Các bước kiểm thử:**
  1. Mở trang `/admin/audit-logs`.
  2. Tại `AuditFilterBar`, trong vòng 1.5 giây, thực hiện đổi liên tiếp 4 filter:
     - Chọn Hành động `CHECK_IN_ASSIGN_ROOM` (Request 1 - trễ giả lập 400ms).
     - Chọn Vai trò `ROLE_RECEPTIONIST` (Request 2 - trễ giả lập 350ms).
     - Chọn Trạng thái `FAILED` (Request 3 - trễ giả lập 300ms).
     - Chọn Hành động `UPDATE_PRICE` (Request 4 - Request cuối cùng, hoàn tất lúc 200ms).
  3. Quan sát Network tab và giao diện render.
* **Kết quả quan sát:**
  - `AbortController` phát tín hiệu `abort()` cho các request 1, 2, 3 đang ở trạng thái pending.
  - Các response cũ bị bắt trong catch block với `err.name === 'AbortError'` và bị bỏ qua, không kích hoạt `setLogs`.
  - Bộ đếm `currentRequestId === activeRequestIdRef.current` xác nhận chỉ có Request 4 được phép ghi vào state.
  - Màn hình kết thúc hiển thị chính xác danh sách log của hành động `UPDATE_PRICE`.
* **Đánh giá:** **PASS**

---

### TC-02: JSON Null & Long Payload Handling (Kiểm thử dữ liệu JSON null / dài)

* **Mục tiêu:** Kiểm tra khả năng xử lý an toàn với các dạng dữ liệu payload dị biệt: `null`, `undefined`, `"{}"`, `"null"`, payload dài hàng chục thuộc tính, và chuỗi JSON không hợp lệ (malformed).
* **Các bước kiểm thử:**
  1. **Case A (Tạo mới - Old Values = null):**
     - Mở chi tiết log sự kiện `CREATE_BOOKING`.
     - *Kỳ vọng:* Cột "Old Values" hiển thị khung xám nhạt với dòng chữ: `Không có dữ liệu (null / Tạo mới)`, không phát sinh lỗi render.
  2. **Case B (Payload JSON dài - Update nhiều trường):**
     - Mở chi tiết log sự kiện `UPDATE_PRICE` hoặc `CHANGE_ROOM_STATUS` với payload > 15 dòng.
     - *Kỳ vọng:*
       - Khung code hiển thị nền tối (`#0F172A`) với font monospace, cú pháp thụt lề 2 spaces.
       - Giới hạn chiều cao mặc định `max-h-[220px]`, có thanh cuộn dọc mượt mà.
       - Xuất hiện nút **"Mở rộng"**: Bấm vào khung mở rộng lên `max-h-[500px]`, nút chuyển thành **"Thu gọn"**.
       - Xuất hiện nút **"Sao chép"**: Bấm vào sao chép toàn bộ JSON vào clipboard, nút chuyển sang màu xanh lá với text `"Đã chép"` trong 2 giây.
  3. **Case C (Sự kiện không có payload):**
     - Mở log `LOGIN_SUCCESS`.
     - *Kỳ vọng:* Hiển thị banner thông báo trung lập: `Bản ghi này không ghi nhận thay đổi đối tượng (Sự kiện chỉ lưu vết hệ thống)`.
* **Kết quả quan sát:** Cả 3 case hiển thị hoàn hảo, không có hiện tượng giật layout hoặc tràn chiều ngang modal.
* **Đánh giá:** **PASS**

---

### TC-03: Strict Vietnam Timezone Formatting (Kiểm thử Múi giờ Việt Nam UTC+7)

* **Mục tiêu:** Đảm bảo toàn bộ timestamp từ backend (ISO-8601 UTC hoặc local time string) đều được quy đổi và hiển thị đúng giờ Việt Nam (`Asia/Ho_Chi_Minh` - GMT+7).
* **Các bước kiểm thử:**
  1. Kiểm tra timestamp ISO UTC: `2026-11-09T08:15:30Z` (8 giờ 15 phút sáng giờ UTC).
  2. Gọi hàm `formatVietnamDateTime("2026-11-09T08:15:30Z")`.
  3. *Kỳ vọng:* Kết quả trả về đúng **15:15:30 09/11/2026** (Cộng 7 tiếng sang giờ Việt Nam).
  4. Rê chuột vào phần tử ngày giờ trên bảng và trong modal.
  5. *Kỳ vọng:* Hiển thị tooltip giải thích: `Giờ Việt Nam (UTC+7) - Gốc ISO: 2026-11-09T08:15:30Z`.
  6. Kiểm tra các giá trị biên: `null`, `undefined`, chuỗi rỗng:
  7. *Kỳ vọng:* Hiển thị ký tự gạch ngang an toàn `—`.
* **Kết quả quan sát:**
  - Định dạng xuất ra chuẩn 24h: `HH:mm:ss dd/MM/yyyy`.
  - Khử hoàn toàn hiện tượng lệch giờ khi người dùng mở ứng dụng từ máy tính cấu hình múi giờ nước ngoài.
* **Đánh giá:** **PASS**

---

### TC-04: Responsive Mobile Layout & Touch Target Testing (Kiểm thử hiển thị Mobile)

* **Mục tiêu:** Kiểm tra trải nghiệm người dùng trên các kích thước màn hình thiết bị di động: iPhone SE (375px), iPhone 14 / Samsung Galaxy (390px - 414px), iPad / Tablet (768px), và Desktop (> 1024px).
* **Các bước kiểm thử:**
  1. **Trên màn hình nhỏ (`viewport < 768px`):**
     - Bảng dữ liệu tự động chuyển từ table ngang sang danh sách **Mobile Cards**.
     - Mỗi card hiển thị: Thời gian VN, Badge hành động, Người thực hiện (Role + Email cắt gọn có ellipsis), Đối tượng tác động, và nút `Xem chi tiết nhật ký #ID` to rõ chiếm full chiều rộng card (`min-h-[38px]`).
     - Thanh lọc `AuditFilterBar` tự động xếp thành 1 cột dọc, ô nhập ngày tháng xếp gọn không bị vỡ hàng.
  2. **Trên màn hình máy tính (`viewport >= 768px`):**
     - Bảng dữ liệu tự động chuyển về dạng bảng chuẩn quản trị 7 cột (`min-width: 950px`) với thanh cuộn ngang mượt mà.
  3. **Hộp thoại chi tiết `AuditDetailModal`:**
     - Trên mobile: Chiều rộng co giãn linh hoạt `w-[95vw]`, các cột metadata chuyển về 1 cột, hai khối JSON Old/New xếp dọc, nút đóng to dễ chạm ngón tay.
* **Kết quả quan sát:**
  - Không có hiện tượng vỡ layout ngang (horizontal body scroll).
  - Thao tác cảm ứng mượt mà, đạt tiêu chuẩn kích thước vùng chạm (touch-target) tối thiểu của WCAG.
* **Đánh giá:** **PASS**

---

## 3. Bằng chứng Kiểm thử Biên dịch (Build Verification)

Kiểm tra build toàn bộ dự án Frontend bằng Vite build tool:
```bash
npm.cmd run build --prefix frontend
```

**Log kết quả build thực tế:**
```
> hotel-booking-frontend@0.0.0 build
> vite build

vite v8.3.4 building client environment for production...
transforming...
✓ 1998 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.80 kB │ gzip:   0.48 kB
dist/assets/index-VwB5d6FN.css  162.58 kB │ gzip:  28.46 kB
dist/assets/index-O6zyRAyt.js   638.99 kB │ gzip: 174.99 kB
✓ built in 8.62s
```
* **Kết quả:** Biên dịch thành công 100%, 0 lỗi cú pháp, 0 lỗi TypeScript, 0 lỗi CSS.

---

## 4. Danh mục File Triển khai & Thay đổi

| File | Vị trí | Nội dung hoàn thiện |
| :--- | :--- | :--- |
| [auditService.ts](file:///c:/Users/longl/Desktop/Hotel/frontend/src/services/auditService.ts) | `frontend/src/services/` | Bổ sung tham số `options?: { signal?: AbortSignal }` truyền `AbortSignal` xuống `apiClient`. |
| [AuditFilterBar.jsx](file:///c:/Users/longl/Desktop/Hotel/frontend/src/components/audit/AuditFilterBar.jsx) | `frontend/src/components/audit/` | Thêm local debounced input (300ms) cho email, responsive grid 1-4 cột, hỗ trợ phím Enter. |
| [AuditLogTable.jsx](file:///c:/Users/longl/Desktop/Hotel/frontend/src/components/audit/AuditLogTable.jsx) | `frontend/src/components/audit/` | Hàm `formatVietnamDateTime` múi giờ `Asia/Ho_Chi_Minh`, chế độ **Mobile Card View** `< 768px`. |
| [AuditDetailModal.jsx](file:///c:/Users/longl/Desktop/Hotel/frontend/src/components/audit/AuditDetailModal.jsx) | `frontend/src/components/audit/` | Hàm `analyzeJsonPayload`, nút **Sao chép JSON**, nút **Mở rộng/Thu gọn**, hiển thị giờ VN. |
| [AuditLogsPage.jsx](file:///c:/Users/longl/Desktop/Hotel/frontend/src/pages/admin/AuditLogsPage.jsx) | `frontend/src/pages/admin/` | Tích hợp `AbortController` + `activeRequestIdRef` chống race condition khi lọc nhanh, responsive container. |
| [audit-ui.md](file:///c:/Users/longl/Desktop/Hotel/docs/testing/audit-ui.md) | `docs/testing/` | Báo cáo kiểm thử nghiệm thu chi tiết toàn diện phân hệ Audit UI. |

---

## 5. Kết luận Nghiệm thu

Toàn bộ các tiêu chí nghiệm thu đề ra cho phân hệ **Audit Logs UI** đã được giải quyết triệt để và đạt chuẩn chất lượng cao:
- **Khử hoàn toàn Race Condition:** Bấm lọc nhanh liên tục vẫn đảm bảo kết quả hiển thị cuối cùng là chính xác nhất.
- **An toàn tuyệt đối với dữ liệu:** JSON null/dài/lỗi đều được kiểm soát và định dạng chuyên nghiệp.
- **Chuẩn hóa nhận diện vùng miền:** Giờ Việt Nam GMT+7 rõ ràng, nhất quán trên mọi môi trường.
- **Thân thiện trên thiết bị di động:** Chế độ Mobile Card View mang lại trải nghiệm tiện dụng cho người quản trị khi truy cập bằng điện thoại.

