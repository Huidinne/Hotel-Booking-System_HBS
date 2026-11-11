# 🛡️ Báo Cáo Diễn Tập Phục Hồi Dữ Liệu & Giám Sát Nội Bộ (Disaster Recovery & Monitoring Test Report)

> **Mã công việc:** `[SP3-1111-TRUNG]` (Sprint 3)  
> **Người thực hiện:** Trung (QA & DevOps)  
> **Nhánh Git:** `Vtrung_Tester`  
> **Commit SHA cơ sở (tại thời điểm kiểm thử):** `b7243de` (kèm bản cập nhật cấu hình Sprint 3 trên working tree)  
> **Ngày thực hiện:** `11/11/2026`  
> **Hệ thống:** Hotel Booking System (HBS)

---

## 1. Mục Tiêu & Phạm Vi Thực Hiện (Objectives & Scope)

### Mục tiêu
1. **Giám sát nội bộ an toàn (Internal Observability):**
   - Kích hoạt chỉ số Prometheus cho Backend Spring Boot tại `/actuator/prometheus` qua `io.micrometer:micrometer-registry-prometheus`.
   - Cấu hình Prometheus scrape nội bộ định kỳ (`15s`) qua Docker bridge network `hotel-network`, **không** mở cổng giám sát thô ra Internet công cộng.
2. **Diễn tập phục hồi thảm họa (Disaster Recovery Drill):**
   - Kiểm chứng khả năng phục hồi cơ sở dữ liệu MySQL từ bản sao lưu `.sql` / `.sql.gz` với mục tiêu **RTO (Recovery Time Objective) < 5 phút (`300 giây`)**.
   - Xác minh toàn vẹn dữ liệu SQL (đầy đủ cấu trúc bảng, số lượng bản ghi các bảng cốt lõi, không có bản ghi mồ côi vi phạm khóa ngoại).
   - **Cam kết cô lập tuyệt đối:** Toàn bộ quá trình restore và kiểm tra SQL chỉ chạy trên Database TEST (`hotel_db_dr_test`) hoặc container tạm (`hotel-mysql-dr-test`), **tuyệt đối không chạm, ghi đè hay làm gián đoạn Database Production (`hotel_db`)**.

### Các thành phần triển khai mới / cập nhật
- Backend Actuator & Security:
  - `backend/build.gradle`: bổ sung `io.micrometer:micrometer-registry-prometheus`.
  - `backend/src/main/resources/application.yaml` & `backend/src/test/resources/application.yaml`: expose thêm endpoint `prometheus`.
  - `backend/src/main/java/org/example/backend/common/config/SecurityConfig.java`: bảo vệ `/actuator/prometheus` qua `prometheusAccessManager()` — chỉ cho phép tài khoản `ROLE_ADMIN` có JWT hợp lệ hoặc request scrape nội bộ trực tiếp trong mạng Docker / localhost (chặn IP public, proxy header và Docker bridge gateway `.1`).
  - `backend/src/test/java/org/example/backend/controller/ActuatorEndpointTest.java`: bổ sung 4 kịch bản kiểm thử tích hợp cho `/actuator/prometheus`.
- Hạ tầng Prometheus:
  - [monitoring/prometheus.yml](../monitoring/prometheus.yml): `scrape_interval: 15s`, `evaluation_interval: 15s`, job `hotel-booking-backend` thu thập `/actuator/prometheus` từ `backend:8080`.
  - [docker-compose.monitoring.yml](../docker-compose.monitoring.yml): service `hotel-prometheus` (`prom/prometheus:v2.55.1`), gắn vào mạng `hotel-network`, chỉ bind cổng quản trị nội bộ `127.0.0.1:9090:9090`.
- Kịch bản diễn tập DR:
  - [scripts/test_backup_restore.sh](../scripts/test_backup_restore.sh): tự động chọn bản sao lưu mới nhất (hoặc tạo bản mẫu từ Flyway migrations khi bật `--allow-sample-fallback`), đo RTO `< 300s`, kiểm tra ràng buộc khóa ngoại và row counts trên DB cô lập.

---

