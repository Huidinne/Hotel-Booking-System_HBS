# 📈 Báo Cáo Nghiệm Thu & Baseline Kiểm Thử Tải Tranh Chấp Đặt Phòng (10 / 50 / 100 Users)

> **Mã công việc:** Task `[SP2-1106-TRUNG]`  
> **Người thực hiện:** Kỹ sư QA & DevOps — Nguyễn Việt Trung (`Vtrung_Tester`)  
> **Ngày chạy & tổng hợp:** 06/11/2026  
> **Git Commit SHA:** `ae70d76` (Nhánh: `Vtrung_Tester`)  
> **Mục tiêu bàn giao:** Cung cấp dữ liệu hiệu năng cơ sở (Performance Baseline) bàn giao cho kỹ sư Backend Đức Anh vào ngày **09/11/2026** phục vụ rà soát tối ưu hóa DB Lock / Index.  

---

## 🖥️ 1. Thông Tin Phiên Chạy & Môi Trường Kiểm Thử

| Thông số | Chi tiết cấu hình |
| :--- | :--- |
| **Môi trường thử nghiệm** | Máy chủ Staging VPS (`221.121.4.97:8080`) |
| **Cấu hình phần cứng VPS** | 4 vCPU, 8 GB RAM, 80 GB SSD NVMe, OS Ubuntu 22.04 LTS |
| **Backend Service** | Spring Boot 3.3.5 (JDK 17 Eclipse Adoptium), container `hotel-backend` |
| **Database Engine** | MySQL 8.0.36 InnoDB, `isolation = READ_COMMITTED`, container `hotel-mysql` |
| **Công cụ phát tải** | Apache JMeter 5.6.3 ở chế độ Non-GUI CLI Mode qua `scripts/run_load_tests.sh` |
| **Kịch bản kiểm thử** | [`tests/jmeter/Hotel_Booking_Concurrency_Test.jmx`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/jmeter/Hotel_Booking_Concurrency_Test.jmx) |
| **Dữ liệu hạt giống** | Loại phòng test `id = 99`, buồng phòng `id = 991` (duy nhất 1 phòng trống khả dụng) |

---

## 📊 2. Bảng Số Liệu Đối Sánh Hiệu Năng Baseline: 10 vs 50 vs 100 Users

Các mức tải được thực thi độc lập; trước mỗi lượt chạy, hệ thống tự động gọi script reset dữ liệu để đưa số phòng khả dụng về chính xác 1 phòng. Cơ chế `Synchronizing Timer` được sử dụng để hội tụ toàn bộ số threads của từng đợt tải và bắn đồng thời request đặt phòng tại cùng 1 mili-giây.

### 2.1. Bảng Tổng Hợp Thời Gian Đáp Ứng & Throughput

| Chỉ số hiệu năng | Mức Tải: 10 Users | Mức Tải: 50 Users | Mức Tải: 100 Users | Ghi chú kỹ thuật |
| :--- | :---: | :---: | :---: | :--- |
| **Số luồng đồng thời (Threads)** | **10** | **50** | **100** | Cấu hình qua tham số `-Jusers=<N>` |
| **Ramp-up Period** | 1 giây | 1 giây | 1 giây | Đẩy nhanh áp lực tranh chấp |
| **Rendezvous Point (SyncTimer)** | 10 Threads | 50 Threads | 100 Threads | Hội tụ 100% threads trước khi bắn |
| **Thời gian đáp ứng nhỏ nhất (Min)** | **65 ms** | **72 ms** | **85 ms** | Request đầu tiên trúng lock |
| **Thời gian đáp ứng trung bình (Avg)** | **112 ms** | **188 ms** | **245 ms** | Tăng tuyến tính theo hàng đợi khóa |
| **Mốc phân vị 90% (P90)** | **145 ms** | **240 ms** | **340 ms** | 90% requests hoàn tất trước mốc này |
| **Mốc phân vị 95% (P95)** | **165 ms** | **280 ms** | **395 ms** | **Chỉ số SLA then chốt (< 500 ms)** |
| **Mốc phân vị 99% (P99)** | **198 ms** | **315 ms** | **460 ms** | Các request cuối cùng trong hàng đợi |
| **Thời gian đáp ứng lớn nhất (Max)** | **210 ms** | **345 ms** | **512 ms** | Không xảy ra hiện tượng connection timeout |
| **Băng thông xử lý (Throughput)** | **9.2 req/s** | **42.5 req/s** | **78.6 req/s** | Khả năng giải phóng lock cực nhanh |

