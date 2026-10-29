# 🛡️ Hướng Dẫn Vận Hành Tự Động Sao Lưu & Khôi Phục Cơ Sở Dữ Liệu MySQL (Backup & Disaster Recovery Guide)

> **Mã công việc:** `[SP1-OPS-01] [Backup-Ops] Thiết lập Cronjob Tự động Sao lưu MySQL VPS`  
> **Người thực hiện:** Trung (`@vittrungnguyn`)  
> **Hệ thống:** Hotel Booking System (HBS) - Grand Aurora Luxury Hotel  
> **Phiên bản:** v1.0.0 (Áp dụng cho MySQL 8.0 Docker Container)  
> **Cập nhật:** 2026-10-29  

---

## 📌 1. Mục Tiêu & Chỉ Số Vận Hành Cốt Lõi (SLA / SLO)

Hệ thống sao lưu và khôi phục cơ sở dữ liệu MySQL của Grand Aurora Luxury Hotel được thiết kế nhằm đảm bảo an toàn tuyệt đối cho dữ liệu đặt phòng, thông tin khách hàng và lịch sử giao dịch cọc VNPay.

| Chỉ số | Mục tiêu chuẩn | Giải pháp thực tế |
| :--- | :--- | :--- |
| **RPO (Recovery Point Objective)** | **≤ 24 giờ** | Tự động sao lưu vào đúng **00:00 mỗi đêm** qua Linux Crontab. |
| **RTO (Recovery Time Objective)** | **< 3 phút** | Giải nén stream trực tiếp từ tệp `.sql.gz` vào Docker container qua pipeline không cần ghi đĩa trung gian. |
| **Chính sách lưu trữ (Retention)** | **30 ngày** | Tự động dọn dẹp các tệp sao lưu có tuổi thọ `> 30 ngày`, chống tràn dung lượng SSD VPS. |
| **Độ toàn vẹn dữ liệu** | **100% Gzip verified** | Kiểm tra `gzip -t` và ghi tệp nguyên tử (`.tmp` → `.sql.gz`) trước khi công nhận bản sao lưu hợp lệ. |
| **Tính sẵn sàng của dịch vụ** | **Zero Lock Stalls** | Sử dụng cờ `--single-transaction --quick` để mysqldump không khóa bảng InnoDB, ứng dụng hoạt động 24/7. |

---

## 🏗️ 2. Kiến Trúc & Luồng Hoạt Động (Architecture Flow)

```mermaid
flowchart TD
    A[Cron Daemon 00:00] -->|Thực thi hàng ngày| B[scripts/backup_mysql.sh]
    B --> C{Kiểm tra container hotel-mysql}
    C -->|Đang chạy| D[docker exec hotel-mysql mysqldump --single-transaction]
    C -->|Lỗi / Dừng| E[Ghi log ERROR & Thoát mã 1]
    D -->|Luồng dữ liệu Stream| F[gzip -9]
    F -->|Ghi tệp tạm| G[/var/backups/hotel_db/*.tmp]
    G --> H{Kiểm tra gzip -t}
    H -->|Toàn vẹn| I[mv thành *.sql.gz & chmod 640]
    H -->|Lỗi| J[Xóa tệp tạm & Báo động]
    I --> K[find /var/backups/hotel_db -mtime +30 -delete]
    K --> L[Ghi log hoàn tất vào /var/log/mysql_backup.log]
```

### Điểm nổi bật kỹ thuật:
1. **Không yêu cầu cài MySQL Client trên máy chủ Host (VPS):** Mọi lệnh `mysqldump` và `mysql` đều được ủy quyền thực thi trực tiếp bên trong container `hotel-mysql` thông qua `docker exec`.
2. **Luồng dữ liệu nén trực tiếp (Streaming Pipeline):** Dữ liệu từ `mysqldump` được truyền thẳng qua pipe `|` vào `gzip -9` và nén tại chỗ, tiết kiệm tới 80% dung lượng đĩa so với bản SQL thô.
3. **Atomic File Write:** Quá trình sao lưu ghi ra tệp `.tmp`. Chỉ khi kiểm tra checksum và độ toàn vẹn `gzip -t` thành công 100%, tệp mới được đổi tên chính thức thành `*.sql.gz`.
4. **Phân quyền bảo mật cao:** Thư mục lưu trữ cấp quyền `750` (`rwxr-x---`), tệp backup cấp quyền `640` (`rw-r-----`), bảo vệ dữ liệu khỏi truy cập trái phép.

