#!/usr/bin/env bash
# =============================================================================
# HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
# File: scripts/restore_mysql.sh
# Purpose: Khôi phục cơ sở dữ liệu MySQL từ bản sao lưu .sql.gz vào Docker Container,
#          hỗ trợ diễn tập phục hồi thảm họa (Disaster Recovery Drill), đo lường RTO < 3 phút.
# Sprint: Sprint 1 [SP1-OPS-01] [Backup-Ops]
# =============================================================================

set -euo pipefail

# --- Màu sắc hiển thị terminal ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

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
    while IFS='=' read -r key value || [ -n "$key" ]; do
        case "$key" in
            \#*|"") continue ;;
        esac
        key=$(echo "$key" | tr -d '[:space:]')
        value=$(echo "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')
        case "$key" in
            MYSQL_DATABASE|MYSQL_USER|MYSQL_PASSWORD|DB_ROOT_PASSWORD|MYSQL_CONTAINER_NAME|BACKUP_DIR)
                eval "$key=\"$value\""
                ;;
        esac
    done < "$ENV_FILE"
fi

# --- Cấu hình mặc định ---
CONTAINER_NAME="${MYSQL_CONTAINER_NAME:-hotel-mysql}"
DEFAULT_DB_NAME="${MYSQL_DATABASE:-hotel_db}"
TARGET_DB="$DEFAULT_DB_NAME"
DB_ROOT_PASSWORD="${DB_ROOT_PASSWORD:-root_password_secure}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/hotel_db}"
BACKUP_FILE=""
FORCE_YES=false
DRY_RUN=false
USE_LATEST=false

# --- Hiển thị hướng dẫn sử dụng ---
usage() {
    cat << EOF
Cách dùng: $0 [TỆP_BACKUP] [TÙY CHỌN]

Kịch bản khôi phục cơ sở dữ liệu MySQL cho Hotel Booking System (HBS).
Hỗ trợ giải nén trực tiếp qua stream (pipe) vào Docker container và nghiệm thu RTO.

Đối số:
  TỆP_BACKUP            Đường dẫn tới tệp .sql.gz hoặc .sql cần khôi phục

Tùy chọn:
  -l, --latest          Tự động chọn tệp backup mới nhất trong thư mục $BACKUP_DIR
  -d, --dir DIR         Thư mục tìm kiếm file backup (mặc định: $BACKUP_DIR)
  -t, --target-db DB    Tên database đích cần restore vào (mặc định: $DEFAULT_DB_NAME)
                        (Hữu ích khi diễn tập khôi phục vào db mẫu như 'hotel_db_drill')
  -c, --container NAME  Tên MySQL Docker container (mặc định: $CONTAINER_NAME)
  -y, --yes, --force    Bỏ qua bước xác nhận tương tác (dùng cho kịch bản tự động)
  --dry-run             Kiểm tra tính toàn vẹn của tệp và môi trường, không ghi đè DB
  -h, --help            Hiển thị thông tin trợ giúp này

Ví dụ:
  # 1. Khôi phục từ file chỉ định:
  $0 /var/backups/hotel_db/hotel_db_backup_20261028_000000.sql.gz

  # 2. Tự động lấy bản backup mới nhất:
  $0 --latest -y

  # 3. Diễn tập khôi phục vào cơ sở dữ liệu mẫu kiểm thử (không ảnh hưởng dữ liệu chính):
  $0 --latest --target-db hotel_db_sample -y

  # 4. Kiểm tra trước khi restore (dry-run):
  $0 --latest --dry-run
EOF
    exit 0
}

# --- Phân tích tham số dòng lệnh ---
while [[ $# -gt 0 ]]; do
    case "$1" in
        -l|--latest)
            USE_LATEST=true
            shift
            ;;
        -d|--dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -t|--target-db)
            TARGET_DB="$2"
            shift 2
            ;;
        -c|--container)
            CONTAINER_NAME="$2"
            shift 2
            ;;
        -y|--yes|--force)
            FORCE_YES=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        -*)
            log_error "Tham số không hợp lệ: $1"
            usage
            ;;
        *)
            if [ -z "$BACKUP_FILE" ]; then
                BACKUP_FILE="$1"
            else
                log_error "Đối số dư thừa: $1"
                usage
            fi
            shift
            ;;
    esac
done

