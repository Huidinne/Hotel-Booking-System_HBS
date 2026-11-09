# 🚀 Bộ Kiểm Thử Khép Kín Toàn Trình (End-to-End E2E Smoke Test Suite)

> **Mã công việc:** Task `[SP2-1109-TRUNG]`  
> **Người thực hiện:** Kỹ sư QA & DevOps — Nguyễn Việt Trung (`Vtrung_Tester`)  
> **Dự án:** Hotel Booking System (HBS) — Grand Aurora Luxury Hotel  
> **Mục tiêu:** Kiểm thử smoke test tự động qua 4 luồng nghiệp vụ cốt lõi: **Auth**, **Booking**, **Audit**, và **Chatbot**.  

---

## 🗂️ 1. Cấu Trúc Thư Mục Bộ Test E2E

```
tests/e2e/
├── config.js                 # Tham số hóa BASE_URL, timeout, endpoints
├── runner.js                 # Trình điều khiển thực thi CLI Master Runner
├── README.md                 # Tài liệu hướng dẫn cấu hình và chạy test
├── fixtures/
│   └── test-data.json        # Dữ liệu kiểm thử cố định (Admin, Customer, Booking template)
├── utils/
│   └── api-client.js         # HTTP client fetch wrapper, assert log & shared state
└── suites/
    ├── 01-auth.test.js       # Flow 1: Register, Login, Token generation, GET /auth/me
    ├── 02-booking.test.js    # Flow 2: Tra cứu phòng trống, Tạo booking, Tra cứu đơn cá nhân
    ├── 03-audit.test.js      # Flow 3: Bảo mật phân quyền Audit, Tra cứu nhật ký, vết CREATE_BOOKING
    └── 04-chat.test.js       # Flow 4: Chatbot hỏi đáp, duy trì Session, Tool calling tra cứu phòng
```

---

## ⚙️ 2. Cấu Hình & Tham Số Hóa Base URL

Bộ kiểm thử E2E sử dụng biến môi trường **`BASE_URL`** để linh hoạt chuyển đổi giữa môi trường phát triển cục bộ và máy chủ Staging VPS:

| Biến môi trường | Giá trị mặc định | Ví dụ Staging VPS | Mô tả |
| :--- | :--- | :--- | :--- |
| `BASE_URL` | `http://localhost:8080` | `http://221.121.4.97:8080` | Địa chỉ máy chủ Backend |
| `TIMEOUT_MS` | `10000` | `15000` | Thời gian timeout tối đa cho mỗi request HTTP |

> **Bảo mật tuyệt đối:** Bộ test không commit JWT token cố định. Toàn bộ token được trích xuất động từ API sau khi đăng nhập và lưu trong memory của runner. Email đăng ký được sinh ngẫu nhiên theo timestamp (`e2e_cust_<timestamp>@hotel.com`) để đảm bảo kịch bản có thể chạy lại vô số lần mà không bị lỗi trùng email.

---

## 🧪 3. Bốn Luồng Kiểm Thử Nghiệp Vụ Cốt Lõi (4 Smoke Flows)

### 3.1. Flow 1: Xác Thực & Quản Lý Phiên Làm Việc (Auth Suite)
- **Đăng ký tài khoản Customer mới:** Gọi `POST /api/v1/auth/register` $\to$ Kiểm tra trả về `HTTP 201 Created` kèm `accessToken`.
- **Đăng nhập cấp JWT Token:** Gọi `POST /api/v1/auth/login` $\to$ Kiểm tra trả về `HTTP 200 OK` kèm `accessToken`.
- **Xác thực phiên làm việc:** Gọi `GET /api/v1/auth/me` kèm Header `Authorization: Bearer <token>` $\to$ Kiểm tra đúng thông tin hồ sơ người dùng.
- **Đăng nhập Quản trị viên (Admin):** Lấy token Admin để chuẩn bị dữ liệu cho luồng Audit tiếp theo.

### 3.2. Flow 2: Tra Cứu Phòng Trống & Đặt Phòng (Booking Suite)
- **Tra cứu phòng trống:** Gọi `GET /api/v1/room-types` $\to$ Kiểm tra danh sách loại phòng active (`capacity`, `basePrice`).
- **Tạo đơn đặt phòng mới:** Gọi `POST /api/v1/bookings` với token Customer $\to$ Kiểm tra `HTTP 201 Created`, trạng thái `PENDING`, và mã đặt phòng `bookingCode`.
- **Tra cứu đơn cá nhân:** Gọi `GET /api/v1/bookings/my-bookings` $\to$ Kiểm tra đơn vừa tạo xuất hiện trong danh sách.

### 3.3. Flow 3: Kiểm Toán & Giám Sát Nhật Ký Thao Tác (Audit Suite)
- **Bảo mật phân quyền RBAC:** Gọi `GET /api/v1/admin/audit-logs` với token Customer $\to$ Kiểm tra hệ thống chặn an toàn với `HTTP 403 Forbidden`.
- **Tra cứu danh mục hành động:** Gọi `GET /api/v1/admin/audit-logs/actions` với token Admin $\to$ Trả về danh mục `AuditAction`.
- **Tra cứu danh sách Audit Log:** Gọi `GET /api/v1/admin/audit-logs` với token Admin $\to$ Trả về phân trang bản ghi.
- **Xác minh vết kiểm toán đặt phòng:** Kiểm tra tồn tại bản ghi audit có `action = 'CREATE_BOOKING'` khớp với đơn đặt phòng vừa tạo ở Flow 2.

### 3.4. Flow 4: Chatbot Tư Vấn & Phiên Hội Thoại (Chat Suite)
- **Tư vấn trực tuyến:** Gọi `POST /api/v1/chat/message` gửi lời chào $\to$ Kiểm tra Chatbot phản hồi chuỗi câu trả lời hợp lệ kèm `sessionId`.
- **Duy trì ngữ cảnh hội thoại:** Gửi câu hỏi tìm phòng $\to$ Kiểm tra Chatbot kích hoạt Tool tra cứu phòng và giữ nguyên ngữ cảnh `sessionId`.

---

## 🚀 4. Hướng Dẫn Chạy Kiểm Thử Qua Command Line (CLI)

### 4.1. Chạy trực tiếp bằng Node.js CLI

- **Môi trường Localhost (Mặc định `http://localhost:8080`):**
  ```bash
  node tests/e2e/runner.js
  ```

- **Môi trường Staging VPS (`http://221.121.4.97:8080`):**
  - Trên Linux / macOS / Git Bash:
    ```bash
    BASE_URL="http://221.121.4.97:8080" node tests/e2e/runner.js
    ```
  - Trên Windows (PowerShell):
    ```powershell
    $env:BASE_URL="http://221.121.4.97:8080"; node tests/e2e/runner.js
    ```

### 4.2. Chạy thông qua Scripts tự động hóa

- **Trên Linux / VPS (Bash):**
  ```bash
  bash scripts/run_e2e_tests.sh
  # Hoặc chỉ định Base URL:
  bash scripts/run_e2e_tests.sh http://221.121.4.97:8080
  ```

- **Trên Windows (PowerShell):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\scripts\run_e2e_tests.ps1
  # Hoặc chỉ định Base URL:
  powershell -ExecutionPolicy Bypass -File .\scripts\run_e2e_tests.ps1 -BaseUrl "http://221.121.4.97:8080"
  ```

