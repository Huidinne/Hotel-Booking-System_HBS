# 📊 Báo Cáo Smoke Test Tích Hợp Sprint 1 & Kiểm Tra Triển Khai (Grand Aurora)

> **Mã công việc:** `[SP1-1103-TRUNG] [QA-DevOps] 03/11 | Nguyễn Việt Trung | Smoke test tích hợp Sprint 1 và kiểm tra triển khai (6h)`  
> **Người thực hiện:** Nguyễn Việt Trung (QA-DevOps Engineer)  
> **Nhánh phát triển:** `Vtrung_Tester`  
> **Ngày thực hiện:** 03/11/2026  
> **Trạng thái nghiệm thu:** **PASSED (Local / Staging Candidate)** | **BLOCKER ON VPS (Cần Deploy Bản Vá PDF)**  

---

## 📌 1. Mục Tiêu & Phạm Vi Kiểm Thử (Scope & Objectives)

Kiểm thử khói (Smoke Test) tự động nhằm xác nhận mức độ ổn định và tính toàn vẹn của hệ thống **Hotel Booking System (HBS)** sau khi tích hợp toàn bộ các module trọng tâm của **Sprint 1**:
1. **Health Check & Giám sát hệ thống:** Spring Boot Actuator (`/actuator/health`, `/actuator/info`, `/actuator/metrics`), kiểm tra tình trạng kết nối MySQL (`db`) và dung lượng ổ đĩa (`diskSpace`) [SP1-OPS-02].
2. **Ma trận Buồng phòng PMS (Timeline Matrix):** Endpoint ma trận phòng `/api/v1/rooms/timeline`, phân quyền RBAC (Lễ tân xem được, Khách hàng bị chặn 403, chưa đăng nhập bị chặn 401) [SP2-1103-DUCANH].
3. **Email Thông Báo & Hóa Đơn PDF:** Xuất file PDF hóa đơn `/api/v1/bookings/{id}/invoice-pdf`, bảo mật hóa đơn và kiểm thử tải file PDF inline [SP1-1103-THANH].
4. **Cấu hình môi trường & Triển khai Docker:** Đối soát tệp biến môi trường `.env`, `.env.example`, kịch bản backup định kỳ `backup_mysql.sh` và `setup_cron.sh` [SP1-OPS-01].

---

## 🖥️ 2. Thông Tin Môi Trường & Phiên Bản Kiểm Thử

| Tham số | Môi trường Local / CI Test | Môi trường Triển khai Thực tế (VPS Production) |
| :--- | :--- | :--- |
| **Máy chủ** | `localhost:8080` / `localhost` | `221.121.4.97:8080` / `http://221.121.4.97` |
| **Nhánh Git** | `Vtrung_Tester` | `develop` (Auto-deploy qua GitHub Actions CD) |
| **Commit ID** | `67c6c54` (+ bản vá fix Lazy Loading PDF) | `67c6c54` (Đang chạy bản build trước bản vá) |
| **Cơ sở dữ liệu** | H2 In-Memory & MySQL 8.0 Docker | MySQL 8.0 (Container: `hotel-mysql`) |
| **Java Runtime** | Eclipse Temurin OpenJDK 21.0.12 LTS | Eclipse Temurin OpenJDK 21 JRE Alpine |
| **Công cụ test** | `scripts/smoke_test_sprint1.ps1` & `.sh` | PowerShell 5.1 / Curl 8.4 |

---

## 🧪 3. Kết Quả Thực Chạy Smoke Test (Execution Results)

Bộ script kiểm thử tự động đã được xây dựng và lưu trữ tại:
- **Bash Script (Linux / Git Bash / VPS):** [`scripts/smoke_test_sprint1.sh`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/scripts/smoke_test_sprint1.sh)
- **PowerShell Script (Windows Native):** [`scripts/smoke_test_sprint1.ps1`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/scripts/smoke_test_sprint1.ps1)

### Bảng Kết Quả Chi Tiết Từng Kịch Bản (17 Assertions):

