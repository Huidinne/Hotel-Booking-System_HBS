#!/usr/bin/env bash
# =============================================================================
# HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
# File: scripts/setup_cron.sh
# Purpose: Cấu hình và quản lý Crontab tự động chạy sao lưu MySQL vào 00:00 mỗi ngày
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

BACKUP_SCRIPT="${SCRIPT_DIR}/backup_mysql.sh"
RESTORE_SCRIPT="${SCRIPT_DIR}/restore_mysql.sh"
LOG_FILE="/var/log/mysql_backup.log"
CRON_TAG="# HBS_MYSQL_BACKUP_JOB"
DEFAULT_CRON_SCHEDULE="0 0 * * *" # Chạy vào 00:00 mỗi ngày

usage() {
    cat << EOF
Cách dùng: $0 [TÙY CHỌN]

Công cụ tự động thiết lập và quản trị Cronjob sao lưu MySQL định kỳ trên VPS.

Tùy chọn:
  -i, --install         Cài đặt cronjob chạy vào 00:00 mỗi đêm (idempotent)
  -s, --status          Kiểm tra trạng thái cấu hình cronjob hiện tại
  -r, --remove          Hủy bỏ cấu hình cronjob sao lưu khỏi hệ thống
  -t, --test            Chạy thử nghiệm script backup ngay lập tức
  --schedule "CRON"     Tùy biến biểu thức cron (mặc định: "$DEFAULT_CRON_SCHEDULE")
  -h, --help            Hiển thị hướng dẫn sử dụng này

Ví dụ:
  $0 --install
  $0 --status
  $0 --test
  $0 --schedule "0 2 * * *" --install
EOF
    exit 0
}

CRON_SCHEDULE="$DEFAULT_CRON_SCHEDULE"
ACTION="status"

while [[ $# -gt 0 ]]; do
    case "$1" in
        -i|--install)
            ACTION="install"
            shift
            ;;
        -s|--status)
            ACTION="status"
            shift
            ;;
        -r|--remove)
            ACTION="remove"
            shift
            ;;
        -t|--test)
            ACTION="test"
            shift
            ;;
        --schedule)
            CRON_SCHEDULE="$2"
            shift 2
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

# --- Cấp quyền thực thi cho các script trong thư mục scripts/ ---
grant_permissions() {
    log_info "Kiểm tra quyền thực thi (chmod +x) cho các kịch bản..."
    if [ -f "$BACKUP_SCRIPT" ]; then
        chmod +x "$BACKUP_SCRIPT"
    fi
    if [ -f "$RESTORE_SCRIPT" ]; then
        chmod +x "$RESTORE_SCRIPT"
    fi
    chmod +x "${SCRIPT_DIR}/setup_cron.sh" 2>/dev/null || true
    log_success "Đã cấp quyền thực thi cho các script tại ${SCRIPT_DIR}."
}

# --- Cài đặt Cronjob ---
install_cron() {
    grant_permissions

    # Đảm bảo file log tồn tại và có quyền ghi
    if [ ! -f "$LOG_FILE" ]; then
        touch "$LOG_FILE" 2>/dev/null || true
        chmod 644 "$LOG_FILE" 2>/dev/null || true
    fi

    # Câu lệnh cronjob hoàn chỉnh
    CRON_CMD="${CRON_SCHEDULE} /bin/bash ${BACKUP_SCRIPT} >> ${LOG_FILE} 2>&1 ${CRON_TAG}"

    # Lấy danh sách crontab hiện tại
    EXISTING_CRON=$(crontab -l 2>/dev/null || echo "")

    if echo "$EXISTING_CRON" | grep -Fq "$CRON_TAG"; then
        log_warn "Cronjob sao lưu đã tồn tại trong hệ thống. Đang tiến hành cập nhật mới..."
        # Lọc bỏ dòng cũ và thêm dòng mới
        FILTERED_CRON=$(echo "$EXISTING_CRON" | grep -Fv "$CRON_TAG" | grep -v "^$" || true)
        if [ -n "$FILTERED_CRON" ]; then
            (echo "$FILTERED_CRON"; echo "$CRON_CMD") | crontab -
        else
            echo "$CRON_CMD" | crontab -
        fi
    else
        log_info "Đang thêm cronjob mới vào hệ thống..."
        if [ -n "$EXISTING_CRON" ]; then
            (echo "$EXISTING_CRON"; echo "$CRON_CMD") | crontab -
        else
            echo "$CRON_CMD" | crontab -
        fi
    fi

    log_success "Đã cài đặt thành công Cronjob sao lưu MySQL!"
    echo -e "\n${BOLD}Thông tin Cronjob đã cấu hình:${NC}"
    echo -e "  - Biểu thức Cron  : ${CYAN}${CRON_SCHEDULE}${NC} (chạy lúc 00:00 hàng ngày)"
    echo -e "  - Kịch bản thực thi: ${BOLD}${BACKUP_SCRIPT}${NC}"
    echo -e "  - Tệp ghi nhật ký  : ${BOLD}${LOG_FILE}${NC}"
    echo -e "\nBạn có thể kiểm tra danh sách crontab bất cứ lúc nào bằng lệnh: ${CYAN}crontab -l${NC}\n"
}

