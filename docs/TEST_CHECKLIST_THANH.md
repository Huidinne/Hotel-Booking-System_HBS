# BẢNG TIÊU CHÍ NGHIỆM THU & TEST CHECKLIST
# DÀNH CHO PHAN THUẬN THÀNH (BACKEND ARCHITECT / DATABASE & API SPECIALIST)

> **Dự án:** Hotel Booking System (MVP)  
> **Người thực hiện:** Phan Thuận Thành  
> **Người nghiệm thu:** Đình Quang Huy (Team Leader)  
> **Nhánh Git:** `feature/db-migration-api-contract`  
> **Mục tiêu:** Tự kiểm thử (Self-test) và tích chọn từng tiêu chí để đảm bảo công việc đạt 100% yêu cầu trước khi tạo Pull Request.

---

## PHẦN 1: TỔNG HỢP CÁC YÊU CẦU BẮT BUỘC PHẢI ĐÁP ỨNG

| STT | Nhóm việc | Tiêu chí bắt buộc phải đáp ứng | Trạng thái |
|:---:|---|---|:---:|
| 1 | **Database & ERD** | Đủ 7 bảng cốt lõi, quan hệ chuẩn (1-N giữa RoomType và Room, Booking và BookingRoom). | [ ] |
| 2 | **Database Constraints** | Đầy đủ khóa Unique (`email`, `room_number`, `booking_code`, `vnp_transaction_no`, `uk_booking_room`). | [ ] |
| 3 | **Overbooking Index** | Có Composite Index `idx_bookings_concurrency` phục vụ khóa Pessimistic Lock và tính Quota. | [ ] |
| 4 | **Check Constraints** | Có các ràng buộc toàn vẹn: `check_out_date > check_in_date`, `capacity > 0`, `guests > 0`, `base_price >= 0`. | [ ] |
| 5 | **Flyway Migration** | Script `V1__init_schema.sql` và `V2__seed_data.sql` chạy trơn tru, đồng bộ ở cả `database/migrations` và `backend/src/main/resources/db/migration`. | [ ] |
| 6 | **Seed Data chuẩn** | Có sẵn 3 tài khoản mẫu với mật khẩu BCrypt (`Password@123`), 10 phòng vật lý, 6 booking mẫu phủ kín các trạng thái. | [ ] |
| 7 | **Tài liệu README** | Hướng dẫn chi tiết cách chạy Docker MySQL, cách chạy Flyway trong Spring Boot, cách reset DB và cảnh báo bảo mật. | [ ] |
| 8 | **API Contract** | File `docs/API_CONTRACT.md` phủ kín 12 chức năng (FR-01 đến FR-12), đủ request/response JSON mẫu, HTTP status, validation. | [ ] |
| 9 | **Format lỗi NFR-09** | Có `ErrorResponse`, `AppException`, `GlobalExceptionHandler` trả về đúng định dạng lỗi hệ thống yêu cầu. | [ ] |
| 10 | **DTOs dùng chung** | Đã tạo đủ 14 DTO Java chuẩn `camelCase`, có DTO che số tài khoản ngân hàng `accountNumberMasked`. | [ ] |
| 11 | **Build & Test Backend** | Biên dịch `./gradlew compileJava` và chạy `./gradlew test` đạt `BUILD SUCCESSFUL` không lỗi. | [ ] |
| 12 | **Quy chuẩn Git Flow** | Làm việc trên nhánh `feature/db-migration-api-contract`, commit message có tiền tố `feat(db):`, `feat(api):`. | [ ] |

---

## PHẦN 2: HƯỚNG DẪN TEST TỪNG BÀI CỤ THỂ (HANDS-ON TESTING)

Mở terminal (PowerShell trên Windows) tại thư mục dự án và chạy lần lượt các bước sau để test:

### 🧪 TEST CASE 1: Kiểm tra Khởi tạo Database & Chạy Flyway Migration
- **Mục tiêu:** Đảm bảo script SQL không có lỗi cú pháp, MySQL 8 nạp schema và seed data thành công.
- **Thao tác:**
  ```powershell
  # 1. Khởi động MySQL qua Docker
  docker compose up -d mysql-db

  # 2. Kiểm tra container đã healthy chưa
  docker compose ps
  ```
- **Kiểm tra bên trong MySQL:**
  ```powershell
  docker compose exec mysql-db mysql -u hotel_user -photel_password_secure -e "USE hotel_db; SHOW TABLES;"
  ```
- **Kết quả mong đợi:** MySQL hiển thị đủ **8 bảng** (7 bảng nghiệp vụ + 1 bảng `flyway_schema_history`):
  `users`, `room_types`, `room_type_images`, `rooms`, `bookings`, `booking_rooms`, `payment_transactions`, `flyway_schema_history`.
- [ ] **Đã test TC-01: PASS**

---

### 🧪 TEST CASE 2: Kiểm tra Ràng buộc Chống Overbooking & Toàn vẹn Dữ liệu
- **Mục tiêu:** Xác minh các chỉ mục tối ưu hóa và khóa Unique hoạt động chuẩn.
- **Thao tác:**
  ```powershell
  # Kiểm tra Index trên bảng bookings
  docker compose exec mysql-db mysql -u hotel_user -photel_password_secure -e "USE hotel_db; SHOW INDEX FROM bookings WHERE Key_name = 'idx_bookings_concurrency';"
  ```
