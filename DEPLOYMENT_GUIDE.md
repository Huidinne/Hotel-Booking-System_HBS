# 🚀 HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG LÊN MÁY CHỦ VPS LINUX (UBUNTU 22.04 LTS)
## DỰ ÁN: HOTEL BOOKING SYSTEM (HBS)

> **Tài liệu:** DEPLOYMENT_GUIDE.md  
> **Người thực hiện:** Kỹ sư DevOps  
> **Môi trường mục tiêu:** Máy chủ VPS Linux (Ubuntu 22.04 LTS)  
> **Công nghệ vận hành:** Docker, Docker Compose, Nginx Reverse Proxy, MySQL 8.0, Spring Boot 3 (Java 21), React 19, GitHub Actions CI/CD.

---

## 🖥️ Thông Số Hạ Tầng Máy Chủ Thực Tế

| Thông số | Giá trị thực tế | Ghi chú & Đánh giá DevOps |
| :--- | :--- | :--- |
| **Hostname** | `vtrung77` | Tên định danh máy chủ |
| **Địa chỉ IP công khai** | **`221.121.4.97`** | Địa chỉ IP truy cập dịch vụ và cấu hình SSH |
| **Cấu hình phần cứng** | **1 vCPU / 1 GB RAM / 20 GB SSD** | Cấu hình tài nguyên hạn chế. **Bắt buộc cấu hình Swap 2 GB và tối ưu hóa RAM cho JVM/MySQL** để chống tràn bộ nhớ (OOM). |
| **Hệ điều hành** | **Ubuntu 22.04 LTS (Jammy Jellyfish)** | Nhân Linux 64-bit chuẩn doanh nghiệp |
| **Thư mục triển khai** | `/root/Hotel-Booking-System_HBS` | Thư mục chứa mã nguồn và tệp cấu hình trên VPS |
| **Nhánh triển khai chính** | `develop` *(và `main`)* | Nhánh nhận kích hoạt CD tự động |

---

