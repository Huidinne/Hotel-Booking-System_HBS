# Hướng Dẫn Kiểm Thử Hồi Quy API Timeline & Bàn Giao Tích Hợp (PMS Calendar)

> **Mã công việc:** [SP2-1103-DUCANH] Kiểm thử hồi quy API Timeline và sửa lỗi tích hợp  
> **Quy chuẩn tài liệu:** Bám sát tuyệt đối đặc tả **SRS §FR-13 (FR-13.1, FR-13.2, FR-13.3, FR-13.4)**, **SRS §2.5 (Vòng đời buồng phòng)** & **SRS §11.7, §11.8 (Ma trận phân quyền & Nghiệm thu API Contract)**  
> **Người thực hiện:** Đức Anh (Dev BE)  
> **Người tiếp nhận bàn giao:** Huy (Team Lead / PM), Yến (Frontend Dev)  

---

## 1. Bảng Đối Chiếu Tuyệt Đối với Đặc Tả SRS

| Điều khoản SRS | Nội dung yêu cầu trong SRS | Hiện thực trong Backend / API | Test Case kiểm chứng (H2 & MockMvc) |
| :--- | :--- | :--- | :--- |
| **SRS §FR-13.1** | **Ma trận Buồng phòng PMS:** Trục dọc phân nhóm theo Loại phòng/Tầng; Trục ngang là chuỗi ngày trong tháng (1 đến 30/31 ngày). | `RoomTimelineResponse` chứa `roomId`, `roomNumber`, `floor`, `roomTypeId`, `roomTypeName` sắp xếp `ORDER BY floor ASC, roomNumber ASC`. Chuỗi ngày liên tục `dailyStatuses`. | `TC01`, `TC02`, `IT01`, `IT02` |
| **SRS §FR-13.2** | **5 Mã màu trạng thái chuẩn PMS quốc tế:**<br>- `AVAILABLE`: Phòng trống (trắng/xám)<br>- `CONFIRMED`: Đã giữ chỗ (xanh dương)<br>- `CHECKED_IN`: Đang lưu trú (xanh lá)<br>- `CLEANING`: Cần dọn dẹp (cam)<br>- `MAINTENANCE`: Đang bảo trì (đỏ) | Enum `RoomTimelineStatus`: `AVAILABLE`, `CONFIRMED`, `CHECKED_IN`, `CLEANING`, `MAINTENANCE`. Ưu tiên: `MAINTENANCE` > `CLEANING` hôm nay > `CHECKED_IN` > `CONFIRMED` > `AVAILABLE`. | `TC03`, `TC04`, `TC05`, `IT07` |
| **SRS §FR-13.3** | **Thao tác nhanh trên Lịch:** Lễ tân click dải phòng xem tóm tắt (Khách, SĐT, Ngày đến/đi, Tiền đã thanh toán, Tổng tiền, Mã đơn). | `RoomDailyStatusDTO` chứa: `bookingId`, `bookingCode`, `customerName`, `customerPhone`, `checkInDate`, `checkOutDate`, `depositAmount`, `paidAmount`, `totalPrice`. | `TC11`, `IT07`, `IT12` |
| **SRS §FR-13.4** | **Backend Matrix API & Chống N+1:** Endpoint `/api/v1/rooms/timeline?startDate=...&endDate=...` trả về mảng dữ liệu tối ưu hóa truy vấn 2-query bulk fetch. | 1 Query lấy Rooms + Eager fetch RoomType; 1 Query `findActiveBookingRoomsBetween` JOIN FETCH triệt để Room, Booking, User, RoomType. Không phát sinh N+1. | `TC06`, `IT01`, `IT08` |
| **SRS §2.5** | **Vòng đời lưu trú & Bàn giao liền kề:** Khách A trả phòng sáng $D$, Khách B nhận phòng chiều $D$ (Check-in 14:00, Check-out 12:00). | Ngày $D$ hiển thị chính xác Khách B nhận phòng. Ngày $D-1$ là Khách A. Không xung đột hay đè mất dữ liệu. | `TC09`, `IT09` |
| **SRS §11.7** | **Ma trận phân quyền:** Public = ❌, Customer = ❌ (403), Receptionist = ✅ (200), Admin = ✅ (200). | `@PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN')")`. Khách hàng bị chặn `403 Forbidden`, không lộ dữ liệu khách sạn. | `IT01`, `IT02`, `IT03`, `IT04` |
| **SRS §11.8** | **Tiêu chí nghiệm thu API Contract:** OpenAPI/Swagger, camelCase, kiểm tra JWT, validation ngày (`endDate >= startDate`, tối đa 31 ngày). | Đầy đủ OpenAPI docs, format ISO 8601 `YYYY-MM-DD`, validate 400 Bad Request khi dữ liệu ngày không hợp lệ. | `TC08`, `IT05`, `IT06`, `IT13` |

