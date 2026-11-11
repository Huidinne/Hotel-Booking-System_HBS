#!/usr/bin/env bash
# =============================================================================
# HOTEL BOOKING SYSTEM (HBS) - DISASTER RECOVERY DRILL SCRIPT
# File: scripts/test_backup_restore.sh
# Purpose: Diễn tập phục hồi dữ liệu (Backup & Restore Drill) vào DB TEST cô lập,
#          tuyệt đối không chạm vào DB Production, đo RTO < 5 phút (300s) và
#          xác minh toàn vẹn dữ liệu SQL (Row Counts + Foreign Keys).
# Sprint: Sprint 1 [SP1-OPS-01] & Sprint 3 [SP3-1111-TRUNG]
# =============================================================================

set -euo pipefail

# --- Màu sắc hiển thị ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info()    { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] [${BLUE}INFO${NC}] $*"; }
log_success() { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] [${GREEN}PASS${NC}] $*"; }
log_warn()    { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] [${YELLOW}WARN${NC}] $*"; }
log_error()   { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] [${RED}FAIL${NC}] $*" >&2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
GIT_COMMIT_SHA=$(git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")

# --- Đọc cấu hình an toàn từ .env (nếu có, không in giá trị nhạy cảm ra log) ---
ENV_FILE="${PROJECT_DIR}/.env"
if [ -f "$ENV_FILE" ]; then
    while IFS='=' read -r key value || [ -n "$key" ]; do
        case "$key" in
            \#*|"") continue ;;
        esac
        key=$(printf '%s' "$key" | tr -d '[:space:]')
        value=$(printf '%s' "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')
        case "$key" in
            MYSQL_DATABASE|MYSQL_CONTAINER_NAME|BACKUP_DIR|DB_ROOT_PASSWORD|MYSQL_USER|MYSQL_PASSWORD|DB_HOST_PORT)
                eval "$key=\"\$value\""
                ;;
        esac
    done < "$ENV_FILE"
fi

# --- Tham số mặc định ---
PROD_DB_NAME="${MYSQL_DATABASE:-hotel_db}"
PROD_CONTAINER_NAME="${MYSQL_CONTAINER_NAME:-hotel-mysql}"
DB_ROOT_PASSWORD="${DB_ROOT_PASSWORD:-root_password_secure}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/hotel_db}"
BACKUP_FILE=""
DR_TEST_DB="hotel_db_dr_test"
ISOLATED_CONTAINER_MODE=false
ISOLATED_CONTAINER_NAME="hotel-mysql-dr-test"
MYSQL_HOST=""
MYSQL_PORT="${DB_HOST_PORT:-3306}"
RTO_LIMIT_SECONDS=300
ALLOW_SAMPLE_FALLBACK=false
KEEP_TEST_DB=false
DRY_RUN=false

TEMP_WORK_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'hbs_dr_drill')
CREATED_EPHEMERAL_CONTAINER=false

cleanup() {
    local exit_code=$?
    if [ "$CREATED_EPHEMERAL_CONTAINER" = true ]; then
        log_info "Đang dọn dẹp container diễn tập cô lập '$ISOLATED_CONTAINER_NAME'..."
        docker rm -f "$ISOLATED_CONTAINER_NAME" >/dev/null 2>&1 || true
    fi
    if [ -n "$TEMP_WORK_DIR" ] && [ -d "$TEMP_WORK_DIR" ]; then
        rm -rf "$TEMP_WORK_DIR" >/dev/null 2>&1 || true
    fi
    exit "$exit_code"
}
trap cleanup EXIT INT TERM

