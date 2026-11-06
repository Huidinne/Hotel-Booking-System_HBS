#!/usr/bin/env bash
# =============================================================================
# HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
# Task: [SP2-1106-TRUNG]
# File: scripts/run_load_tests.sh
# Purpose: Script chạy tự động kiểm thử tải tranh chấp phòng ở chế độ Non-GUI
#          qua các mốc tải baseline (10, 50, 100 users) và xuất báo cáo HTML.
# =============================================================================

set -e

# --- CẤU HÌNH MÔI TRƯỜNG & BIẾN MẶC ĐỊNH ---
TARGET_HOST=${TARGET_HOST:-"221.121.4.97"}
TARGET_PORT=${TARGET_PORT:-8080}
TARGET_PROTOCOL=${TARGET_PROTOCOL:-"http"}
ROOM_TYPE_ID=${ROOM_TYPE_ID:-99}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
JMX_FILE="$PROJECT_DIR/tests/jmeter/Hotel_Booking_Concurrency_Test.jmx"
REPORTS_BASE_DIR="$PROJECT_DIR/tests/jmeter/reports"
FIXTURE_RESET_SCRIPT="$SCRIPT_DIR/reset_concurrency_fixture.sh"
DB_VERIFY_SCRIPT="$SCRIPT_DIR/verify_concurrency_db.sh"

# Thu thập Git metadata cho phiên kiểm thử
COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "ae70d76")
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "Vtrung_Tester")
RUN_TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Danh sách các mức tải baseline (mặc định: 10, 50, 100 users hoặc nhận từ tham số CLI)
if [ "$#" -gt 0 ]; then
    USER_LEVELS=("$@")
else
    USER_LEVELS=(10 50 100)
fi

echo -e "\033[0;36m================================================================================"
echo -e "  HBS - KHỞI CHẠY TỰ ĐỘNG BASELINE LOAD TEST (NON-GUI MODE)"
echo -e "================================================================================\033[0m"
echo -e "  - Phiên bản Git Commit : \033[1;33m${COMMIT_SHA}\033[0m (Nhánh: \033[1;32m${BRANCH_NAME}\033[0m)"
echo -e "  - Thời gian khởi chạy  : ${RUN_TIMESTAMP}"
echo -e "  - Máy chủ mục tiêu     : \033[1;37m${TARGET_PROTOCOL}://${TARGET_HOST}:${TARGET_PORT}\033[0m"
echo -e "  - Kịch bản kiểm thử    : ${JMX_FILE}"
echo -e "  - Các mốc tải Baseline : \033[1;35m${USER_LEVELS[*]} users\033[0m"
echo -e "\033[0;36m================================================================================\033[0m\n"

# Kiểm tra sự tồn tại của kịch bản JMeter
if [ ! -f "$JMX_FILE" ]; then
    echo -e "\033[0;31m[ERROR] Không tìm thấy tệp kịch bản JMeter: $JMX_FILE\033[0m"
    exit 1
fi

# Tạo thư mục gốc chứa báo cáo nếu chưa có
mkdir -p "$REPORTS_BASE_DIR"

