# TÀI LIỆU ĐẶC TẢ API CONTRACT & CHUẨN HÓA DTO
# HOTEL BOOKING SYSTEM (MVP)

> **Dự án:** Hotel Booking System  
> **Người thực hiện:** Phan Thuận Thành (Backend Architect / Database & API Specialist)  
> **Người duyệt:** Đình Quang Huy (Team Leader)  
> **Phiên bản:** v1.0 - Chính thức ban hành làm chuẩn tích hợp Frontend & Backend  
> **Căn cứ đặc tả:** [SRS.md](SRS.md) v2.1 Chương 11  

---

## 1. QUY ƯỚC CHUNG (GENERAL CONVENTIONS)

### 1.1. Base URL & Giao thức
- **Base URL:** `http://localhost:8080/api/v1` (môi trường Dev) / `https://<domain>/api/v1` (môi trường Production).
- **Format dữ liệu:** `application/json; charset=UTF-8` cho tất cả Request Body & Response Body (trừ luồng upload multipart/form-data ảnh Cloudinary và callback từ VNPay).
- **Naming Convention:** Bắt buộc sử dụng `camelCase` cho tất cả các field trong JSON request và response (ví dụ: `roomTypeId`, `checkIn`, `checkOut`, `bookingCode`, `depositAmount`).
- **Múi giờ hệ thống (Timezone):** `Asia/Ho_Chi_Minh` (GMT+7). Mọi mốc thời gian ISO-8601 đều được tính theo múi giờ này.

### 1.2. Kiểu dữ liệu chuẩn
| Kiểu dữ liệu | Định dạng JSON | Ví dụ | Diễn giải |
|---|---|---|---|
| **ID nội bộ** | `number` (Long 64-bit) | `1`, `501` | Dùng cho quan hệ nội bộ DB, không dùng hiển thị cho khách nếu có mã |
| **Mã đặt phòng** | `string` | `"BK-20261020-001"` | Mã hiển thị duy nhất dành cho khách hàng |
| **Mã giao dịch** | `string` | `"TXN-20261020-001"` | Mã giao dịch nội bộ hệ thống |
| **Ngày lưu trú** | `string` (ISO Date `YYYY-MM-DD`) | `"2026-11-10"` | Ngày nhận phòng hoặc ngày trả phòng |
| **Thời điểm** | `string` (ISO-8601 Offset/UTC) | `"2026-10-20T14:00:00+07:00"` | Thời điểm tạo, hủy, hết hạn |
| **Tiền tệ (VND)** | `number` (Long nguyên số) | `1200000` | Số tiền VND nguyên, không dùng số thực, không gửi chuỗi định dạng |
| **Tỷ lệ (%)** | `number` (Float từ 0.0 đến 1.0) | `0.75` | Tương đương 75%, FE format ra % khi render |
| **Boolean** | `boolean` | `true`, `false` | Cờ trạng thái |

### 1.3. Chuẩn hóa Cấu trúc Phản hồi (Standard Response Format)

#### A. Cấu trúc Thành công đơn lẻ (Single ApiResponse)
Mọi response thành công trả về HTTP Status `200 OK` hoặc `201 Created` theo cấu trúc:
```json
{
  "success": true,
  "message": "Thao tác thành công",
  "data": { ... }
}
```
*(Nếu thao tác không cần trả data, field `data` sẽ là `null` hoặc trả HTTP `204 No Content`).*

#### B. Cấu trúc Phân trang danh sách (PageResponse)
Mọi response dạng danh sách phân trang (danh sách booking, danh sách hoàn cọc...) trả về:
```json
{
  "success": true,
  "message": "Lấy danh sách thành công",
  "data": {
    "content": [ ... ],
    "page": 0,
    "size": 20,
    "totalElements": 45,
    "totalPages": 3,
    "last": false
  }
}
```
- Mặc định: `page=0`, `size=20`.
- Tham số query chuẩn: `?page=0&size=20&sort=createdAt,desc`.

