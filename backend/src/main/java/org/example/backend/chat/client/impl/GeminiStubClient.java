package org.example.backend.chat.client.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.chat.client.GeminiClient;
import org.example.backend.chat.dto.ChatModelResult;
import org.example.backend.chat.prompt.HotelPromptManager;
import org.example.backend.chat.session.ChatMessage;
import org.example.backend.chat.tools.ChatToolDispatcher;
import org.example.backend.chat.tools.ChatToolNames;
import org.example.backend.chat.tools.ToolCallResult;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Provider Stub cho Chatbot Grand Aurora:
 * - Cung cấp câu trả lời tư vấn phòng mẫu chuẩn xác theo nghiệp vụ khách sạn Grand Aurora.
 * - Hỗ trợ giả lập đầy đủ 4 Tool Function Calling (Task [SP2-CHAT-TOOLS-01]):
 *   1. searchAvailableRooms: Tra cứu phòng từ DB thật qua toolDispatcher
 *   2. getRoomTypeDetails: Lấy chi tiết tiện nghi loại phòng
 *   3. getBookingQuote: Tính số đêm, tổng tiền và cọc 50% VNPay (hạn 15p, không giữ phòng)
 *   4. prepareBooking: Kiểm tra đăng nhập qua Authentication, tạo Booking Draft gắn với session
 * - Tuân thủ nghiêm ngặt Guardrails:
 *   + Từ chối câu hỏi ngoài lề (code, toán học, chính trị...)
 *   + Từ chối các tool vượt quyền (confirm, payment, sql, refund...)
 *   + Không tự khẳng định đặt phòng hay thanh toán thành công
 *   + Thiếu ngày/số khách thì hỏi lại lịch sự, không bịa dữ liệu
 * - Hoàn toàn độc lập với Internet và Google API Key, phục vụ kiểm thử tự động 100% ổn định.
 */
@Slf4j
@Component("geminiStubClient")
@RequiredArgsConstructor
public class GeminiStubClient implements GeminiClient {

    private final HotelPromptManager promptManager;

    public static final String PROVIDER_NAME = "stub";
    public static final String MODEL_NAME = "stub-mock-provider";

    private static final Pattern DATE_PATTERN = Pattern.compile("(\\d{4}-\\d{2}-\\d{2})");
    private static final Pattern QUOTE_PATTERN = Pattern.compile("(quote-[a-zA-Z0-9]+)");

    public GeminiStubClient() {
        this(new HotelPromptManager());
    }