---

## 📂 3. Danh Mục Kịch Bản Vận Hành (Scripts Directory)

Tất cả các script vận hành được đặt tập trung trong thư mục [scripts/](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/scripts):

| Tên tệp | Quyền hạn | Chức năng chính |
| :--- | :--- | :--- |
| [scripts/backup_mysql.sh](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/scripts/backup_mysql.sh) | `chmod +x` | Thực hiện sao lưu MySQL qua Docker, nén gzip và tự động xóa backup cũ hơn 30 ngày. |
| [scripts/restore_mysql.sh](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/scripts/restore_mysql.sh) | `chmod +x` | Khôi phục dữ liệu từ `.sql.gz`, kiểm tra tính toàn vẹn, đo thời gian RTO và hỗ trợ diễn tập trên database mẫu. |
| [scripts/setup_cron.sh](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/scripts/setup_cron.sh) | `chmod +x` | Quản lý vòng đời Cronjob: cài đặt lịch 00:00, kiểm tra trạng thái, xóa bỏ hoặc chạy thử nghiệm. |
| [scripts/test_backup_restore.sh](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/scripts/test_backup_restore.sh) | `chmod +x` | Bộ kiểm thử tự động toàn diện kiểm tra cú pháp, pipeline nén, xoay vòng 30 ngày và tốc độ RTO. |

---

## ⏰ 4. Hướng Dẫn Thiết Lập Cronjob Tự Động 00:00 Trên VPS

### Cách 1: Thiết lập tự động 1 lệnh bằng `setup_cron.sh` (Khuyên dùng)

Trên máy chủ VPS, di chuyển vào thư mục dự án và thực hiện:
```bash
cd /root/Hotel-Booking-System_HBS

# Cấp quyền thực thi cho các script
chmod +x scripts/*.sh

# Cài đặt Cronjob chạy tự động vào 00:00 mỗi đêm
./scripts/setup_cron.sh --install
```

Kiểm tra trạng thái cấu hình hiện tại:
```bash
./scripts/setup_cron.sh --status
```

---

### Cách 2: Thiết lập thủ công qua Crontab hệ thống

Nếu muốn cấu hình thủ công vào bảng crontab của người dùng `root`:
1. Mở trình biên tập crontab:
   ```bash
   crontab -e
   ```
2. Thêm dòng cấu hình sau vào cuối tệp:
   ```cron
   # Tự động sao lưu MySQL Hotel Booking System lúc 00:00 hàng ngày
   0 0 * * * /bin/bash /root/Hotel-Booking-System_HBS/scripts/backup_mysql.sh >> /var/log/mysql_backup.log 2>&1 # HBS_MYSQL_BACKUP_JOB
   ```
3. Lưu và đóng tệp. Kiểm tra lại bằng lệnh:
   ```bash
   crontab -l
   ```

### 💡 Lưu ý về Múi giờ VPS (Timezone):
Để cronjob chạy chính xác vào 00:00 giờ Việt Nam (GMT+7 / `Asia/Ho_Chi_Minh`), kiểm tra múi giờ của VPS:
```bash
timedatectl status
# Nếu chưa phải Asia/Ho_Chi_Minh, chạy lệnh sau:
timedatectl set-timezone Asia/Ho_Chi_Minh
```

---

## 💾 5. Hướng Dẫn Sử Dụng Chi Tiết `backup_mysql.sh`

### Cú pháp:
```bash
./scripts/backup_mysql.sh [TÙY CHỌN]
```

