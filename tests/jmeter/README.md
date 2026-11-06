# 🧪 Kịch Bản & Hướng Dẫn Kiểm Thử Tranh Chấp Đặt Phòng Đồng Thời (JMeter Concurrency Test)

> **Mã công việc:** Task `[SP2-QA-01]` & `[SP2-1106-TRUNG]`  
> **Người thực hiện:** Kỹ sư QA & DevOps — Nguyễn Việt Trung (`Vtrung_Tester`)  
> **Dự án:** Hotel Booking System (HBS) — Grand Aurora Luxury Hotel  
> **Kịch bản kiểm thử:** `tests/jmeter/Hotel_Booking_Concurrency_Test.jmx`  
> **Môi trường mục tiêu mặc định:** Máy chủ Staging VPS `221.121.4.97:8080`  
> **Tiêu chuẩn nghiệp vụ:** Khóa bi quan chống Overbooking (`SRS §3.3` & `SRS §FR-03`)  
> **Báo cáo Baseline chi tiết:** [`docs/testing/baseline-report.md`](../../docs/testing/baseline-report.md) (Bàn giao Đức Anh ngày 09/11/2026)  

---

## 📋 1. Tổng Quan Mục Tiêu Kiểm Thử

Kiểm thử tranh chấp đặt phòng đồng thời (Concurrency / Race Condition Test) ở các mốc tải baseline **10, 50, 100 Threads** nhằm đảm bảo:
1. **Chống bán phòng vượt mức (Overbooking Prevention):** Khi nhiều khách hàng đồng thời gửi yêu cầu đặt **duy nhất 1 suất phòng** trong cùng một khoảng ngày (`2026-12-01` đến `2026-12-03`), hệ thống phải dùng cơ chế **Khóa bi quan (`SELECT ... FOR UPDATE`)** để tuần tự hóa giao dịch.
2. **Nghiệm thu tỷ lệ phản hồi chính xác:**
   - **Chính xác 1 request** thành công với mã **`HTTP 200 OK` hoặc `HTTP 201 Created`**, trả về `bookingCode` hợp lệ.
   - **Tất cả các requests còn lại** bị chặn an toàn với mã lỗi nghiệp vụ **`HTTP 409 Conflict` (hoặc `HTTP 400 Bad Request`)** kèm thông báo phòng đã được đặt hoặc hết phòng.
3. **Phân loại lỗi minh bạch:** Phân biệt rõ giữa:
   - **Lỗi nghiệp vụ mong đợi:** `HTTP 409 Conflict / 400 Bad Request` (Hết phòng). Kịch bản tự động xác nhận Pass hợp đồng nghiệp vụ, không đánh dấu Fail kịch bản.
   - **Lỗi xác thực (Auth Failure):** `HTTP 401 Unauthorized` / `HTTP 403 Forbidden` (Chỉ số kỳ vọng: **0%**).
   - **Lỗi hạ tầng / hệ thống (Infrastructure Failure):** `HTTP 500` / `502` / `504` / `Connection Timeout` (Chỉ số kỳ vọng: **0%**).

---

## 🗂️ 2. Cấu Trúc Thư Mục & Tài Nguyên Kiểm Thử

```
Hotel-Booking-System_HBS/
├── tests/
│   ├── jmeter/
│   │   ├── Hotel_Booking_Concurrency_Test.jmx  # Kịch bản JMeter hỗ trợ biến động -Jusers=..., 3 Listeners, JSR223 Assertion
│   │   ├── README.md                           # Tài liệu hướng dẫn thực thi & báo cáo nghiệm thu
│   │   └── reports/                            # Thư mục lưu báo cáo HTML Dashboard tự động
│   └── fixtures/
│       ├── test_users.csv                      # Danh sách 100 tài khoản test độc lập (username/password)
│       ├── seed_concurrency_data.sql           # Nạp 1 suất phòng (Room 991, Type 99) & 100 tài khoản
│       ├── reset_concurrency_data.sql          # Xóa sạch booking test, đưa phòng về AVAILABLE
│       ├── verify_concurrency_db.sql           # Truy vấn SQL kiểm chứng toàn vẹn CSDL sau test
│       └── booking_payload.json                # Payload mẫu tạo booking
├── scripts/
│   ├── run_load_tests.sh                       # Script Bash chạy tự động non-GUI qua 10, 50, 100 users [SP2-1106-TRUNG]
│   ├── run_load_tests.ps1                      # Script PowerShell chạy tự động non-GUI trên Windows
│   ├── reset_concurrency_fixture.ps1           # Script PowerShell nạp/reset dữ liệu (Windows)
│   ├── reset_concurrency_fixture.sh            # Script Shell nạp/reset dữ liệu (Linux/VPS)
│   ├── verify_concurrency_db.ps1               # Script PowerShell kiểm chứng CSDL (Windows)
│   └── verify_concurrency_db.sh                # Script Shell kiểm chứng CSDL (Linux/VPS)
└── docs/
    └── testing/
        └── baseline-report.md                  # Báo cáo Baseline 10/50/100 users bàn giao Đức Anh ngày 09/11
```

