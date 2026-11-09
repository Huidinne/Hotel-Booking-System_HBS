package org.example.backend.chat.tools;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Map;

/**
 * Dispatcher điều phối và kiểm soát bảo mật các lệnh gọi Tool từ AI theo task [SP2-CHAT-TOOLS-01]:
 * - Kiểm tra danh sách Allowlist (Chỉ cho phép 4 tool an toàn).
 * - Chặn đứng các tool nguy hiểm (confirmBooking, pay, cancel, sql, refund...).
 * - Validate tham số đầu vào và chuyển đổi kiểu dữ liệu an toàn.
 * - Lấy thông tin khách hàng từ Security Context, không cho phép model tự tiêm customerId.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ChatToolDispatcher {

    private final ChatToolAdapterService toolAdapterService;

    public ToolCallResult dispatch(String toolName, Map<String, Object> arguments, Authentication authentication, String sessionId) {
        log.info("[ChatToolDispatcher] Nhận yêu cầu gọi tool: [{}], args: {}", toolName, arguments);

        if (toolName == null || toolName.isBlank()) {
            return ToolCallResult.error("unknown", "Tên tool không được để trống.");
        }

        String normalizedName = toolName.trim();

        // 1. Kiểm tra Allowlist
        if (!ChatToolNames.isAllowed(normalizedName)) {
            log.warn("[ChatToolDispatcher] Phát hiện yêu cầu gọi tool KHÔNG nằm trong allowlist: [{}]", normalizedName);
            return ToolCallResult.error(normalizedName,
                    "Từ chối thực thi: Tool '" + normalizedName + "' không được phép gọi. Chatbot chỉ có quyền tra cứu phòng, xem chi tiết, báo giá và chuẩn bị bản nháp.");
        }

        Map<String, Object> args = (arguments != null) ? arguments : Map.of();

        try {
            switch (normalizedName) {
                case ChatToolNames.SEARCH_AVAILABLE_ROOMS:
                    return handleSearchAvailableRooms(args);

                case ChatToolNames.GET_ROOM_TYPE_DETAILS:
                    return handleGetRoomTypeDetails(args);

                case ChatToolNames.GET_BOOKING_QUOTE:
                    return handleGetBookingQuote(args);

                case ChatToolNames.PREPARE_BOOKING:
                    return handlePrepareBooking(args, authentication, sessionId);

                case ChatToolNames.GET_ALL_ROOM_TYPES:
                    return toolAdapterService.getAllRoomTypes();

                default:
                    return ToolCallResult.error(normalizedName, "Tool chưa được hỗ trợ xử lý.");
            }
        } catch (DateTimeParseException e) {
            log.warn("[ChatToolDispatcher] Lỗi định dạng ngày khi gọi tool [{}]: {}", normalizedName, e.getMessage());
            return ToolCallResult.error(normalizedName, "Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng chuẩn YYYY-MM-DD (Ví dụ: 2026-11-15).");
        } catch (Exception e) {
            log.error("[ChatToolDispatcher] Lỗi ngoại lệ khi thực thi tool [{}]: {}", normalizedName, e.getMessage(), e);
            return ToolCallResult.error(normalizedName, "Lỗi thực thi tool: " + e.getMessage());
        }
    }

    private ToolCallResult handleSearchAvailableRooms(Map<String, Object> args) {
        LocalDate checkIn = parseLocalDate(args.get("checkIn"));
        LocalDate checkOut = parseLocalDate(args.get("checkOut"));
        Integer guests = parseInteger(args.get("guests"), 2);
        Long roomTypeId = parseLong(args.get("roomTypeId"));

        return toolAdapterService.searchAvailableRooms(checkIn, checkOut, guests, roomTypeId);
    }

    private ToolCallResult handleGetRoomTypeDetails(Map<String, Object> args) {
        Long roomTypeId = parseLong(args.get("roomTypeId"));
        return toolAdapterService.getRoomTypeDetails(roomTypeId);
    }

    private ToolCallResult handleGetBookingQuote(Map<String, Object> args) {
        Long roomTypeId = parseLong(args.get("roomTypeId"));
        LocalDate checkIn = parseLocalDate(args.get("checkIn"));
        LocalDate checkOut = parseLocalDate(args.get("checkOut"));
        Integer guests = parseInteger(args.get("guests"), null);
        Integer quantity = parseInteger(args.get("quantity"), 1);

        return toolAdapterService.getBookingQuote(roomTypeId, checkIn, checkOut, guests, quantity);
    }

    private ToolCallResult handlePrepareBooking(Map<String, Object> args, Authentication authentication, String sessionId) {
        String quoteId = parseString(args.get("quoteId"));
        String specialRequests = parseString(args.get("specialRequests"));

        return toolAdapterService.prepareBooking(quoteId, specialRequests, authentication, sessionId);
    }

    // ────────────────────────────────────────────────────────────────
    // TIỆN ÍCH PARSE THAM SỐ AN TOÀN
    // ────────────────────────────────────────────────────────────────

    private LocalDate parseLocalDate(Object val) {
        if (val == null) return null;
        if (val instanceof LocalDate ld) return ld;
        String s = val.toString().trim();
        if (s.isEmpty()) return null;
        return LocalDate.parse(s);
    }

    private Integer parseInteger(Object val, Integer defaultValue) {
        if (val == null) return defaultValue;
        if (val instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(val.toString().trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private Long parseLong(Object val) {
        if (val == null) return null;
        if (val instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(val.toString().trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String parseString(Object val) {
        return (val != null) ? val.toString().trim() : null;
    }
}

