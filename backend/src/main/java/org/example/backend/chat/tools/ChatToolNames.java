package org.example.backend.chat.tools;

import java.util.Set;

/**
 * Danh sách allowlist các tool được phép cho AI gọi theo task [SP2-CHAT-TOOLS-01]:
 * 1. searchAvailableRooms: Tra loại phòng / phòng trống theo ngày và sức chứa
 * 2. getRoomTypeDetails: Lấy mô tả, tiện nghi, sức chứa công khai của loại phòng
 * 3. getBookingQuote: Tính số đêm, tổng tiền và cọc 50% theo quy tắc hiện hành (không giữ phòng)
 * 4. prepareBooking: Tạo bản nháp gắn với tài khoản đăng nhập (chưa tạo booking, chưa giữ phòng)
 *
 * TUYỆT ĐỐI KHÔNG CUNG CẤP CÁC TOOL:
 * - confirmBooking, createBooking (chỉ khách hàng mới có quyền bấm xác nhận qua UI)
 * - payBooking, processPayment, refundDeposit
 * - checkIn, checkOut, cancelBooking
 * - updateRoomPrice, updateDatabase, executeSql
 */
public final class ChatToolNames {

    private ChatToolNames() {}

    public static final String SEARCH_AVAILABLE_ROOMS = "searchAvailableRooms";
    public static final String GET_ROOM_TYPE_DETAILS = "getRoomTypeDetails";
    public static final String GET_BOOKING_QUOTE = "getBookingQuote";
    public static final String PREPARE_BOOKING = "prepareBooking";

    public static final Set<String> ALLOWED_TOOLS = Set.of(
            SEARCH_AVAILABLE_ROOMS,
            GET_ROOM_TYPE_DETAILS,
            GET_BOOKING_QUOTE,
            PREPARE_BOOKING
    );

    public static boolean isAllowed(String toolName) {
        return toolName != null && ALLOWED_TOOLS.contains(toolName.trim());
    }
}