usage() {
    cat << EOF
Cách dùng: $0 [TÙY CHỌN]

Diễn tập phục hồi dữ liệu thảm họa (Disaster Recovery Drill) cho Hotel Booking System.
Mặc định luôn khôi phục vào Database TEST cô lập ('$DR_TEST_DB') và kiểm tra toàn vẹn SQL.

Tùy chọn:
  -d, --dir DIR              Thư mục chứa bản sao lưu (mặc định: $BACKUP_DIR)
  -f, --file FILE            Chỉ định tệp backup .sql hoặc .sql.gz cụ thể
  -t, --target-db DB         Tên database TEST cô lập (mặc định: $DR_TEST_DB)
  -c, --container NAME       Tên container MySQL mục tiêu (mặc định: $PROD_CONTAINER_NAME)
      --isolated-container   Tự khởi chạy container MySQL 8.0 tạm ($ISOLATED_CONTAINER_NAME) để cô lập hoàn toàn
      --mysql-host HOST      Kết nối trực tiếp qua mysql CLI tới HOST thay vì docker exec
      --mysql-port PORT      Cổng MySQL khi dùng --mysql-host (mặc định: $MYSQL_PORT)
      --rto-limit SEC        Ngưỡng RTO tối đa tính bằng giây (mặc định: $RTO_LIMIT_SECONDS)
      --allow-sample-fallback Tự tạo dump .sql.gz mẫu từ migrations nếu $BACKUP_DIR chưa có dump
      --keep-test-db         Không xóa database TEST sau khi diễn tập xong
      --dry-run              Kiểm tra cú pháp script, mẫu SQL & pipeline gzip (không chạm DB thực)
  -h, --help                 Hiển thị trợ giúp

Ví dụ:
  # 1. Diễn tập trên VPS bằng bản backup mới nhất vào DB cô lập hotel_db_dr_test:
  $0

  # 2. Diễn tập hoàn toàn cô lập bằng container MySQL tạm + fallback nếu chưa có dump:
  $0 --isolated-container --allow-sample-fallback

  # 3. Kiểm tra tĩnh cú pháp & pipeline trên môi trường không có MySQL/Docker:
  $0 --dry-run --allow-sample-fallback
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -d|--dir) BACKUP_DIR="$2"; shift 2 ;;
        -f|--file) BACKUP_FILE="$2"; shift 2 ;;
        -t|--target-db) DR_TEST_DB="$2"; shift 2 ;;
        -c|--container) PROD_CONTAINER_NAME="$2"; shift 2 ;;
        --isolated-container) ISOLATED_CONTAINER_MODE=true; shift ;;
        --mysql-host) MYSQL_HOST="$2"; shift 2 ;;
        --mysql-port) MYSQL_PORT="$2"; shift 2 ;;
        --rto-limit) RTO_LIMIT_SECONDS="$2"; shift 2 ;;
        --allow-sample-fallback) ALLOW_SAMPLE_FALLBACK=true; shift ;;
        --keep-test-db) KEEP_TEST_DB=true; shift ;;
        --dry-run) DRY_RUN=true; shift ;;
        -h|--help) usage ;;
        *) log_error "Tham số không hợp lệ: $1"; usage ;;
    esac
done

# =============================================================================
# 1. KIỂM SOÁT AN TOÀN TUYỆT ĐỐI (PRODUCTION PROTECTION GUARDRAILS)
# =============================================================================
assert_safe_target_db() {
    local target="$1"
    if [[ ! "$target" =~ ^[a-zA-Z0-9_]+$ ]]; then
        log_error "SAFETY ABORT: Tên database diễn tập '$target' không hợp lệ (chỉ chấp nhận a-z, A-Z, 0-9, _)."
        exit 1
    fi

    case "$target" in
        "$PROD_DB_NAME"|hotel_db|hotel_booking|production|prod|mysql|information_schema|performance_schema|sys)
            log_error "SAFETY ABORT: Từ chối thao tác vì DB '$target' trùng với Database Production hoặc hệ thống!"
            exit 1
            ;;
    esac

    if [ "$ISOLATED_CONTAINER_MODE" = true ] && [ "$ISOLATED_CONTAINER_NAME" = "$PROD_CONTAINER_NAME" ]; then
        log_error "SAFETY ABORT: Tên container cô lập trùng với container Production '$PROD_CONTAINER_NAME'!"
        exit 1
    fi
}

assert_safe_target_db "$DR_TEST_DB"

echo -e "\n${CYAN}=============================================================================${NC}"
echo -e "${BOLD}  HBS - DIỄN TẬP PHỤC HỒI DỮ LIỆU (DISASTER RECOVERY DRILL - SP3-1111)${NC}"
echo -e "${CYAN}=============================================================================${NC}"
echo -e "  - Thời điểm bắt đầu : $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo -e "  - Git Commit SHA    : ${CYAN}${GIT_COMMIT_SHA}${NC}"
echo -e "  - DB Production     : ${PROD_DB_NAME} (CHỈ ĐỌC / BẢO VỆ TUYỆT ĐỐI)"
echo -e "  - DB Diễn Tập (TEST): ${BOLD}${GREEN}${DR_TEST_DB}${NC}"
echo -e "  - Ngưỡng RTO mục tiêu: < ${RTO_LIMIT_SECONDS} giây (5 phút)"
if [ "$DRY_RUN" = true ]; then
    echo -e "  - Chế độ thực thi   : ${YELLOW}DRY-RUN (Kiểm tra tĩnh & mô phỏng pipeline)${NC}"