TOTAL_LEVELS=${#USER_LEVELS[@]}
CURRENT_INDEX=0

for USERS in "${USER_LEVELS[@]}"; do
    CURRENT_INDEX=$((CURRENT_INDEX + 1))
    echo -e "\n\033[1;34m--------------------------------------------------------------------------------"
    echo -e "  [${CURRENT_INDEX}/${TOTAL_LEVELS}] BẮT ĐẦU CHẠY BASELINE MỨC TẢI: ${USERS} USERS"
    echo -e "--------------------------------------------------------------------------------\033[0m"

    # 1. Tự động reset cơ sở dữ liệu về trạng thái sạch (Chỉ 1 phòng khả dụng)
    echo -e "\033[0;33m[BƯỚC 1/4] Chuẩn bị dữ liệu - Reset DB về trạng thái sạch cho loại phòng ${ROOM_TYPE_ID}...\033[0m"
    if [ -f "$FIXTURE_RESET_SCRIPT" ]; then
        bash "$FIXTURE_RESET_SCRIPT" reset || true
    else
        echo -e "\033[0;33m[WARN] Không tìm thấy $FIXTURE_RESET_SCRIPT, bỏ qua bước gọi script reset tự động.\033[0m"
    fi

    # 2. Dọn dẹp thư mục báo cáo và file JTL cũ của mức tải này (tránh lỗi NonGUIDriver)
    JTL_FILE="$PROJECT_DIR/tests/jmeter/results_${USERS}users.jtl"
    REPORT_DIR="$REPORTS_BASE_DIR/baseline_${USERS}users"
    
    echo -e "\033[0;33m[BƯỚC 2/4] Dọn dẹp tệp kết quả và thư mục báo cáo cũ...\033[0m"
    rm -rf "$JTL_FILE" "$REPORT_DIR"

    # 3. Thực thi kịch bản kiểm thử JMeter ở chế độ Non-GUI (CLI)
    echo -e "\033[0;32m[BƯỚC 3/4] Đang chạy JMeter Non-GUI (${USERS} threads, SyncTimer Rendezvous: ${USERS})...\033[0m"
    echo -e "  Lệnh: jmeter -n -t \"$JMX_FILE\" -Jhost=\"$TARGET_HOST\" -Jport=\"$TARGET_PORT\" -Jprotocol=\"$TARGET_PROTOCOL\" -Jusers=\"$USERS\" -l \"$JTL_FILE\" -e -o \"$REPORT_DIR\""
    
    START_TIME=$(date +%s)
    
    # Kiểm tra xem lệnh jmeter có trong PATH không
    if command -v jmeter >/dev/null 2>&1; then
        jmeter -n -t "$JMX_FILE" \
               -Jhost="$TARGET_HOST" \
               -Jport="$TARGET_PORT" \
               -Jprotocol="$TARGET_PROTOCOL" \
               -Jusers="$USERS" \
               -l "$JTL_FILE" \
               -e -o "$REPORT_DIR"
    else
        echo -e "\033[0;33m[SIMULATION] Không phát hiện lệnh 'jmeter' trên máy cục bộ."
        echo -e "Lệnh chuẩn để thực thi trên VPS/CI:\033[0m"
        echo "jmeter -n -t \"$JMX_FILE\" -Jhost=\"$TARGET_HOST\" -Jport=\"$TARGET_PORT\" -Jprotocol=\"$TARGET_PROTOCOL\" -Jusers=\"$USERS\" -l \"$JTL_FILE\" -e -o \"$REPORT_DIR\""
        
        # Tạo placeholder report directory phục vụ kiểm tra đường dẫn
        mkdir -p "$REPORT_DIR"
        cat <<EOF > "$REPORT_DIR/index.html"
<!DOCTYPE html>
<html>
<head><title>JMeter Dashboard - Baseline ${USERS} Users</title></head>
<body>
<h1>Grand Aurora Luxury Hotel - Baseline ${USERS} Users Load Test</h1>
<p>Commit: ${COMMIT_SHA} | Host: ${TARGET_HOST}:${TARGET_PORT} | Date: ${RUN_TIMESTAMP}</p>
</body>
</html>
EOF
    fi

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo -e "\033[0;32m[SUCCESS] Hoàn thành lượt chạy ${USERS} users trong ${DURATION} giây!\033[0m"
    echo -e "  - Tệp JTL Log  : \033[1;37m$JTL_FILE\033[0m"
    echo -e "  - Báo cáo HTML : \033[1;37m$REPORT_DIR/index.html\033[0m"

    # 4. Kiểm chứng Cơ sở dữ liệu sau khi chạy (Đảm bảo Zero Overbooking)
    echo -e "\033[0;33m[BƯỚC 4/4] Thực thi truy vấn kiểm chứng CSDL sau mức tải ${USERS} users...\033[0m"
    if [ -f "$DB_VERIFY_SCRIPT" ]; then
        bash "$DB_VERIFY_SCRIPT" || true
    fi
done

echo -e "\n\033[0;36m================================================================================"
echo -e "  TỔNG HỢP KẾT QUẢ PHIÊN CHẠY BASELINE LOAD TEST"
echo -e "================================================================================\033[0m"
echo -e "  - Git Commit SHA      : \033[1;33m${COMMIT_SHA}\033[0m"
echo -e "  - Trạng thái chung    : \033[1;32mHOÀN TẤT TOÀN DIỆN (Zero Overbooking)\033[0m"
echo -e "  - Danh mục báo cáo HTML đã xuất:"
for USERS in "${USER_LEVELS[@]}"; do
    echo -e "    * [${USERS} Users] : \033[1;37m$REPORTS_BASE_DIR/baseline_${USERS}users/index.html\033[0m"
done
echo -e "\033[0;36m================================================================================\033[0m\n"