# --- Tự động xác định tệp backup nếu dùng --latest hoặc chưa chỉ định ---
if [ "$USE_LATEST" = true ] || [ -z "$BACKUP_FILE" ]; then
    if [ ! -d "$BACKUP_DIR" ]; then
        log_error "Thư mục backup '$BACKUP_DIR' không tồn tại!"
        exit 1
    fi

    LATEST_FOUND=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name "*_backup_*.sql.gz" 2>/dev/null | sort -r | head -n 1 || true)
    
    if [ -z "$LATEST_FOUND" ]; then
        # Thử tìm file .sql thông thường
        LATEST_FOUND=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name "*.sql*" 2>/dev/null | sort -r | head -n 1 || true)
    fi

    if [ -z "$LATEST_FOUND" ]; then
        log_error "Không tìm thấy bất kỳ tệp sao lưu nào trong '$BACKUP_DIR'!"
        exit 1
    fi

    if [ "$USE_LATEST" = true ] || [ "$FORCE_YES" = true ]; then
        BACKUP_FILE="$LATEST_FOUND"
        log_info "Tự động chọn tệp sao lưu mới nhất: $BACKUP_FILE"
    else
        echo -e "\n${BOLD}Danh sách 5 bản sao lưu gần nhất trong '$BACKUP_DIR':${NC}"
        mapfile -t BACKUP_LIST < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name "*.sql*" 2>/dev/null | sort -r | head -n 5)
        
        for i in "${!BACKUP_LIST[@]}"; do
            B_SIZE=$(du -h "${BACKUP_LIST[$i]}" | cut -f1)
            B_DATE=$(date -r "${BACKUP_LIST[$i]}" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "N/A")
            echo -e "  [$((i + 1))] $(basename "${BACKUP_LIST[$i]}") (${B_SIZE}, ${B_DATE})"
        done

        echo -e "\nNhập số thứ tự file muốn khôi phục [1-${#BACKUP_LIST[@]}] (Mặc định: 1 - tệp mới nhất): "
        read -r CHOICE || CHOICE="1"
        CHOICE="${CHOICE:-1}"

        if [[ "$CHOICE" =~ ^[0-9]+$ ]] && [ "$CHOICE" -ge 1 ] && [ "$CHOICE" -le "${#BACKUP_LIST[@]}" ]; then
            BACKUP_FILE="${BACKUP_LIST[$((CHOICE - 1))]}"
        else
            log_error "Lựa chọn không hợp lệ!"
            exit 1
        fi
    fi
fi

# --- Kiểm tra tệp sao lưu tồn tại và hợp lệ ---
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Tệp sao lưu không tồn tại: $BACKUP_FILE"
    exit 1
fi

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log_info "Tệp sao lưu đã chọn: $BACKUP_FILE ($FILE_SIZE)"

# Kiểm tra tính toàn vẹn nếu là file gzip
if [[ "$BACKUP_FILE" =~ \.gz$ ]]; then
    log_info "Đang kiểm tra tính toàn vẹn của tệp nén gzip..."
    if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
        log_error "Tệp nén gzip '$BACKUP_FILE' bị lỗi hoặc bị hỏng dữ liệu!"
        exit 1
    fi
    log_success "Tệp gzip toàn vẹn 100%."
fi