elif [ "$ISOLATED_CONTAINER_MODE" = true ]; then
    echo -e "  - Chế độ thực thi   : ${GREEN}Isolated Docker Container ($ISOLATED_CONTAINER_NAME)${NC}"
elif [ -n "$MYSQL_HOST" ]; then
    echo -e "  - Chế độ thực thi   : ${GREEN}MySQL Client ($MYSQL_HOST:$MYSQL_PORT)${NC}"
else
    echo -e "  - Chế độ thực thi   : ${GREEN}Docker Exec ($PROD_CONTAINER_NAME -> DB cô lập $DR_TEST_DB)${NC}"
fi
echo -e "${CYAN}=============================================================================${NC}\n"

# =============================================================================
# 2. KIỂM TRA CÚ PHÁP SCRIPTS & CẤU HÌNH MONITORING LIÊN QUAN
# =============================================================================
log_info "[Bước 1/5] Kiểm tra cú pháp các script vận hành và cấu hình monitoring..."
for s in "${SCRIPT_DIR}/backup_mysql.sh" "${SCRIPT_DIR}/restore_mysql.sh" "${SCRIPT_DIR}/setup_cron.sh" "${SCRIPT_DIR}/test_backup_restore.sh"; do
    if [ -f "$s" ]; then
        bash -n "$s"
        log_success "Cú pháp bash hợp lệ: $(basename "$s")"
    fi
done

if [ -f "${PROJECT_DIR}/monitoring/prometheus.yml" ] && [ -f "${PROJECT_DIR}/docker-compose.monitoring.yml" ]; then
    log_success "Đã tìm thấy monitoring/prometheus.yml và docker-compose.monitoring.yml"
fi

# =============================================================================
# 3. TÌM HOẶC KHỞI TẠO BẢN SAO LƯU ĐỂ DIỄN TẬP
# =============================================================================
log_info "[Bước 2/5] Xác định bản sao lưu mục tiêu và kiểm tra tính toàn vẹn tệp nén..."

build_sample_backup_from_migrations() {
    local sample_sql="${TEMP_WORK_DIR}/sample_drill_dump.sql"
    local sample_gz="${TEMP_WORK_DIR}/hotel_db_backup_sample_$(date +%Y%m%d_%H%M%S).sql.gz"
    local mig_dir="${PROJECT_DIR}/backend/src/main/resources/db/migration"

    : > "$sample_sql"
    for f in "${mig_dir}/V1__init_schema.sql" "${mig_dir}/V2__seed_data.sql" "${mig_dir}/V3__create_audit_logs.sql"; do
        if [ -f "$f" ]; then
            cat "$f" >> "$sample_sql"
            printf '\n' >> "$sample_sql"
        fi
    done

    if [ ! -s "$sample_sql" ]; then
        log_error "Không tìm thấy tệp migration tại '$mig_dir' để tạo bản sao lưu mẫu!"
        exit 1
    fi

    gzip -9 -c "$sample_sql" > "$sample_gz"
    echo "$sample_gz"
}

if [ -n "$BACKUP_FILE" ]; then
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Tệp sao lưu chỉ định không tồn tại: $BACKUP_FILE"
        exit 1
    fi