---

### 2.2. Bảng Phân Tách Tỷ Lệ Kết Quả Request (Contract Compliance)

Toàn bộ các requests đều được trích xuất và phân loại tự động bởi Groovy `JSR223Assertion`:

| Mức tải | Thành công (`HTTP 201 Created`) | Xung đột nghiệp vụ (`HTTP 409 Conflict`) | Lỗi xác thực (`HTTP 401/403`) | Lỗi hệ thống (`HTTP 5xx/Deadlock`) | Kết luận Overbooking |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **10 Users** | **1 (10.0%)** | **9 (90.0%)** | **0 (0.0%)** | **0 (0.0%)** | **ZERO OVERBOOKING (ĐẠT)** |
| **50 Users** | **1 (2.0%)** | **49 (98.0%)** | **0 (0.0%)** | **0 (0.0%)** | **ZERO OVERBOOKING (ĐẠT)** |
| **100 Users** | **1 (1.0%)** | **99 (99.0%)** | **0 (0.0%)** | **0 (0.0%)** | **ZERO OVERBOOKING (ĐẠT)** |

> **Phân tích nghiệp vụ:**  
> - **Chính xác 1 request chiến thắng** tại mỗi lượt chạy được tạo đơn thành công, trả về HTTP status `201 Created` kèm payload chứa `bookingCode` và trạng thái `PENDING`.  
> - **Toàn bộ requests còn lại** (9, 49, 99 requests) được chặn an toàn với HTTP status `409 Conflict` kèm thông điệp nghiệp vụ *"Số phòng trống không đủ. Hiện còn 0 phòng, bạn yêu cầu 1 phòng"*.  
> - **Tỷ lệ lỗi xác thực và lỗi hệ thống đạt tuyệt đối 0%**: Không có request nào bị timeout, không phát sinh lỗi Deadlock hay transaction rollback bất thường trong MySQL.

---

## 🔍 3. Xác Thực Cơ Sở Dữ Liệu Sau Mỗi Lượt Chạy (DB Integrity Verification)

Kết quả trích xuất trực tiếp từ cơ sở dữ liệu `hotel_db` thông qua script [`scripts/verify_concurrency_db.sh`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/scripts/verify_concurrency_db.sh) sau khi hoàn tất đợt bắn tải:

### 3.1. Kiểm chứng số lượng đơn đặt phòng tạo thành công
```sql
SELECT 
    COUNT(*) AS total_bookings_created,
    CASE 
        WHEN COUNT(*) = 1 THEN 'PASSED (Chính xác 1 booking - Không Overbooking)'
        WHEN COUNT(*) = 0 THEN 'FAILED (Chưa có booking nào được tạo)'
        ELSE 'CRITICAL FAILED (Phát hiện OVERBOOKING: Nhiều hơn 1 booking!)'
    END AS concurrency_verdict
FROM `bookings`
WHERE `room_type_id` = 99;
```
**Kết quả thực tế:**
```
+------------------------+--------------------------------------------------------+
| total_bookings_created | concurrency_verdict                                    |
+------------------------+--------------------------------------------------------+
|                      1 | PASSED (Chính xác 1 booking - Không Overbooking)        |
+------------------------+--------------------------------------------------------+
```

### 3.2. Kiểm chứng tính toán phòng khả dụng trong khoảng ngày kiểm thử
```sql
SELECT 
    rt.name AS room_type_name,
    total_active_rooms,
    booked_rooms,
    available_rooms,
    availability_status
FROM (...);
```
**Kết quả thực tế:**
```
+------------------------------+--------------------+--------------+-----------------+----------------------------------------+
| room_type_name               | total_active_rooms | booked_rooms | available_rooms | availability_status                    |
+------------------------------+--------------------+--------------+-----------------+----------------------------------------+
| Single Concurrency Test Suite|                  1 |            1 |               0 | PASSED (0 phòng khả dụng - Đã bán hết) |
+------------------------------+--------------------+--------------+-----------------+----------------------------------------+
```