---

## ⚙️ 3. Cấu Hình Kịch Bản JMeter (`Hotel_Booking_Concurrency_Test.jmx`)

### 3.1. HTTP Request Defaults
- **HOST:** `${__P(host,221.121.4.97)}` (Mặc định trỏ trực tiếp tới máy chủ Staging VPS `221.121.4.97`).
- **PORT:** `${__P(port,8080)}`
- **PROTOCOL:** `${__P(protocol,http)}`
- **BASE_PATH:** `/api/v1`

### 3.2. Cấu hình Thread Group Linh Hoạt Qua Biến `-Jusers`
- **Số lượng Thread (Users):** `${__P(users,100)}` (Mặc định 100 threads, dễ dàng tùy biến qua CLI `-Jusers=10`, `-Jusers=50`, `-Jusers=100`).
- **Ramp-up period:** `1s`.
- **Loop Count:** `1`.
- **Synchronizing Timer (Rendezvous Point):**
  - Đặt ngay trước sampler `2. Đặt phòng đồng thời - Create Booking`.
  - `groupSize`: `${__P(users,100)}` (Tự động đồng bộ số threads hội tụ theo biến `users`).
  - `timeoutInMs`: `15000` (15 giây timeout an toàn).

### 3.3. Cấu hình Request Luồng Đặt Phòng
- **Sampler:** `POST /api/v1/bookings`
- **Header:**
  - `Content-Type: application/json`
  - `Authorization: Bearer ${CONCURRENT_TOKEN}` (Trích xuất tự động từ request đăng nhập phía trước)
- **Payload:** Cạnh tranh cùng loại phòng `roomTypeId: 99` với số lượng 1 phòng cho ngày `2026-12-01` $\rightarrow$ `2026-12-03`.

### 3.4. Cấu hình Assertions & Phân Loại Lỗi
- **`ResponseAssertion` linh hoạt:** Kiểm tra mã trả về khớp `200|201|400|409` với cờ `assume_success = true`.
- **`JSR223Assertion` (Groovy):**
  - Nếu `HTTP 200` hoặc `HTTP 201`: Assert payload chứa `bookingCode` hoặc `success: true`. Đánh dấu **Winner thành công**.
  - Nếu `HTTP 409` hoặc `HTTP 400`: Assert thông báo chứa *"không đủ"* / *"đã được đặt"* / *"Conflict"*. Đánh dấu **Expected Business Rejection (Hợp đồng nghiệp vụ đạt)**.
  - Nếu `HTTP 401 / 403`: Đánh dấu **Fail nghiêm trọng do lỗi xác thực (Auth Failure)**.
  - Nếu `HTTP 500 / 502 / 504`: Đánh dấu **Fail nghiêm trọng do lỗi hệ thống / sập DB (Infrastructure Failure)**.

### 3.5. Cấu hình 3 Listeners Đầy Đủ
Kịch bản đã được tích hợp sẵn 3 Listeners tiêu chuẩn trong JMeter 5.6:
1. **`View Results Tree` (`ViewResultsFullVisualizer`):** Theo dõi chi tiết request/response của từng thread.
2. **`Aggregate Report` (`StatVisualizer`):** Thống kê chi tiết Samples, Average, Median, 90th/95th/99th Percentile, Min, Max, Error %, Throughput.
3. **`Summary Report` (`SummaryReport`):** Tổng kết hiệu năng nhanh chóng.

