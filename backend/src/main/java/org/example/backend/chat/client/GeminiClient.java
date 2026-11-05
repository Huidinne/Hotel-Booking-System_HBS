package org.example.backend.chat.client;

import org.example.backend.chat.session.ChatMessage;

import java.util.Collections;
import java.util.List;

/**
 * Interface cho Client giao tiếp với Google Gemini AI:
 * Cho phép linh hoạt chuyển đổi giữa Adapter Gemini thật và Provider Stub giả lập phục vụ kiểm thử.
 * Hỗ trợ cả sinh phản hồi đơn lượt và đa lượt (kèm lịch sử hội thoại).
 */
public interface GeminiClient {

    /**
     * Gửi tin nhắn đơn lẻ và nhận phản hồi văn bản từ Gemini AI
     *
     * @param userMessage tin nhắn câu hỏi từ người dùng
     * @param systemPrompt hướng dẫn nghiệp vụ và bối cảnh khách sạn Grand Aurora
     * @return câu trả lời từ AI
     */
    default String generateContent(String userMessage, String systemPrompt) {
        return generateContentWithHistory(userMessage, systemPrompt, Collections.emptyList());
    }

    /**
     * Gửi tin nhắn kèm lịch sử các lượt trò chuyện trước (Multi-turn Context)
     *
     * @param userMessage tin nhắn hiện tại
     * @param systemPrompt system instruction khách sạn
     * @param history danh sách các tin nhắn trao đổi trước đó giữa khách và bot
     * @return câu trả lời thông minh liền mạch theo ngữ cảnh
     */
    String generateContentWithHistory(String userMessage, String systemPrompt, List<ChatMessage> history);

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