#### C. Cấu trúc Phản hồi Lỗi Thống nhất (Chuẩn NFR-09)
Khi có lỗi nghiệp vụ hoặc validation thất bại, Backend trả về HTTP Status tương ứng (`400`, `401`, `403`, `404`, `409`, `500`) với body chuẩn:
```json
{
  "timestamp": "2026-10-20T20:30:00+07:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Số lượng phòng trống không đủ để đáp ứng yêu cầu đặt phòng",
  "path": "/api/v1/bookings"
}
```

### 1.4. Ma trận Mã lỗi HTTP (HTTP Status Codes)
- `200 OK`: Yêu cầu thành công.
- `201 Created`: Tạo mới tài nguyên thành công (Đăng ký, Tạo booking).
- `204 No Content`: Thao tác thành công, không có nội dung trả về (Đăng xuất, Xóa).
- `400 Bad Request`: Sai tham số, vi phạm validation, vi phạm quy tắc ngày (`checkOut <= checkIn`), hoặc cố tình hủy đơn đã `CHECKED_IN`/`CHECKED_OUT`/`NO_SHOW`.
- `401 Unauthorized`: Chưa đăng nhập hoặc Access Token không hợp lệ / hết hạn.
- `403 Forbidden`: Đã xác thực nhưng không đủ quyền thực hiện hành động.
- `404 Not Found`: Không tìm thấy ID Loại phòng, Mã booking hoặc Tài khoản.
- `409 Conflict`: Xung đột đồng thời, hết quota phòng (Pessimistic Lock), hoặc phòng vật lý đã bị quầy khác gán.
- `500 Internal Server Error`: Lỗi hệ thống ngoài dự kiến.

### 1.5. Cơ chế Xác thực & Bảo mật (JWT Security)
- **Header:** `Authorization: Bearer <accessToken>`
- **Access Token:** Hạn 15–30 phút, chứa `userId`, `email`, `role`.
- **Refresh Token:** Hạn 7 ngày, **bắt buộc lưu trong HttpOnly Cookie** (`SameSite=Strict`, `Path=/api/v1/auth`). Tuyệt đối không trả Refresh Token trong JSON body!
- **Phân quyền 3 Roles:**
  - `ROLE_CUSTOMER`: Khách hàng.
  - `ROLE_RECEPTIONIST`: Lễ tân, nhân viên buồng phòng.
  - `ROLE_ADMIN`: Quản trị viên khách sạn.

---

## 2. CHI TIẾT DANH MỤC API & DTO THEO PHÂN HỆ

### 2.1. Phân hệ Xác thực & Tài khoản (Authentication)

#### [POST] `/api/v1/auth/register`
- **Mô tả:** Đăng ký tài khoản khách hàng mới.
- **Quyền:** Public.
- **Request Body (`RegisterRequest`):**
```json
{
  "email": "customer@gmail.com",
  "password": "Password@123",
  "fullName": "Nguyễn Văn Khách",
  "phone": "0987654321"
}
```
- **Validation:**
  - `email`: Bắt buộc, đúng định dạng email, tối đa 100 ký tự.
  - `password`: Bắt buộc, tối thiểu 6 ký tự.
  - `fullName`: Bắt buộc, tối đa 100 ký tự.
  - `phone`: Bắt buộc, định dạng 10-11 chữ số.
- **Response `201 Created`:**
```json
{
  "success": true,
  "message": "Đăng ký tài khoản thành công",
  "data": {
    "id": 3,
    "email": "customer@gmail.com",
    "fullName": "Nguyễn Văn Khách",
    "phone": "0987654321",
    "role": "ROLE_CUSTOMER"
  }
}
```