    @Override
    public ChatModelResult executeChat(String userMessage,
                                       String systemPrompt,
                                       List<ChatMessage> history,
                                       ChatToolDispatcher toolDispatcher,
                                       Authentication authentication,
                                       String sessionId) {
        log.info("[GeminiStubClient] executeChat: userMessage=[{}], user=[{}]",
                userMessage, authentication != null ? authentication.getName() : "anonymous");

        if (userMessage == null || userMessage.isBlank()) {
            return ChatModelResult.builder()
                    .reply("Dạ chào quý khách! Em có thể giúp gì cho kỳ nghỉ dưỡng của quý khách tại Grand Aurora Luxury Hotel?")
                    .cardType("NONE")
                    .provider(PROVIDER_NAME)
                    .model(MODEL_NAME)
                    .build();
        }

        String lower = userMessage.toLowerCase(Locale.ROOT);

        // 0. Guardrails: Ngoài phạm vi khách sạn
        if (promptManager.isOutOfScope(userMessage)) {
            return ChatModelResult.builder()
                    .reply(promptManager.getOutOfScopeRefusalMessage())
                    .cardType("NONE")
                    .provider(PROVIDER_NAME)
                    .model(MODEL_NAME)
                    .build();
        }

        // 1. Chống vượt quyền: Khách yêu cầu AI sửa giá, can thiệp SQL, xác nhận thanh toán, hoàn tiền
        if (promptManager.isUnauthorizedActionRequest(userMessage)
                || lower.contains("gọi tool confirmbooking")
                || lower.contains("xác nhận đặt phòng giúp tôi")
                || lower.contains("thanh toán đơn đặt phòng")) {
            return ChatModelResult.builder()
                    .reply(promptManager.getUnauthorizedActionMessage())
                    .cardType("NONE")
                    .provider(PROVIDER_NAME)
                    .model(MODEL_NAME)
                    .build();
        }

        // 2. Chống ảo giác: Không tự xác nhận đặt phòng hay thanh toán thành công
        if (promptManager.isBookingOrPaymentConfirmationInquiry(userMessage)
                || lower.contains("đã thanh toán thành công chưa")
                || lower.contains("đã đặt phòng thành công chưa")) {
            return ChatModelResult.builder()
                    .reply(promptManager.getBookingOrPaymentGuidanceMessage())
                    .cardType("NONE")
                    .provider(PROVIDER_NAME)
                    .model(MODEL_NAME)
                    .build();
        }

        // 3. Nếu không có toolDispatcher -> fallback sang chat thông thường
        if (toolDispatcher == null) {
            String text = generateContentWithHistory(userMessage, systemPrompt, history);
            return ChatModelResult.builder()
                    .reply(text)
                    .cardType("NONE")
                    .provider(PROVIDER_NAME)
                    .model(MODEL_NAME)
                    .build();
        }

        // 4. FUNCTION CALLING SIMULATION THEO INTENT:

        // Tool 4: prepareBooking
        if (lower.contains("chuẩn bị đặt phòng") || lower.contains("tạo bản nháp") || lower.contains("bản nháp")
                || lower.contains("prepare booking") || lower.contains("preparebooking")
                || (lower.contains("đặt phòng") && lower.contains("quote-"))) {

            Matcher matcher = QUOTE_PATTERN.matcher(userMessage);
            if (matcher.find()) {
                String quoteId = matcher.group(1);
                ToolCallResult result = toolDispatcher.dispatch(ChatToolNames.PREPARE_BOOKING,
                        Map.of("quoteId", quoteId, "specialRequests", userMessage), authentication, sessionId);
                return ChatModelResult.builder()
                        .reply(result.getSummaryMessage() != null ? result.getSummaryMessage() : result.getErrorMessage())
                        .cardType(result.getCardType())
                        .cardData(result.getCardData())
                        .provider(PROVIDER_NAME)
                        .model(MODEL_NAME)
                        .build();
            } else {
                return ChatModelResult.builder()
                        .reply("Dạ để chuẩn bị bản nháp đặt phòng, quý khách vui lòng cung cấp mã báo giá (quoteId) đã nhận trước đó hoặc yêu cầu em tính báo giá phòng trước nhé!")
                        .cardType("NONE")
                        .provider(PROVIDER_NAME)
                        .model(MODEL_NAME)
                        .build();
            }
        }

        // Tool 3: getBookingQuote
        if (lower.contains("báo giá") || lower.contains("tính tiền") || lower.contains("giá bao nhiêu")
                || lower.contains("tổng tiền") || lower.contains("chi phí") || lower.contains("getbookingquote")
                || (lower.contains("đặt phòng") && (lower.contains("từ ngày") || lower.contains("ngày")))) {

            Long roomTypeId = detectRoomTypeId(lower);
            if (roomTypeId == null) {
                roomTypeId = 2L; // Mặc định Deluxe Double nếu không nêu rõ
            }

            List<LocalDate> dates = extractDates(userMessage);
            LocalDate checkIn = dates.size() >= 1 ? dates.get(0) : LocalDate.now().plusDays(1);
            LocalDate checkOut = dates.size() >= 2 ? dates.get(1) : checkIn.plusDays(2);
            int guests = detectGuests(lower, 2);
            int quantity = detectQuantity(lower, 1);

            Map<String, Object> quoteArgs = new HashMap<>();
            quoteArgs.put("roomTypeId", roomTypeId);
            quoteArgs.put("checkIn", checkIn.toString());
            quoteArgs.put("checkOut", checkOut.toString());
            quoteArgs.put("guests", guests);
            quoteArgs.put("quantity", quantity);

            ToolCallResult result = toolDispatcher.dispatch(ChatToolNames.GET_BOOKING_QUOTE, quoteArgs, authentication, sessionId);
            return ChatModelResult.builder()
                    .reply(result.getSummaryMessage() != null ? result.getSummaryMessage() : result.getErrorMessage())
                    .cardType(result.getCardType())
                    .cardData(result.getCardData())
                    .provider(PROVIDER_NAME)
                    .model(MODEL_NAME)
                    .build();
        }

        // Tool 2: getRoomTypeDetails
        if (lower.contains("chi tiết") || lower.contains("tiện nghi") || lower.contains("mô tả")
                || lower.contains("phòng có gì") || lower.contains("getroomtypedetails")) {

            Long roomTypeId = detectRoomTypeId(lower);
            if (roomTypeId != null) {
                ToolCallResult result = toolDispatcher.dispatch(ChatToolNames.GET_ROOM_TYPE_DETAILS,
                        Map.of("roomTypeId", roomTypeId), authentication, sessionId);
                return ChatModelResult.builder()
                        .reply(result.getSummaryMessage() != null ? result.getSummaryMessage() : result.getErrorMessage())
                        .cardType(result.getCardType())
                        .cardData(result.getCardData())
                        .provider(PROVIDER_NAME)
                        .model(MODEL_NAME)
                        .build();
            }
        }

        // Tool 1: searchAvailableRooms
        if (lower.contains("tìm phòng") || lower.contains("tra phòng") || lower.contains("còn phòng")
                || lower.contains("kiểm tra phòng") || lower.contains("searchavailablerooms")
                || lower.contains("có phòng không") || lower.contains("phòng trống") || lower.contains("có phòng")) {

            List<LocalDate> dates = extractDates(userMessage);

            // Xử lý từ khóa ngày tự nhiên: "hôm nay", "ngày mai", "ngày kia", "cuối tuần"
            if (dates.isEmpty()) {
                if (lower.contains("hôm nay")) {
                    dates.add(LocalDate.now());
                    dates.add(LocalDate.now().plusDays(1));
                } else if (lower.contains("ngày mai") || lower.contains("mai")) {
                    dates.add(LocalDate.now().plusDays(1));
                    dates.add(LocalDate.now().plusDays(2));
                }
            }

            // Tiêu chí nghiệm thu: "Thiếu ngày/số khách thì hỏi lại; không bịa dữ liệu"
            if (dates.isEmpty()) {
                return ChatModelResult.builder()
                        .reply("Dạ thưa quý khách, để em tra cứu chính xác số lượng phòng trống và giá thời gian thực từ cơ sở dữ liệu khách sạn, quý khách vui lòng cung cấp: Ngày nhận phòng (check-in), ngày trả phòng (check-out) và số lượng khách dự kiến lưu trú nhé ạ!")
                        .cardType("NONE")
                        .provider(PROVIDER_NAME)
                        .model(MODEL_NAME)
                        .build();
            }

            LocalDate checkIn = dates.get(0);
            LocalDate checkOut = dates.size() >= 2 ? dates.get(1) : checkIn.plusDays(1);
            int guests = detectGuests(lower, 2);
            Long roomTypeId = detectRoomTypeId(lower);

            Map<String, Object> searchArgs = new HashMap<>();
            searchArgs.put("checkIn", checkIn.toString());
            searchArgs.put("checkOut", checkOut.toString());
            searchArgs.put("guests", guests);
            if (roomTypeId != null) {
                searchArgs.put("roomTypeId", roomTypeId);
            }

            ToolCallResult result = toolDispatcher.dispatch(ChatToolNames.SEARCH_AVAILABLE_ROOMS, searchArgs, authentication, sessionId);
            return ChatModelResult.builder()
                    .reply(result.getSummaryMessage() != null ? result.getSummaryMessage() : result.getErrorMessage())
                    .cardType(result.getCardType())
                    .cardData(result.getCardData())
                    .provider(PROVIDER_NAME)
                    .model(MODEL_NAME)
                    .build();
        }

        // 5. Câu hỏi thông tin chung (Check-in/Check-out, buffet, địa chỉ, hotline...)
        String text = generateContentWithHistory(userMessage, systemPrompt, history);
        return ChatModelResult.builder()
                .reply(text)
                .cardType("NONE")
                .provider(PROVIDER_NAME)
                .model(MODEL_NAME)
                .build();
    }