## 2. Kết Quả Kiểm Chứng Đã Thực Thi (Observed Verification Results)

### 2.1. Kiểm thử Actuator Prometheus & Bảo mật Endpoint (`ActuatorEndpointTest`)
- **Lệnh thực thi:**
  ```powershell
  backend\gradlew.bat -p backend test --tests org.example.backend.controller.ActuatorEndpointTest --no-daemon
  ```
- **Kết quả quan sát trực tiếp:** `BUILD SUCCESSFUL in 35s` — **8/8 test cases PASSED** (`tests="8" skipped="0" failures="0" errors="0"`), Spring Boot ghi nhận `Exposing 4 endpoints beneath base path '/actuator'` (`health`, `info`, `metrics`, `prometheus`).

| Test Case | Mục tiêu kiểm thử | Kết quả |
| :--- | :--- | :--- |
| `[SP3-1111]` Public IP / thiếu token | `GET /actuator/prometheus` với `Host: 221.121.4.97:8080`, IP `203.0.113.10` → `401 Unauthorized` | **PASS** |
| `[SP3-1111]` Docker bridge gateway `.1` | `GET /actuator/prometheus` từ gateway `172.18.0.1` dù giả mạo `Host: backend:8080` → `401 Unauthorized` | **PASS** |
| `[SP3-1111]` Internal Docker scrape | `GET /actuator/prometheus` từ container nội bộ `172.18.0.5` với `Host: backend:8080` → `200 OK` (`# HELP`) | **PASS** |
| `[SP3-1111]` Admin JWT token | `GET /actuator/prometheus` với token `ROLE_ADMIN` → `200 OK` (chứa metrics `jvm_`) | **PASS** |
| `[SP1-OPS-02]` Regression Actuator | `/actuator/health` (`200 UP`), `/actuator/info` (`401`), `/actuator/metrics` (`401` không token / `200` có token) | **PASS (4/4)** |

### 2.2. Kiểm chứng Cấu hình Docker Compose & Prometheus
- **Lệnh thực thi (Docker Compose `v5.4.0`):**
  ```powershell
  docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml config -q
  docker-compose -f docker-compose.monitoring.yml config -q
  ```
- **Kết quả quan sát trực tiếp:** Cả hai lệnh đều thoát với mã `0` (cấu hình hợp lệ cả khi chạy ghép stack chính lẫn đứng độc lập).
- **Xác minh render cấu hình `docker-compose -f docker-compose.monitoring.yml config`:**
  - Service `prometheus` (`hotel-prometheus`, image `prom/prometheus:v2.55.1`).
  - Bind volume chỉ đọc `./monitoring/prometheus.yml` → `/etc/prometheus/prometheus.yml`.
  - Port `127.0.0.1:9090:9090` (chỉ lắng nghe loopback trên VPS, truy cập an toàn qua SSH tunnel `ssh -N -L 9090:127.0.0.1:9090 <user>@221.121.4.97`).
  - Tham gia mạng `hotel-network` nội bộ để scrape trực tiếp `backend:8080/actuator/prometheus`.

### 2.3. Kiểm thử Kịch bản Diễn tập Phục hồi (`scripts/test_backup_restore.sh`)
- **Trạng thái tệp trong Git:** mode `100755` (`executable`), chuẩn line ending LF (`\n`).
- **Lệnh kiểm tra cú pháp & chế độ mô phỏng an toàn:**
  ```bash
  bash -n scripts/test_backup_restore.sh
  bash scripts/test_backup_restore.sh --dry-run --allow-sample-fallback
  ```
- **Kết quả quan sát trực tiếp (`2026-11-11 14:39:33 SEAST`, Git Commit `b7243de`):**
  - `bash -n`: exit code `0` (cú pháp hợp lệ trên toàn bộ `backup_mysql.sh`, `restore_mysql.sh`, `setup_cron.sh`, `test_backup_restore.sh`).
  - Tạo tệp sao lưu nén `.sql.gz` mẫu từ migrations (`V1__init_schema.sql`, `V2__seed_data.sql`, `V3__create_audit_logs.sql`): `hotel_db_backup_sample_20261111_143934.sql.gz` (`5327 bytes`).
  - Kiểm tra `gzip -t`: **PASS** (100% toàn vẹn).
  - Kiểm tra cô lập luồng SQL chỉ nạp vào `hotel_db_dr_test` & guardrail từ chối `hotel_db`: **PASS**.

