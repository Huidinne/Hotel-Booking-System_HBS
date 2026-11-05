# 🧪 Kịch Bản & Hướng Dẫn Kiểm Thử Tranh Chấp Đặt Phòng Đồng Thời (JMeter Concurrency Test)

> **Mã công việc:** Task `[SP2-1105-TRUNG]`  
> **Người thực hiện:** Kỹ sư QA & DevOps — Nguyễn Việt Trung (`Vtrung_Tester`)  
> **Dự án:** Hotel Booking System (HBS) — Grand Aurora Luxury Hotel  
> **Kịch bản kiểm thử:** `tests/jmeter/Hotel_Booking_Concurrency_Test.jmx`  
> **Tiêu chuẩn nghiệp vụ:** Khóa bi quan chống Overbooking (`SRS §3.3` & `SRS §FR-03`)  

---

## 📋 1. Tổng Quan Mục Tiêu Kiểm Thử

Kiểm thử tranh chấp đặt phòng đồng thời (Concurrency / Race Condition Test) nhằm đảm bảo:
1. **Chống bán phòng vượt mức (Overbooking Prevention):** Khi **10 khách hàng đồng thời** cùng gửi yêu cầu đặt **duy nhất 1 suất phòng** trong cùng một khoảng ngày (`2026-12-01` đến `2026-12-03`), hệ thống phải dùng cơ chế **Khóa bi quan (`SELECT ... FOR UPDATE`)** để tuần tự hóa giao dịch.
2. **Nghiệm thu tỷ lệ phản hồi chính xác:**
   - **Chính xác 1 request (10%)** thành công với mã **`HTTP 201 Created`**, trả về `bookingCode` hợp lệ.
   - **9 requests còn lại (90%)** bị chặn an toàn với mã lỗi nghiệp vụ **`HTTP 409 Conflict`** kèm thông báo `"Số phòng trống không đủ"`.
3. **Phân loại lỗi minh bạch:** Phân biệt rõ giữa:
   - **Lỗi nghiệp vụ mong đợi:** `HTTP 409 Conflict` (Hết phòng).
   - **Lỗi xác thực (Auth Failure):** `HTTP 401 Unauthorized` / `HTTP 403 Forbidden` (Chỉ số kỳ vọng: **0%**).
   - **Lỗi hạ tầng / hệ thống (Infrastructure Failure):** `HTTP 500` / `502` / `504` / `Connection Timeout` (Chỉ số kỳ vọng: **0%**).

---

## 🗂️ 2. Cấu Trúc Thư Mục & Tài Nguyên Kiểm Thử

```
Hotel-Booking-System_HBS/
├── tests/
│   ├── jmeter/
│   │   ├── Hotel_Booking_Concurrency_Test.jmx  # Kịch bản kiểm thử JMeter (Thread Group 10 users, Sync Timer, JSR223 Assertion)
│   │   └── README.md                           # Tài liệu hướng dẫn thực thi & báo cáo nghiệm thu
│   └── fixtures/
│       ├── test_users.csv                      # Danh sách 10 tài khoản test độc lập (username/password)
│       ├── seed_concurrency_data.sql           # Nạp 1 suất phòng (Room 991, Type 99) & 10 tài khoản
│       ├── reset_concurrency_data.sql          # Xóa sạch booking test, đưa phòng về AVAILABLE
│       ├── verify_concurrency_db.sql           # Truy vấn SQL kiểm chứng toàn vẹn CSDL sau test
│       └── booking_payload.json                # Payload mẫu tạo booking
└── scripts/
    ├── reset_concurrency_fixture.ps1           # Script PowerShell nạp/reset dữ liệu (Windows)
    ├── reset_concurrency_fixture.sh            # Script Shell nạp/reset dữ liệu (Linux/VPS)
    ├── verify_concurrency_db.ps1               # Script PowerShell kiểm chứng CSDL (Windows)
    └── verify_concurrency_db.sh                # Script Shell kiểm chứng CSDL (Linux/VPS)
```

---

## ⚙️ 3. Chuẩn Bị Môi Trường & Dữ Liệu Kiểm Thử

### Bước 1: Khởi động Backend & Cơ sở dữ liệu
Đảm bảo hệ thống Spring Boot Backend (`http://localhost:8080`) và MySQL (`3306`) đã sẵn sàng hoạt động.

### Bước 2: Nạp Fixture Dữ Liệu Ban Đầu
Khởi tạo loại phòng kiểm thử `id = 99` (Single Concurrency Suite), đúng 1 buồng phòng vật lý `id = 991` (phòng 991, `status = AVAILABLE`) và 10 tài khoản khách hàng test (`concurrency_user1@hotel.com` đến `concurrency_user10@hotel.com`):