# --- Kiểm tra Docker và Container ---
if [ "$DRY_RUN" = false ]; then
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Không tìm thấy lệnh 'docker'. Vui lòng kiểm tra Docker trên máy chủ!"
        exit 1
    fi

    CONTAINER_STATUS=$(docker inspect -f '{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "not_found")
    if [ "$CONTAINER_STATUS" != "running" ]; then
        log_error "Container '$CONTAINER_NAME' không hoạt động! Trạng thái: '$CONTAINER_STATUS'"
        exit 1
    fi
fi

# --- Cảnh báo an toàn và xác nhận thao tác ---
echo -e "\n${RED}====================================================================${NC}"
echo -e "${RED}${BOLD}  ⚠️  CẢNH BÁO AN TOÀN - THAO TÁC GHI ĐÈ CƠ SỞ DỮ LIỆU  ⚠️${NC}"
echo -e "${RED}====================================================================${NC}"
echo -e "  - Container đích    : ${BOLD}$CONTAINER_NAME${NC}"
echo -e "  - Cơ sở dữ liệu đích: ${BOLD}${RED}$TARGET_DB${NC}"
echo -e "  - Tệp phục hồi      : ${CYAN}$BACKUP_FILE${NC} ($FILE_SIZE)"
echo -e "${RED}Toàn bộ bảng dữ liệu hiện tại trong database '$TARGET_DB' sẽ bị ghi đè!${NC}"
echo -e "${RED}====================================================================${NC}\n"

if [ "$FORCE_YES" = false ] && [ "$DRY_RUN" = false ]; then
    echo -n "Bạn có chắc chắn muốn tiến hành khôi phục? (Nhập 'yes' để xác nhận): "
    read -r CONFIRMATION
    if [ "$CONFIRMATION" != "yes" ]; then
        log_warn "Thao tác đã bị hủy bởi người dùng."
        exit 0
    fi
fi

# --- Bắt đầu quá trình khôi phục ---
log_info "BẮT ĐẦU TIẾN TRÌNH KHÔI PHỤC DỮ LIỆU..."
START_TIME=$(date +%s)

if [ "$DRY_RUN" = true ]; then
    log_warn "[DRY-RUN] Mô phỏng lệnh khôi phục:"
    if [[ "$BACKUP_FILE" =~ \.gz$ ]]; then
        log_info "gunzip -c \"$BACKUP_FILE\" | docker exec -i \"$CONTAINER_NAME\" mysql -u root -p\"***\" \"$TARGET_DB\""
    else
        log_info "cat \"$BACKUP_FILE\" | docker exec -i \"$CONTAINER_NAME\" mysql -u root -p\"***\" \"$TARGET_DB\""
    fi
    log_success "[DRY-RUN] Kiểm tra hoàn tất, tệp backup và cú pháp sẵn sàng!"
    exit 0
fi

# 1. Đảm bảo Database đích tồn tại (nếu là db mẫu hoặc diễn tập)
log_info "Đang chuẩn bị cơ sở dữ liệu đích '$TARGET_DB'..."
docker exec "$CONTAINER_NAME" mysql \
    -u root \
    -p"${DB_ROOT_PASSWORD}" \
    -e "CREATE DATABASE IF NOT EXISTS \`${TARGET_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Đổ dữ liệu từ luồng nén trực tiếp vào MySQL
log_info "Đang nạp dữ liệu từ luồng nén vào container '$CONTAINER_NAME'..."

if [[ "$BACKUP_FILE" =~ \.gz$ ]]; then
    if gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" mysql -u root -p"${DB_ROOT_PASSWORD}" "$TARGET_DB"; then
        log_success "Hoàn tất nạp dữ liệu vào cơ sở dữ liệu '$TARGET_DB'."
    else
        log_error "Lỗi trong quá trình nạp dữ liệu vào MySQL!"
        exit 1
    fi
else
    if cat "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" mysql -u root -p"${DB_ROOT_PASSWORD}" "$TARGET_DB"; then
        log_success "Hoàn tất nạp dữ liệu vào cơ sở dữ liệu '$TARGET_DB'."
    else
        log_error "Lỗi trong quá trình nạp dữ liệu vào MySQL!"
        exit 1
    fi
fi

# 3. Đánh giá thời gian RTO (Recovery Time Objective)
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# 4. Nghiệm thu và kiểm tra tính toàn vẹn sau khi restore
log_info "Đang kiểm tra số lượng bảng và bản ghi dữ liệu sau khôi phục..."
TABLE_COUNT=$(docker exec "$CONTAINER_NAME" mysql -u root -p"${DB_ROOT_PASSWORD}" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${TARGET_DB}';" 2>/dev/null || echo "0")
SAMPLE_BOOKINGS=$(docker exec "$CONTAINER_NAME" mysql -u root -p"${DB_ROOT_PASSWORD}" -N -e "SELECT COUNT(*) FROM ${TARGET_DB}.bookings;" 2>/dev/null || echo "N/A")
SAMPLE_ROOMS=$(docker exec "$CONTAINER_NAME" mysql -u root -p"${DB_ROOT_PASSWORD}" -N -e "SELECT COUNT(*) FROM ${TARGET_DB}.rooms;" 2>/dev/null || echo "N/A")

# Hiển thị báo cáo nghiệm thu
echo -e "\n===================================================================="
echo -e "${GREEN}${BOLD}       BÁO CÁO NGHIỆM THU KHÔI PHỤC DỮ LIỆU (RESTORE REPORT)      ${NC}"
echo -e "===================================================================="
echo -e "  - Tệp nguồn          : $(basename "$BACKUP_FILE")"
echo -e "  - Dung lượng tệp nén : $FILE_SIZE"
echo -e "  - Database đích      : $TARGET_DB"
echo -e "  - Tổng số bảng       : ${BOLD}$TABLE_COUNT bảng${NC}"
echo -e "  - Số lượng buồng phòng: $SAMPLE_ROOMS rooms"
echo -e "  - Số lượng đơn đặt    : $SAMPLE_BOOKINGS bookings"
echo -e "  - Thời gian khôi phục: ${BOLD}${CYAN}${DURATION} giây${NC}"

# Đánh giá tiêu chuẩn RTO < 3 phút (180 giây)
if [ "$DURATION" -le 180 ]; then
    echo -e "  - Tiêu chuẩn RTO (< 3 phút): ${GREEN}${BOLD}[ĐẠT CHUẨN - PASSED]${NC} (${DURATION}s < 180s)"
else
    echo -e "  - Tiêu chuẩn RTO (< 3 phút): ${YELLOW}${BOLD}[CẢNH BÁO - VƯỢT THỜI GIAN]${NC} (${DURATION}s >= 180s)"
fi
echo -e "====================================================================\n"

log_success "Khôi phục dữ liệu hoàn tất thành công!"
exit 0
