# 🛡️ Kế Hoạch & Hướng Dẫn Kiểm Thử Tranh Chấp Đặt Phòng Đồng Thời (Concurrency & Overbooking Prevention Test Plan)

> **Dự án:** Hotel Booking System (HBS) - Grand Aurora Luxury Hotel  
> **Module kiểm thử:** Booking Engine & Pessimistic Locking (`SRS §3.3` & `SRS §FR-03`)  
> **Công cụ thực thi:** Apache JMeter (v5.6+) & Bộ Test Fixtures SQL  
> **Người thực hiện:** QA / DevOps Team (`Vtrung_Tester`)  
> **Cập nhật:** 2026-11-04  

---

## 📌 1. Mục Tiêu Kiểm Thử (Test Objectives)

Hệ thống đặt phòng khách sạn yêu cầu tính toàn vẹn dữ liệu ở cấp độ cao nhất nhằm ngăn chặn triệt để hiện tượng **Bán phòng vượt mức (Overbooking)** khi nhiều khách hàng cùng bấm đặt phòng vào cùng một phần nghìn giây.

### Mục tiêu cốt lõi:
1. **Xác thực cơ chế Khóa bi quan (Pessimistic Locking):** Đảm bảo truy vấn `SELECT ... FOR UPDATE` trên bảng `room_types` tại tầng cơ sở dữ liệu khóa thành công hàng dữ liệu trong phiên giao dịch `isolation = READ_COMMITTED`.
2. **Kiểm chứng tính nhất quán của số lượng tồn phòng:** Giả lập **10 khách hàng độc lập** cùng lúc gửi request đặt **đúng 1 suất phòng duy nhất** còn lại trong khách sạn cho cùng một khoảng thời gian lưu trú (`check-in` đến `check-out`).
3. **Nghiệm thu tiêu chuẩn phản hồi:**
   - **Chính xác 1 request** đến trước được xử lý thành công và nhận về **`HTTP 201 Created`**.
   - **9 requests còn lại** đến sau (khi số phòng khả dụng đã bằng 0) bắt buộc phải bị hệ thống từ chối an toàn với mã lỗi nghiệp vụ **`HTTP 409 Conflict`**.
   - Không được xảy ra tình trạng Deadlock không xử lý được hoặc lỗi sập máy chủ `HTTP 500 Internal Server Error`.

---

## 🏗️ 2. Môi Trường & Điều Kiện Tiên Quyết (Prerequisites)

### 2.1. Thông tin cấu hình môi trường

| Thành phần | Môi trường Local Development | Môi trường Staging / VPS |
| :--- | :--- | :--- |
| **Base URL** | `http://localhost:8080/api/v1` | `http://221.121.4.97:8080/api/v1` |
| **Cơ sở dữ liệu** | MySQL 8.0 (Container: `hotel-mysql`) | MySQL 8.0 VPS |
| **Backend Service** | Spring Boot 3.3.5 (Port 8080) | Container `hotel-backend` |
| **Công cụ tải** | Apache JMeter 5.6+ / Command Line (CLI) | JMeter Server / CLI |

### 2.2. Danh mục tài nguyên kiểm thử (Test Fixtures)

Toàn bộ tài nguyên được lưu trữ tập trung tại thư mục [`tests/fixtures/`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/fixtures):

1. **[`seed_concurrency_data.sql`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/fixtures/seed_concurrency_data.sql):**
   - Tạo loại phòng riêng biệt: `id = 99`, tên `Single Concurrency Test Suite`.
   - Phân bổ **đúng 1 buồng phòng vật lý duy nhất**: `id = 991`, số phòng `991`, tầng 9, trạng thái ban đầu `AVAILABLE`.
   - Khởi tạo **10 tài khoản khách hàng độc lập**: `concurrency_user1@hotel.com` đến `concurrency_user10@hotel.com`.
2. **[`reset_concurrency_data.sql`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/fixtures/reset_concurrency_data.sql):**
   - Xóa sạch mọi booking, gán phòng và giao dịch liên quan đến loại phòng `99`.
   - Đưa phòng `991` về trạng thái `AVAILABLE`.
3. **[`test_users.csv`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/fixtures/test_users.csv):**
   - Danh sách 10 tài khoản test định dạng CSV cho JMeter `CSV Data Set Config`.
   - Mật khẩu mặc định của tất cả tài khoản test: `Password@123`.
4. **[`booking_payload.json`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/fixtures/booking_payload.json):**
   - Mẫu payload chuẩn cho API tạo đơn đặt phòng.

---

## 🔍 3. Đặc Tả API & Cấu Trúc Payload

