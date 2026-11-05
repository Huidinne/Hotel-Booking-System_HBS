package org.example.backend.chat.client.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.chat.client.GeminiClient;
import org.example.backend.chat.prompt.HotelPromptManager;
import org.example.backend.chat.session.ChatMessage;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;

/**
 * Provider Stub cho Chatbot Grand Aurora:
 * - Cung cấp câu trả lời tư vấn phòng mẫu chuẩn xác theo nghiệp vụ khách sạn Grand Aurora.
 * - Tuân thủ chính sách cọc 50% VNPay và chính sách hoàn hủy tính theo mốc 14:00.
 * - Tích hợp Guardrails: từ chối lịch thiệp các câu hỏi ngoài phạm vi khách sạn.
 * - KHÔNG tự ý khẳng định còn phòng / hết phòng vào ngày cụ thể; hướng người dùng sang trang tra cứu tìm phòng.
 * - KHÔNG tự xác nhận đặt phòng hay thanh toán thành công; hướng dẫn qua quy trình VNPay và lịch sử đặt phòng.
 * - Không phụ thuộc mạng Internet hay Google API Key, phục vụ kiểm thử và offline fallback 100% ổn định.
 */
@Slf4j
@Component("geminiStubClient")
@RequiredArgsConstructor
public class GeminiStubClient implements GeminiClient {

    private final HotelPromptManager promptManager;

    public static final String PROVIDER_NAME = "stub";
    public static final String MODEL_NAME = "stub-mock-provider";

    public GeminiStubClient() {
        this(new HotelPromptManager());
    }