---

## 🚀 4. Hướng Dẫn Chạy & Xuất Báo Cáo Non-GUI (CLI Mode)

### 4.1. Chạy Tự Động Toàn Bộ Các Mức Tải Baseline (10, 50, 100 Users) [SP2-1106-TRUNG]

Sử dụng script chạy tự động để tự động nạp fixtures, dọn dẹp báo cáo cũ và xuất HTML report cho từng mốc tải:

- **Trên Linux / VPS (Bash):**
  ```bash
  bash scripts/run_load_tests.sh
  ```
- **Trên Windows (PowerShell):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\scripts\run_load_tests.ps1
  ```

### 4.2. Lệnh thực thi đơn lẻ thủ công bằng JMeter CLI

```bash
# Xóa file log và thư mục báo cáo cũ nếu có
rm -rf results.jtl report/

# Thực thi kiểm thử 100 threads và xuất HTML report
jmeter -n -t tests/jmeter/Hotel_Booking_Concurrency_Test.jmx -Jusers=100 -l results.jtl -e -o report/
```

### 4.3. Chuyển đổi môi trường linh hoạt qua tham số `-J`

```bash
# Chạy trên máy Local với 50 users
jmeter -n -t tests/jmeter/Hotel_Booking_Concurrency_Test.jmx \
       -Jhost=localhost \
       -Jport=8080 \
       -Jusers=50 \
       -l results_local_50.jtl \
       -e -o report_local_50/
```

---

## 🔍 5. Kiểm Chứng Cơ Sở Dữ Liệu Sau Khi Chạy Test

Sau khi đợt bắn tải kết thúc, chạy script kiểm chứng để đối soát thực tế:

- **Trên Windows (PowerShell):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\scripts\verify_concurrency_db.ps1
  ```
- **Trên Linux / VPS (Bash):**
  ```bash
  bash scripts/verify_concurrency_db.sh
  ```

---

## 📊 6. Mẫu Báo Cáo Nghiệm Thu 100 Users

### Bảng 1: Phân Tách Tỷ Lệ Phản Hồi Request (100 Users Spike)

| Hạng mục phản hồi | Mã HTTP Status | Số lượng User | Tỷ lệ (%) | Đánh giá nghiệm thu |
| :--- | :---: | :---: | :---: | :--- |
| **Thành công (Booking Success)** | `200 OK / 201 Created` | **1** | **1.0%** | **Đạt** — Duy nhất 1 khách đặt thành công |
| **Xung đột nghiệp vụ (Business Conflict)** | `409 Conflict / 400 Bad Request` | **99** | **99.0%** | **Đạt** — 99 khách bị từ chối an toàn vì hết phòng |
| **Lỗi xác thực & phân quyền (Auth Failure)** | `401 / 403` | **0** | **0.0%** | **Đạt** — Toàn bộ 100 user xác thực thành công |
| **Lỗi hạ tầng & sập hệ thống (System Error)** | `500 / 502 / 504 / Timeout` | **0** | **0.0%** | **Đạt** — Hệ thống ổn định, không deadlock |
| **Tổng cộng** | — | **100** | **100.0%** | **HOÀN THÀNH TOÀN DIỆN (ZERO OVERBOOKING)** |

---

## 📑 7. Báo Cáo Baseline Nghiệm Thu & Kế Hoạch Bàn Giao [SP2-1106-TRUNG]

Báo cáo đầy đủ với số liệu đối sánh chi tiết giữa **10 vs 50 vs 100 users** (Response Time P95, Throughput, Tỷ lệ lỗi 0%, Zero Overbooking) được lưu trữ tại:
👉 **[`docs/testing/baseline-report.md`](../../docs/testing/baseline-report.md)**

Tài liệu và toàn bộ artifacts đã được cấu trúc sẵn sàng để **bàn giao cho kỹ sư Backend Đức Anh vào ngày 09/11/2026** phục vụ rà soát tối ưu hóa DB Index / Locking theo kế hoạch Sprint 2.