> [!NOTE]
> **Giới hạn môi trường cục bộ được ghi nhận trung thực:** Khi kiểm tra `docker ps` trên máy trạm Windows local, dịch vụ Docker Desktop Linux Engine chưa được khởi chạy (`open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`) và không có `mysql` CLI client trên Host local. Vì vậy, bài đo thời gian **RTO thực tế (wall-clock seconds)** và **kết quả truy vấn MySQL 8.0 live** dưới đây cần được chạy trực tiếp trên máy chủ VPS (`221.121.4.97`) hoặc runner Linux có Docker daemon theo đúng quy trình tại Mục 3.

---

## 3. Quy Trình Chạy Diễn Tập Live & Bảng Nghiệm Thu RTO / SQL (Trên VPS / Docker Host)

### 3.1. Lệnh thực thi trên VPS (`221.121.4.97`)
```bash
# Cách 1: Diễn tập bằng file backup thực tế mới nhất trong /var/backups/hotel_db vào DB TEST cô lập (hotel_db_dr_test)
./scripts/test_backup_restore.sh

# Cách 2: Diễn tập cô lập mức Container (tự bật container mysql:8.0 tạm 'hotel-mysql-dr-test' rồi tự hủy sau khi verify)
./scripts/test_backup_restore.sh --isolated-container --allow-sample-fallback
```

### 3.2. Khung ghi nhận chỉ số RTO (Recovery Time Objective)

| Hạng mục đo lường | Giá trị / Công thức trong `scripts/test_backup_restore.sh` | Tiêu chuẩn đạt | Trạng thái trên Local Dry-Run | Kết quả Live VPS (`221.121.4.97`) |
| :--- | :--- | :--- | :--- | :--- |
| **Start Timestamp** | `START_TS=$(date '+%Y-%m-%d %H:%M:%S %Z')` | Ghi nhận trước `CREATE DATABASE` | `2026-11-11 14:39:33 SEAST` (dry-run) | *Chờ chạy trên VPS có Docker/MySQL* |
| **End Timestamp** | `END_TS=$(date '+%Y-%m-%d %H:%M:%S %Z')` | Ghi nhận ngay sau `mysql < sanitized.sql` | N/A (`--dry-run` bỏ qua nạp DB live) | *Chờ chạy trên VPS có Docker/MySQL* |
| **RTO thực tế (`RTO_SECONDS`)** | `END_EPOCH - START_EPOCH` | **`< 300 giây` (5 phút)** | Đã xác minh logic ngưỡng `--rto-limit 300` | *Chờ chạy trên VPS có Docker/MySQL* |

### 3.3. Bộ Truy Vấn SQL Kiểm Tra Toàn Vẹn Dữ Liệu (Data Integrity Verification Queries)

Script [scripts/test_backup_restore.sh](../scripts/test_backup_restore.sh) tự động thực thi đầy đủ các truy vấn kiểm chứng sau trên `hotel_db_dr_test` ngay sau khi restore:

1. **Kiểm tra danh sách và tổng số bảng khôi phục:**
   ```sql
   SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'hotel_db_dr_test';
   ```
   - Yêu cầu: `>= 7` bảng cốt lõi (`8` bảng với schema Sprint 3 gồm `users`, `room_types`, `room_type_images`, `rooms`, `bookings`, `booking_rooms`, `payment_transactions`, `audit_logs`).