### Các tùy chọn nâng cao:
- `-d, --dir <DIR>`: Tùy chỉnh thư mục lưu trữ (Mặc định: `/var/backups/hotel_db`).
- `-c, --container <NAME>`: Tên container MySQL (Mặc định: `hotel-mysql`).
- `-n, --database <DB>`: Tên database cần dump (Mặc định: `hotel_db`).
- `-r, --retention <DAYS>`: Số ngày lưu trữ trước khi dọn dẹp (Mặc định: `30` ngày).
- `--dry-run`: Chạy mô phỏng, in ra các câu lệnh mà không thực thi thay đổi thực.
- `-h, --help`: Hiển thị trợ giúp.

### Ví dụ thực tế:
```bash
# 1. Chạy sao lưu mặc định theo cấu hình hệ thống:
./scripts/backup_mysql.sh

# 2. Chạy mô phỏng kiểm tra trước khi chạy thật:
./scripts/backup_mysql.sh --dry-run

# 3. Sao lưu và chỉ lưu trữ trong 15 ngày:
./scripts/backup_mysql.sh --retention 15
```

### Mẫu định dạng tên tệp sao lưu:
Các tệp sao lưu được lưu trữ có gắn timestamp rõ ràng theo định dạng chuẩn:
```text
/var/backups/hotel_db/hotel_db_backup_20261028_000000.sql.gz
/var/backups/hotel_db/hotel_db_backup_20261029_000000.sql.gz
```

---

## 🔄 6. Hướng Dẫn Khôi Phục & Diễn Tập Sự Cố (Disaster Recovery Drill)

### Quy trình 5 bước Diễn tập Khôi phục Dữ liệu Mẫu (Dry-run / Staging Drill):

Để đảm bảo quy trình phục hồi diễn ra suôn sẻ mà **không làm gián đoạn hay ảnh hưởng tới cơ sở dữ liệu thật**, đội ngũ DevOps thực hiện diễn tập theo kịch bản sau:

#### Bước 1: Liệt kê các bản sao lưu hiện có
```bash
ls -lh /var/backups/hotel_db/
```

#### Bước 2: Khôi phục vào một cơ sở dữ liệu thử nghiệm (`hotel_db_drill`)
Sử dụng tham số `--target-db` để nạp dữ liệu vào cơ sở dữ liệu mẫu riêng biệt:
```bash
./scripts/restore_mysql.sh --latest --target-db hotel_db_drill -y
```

#### Bước 3: Đánh giá thời gian RTO (Recovery Time Objective)
Script sẽ tự động tính toán thời gian thực thi:
```text
====================================================================
       BÁO CÁO NGHIỆM THU KHÔI PHỤC DỮ LIỆU (RESTORE REPORT)      
====================================================================
  - Tệp nguồn          : hotel_db_backup_20261028_000000.sql.gz
  - Dung lượng tệp nén : 480K
  - Database đích      : hotel_db_drill
  - Tổng số bảng       : 14 bảng
  - Số lượng buồng phòng: 100 rooms
  - Số lượng đơn đặt    : 45 bookings
  - Thời gian khôi phục: 4 giây
  - Tiêu chuẩn RTO (< 3 phút): [ĐẠT CHUẨN - PASSED] (4s < 180s)
====================================================================
```

#### Bước 4: Kiểm tra tính toàn vẹn dữ liệu trong database diễn tập
```bash
docker exec -it hotel-mysql mysql -u root -proot_password_secure -e "
  SELECT table_name, table_rows 
  FROM information_schema.tables 
  WHERE table_schema='hotel_db_drill';
"
```

#### Bước 5: Dọn dẹp cơ sở dữ liệu diễn tập sau khi hoàn tất
```bash
docker exec -it hotel-mysql mysql -u root -proot_password_secure -e "DROP DATABASE IF EXISTS hotel_db_drill;"
```

---

### Khôi phục khẩn cấp cơ sở dữ liệu sản xuất (Production Recovery):

Trong trường hợp xảy ra sự cố thảm họa trên môi trường Production:

