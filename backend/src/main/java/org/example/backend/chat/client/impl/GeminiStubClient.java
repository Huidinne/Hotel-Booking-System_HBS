package org.example.backend.chat.client.impl;

import lombok.extern.slf4j.Slf4j;
import org.example.backend.chat.client.GeminiClient;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * Provider Stub cho Chatbot:
 * - Cung cấp câu trả lời tư vấn phòng mẫu chuẩn xác theo nghiệp vụ Grand Aurora Hotel.
 * - Không phụ thuộc mạng Internet hay Google API Key.
 * - Đảm bảo kiểm thử Contract API (Unit Test / CI/CD) luôn xanh và ổn định 100%.
 */
@Slf4j
@Component("geminiStubClient")
public class GeminiStubClient implements GeminiClient {

    public static final String PROVIDER_NAME = "stub";
    public static final String MODEL_NAME = "stub-mock-provider";

    @Override
    public String generateContent(String userMessage, String systemPrompt) {
        log.info("[GeminiStubClient] Xử lý câu hỏi qua Provider Stub: [{}]", userMessage);

        if (userMessage == null || userMessage.isBlank()) {
            return "Dạ chào quý khách! Em có thể giúp gì cho kỳ nghỉ dưỡng của quý khách tại Grand Aurora Luxury Hotel?";
        }

        String lower = userMessage.toLowerCase(Locale.ROOT);

        // 1. Giờ nhận / trả phòng (ưu tiên kiểm tra trước các từ khóa chung như 'phòng')
        if (lower.contains("giờ") || lower.contains("check-in") || lower.contains("check in") || lower.contains("nhận phòng") || lower.contains("trả phòng") || lower.contains("check-out")) {
            return "Thời gian nhận phòng (Check-in) tiêu chuẩn là từ 14:00 và trả phòng (Check-out) trước 12:00 trưa hôm sau. " +
                    "Nếu quý khách đến sớm, khách sạn hỗ trợ gửi hành lý miễn phí tại quầy lễ tân tầng 1.";
        }

        // 2. Bữa sáng Buffet & Tiện ích
        if (lower.contains("ăn sáng") || lower.contains("buffet") || lower.contains("tiện ích") || lower.contains("bể bơi") || lower.contains("hồ bơi") || lower.contains("gym")) {
            return "Tất cả các đơn đặt phòng tại Grand Aurora đều bao gồm: Bữa sáng Buffet tự chọn hàng ngày từ 06:30 - 09:30 tại nhà hàng Aurora, " +
                    "miễn phí sử dụng hồ bơi vô cực trên tầng thượng và phòng tập Gym 24/7.";
        }

        // 3. Chính sách cọc & Hoàn hủy
        if (lower.contains("hủy") || lower.contains("cọc") || lower.contains("chính sách") || lower.contains("hoàn tiền")) {
            return "Chính sách đặt cọc & hoàn hủy của Grand Aurora:\n" +
                    "• Đặt cọc: 50% tổng giá trị đơn khi giữ phòng trực tuyến.\n" +
                    "• Hủy trước >= 24h: Hoàn lại 100% tiền cọc (miễn phí hủy).\n" +
                    "• Hủy từ 12h - 24h trước giờ nhận phòng: Phạt 30% tiền cọc, hoàn 70%.\n" +
                    "• Hủy dưới 12h: Hỗ trợ hoàn lại 50% cọc.";
        }

        // 4. Địa chỉ & Hotline liên hệ
        if (lower.contains("địa chỉ") || lower.contains("vị trí") || lower.contains("hotline") || lower.contains("liên hệ") || lower.contains("ở đâu")) {
            return "Khách sạn Grand Aurora tọa lạc tại: 01 Võ Nguyên Giáp, Quận Sơn Trà, TP. Đà Nẵng (sát bãi biển Mỹ Khê).\n" +
                    "Hotline hỗ trợ 24/7: 1900 888 888 | Email: contact@grandaurora.com.";
        }

        // 5. Danh sách phòng & Giá phòng
        if (lower.contains("phòng") || lower.contains("giá") || lower.contains("loại") || lower.contains("room")) {
            return "Khách sạn Grand Aurora Luxury hiện cung cấp 3 hạng phòng tiêu chuẩn 5 sao:\n" +
                    "1. Standard Single Room: 500.000 ₫/đêm (1 khách, tiện nghi cơ bản hiện đại).\n" +
                    "2. Deluxe Double Room: 950.000 ₫/đêm (2 khách, ban công ngắm trọn biển Mỹ Khê).\n" +
                    "3. Executive Suite Luxury: 1.800.000 ₫/đêm (4 khách, 2 phòng ngủ, bồn tắm nằm cao cấp).\n" +
                    "Quý khách có thể xem ảnh và đặt phòng trực tiếp trên website để nhận ưu đãi cọc 50%!";
        }

        return "Dạ Grand Aurora xin chào quý khách! Em là trợ lý ảo hỗ trợ thông tin khách sạn. " +
                "Quý khách có thể hỏi em về: danh sách loại phòng, giá phòng, thời gian nhận/trả phòng, bữa sáng buffet hoặc chính sách hoàn hủy cọc ạ!";
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