| STT | Phân hệ / Kịch bản kiểm thử | Endpoint / Lệnh gọi | Kết quả mong đợi | Kết quả VPS (`221.121.4.97`) | Trạng thái |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **1** | Health Check Cơ bản | `GET /api/v1/health` | `HTTP 200`, `status: UP` | `HTTP 200`, `status: UP` | ✅ **PASS** |
| **2** | Actuator Health Tổng thể | `GET /actuator/health` | `HTTP 200`, `status: UP` | `HTTP 200`, `status: UP` | ✅ **PASS** |
| **3** | Actuator MySQL Component | `GET /actuator/health` | Chứa component `"db": {"status": "UP"}` | Có `"db": {"status":"UP"}` | ✅ **PASS** |
| **4** | Actuator DiskSpace Component | `GET /actuator/health` | Chứa component `"diskSpace": {"status": "UP"}` | Có `"diskSpace": {"status":"UP"}` | ✅ **PASS** |
| **5** | Bảo mật Actuator Info | `GET /actuator/info` | `HTTP 401 Unauthorized` (Chặn vãng lai) | `HTTP 401 Unauthorized` | ✅ **PASS** |
| **6** | Bảo mật Actuator Metrics | `GET /actuator/metrics` | `HTTP 401 Unauthorized` (Chặn vãng lai) | `HTTP 401 Unauthorized` | ✅ **PASS** |
| **7** | Đăng nhập Lễ tân (Receptionist) | `POST /api/v1/auth/login` (`receptionist@hotel.com`) | `HTTP 200`, trả về JWT `accessToken` | `HTTP 200`, có Bearer token | ✅ **PASS** |
| **8** | Đăng nhập Khách hàng (Customer) | `POST /api/v1/auth/login` (`customer@gmail.com`) | `HTTP 200`, trả về JWT `accessToken` | `HTTP 200`, có Bearer token | ✅ **PASS** |
| **9** | Đăng nhập sai mật khẩu | `POST /api/v1/auth/login` (`WrongPassword!`) | `HTTP 401 Unauthorized` | `HTTP 401 Unauthorized` | ✅ **PASS** |
| **10** | Lễ tân xem Timeline PMS | `GET /api/v1/rooms/timeline?startDate=...&endDate=...` | `HTTP 200`, mảng phòng có `dailyStatuses` | `HTTP 200`, trả về 10 phòng đầy đủ | ✅ **PASS** |
| **11** | Chặn Khách hàng xem Timeline | `GET /api/v1/rooms/timeline` (Customer Token) | `HTTP 403 Forbidden` (SRS §11.7) | `HTTP 403 Forbidden` | ✅ **PASS** |
| **12** | Chặn Vãng lai xem Timeline | `GET /api/v1/rooms/timeline` (Không token) | `HTTP 401 Unauthorized` | `HTTP 401 Unauthorized` | ✅ **PASS** |
| **13** | Validation Timeline Date | `GET /api/v1/rooms/timeline?startDate > endDate` | `HTTP 400 Bad Request` | `HTTP 400 Bad Request` | ✅ **PASS** |
| **14** | Tải Hóa đơn Demo công khai | `GET /api/v1/bookings/BK-DEMO-2026/invoice-pdf` | `HTTP 200 OK`, `Content-Type: application/pdf` | `HTTP 200 OK`, PDF file | ✅ **PASS** |
| **15** | Content-Type Hóa đơn Demo | `GET /api/v1/bookings/BK-DEMO-2026/invoice-pdf` | `Content-Type: application/pdf` | `application/pdf` | ✅ **PASS** |
| **16** | Chặn Vãng lai tải đơn thật | `GET /api/v1/bookings/1/invoice-pdf` | `HTTP 401 Unauthorized` | `HTTP 401 Unauthorized` | ✅ **PASS** |
| **17** | Lễ tân xuất Hóa đơn đơn thật | `GET /api/v1/bookings/8/invoice-pdf` (Recep Token) | `HTTP 200 OK`, file PDF hóa đơn | `HTTP 500` (Lazy Proxy Error) | ❌ **FAIL (BLOCKER)** |

---

## ⚠️ 4. Phân Tích Lỗi Phát Hiện (Bug / Blocker Report)

### 🔴 Lỗi BLOCKER: `LazyInitializationException` khi xuất Hóa đơn PDF cho đơn đặt phòng thực tế

- **Mã lỗi phát hiện:** `HTTP 500 Internal Server Error`
- **Thông điệp lỗi trả về từ máy chủ:**
  ```json
  {
    "timestamp": "2026-11-03T22:53:55",
    "status": 500,
    "error": "Internal Server Error",
    "message": "could not initialize proxy [org.example.backend.user.entity.User#6] - no Session",
    "path": "/api/v1/bookings/8/invoice-pdf"
  }
  ```