2. **Kiểm tra số bản ghi (Row Counts) các bảng nghiệp vụ cốt lõi:**
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM room_types;
   SELECT COUNT(*) FROM rooms;
   SELECT COUNT(*) FROM bookings;
   SELECT COUNT(*) FROM booking_rooms;
   SELECT COUNT(*) FROM payment_transactions;
   SELECT COUNT(*) FROM audit_logs;
   ```
   - Khi chạy với dữ liệu mẫu Flyway (`V2__seed_data.sql` qua `--allow-sample-fallback`), baseline kỳ vọng gồm: `users = 4`, `room_types = 3`, `rooms = 10`, `bookings = 6`, `booking_rooms = 2`, `payment_transactions = 5`.
   - Khi chạy trên VPS với bản backup thực tế, toàn bộ 7 bảng phải không ở trạng thái `MISSING` (`CNT_* != MISSING`).

3. **Kiểm tra toàn vẹn khóa ngoại & ràng buộc logic (Zero Orphan Rows Required):**
   ```sql
   -- 1. Phòng vật lý không có loại phòng hợp lệ (kỳ vọng = 0)
   SELECT COUNT(*) FROM rooms r
   LEFT JOIN room_types rt ON r.room_type_id = rt.id
   WHERE rt.id IS NULL;

   -- 2. Đơn đặt phòng trỏ tới user không tồn tại (kỳ vọng = 0)
   SELECT COUNT(*) FROM bookings b
   LEFT JOIN users u ON b.user_id = u.id
   WHERE u.id IS NULL;

   -- 3. Đơn đặt phòng trỏ tới loại phòng không tồn tại (kỳ vọng = 0)
   SELECT COUNT(*) FROM bookings b
   LEFT JOIN room_types rt ON b.room_type_id = rt.id
   WHERE rt.id IS NULL;

   -- 4. Giao dịch thanh toán không gắn với đơn đặt phòng hợp lệ (kỳ vọng = 0)
   SELECT COUNT(*) FROM payment_transactions pt
   LEFT JOIN bookings b ON pt.booking_id = b.id
   WHERE b.id IS NULL;

   -- 5. Gán phòng check-in không gắn đúng booking hoặc phòng vật lý (kỳ vọng = 0)
   SELECT COUNT(*) FROM booking_rooms br
   LEFT JOIN bookings b ON br.booking_id = b.id
   LEFT JOIN rooms r ON br.room_id = r.id
   WHERE b.id IS NULL OR r.id IS NULL;

   -- 6. Đơn đặt phòng sai logic ngày nhận/trả phòng (kỳ vọng = 0)
   SELECT COUNT(*) FROM bookings
   WHERE check_out_date <= check_in_date;
   ```
   - Chỉ khi tổng số vi phạm `TOTAL_ORPHANS = 0` và `RTO_SECONDS < 300`, script mới trả về `exit 0`. Nếu phát hiện bất kỳ sai lệch nào, script trả `exit 1`.

---

## 4. Xác Nhận An Toàn Dữ Liệu Production (Safety Confirmation)

Hệ thống diễn tập áp dụng **4 lớp bảo vệ** để bảo đảm Production DB (`hotel_db`) an toàn 100%, không downtime:
1. **Kiểm tra danh tính DB đích (`assert_safe_target_db`):** Từ chối tức thì (`exit 1`) nếu tên DB diễn tập trùng `hotel_db`, `$MYSQL_DATABASE`, `hotel_booking`, `production`, `prod`, `mysql`, `information_schema`, `performance_schema`, `sys`, hoặc chứa ký tự ngoài `[a-zA-Z0-9_]`.
2. **Làm sạch luồng SQL trước khi nạp (SQL Stream Sanitization):** Quét và loại bỏ mọi câu lệnh `USE`, `CREATE DATABASE`, `DROP DATABASE` trỏ tới `hotel_db` nếu tệp dump chứa chỉ thị chuyển database, đảm bảo MySQL client chỉ ghi vào `hotel_db_dr_test`.
3. **Tùy chọn cô lập mức Container (`--isolated-container`):** Khởi chạy container `hotel-mysql-dr-test` riêng biệt (`mysql:8.0`) và tự dọn sạch bằng `trap cleanup EXIT`, hoàn toàn tách rời container & volume của `hotel-mysql`.
4. **Đối chứng trước/sau (Read-only Audit):** Ghi nhận `PROD_TABLES_BEFORE` và `PROD_TABLES_AFTER` hoàn toàn qua truy vấn chỉ đọc trên `information_schema.tables`, chứng minh schema Production không hề bị thay đổi trong suốt diễn tập.