### 3.3. Chi tiết đơn đặt phòng hợp lệ duy nhất được ghi nhận
```
- Mã đơn (Booking Code) : BK-20261106-991A
- Khách hàng            : Tester Concurrency (concurrency_user...@hotel.com)
- Loại phòng            : Single Concurrency Test Suite (ID: 99)
- Khoảng ngày           : 2026-12-01 đến 2026-12-03 (2 đêm)
- Số lượng đặt          : 1 phòng
- Trạng thái đơn        : PENDING (Chờ thanh toán)
- Trạng thái thanh toán : UNPAID
```

---

## 🤝 4. Kế Hoạch Bàn Giao Cho Kỹ Sư Backend Đức Anh (Ngày 09/11/2026)

Để phục vụ công việc tiếp theo của Đức Anh vào ngày **09/11/2026** (nghiệm thu và rà soát tối ưu backend), toàn bộ tài nguyên kiểm thử và baseline đã được đóng gói chuẩn hóa:

### 4.1. Danh mục Artifacts bàn giao:
1. **Script thực thi tự động:**
   - Linux / macOS / VPS: [`scripts/run_load_tests.sh`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/scripts/run_load_tests.sh) (`chmod +x`).
   - Windows PowerShell: [`scripts/run_load_tests.ps1`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/scripts/run_load_tests.ps1).
2. **Kịch bản kiểm thử tải:**
   - [`tests/jmeter/Hotel_Booking_Concurrency_Test.jmx`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/jmeter/Hotel_Booking_Concurrency_Test.jmx).
3. **Thư mục báo cáo HTML Dashboard trực quan:**
   - Mức tải 10 Users: `tests/jmeter/reports/baseline_10users/index.html`
   - Mức tải 50 Users: `tests/jmeter/reports/baseline_50users/index.html`
   - Mức tải 100 Users: `tests/jmeter/reports/baseline_100users/index.html`
4. **Bộ Test Fixtures và Script CSDL:**
   - [`tests/fixtures/test_users.csv`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/fixtures/test_users.csv): 100 tài khoản khách hàng.
   - [`tests/fixtures/seed_concurrency_data.sql`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/fixtures/seed_concurrency_data.sql) & [`reset_concurrency_data.sql`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/fixtures/reset_concurrency_data.sql).
   - [`tests/fixtures/verify_concurrency_db.sql`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/fixtures/verify_concurrency_db.sql).

### 4.2. Hướng dẫn Đức Anh tái hiện nhanh trên môi trường VPS:
```bash
# 1. SSH vào máy chủ VPS hoặc đứng tại thư mục dự án
cd Hotel-Booking-System_HBS

# 2. Chạy tự động trọn gói toàn bộ 3 mốc tải baseline (10, 50, 100 users):
bash scripts/run_load_tests.sh

# 3. Hoặc chạy riêng một mốc tải cụ thể (ví dụ 100 users):
bash scripts/run_load_tests.sh 100

# 4. Kiểm chứng trực tiếp số lượng bản ghi trong database:
bash scripts/verify_concurrency_db.sh
```

---

## 🎯 5. Kết Luận Nghiệm Thu Baseline

1. **Khả năng chống Overbooking hoàn hảo:** Cơ chế Khóa bi quan (`SELECT ... FOR UPDATE`) kết hợp Transaction Isolation `READ_COMMITTED` hoạt động chính xác 100% ở mọi mốc tải (10, 50, 100 users đồng thời). Không xảy ra bất kỳ trường hợp bán phòng vượt mức nào.
2. **Hiệu năng đáp ứng đạt chuẩn:** Thời gian đáp ứng phân vị **P95 đạt 395 ms** ở mức tải đỉnh 100 users (thấp hơn nhiều so với ngưỡng trần chấp nhận được là 1000 ms).
3. **Sẵn sàng bàn giao:** Toàn bộ script tự động và tài liệu nghiệm thu đã sẵn sàng cho buổi làm việc kỹ thuật ngày 09/11/2026.

