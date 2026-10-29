# 🏨 Hotel Booking System (HBS) - Grand Aurora Luxury Hotel

[![Continuous Integration (CI)](https://github.com/Huidinne/Hotel-Booking-System_HBS/actions/workflows/ci.yml/badge.svg)](https://github.com/Huidinne/Hotel-Booking-System_HBS/actions/workflows/ci.yml)
[![Continuous Deployment (CD)](https://github.com/Huidinne/Hotel-Booking-System_HBS/actions/workflows/deploy.yml/badge.svg)](https://github.com/Huidinne/Hotel-Booking-System_HBS/actions/workflows/deploy.yml)
![Java 21](https://img.shields.io/badge/Java-21%20LTS-ED8B00?logo=openjdk&logoColor=white)
![Spring Boot 3](https://img.shields.io/badge/Spring%20Boot-3.3.5-6DB33F?logo=springboot&logoColor=white)
![React 19](https://img.shields.io/badge/React-19.3.1-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)
![MySQL 8.0](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker%20Compose-v2-2496ED?logo=docker&logoColor=white)

Hệ thống Đặt phòng và Quản lý Lưu trú Khách sạn Trực tuyến dành cho Khách sạn Độc lập (**Grand Aurora Luxury Hotel & Suites**). Ứng dụng xây dựng theo kiến trúc **Modular Monolith**, tối ưu hiệu năng và bảo mật, tích hợp cổng thanh toán **VNPay Sandbox**, lưu trữ ảnh **Cloudinary**, và tự động hóa triển khai CI/CD bằng **GitHub Actions & Docker Compose**.

🌐 **Ứng dụng đã triển khai trực tiếp (Live Demo VPS):**  
👉 **[http://221.121.4.97](http://221.121.4.97)**

---

## 📌 Tính Năng Cốt Lõi Theo Vai Trò

### 1. Phân hệ Khách hàng (Customer)
- **Tìm kiếm buồng phòng thời gian thực:** Tra cứu loại phòng khả dụng theo khoảng ngày nhận/trả phòng và số lượng khách.
- **Cơ chế giữ chỗ & Đặt phòng:** Khóa giữ phòng tạm thời (`hold_expires_at`) trong 15 phút chống đặt trùng (Overbooking).
- **Thanh toán trực tuyến VNPay:** Hỗ trợ thanh toán đặt cọc 50% qua cổng VNPay Sandbox với mã giao dịch Idempotent.
- **Quản lý lịch sử đặt phòng:** Xem chi tiết đơn đặt phòng, theo dõi trạng thái, gửi yêu cầu hủy phòng kèm chính sách hoàn cọc tự động.

### 2. Phân hệ Lễ tân (Receptionist)
- **Quản lý danh sách Booking:** Tìm kiếm và lọc booking linh hoạt theo mã đơn, email khách, khoảng ngày check-in và trạng thái.
- **Xác nhận & Làm thủ tục Check-in:** Gán $N$ phòng vật lý thực tế còn trống (`AVAILABLE`) cho đơn đặt phòng.
- **Thủ tục Check-out:** Thu phần tiền 50% còn lại, giải phóng phòng và tự động chuyển trạng thái phòng sang cần dọn dẹp (`CLEANING`).
- **Xử lý hoàn cọc & No-Show:** Theo dõi hủy phòng và xử lý các đơn quá hạn check-in theo quy định khách sạn.

### 3. Phân hệ Quản trị viên (Admin)
- **Dashboard Thống kê:** Báo cáo doanh thu thực tế, tỷ lệ lấp đầy phòng (Occupancy Rate), số lượng đơn đặt phòng và biểu đồ tăng trưởng doanh thu theo tháng.
- **Quản lý Danh mục Loại phòng:** Thêm, sửa, đóng/mở loại phòng, cấu hình tiện ích, giá cơ sở và upload ảnh trực tiếp lên Cloudinary.
- **Quản lý Buồng phòng vật lý:** Phân bổ số phòng theo tầng, cập nhật trạng thái hoạt động / bảo trì (`MAINTENANCE`).

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Thành phần | Công nghệ / Thư viện chính | Ghi chú |
| :--- | :--- | :--- |
| **Backend** | Spring Boot 3.3.5, Java 21 LTS | RESTful API, Maven/Gradle Toolchain |
| **Bảo mật** | Spring Security 6, JJWT 0.12.6 | JWT Bearer Authentication, RBAC 3 vai trò |
| **Cơ sở dữ liệu** | MySQL 8.0 (InnoDB) | Composite Index, Row-level Locking chống overbooking |
| **Database Migration** | Flyway Migration 10.x | Tự động đồng bộ DDL schema và Seed Data mẫu |
| **Frontend** | React 19, React Router v7, Vite 8 | Single Page Application (SPA), Vanilla CSS Variables |
| **Dịch vụ thứ ba** | VNPay Sandbox, Cloudinary CDN | Cổng thanh toán trực tuyến & lưu trữ ảnh buồng phòng |
| **DevOps & CI/CD** | Docker, Docker Compose, Nginx, GitHub Actions | Tự động kiểm thử, build và deploy lên máy chủ VPS |

---

## 🔑 Tài Khoản Kiểm Thử (Seed Accounts)

Hệ thống đã nạp sẵn dữ liệu kiểm thử (Seed Data). Bạn có thể đăng nhập ngay trên **[http://221.121.4.97](http://221.121.4.97)**:

| Vai trò (Role) | Email đăng nhập | Mật khẩu mặc định | Quyền hạn chính |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@hotel.com` | `Password@123` | Toàn quyền quản trị phòng, buồng phòng & xem Dashboard doanh thu |
| **Receptionist** | `receptionist@hotel.com` | `Password@123` | Quản lý Booking, làm thủ tục Check-in (gán phòng) & Check-out |
| **Customer** | `customer@gmail.com` | `Password@123` | Tìm kiếm loại phòng, đặt cọc VNPay & quản lý lịch sử đặt phòng |

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy Local

### 1. Chuẩn bị môi trường
- **Git**, **Docker** & **Docker Compose** *(nếu chạy qua Docker)*.
- **Java 21 LTS** và **Node.js 20+** *(nếu chạy trực tiếp ở máy cá nhân)*.

### 2. Thiết lập biến môi trường
Sao chép file cấu hình mẫu tại thư mục gốc:
```bash
cp .env.example .env
```
*(Các tham số mặc định trong `.env.example` đã được cấu hình sẵn cho môi trường local development).*

---

### Cách 1: Chạy toàn bộ hệ thống bằng Docker Compose (Khuyên dùng)
Chỉ với một lệnh duy nhất để khởi động toàn bộ **MySQL + Backend + Frontend**:
```bash
docker compose up -d --build
```

**Các địa chỉ truy cập:**
- 🌐 **Frontend Web App:** [http://localhost](http://localhost)
- 🔌 **Backend Health Check:** [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health)
- 📖 **Swagger UI (OpenAPI Docs):** [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- 🗄️ **MySQL Database:** `localhost:3306` (User: `hotel_user` / Pass: `hotel_password_secure` / DB: `hotel_db`)

Dừng hệ thống:
```bash
docker compose down
```

---

### Cách 2: Chạy từng phần cho Lập trình viên (Local Dev & Debug)

#### Bước 1: Khởi động riêng Database MySQL
```bash
docker compose up -d mysql-db
```

#### Bước 2: Chạy Backend Spring Boot
```bash
cd backend
# Linux / macOS:
./gradlew bootRun

# Windows PowerShell:
.\gradlew.bat bootRun
```
*Backend chạy tại `http://localhost:8080` (Flyway tự động khởi tạo bảng và seed data).*

#### Bước 3: Chạy Frontend React (Vite Dev Server)
Mở cửa sổ terminal khác:
```bash
cd frontend
npm install
npm run dev
```
*Frontend chạy tại `http://localhost:5173` (Vite tự động proxy mọi request `/api` sang port 8080).*

---

## 🧪 Kiểm Thử Tự Động (Automated Testing)

Dự án duy trì tỷ lệ vượt qua **100% test cases** cho toàn bộ các module nghiệp vụ:

```bash
# Chạy toàn bộ 31 test cases Backend (Auth, RBAC, Concurrency, Availability, VNPay):
cd backend
./gradlew test

# Kiểm tra chất lượng và cú pháp Frontend:
cd frontend
npm run lint
```

---

## 📁 Cấu Trúc Thư Mục Rút Gọn

```text
Hotel-Booking-System_HBS/
├── .github/workflows/         # CI/CD: Tự động test và deploy lên VPS
├── backend/                   # Mã nguồn Spring Boot 3 (Java 21 LTS)
│   ├── src/main/java/         # Controllers, Services, Repositories, Entities
│   ├── src/main/resources/    # Cấu hình application.yaml & Flyway migrations
│   └── src/test/java/         # Bộ kiểm thử tích hợp (H2 In-memory DB)
├── frontend/                  # Mã nguồn React 19 + Vite 8
│   ├── src/pages/             # Giao diện Customer, Receptionist, Admin
│   ├── src/components/        # UI components dùng chung (Navbar, Modals, Tables)
│   └── src/services/          # Tầng tích hợp API Backend (apiClient, auth, booking)
├── database/migrations/       # Các file migration SQL (Schema DDL & Seed Data)
├── scripts/                   # Kịch bản sao lưu tự động (00:00), khôi phục và kiểm thử DB
│   ├── backup_mysql.sh        # Tự động mysqldump, nén gzip và dọn dẹp backup cũ > 30 ngày
│   ├── restore_mysql.sh       # Khôi phục DB qua stream, đo lường RTO < 3 phút
│   ├── setup_cron.sh          # Quản lý Cronjob 00:00 trên máy chủ VPS
│   └── test_backup_restore.sh # Kiểm thử tự động pipeline backup/restore
├── docs/                      # Tài liệu kỹ thuật dự án
│   ├── SRS.md                 # Tài liệu đặc tả yêu cầu kỹ thuật & nghiệp vụ (SRS v2.2)
│   └── BACKUP_AND_RESTORE.md  # Hướng dẫn tự động sao lưu & khôi phục thảm họa (SP1-OPS-01)
├── DEPLOYMENT_GUIDE.md        # Hướng dẫn chi tiết triển khai hệ thống lên VPS Production
├── docker-compose.yml         # Thiết lập triển khai Docker hợp nhất 3 dịch vụ
└── README.md                  # Hướng dẫn tổng quan dự án
```

---

## 📚 Tài Liệu Kỹ Thuật Tham Khảo
- 📄 **[Tài liệu Đặc tả Nghiệp vụ & Lược đồ Chức năng (SRS v2.2)](docs/SRS.md):** Tích hợp 4 bộ lược đồ chuẩn (FDD, Use Cases, Activity, State Machine) và đặc tả 8 module mở rộng.
- 🛡️ **[Hướng dẫn Sao Lưu & Khôi Phục Dữ Liệu MySQL VPS](docs/BACKUP_AND_RESTORE.md):** Thiết lập Cronjob 00:00, kịch bản nén gzip, dọn dẹp > 30 ngày và quy trình diễn tập RTO < 3 phút.
- 🚀 **[Hướng dẫn Triển Khai VPS Production](DEPLOYMENT_GUIDE.md):** Quy trình cài đặt Docker, cấu hình Nginx, biến môi trường và thiết lập tự động hóa CI/CD.

