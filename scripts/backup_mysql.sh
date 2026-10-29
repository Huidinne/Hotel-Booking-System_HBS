#!/usr/bin/env bash
# =============================================================================
# HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
# File: scripts/backup_mysql.sh
# Purpose: Tự động sao lưu cơ sở dữ liệu MySQL từ Docker Container, nén gzip,
#          lưu trữ an toàn và tự động dọn dẹp các bản sao lưu cũ quá 30 ngày.
# Sprint: Sprint 1 [SP1-OPS-01] [Backup-Ops]
# =============================================================================

set -euo pipefail

# --- Màu sắc hiển thị terminal ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# --- Hàm ghi log có timestamp chuẩn ISO 8601 ---
log_info() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] [${BLUE}INFO${NC}] $*"
}

log_success() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] [${GREEN}SUCCESS${NC}] $*"
}

log_warn() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] [${YELLOW}WARN${NC}] $*"
}

log_error() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] [${RED}ERROR${NC}] $*" >&2
}

# --- Định vị thư mục dự án ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# --- Đọc cấu hình từ file .env (nếu có) ---
ENV_FILE="${PROJECT_DIR}/.env"
if [ -f "$ENV_FILE" ]; then
    log_info "Đang đọc biến môi trường từ: $ENV_FILE"
    # Chỉ export các biến liên quan tới MySQL để tránh conflict
    while IFS='=' read -r key value || [ -n "$key" ]; do
        # Bỏ qua comment và dòng trống
        case "$key" in
            \#*|"") continue ;;
        esac
        # Loại bỏ khoảng trắng thừa
        key=$(echo "$key" | tr -d '[:space:]')
        value=$(echo "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')
        case "$key" in
            MYSQL_DATABASE|MYSQL_USER|MYSQL_PASSWORD|DB_ROOT_PASSWORD|MYSQL_CONTAINER_NAME|BACKUP_DIR|BACKUP_RETENTION_DAYS)
                eval "$key=\"$value\""
                ;;
        esac
    done < "$ENV_FILE"
fi

# --- Cấu hình tham số mặc định ---
CONTAINER_NAME="${MYSQL_CONTAINER_NAME:-hotel-mysql}"
DB_NAME="${MYSQL_DATABASE:-hotel_db}"
DB_USER="${MYSQL_USER:-hotel_user}"
DB_ROOT_PASSWORD="${DB_ROOT_PASSWORD:-root_password_secure}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/hotel_db}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
DRY_RUN=false

# --- Hiển thị hướng dẫn sử dụng ---
usage() {
    cat << EOF
Cách dùng: $0 [TÙY CHỌN]

Kịch bản sao lưu MySQL định kỳ cho hệ thống Hotel Booking System (HBS).
Tự động xuất dữ liệu qua mysqldump trong Docker, nén gzip và dọn dẹp file cũ.

Tùy chọn:
  -d, --dir DIR          Thư mục lưu trữ backup (mặc định: $BACKUP_DIR)
  -c, --container NAME   Tên MySQL Docker container (mặc định: $CONTAINER_NAME)
  -n, --database DB      Tên cơ sở dữ liệu (mặc định: $DB_NAME)
  -r, --retention DAYS   Số ngày lưu trữ trước khi dọn dẹp (mặc định: $RETENTION_DAYS)
  --dry-run              Chạy mô phỏng kiểm tra, không ghi đè dữ liệu thực
  -h, --help             Hiển thị thông tin trợ giúp này

Ví dụ:
  $0
  $0 --dir /data/backups/hotel_db --retention 45
  $0 --dry-run
EOF
    exit 0
}

# --- Phân tích tham số dòng lệnh ---
while [[ $# -gt 0 ]]; do
    case "$1" in
        -d|--dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -c|--container)
            CONTAINER_NAME="$2"
            shift 2
            ;;
        -n|--database)
            DB_NAME="$2"
            shift 2
            ;;
        -r|--retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            log_error "Tham số không hợp lệ: $1"
            usage
            ;;
    esac
done

# --- Bắt đầu thực thi sao lưu ---
log_info "=========================================================="
log_info "BẮT ĐẦU TIẾN TRÌNH SAO LƯU DỮ LIỆU MYSQL - HOTEL BOOKING SYSTEM"
log_info "=========================================================="
log_info "Thời gian bắt đầu: $(date '+%Y-%m-%d %H:%M:%S %Z')"
log_info "Docker Container : $CONTAINER_NAME"
log_info "Cơ sở dữ liệu    : $DB_NAME"
log_info "Thư mục đích     : $BACKUP_DIR"
log_info "Thời hạn lưu trữ : $RETENTION_DAYS ngày"
if [ "$DRY_RUN" = true ]; then
    log_warn "Chế độ DRY-RUN đang bật. Sẽ không có file backup thực tế nào được tạo!"
fi