### 3.1. API Đăng Nhập Lấy Token (Authentication)
- **Endpoint:** `POST /api/v1/auth/login`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "concurrency_user1@hotel.com",
    "password": "Password@123"
  }
  ```
- **Response Thành Công (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "message": "Đăng nhập thành công",
    "data": {
      "accessToken": "eyJhbGciOiJIUzM4NCJ9...",
      "tokenType": "Bearer",
      "expiresIn": 1800000,
      "user": {
        "id": 901,
        "email": "concurrency_user1@hotel.com",
        "fullName": "Tester Concurrency 01",
        "role": "ROLE_CUSTOMER"
      }
    }
  }
  ```
- **Trích xuất JMeter JSON Extractor:** `$.data.accessToken` $\rightarrow$ Biến `${CONCURRENT_TOKEN}`.

### 3.2. API Tạo Đơn Đặt Phòng (Create Booking)
- **Endpoint:** `POST /api/v1/bookings`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer ${CONCURRENT_TOKEN}`
- **Request Body:**
  ```json
  {
    "roomTypeId": 99,
    "quantity": 1,
    "guests": 2,
    "checkIn": "2026-12-01",
    "checkOut": "2026-12-03",
    "paymentMethod": "CASH",
    "note": "JMeter Concurrency Overbooking Test"
  }
  ```
- **Response Thành công (Duy nhất 1 Request - HTTP 201 Created):**
  ```json
  {
    "success": true,
    "message": "Đặt phòng thành công",
    "data": {
      "id": 105,
      "bookingCode": "BK-20261104-XXXX",
      "roomTypeName": "Single Concurrency Test Suite",
      "quantity": 1,
      "checkInDate": "2026-12-01",
      "checkOutDate": "2026-12-03",
      "totalPrice": 2400000.00,
      "bookingStatus": "PENDING",
      "paymentStatus": "UNPAID"
    }
  }
  ```
- **Response Tranh chấp thất bại (9 Requests còn lại - HTTP 409 Conflict):**
  ```json
  {
    "timestamp": "2026-11-04T15:20:00",
    "status": 409,
    "error": "Conflict",
    "message": "Số phòng trống không đủ. Hiện còn 0 phòng, bạn yêu cầu 1 phòng",
    "path": "/api/v1/bookings"
  }
  ```

---

## 🚀 4. Hướng Dẫn Các Bước Thực Thi Kiểm Thử

### Bước 1: Nạp Dữ Liệu Ban Đầu & Reset Fixture

Trước mỗi lần chạy kiểm thử tải, thực hiện lệnh reset để làm sạch dữ liệu:

- **Cách 1: Sử dụng Script tự động (PowerShell trên Windows):**
  ```powershell
  # Nạp seed data (nếu chạy lần đầu)
  .\scripts\reset_concurrency_fixture.ps1 -Mode "seed"

  # Reset về trạng thái sạch để chạy lại
  .\scripts\reset_concurrency_fixture.ps1 -Mode "reset"
  ```

- **Cách 2: Sử dụng Script tự động (Bash trên Linux / macOS / Git Bash):**
  ```bash
  # Nạp seed data
  bash scripts/reset_concurrency_fixture.sh seed

  # Reset dữ liệu
  bash scripts/reset_concurrency_fixture.sh reset
  ```

- **Cách 3: Thực thi trực tiếp vào MySQL Docker Container:**
  ```bash
  docker exec -i hotel-mysql mysql -u root -proot_password_secure hotel_db < tests/fixtures/reset_concurrency_data.sql
  ```

---

### Bước 2: Chạy Kịch Bản Kiểm Thử JMeter

Kịch bản JMeter test plan được lưu tại: [`tests/jmeter/hotel_booking_concurrency_test.jmx`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/jmeter/hotel_booking_concurrency_test.jmx).

#### 🔹 Cách 1: Chạy ở chế độ Command Line Interface (CLI Mode - Khuyên dùng)
Chạy ở chế độ không giao diện (Non-GUI) để giảm thiểu tiêu hao tài nguyên CPU/RAM máy trạm và đạt độ chính xác thời gian mili-giây cao nhất:

```bash
# Tạo thư mục lưu kết quả nếu chưa có
mkdir -p tests/jmeter/results

# Chạy kịch bản kiểm thử mặc định (Localhost:8080)
jmeter -n -t tests/jmeter/hotel_booking_concurrency_test.jmx \
       -l tests/jmeter/results/run_local.jtl \
       -e -o tests/jmeter/results/dashboard_local
```

**Tùy biến mục tiêu kiểm thử sang máy chủ VPS Staging qua tham số `-J` hoặc `-D`:**
```bash
jmeter -n -t tests/jmeter/hotel_booking_concurrency_test.jmx \
       -Jhost=221.121.4.97 \
       -Jport=8080 \
       -Jprotocol=http \
       -JroomTypeId=99 \
       -l tests/jmeter/results/run_vps.jtl \
       -e -o tests/jmeter/results/dashboard_vps