# --- Kiểm tra trạng thái Cronjob ---
check_status() {
    EXISTING_CRON=$(crontab -l 2>/dev/null || echo "")

    echo -e "\n${BOLD}=== TRẠNG THÁI CRONJOB SAO LƯU MYSQL (HBS) ===${NC}"
    if echo "$EXISTING_CRON" | grep -Fq "$CRON_TAG"; then
        ACTIVE_LINE=$(echo "$EXISTING_CRON" | grep -F "$CRON_TAG")
        log_success "Cronjob ĐANG HOẠT ĐỘNG:"
        echo -e "  ${GREEN}${ACTIVE_LINE}${NC}\n"
    else
        log_warn "Chưa tìm thấy Cronjob sao lưu MySQL trong Crontab!"
        echo -e "  Để cài đặt, hãy chạy lệnh: ${CYAN}$0 --install${NC}\n"
    fi

    # Kiểm tra log file
    if [ -f "$LOG_FILE" ]; then
        LOG_SIZE=$(du -h "$LOG_FILE" | cut -f1)
        LAST_LINE=$(tail -n 1 "$LOG_FILE" 2>/dev/null || echo "Trống")
        echo -e "Tệp nhật ký (${LOG_FILE}):"
        echo -e "  - Dung lượng: $LOG_SIZE"
        echo -e "  - Dòng cuối : $LAST_LINE"
    fi
}

# --- Hủy bỏ Cronjob ---
remove_cron() {
    EXISTING_CRON=$(crontab -l 2>/dev/null || echo "")

    if echo "$EXISTING_CRON" | grep -Fq "$CRON_TAG"; then
        FILTERED_CRON=$(echo "$EXISTING_CRON" | grep -Fv "$CRON_TAG" | grep -v "^$" || true)
        if [ -n "$FILTERED_CRON" ]; then
            echo "$FILTERED_CRON" | crontab -
        else
            crontab -r 2>/dev/null || true
        fi
        log_success "Đã xóa bỏ thành công Cronjob sao lưu MySQL khỏi Crontab!"
    else
        log_info "Không tìm thấy Cronjob sao lưu nào để xóa."
    fi
}

# --- Chạy kiểm thử ngay lập tức ---
test_backup() {
    grant_permissions
    log_info "Đang tiến hành chạy thử nghiệm sao lưu ngay lập tức..."
    if /bin/bash "$BACKUP_SCRIPT"; then
        log_success "Kiểm thử sao lưu chạy thành công tốt đẹp!"
    else
        log_error "Kiểm thử sao lưu gặp lỗi! Vui lòng kiểm tra Docker container và nhật ký hệ thống."
        exit 1
    fi
}

case "$ACTION" in
    install)
        install_cron
        ;;
    status)
        check_status
        ;;
    remove)
        remove_cron
        ;;
    test)
        test_backup
        ;;
esac

exit 0