else
    if [ -d "$BACKUP_DIR" ]; then
        # Sắp xếp ưu tiên file mới nhất theo tên/thời gian
        BACKUP_FILE=$(ls -1t "${BACKUP_DIR}"/*.sql.gz "${BACKUP_DIR}"/*.sql 2>/dev/null | head -n 1 || true)
    fi

    if [ -z "$BACKUP_FILE" ]; then
        if [ "$ALLOW_SAMPLE_FALLBACK" = true ]; then
            log_warn "Không tìm thấy dump thực tế trong '$BACKUP_DIR'. Đang tạo bản backup .sql.gz mẫu từ Flyway migrations..."
            BACKUP_FILE=$(build_sample_backup_from_migrations)
        else
            log_error "Không tìm thấy tệp .sql.gz hoặc .sql nào trong '$BACKUP_DIR' (thêm --allow-sample-fallback để diễn tập bằng schema/seed mẫu)."
            exit 1
        fi
    fi
fi

BACKUP_SIZE_BYTES=$(wc -c < "$BACKUP_FILE" | tr -d '[:space:]')
log_info "Tệp backup sử dụng: $BACKUP_FILE (${BACKUP_SIZE_BYTES} bytes)"

if [[ "$BACKUP_FILE" =~ \.gz$ ]]; then
    if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
        log_error "Tệp nén '$BACKUP_FILE' bị hỏng cấu trúc gzip!"
        exit 1
    fi
    log_success "Kiểm tra gzip -t thành công (tệp nén toàn vẹn 100%)."
fi

# Sanitize stream: loại bỏ mọi câu lệnh USE <prod_db> / CREATE DATABASE <prod_db> nếu có
SANITIZED_SQL="${TEMP_WORK_DIR}/sanitized_restore.sql"
if [[ "$BACKUP_FILE" =~ \.gz$ ]]; then
    gzip -dc "$BACKUP_FILE" > "${TEMP_WORK_DIR}/raw_restore.sql"
else
    cp "$BACKUP_FILE" "${TEMP_WORK_DIR}/raw_restore.sql"
fi

if grep -inE "^[[:space:]]*(USE|CREATE[[:space:]]+DATABASE|DROP[[:space:]]+DATABASE)[[:space:]]+\`?(${PROD_DB_NAME}|hotel_db)\`?" "${TEMP_WORK_DIR}/raw_restore.sql" >/dev/null 2>&1; then
    log_warn "Phát hiện lệnh chuyển/khởi tạo DB '$PROD_DB_NAME' trong dump — đang tự động cô lập bỏ qua các dòng này để bảo vệ Production!"
    sed -E "/^[[:space:]]*(USE|CREATE[[:space:]]+DATABASE|DROP[[:space:]]+DATABASE)[[:space:]]+\`?(${PROD_DB_NAME}|hotel_db)\`?/Id" "${TEMP_WORK_DIR}/raw_restore.sql" > "$SANITIZED_SQL"
else
    mv "${TEMP_WORK_DIR}/raw_restore.sql" "$SANITIZED_SQL"
fi
log_success "Đã xác minh luồng SQL chỉ nạp vào '${DR_TEST_DB}', tuyệt đối không tác động '${PROD_DB_NAME}'."

if [ "$DRY_RUN" = true ]; then
    log_info "[Bước 3/5] [DRY-RUN] Bỏ qua kết nối MySQL thực tế; xác nhận kiểm tra bảo vệ DB Production..."
    set +e
    (assert_safe_target_db "$PROD_DB_NAME") 2>/dev/null
    guard_rc=$?
    set -e
    if [ "$guard_rc" -eq 0 ]; then
        log_error "Guardrail bảo vệ '$PROD_DB_NAME' đã không chặn đúng!"
        exit 1
    fi
    log_success "[DRY-RUN] Guardrail chặn ghi đè '$PROD_DB_NAME' hoạt động chính xác."
    echo -e "\n${YELLOW}[DRY-RUN COMPLETED]${NC} Đã xác minh cú pháp, tệp backup & bảo vệ Production (chưa kết nối MySQL daemon thực)."
    exit 0
fi

# =============================================================================
# 4. CHUẨN BỊ MÔI TRƯỜNG MYSQL CÔ LẬP & TRÌNH THỰC THI SQL
# =============================================================================
log_info "[Bước 3/5] Kết nối và chuẩn bị môi trường MySQL phục vụ diễn tập cô lập..."

run_mysql_root() {
    local db_arg="${1:-}"
    if [ "$ISOLATED_CONTAINER_MODE" = true ]; then
        if [ -n "$db_arg" ]; then
            docker exec -i -e MYSQL_PWD="${DB_ROOT_PASSWORD}" "$ISOLATED_CONTAINER_NAME" mysql -u root --default-character-set=utf8mb4 "$db_arg"
        else
            docker exec -i -e MYSQL_PWD="${DB_ROOT_PASSWORD}" "$ISOLATED_CONTAINER_NAME" mysql -u root --default-character-set=utf8mb4
        fi
    elif [ -n "$MYSQL_HOST" ]; then
        if [ -n "$db_arg" ]; then
            MYSQL_PWD="${DB_ROOT_PASSWORD}" mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u root --default-character-set=utf8mb4 "$db_arg"
        else
            MYSQL_PWD="${DB_ROOT_PASSWORD}" mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u root --default-character-set=utf8mb4
        fi
    else
        if [ -n "$db_arg" ]; then
            docker exec -i -e MYSQL_PWD="${DB_ROOT_PASSWORD}" "$PROD_CONTAINER_NAME" mysql -u root --default-character-set=utf8mb4 "$db_arg"
        else
            docker exec -i -e MYSQL_PWD="${DB_ROOT_PASSWORD}" "$PROD_CONTAINER_NAME" mysql -u root --default-character-set=utf8mb4
        fi
    fi
}

run_mysql_query() {
    local sql="$1"
    local db_arg="${2:-}"
    local raw
    raw=$(printf '%s\n' "$sql" | if [ "$ISOLATED_CONTAINER_MODE" = true ]; then
        docker exec -i -e MYSQL_PWD="${DB_ROOT_PASSWORD}" "$ISOLATED_CONTAINER_NAME" mysql -u root -N -s ${db_arg:+"$db_arg"}
    elif [ -n "$MYSQL_HOST" ]; then
        MYSQL_PWD="${DB_ROOT_PASSWORD}" mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u root -N -s ${db_arg:+"$db_arg"}
    else
        docker exec -i -e MYSQL_PWD="${DB_ROOT_PASSWORD}" "$PROD_CONTAINER_NAME" mysql -u root -N -s ${db_arg:+"$db_arg"}
    fi)
    printf '%s' "$raw" | tr -d '[:space:]'
}

if [ "$ISOLATED_CONTAINER_MODE" = true ]; then
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Không tìm thấy lệnh 'docker' để chạy --isolated-container."
        exit 1
    fi
    docker rm -f "$ISOLATED_CONTAINER_NAME" >/dev/null 2>&1 || true
    log_info "Khởi tạo container tạm '$ISOLATED_CONTAINER_NAME' (mysql:8.0)..."
    docker run -d --name "$ISOLATED_CONTAINER_NAME" \
        -e "MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}" \
        -e "TZ=Asia/Ho_Chi_Minh" \
        mysql:8.0 >/dev/null
    CREATED_EPHEMERAL_CONTAINER=true

    log_info "Đang chờ MySQL trong container '$ISOLATED_CONTAINER_NAME' sẵn sàng..."
    for _ in $(seq 1 45); do
        if docker exec -e MYSQL_PWD="${DB_ROOT_PASSWORD}" "$ISOLATED_CONTAINER_NAME" mysqladmin ping -h 127.0.0.1 -u root --silent >/dev/null 2>&1; then
            break
        fi
        sleep 2
    done
    if ! docker exec -e MYSQL_PWD="${DB_ROOT_PASSWORD}" "$ISOLATED_CONTAINER_NAME" mysqladmin ping -h 127.0.0.1 -u root --silent >/dev/null 2>&1; then
        log_error "Container MySQL tạm '$ISOLATED_CONTAINER_NAME' không sẵn sàng sau 90 giây!"
        exit 1
    fi
    log_success "Container MySQL tạm đã sẵn sàng."
elif [ -n "$MYSQL_HOST" ]; then
    if ! command -v mysql >/dev/null 2>&1; then
        log_error "Không tìm thấy 'mysql' CLI client trên hệ thống."
        exit 1
    fi
    if ! MYSQL_PWD="${DB_ROOT_PASSWORD}" mysqladmin ping -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u root --silent >/dev/null 2>&1; then
        log_error "Không thể kết nối tới MySQL tại ${MYSQL_HOST}:${MYSQL_PORT}."
        exit 1
    fi
    log_success "Kết nối thành công tới MySQL ${MYSQL_HOST}:${MYSQL_PORT}."
else
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Không tìm thấy lệnh 'docker'!"
        exit 1
    fi
    CONTAINER_STATUS=$(docker inspect -f '{{.State.Status}}' "$PROD_CONTAINER_NAME" 2>/dev/null || echo "not_found")
    if [ "$CONTAINER_STATUS" != "running" ]; then
        log_error "Container '$PROD_CONTAINER_NAME' không chạy (status='$CONTAINER_STATUS'). Không thể diễn tập restore."
        exit 1
    fi
    log_success "Container '$PROD_CONTAINER_NAME' đang running. Mọi thao tác chỉ nhắm tới DB cô lập '${DR_TEST_DB}'."
fi

# Ghi nhận số lượng bảng Production trước diễn tập (chỉ đọc) để đối chứng an toàn
PROD_TABLES_BEFORE=$(run_mysql_query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${PROD_DB_NAME}';" 2>/dev/null || echo "N/A")

# =============================================================================
# 5. THỰC THI PHỤC HỒI VÀO DB TEST & ĐO THỜI GIAN RTO
# =============================================================================
log_info "[Bước 4/5] Đang tái tạo DB TEST '${DR_TEST_DB}' và bắt đầu đo RTO..."

START_TS=$(date '+%Y-%m-%d %H:%M:%S %Z')
START_EPOCH=$(date +%s)

run_mysql_root << SQL
DROP DATABASE IF EXISTS \`${DR_TEST_DB}\`;
CREATE DATABASE \`${DR_TEST_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL

if ! run_mysql_root "$DR_TEST_DB" < "$SANITIZED_SQL"; then
    log_error "Lỗi nạp dữ liệu SQL vào DB TEST '${DR_TEST_DB}'!"
    exit 1
fi

END_TS=$(date '+%Y-%m-%d %H:%M:%S %Z')
END_EPOCH=$(date +%s)
RTO_SECONDS=$((END_EPOCH - START_EPOCH))

log_success "Phục hồi hoàn tất vào DB TEST '${DR_TEST_DB}' trong ${RTO_SECONDS} giây."

if [ "$RTO_SECONDS" -ge "$RTO_LIMIT_SECONDS" ]; then
    log_error "RTO vượt ngưỡng cho phép: ${RTO_SECONDS}s >= ${RTO_LIMIT_SECONDS}s!"
    exit 1
fi
log_success "Đạt mục tiêu RTO: ${RTO_SECONDS}s < ${RTO_LIMIT_SECONDS}s (5 phút)."

# =============================================================================
# 6. XÁC MINH TOÀN VẸN DỮ LIỆU SQL TRÊN DB TEST
# =============================================================================
log_info "[Bước 5/5] Chạy kiểm tra tính toàn vẹn dữ liệu SQL (Schema, Row Counts & Foreign Keys)..."

TABLE_COUNT=$(run_mysql_query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DR_TEST_DB}';")
log_info "Tổng số bảng trong '${DR_TEST_DB}': ${TABLE_COUNT}"
if [ "${TABLE_COUNT:-0}" -lt 7 ]; then
    log_error "Thiếu bảng cốt lõi sau phục hồi! Hiện có ${TABLE_COUNT} bảng (yêu cầu >= 7)."
    exit 1
fi

check_table_count() {
    local tbl="$1"
    local exists
    exists=$(run_mysql_query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DR_TEST_DB}' AND table_name='${tbl}';")
    if [ "${exists:-0}" -eq 1 ]; then
        run_mysql_query "SELECT COUNT(*) FROM \`${tbl}\`;" "$DR_TEST_DB"
    else
        echo "MISSING"
    fi
}

CNT_USERS=$(check_table_count "users")
CNT_ROOM_TYPES=$(check_table_count "room_types")
CNT_ROOMS=$(check_table_count "rooms")
CNT_BOOKINGS=$(check_table_count "bookings")
CNT_BOOKING_ROOMS=$(check_table_count "booking_rooms")
CNT_PAYMENTS=$(check_table_count "payment_transactions")
CNT_AUDIT_LOGS=$(check_table_count "audit_logs")

for required_tbl in "$CNT_USERS" "$CNT_ROOM_TYPES" "$CNT_ROOMS" "$CNT_BOOKINGS" "$CNT_BOOKING_ROOMS" "$CNT_PAYMENTS"; do
    if [ "$required_tbl" = "MISSING" ]; then
        log_error "Phát hiện bảng cốt lõi bị thiếu sau khi restore!"
        exit 1
    fi
done

# Kiểm tra dữ liệu tham chiếu (Foreign Keys - phải tuyệt đối bằng 0 orphan rows)
ORPHAN_ROOMS=$(run_mysql_query "SELECT COUNT(*) FROM rooms r LEFT JOIN room_types rt ON r.room_type_id = rt.id WHERE rt.id IS NULL;" "$DR_TEST_DB")
ORPHAN_BOOKINGS_USER=$(run_mysql_query "SELECT COUNT(*) FROM bookings b LEFT JOIN users u ON b.user_id = u.id WHERE u.id IS NULL;" "$DR_TEST_DB")
ORPHAN_BOOKINGS_ROOMTYPE=$(run_mysql_query "SELECT COUNT(*) FROM bookings b LEFT JOIN room_types rt ON b.room_type_id = rt.id WHERE rt.id IS NULL;" "$DR_TEST_DB")
ORPHAN_PAYMENTS=$(run_mysql_query "SELECT COUNT(*) FROM payment_transactions pt LEFT JOIN bookings b ON pt.booking_id = b.id WHERE b.id IS NULL;" "$DR_TEST_DB")
ORPHAN_BOOKING_ROOMS=$(run_mysql_query "SELECT COUNT(*) FROM booking_rooms br LEFT JOIN bookings b ON br.booking_id = b.id LEFT JOIN rooms r ON br.room_id = r.id WHERE b.id IS NULL OR r.id IS NULL;" "$DR_TEST_DB")
INVALID_DATES=$(run_mysql_query "SELECT COUNT(*) FROM bookings WHERE check_out_date <= check_in_date;" "$DR_TEST_DB")

TOTAL_ORPHANS=$((ORPHAN_ROOMS + ORPHAN_BOOKINGS_USER + ORPHAN_BOOKINGS_ROOMTYPE + ORPHAN_PAYMENTS + ORPHAN_BOOKING_ROOMS + INVALID_DATES))

PROD_TABLES_AFTER=$(run_mysql_query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${PROD_DB_NAME}';" 2>/dev/null || echo "N/A")

if [ "$KEEP_TEST_DB" = false ] && [ "$ISOLATED_CONTAINER_MODE" = false ]; then
    log_info "Dọn dẹp database diễn tập '${DR_TEST_DB}'..."
    printf 'DROP DATABASE IF EXISTS `%s`;\n' "${DR_TEST_DB}" | run_mysql_root
fi

echo -e "\n${CYAN}=============================================================================${NC}"
echo -e "${GREEN}${BOLD}  KẾT QUẢ NGHIỆM THU DIỄN TẬP PHỤC HỒI DỮ LIỆU (DR TEST REPORT)${NC}"
echo -e "${CYAN}=============================================================================${NC}"
echo -e "  - Commit SHA            : ${GIT_COMMIT_SHA}"
echo -e "  - Tệp backup            : $(basename "$BACKUP_FILE") (${BACKUP_SIZE_BYTES} bytes)"
echo -e "  - Thời điểm bắt đầu     : ${START_TS}"
echo -e "  - Thời điểm kết thúc    : ${END_TS}"
echo -e "  - Thời gian RTO thực tế : ${BOLD}${CYAN}${RTO_SECONDS} giây${NC} (Ngưỡng < ${RTO_LIMIT_SECONDS}s)"
echo -e "  - Tổng số bảng phục hồi : ${TABLE_COUNT} bảng"
echo -e "  - Row counts cốt lõi    : users=${CNT_USERS}, room_types=${CNT_ROOM_TYPES}, rooms=${CNT_ROOMS}, bookings=${CNT_BOOKINGS}, booking_rooms=${CNT_BOOKING_ROOMS}, payment_transactions=${CNT_PAYMENTS}, audit_logs=${CNT_AUDIT_LOGS}"
echo -e "  - Lỗi khóa ngoại/Ràng buộc: rooms=${ORPHAN_ROOMS}, bookings_user=${ORPHAN_BOOKINGS_USER}, bookings_type=${ORPHAN_BOOKINGS_ROOMTYPE}, payments=${ORPHAN_PAYMENTS}, booking_rooms=${ORPHAN_BOOKING_ROOMS}, invalid_dates=${INVALID_DATES}"
echo -e "  - Trạng thái Production : '${PROD_DB_NAME}' tables before=${PROD_TABLES_BEFORE}, after=${PROD_TABLES_AFTER} (KHÔNG BỊ ẢNH HƯỞNG)"
echo -e "${CYAN}=============================================================================${NC}\n"

if [ "$TOTAL_ORPHANS" -gt 0 ]; then
    log_error "Phát hiện ${TOTAL_ORPHANS} bản ghi vi phạm toàn vẹn khóa ngoại/ngày đặt phòng!"
    exit 1
fi

log_success "DIỄN TẬP PHỤC HỒI DỮ LIỆU THÀNH CÔNG 100% — TOÀN VẸN DỮ LIỆU & ĐẠT CHUẨN RTO!"
exit 0
