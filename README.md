# Hotel Booking System (MVP)

> **Hệ thống đặt phòng trực tuyến & quản lý lưu trú cho khách sạn độc lập**  
> Dự án áp dụng kiến trúc **Modular Monolith** với Spring Boot 3, ReactJS/Vite, MySQL 8, Docker Compose và GitHub Actions CI/CD.

---

## 📁 Cấu trúc thư mục dự án (Project Structure)

```text
hotel-booking-system/
├── backend/                  # Mã nguồn Spring Boot 3 (Java 21, Modular Monolith)
│   ├── src/main/java/        # Các module: auth, user, room, booking, payment, dashboard
│   ├── src/main/resources/   # application.properties, cấu hình môi trường
│   ├── build.gradle          # Cấu hình dependencies Gradle
│   └── Dockerfile            # Multi-stage Dockerfile cho Backend
├── frontend/                 # Ứng dụng ReactJS + Vite + Tailwind CSS
│   ├── src/                  # Components, Pages, Services, Contexts
│   ├── nginx.conf            # Cấu hình Web Server Nginx & Reverse Proxy
│   └── Dockerfile            # Multi-stage Dockerfile cho Frontend
├── database/                 # Cơ sở dữ liệu
│   └── migrations/           # Các script SQL khởi tạo và cập nhật schema
│       └── V1__init_schema.sql
├── docs/                     # Tài liệu thiết kế & đặc tả dự án
│   └── SRS.md                # Tài liệu đặc tả yêu cầu phần mềm (SRS v2.1)
├── .github/
│   └── workflows/            # Tự động hóa CI/CD
│       └── ci-cd.yaml        # GitHub Actions build, test và deploy VPS
├── .env.example              # Mẫu biến môi trường cấu hình hệ thống
├── .gitignore                # Danh sách file/thư mục loại trừ khỏi Git
├── compose.yaml              # Cấu hình Docker Compose khởi chạy toàn bộ dịch vụ
└── README.md                 # Hướng dẫn cài đặt và vận hành hệ thống
```

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

- **Backend:** Java 21 LTS, Spring Boot 3.3.5, Spring Data JPA (Hibernate 6), Spring Security, JJWT.
- **Frontend:** ReactJS 18, Vite 5, Tailwind CSS, Lucide React, Axios.
- **Database:** MySQL 8.0 (InnoDB Engine, Row-level Locking chống Overbooking).
- **Thanh toán:** Cổng thanh toán **VNPay Sandbox** (đặt cọc 50%, thời hạn giữ chỗ 15 phút).
- **Lưu trữ ảnh:** Cloudinary Java SDK.
- **Container & DevOps:** Docker, Docker Compose, Nginx, GitHub Actions CI/CD.

---

## 🚀 Hướng dẫn khởi chạy nhanh bằng Docker Compose