---

## 2. Cập Nhật API Contract Thực Tế (Timeline Matrix Contract)

### 1.1. Thông tin Endpoint
- **URL chính thức:** `GET /api/v1/rooms/timeline`
- **Alias hỗ trợ tương thích:** `GET /api/v1/receptionist/rooms/timeline`
- **Phân quyền (RBAC):** `ROLE_ADMIN` hoặc `ROLE_RECEPTIONIST` (Theo SRS §11.7). Khách hàng (`ROLE_CUSTOMER`) và Chưa đăng nhập bị chặn tuyệt đối.
- **Query Parameters:**
  | Tham số | Kiểu dữ liệu | Bắt buộc | Mô tả |
  | :--- | :--- | :---: | :--- |
  | `startDate` | `LocalDate` (`YYYY-MM-DD`) | **Có** | Ngày bắt đầu ma trận timeline (ISO 8601) |
  | `endDate` | `LocalDate` (`YYYY-MM-DD`) | **Có** | Ngày kết thúc ma trận timeline (`endDate >= startDate`, tối đa 31 ngày) |
  | `roomTypeId` | `Long` | Không | ID loại phòng cần lọc (bỏ trống nếu xem toàn bộ) |

### 1.2. Cấu trúc Response JSON Thực Tế
```json
{
  "success": true,
  "message": "Thành công",
  "data": [
    {
      "roomId": 1,
      "roomNumber": "101",
      "floor": 1,
      "roomTypeId": 1,
      "roomTypeName": "Deluxe Room",
      "currentPhysicalStatus": "AVAILABLE",
      "dailyStatuses": [
        {
          "date": "2026-11-01",
          "status": "CONFIRMED",
          "bookingId": 105,
          "bookingCode": "BK-20261101-001",
          "customerName": "Nguyễn Văn Khách",
          "customerPhone": "0988776655",
          "checkInDate": "2026-11-01",
          "checkOutDate": "2026-11-03",
          "depositAmount": 1200000.00,
          "paidAmount": 1200000.00,
          "totalPrice": 2400000.00,
          "roomNumber": "101",
          "roomTypeName": "Deluxe Room",
          "floor": 1,
          "bookingStatus": "CONFIRMED"
        },
        {
          "date": "2026-11-03",
          "status": "AVAILABLE",
          "bookingId": null,
          "bookingCode": null,
          "customerName": null,
          "customerPhone": null,
          "checkInDate": null,
          "checkOutDate": null,
          "depositAmount": null,
          "paidAmount": null,
          "totalPrice": null,
          "roomNumber": null,
          "roomTypeName": null,
          "floor": null,
          "bookingStatus": null
        }
      ]
    }
  ]
}
```

---

## 2. Bảng Đối Chiếu DTO Backend với Popup Xem Nhanh của Yến (`BookingQuickViewModal.jsx`)