## 📑 MỤC LỤC
1. [Phân Tích Rủi Ro & Chuẩn Bị Tài Nguyên Hạ Tầng (VPS Setup)](#1-phân-tích-rủi-ro--chuẩn-bị-tài-nguyên-hạ-tầng-vps-setup)
2. [Quản Lý Môi Trường & Bảo Mật Biến Môi Trường (.env)](#2-quản-lý-môi-trường--bảo-mật-biến-môi-trường-env)
3. [Quy Trình Triển Khai Thủ Công Lần Đầu Tiên (Manual Deploy)](#3-quy-trình-triển-khai-thủ-công-lần-đầu-tiên-manual-deploy)
4. [Tự Động Hóa Triển Khai Với GitHub Actions (CI/CD Deployment)](#4-tự-động-hóa-triển-khai-với-github-actions-cicd-deployment)
5. [Bảo Trì, Dọn Dẹp Dung Lượng & Checklist Hậu Triển Khai (Smoke Test)](#5-bảo-trì-dọn-dẹp-dung-lượng--checklist-hậu-triển-khai-smoke-test)

---

## 1. PHÂN TÍCH RỦI RO & CHUẨN BỊ TÀI NGUYÊN HẠ TẦNG (VPS SETUP)

### 1.1. Phân tích rủi ro tài nguyên (1 vCPU & 1 GB RAM)
Một hệ thống chạy đồng thời 3 dịch vụ:
- **MySQL 8.0:** Mặc định có thể ngốn từ 400 MB đến 600 MB RAM.
- **Spring Boot 3 (Java 21):** JVM khởi động và heap có thể chiếm từ 350 MB đến 500 MB RAM.
- **Frontend Nginx:** Chiếm khoảng 20 MB đến 40 MB RAM.
- **Hệ điều hành Ubuntu 22.04:** Chiếm khoảng 150 MB đến 200 MB RAM.

👉 **Tổng nhu cầu bộ nhớ tối thiểu:** ~1.1 GB – 1.4 GB RAM.  
⚠️ **Nguy cơ tiềm ẩn:** Nếu chỉ dựa vào 1 GB RAM vật lý, nhân Linux sẽ kích hoạt cơ chế **OOM-Killer (Out of Memory Killer)** và tự động gửi tín hiệu `SIGKILL (kill -9)` làm sập container `hotel-backend` hoặc `hotel-mysql` ngay khi khởi động hoặc khi nhận nhiều kết nối!

👉 **Giải pháp sống còn của DevOps:**
1. Tạo **2 GB Swap Memory (Bộ nhớ đệm ảo trên SSD)** để gánh tải khi RAM vật lý chạm đỉnh.
2. Tinh chỉnh tham số nhân `swappiness = 10` để ưu tiên RAM vật lý, chỉ đẩy dữ liệu ít dùng sang Swap.
3. Cấu hình JVM Flags (`-XX:MaxRAMPercentage=50.0`, giới hạn heap) trong Dockerfile/Compose.

---

### 1.2. Hướng dẫn kết nối SSH vào VPS
Từ máy tính của bạn (Terminal / PowerShell / Git Bash), thực hiện lệnh:
```bash
ssh root@221.121.4.97
```
*(Nhập mật khẩu SSH của tài khoản `root` do nhà cung cấp VPS cung cấp).*

---

### 1.3. Các bước thiết lập 2 GB Swap Memory vĩnh viễn

Thực thi tuần tự các lệnh sau trên terminal của VPS:

```bash
# 1. Kiểm tra xem VPS đã có Swap chưa (nếu trống là chưa có)
free -h
swapon --show

# 2. Tạo tệp swapfile có dung lượng chính xác 2 GB
fallocate -l 2G /swapfile

# Nếu lệnh fallocate không khả dụng trên định dạng file system của bạn, dùng lệnh thay thế:
# dd if=/dev/zero of=/swapfile bs=1M count=2048

# 3. Phân quyền bảo mật (chỉ cho phép root đọc/ghi tệp này)
chmod 600 /swapfile

# 4. Thiết lập tệp thành vùng nhớ Swap
mkswap /swapfile

# 5. Kích hoạt Swap ngay lập tức
swapon /swapfile

# 6. Cấu hình để Swap tự động nạp mỗi khi reboot máy chủ
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

# 7. Tối ưu hóa độ nhạy Swappiness và bộ nhớ đệm Kernel
# swappiness=10: Chỉ dùng Swap khi RAM vật lý còn dưới 10%
# vfs_cache_pressure=50: Giữ lại cache thư mục và inode lâu hơn trên RAM
sysctl vm.swappiness=10
sysctl vm.vfs_cache_pressure=50

echo 'vm.swappiness=10' | tee -a /etc/sysctl.conf
echo 'vm.vfs_cache_pressure=50' | tee -a /etc/sysctl.conf

# 8. Xác minh lại kết quả
free -h
```
*Kết quả hiển thị: `Mem: ~980MiB`, `Swap: 2.0GiB` $\rightarrow$ Đạt yêu cầu.*

---

### 1.4. Cập nhật hệ thống & Cài đặt Docker Engine, Docker Compose chính thức

Cài đặt phiên bản mới nhất từ kho chính thức của Docker (không dùng gói cũ `docker.io` của Ubuntu):

```bash
# 1. Cập nhật danh sách gói phần mềm và nâng cấp hệ thống
apt update && apt upgrade -y

# 2. Cài đặt các công cụ hỗ trợ tải qua HTTPS
apt install -y ca-certificates curl gnupg lsb-release ufw git

# 3. Thêm khóa GPG chính thức của Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# 4. Thêm kho lưu trữ Docker vào APT sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# 5. Cài đặt Docker Engine, CLI, Containerd và Docker Compose plugin
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 6. Bật dịch vụ Docker tự khởi động cùng hệ thống
systemctl enable docker
systemctl start docker

# 7. Kiểm tra phiên bản xác nhận cài đặt thành công
docker --version
docker compose version
```

---

### 1.5. Cấu hình Tường Lửa UFW (Firewall Hardening)

Thiết lập tường lửa để bảo vệ VPS, chỉ mở những cổng cần thiết cho dịch vụ:

```bash
# 1. Thiết lập chính sách mặc định: Chặn toàn bộ incoming, cho phép outgoing
ufw default deny incoming
ufw default allow outgoing

# 2. Mở cổng 22 (SSH) để không bị ngắt kết nối
ufw allow 22/tcp comment 'SSH Port'

# 3. Mở cổng 80 (HTTP) và 443 (HTTPS) cho Web Frontend Nginx
ufw allow 80/tcp comment 'HTTP Web'
ufw allow 443/tcp comment 'HTTPS Web'

# 4. Kích hoạt UFW
ufw --force enable

# 5. Kiểm tra trạng thái tường lửa
ufw status verbose
```

> [!CAUTION]
> **Quy tắc an ninh:** Tuyệt đối **KHÔNG** mở cổng `3306` (MySQL) hay `8080` (Spring Boot API) trên UFW ra Internet. Các dịch vụ này chỉ giao tiếp nội bộ qua mạng ảo `hotel-network` của Docker Compose để tránh bị quét cổng (port scan) và tấn công brute-force từ hacker.

---

## 2. QUẢN LÝ MÔI TRƯỜNG & BẢO MẬT BIẾN MÔI TRƯỜNG (.env)

### 2.1. Tạo tệp `.env` bảo mật trên VPS
Tại thư mục chứa dự án `/root/Hotel-Booking-System_HBS`, bạn tạo file `.env` riêng biệt cho môi trường chạy thật. Không bao giờ commit file này lên Git.

```bash
cd /root/Hotel-Booking-System_HBS
nano .env
```

### 2.2. Mẫu nội dung `.env` chuẩn chỉnh cho Production trên VPS

Sao chép nội dung dưới đây vào file `.env` trên VPS:

```ini
# =============================================================================
# HOTEL BOOKING SYSTEM - VPS PRODUCTION ENVIRONMENT CONFIGURATION
# Máy chủ: vtrung77 (IP: 221.121.4.97)
# =============================================================================

# -----------------------------------------------------------------------------
# 1. CẤU HÌNH CƠ SỞ DỮ LIỆU MYSQL (Docker Container)
# -----------------------------------------------------------------------------
MYSQL_DATABASE=hotel_db
MYSQL_USER=hotel_user
# Thay đổi mật khẩu phức tạp cho production:
MYSQL_PASSWORD=Hbs_Secure_Pass_2026_!@#
DB_ROOT_PASSWORD=Root_Super_Secret_2026_XYZ!

# Cổng mở ra máy chủ Host (chỉ bind nội bộ cho docker compose)
DB_HOST_PORT=3306

# Chuỗi kết nối JDBC cho Spring Boot (kết nối container 'mysql-db' qua mạng nội bộ)
SPRING_DATASOURCE_URL=jdbc:mysql://mysql-db:3306/hotel_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Ho_Chi_Minh&characterEncoding=UTF-8

# -----------------------------------------------------------------------------
# 2. CẤU HÌNH BACKEND SERVER & BẢO MẬT JWT
# -----------------------------------------------------------------------------
SERVER_PORT=8080
BACKEND_HOST_PORT=8080

# Khóa bí mật JWT tối thiểu 256 bits (32 bytes ngẫu nhiên)
# Bạn có thể sinh chuỗi ngẫu nhiên bằng lệnh: openssl rand -hex 32
JWT_SECRET=c8f8b89e3a6a4d7d8e2f1b0a5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d

# Hạn hiệu lực Access Token: 1800000 ms (30 phút)
JWT_ACCESS_EXPIRATION_MS=1800000

# Hạn hiệu lực Refresh Token: 604800000 ms (7 ngày)
JWT_REFRESH_EXPIRATION_MS=604800000

# -----------------------------------------------------------------------------
# 3. CẤU HÌNH CLOUDINARY (Lưu trữ ảnh loại phòng)
# -----------------------------------------------------------------------------
CLOUDINARY_CLOUD_NAME=demo_cloud
CLOUDINARY_API_KEY=demo_key
CLOUDINARY_API_SECRET=demo_secret

# -----------------------------------------------------------------------------
# 4. CẤU HÌNH VNPAY SANDBOX (Thanh toán cọc 50%)
# -----------------------------------------------------------------------------
VNPAY_TMN_CODE=DEMO_TMN
VNPAY_HASH_SECRET=DEMO_HASH_SECRET
VNPAY_PAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
# Khi chạy thật trên VPS, chuyển hướng trả về IP máy chủ:
VNPAY_RETURN_URL=http://221.121.4.97/payment/vnpay-return

# -----------------------------------------------------------------------------
# 5. CẤU HÌNH FRONTEND (Nginx & Web)
# -----------------------------------------------------------------------------
FRONTEND_HOST_PORT=80
VITE_API_BASE_URL=/api/v1
```

Phân quyền bảo vệ file `.env` để chỉ tài khoản `root` có quyền đọc:
```bash
chmod 600 /root/Hotel-Booking-System_HBS/.env
```

---

## 3. QUY TRÌNH TRIỂN KHAI THỦ CÔNG LẦN ĐẦU TIÊN (MANUAL DEPLOY)

Thực hiện từng bước sau trên VPS để dựng toàn bộ hệ thống lần đầu:

### Bước 1: Clone mã nguồn từ nhánh `develop`
```bash
# 1. Tạo thư mục làm việc và di chuyển vào
mkdir -p /root/Hotel-Booking-System_HBS
cd /root

# 2. Clone mã nguồn nhánh develop từ GitHub
git clone -b develop https://github.com/Huidinne/Hotel-Booking-System_HBS.git /root/Hotel-Booking-System_HBS

# 3. Di chuyển vào thư mục dự án
cd /root/Hotel-Booking-System_HBS

# 4. Đảm bảo file .env đã được tạo như ở Phần 2
ls -la .env
```

### Bước 2: Kiểm tra cấu hình và Build hệ thống với Docker Compose
```bash
# 1. Kiểm tra cú pháp file docker-compose.yml
docker compose -f docker-compose.yml config

# 2. Bắt đầu build các container và khởi chạy ngầm (-d)
docker compose -f docker-compose.yml up -d --build
```
> [!NOTE]
> *Lần build đầu tiên trên VPS 1 vCPU có thể mất từ 3 đến 5 phút để tải Docker layers, biên dịch Spring Boot JAR và đóng gói frontend React.*

### Bước 3: Kiểm tra trạng thái hoạt động của các container
```bash
docker compose -f docker-compose.yml ps
```
**Kỳ vọng kết quả:**
```text
NAME             IMAGE                  COMMAND                  SERVICE      CREATED         STATUS                   PORTS
hotel-mysql      mysql:8.0              "docker-entrypoint.s…"   mysql-db     2 minutes ago   Up 2 minutes (healthy)   0.0.0.0:3306->3306/tcp
hotel-backend    hotel-booking-backend  "java -Djava.securit…"   backend      2 minutes ago   Up 2 minutes             0.0.0.0:8080->8080/tcp
hotel-frontend   hotel-booking-frontend "nginx -g 'daemon of…"   frontend     2 minutes ago   Up 2 minutes             0.0.0.0:80->80/tcp
```

### Bước 4: Đọc log theo thời gian thực (Troubleshooting Logs)
Khi cần theo dõi quá trình chạy hoặc kiểm tra nguyên nhân lỗi:

```bash
# Xem log tổng hợp của cả 3 dịch vụ
docker compose -f docker-compose.yml logs -f --tail=100

# Xem log riêng Backend để xem Spring Boot khởi động và Flyway migration:
docker compose -f docker-compose.yml logs -f backend

# Xem log Database MySQL:
docker compose -f docker-compose.yml logs -f mysql-db

# Xem log Frontend Nginx:
docker compose -f docker-compose.yml logs -f frontend
```

---

## 4. TỰ ĐỘNG HÓA TRIỂN KHAI VỚI GITHUB ACTIONS (CI/CD DEPLOYMENT)

Mỗi khi lập trình viên tạo Pull Request hoặc merge code vào nhánh **`develop`**, pipeline GitHub Actions sẽ tự động SSH vào VPS `221.121.4.97`, cập nhật mã nguồn mới và tái khởi động ứng dụng mà không cần can thiệp thủ công.

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant Git as GitHub (develop)
    participant GA as GitHub Actions Runner
    participant VPS as VPS Server (221.121.4.97)

    Dev->>Git: Push / Merge code vào nhánh develop
    Git->>GA: Trigger workflow .github/workflows/deploy.yml
    GA->>GA: Đọc GitHub Secrets (HOST, USER, SSH_KEY)
    GA->>VPS: Mở kết nối SSH bảo mật qua Port 22
    Note over VPS: cd /root/Hotel-Booking-System_HBS
    VPS->>VPS: git fetch origin develop && git reset --hard
    VPS->>VPS: docker compose -f docker-compose.yml up -d --build
    VPS->>VPS: docker image prune -f
    VPS-->>GA: Báo cáo kết quả thành công (Exit code 0)
    GA-->>Dev: Hiển thị trạng thái Deploy Success (Xanh)
```

---

### 4.1. Sinh SSH Keypair riêng cho GitHub Actions trên VPS

Thực hiện lệnh sau trên terminal VPS:

```bash
# 1. Sinh cặp khóa SSH riêng biệt định dạng ED25519 (an toàn và nhẹ nhất)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f /root/.ssh/id_ed25519_deploy -N ""

# 2. Thêm Public Key vừa tạo vào danh sách authorized_keys của VPS
cat /root/.ssh/id_ed25519_deploy.pub >> /root/.ssh/authorized_keys

# 3. Phân quyền chuẩn xác cho thư mục và tệp SSH
chmod 700 /root/.ssh
chmod 600 /root/.ssh/authorized_keys

# 4. In nội dung Private Key ra màn hình để sao chép vào GitHub Secrets
cat /root/.ssh/id_ed25519_deploy
```
*Hãy sao chép toàn bộ nội dung hiển thị ra (bao gồm cả dòng `-----BEGIN OPENSSH PRIVATE KEY-----` và `-----END OPENSSH PRIVATE KEY-----`).*

---

### 4.2. Cấu hình GitHub Secrets trong Repository

Truy cập vào kho mã nguồn trên GitHub:  
👉 **`Settings`** $\rightarrow$ **`Secrets and variables`** $\rightarrow$ **`Actions`** $\rightarrow$ Nhấn **`New repository secret`**:

| Tên Secret | Giá trị cần điền | Mô tả |
| :--- | :--- | :--- |
| **`VPS_HOST`** | `221.121.4.97` | Địa chỉ IP máy chủ VPS |
| **`VPS_USERNAME`** | `root` | Tên người dùng SSH |
| **`VPS_SSH_KEY`** | Dán toàn bộ Private Key sinh ở bước 4.1 | Khóa bí mật xác thực SSH không cần mật khẩu |
| **`VPS_PORT`** | `22` | Cổng SSH mặc định của máy chủ |

---

### 4.3. File Workflow Triển Khai Tự Động: `.github/workflows/deploy.yml`

File này đã được tạo sẵn tại đường dẫn [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

**Chi tiết luồng hoạt động:**
1. **Trigger:** Tự động kích hoạt mỗi khi có commit mới được push hoặc merge vào nhánh `develop`.
2. **Appleboy SSH Action (`appleboy/ssh-action@v1.0.3`):** Mở phiên SSH an toàn tới `221.121.4.97`.
3. **Đồng bộ mã nguồn:**
   ```bash
   cd /root/Hotel-Booking-System_HBS
   git fetch origin develop
   git reset --hard origin/develop
   ```
   *Lệnh `git reset --hard` đảm bảo mã nguồn trên server luôn đồng nhất 100% với commit trên GitHub.*
4. **Build & Recreate Container:**
   ```bash
   docker compose -f docker-compose.yml up -d --build
   ```
   *Docker Compose chỉ build lại những container có mã nguồn thay đổi, hạn chế tối đa thời gian downtime.*
5. **Dọn dẹp tự động:**
   ```bash
   docker image prune -f
   ```
   *Xóa ngay các dangling image cũ của lần build trước để tránh tràn ổ đĩa 20 GB.*

---

## 5. BẢO TRÌ, DỌN DẸP DUNG LƯỢNG & CHECKLIST HẬU TRIỂN KHAI (SMOKE TEST)

### 5.1. Quản lý dung lượng ổ đĩa SSD 20 GB

Máy chủ 20 GB SSD sau khi cài OS và chạy Docker qua nhiều lần deploy sẽ sinh ra các image tầng trung gian (`<none>`). Cần thực hiện dọn dẹp định kỳ:

```bash
# 1. Kiểm tra dung lượng ổ đĩa tổng thể
df -h /

# 2. Xem chi tiết dung lượng do Docker sử dụng
docker system df

# 3. Lệnh dọn dẹp an toàn các image cũ không còn gán tag
docker image prune -f

# 4. Lệnh dọn dẹp toàn diện cache build (chạy khi ổ đĩa báo trên 80% đầy)
docker system prune -af --volumes=false
```

> [!WARNING]
> Tuyệt đối **KHÔNG** chạy lệnh `docker volume prune` hoặc `docker compose down -v` trên môi trường VPS chạy thật vì sẽ **XÓA MẤT TOÀN BỘ CƠ SỞ DỮ LIỆU KHÁCH HÀNG** trong volume `mysql_data`.

#### Cấu hình Cronjob tự động dọn rác hàng tuần
Mở bảng lịch trình cron:
```bash
crontab -e
```
Thêm dòng sau vào cuối tệp để tự động dọn dẹp vào **02:00 sáng mỗi Chủ Nhật**:
```bash
0 2 * * 0 /usr/bin/docker image prune -af >> /var/log/docker-prune.log 2>&1
```

---

### 5.2. Checklist Kiểm Tra Hậu Triển Khai (Smoke Test Checklist)

Sau khi triển khai hoàn tất, kỹ sư DevOps/QA cần thực hiện kiểm tra nhanh theo bảng sau để nghiệm thu:

| Hạng mục kiểm tra (Item) | Câu lệnh / Thao tác thực hiện | Kết quả mong đợi (Expected Output) | Trạng thái (Pass/Fail) |
| :--- | :--- | :--- | :---: |
| **1. Trạng thái Container** | `docker compose -f docker-compose.yml ps` | Cả 3 containers (`hotel-mysql`, `hotel-backend`, `hotel-frontend`) đều hiển thị trạng thái `Up`. `hotel-mysql` có nhãn `(healthy)`. | 🟢 PASS |
| **2. Truy cập Giao diện Web** | Mở trình duyệt truy cập: `http://221.121.4.97` | Trang chủ hệ thống khách sạn hiển thị đầy đủ Navbar, Banner, Danh mục phòng mẫu mà không bị vỡ giao diện. | 🟢 PASS |
| **3. API Health Check** | Chạy lệnh trên VPS hoặc trình duyệt:<br>`curl -i http://221.121.4.97/api/v1/health` | HTTP `200 OK`<br>`{"status":"UP", "service":"Hotel Booking System API"}` | 🟢 PASS |
| **4. Swagger UI Documentation** | Mở trình duyệt: `http://221.121.4.97:8080/swagger-ui.html` | Hiển thị đầy đủ danh sách các API endpoints nhóm `auth`, `room`, `booking`, `receptionist`. | 🟢 PASS |
| **5. Kết nối & Nạp dữ liệu DB** | `docker exec -it hotel-mysql mysql -u hotel_user -pHbs_Secure_Pass_2026_!@# hotel_db -e "SELECT count(*) FROM users; SELECT count(*) FROM rooms;"` | Bảng `users` có 3 tài khoản mẫu, bảng `rooms` có danh sách phòng vật lý đã nạp từ `V2__seed_data.sql`. | 🟢 PASS |
| **6. Ghi dữ liệu thực tế** | Dùng Postman hoặc Web đăng ký 1 tài khoản mới qua `POST /api/v1/auth/register` | Đăng ký thành công HTTP 201, dữ liệu người dùng mới được lưu ngay vào MySQL. | 🟢 PASS |
| **7. Đăng nhập tài khoản Lễ tân** | Đăng nhập với `receptionist@hotel.com` / `Password@123` tại `http://221.121.4.97/login` | Đăng nhập thành công, chuyển hướng vào trang vận hành `/receptionist/bookings`. | 🟢 PASS |
| **8. Tự phục hồi sau khi Reboot** | Chạy lệnh khởi động lại VPS:<br>`reboot`<br>Chờ 1 phút, kết nối lại SSH và gõ `docker compose ps` | Cả 3 container tự động khởi chạy lại bình thường nhờ chỉ thị `restart: unless-stopped`. | 🟢 PASS |

---

## 📞 Hỗ Trợ Kỹ Thuật Khi Gặp Sự Cố Trên VPS

- **Backend bị sập (Exit 137):** Do thiếu RAM $\rightarrow$ Kiểm tra lại Swap bằng `free -h`. Đảm bảo Swap 2 GB đang active.
- **Port 80 không phản hồi:** Kiểm tra tường lửa `ufw status` xem đã mở cổng 80 chưa. Kiểm tra xem có service Apache/Nginx nào cài sẵn trên VPS đang chiếm cổng 80 hay không bằng lệnh: `netstat -tulpn | grep :80`.
- **Lỗi kết nối CSDL từ Backend:** Kiểm tra `docker compose logs backend`. Nếu báo `Access denied`, kiểm tra lại chuỗi mật khẩu trong `.env` xem có ký tự đặc biệt gây xung đột shell không.
