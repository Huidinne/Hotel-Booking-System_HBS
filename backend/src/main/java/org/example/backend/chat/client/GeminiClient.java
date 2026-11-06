package org.example.backend.chat.client;

import org.example.backend.chat.dto.ChatModelResult;
import org.example.backend.chat.session.ChatMessage;
import org.example.backend.chat.tools.ChatToolDispatcher;
import org.springframework.security.core.Authentication;

import java.util.Collections;
import java.util.List;

/**
 * Interface cho Client giao tiếp với Google Gemini AI:
 * Cho phép linh hoạt chuyển đổi giữa Adapter Gemini thật và Provider Stub giả lập phục vụ kiểm thử.
 * Hỗ trợ:
 * - Sinh phản hồi đơn lượt và đa lượt (kèm lịch sử hội thoại)
 * - Tích hợp Function Calling / Tools gọi hàm nghiệp vụ khách sạn (task [SP2-CHAT-TOOLS-01])
 */
public interface GeminiClient {

    /**
     * Gửi tin nhắn đơn lẻ và nhận phản hồi văn bản từ Gemini AI
     */
    default String generateContent(String userMessage, String systemPrompt) {
        return generateContentWithHistory(userMessage, systemPrompt, Collections.emptyList());
    }

    /**
     * Gửi tin nhắn kèm lịch sử các lượt trò chuyện trước (Multi-turn Context)
     */
    String generateContentWithHistory(String userMessage, String systemPrompt, List<ChatMessage> history);

    /**
     * Thực thi chat nâng cao hỗ trợ Function Calling (gọi tool tra phòng, báo giá, chuẩn bị draft)
     */
    default ChatModelResult executeChat(String userMessage,
                                       String systemPrompt,
                                       List<ChatMessage> history,
                                       ChatToolDispatcher toolDispatcher,
                                       Authentication authentication,
                                       String sessionId) {
        String reply = generateContentWithHistory(userMessage, systemPrompt, history);
        return ChatModelResult.builder()
                .reply(reply)
                .cardType("NONE")
                .provider(getProviderName())
                .model(getModelName())
                .build();
    }

    /**
     * Tên nhà cung cấp (ví dụ: "gemini" hoặc "stub")
     */
    String getProviderName();

    /**
     * Tên mô hình AI đang được sử dụng
     */
    String getModelName();

    /**
     * Kiểm tra client có sẵn sàng (đã cấu hình API key hợp lệ) hay không
     */
    boolean isAvailable();
}