#### [POST] `/api/v1/auth/login`
- **Mô tả:** Đăng nhập hệ thống, cấp Access Token và Cookie Refresh Token.
- **Quyền:** Public.
- **Request Body (`LoginRequest`):**
```json
{
  "email": "customer@gmail.com",
  "password": "Password@123"
}
```
- **Response `200 OK` (`AuthResponse`):**
  *(Kèm Set-Cookie: `refreshToken=...; HttpOnly; Path=/api/v1/auth; Max-Age=604800`)*
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "accessToken": "eyJhbGciOiJIUzUxMiJ9...",
    "tokenType": "Bearer",
    "expiresIn": 1800,
    "user": {
      "id": 3,
      "email": "customer@gmail.com",
      "fullName": "Nguyễn Văn Khách",
      "phone": "0987654321",
      "role": "ROLE_CUSTOMER"
    }
  }
}
```

#### [POST] `/api/v1/auth/refresh`
- **Mô tả:** Cấp mới Access Token khi token cũ hết hạn (sử dụng Refresh Token từ HttpOnly Cookie).
- **Quyền:** Public (Có Cookie hợp lệ).
- **Request Body:** Không có.
- **Response `200 OK`:** Cấu trúc tương tự `AuthResponse`.

#### [POST] `/api/v1/auth/logout`
- **Mô tả:** Đăng xuất, xóa HttpOnly Cookie.
- **Quyền:** Authenticated.
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Đăng xuất thành công",
  "data": null
}
```

#### [GET] `/api/v1/auth/me`
- **Mô tả:** Lấy thông tin tài khoản hiện tại từ Access Token.
- **Quyền:** Authenticated (`CUSTOMER`, `RECEPTIONIST`, `ADMIN`).
- **Response `200 OK`:** Trả về đối tượng `user` như trong `AuthResponse`.

---

### 2.2. Phân hệ Danh mục & Tra cứu Phòng trống (Room Catalog & Search)

#### [GET] `/api/v1/room-types`
- **Mô tả:** Danh sách các Loại phòng đang mở bán (`is_active = true`).
- **Quyền:** Public.
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Lấy danh sách loại phòng thành công",
  "data": [
    {
      "id": 1,
      "name": "Standard Single Room",
      "capacity": 1,
      "basePrice": 500000,
      "description": "Phòng tiêu chuẩn 1 giường đơn, máy lạnh, wifi tốc độ cao.",
      "amenities": ["WiFi", "Máy lạnh", "Nước nóng lạnh"],
      "primaryImageUrl": "https://images.unsplash.com/photo-1631049307264-da0ec9d70304"
    },
    {
      "id": 2,
      "name": "Deluxe Double Room",
      "capacity": 2,
      "basePrice": 950000,
      "description": "Phòng Deluxe 1 giường đôi lớn, ban công thoáng mát.",
      "amenities": ["WiFi", "Ban công", "Smart TV", "Bàn làm việc"],
      "primaryImageUrl": "https://images.unsplash.com/photo-1590490360182-c33d57733427"
    }
  ]
}
```

#### [GET] `/api/v1/room-types/{id}`
- **Mô tả:** Chi tiết một Loại phòng, bao gồm đầy đủ gallery hình ảnh và danh sách tiện ích.
- **Quyền:** Public.
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Lấy thông tin chi tiết loại phòng thành công",
  "data": {
    "id": 2,
    "name": "Deluxe Double Room",
    "capacity": 2,
    "basePrice": 950000,
    "description": "Phòng Deluxe 1 giường đôi lớn, ban công hướng phố thoáng mát, bàn làm việc cao cấp.",
    "amenities": ["WiFi", "Ban công", "Smart TV", "Bàn làm việc", "Máy sấy tóc"],
    "images": [
      {
        "id": 2,
        "imageUrl": "https://images.unsplash.com/photo-1590490360182-c33d57733427",
        "isPrimary": true
      }
    ]
  }
}
```