    @Override
    public String generateContentWithHistory(String userMessage, String systemPrompt, List<ChatMessage> history) {
        log.info("[GeminiStubClient] Xử lý câu hỏi qua Provider Stub (kèm {} lượt lịch sử): [{}]",
                history != null ? history.size() : 0, userMessage);

        if (userMessage == null || userMessage.isBlank()) {
            return "Dạ chào quý khách! Em có thể giúp gì cho kỳ nghỉ dưỡng của quý khách tại Grand Aurora Luxury Hotel?";
        }

        String lower = userMessage.toLowerCase(Locale.ROOT);

        // 0. Guardrails: Xử lý câu hỏi ngoài phạm vi khách sạn (code, toán học, chính trị, viết thơ...)
        if (promptManager.isOutOfScope(userMessage)) {
            return promptManager.getOutOfScopeRefusalMessage();
        }

        // 1. Chống ảo giác: Không tự xác nhận đặt phòng hay thanh toán thành công
        if (promptManager.isBookingOrPaymentConfirmationInquiry(userMessage)
                || lower.contains("xác nhận thanh toán")
                || lower.contains("đã thanh toán thành công")
                || lower.contains("đã đặt phòng thành công")) {
            return promptManager.getBookingOrPaymentGuidanceMessage();
        }

        // 2. Chống ảo giác: Không tự ý khẳng định còn phòng / hết phòng theo ngày; hướng sang trang tra cứu
        if (promptManager.isAvailabilityInquiry(userMessage)) {
            return promptManager.getAvailabilityGuidanceMessage();
        }

        // 3. Giờ nhận / trả phòng (Check-in 14:00, Check-out 12:00)
        if (lower.contains("giờ") || lower.contains("check-in") || lower.contains("check in")
                || lower.contains("nhận phòng") || lower.contains("trả phòng") || lower.contains("check-out")) {
            return "Thời gian nhận phòng (Check-in) tiêu chuẩn tại Grand Aurora là từ 14:00 chiều và trả phòng (Check-out) trước 12:00 trưa hôm sau. " +
                    "Nếu quý khách đến sớm hơn 14:00, khách sạn có hỗ trợ gửi hành lý hoàn toàn miễn phí tại quầy lễ tân tầng 1.";
        }

        // 4. Bữa sáng Buffet & Tiện ích
        if (lower.contains("ăn sáng") || lower.contains("buffet") || lower.contains("tiện ích")
                || lower.contains("bể bơi") || lower.contains("hồ bơi") || lower.contains("gym")) {
            return "Tất cả các đơn đặt phòng tại Grand Aurora đều đã bao gồm: Bữa sáng Buffet tự chọn hàng ngày từ 06:30 - 09:30 tại nhà hàng Aurora (tầng 2), " +
                    "miễn phí sử dụng hồ bơi vô cực trên tầng thượng (Infinity Rooftop Pool) và phòng tập Gym hiện đại 24/7.";
        }

        // 5. Chính sách cọc 50% VNPay & Hoàn hủy tính theo mốc 14:00
        if (lower.contains("hủy") || lower.contains("cọc") || lower.contains("chính sách")
                || lower.contains("hoàn tiền") || lower.contains("vnpay") || lower.contains("thanh toán")) {
            return "Chính sách đặt cọc VNPay & hoàn hủy theo mốc 14:00 của Grand Aurora:\n" +
                    "• Đặt cọc trực tuyến: Quý khách cọc trước 50% tổng giá trị đơn qua cổng thanh toán VNPay khi giữ phòng; 50% còn lại thanh toán tại quầy khi trả phòng.\n" +
                    "• Mốc giờ Check-in là 14:00 của ngày nhận phòng:\n" +
                    "  - Hủy trước >= 24h so với mốc 14:00: Hoàn lại 100% tiền cọc (miễn phí hủy).\n" +
                    "  - Hủy từ 12h đến 24h trước mốc 14:00: Phạt 30% tiền cọc, hoàn lại 70%.\n" +
                    "  - Hủy dưới 12h trước mốc 14:00 (hoặc vắng mặt No-Show): Phạt 50% tiền cọc (không hoàn cọc).";
        }

        // 6. Địa chỉ & Hotline liên hệ
        if (lower.contains("địa chỉ") || lower.contains("vị trí") || lower.contains("hotline")
                || lower.contains("liên hệ") || lower.contains("ở đâu")) {
            return "Khách sạn Grand Aurora Luxury tọa lạc tại vị trí đắc địa: 01 Võ Nguyên Giáp, Phường Phước Mỹ, Quận Sơn Trà, TP. Đà Nẵng (sát bãi biển Mỹ Khê).\n" +
                    "Hotline hỗ trợ 24/7: 1900 888 888 | Email: contact@grandaurora.com.";
        }

        // 7. Danh sách phòng & Giá niêm yết công khai (kèm lời nhắc tra cứu ngày thực tế)
        if (lower.contains("phòng") || lower.contains("giá") || lower.contains("loại") || lower.contains("room")) {
            return "Khách sạn Grand Aurora Luxury hiện cung cấp 3 hạng phòng tiêu chuẩn 5 sao quốc tế (giá niêm yết tham khảo):\n" +
                    "1. Standard Single Room: 500.000 VNĐ / đêm (1 người lớn, tiện nghi hiện đại).\n" +
                    "2. Deluxe Double Room: 950.000 VNĐ / đêm (2 người lớn, ban công riêng view biển Mỹ Khê).\n" +
                    "3. Executive Suite Luxury: 1.800.000 VNĐ / đêm (4 người lớn, căn hộ 2 phòng ngủ, bồn tắm view bán đảo Sơn Trà).\n\n" +
                    "Để kiểm tra chính xác số lượng phòng trống và nhận giá ưu đãi theo ngày lưu trú cụ thể của quý khách, xin vui lòng truy cập trang 'Tra cứu & Tìm phòng' trên website để đặt cọc 50% qua VNPay ạ!";
        }

        return "Dạ Grand Aurora xin chào quý khách! Em là Trợ lý ảo Lễ tân của khách sạn. " +
                "Quý khách có thể hỏi em về: danh sách loại phòng, giá phòng niêm yết, thời gian nhận/trả phòng 14:00/12:00, buffet sáng miễn phí, hoặc chính sách cọc 50% VNPay và hoàn hủy phòng ạ!";
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
}