    @Override
    public String generateContentWithHistory(String userMessage, String systemPrompt, List<ChatMessage> history) {
        log.info("[GeminiStubClient] generateContentWithHistory: [{}]", userMessage);

        if (userMessage == null || userMessage.isBlank()) {
            return "Dạ chào quý khách! Em có thể giúp gì cho kỳ nghỉ dưỡng của quý khách tại Grand Aurora Luxury Hotel?";
        }

        String lower = userMessage.toLowerCase(Locale.ROOT);

        if (promptManager.isOutOfScope(userMessage)) {
            return promptManager.getOutOfScopeRefusalMessage();
        }

        if (promptManager.isUnauthorizedActionRequest(userMessage)) {
            return promptManager.getUnauthorizedActionMessage();
        }

        if (promptManager.isBookingOrPaymentConfirmationInquiry(userMessage)) {
            return promptManager.getBookingOrPaymentGuidanceMessage();
        }

        if (promptManager.isAvailabilityInquiry(userMessage)) {
            return promptManager.getAvailabilityGuidanceMessage();
        }

        // Giờ nhận / trả phòng (Check-in 14:00, Check-out 12:00)
        if (lower.contains("giờ") || lower.contains("check-in") || lower.contains("check in")
                || lower.contains("nhận phòng") || lower.contains("trả phòng") || lower.contains("check-out")) {
            return "Thời gian nhận phòng (Check-in) tiêu chuẩn tại Grand Aurora là từ 14:00 chiều và trả phòng (Check-out) trước 12:00 trưa hôm sau. " +
                    "Nếu quý khách đến sớm hơn 14:00, khách sạn có hỗ trợ gửi hành lý hoàn toàn miễn phí tại quầy lễ tân tầng 1.";
        }

        // Bữa sáng Buffet & Tiện ích
        if (lower.contains("ăn sáng") || lower.contains("buffet") || lower.contains("tiện ích")
                || lower.contains("bể bơi") || lower.contains("hồ bơi") || lower.contains("gym")) {
            return "Tất cả các đơn đặt phòng tại Grand Aurora đều đã bao gồm: Bữa sáng Buffet tự chọn hàng ngày từ 06:30 - 09:30 tại nhà hàng Aurora (tầng 2), " +
                    "miễn phí sử dụng hồ bơi vô cực trên tầng thượng (Infinity Rooftop Pool) và phòng tập Gym hiện đại 24/7.";
        }

        // Chính sách cọc 50% VNPay & Hoàn hủy tính theo mốc 14:00
        if (lower.contains("hủy") || lower.contains("cọc") || lower.contains("chính sách")
                || lower.contains("hoàn tiền") || lower.contains("vnpay") || lower.contains("thanh toán")) {
            return "Chính sách đặt cọc VNPay & hoàn hủy theo mốc 14:00 của Grand Aurora:\n" +
                    "• Đặt cọc trực tuyến: Quý khách cọc trước 50% tổng giá trị đơn qua cổng thanh toán VNPay khi giữ phòng; 50% còn lại thanh toán tại quầy khi trả phòng.\n" +
                    "• Mốc giờ Check-in là 14:00 của ngày nhận phòng:\n" +
                    "  - Hủy trước >= 24h so với mốc 14:00: Hoàn lại 100% tiền cọc (miễn phí hủy).\n" +
                    "  - Hủy từ 12h đến 24h trước mốc 14:00: Phạt 30% tiền cọc, hoàn lại 70%.\n" +
                    "  - Hủy dưới 12h trước mốc 14:00 (hoặc vắng mặt No-Show): Phạt 50% tiền cọc (không hoàn cọc).";
        }

        // Địa chỉ & Hotline liên hệ
        if (lower.contains("địa chỉ") || lower.contains("vị trí") || lower.contains("hotline")
                || lower.contains("liên hệ") || lower.contains("ở đâu")) {
            return "Khách sạn Grand Aurora Luxury tọa lạc tại vị trí đắc địa: 01 Võ Nguyên Giáp, Phường Phước Mỹ, Quận Sơn Trà, TP. Đà Nẵng (sát bãi biển Mỹ Khê).\n" +
                    "Hotline hỗ trợ 24/7: 1900 888 888 | Email: contact@grandaurora.com.";
        }

        // Danh sách phòng & Giá niêm yết công khai
        if (lower.contains("phòng") || lower.contains("giá") || lower.contains("loại") || lower.contains("room")) {
            return "Khách sạn Grand Aurora Luxury hiện cung cấp 3 hạng phòng tiêu chuẩn 5 sao quốc tế (giá niêm yết tham khảo):\n" +
                    "1. Standard Single Room: 500.000 VNĐ / đêm (1 người lớn, tiện nghi hiện đại).\n" +
                    "2. Deluxe Double Room: 950.000 VNĐ / đêm (2 người lớn, ban công riêng view biển Mỹ Khê).\n" +
                    "3. Executive Suite Luxury: 1.800.000 VNĐ / đêm (4 người lớn, căn hộ 2 phòng ngủ, bồn tắm view bán đảo Sơn Trà).\n\n" +
                    "Để kiểm tra chính xác số lượng phòng trống và nhận giá ưu đãi theo ngày lưu trú cụ thể của quý khách, xin vui lòng truy cập trang 'Tra cứu & Tìm phòng' trên website để đặt cọc 50% qua VNPay ạ!";
        }

        return "Dạ Grand Aurora xin chào quý khách! Em là Trợ lý ảo Lễ tân của khách sạn. " +
                "Quý khách có thể hỏi em về: tra cứu phòng trống theo ngày, xem tiện nghi loại phòng, tính báo giá đặt phòng, hoặc chính sách cọc 50% VNPay và hoàn hủy phòng ạ!";
    }