### 1. Chuẩn bị môi trường
- Đã cài đặt [Docker Desktop](https://www.docker.com/products/docker-desktop/) (hỗ trợ Docker Compose v2).
- Git.

### 2. Thiết lập biến môi trường
Sao chép tệp cấu hình mẫu `.env.example` thành `.env`:

```bash
cp .env.example .env
```

Chỉnh sửa các giá trị bí mật trong `.env` (nếu cần):
- Thông tin DB: `MYSQL_PASSWORD`, `DB_ROOT_PASSWORD`
- JWT: `JWT_SECRET`
- Thông tin Sandbox VNPay: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`
- Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### 3. Khởi chạy toàn bộ hệ thống bằng 1 lệnh

```bash
docker compose up -d --build
```

Hệ thống sẽ tự động khởi tạo:
1. **hotel-mysql:** Cơ sở dữ liệu MySQL 8 tại cổng `3306`.
2. **hotel-backend:** Ứng dụng Spring Boot tại cổng `8080`, tự động chạy Flyway Migration nạp schema (`V1__init_schema.sql`) và dữ liệu mẫu (`V2__seed_data.sql`).
3. **hotel-frontend:** Giao diện người dùng tại cổng `80`.

Kiểm tra trạng thái các container:
```bash
docker compose ps
```

Truy cập ứng dụng:
- **Frontend Web App:** [http://localhost](http://localhost)
- **Backend API:** [http://localhost:8080/api/v1](http://localhost:8080/api/v1)

---

## 💻 Hướng dẫn chạy môi trường phát triển (Local Development)

### 1. Khởi chạy Database MySQL qua Docker
Nếu chỉ muốn chạy Database để code backend/frontend cục bộ:

```bash
docker compose up -d mysql-db
```

> **Cơ chế Khởi tạo CSDL & Migration (Flyway):**
> - Các script migration được đặt đồng bộ tại cả `database/migrations/` (để tra cứu, quản lý) và `backend/src/main/resources/db/migration/` (để Flyway trong Spring Boot tự động thực thi khi khởi động).
> - `V1__init_schema.sql`: Khởi tạo 7 bảng cốt lõi (`users`, `room_types`, `room_type_images`, `rooms`, `bookings`, `booking_rooms`, `payment_transactions`), các ràng buộc toàn vẹn và Composite Index chống Overbooking.
> - `V2__seed_data.sql`: Nạp sẵn dữ liệu demo đầy đủ các kịch bản lưu trú, trạng thái phòng và 3 tài khoản mẫu.
> - **Cách Reset Database sạch khi cần:**
>   ```bash
>   docker compose down -v
>   docker compose up -d mysql-db
>   ```

### 2. Chạy Backend (Spring Boot)
Yêu cầu: JDK 21.

```bash
cd backend
./gradlew bootRun
# Trên Windows PowerShell / Command Prompt:
# .\gradlew.bat bootRun
```
*Lưu ý:* Khi chạy `bootRun`, Spring Boot sẽ tự động áp dụng Flyway migration vào MySQL nếu database đang trống.

### 3. Chạy Frontend (ReactJS / Vite)
Yêu cầu: Node.js 18+ và npm.

```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Quy định Bảo mật & Git (Security & Git Policy)

1. **Tuyệt đối KHÔNG commit file `.env` thật**, mật khẩu DB cá nhân, private key, hoặc secret của VNPay/Cloudinary lên Git.
2. Mọi thành viên bắt buộc tuân thủ quy trình Git flow tại **[Notes when working with Git.md](Notes%20when%20working%20with%20Git.md)** (tạo nhánh từ `develop`, commit có tiền tố chuẩn, tạo Pull Request để review).
3. Thông tin tài khoản ngân hàng của khách khi hoàn tiền cọc hiển thị qua API quản trị bắt buộc phải được che bảo mật dạng `**** **** 7890`.

---

## 🔑 Tài khoản Demo có sẵn (Seed Data)

Hệ thống đã chuẩn bị sẵn 3 tài khoản tương ứng với 3 vai trò:

| Vai trò          | Email đăng nhập          | Mật khẩu mặc định | Quyền hạn chính                                                 |
|------------------|--------------------------|-------------------|-----------------------------------------------------------------|
| **Admin**        | `admin@hotel.com`        | `Password@123`    | Toàn quyền quản trị buồng phòng, giá, tài khoản, Dashboard      |
| **Receptionist** | `receptionist@hotel.com` | `Password@123`    | Bảng quản lý Booking, Check-in (gán phòng), Check-out, Hoàn cọc |
| **Customer**     | `customer@gmail.com`     | `Password@123`    | Tìm phòng, tạo booking cọc VNPay, xem lịch sử, tự hủy phòng     |

---

## 📜 Tài liệu chi tiết dự án
- **Đặc tả yêu cầu phần mềm (SRS v2.1):** **[docs/SRS.md](docs/SRS.md)** (Quy tắc nghiệp vụ, chống Overbooking, phạt cọc 4 bậc mốc 14:00, No-Show).
- **Hợp đồng giao tiếp API & DTO chuẩn (API Contract):** **[docs/API_CONTRACT.md](docs/API_CONTRACT.md)** (Đầy đủ request/response DTO, mã lỗi HTTP, ma trận phân quyền để Frontend mock data).
- **Quy trình quản lý Git & Phối hợp làm việc:** **[Notes when working with Git.md](Notes%20when%20working%20with%20Git.md)**.
