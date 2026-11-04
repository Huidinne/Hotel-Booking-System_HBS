package org.example.backend.chat.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.chat.client.GeminiClient;
import org.example.backend.chat.dto.ChatRequest;
import org.example.backend.chat.dto.ChatResponse;
import org.example.backend.chat.service.ChatService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Triển khai nghiệp vụ Chatbot tư vấn khách sạn Grand Aurora
 */
@Slf4j
@Service
public class ChatServiceImpl implements ChatService {

    private final GeminiClient geminiClient;
    private final GeminiClient stubClient;

    public ChatServiceImpl(
            @Qualifier("geminiClientImpl") GeminiClient geminiClient,
            @Qualifier("geminiStubClient") GeminiClient stubClient
    ) {
        this.geminiClient = geminiClient;
        this.stubClient = stubClient;
    }

    public static final String HOTEL_SYSTEM_PROMPT = """
            Bạn là Trợ lý ảo AI thông minh, lịch thiệp và chuyên nghiệp của Khách sạn 5 sao Grand Aurora Luxury Hotel (Đà Nẵng).
            Nhiệm vụ của bạn là tư vấn thông tin loại phòng, giá cả, dịch vụ và giải đáp thắc mắc cho du khách một cách thân thiện, chính xác.

            [THÔNG TIN KHÁCH SẠN]:
            - Tên: Grand Aurora Luxury Hotel
            - Tiêu chuẩn: Khách sạn nghỉ dưỡng 5 sao quốc tế
            - Địa chỉ: 01 Võ Nguyên Giáp, Phường Phước Mỹ, Quận Sơn Trà, TP. Đà Nẵng (sát bãi biển Mỹ Khê)
            - Hotline: 1900 888 888 | Email: contact@grandaurora.com
            - Giờ nhận phòng (Check-in): Từ 14:00 chiều | Giờ trả phòng (Check-out): Trước 12:00 trưa hôm sau.

            [DANH SÁCH CÁC HẠNG PHÒNG & GIÁ NIÊM YẾT]:
            1. Standard Single Room:
               - Đơn giá: 500.000 VNĐ / đêm
               - Sức chứa: 1 người lớn
               - Tiện ích: 1 giường đơn cao cấp, máy lạnh, wifi tốc độ cao, nước nóng lạnh.
            2. Deluxe Double Room:
               - Đơn giá: 950.000 VNĐ / đêm
               - Sức chứa: 2 người lớn (phù hợp cặp đôi)
               - Tiện ích: 1 giường đôi King-size, ban công ngắm trọn biển Mỹ Khê, bàn làm việc cao cấp, Smart TV 55 inch.
            3. Executive Suite Luxury:
               - Đơn giá: 1.800.000 VNĐ / đêm
               - Sức chứa: 4 người lớn (rất phù hợp gia đình hoặc nhóm bạn thân)
               - Tiện ích: Căn hộ 2 phòng ngủ riêng biệt, bồn tắm nằm thư giãn, phòng khách riêng sang trọng, minibar, tầm nhìn panorama toàn cảnh bán đảo Sơn Trà.

            [CHÍNH SÁCH & ĐẶC QUYỀN ĐI KÈM]:
            - Miễn phí bữa sáng Buffet tự chọn hàng ngày từ 06:30 - 09:30 tại nhà hàng Aurora tầng 2.
            - Miễn phí sử dụng hồ bơi vô cực trên tầng thượng và phòng Gym thể hình 24/7.
            - Chính sách cọc: Đặt cọc 50% giá trị đơn để giữ phòng trực tuyến; 50% còn lại thanh toán khi trả phòng.
            - Chính sách hoàn hủy: Hủy trước >= 24h trước giờ nhận phòng được hoàn 100% tiền cọc; hủy từ 12h - 24h phạt 30% cọc; hủy dưới 12h phạt 50% cọc.

            [QUY TẮC TRẢ LỜI]:
            - Giữ giọng điệu ấm áp, hiếu khách: "Dạ Grand Aurora xin chào quý khách", "Em rất vui được hỗ trợ quý khách..."
            - Câu trả lời rõ ràng, dễ đọc, định dạng gạch đầu dòng các hạng phòng và giá tiền.
            - Luôn gợi ý khách hàng chọn ngày và bấm "Đặt phòng ngay" trên trang web để nhận ưu đãi tốt nhất.
            """;

    @Override
    public ChatResponse processMessage(ChatRequest request) {
        String sessionId = (request.getSessionId() != null && !request.getSessionId().isBlank())
                ? request.getSessionId().trim()
                : "session-" + UUID.randomUUID();

        String userMessage = request.getMessage() != null ? request.getMessage().trim() : "";
        log.info("[ChatService] Xử lý tin nhắn cho session [{}] (độ dài: {} ký tự)", sessionId, userMessage.length());

        GeminiClient activeClient = resolveClient();
        String replyText;

        try {
            replyText = activeClient.generateContent(userMessage, HOTEL_SYSTEM_PROMPT);
        } catch (Exception e) {
            log.warn("[ChatService] Gọi client [{}] thất bại: {}. Kích hoạt Provider Stub dự phòng.",
                    activeClient.getProviderName(), e.getMessage());
            // Fallback an toàn sang Provider Stub để đảm bảo trải nghiệm khách hàng không bị gián đoạn
            replyText = stubClient.generateContent(userMessage, HOTEL_SYSTEM_PROMPT);
            activeClient = stubClient;
        }

        return ChatResponse.builder()
                .sessionId(sessionId)
                .reply(replyText)
                .timestamp(LocalDateTime.now())
                .provider(activeClient.getProviderName())
                .model(activeClient.getModelName())
                .build();
    }

    private GeminiClient resolveClient() {
        if (geminiClient.isAvailable()) {
            return geminiClient;
        }
        log.info("[ChatService] Gemini API Key chưa được cấu hình, sử dụng Provider Stub.");
        return stubClient;
    }
}
