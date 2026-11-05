package org.example.backend.chat.client.impl;

import lombok.extern.slf4j.Slf4j;
import org.example.backend.chat.client.GeminiClient;
import org.example.backend.chat.session.ChatMessage;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;

/**
 * Provider Stub cho Chatbot:
 * - Cung cấp câu trả lời tư vấn phòng mẫu chuẩn xác theo nghiệp vụ Grand Aurora Hotel.
 * - Tuân thủ chính sách cọc 50% VNPay và chính sách hoàn hủy tính theo mốc 14:00.
 * - Tích hợp Guardrails: từ chối lịch thiệp các câu hỏi ngoài phạm vi khách sạn.
 * - Không phụ thuộc mạng Internet hay Google API Key, phục vụ kiểm thử và offline fallback 100% ổn định.
 */
@Slf4j
@Component("geminiStubClient")
public class GeminiStubClient implements GeminiClient {

    public static final String PROVIDER_NAME = "stub";
    public static final String MODEL_NAME = "stub-mock-provider";

    @Override
    public String generateContentWithHistory(String userMessage, String systemPrompt, List<ChatMessage> history) {
        log.info("[GeminiStubClient] Xử lý câu hỏi qua Provider Stub (kèm {} lượt lịch sử): [{}]",
                history != null ? history.size() : 0, userMessage);

        if (userMessage == null || userMessage.isBlank()) {
            return "Dạ chào quý khách! Em có thể giúp gì cho kỳ nghỉ dưỡng của quý khách tại Grand Aurora Luxury Hotel?";
        }

        String lower = userMessage.toLowerCase(Locale.ROOT);

        // 0. Guardrails: Xử lý câu hỏi ngoài phạm vi khách sạn (code, toán học, chính trị, viết thơ...)
        if (lower.contains("viết code") || lower.contains("python") || lower.contains("javascript")
                || lower.contains("giải toán") || lower.contains("phương trình") || lower.contains("chính trị")
                || lower.contains("thơ tình") || lower.contains("viết văn") || lower.contains("lập trình")) {
            return "Dạ em là Trợ lý ảo Lễ tân của Grand Aurora Luxury Hotel. Em chỉ có thể hỗ trợ quý khách các thông tin về phòng nghỉ, tiện ích và chính sách đặt phòng của khách sạn tại Đà Nẵng. Quý khách cần em tư vấn thêm về loại phòng nào không ạ?";
        }

        // 1. Giờ nhận / trả phòng (Check-in 14:00, Check-out 12:00)
        if (lower.contains("giờ") || lower.contains("check-in") || lower.contains("check in")
                || lower.contains("nhận phòng") || lower.contains("trả phòng") || lower.contains("check-out")) {
            return "Thời gian nhận phòng (Check-in) tiêu chuẩn tại Grand Aurora là từ 14:00 chiều và trả phòng (Check-out) trước 12:00 trưa hôm sau. " +
                    "Nếu quý khách đến sớm hơn 14:00, khách sạn có hỗ trợ gửi hành lý hoàn toàn miễn phí tại quầy lễ tân tầng 1.";
        }

        // 2. Bữa sáng Buffet & Tiện ích
        if (lower.contains("ăn sáng") || lower.contains("buffet") || lower.contains("tiện ích")
                || lower.contains("bể bơi") || lower.contains("hồ bơi") || lower.contains("gym")) {
            return "Tất cả các đơn đặt phòng tại Grand Aurora đều đã bao gồm: Bữa sáng Buffet tự chọn hàng ngày từ 06:30 - 09:30 tại nhà hàng Aurora (tầng 2), " +
                    "miễn phí sử dụng hồ bơi vô cực trên tầng thượng (Infinity Rooftop Pool) và phòng tập Gym hiện đại 24/7.";
        }

        // 3. Chính sách cọc 50% VNPay & Hoàn hủy tính theo mốc 14:00
        if (lower.contains("hủy") || lower.contains("cọc") || lower.contains("chính sách")
                || lower.contains("hoàn tiền") || lower.contains("vnpay") || lower.contains("thanh toán")) {
            return "Chính sách đặt cọc VNPay & hoàn hủy theo mốc 14:00 của Grand Aurora:\n" +
                    "• Đặt cọc trực tuyến: Quý khách cọc trước 50% tổng giá trị đơn qua cổng thanh toán VNPay khi giữ phòng; 50% còn lại thanh toán tại quầy khi trả phòng.\n" +
                    "• Mốc giờ Check-in là 14:00 của ngày nhận phòng:\n" +
                    "  - Hủy trước >= 24h so với mốc 14:00: Hoàn lại 100% tiền cọc (miễn phí hủy).\n" +
                    "  - Hủy từ 12h đến 24h trước mốc 14:00: Phạt 30% tiền cọc, hoàn lại 70%.\n" +
                    "  - Hủy dưới 12h trước mốc 14:00 (hoặc vắng mặt No-Show): Phạt 50% tiền cọc (không hoàn cọc).";
        }

        // 4. Địa chỉ & Hotline liên hệ
        if (lower.contains("địa chỉ") || lower.contains("vị trí") || lower.contains("hotline")
                || lower.contains("liên hệ") || lower.contains("ở đâu")) {
            return "Khách sạn Grand Aurora Luxury tọa lạc tại vị trí đắc địa: 01 Võ Nguyên Giáp, Phường Phước Mỹ, Quận Sơn Trà, TP. Đà Nẵng (sát bãi biển Mỹ Khê).\n" +
                    "Hotline hỗ trợ 24/7: 1900 888 888 | Email: contact@grandaurora.com.";
        }

        // 5. Danh sách phòng & Giá phòng
        if (lower.contains("phòng") || lower.contains("giá") || lower.contains("loại") || lower.contains("room")) {
            return "Khách sạn Grand Aurora Luxury hiện cung cấp 3 hạng phòng tiêu chuẩn 5 sao quốc tế:\n" +
                    "1. Standard Single Room: 500.000 VNĐ / đêm (1 người lớn, tiện nghi hiện đại).\n" +
                    "2. Deluxe Double Room: 950.000 VNĐ / đêm (2 người lớn, ban công riêng view biển Mỹ Khê).\n" +
                    "3. Executive Suite Luxury: 1.800.000 VNĐ / đêm (4 người lớn, căn hộ 2 phòng ngủ, bồn tắm nằm cao cấp view bán đảo Sơn Trà).\n" +
                    "Quý khách có thể bấm 'Đặt phòng ngay' trên website để đặt cọc 50% qua VNPay và nhận ưu đãi tốt nhất!";
        }

        return "Dạ Grand Aurora xin chào quý khách! Em là Trợ lý ảo Lễ tân của khách sạn. " +
                "Quý khách có thể hỏi em về: danh sách loại phòng, giá phòng, thời gian nhận/trả phòng 14:00/12:00, buffet sáng miễn phí, hoặc chính sách cọc 50% VNPay và hoàn hủy phòng ạ!";
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
