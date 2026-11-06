# API Contract: Nhật ký Thao tác Hệ thống (Audit Log API)

> **Mã tính năng:** `FR-16: Audit Log Hệ thống (Security & Activity Audit Logging)`  
> **Phiên bản:** MVP 1.0  
> **Quyền truy cập:** Duy nhất vai trò Quản trị viên (`ROLE_ADMIN`)  
> **Cơ chế ghi log:** Spring AOP (`@Auditable`) kết hợp `AuditLogService` (Transaction `REQUIRES_NEW`)

---

## 1. Mục đích & Nguyên tắc Bảo mật

### 1.1. Mục đích nghiệp vụ (SRS §FR-16)
- Tự động ghi vết toàn bộ hành vi nhạy cảm và thay đổi trạng thái quan trọng trong hệ thống khách sạn: nhận phòng (check-in), gán phòng, trả phòng (check-out), xác nhận đặt phòng, hủy đơn, hoàn tiền, điều chỉnh giá và thay đổi trạng thái phòng.
- Cung cấp giao diện tra cứu và đối soát cho Admin khi phát sinh khiếu nại hoặc sự cố nghiệp vụ.

### 1.2. Nguyên tắc Whitelist & Làm sạch dữ liệu (Security Sanitization)
Theo tiêu chí an toàn thông tin doanh nghiệp, hệ thống áp dụng cơ chế tự động làm sạch và che giấu (masking) trước khi lưu dữ liệu vào trường `old_values` và `new_values`:
1. **Tuyệt đối KHÔNG lưu Token & Mật khẩu:**
   - Các trường: `password`, `rawPassword`, `newPassword`, `oldPassword`, `token`, `accessToken`, `refreshToken`, `jwt`, `secret`, `apiKey`, `vnp_HashSecret`, `pin`, `cvv` tự động bị loại bỏ hoặc thay thế bằng giá trị `"[REDACTED]"`.
2. **Che số tài khoản ngân hàng (Bank Account Masking):**
   - Các trường `accountNumber`, `bankAccountNumber`, `cardNumber`: Tự động che giấu, chỉ hiển thị tối đa **4 chữ số cuối** (ví dụ: `0123456789` $\to$ `******6789`).
3. **Che giấy tờ tùy thân (Citizen ID Masking):**
   - Các trường `citizenId`, `idCard`, `passportNumber`: Tự động che giấu, chỉ hiển thị **3 chữ số cuối** (ví dụ: `038200001234` $\to$ `*********234`).

---

## 2. Cấu trúc Cơ sở Dữ liệu (`audit_logs`)

Migration file: `V3__create_audit_logs.sql`

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `BIGINT` | `PK`, `AUTO_INCREMENT` | Định danh bản ghi log |
| `actor_id` | `BIGINT` | `NULL` | ID tài khoản thực hiện (NULL nếu là SYSTEM / ANONYMOUS) |
| `actor_email` | `VARCHAR(100)` | `NOT NULL` | Email người thực hiện |
| `actor_role` | `VARCHAR(30)` | `NULL` | Vai trò thực hiện (`ROLE_ADMIN`, `ROLE_RECEPTIONIST`, `ROLE_CUSTOMER`, `SYSTEM`) |
| `action` | `VARCHAR(50)` | `NOT NULL` | Tên hành động nghiệp vụ (Enum `AuditAction`) |
| `target_type` | `VARCHAR(50)` | `NOT NULL` | Đối tượng tác động (`BOOKING`, `ROOM`, `ROOM_TYPE`, `PAYMENT`, `USER`) |
| `target_id` | `VARCHAR(100)` | `NULL` | Mã/ID đối tượng (ví dụ: `BK-20261104-001`, `101`) |
| `description` | `VARCHAR(500)` | `NULL` | Mô tả tóm tắt hành động bằng tiếng Việt |
| `old_values` | `JSON` | `NULL` | Dữ liệu trước thay đổi (đã làm sạch dữ liệu nhạy cảm) |
| `new_values` | `JSON` | `NULL` | Dữ liệu sau thay đổi (đã làm sạch dữ liệu nhạy cảm) |
| `ip_address` | `VARCHAR(45)` | `NULL` | Địa chỉ IP client gọi request (IPv4/IPv6) |
| `user_agent` | `VARCHAR(255)` | `NULL` | Thiết bị / Trình duyệt gọi request |
| `status` | `VARCHAR(20)` | `NOT NULL`, Default `SUCCESS` | `SUCCESS` hoặc `FAILED` |
| `error_message` | `TEXT` | `NULL` | Thông báo lỗi nếu thực thi thất bại |
| `created_at` | `DATETIME` | `NOT NULL`, Default `NOW()` | Thời điểm ghi nhận log |

**Chỉ mục (Indexes):**
- `idx_audit_logs_actor_email` (`actor_email`)
- `idx_audit_logs_action` (`action`)
- `idx_audit_logs_target` (`target_type`, `target_id`)
- `idx_audit_logs_created_at` (`created_at`)