- **Trên Windows (PowerShell):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\scripts\reset_concurrency_fixture.ps1 -Mode "seed"
  ```
- **Trên Linux / macOS / Git Bash:**
  ```bash
  bash scripts/reset_concurrency_fixture.sh seed
  ```

### Bước 3: Reset Dữ Liệu Trước Mỗi Lần Chạy Test Plan
Để xóa sạch các đơn đặt phòng từ lần chạy trước và đưa phòng 991 về trạng thái trống:

- **Trên Windows (PowerShell):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\scripts\reset_concurrency_fixture.ps1 -Mode "reset"
  ```
- **Trên Linux / macOS / Git Bash:**
  ```bash
  bash scripts/reset_concurrency_fixture.sh reset
  ```

---

## 🚀 4. Hướng Dẫn Chạy Kiểm Thử Qua JMeter CLI

Thực thi kịch bản bằng **JMeter Non-GUI Mode (CLI)** để đảm bảo độ chính xác thời gian mili-giây cao nhất và tự động xuất HTML Dashboard:

### 4.1. Lệnh thực thi cơ bản (Localhost:8080)

```bash
# Xóa kết quả lần chạy trước (nếu có)
rm -rf results.jtl report/

# Chạy kịch bản và sinh HTML Dashboard Report
jmeter -n -t tests/jmeter/Hotel_Booking_Concurrency_Test.jmx -l results.jtl -e -o report/
```

### 4.2. Tùy biến tham số linh hoạt cho các môi trường (Local / Staging / VPS)

JMeter Test Plan đã được tham số hóa thông qua hàm `${__P(property,default)}`:

| Biến tham số | Giá trị mặc định | Mô tả |
| :--- | :--- | :--- |
| `-Jhost` | `localhost` | Tên miền hoặc địa chỉ IP máy chủ Backend |
| `-Jport` | `8080` | Cổng dịch vụ Backend |
| `-Jprotocol` | `http` | Giao thức (`http` hoặc `https`) |
| `-JroomTypeId` | `99` | Mã loại phòng kiểm thử (1 suất trống) |
| `-JcheckIn` | `2026-12-01` | Ngày nhận phòng |
| `-JcheckOut` | `2026-12-03` | Ngày trả phòng |
| `-JcsvPath` | `tests/fixtures/test_users.csv` | Đường dẫn đến tệp danh sách tài khoản test |

**Ví dụ chạy trên máy chủ Staging VPS (`221.121.4.97:8080`):**
```bash
jmeter -n -t tests/jmeter/Hotel_Booking_Concurrency_Test.jmx \
       -Jhost=221.121.4.97 \
       -Jport=8080 \
       -Jprotocol=http \
       -l results_vps.jtl \
       -e -o report_vps/
```

### 4.3. Chạy qua giao diện đồ họa (JMeter GUI Mode - Kiểm tra trực quan)
1. Mở JMeter: `jmeter`
2. Chọn **File** $\rightarrow$ **Open...** $\rightarrow$ `tests/jmeter/Hotel_Booking_Concurrency_Test.jmx`.
3. Nhấn **Start** (biểu tượng Play màu xanh).
4. Quan sát chi tiết từng request tại **View Results Tree** và **Summary Report**.

---

## 🔍 5. Hướng Dẫn Đối Chiếu Kết Quả (Log JMeter vs Database)

Sau khi kịch bản JMeter hoàn thành, bắt buộc thực hiện kiểm chứng chéo giữa **Báo cáo JMeter** và **Dữ liệu thực tế trong MySQL**:

### Bước 1: Thực thi Script Kiểm Chứng CSDL Tự Động