Qua rà soát mã nguồn commit `f13de7a` của Yến tại [`BookingQuickViewModal.jsx`](file:///c:/Users/OS/Hotel-Booking-System_HBS/frontend/src/components/booking/BookingQuickViewModal.jsx), Backend đã bổ sung đầy đủ và khớp 100% dữ liệu để popup hiển thị ngay lập tức (sub-10ms) mà **không cần gọi thêm API phụ**:

| Trường UI trên Popup Yến | Nguồn dữ liệu từ Backend (`RoomDailyStatusDTO`) | Trạng thái tích hợp | Ghi chú kỹ thuật |
| :--- | :--- | :---: | :--- |
| **Mã đơn đặt** (`current.bookingCode`) | `dto.getBookingCode()` |  Khớp 100% | Ví dụ: `BK-20261101-001` |
| **Mã ID** (`current.bookingId`) | `dto.getBookingId()` |  Khớp 100% | ID số nguyên của đơn |
| **Tên khách hàng** (`current.customerName`) | `dto.getCustomerName()` |  Khớp 100% | Lấy từ `user.fullName` hoặc fallback "Khách vãng lai" |
| **Số điện thoại** (`current.customerPhone`) | `dto.getCustomerPhone()` |  Khớp 100% | Luôn trả về chuỗi SĐT (không bị null) |
| **Ngày nhận phòng** (`current.checkInDate`) | `dto.getCheckInDate()` |  Khớp 100% | ISO Date `YYYY-MM-DD` |
| **Ngày trả phòng** (`current.checkOutDate`) | `dto.getCheckOutDate()` |  Khớp 100% | ISO Date `YYYY-MM-DD` |
| **Tiền cọc đã thanh toán** (`current.depositAmount`) | `dto.getDepositAmount()` |  Khớp 100% | Số tiền cọc quy chuẩn |
| **Tiền đã trả thực tế** (`current.paidAmount`) | `dto.getPaidAmount()` |  Khớp 100% | Tính đúng theo `PaymentStatus` (FULLY/PARTIAL) |
| **Tổng tiền đơn** (`current.totalPrice`) | `dto.getTotalPrice()` |  Khớp 100% | Tổng chi phí lưu trú |
| **Trạng thái hiển thị** (`current.status`) | `dto.getStatus()` |  Khớp 100% | `AVAILABLE`, `CONFIRMED`, `CHECKED_IN`, v.v. |
| **Trạng thái đơn** (`current.bookingStatus`) | `dto.getBookingStatus()` |  Đã bổ sung | Khớp với logic `current.bookingStatus` của Yến |
| **Số phòng** (`current.roomNumber`) | `dto.getRoomNumber()` |  Đã bổ sung | Đảm bảo popup có ngay số phòng dù không truyền kèm `room` |
| **Tên loại phòng** (`current.roomTypeName`) | `dto.getRoomTypeName()` |  Đã bổ sung | Hiển thị: Deluxe Room, Suite... |
| **Tầng lầu** (`current.floor`) | `dto.getFloor()` |  Đã bổ sung | Tầng 1, Tầng 2... |

---

## 3. Các Lỗi Backend Đã Phát Hiện & Khắc Phục Khi Tích Hợp

1. **Lỗi ưu tiên trạng thái khi có nhiều booking giao thoa trong cùng ngày:**
   - *Phát hiện:* Trước đây khi có 2 booking cùng chạm vào 1 ngày (ví dụ ca bàn giao hoặc booking bất thường), hệ thống chọn `findFirst()` ngẫu nhiên.
   - *Khắc phục:* Bổ sung bộ sắp xếp ưu tiên (`sorted`): nếu có booking có trạng thái `CHECKED_IN` (khách đang ở thực tế) thì luôn được ưu tiên hiển thị trước `CONFIRMED`.
2. **Thiếu metadata phòng trong DTO con:**
   - *Phát hiện:* DTO con `RoomDailyStatusDTO` trước đây chỉ chứa thông tin booking mà không chứa `roomNumber`, `roomTypeName`, `floor`, `bookingStatus`. Nếu frontend tách lẻ cell để đưa vào modal thì bị thiếu thông tin phòng.
   - *Khắc phục:* Bổ sung 4 trường này trực tiếp vào `RoomDailyStatusDTO` và map tự động trong `RoomService`.

---

## 4. Ma Trận Test Case Hồi Quy (Test Suite Matrix)

### 4.1. Unit / Service Tests ([`RoomTimelineQueryTest.java`](file:///c:/Users/OS/Hotel-Booking-System_HBS/backend/src/test/java/org/example/backend/room/RoomTimelineQueryTest.java))
- **TC01:** Khi không có booking nào, toàn bộ ô ngày đều có trạng thái `AVAILABLE`.
- **TC02:** Booking `CONFIRMED` hiển thị đúng mã màu, tên khách, SĐT, tiền cọc; ngày trả phòng hiển thị `AVAILABLE`.
- **TC03:** Booking `CHECKED_IN` hiển thị màu xanh lá cây `CHECKED_IN`.
- **TC04:** Phòng `MAINTENANCE` ghi đè toàn bộ các ngày thành `MAINTENANCE`.
- **TC05:** Phòng `CLEANING` hiển thị đúng ô ngày hôm nay là `CLEANING`.
- **TC06:** Trường hợp biên giao thoa ngày: Booking bao trùm toàn bộ dải query (Spanning).
- **TC07:** Booking đã `CANCELLED` bị loại trừ hoàn toàn khỏi ma trận timeline.
- **TC08:** Ràng buộc tham số ngày không hợp lệ ném ngoại lệ `AppException` (400 Bad Request).
- **TC09 (Mới):** **2 Booking liền kề trên cùng 1 phòng (Adjacent handover):** Khách A trả phòng buổi sáng ngày $D$, Khách B nhận phòng buổi chiều ngày $D$. Ngày $D$ hiển thị chính xác Khách B, ngày $D-1$ là Khách A.
- **TC10 (Mới):** **Lọc theo `roomTypeId`:** Lọc ID cụ thể, lọc `null` (toàn bộ phòng), và lọc ID không tồn tại (trả về danh sách rỗng `[]`).
- **TC11 (Mới):** **Dữ liệu DTO tương thích 1-1 với Popup của Yến:** Đầy đủ `roomNumber`, `roomTypeName`, `floor`, `bookingStatus`, `customerPhone`, `depositAmount`.

### 4.2. MockMvc Integration Tests ([`RoomTimelineIntegrationTest.java`](file:///c:/Users/OS/Hotel-Booking-System_HBS/backend/src/test/java/org/example/backend/room/RoomTimelineIntegrationTest.java))
- **IT01:** Gọi API với quyền `RECEPTIONIST` $\rightarrow$ `200 OK`.
- **IT02:** Gọi API với quyền `ADMIN` $\rightarrow$ `200 OK`.
- **IT03:** Gọi API với quyền `CUSTOMER` $\rightarrow$ **`403 Forbidden`** (Bảo mật tuyệt đối, không lộ thông tin buồng phòng cho khách hàng).
- **IT04:** Không có Token xác thực $\rightarrow$ **`401 Unauthorized`**.
- **IT05:** `startDate > endDate` $\rightarrow$ **`400 Bad Request`** kèm thông báo lỗi rõ ràng.
- **IT06:** Khoảng ngày vượt quá 31 ngày $\rightarrow$ **`400 Bad Request`**.
- **IT07:** Tính toàn vẹn của JSON Metadata (`bookingCode`, `customerName`, `customerPhone`, `paidAmount`, `totalPrice`).
- **IT08:** Hỗ trợ alias endpoint `/api/v1/receptionist/rooms/timeline` hoạt động đồng nhất.
- **IT09 (Mới):** Kiểm thử MockMvc kịch bản 2 booking liền kề (Adjacent Booking Handover) trên cùng phòng 101.
- **IT10 (Mới):** Kiểm thử MockMvc lọc theo `roomTypeId` (Suite vs Deluxe vs ID không tồn tại).
- **IT11 (Mới):** Kiểm thử MockMvc dải ngày giao nhau bao trùm biên (Spanning boundaries).
- **IT12 (Mới):** Kiểm thử MockMvc DTO tương thích hoàn toàn với Popup QuickView của Yến.
- **IT13 (Mới):** Tham số định dạng ngày sai (ví dụ `invalid-date-format`) $\rightarrow$ **`400 Bad Request`**.

---

## 5. Hướng Dẫn Chạy Test Cho Đội Ngũ

Để thực thi bộ test hồi quy này trên máy tính của bạn:
```powershell
cd C:\Users\OS\Hotel-Booking-System_HBS\backend
.\gradlew.bat test --tests org.example.backend.room.RoomTimeline*
```
Toàn bộ test sử dụng cơ sở dữ liệu giả lập H2 trong bộ nhớ (`h2:mem:testdb`), hoàn toàn độc lập và không cần bật MySQL bên ngoài.

---

## 6. Bàn Giao & Lưu Ý Còn Lại Cho Huy & Yến
- **Bàn giao cho Yến (FE):**
  - Đã có sẵn 4 trường `roomNumber`, `roomTypeName`, `floor`, `bookingStatus` trong mỗi ô `dailyStatuses`.
  - Các trường `customerPhone`, `depositAmount`, `paidAmount`, `totalPrice` luôn được cung cấp, popup của bạn sẽ mở ngay lập tức mà không cần gọi API fallback `getReceptionistBookings`.
- **Lưu ý còn lại:**
  - Khoảng ngày tối đa cho 1 lần query ma trận timeline là **31 ngày** (để đảm bảo hiệu năng database).
  - Phân quyền endpoint yêu cầu token của `ROLE_RECEPTIONIST` hoặc `ROLE_ADMIN`.