---

## 3. Danh mục Hành động (`AuditAction` Enum)

| Enum Value | Mô tả hiển thị | Target Type |
|---|---|---|
| `CHECK_IN_ASSIGN_ROOM` | Gán phòng & Check-in cho khách | `BOOKING` |
| `CHECK_OUT_SETTLEMENT` | Check-out & Đối soát thanh toán | `BOOKING` |
| `CANCEL_BOOKING` | Hủy đơn đặt phòng & Tính phạt | `BOOKING` |
| `CONFIRM_BOOKING` | Xác nhận đặt phòng (thanh toán tại quầy) | `BOOKING` |
| `CONFIRM_REFUND` | Xác nhận hoàn tiền đơn hủy | `PAYMENT` |
| `CHANGE_ROOM_STATUS` | Thay đổi trạng thái phòng vật lý (vd: CLEANING $\to$ AVAILABLE) | `ROOM` |
| `UPDATE_PRICE` | Cập nhật giá niêm yết loại phòng | `ROOM_TYPE` |
| `CREATE_BOOKING` | Tạo đơn đặt phòng mới | `BOOKING` |
| `MARK_NO_SHOW` | Đánh dấu khách vắng mặt (No-Show) | `BOOKING` |
| `LOGIN_SUCCESS` | Đăng nhập tài khoản thành công | `USER` |
| `LOGIN_FAILED` | Đăng nhập tài khoản thất bại | `USER` |

---

## 4. Đặc tả API Tra cứu (Admin Audit Log Endpoints)

### 4.1. Tra cứu danh sách Audit Log (Phân trang & Lọc)

- **Method:** `GET`
- **Endpoint:** `/api/v1/admin/audit-logs`
- **Header:** `Authorization: Bearer <ADMIN_JWT_TOKEN>` *(Chỉ tài khoản ROLE_ADMIN được truy cập; các vai trò khác nhận 403 Forbidden)*
- **Query Parameters:**
  - `userEmail` hoặc `actorEmail` *(string, optional)*: Lọc theo email người thực hiện (tìm kiếm gần đúng `%email%`, không phân biệt chữ hoa/thường).
  - `action` *(AuditAction enum, optional)*: Lọc theo loại hành động (ví dụ: `CHECK_IN_ASSIGN_ROOM`, `CANCEL_BOOKING`, `UPDATE_PRICE`...).
  - `startDate` *(YYYY-MM-DD, optional)*: Lọc từ ngày.
  - `endDate` *(YYYY-MM-DD, optional)*: Lọc đến ngày.
    > ⚠️ **Quy tắc Validate ngày:** Bắt buộc `startDate <= endDate`. Nếu `startDate > endDate` API sẽ trả về lỗi `HTTP 400 Bad Request`.
  - `targetType` *(string, optional)*: Lọc theo loại đối tượng (`BOOKING`, `ROOM`, `ROOM_TYPE`, `PAYMENT`...).
  - `targetId` *(string, optional)*: Lọc theo mã đối tượng (ví dụ: `BK-20261104-001`, `101`...).
  - `status` *(string, optional)*: Trạng thái thao tác (`SUCCESS` hoặc `FAILED`).
  - `page` *(int, default: 0, min: 0)*: Số thứ tự trang (bắt đầu từ 0).
  - `size` *(int, default: 20, max: 100)*: Số bản ghi mỗi trang (tối đa 100 bản ghi/trang để chống quá tải).
  - **Cơ chế Sort ổn định:** Luôn tự động sắp xếp mới nhất trước theo `createdAt DESC, id DESC`, đảm bảo dữ liệu phân trang độc lập, không bị nhảy dòng hay trùng lặp giữa các trang.

#### Request mẫu:
```http
GET /api/v1/admin/audit-logs?action=CHECK_IN_ASSIGN_ROOM&userEmail=receptionist&startDate=2026-11-01&endDate=2026-11-06&page=0&size=10 HTTP/1.1
Host: localhost:8080
Authorization: Bearer eyJhbGciOiJIUzI1NiIsIn...
```

#### Response mẫu thành công (`200 OK`):
```json
{
  "success": true,
  "message": "Thao tác thành công",
  "data": {
    "content": [
      {
        "id": 105,
        "actorId": 2,
        "actorEmail": "receptionist@hotel.com",
        "actorRole": "ROLE_RECEPTIONIST",
        "action": "CANCEL_BOOKING",
        "actionDescription": "Hủy đơn đặt phòng & Tính phạt",
        "targetType": "BOOKING",
        "targetId": "BK-20261104-001",
        "description": "Hủy đơn đặt phòng theo yêu cầu của khách",
        "oldValues": {
          "bookingCode": "BK-20261104-001",
          "request": {
            "reason": "Khách đổi lịch trình",
            "bankName": "Vietcombank",
            "accountNumber": "******5678",
            "accountHolder": "NGUYEN VAN A"
          }
        },
        "newValues": {
          "bookingCode": "BK-20261104-001",
          "bookingStatus": "CANCELLED",
          "paymentStatus": "REFUND_PENDING",
          "penaltyAmount": 0.0,
          "refundAmount": 1500000.0
        },
        "ipAddress": "192.168.1.15",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0",
        "status": "SUCCESS",
        "errorMessage": null,
        "createdAt": "2026-11-04T15:30:00"
      }
    ],
    "page": 0,
    "size": 10,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true
  }
}
```