- **Kết quả mong đợi:** Index `idx_bookings_concurrency` gồm 5 cột: `room_type_id`, `booking_status`, `check_in_date`, `check_out_date`, `hold_expires_at`.
- **Thử kiểm tra ràng buộc ngày Check-out > Check-in:**
  ```powershell
  # Chạy thử câu lệnh vi phạm ràng buộc ngày (check_out trước check_in)
  docker compose exec mysql-db mysql -u hotel_user -photel_password_secure -e "USE hotel_db; INSERT INTO bookings (booking_code, user_id, room_type_id, quantity, guests, payment_method, check_in_date, check_out_date, price_per_night, total_price) VALUES ('BK-TEST-ERR', 3, 1, 1, 1, 'VNPAY', '2026-11-10', '2026-11-09', 500000, 500000);"
  ```
- **Kết quả mong đợi:** MySQL chặn lại và báo lỗi vi phạm Check constraint: `Check constraint 'chk_bookings_dates' is violated`.
- [ ] **Đã test TC-02: PASS**

---

### 🧪 TEST CASE 3: Kiểm tra Seed Data & Mật khẩu Mã hóa BCrypt
- **Mục tiêu:** Xác minh 3 tài khoản demo và dữ liệu các phòng đã được nạp sẵn.
- **Thao tác:**
  ```powershell
  docker compose exec mysql-db mysql -u hotel_user -photel_password_secure -e "USE hotel_db; SELECT id, email, role, is_active FROM users;"
  ```
- **Kết quả mong đợi:** 
  - `admin@hotel.com` (`ROLE_ADMIN`)
  - `receptionist@hotel.com` (`ROLE_RECEPTIONIST`)
  - `customer@gmail.com` (`ROLE_CUSTOMER`)
  - `tranvanb@gmail.com` (`ROLE_CUSTOMER`)
  - Mật khẩu bắt đầu bằng `$2a$10$` (BCrypt hash chuẩn của `Password@123`).
- [ ] **Đã test TC-03: PASS**

---

### 🧪 TEST CASE 4: Kiểm tra Biên dịch Backend & Chạy Test Suite
- **Mục tiêu:** Đảm bảo tầng Common và 14 DTO Java biên dịch sạch sẽ, không có lỗi runtime.
- **Thao tác:**
  ```powershell
  cd backend
  .\gradlew.bat compileJava
  .\gradlew.bat test
  cd ..
  ```
- **Kết quả mong đợi:** Cả 2 lệnh đều trả về:
  `BUILD SUCCESSFUL` (Tất cả test suite đều pass, không có lỗi biên dịch).
- [ ] **Đã test TC-04: PASS**

---

### 🧪 TEST CASE 5: Kiểm tra Định dạng Lỗi Chuẩn NFR-09
- **Mục tiêu:** Đảm bảo khi xảy ra lỗi nghiệp vụ, hệ thống trả về đúng cấu trúc NFR-09 quy định trong SRS.
- **Kiểm tra mã nguồn:** Mở file `backend/src/main/java/org/example/backend/common/exception/GlobalExceptionHandler.java` và `backend/src/main/java/org/example/backend/common/exception/ErrorResponse.java`.
- **Kết quả mong đợi:** Đối tượng lỗi có đủ 5 trường:
  ```json
  {
    "timestamp": "2026-10-20T20:30:00",
    "status": 400,
    "error": "Bad Request",
    "message": "Thông báo lỗi cụ thể",
    "path": "/api/v1/..."
  }
  ```
- [ ] **Đã test TC-05: PASS**

---

### 🧪 TEST CASE 6: Kiểm tra Che Thông tin Tài khoản Ngân hàng (NFR-06)
- **Mục tiêu:** Đảm bảo thông tin số tài khoản của khách hàng khi hoàn tiền cọc không bị lộ.
- **Kiểm tra mã nguồn:** Mở file `backend/src/main/java/org/example/backend/payment/dto/RefundResponse.java` và tài liệu `docs/API_CONTRACT.md`.
- **Kết quả mong đợi:** 
  - Tên trường là `accountNumberMasked`.
  - Dữ liệu trả về bị che chỉ thấy 4 số cuối (ví dụ: `"******4567"`), không trả số tài khoản nguyên gốc.
- [ ] **Đã test TC-06: PASS**

---

### 🧪 TEST CASE 7: Kiểm tra Tài liệu API Contract
- **Mục tiêu:** Đảm bảo tài liệu chi tiết để team Frontend mock được dữ liệu ngay.
- **Kiểm tra tài liệu:** Mở file `docs/API_CONTRACT.md`.
- **Kết quả mong đợi:** 
  - Đầy đủ 5 phân hệ: Auth, Room, Booking, Payment, Dashboard.
  - Có đầy đủ JSON Request mẫu và JSON Response mẫu.
  - Có quy chuẩn URL `/api/v1/...` và kiểu tiền nguyên số VND.
- [ ] **Đã test TC-07: PASS**

---

### 🧪 TEST CASE 8: Kiểm tra Lịch sử Commit và Nhánh Git
- **Mục tiêu:** Tuân thủ 100% quy trình làm việc nhóm tại `Notes when working with Git.md`.
- **Thao tác:**
  ```powershell
  git branch
  git status
  git log -n 2 --oneline
  ```
- **Kết quả mong đợi:**
  - Nhánh hiện tại: `feature/db-migration-api-contract`.
  - Trạng thái: `working tree clean`.
  - 2 commits rõ ràng:
    - `bdd1672 feat(db): finalize migration schema V1, seed data V2, and setup guide in README`
    - `9239062 feat(api): define API contracts, global error handling, and shared DTOs`
- [ ] **Đã test TC-08: PASS**

---

## PHẦN 3: ĐÁNH GIÁ TỔNG KẾT

Sau khi bạn tự chạy qua 8 bài test trên:
- Nếu **TẤT CẢ 8 BÀI ĐỀU ĐẠT (`[x]`)**: Task của bạn đã hoàn thành xuất sắc 100%, sẵn sàng chạy lệnh `git push -u origin feature/db-migration-api-contract` để Leader **Đình Quang Huy** nghiệm thu!