#### 🔍 Nguyên nhân gốc rễ (Root Cause):
1. Trong môi trường thực tế (MySQL Production), cấu hình `spring.jpa.open-in-view: false` được kích hoạt nhằm tối ưu hiệu năng và đóng kết nối cơ sở dữ liệu ngay khi kết thúc Transaction ở Repository.
2. Tại [`BookingInvoiceController.java`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/booking/controller/BookingInvoiceController.java), phương thức `getInvoicePdf` gọi `bookingRepository.findById(bookingId)`. Phương thức này chỉ tải thực thể `Booking` cơ sở mà không JOIN FETCH trường `user`, `roomType` và danh sách `bookingRooms`.
3. Khi `validateInvoiceAccessPermission` và `PdfInvoiceService` truy cập vào `booking.getUser().getFullName()` hay `booking.getUser().getEmail()` ở tầng Controller (ngoài Transaction), Hibernate không còn Session mở để nạp dữ liệu trễ (`FetchType.LAZY`), dẫn đến văng lỗi `LazyInitializationException`.

#### 🛠️ Giải pháp khắc phục đã thực hiện (Fix Applied on `Vtrung_Tester`):
1. **Bổ sung truy vấn Eager Loading có EntityGraph vào [`BookingRepository.java`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/booking/repository/BookingRepository.java):**
   ```java
   @EntityGraph(attributePaths = {"user", "roomType", "bookingRooms", "bookingRooms.room"})
   @Query("SELECT b FROM Booking b WHERE b.id = :id")
   Optional<Booking> findDetailedById(@Param("id") Long id);

   @EntityGraph(attributePaths = {"user", "roomType", "bookingRooms", "bookingRooms.room"})
   @Query("SELECT b FROM Booking b WHERE b.bookingCode = :bookingCode")
   Optional<Booking> findDetailedByBookingCode(@Param("bookingCode") String bookingCode);
   ```
2. **Khai báo `@Transactional(readOnly = true)` tại `BookingInvoiceController`:** Giữ phiên truy vấn mở an toàn trong suốt vòng đời xử lý xuất stream PDF.
3. **Cơ chế Fallback thông minh:** Sử dụng `.or(() -> bookingRepository.findById(bookingId))` để vừa nạp trọn vẹn dữ liệu trong môi trường Production, vừa tương thích 100% với các bộ Unit Test Mockito đã có trước đó.
4. **Kết quả kiểm chứng lại:** Toàn bộ **35/35 test cases (100%)** bao gồm cả bộ `BookingInvoiceControllerTest` và `ActuatorEndpointTest` đều đạt `BUILD SUCCESSFUL`.

---

## 📋 5. Tiêu Chí Nghiệm Thu & Khuyến Nghị Bàn Giao (Action Items)

Theo đúng tiêu chí nghiệm thu của task:
> *"Healthcheck và các luồng chính được kiểm chứng; nếu chưa deploy thì ghi blocker, không báo VPS đã chạy bản mới."*

### ✅ Bảng Tổng Hợp Tiêu Chí:
- [x] **Script smoke test có assertion đầy đủ:** Đã xây dựng `smoke_test_sprint1.sh` và `smoke_test_sprint1.ps1` kiểm tra tự động 17 tiêu chí.
- [x] **Xác minh Health Check:** VPS đã kích hoạt thành công Actuator, trả về trạng thái `UP` cho cả `db` (MySQL) và `diskSpace`.
- [x] **Xác minh Phân hệ Timeline PMS:** Endpoint `/api/v1/rooms/timeline` hoạt động chính xác, phân quyền RBAC chuẩn SRS §11.7.
- [x] **Xác minh Hóa đơn Demo:** Booking `BK-DEMO-2026` mở công khai, xuất file `application/pdf` thành công.
- [!] **Trạng thái Triển khai VPS:** **GHI NHẬN BLOCKER** – Phiên bản trên VPS hiện tại vẫn còn dính lỗi `LazyInitializationException` khi tải hóa đơn cho đơn đặt phòng thật. Chưa thể báo VPS đã hoàn tất bản Sprint 1 mới nhất.

### 🎯 Hành Động Tiếp Theo Cho Đội Ngũ:
1. **Trung (QA-DevOps):** Đã tạo nhánh và commit bản vá tại branch `Vtrung_Tester`. Tạo Pull Request vào `develop`.
2. **Huy (PM / Team Lead):** Review và duyệt PR của `Vtrung_Tester` vào `develop`.
3. **CD Pipeline:** Khi merge vào `develop`, GitHub Actions sẽ tự động kích hoạt SSH vào VPS và re-build backend container `hotel-backend`.
4. **Huy & Trung:** Chạy lại `.\scripts\smoke_test_sprint1.ps1 -BaseUrl "http://221.121.4.97:8080"` để xác nhận đạt chuẩn 100% (17/17 PASS) và đóng Sprint 1.