- **Trên Windows (PowerShell):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\scripts\verify_concurrency_db.ps1
  ```
- **Trên Linux / macOS / Git Bash:**
  ```bash
  bash scripts/verify_concurrency_db.sh
  ```

### Bước 2: Bảng Đối Chiếu Tiêu Chí Nghiệm Thu

| Tiêu chí đối soát | Log / Báo cáo JMeter | Cơ sở dữ liệu MySQL (`hotel_db`) | Kết luận |
| :--- | :--- | :--- | :---: |
| **Request chiến thắng** | Đúng 1 request trả về `HTTP 201 Created` kèm `bookingCode` | Bảng `bookings` có đúng 1 bản ghi mới (`COUNT(*) = 1`) | **PASS** |
| **Request bị từ chối** | 9 requests trả về `HTTP 409 Conflict` (Số phòng trống không đủ) | Không có thêm bản ghi booking nào khác được tạo | **PASS** |
| **Trạng thái tồn phòng** | Các request sau không thể đặt phòng | Truy vấn phòng trống trả về `available_rooms = 0` | **PASS** |
| **Lỗi xác thực (Auth)** | 0 request bị `401` hoặc `403` | 10 tài khoản đều active (`is_active = 1`) | **PASS** |
| **Lỗi hệ thống (System)** | 0 request bị `500`, `502`, timeout | Không phát sinh lỗi Deadlock hay transaction rollback | **PASS** |

---

## 📊 6. Mẫu Báo Cáo Nghiệm Thu Kiểm Thử (Test Report Template)

Dưới đây là mẫu tổng hợp kết quả phục vụ bàn giao và nghiệm thu task `[SP2-1105-TRUNG]`:

### Bảng 1: Phân Tách Tỷ Lệ Phản Hồi Request

| Hạng mục phản hồi | Mã HTTP Status | Số lượng User | Tỷ lệ (%) | Đánh giá nghiệm thu |
| :--- | :---: | :---: | :---: | :--- |
| **Thành công (Booking Success)** | `201 Created` | **1** | **10.0%** | **Đạt** — Duy nhất 1 khách đặt thành công |
| **Xung đột nghiệp vụ (Business Conflict)** | `409 Conflict` | **9** | **90.0%** | **Đạt** — 9 khách bị từ chối an toàn vì hết phòng |
| **Lỗi xác thực & phân quyền (Auth Failure)** | `401 / 403` | **0** | **0.0%** | **Đạt** — Toàn bộ 10 user xác thực thành công |
| **Lỗi hạ tầng & sập hệ thống (System Error)** | `500 / 502 / 504` | **0** | **0.0%** | **Đạt** — Hệ thống ổn định, không deadlock |
| **Tổng cộng** | — | **10** | **100.0%** | **HOÀN THÀNH TOÀN DIỆN** |

### Bảng 2: Kết Quả Kiểm Chứng Trực Tiếp Trong Database

```sql
mysql> SELECT COUNT(*) AS total_bookings_created, concurrency_verdict FROM ...;
+------------------------+--------------------------------------------------------+
| total_bookings_created | concurrency_verdict                                    |
+------------------------+--------------------------------------------------------+
|                      1 | PASSED (Chính xác 1 booking - Không Overbooking)        |
+------------------------+--------------------------------------------------------+

mysql> SELECT total_active_rooms, booked_rooms, available_rooms, availability_status FROM ...;
+--------------------+--------------+-----------------+------------------------------------------+
| total_active_rooms | booked_rooms | available_rooms | availability_status                      |
+--------------------+--------------+-----------------+------------------------------------------+
|                  1 |            1 |               0 | PASSED (0 phòng khả dụng - Đã bán hết)   |
+--------------------+--------------+-----------------+------------------------------------------+
```

---

## 🛠️ 7. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

1. **Lỗi `PSSecurityException` khi chạy file script `.ps1` trên Windows:**
   - *Nguyên nhân:* PowerShell mặc định chặn thực thi script chưa được cấp phép.
   - *Khắc phục:* Luôn thêm cờ `-ExecutionPolicy Bypass`:
     ```powershell
     powershell -ExecutionPolicy Bypass -File .\scripts\reset_concurrency_fixture.ps1 -Mode "seed"
     ```
2. **Lỗi `403 Forbidden` khi đăng nhập hoặc tạo booking:**
   - *Nguyên nhân:* Token cũ bị kẹt trong browser `localStorage` hoặc tài khoản test bị vô hiệu hóa (`is_active = FALSE`).
   - *Khắc phục:* Chạy lại script seed dữ liệu để đảm bảo các tài khoản test đều có `is_active = TRUE`.
3. **Cả 10 requests đều nhận mã `409 Conflict` ngay từ đầu:**
   - *Nguyên nhân:* Buồng phòng test đã bị đặt từ lần kiểm thử trước mà chưa được dọn dẹp.
   - *Khắc phục:* Chạy lệnh reset fixture:
     ```powershell
     powershell -ExecutionPolicy Bypass -File .\scripts\reset_concurrency_fixture.ps1 -Mode "reset"
     ```
4. **Không tìm thấy tệp `tests/fixtures/test_users.csv`:**
   - *Nguyên nhân:* Thư mục làm việc hiện tại của lệnh `jmeter` không phải là thư mục gốc dự án.
   - *Khắc phục:* Chạy lệnh JMeter từ thư mục gốc `Hotel-Booking-System_HBS/` hoặc truyền tham số `-JcsvPath="<đường_dẫn_tuyệt_đối>"`.