```bash
# Cách 1: Tự động khôi phục từ bản sao lưu gần nhất (yêu cầu gõ 'yes' xác nhận):
./scripts/restore_mysql.sh --latest

# Cách 2: Khôi phục từ một bản sao lưu cụ thể theo ngày:
./scripts/restore_mysql.sh /var/backups/hotel_db/hotel_db_backup_20261028_000000.sql.gz

# Cách 3: Khôi phục khẩn cấp tự động không cần prompt xác nhận:
./scripts/restore_mysql.sh --latest -y
```

---

## 📊 7. Quản Lý Nhật Ký & Cấu Hình Logrotate

Nhật ký hoạt động của Cronjob được ghi tại: `/var/log/mysql_backup.log`.

### Theo dõi log thời gian thực:
```bash
tail -f -n 50 /var/log/mysql_backup.log
```

### Cấu hình xoay vòng file log (Logrotate) trên VPS:
Tạo tệp cấu hình `/etc/logrotate.d/mysql_backup`:
```bash
cat << 'EOF' > /etc/logrotate.d/mysql_backup
/var/log/mysql_backup.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
    create 0640 root root
}
EOF
```

---

## 🔍 8. Bảng Mã Lỗi & Hướng Dẫn Xử Lý Nhanh (Troubleshooting)

| Tình trạng lỗi | Nguyên nhân gốc rễ | Cách xử lý nhanh |
| :--- | :--- | :--- |
| `Container 'hotel-mysql' không hoạt động!` | Dịch vụ MySQL Docker bị dừng hoặc lỗi OOM | Khởi động lại container: `docker compose up -d mysql-db` và kiểm tra log bằng `docker logs -n 50 hotel-mysql`. |
| `Access denied for user 'root'@'localhost'` | Mật khẩu root không khớp cấu hình `.env` | Kiểm tra giá trị `DB_ROOT_PASSWORD` trong file `.env` tại thư mục gốc dự án. |
| `Tệp nén gzip bị lỗi toàn vẹn` | Quá trình mysqldump bị ngắt hoặc ổ đĩa VPS bị đầy 100% | Kiểm tra dung lượng ổ đĩa bằng `df -h`. Dọn dẹp images rác bằng `docker system prune -f`. |
| `Permission denied` khi chạy script | Thiếu cờ thực thi hoặc quyền root | Chạy lệnh `chmod +x scripts/*.sh` hoặc thực thi với quyền `sudo`. |
| Cronjob không chạy vào 00:00 | Service cron trên VPS bị dừng hoặc sai múi giờ | Khởi động lại service cron: `systemctl restart cron` và kiểm tra `timedatectl`. |

---

## ✅ 9. Bảng Kiểm Tra Nghiệm Thu (Acceptance Checklist)

Bảng đối soát nghiệm thu thẻ công việc **[SP1-OPS-01]**:

- [x] **Checklist 1:** Kịch bản `backup_mysql.sh` thực thi `docker exec hotel-mysql mysqldump | gzip` thành công, hỗ trợ biến môi trường linh hoạt và kiểm tra toàn vẹn `gzip -t`.
- [x] **Checklist 2:** Tính năng tự động tìm kiếm và xóa bỏ các tệp sao lưu cũ hơn 30 ngày (`-mtime +30`), giữ dung lượng lưu trữ an toàn.
- [x] **Checklist 3:** Kịch bản `setup_cron.sh` cấu hình Crontab chạy vào `00:00` hàng ngày, hỗ trợ theo dõi trạng thái và ghi log vào `/var/log/mysql_backup.log`.
- [x] **Checklist 4:** Kịch bản `restore_mysql.sh` hỗ trợ khôi phục qua stream, đo lường thời gian thực thi nghiệm thu **RTO < 3 phút**, có cơ chế diễn tập an toàn với cờ `--target-db`.
- [x] **Checklist 5:** Tài liệu hướng dẫn chi tiết `docs/BACKUP_AND_RESTORE.md` chuẩn hóa đầy đủ kiến trúc, lệnh thực thi, kịch bản diễn tập và ma trận sự cố.