```

#### 🔹 Cách 2: Chạy ở chế độ đồ họa (JMeter GUI Mode)
1. Mở phần mềm JMeter:
   ```bash
   jmeter
   ```
2. Vào menu **File** $\rightarrow$ **Open...** $\rightarrow$ Chọn tệp `tests/jmeter/hotel_booking_concurrency_test.jmx`.
3. Trong giao diện cây Test Plan:
   - Nhấp vào **Test Plan** để xem/chỉnh sửa các biến `HOST`, `PORT`, `ROOM_TYPE_ID`.
   - Xem **Luồng 1 (Smoke Test - 1 User)**: Chạy thử đơn lẻ để xác nhận cấu hình và lấy token.
   - Xem **Luồng 2 (Concurrency Spike - 10 Users)**: Kiểm tra cấu hình `Synchronizing Timer` (hội tụ đúng 10 threads).
4. Nhấn nút **Start (Play xanh)** trên thanh công cụ.
5. Quan sát bảng **View Results Tree** và **Summary Report** thời gian thực.

---

### Bước 3: Kiểm Tra Tính Toàn Vẹn Trong Cơ Sở Dữ Liệu Sau Test

Sau khi đợt bắn tải kết thúc, thực hiện truy vấn trực tiếp vào cơ sở dữ liệu để đối soát thực tế:

```sql
-- 1. Đếm tổng số đơn đặt phòng được tạo cho loại phòng test 99
SELECT COUNT(*) AS total_created_bookings 
FROM `bookings` 
WHERE `room_type_id` = 99;
-- KỲ VỌNG: Đúng bằng 1 bản ghi duy nhất!

-- 2. Xem chi tiết đơn đặt phòng thành công
SELECT id, booking_code, user_id, check_in_date, check_out_date, booking_status, payment_status, created_at
FROM `bookings`
WHERE `room_type_id` = 99;

-- 3. Kiểm tra số phòng vật lý còn lại
SELECT id, room_number, status 
FROM `rooms` 
WHERE `room_type_id` = 99;
```

---

## 📊 5. Bảng Tổng Hợp Tiêu Chuẩn Kết Quả Dự Kiến

| Chỉ số / Hạng mục | Luồng 1 (Smoke Test) | Luồng 2 (Concurrency Spike) | Ghi chú kỹ thuật |
| :--- | :---: | :---: | :--- |
| **Số lượng người dùng đồng thời (Threads)** | 1 Thread | **10 Threads** | Toàn bộ 10 threads xuất phát tại cùng 1 tích tắc qua Sync Timer |
| **Suất phòng trống khả dụng** | 1 phòng | **1 phòng duy nhất** | `capacity = 2`, `quantity = 1` |
| **Số đơn tạo thành công (`HTTP 201`)** | **1 (100%)** | **1 (Chính xác 1 đơn)** | Được gán `bookingCode` và trạng thái `PENDING` |
| **Số request bị từ chối (`HTTP 409 Conflict`)** | 0 | **9 (Chính xác 9 requests)** | Thông điệp: *"Số phòng trống không đủ. Hiện còn 0 phòng..."* |
| **Số lượng đơn trùng lặp trong DB** | 0 | **0 (Zero Overbooking)** | Khóa bi quan `PESSIMISTIC_WRITE` chặn triệt để |
| **Lỗi hệ thống không mong muốn (`HTTP 500`)** | **0** | **0** | Không phát sinh ngoại lệ không bắt được |
| **Thời gian phản hồi trung bình (Avg Latency)** | < 100 ms | < 450 ms | Tối ưu hóa nhờ Composite Index `idx_bookings_concurrency` |

---

## 💡 6. Khắc Phục Lỗi Thường Gặp (Troubleshooting)

1. **Lỗi `404 Not Found` khi gọi `/api/v1/bookings`:**
   - Kiểm tra `ROOM_TYPE_ID` đã được seed hay chưa bằng lệnh: `SELECT * FROM room_types WHERE id = 99;`.
   - Nếu chưa có, chạy lại script `reset_concurrency_fixture.ps1 -Mode "seed"`.
2. **Lỗi `401 Unauthorized` ở bước tạo đơn:**
   - Kiểm tra token trích xuất tại bước Login (`$.data.accessToken`). Đảm bảo user đăng nhập mang vai trò `ROLE_CUSTOMER`.
3. **Cả 10 requests đều báo lỗi `409 Conflict` ngay từ đầu:**
   - Suất phòng đã bị đặt từ lần test trước mà chưa được dọn dẹp.
   - Khắc phục: Chạy script reset: `.\scripts\reset_concurrency_fixture.ps1 -Mode "reset"`.
4. **JMeter báo không tìm thấy tệp `tests/fixtures/test_users.csv`:**
   - Chạy lệnh JMeter từ thư mục gốc của dự án (`Hotel-Booking-System_HBS/`), hoặc truyền đường dẫn tuyệt đối cho CSV Data Set Config.