# 1. Kiểm tra môi trường Docker và Container
if [ "$DRY_RUN" = false ]; then
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Không tìm thấy lệnh 'docker'. Vui lòng cài đặt Docker trên máy chủ VPS!"
        exit 1
    fi

    # Kiểm tra trạng thái hoạt động của Container
    CONTAINER_STATUS=$(docker inspect -f '{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "not_found")
    if [ "$CONTAINER_STATUS" != "running" ]; then
        log_error "Container '$CONTAINER_NAME' không hoạt động! Trạng thái hiện tại: '$CONTAINER_STATUS'"
        exit 1
    fi
    log_info "Container '$CONTAINER_NAME' đang chạy bình thường."
fi

# 2. Khởi tạo thư mục đích lưu trữ bản sao lưu
if [ "$DRY_RUN" = false ]; then
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "Thư mục '$BACKUP_DIR' chưa tồn tại. Đang tiến hành tạo mới..."
        mkdir -p "$BACKUP_DIR"
        chmod 750 "$BACKUP_DIR"
    fi
fi

# 3. Đặt tên tệp sao lưu có timestamp chuẩn
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="${DB_NAME}_backup_${TIMESTAMP}.sql.gz"
BACKUP_FILEPATH="${BACKUP_DIR}/${BACKUP_FILENAME}"
TEMP_FILEPATH="${BACKUP_FILEPATH}.tmp"

START_TIME=$(date +%s)

# 4. Thực thi mysqldump và nén gzip trực tiếp qua pipeline
log_info "Đang tiến hành mysqldump và nén tệp: $BACKUP_FILENAME ..."

if [ "$DRY_RUN" = true ]; then
    log_info "[DRY-RUN] Lệnh thực thi:"
    log_info "docker exec \"$CONTAINER_NAME\" mysqldump -u root -p\"***\" --single-transaction --quick --routines --triggers --events --add-drop-table \"$DB_NAME\" | gzip -9 > \"$BACKUP_FILEPATH\""
else
    # Sử dụng file tạm (.tmp) để đảm bảo tính nguyên tử (atomic write).
    # Nếu lệnh dump bị ngắt giữa chừng, file hỏng sẽ không bị lưu lại như bản backup hợp lệ.
    if docker exec "$CONTAINER_NAME" mysqldump \
        -u root \
        -p"${DB_ROOT_PASSWORD}" \
        --single-transaction \
        --quick \
        --routines \
        --triggers \
        --events \
        --add-drop-table \
        --default-character-set=utf8mb4 \
        "$DB_NAME" | gzip -9 > "$TEMP_FILEPATH"; then
        
        # Kiểm tra tính toàn vẹn của tệp nén gzip
        if gzip -t "$TEMP_FILEPATH" >/dev/null 2>&1; then
            mv "$TEMP_FILEPATH" "$BACKUP_FILEPATH"
            chmod 640 "$BACKUP_FILEPATH"
            
            END_TIME=$(date +%s)
            DURATION=$((END_TIME - START_TIME))
            FILE_SIZE=$(du -h "$BACKUP_FILEPATH" | cut -f1)
            
            log_success "Sao lưu thành công tệp: $BACKUP_FILEPATH"
            log_success "Kích thước tệp nén: $FILE_SIZE | Thời gian thực hiện: ${DURATION}s"
        else
            log_error "Tệp nén gzip bị lỗi toàn vẹn! Đang dọn dẹp file tạm..."
            rm -f "$TEMP_FILEPATH"
            exit 1
        fi
    else
        log_error "Tiến trình mysqldump thất bại! Đang dọn dẹp file tạm..."
        rm -f "$TEMP_FILEPATH"
        exit 1
    fi
fi

# 5. Dọn dẹp các bản sao lưu cũ vượt quá RETENTION_DAYS (mặc định > 30 ngày)
log_info "Kiểm tra chính sách lưu trữ: Dọn dẹp bản sao lưu cũ hơn $RETENTION_DAYS ngày..."

if [ "$DRY_RUN" = true ]; then
    log_info "[DRY-RUN] Tìm kiếm: find \"$BACKUP_DIR\" -maxdepth 1 -type f -name \"${DB_NAME}_backup_*.sql.gz\" -mtime +\"$RETENTION_DAYS\""
else
    # Liệt kê danh sách các tệp quá hạn
    EXPIRED_FILES=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name "${DB_NAME}_backup_*.sql.gz" -mtime +"$RETENTION_DAYS")
    if [ -n "$EXPIRED_FILES" ]; then
        EXPIRED_COUNT=$(echo "$EXPIRED_FILES" | wc -l)
        log_warn "Phát hiện $EXPIRED_COUNT bản sao lưu cũ hơn $RETENTION_DAYS ngày cần xóa:"
        while IFS= read -r file; do
            log_warn "  -> Đang xóa: $(basename "$file")"
            rm -f "$file"
        done <<< "$EXPIRED_FILES"
        log_success "Đã dọn dẹp hoàn tất $EXPIRED_COUNT tệp sao lưu cũ."
    else
        log_info "Không có bản sao lưu nào vượt quá $RETENTION_DAYS ngày."
    fi

    # Thống kê tổng số bản sao lưu hiện còn lưu giữ
    CURRENT_BACKUPS_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name "${DB_NAME}_backup_*.sql.gz" | wc -l)
    TOTAL_USAGE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "N/A")
    log_info "Tổng số bản backup hiện có trong kho: $CURRENT_BACKUPS_COUNT bản | Tổng dung lượng: $TOTAL_USAGE"
fi

log_info "=========================================================="
log_success "TIẾN TRÌNH SAO LƯU DỮ LIỆU HOÀN TẤT THÀNH CÔNG!"
log_info "=========================================================="
exit 0
