package org.example.backend.chat.service;

import org.example.backend.chat.dto.ChatRequest;
import org.example.backend.chat.dto.ChatResponse;
import org.springframework.security.core.Authentication;

/**
 * Interface nghiệp vụ Chatbot tư vấn khách sạn Grand Aurora
 */
public interface ChatService {

    /**
     * Tiếp nhận và xử lý tin nhắn của người dùng:
     * - Tạo hoặc duy trì sessionId.
     * - Tích hợp tri thức buồng phòng & chính sách khách sạn Grand Aurora vào System Prompt.
     * - Định tuyến tới Gemini Adapter thật hoặc Provider Stub.
     * - Trả về phản hồi dạng ChatResponse.
     *
     * @param request dữ liệu tin nhắn và sessionId từ client
     * @return kết quả phản hồi từ AI
     */
    default ChatResponse processMessage(ChatRequest request) {
        return processMessage(request, null);
    }

    /**
     * Tiếp nhận và xử lý tin nhắn kèm thông tin xác thực tài khoản đăng nhập
     * phục vụ các tool chuẩn bị đặt phòng (prepareBooking theo task [SP2-CHAT-TOOLS-01])
     *
     * @param request dữ liệu tin nhắn và sessionId
     * @param authentication thông tin xác thực từ Spring Security (có thể null nếu khách vãng lai)
     * @return kết quả phản hồi từ AI kèm thẻ giao diện cardType/cardData nếu có
     */
    ChatResponse processMessage(ChatRequest request, Authentication authentication);
}