#### [GET] `/api/v1/room-types/search`
- **Mô tả:** Tìm kiếm phòng trống và tính số lượng phòng khả dụng theo khoảng ngày lưu trú $[CheckIn, CheckOut)$ và số khách.
- **Quyền:** Public.
- **Query Parameters:**
  - `checkIn` (bắt buộc): `YYYY-MM-DD` (Ví dụ `2026-11-10`)
  - `checkOut` (bắt buộc): `YYYY-MM-DD` (`checkOut > checkIn`)
  - `guests` (bắt buộc): Số lượng khách (ví dụ `2`)
  - `quantity` (tùy chọn, mặc định `1`): Số lượng phòng cần tìm
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Tra cứu phòng trống thành công",
  "data": [
    {
      "roomTypeId": 2,
      "name": "Deluxe Double Room",
      "capacity": 2,
      "basePrice": 950000,
      "description": "Phòng Deluxe 1 giường đôi lớn...",
      "amenities": ["WiFi", "Smart TV"],
      "primaryImageUrl": "https://images.unsplash.com/photo-1590490360182-c33d57733427",
      "availableRooms": 4,
      "requestedQuantity": 1,
      "isAvailable": true
    }
  ]
}
```

#### [GET] `/api/v1/receptionist/rooms`
- **Mô tả:** Danh sách các phòng vật lý phục vụ điều hành và dọn dẹp.
- **Quyền:** `ROLE_RECEPTIONIST`, `ROLE_ADMIN`.
- **Query Parameters:** `status` (`AVAILABLE`, `OCCUPIED`, `CLEANING`, `MAINTENANCE`), `roomTypeId`.
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Lấy danh sách phòng vật lý thành công",
  "data": [
    {
      "id": 1,
      "roomNumber": "101",
      "floor": 1,
      "roomTypeId": 1,
      "roomTypeName": "Standard Single Room",
      "status": "OCCUPIED"
    },
    {
      "id": 3,
      "roomNumber": "103",
      "floor": 1,
      "roomTypeId": 1,
      "roomTypeName": "Standard Single Room",
      "status": "AVAILABLE"
    }
  ]
}
```