    @Override
    public String getProviderName() {
        return PROVIDER_NAME;
    }

    @Override
    public String getModelName() {
        return MODEL_NAME;
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    // ────────────────────────────────────────────────────────────────
    // TIỆN ÍCH TRÍCH XUẤT INTENT TỰ NHIÊN CHO PROVIDER STUB
    // ────────────────────────────────────────────────────────────────

    private List<LocalDate> extractDates(String message) {
        List<LocalDate> dates = new ArrayList<>();
        Matcher matcher = DATE_PATTERN.matcher(message);
        while (matcher.find()) {
            try {
                dates.add(LocalDate.parse(matcher.group(1)));
            } catch (Exception ignored) {
            }
        }
        return dates;
    }

    private Long detectRoomTypeId(String lower) {
        if (lower.contains("executive") || lower.contains("suite") || lower.contains("hạng 3") || lower.contains("loại 3") || lower.contains("roomtypeid: 3") || lower.contains("roomtypeid 3")) {
            return 3L;
        }
        if (lower.contains("deluxe") || lower.contains("hạng 2") || lower.contains("loại 2") || lower.contains("roomtypeid: 2") || lower.contains("roomtypeid 2")) {
            return 2L;
        }
        if (lower.contains("standard") || lower.contains("single") || lower.contains("hạng 1") || lower.contains("loại 1") || lower.contains("roomtypeid: 1") || lower.contains("roomtypeid 1")) {
            return 1L;
        }
        return null;
    }

    private int detectGuests(String lower, int defaultGuests) {
        Pattern pattern = Pattern.compile("(\\d+)\\s*(khách|người|nguoi|pax)");
        Matcher matcher = pattern.matcher(lower);
        if (matcher.find()) {
            try {
                return Integer.parseInt(matcher.group(1));
            } catch (Exception ignored) {
            }
        }
        return defaultGuests;
    }

    private int detectQuantity(String lower, int defaultQty) {
        Pattern pattern = Pattern.compile("(\\d+)\\s*(phòng|phong|room)");
        Matcher matcher = pattern.matcher(lower);
        if (matcher.find()) {
            try {
                return Integer.parseInt(matcher.group(1));
            } catch (Exception ignored) {
            }
        }
        return defaultQty;
    }
}
