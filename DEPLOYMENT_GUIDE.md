# 🚀 Hướng Dẫn Triển Khai Hệ Thống Lên VPS (Production Deployment Guide)

> **Dự án:** Hotel Booking System (HBS) - Grand Aurora Luxury Hotel  
> **Địa chỉ VPS Production:** `221.121.4.97`  
> **Hệ điều hành khuyến nghị:** Ubuntu 22.04 LTS / 24.04 LTS (x86_64)  
> **Cấu hình tối thiểu:** 1 vCPU, 2GB RAM, 20GB SSD  
> **Phiên bản:** v1.0.0  

---

## 📋 1. Tổng Quan Kiến Trúc Triển Khai

Hệ thống được đóng gói thành các Docker Containers độc lập và điều phối tập trung qua **Docker Compose**:

```
                         Internet (Clients / Browsers)
                                      │
                                      ▼ [Port 80 / 443]
                        ┌───────────────────────────┐
                        │  Nginx Web Server / Proxy │
                        └─────────────┬─────────────┘
                                      │
          ┌───────────────────────────┴───────────────────────────┐
          │                                                       │
          ▼ [Port 80]                                             ▼ [Port 8080]
┌───────────────────────────┐                           ┌───────────────────────────┐
│       hotel-frontend      │                           │       hotel-backend       │
│ React 19 + Vite + Nginx   │                           │ Spring Boot 3.3 (Java 21) │
└───────────────────────────┘                           └─────────────┬─────────────┘
                                                                      │ [Port 3306]
                                                                      ▼
                                                        ┌───────────────────────────┐
                                                        │        hotel-mysql        │
                                                        │         MySQL 8.0         │
                                                        └─────────────┬─────────────┘
                                                                      │
                                                                      ▼ [Cron 00:00]
                                                        ┌───────────────────────────┐
                                                        │   /var/backups/hotel_db   │
                                                        │   scripts/backup_mysql.sh │
                                                        └───────────────────────────┘
```

---

## 🛠️ 2. Chuẩn Bị Môi Trường Trên Máy Chủ VPS

### Bước 2.1: Cập nhật hệ điều hành và các gói bổ trợ
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip htop cron ufw
```

### Bước 2.2: Cài đặt Docker & Docker Compose v2
```bash
# Cài đặt Docker thông qua script chính thức
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Cài đặt docker compose plugin
sudo apt install -y docker-compose-plugin

# Khởi động và kích hoạt Docker khởi động cùng hệ thống
sudo systemctl enable docker
sudo systemctl start docker

# Kiểm tra phiên bản
docker --version
docker compose version
```

### Bước 2.3: Thiết lập múi giờ Việt Nam (Asia/Ho_Chi_Minh)
Để đảm bảo các đơn đặt phòng, thanh toán và lịch backup chạy chuẩn xác:
```bash
sudo timedatectl set-timezone Asia/Ho_Chi_Minh
date
```

---

## 📦 3. Thiết Lập Mã Nguồn & Biến Môi Trường

### Bước 3.1: Sao chép mã nguồn về thư mục `/root`
```bash
cd /root
git clone https://github.com/Huidinne/Hotel-Booking-System_HBS.git
cd Hotel-Booking-System_HBS
```

### Bước 3.2: Thiết lập tệp cấu hình bí mật `.env`
Sao chép từ tệp mẫu `.env.example`:
```bash
cp .env.example .env
nano .env
```

**Các thông số quan trọng cần cập nhật cho môi trường Production:**
```ini
# 1. Cơ sở dữ liệu MySQL
MYSQL_DATABASE=hotel_db
MYSQL_USER=hotel_user
MYSQL_PASSWORD=MatKhauDatabaseManh_2026!
DB_ROOT_PASSWORD=MatKhauRootSieuCap_2026!
DB_HOST_PORT=3306

# 2. Backend & JWT Security (Tạo chuỗi 256 bits ngẫu nhiên)
BACKEND_HOST_PORT=8080
JWT_SECRET=c5f78a2e1d904b7e9a8f2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f
JWT_ACCESS_EXPIRATION_MS=1800000
JWT_REFRESH_EXPIRATION_MS=604800000