#### [PUT] `/api/v1/receptionist/rooms/{id}/status`
- **Mô tả:** Cập nhật trạng thái phòng vật lý (ví dụ nhân viên buồng phòng dọn xong chuyển từ `CLEANING` sang `AVAILABLE`).
- **Quyền:** `ROLE_RECEPTIONIST`, `ROLE_ADMIN`.
- **Request Body (`RoomStatusUpdateRequest`):**
```json
{
  "status": "AVAILABLE"
}
```
- **Ràng buộc:** Không được tự ý chuyển phòng đang có khách (`OCCUPIED`) sang `AVAILABLE`.
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Cập nhật trạng thái phòng thành công",
  "data": {
    "id": 3,
    "roomNumber": "103",
    "status": "AVAILABLE"
  }
}
```

---

### 2.3. Phân hệ Đặt phòng & Quản lý Lưu trú (Booking)

#### [POST] `/api/v1/bookings`
- **Mô tả:** Khách hàng tạo đơn đặt phòng mới. Backend mở Transaction có Pessimistic Lock (`SELECT ... FOR UPDATE`), tính quota, snapshot đơn giá và sinh `hold_expires_at`.
- **Quyền:** `ROLE_CUSTOMER`.
- **Request Body (`CreateBookingRequest`):**
```json
{
  "roomTypeId": 2,
  "quantity": 1,
  "guests": 2,
  "checkIn": "2026-11-10",
  "checkOut": "2026-11-12",
  "paymentMethod": "VNPAY",
  "note": "Xin chuẩn bị phòng không hút thuốc"
}
```
- **Validation:**
  - `roomTypeId`: Bắt buộc, tồn tại trong DB.
  - `quantity`: Số nguyên $\ge 1$.
  - `guests`: Số nguyên $\ge 1$.
  - `checkIn`: Ngày hợp lệ, $\ge$ ngày hiện tại.
  - `checkOut`: Ngày hợp lệ, $>$ `checkIn` ít nhất 1 ngày.
  - `paymentMethod`: Nhận giá trị `"VNPAY"` hoặc `"CASH"`.
- **Response `201 Created` (`BookingResponse`):**
```json
{
  "success": true,
  "message": "Tạo đơn đặt phòng thành công",
  "data": {
    "id": 501,
    "bookingCode": "BK-20261020-001",
    "roomTypeId": 2,
    "roomTypeName": "Deluxe Double Room",
    "quantity": 1,
    "guests": 2,
    "checkIn": "2026-11-10",
    "checkOut": "2026-11-12",
    "numberOfNights": 2,
    "pricePerNight": 950000,
    "totalPrice": 1900000,
    "depositAmount": 950000,
    "bookingStatus": "PENDING",
    "paymentStatus": "UNPAID",
    "paymentMethod": "VNPAY",
    "holdExpiresAt": "2026-10-20T20:45:00+07:00",
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=95000000&vnp_Command=pay&vnp_CreateDate=20261020203000...",
    "createdAt": "2026-10-20T20:30:00+07:00"
  }
}
```
*(Ghi chú: Nếu `paymentMethod = "CASH"`, `paymentUrl` sẽ là `null`, `holdExpiresAt` sẽ là 24 giờ kể từ thời điểm tạo hoặc 18:00 ngày Check-in).*

#### [GET] `/api/v1/bookings/my-bookings`
- **Mô tả:** Lấy lịch sử đặt phòng của khách hàng hiện tại (có phân trang và lọc theo trạng thái).
- **Quyền:** `ROLE_CUSTOMER`.
- **Query Parameters:** `page`, `size`, `status` (`PENDING`, `CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`).
- **Response `200 OK` (`PageResponse<BookingSummaryResponse>`):**
```json
{
  "success": true,
  "message": "Lấy danh sách đơn đặt phòng thành công",
  "data": {
    "content": [
      {
        "id": 501,
        "bookingCode": "BK-20261020-001",
        "roomTypeName": "Deluxe Double Room",
        "quantity": 1,
        "checkIn": "2026-11-10",
        "checkOut": "2026-11-12",
        "totalPrice": 1900000,
        "depositAmount": 950000,
        "bookingStatus": "CONFIRMED",
        "paymentStatus": "PARTIALLY_PAID",
        "createdAt": "2026-10-20T20:30:00+07:00"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "last": true
  }
}
```

#### [GET] `/api/v1/bookings/{bookingCode}`
- **Mô tả:** Xem chi tiết một đơn đặt phòng bằng mã booking.
- **Quyền:** Customer sở hữu đơn, hoặc `ROLE_RECEPTIONIST`, `ROLE_ADMIN`.
- **Response `200 OK`:** Cấu trúc chi tiết đầy đủ gồm thông tin khách, danh sách phòng vật lý đã gán (nếu đã Check-in), lịch sử giao dịch và thông tin hoàn cọc.

#### [POST] `/api/v1/bookings/{bookingCode}/cancel`
- **Mô tả:** Khách hàng tự hủy đơn. Backend tính phạt cọc theo 4 bậc chuẩn mốc 14:00 ngày Check-in.
- **Quyền:** Customer sở hữu đơn.
- **Request Body (`CancelBookingRequest`):**
```json
{
  "reason": "Thay đổi lịch trình công tác",
  "bankName": "Vietcombank",
  "accountNumber": "0071001234567",
  "accountHolder": "NGUYEN VAN KHACH"
}
```
- **Ràng buộc:** Nếu đơn đang ở trạng thái `CHECKED_IN`, `CHECKED_OUT`, hoặc `NO_SHOW`, Backend từ chối ngay lập tức và trả về lỗi HTTP `400 Bad Request`.
- **Response `200 OK` (`CancelBookingResponse`):**
```json
{
  "success": true,
  "message": "Yêu cầu hủy đặt phòng đã được ghi nhận",
  "data": {
    "bookingCode": "BK-20261020-001",
    "bookingStatus": "CANCELLED",
    "paymentStatus": "REFUND_PENDING",
    "totalPrice": 1900000,
    "amountPaid": 950000,
    "standardDeposit": 950000,
    "penaltyRate": 0.30,
    "penaltyAmount": 285000,
    "refundAmount": 665000,
    "cancelledAt": "2026-10-21T09:00:00+07:00"
  }
}
```

#### [GET] `/api/v1/receptionist/bookings`
- **Mô tả:** Bảng danh sách booking cho Lễ tân, hỗ trợ lọc theo ngày, trạng thái, mã đơn, SĐT.
- **Quyền:** `ROLE_RECEPTIONIST`, `ROLE_ADMIN`.
- **Query Parameters:** `page`, `size`, `status`, `checkInDate`, `searchKeyword`.
- **Response `200 OK`:** Trả về `PageResponse` chứa thông tin chi tiết của các đơn để Lễ tân xử lý.

#### [PUT] `/api/v1/receptionist/bookings/{bookingId}/confirm`
- **Mô tả:** Lễ tân bấm "Xác nhận đơn" đối với đơn chọn thanh toán tại khách sạn đang `PENDING`.
- **Quyền:** `ROLE_RECEPTIONIST`, `ROLE_ADMIN`.
- **Response `200 OK`:** Chuyển `bookingStatus` từ `PENDING` sang `CONFIRMED`.

#### [POST] `/api/v1/receptionist/bookings/{bookingId}/check-in`
- **Mô tả:** Lễ tân làm thủ tục Check-in và gán đúng $N$ phòng vật lý cụ thể đang `AVAILABLE`.
- **Quyền:** `ROLE_RECEPTIONIST`, `ROLE_ADMIN`.
- **Request Body (`CheckInRequest`):**
```json
{
  "assignedRoomIds": [4]
}
```
- **Ràng buộc:** 
  - Booking phải ở trạng thái `CONFIRMED`.
  - Số lượng ID phòng truyền lên phải đúng bằng `quantity` của booking.
  - Toàn bộ phòng được chọn phải thuộc Loại phòng đã đặt và đang có `status = 'AVAILABLE'`.
  - Backend mở khóa dòng `SELECT ... FOR UPDATE` trên các phòng để chống 2 quầy gán trùng.
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Thực hiện Check-in thành công",
  "data": {
    "bookingId": 501,
    "bookingCode": "BK-20261020-001",
    "bookingStatus": "CHECKED_IN",
    "assignedRooms": [
      {
        "roomId": 4,
        "roomNumber": "201",
        "floor": 2
      }
    ]
  }
}
```

#### [POST] `/api/v1/receptionist/bookings/{bookingId}/check-out`
- **Mô tả:** Khách trả phòng. Backend tính công nợ còn lại, ghi nhận tất toán và tự động đổi các phòng sang `CLEANING`.
- **Quyền:** `ROLE_RECEPTIONIST`, `ROLE_ADMIN`.
- **Response `200 OK` (`CheckOutResponse`):**
```json
{
  "success": true,
  "message": "Thực hiện Check-out thành công",
  "data": {
    "bookingId": 501,
    "bookingCode": "BK-20261020-001",
    "bookingStatus": "CHECKED_OUT",
    "paymentStatus": "FULLY_PAID",
    "totalPrice": 1900000,
    "amountPaid": 1900000,
    "remainingAmount": 0,
    "roomsToClean": ["201"]
  }
}
```

#### [POST] `/api/v1/receptionist/bookings/{bookingId}/no-show`
- **Mô tả:** Đánh dấu khách vắng mặt (chỉ được gọi sau 12:00 trưa ngày hôm sau $CheckIn + 1$). Giải phóng toàn bộ quota các đêm còn lại.
- **Quyền:** `ROLE_RECEPTIONIST`, `ROLE_ADMIN`.
- **Response `200 OK`:** Booking chuyển sang `NO_SHOW`, giữ 100% cọc đêm đầu, nếu khách trả 100% thì chuyển phần còn lại sang `REFUND_PENDING`.

---

### 2.4. Phân hệ Thanh toán & Hoàn cọc (Payment & Refunds)

#### [GET] `/api/v1/payments/vnpay-ipn`
- **Mô tả:** Webhook từ VNPay Server gọi sang Backend để thông báo kết quả thanh toán.
- **Quyền:** Public (VNPay Server gọi, xác minh qua chữ ký HMAC-SHA512).
- **Nguyên tắc bảo vệ Idempotent:** 
  - Nếu mã giao dịch đã ở trạng thái `SUCCESS` hoặc `FAILED` $\to$ Trả về kết quả thành công ngay, không cộng tiền lần 2.
  - Xác thực chữ ký bí mật với `VNPAY_HASH_SECRET`.
  - Khớp đúng số tiền cọc (`vnp_Amount / 100`).
- **Response JSON gửi lại VNPay:**
```json
{
  "RspCode": "00",
  "Message": "Confirm Success"
}
```

#### [GET] `/api/v1/payments/vnpay-return`
- **Mô tả:** Trình duyệt người dùng được VNPay chuyển hướng về sau khi thao tác trên cổng thanh toán.
- **Quyền:** Public.
- **Response:** Chuyển hướng Frontend về trang `/payment-result?bookingCode=...&status=...` để hiển thị kết quả.

#### [GET] `/api/v1/receptionist/refunds`
- **Mô tả:** Danh sách các đơn đang ở trạng thái `REFUND_PENDING` cần Lễ tân/Admin chuyển khoản trả tiền cọc cho khách.
- **Quyền:** `ROLE_RECEPTIONIST`, `ROLE_ADMIN`.
- **Response `200 OK` (`PageResponse<RefundResponse>`):**
```json
{
  "success": true,
  "message": "Lấy danh sách yêu cầu hoàn cọc thành công",
  "data": {
    "content": [
      {
        "bookingId": 501,
        "bookingCode": "BK-20261020-001",
        "customerName": "Nguyễn Văn Khách",
        "customerPhone": "0987654321",
        "refundAmount": 665000,
        "bankName": "Vietcombank",
        "accountNumberMasked": "******4567",
        "accountHolder": "NGUYEN VAN KHACH",
        "paymentStatus": "REFUND_PENDING",
        "cancelledAt": "2026-10-21T09:00:00+07:00"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "last": true
  }
}
```
*(Lưu ý bảo mật NFR-06: Số tài khoản ngân hàng bắt buộc được che `accountNumberMasked`, chỉ hiển thị 4 số cuối).*

#### [POST] `/api/v1/receptionist/refunds/{bookingId}/confirm`
- **Mô tả:** Sau khi nhân viên đã chuyển khoản thực tế qua app ngân hàng, bấm xác nhận hoàn tất hoàn tiền.
- **Quyền:** `ROLE_RECEPTIONIST`, `ROLE_ADMIN`.
- **Request Body (`ConfirmRefundRequest`):**
```json
{
  "referenceNote": "Đã chuyển khoản qua VCB mã GD 998822"
}
```
- **Response `200 OK`:** Chuyển `paymentStatus` của booking sang **`REFUNDED`**.

---

### 2.5. Phân hệ Báo cáo & Dashboard Quản trị (Admin)

#### [GET] `/api/v1/admin/dashboard/summary`
- **Mô tả:** Tổng hợp các chỉ số kinh doanh cốt lõi của khách sạn theo khoảng thời gian chọn.
- **Quyền:** `ROLE_ADMIN`.
- **Query Parameters:** `dateFrom`, `dateTo` (`YYYY-MM-DD`).
- **Response `200 OK` (`DashboardSummaryResponse`):**
```json
{
  "success": true,
  "message": "Lấy số liệu thống kê Dashboard thành công",
  "data": {
    "dateFrom": "2026-10-01",
    "dateTo": "2026-10-31",
    "expectedRevenue": 25000000,
    "actualRevenue": 18000000,
    "refundTotal": 1200000,
    "occupancyRate": 0.72,
    "roomCounts": {
      "AVAILABLE": 5,
      "OCCUPIED": 3,
      "CLEANING": 1,
      "MAINTENANCE": 1
    }
  }
}
```
- **Công thức tính toán:**
  - `expectedRevenue`: Tổng giá trị các đơn `CONFIRMED` và `CHECKED_IN` trong kỳ.
  - `actualRevenue`: Tổng tiền thực nhận từ các giao dịch thành công trừ đi các khoản tiền đã hoàn (`REFUNDED`).
  - `occupancyRate`: $\frac{\text{Số đêm phòng OCCUPIED}}{\text{Tổng số đêm phòng ACTIVE}} \times 100\%$.

---

## 3. CHECKLIST KIỂM THỬ TÍCH HỢP (INTEGRATION TESTING)

| Test Case ID | Mục tiêu kiểm thử | Đầu vào | Kết quả mong đợi |
|---|---|---|---|
| **TC-01** | Khách đăng ký tài khoản mới | Email chưa tồn tại, mật khẩu 8 ký tự | `201 Created`, lưu DB mật khẩu hash BCrypt |
| **TC-02** | Khách tìm phòng trống | `checkIn=2026-11-10`, `checkOut=2026-11-12`, `guests=2` | `200 OK`, trả danh sách loại phòng kèm `availableRooms` chính xác |
| **TC-03** | Khách cọc 50% qua VNPay | `roomTypeId=2`, `quantity=1`, `paymentMethod="VNPAY"` | `201 Created`, trả `paymentUrl` kèm `holdExpiresAt` 15 phút |
| **TC-04** | Chống Overbooking (Pessimistic Lock) | 50 threads cùng đặt 1 phòng cuối cùng trong 1 tích tắc | Đúng 1 thread thành công `201 Created`, 49 thread còn lại nhận lỗi `409 Conflict` |
| **TC-05** | Late IPN VNPay hết hạn mà còn phòng | IPN gửi thành công sau 15 phút, còn phòng | Kích hoạt lại `CONFIRMED`, `PARTIALLY_PAID` |
| **TC-06** | Late IPN VNPay hết hạn mà hết phòng | IPN gửi thành công sau 15 phút, đã hết phòng | Giữ nguyên `CANCELLED`, chuyển sang `REFUND_PENDING` hoàn 100% |
| **TC-07** | Hủy phòng trước 24h mốc 14:00 | Bấm hủy lúc 10:00 ngày $CheckIn - 1$ | Hoàn 100% cọc, `REFUND_PENDING` |
| **TC-08** | Chặn hủy phòng khi đã Check-in | Gửi request cancel khi booking `CHECKED_IN` | Bị từ chối HTTP `400 Bad Request` |
| **TC-09** | Check-in gán phòng vật lý | Chọn đúng $N$ phòng `AVAILABLE` | Gán vào `booking_rooms`, phòng chuyển `OCCUPIED` |
| **TC-10** | Check-out tất toán | Bấm Check-out | Tính đủ tiền còn thiếu, phòng tự đổi sang `CLEANING` |
| **TC-11** | Hoàn tiền bảo mật | Xem danh sách hoàn cọc | Số tài khoản ngân hàng bị che `**** **** 7890` |

---
**Tài liệu được ban hành chính thức. Mọi thành viên Frontend và Backend tuân thủ nghiêm ngặt để không phát sinh lỗi lệch chuẩn dữ liệu.**