#### Response lỗi ngày không hợp lệ (`400 Bad Request`):
```json
{
  "timestamp": "2026-11-06T09:00:00.000+07:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Khoảng thời gian không hợp lệ: startDate (2026-11-10) không được lớn hơn endDate (2026-11-01)",
  "path": "/api/v1/admin/audit-logs"
}
```

#### Response lỗi phân quyền (`403 Forbidden`):
*Xảy ra khi Role truy cập là RECEPTIONIST, CUSTOMER hoặc không có quyền Admin:*
```json
{
  "timestamp": "2026-11-06T09:00:00.000+07:00",
  "status": 403,
  "error": "Forbidden",
  "message": "Access Denied: Bạn không có quyền truy cập tài nguyên này",
  "path": "/api/v1/admin/audit-logs"
}
```

---

### 4.2. Lấy danh mục hành động (`AuditAction`) phục vụ Dropdown Filter

- **Method:** `GET`
- **Endpoint:** `/api/v1/admin/audit-logs/actions`
- **Header:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`

#### Response mẫu thành công (`200 OK`):
```json
{
  "success": true,
  "message": "Thao tác thành công",
  "data": [
    {
      "name": "CHECK_IN_ASSIGN_ROOM",
      "description": "Gán phòng & Check-in cho khách"
    },
    {
      "name": "CHECK_OUT_SETTLEMENT",
      "description": "Check-out & Đối soát thanh toán"
    },
    {
      "name": "CANCEL_BOOKING",
      "description": "Hủy đơn đặt phòng & Tính phạt"
    },
    {
      "name": "CONFIRM_BOOKING",
      "description": "Xác nhận đặt phòng"
    },
    {
      "name": "CONFIRM_REFUND",
      "description": "Xác nhận hoàn tiền"
    },
    {
      "name": "CHANGE_ROOM_STATUS",
      "description": "Thay đổi trạng thái phòng vật lý"
    },
    {
      "name": "UPDATE_PRICE",
      "description": "Cập nhật giá loại phòng"
    },
    {
      "name": "CREATE_BOOKING",
      "description": "Tạo đơn đặt phòng"
    },
    {
      "name": "MARK_NO_SHOW",
      "description": "Đánh dấu khách vắng mặt (No-Show)"
    }
  ]
}
```

---

### 4.3. Tra cứu lịch sử thay đổi theo đối tượng cụ thể

- **Method:** `GET`
- **Endpoint:** `/api/v1/admin/audit-logs/target`
- **Header:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Query Parameters:**
  - `targetType` *(string, required)*: Ví dụ `BOOKING`, `ROOM`.
  - `targetId` *(string, required)*: Ví dụ `BK-20261104-001`, `101`.

#### Request mẫu:
```http
GET /api/v1/admin/audit-logs/target?targetType=BOOKING&targetId=BK-20261104-001 HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsIn...
```

#### Response mẫu (`200 OK`):
```json
{
  "success": true,
  "message": "Thao tác thành công",
  "data": [
    {
      "id": 105,
      "actorEmail": "receptionist@hotel.com",
      "actorRole": "ROLE_RECEPTIONIST",
      "action": "CANCEL_BOOKING",
      "actionDescription": "Hủy đơn đặt phòng & Tính phạt",
      "targetType": "BOOKING",
      "targetId": "BK-20261104-001",
      "status": "SUCCESS",
      "createdAt": "2026-11-04T15:30:00"
    },
    {
      "id": 89,
      "actorEmail": "customer1@gmail.com",
      "actorRole": "ROLE_CUSTOMER",
      "action": "CREATE_BOOKING",
      "actionDescription": "Tạo đơn đặt phòng",
      "targetType": "BOOKING",
      "targetId": "BK-20261104-001",
      "status": "SUCCESS",
      "createdAt": "2026-11-04T10:15:00"
    }
  ]
}
```

---

### 4.4. Mã lỗi HTTP trả về (HTTP Status Codes)

| Mã lỗi | Ý nghĩa | Mô tả nguyên nhân |
|---|---|---|
| `200 OK` | Thành công | Dữ liệu nhật ký được trả về đầy đủ kèm phân trang |
| `401 Unauthorized` | Chưa xác thực | Không gửi header `Authorization: Bearer <token>` hoặc token hết hạn |
| `403 Forbidden` | Không đủ quyền | Người dùng đăng nhập không có vai trò `ROLE_ADMIN` (ví dụ: Customer, Receptionist) |
| `400 Bad Request` | Sai tham số | Tham số ngày `startDate`, `endDate` sai định dạng `YYYY-MM-DD` |