# 3. Cloudinary (Lưu ảnh buồng phòng)
CLOUDINARY_CLOUD_NAME=your_production_cloud_name
CLOUDINARY_API_KEY=your_production_api_key
CLOUDINARY_API_SECRET=your_production_api_secret

# 4. VNPay Cổng thanh toán
VNPAY_TMN_CODE=your_vnpay_tmn_code
VNPAY_HASH_SECRET=your_vnpay_hash_secret
VNPAY_PAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://221.121.4.97/payment-result

# 5. SMTP Gmail thông báo đặt phòng
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=hotro.aurorahotel@gmail.com
SPRING_MAIL_PASSWORD=your_google_app_password

# 6. Frontend URL
FRONTEND_HOST_PORT=80
VITE_API_BASE_URL=http://221.121.4.97:8080/api/v1
```

---

## 🚀 4. Khởi Động Hệ Thống Với Docker Compose

Thực thi build và khởi động 3 dịch vụ tuần tự:
```bash
# 1. Kéo image MySQL
docker compose pull mysql-db

# 2. Build Frontend và Backend
docker compose build frontend
docker compose build backend

# 3. Khởi chạy ngầm toàn bộ dịch vụ
docker compose up -d
```

Kiểm tra trạng thái các container:
```bash
docker compose ps
```
*Kết quả hiển thị 3 container: `hotel-mysql`, `hotel-backend`, `hotel-frontend` đều ở trạng thái `running / healthy`.*

---

## 🛡️ 5. Thiết Lập Cronjob Tự Động Sao Lưu Cơ Sở Dữ Liệu

Theo quy chuẩn kỹ thuật `[SP1-OPS-01]`, hệ thống sao lưu định kỳ lúc **00:00 mỗi đêm** và lưu trữ bản backup trong 30 ngày.

Chỉ cần thực hiện 1 lệnh duy nhất:
```bash
# Cấp quyền thực thi và cài đặt Cronjob
chmod +x scripts/*.sh
./scripts/setup_cron.sh --install
```

Kiểm tra trạng thái Cronjob:
```bash
./scripts/setup_cron.sh --status
crontab -l
```

Chạy thử nghiệm sao lưu ngay lập tức:
```bash
./scripts/setup_cron.sh --test
```
*Kiểm tra tệp sao lưu sinh ra tại `/var/backups/hotel_db/` và nhật ký tại `/var/log/mysql_backup.log`.*

Chi tiết quy trình khôi phục và diễn tập sự cố xem tại: [docs/BACKUP_AND_RESTORE.md](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/docs/BACKUP_AND_RESTORE.md).

---

## 🔄 6. Tự Động Hóa Triển Khai CI/CD (GitHub Actions)

Mỗi khi mã nguồn được merge vào nhánh `develop`, workflow `.github/workflows/deploy.yml` sẽ tự động kết nối qua SSH vào VPS để kéo mã mới, build lại container và dọn dẹp images cũ.

### Các Secrets cần cấu hình trên GitHub Repository:
1. `VPS_HOST`: `221.121.4.97`
2. `VPS_USERNAME`: `root`
3. `VPS_SSH_KEY`: Private SSH Key kết nối VPS
4. `VPS_PORT`: `22` (hoặc cổng SSH tùy chỉnh)

---

## 🩺 7. Giám Sát Sức Khỏe & Vận Hành Hàng Ngày

### 7.1. Kiểm tra Actuator Health Check
```bash
curl -i http://localhost:8080/actuator/health
```
Phản hồi mẫu:
```json
{"status":"UP","components":{"db":{"status":"UP","details":{"database":"MySQL","validationQuery":"isValid()"}},"diskSpace":{"status":"UP"}}}
```

### 7.2. Xem nhật ký hoạt động (Logs)
```bash
# Log Backend
docker logs -f -n 100 hotel-backend

# Log MySQL
docker logs -f -n 100 hotel-mysql

# Log Nginx Frontend
docker logs -f -n 100 hotel-frontend

# Log Cronjob sao lưu
tail -f -n 50 /var/log/mysql_backup.log
```

---

## 🆘 8. Khắc Phục Sự Cố Nhanh (Disaster Recovery Quick Command)

Khôi phục toàn bộ dữ liệu MySQL từ bản sao lưu gần nhất:
```bash
/root/Hotel-Booking-System_HBS/scripts/restore_mysql.sh --latest -y
```
