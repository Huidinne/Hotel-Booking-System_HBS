package org.example.backend.chat.client;

/**
 * Interface cho Client giao tiếp với Google Gemini AI:
 * Cho phép linh hoạt chuyển đổi giữa Adapter Gemini thật và Provider Stub giả lập phục vụ kiểm thử.
 */
public interface GeminiClient {

    /**
     * Gửi tin nhắn và nhận phản hồi văn bản từ Gemini AI
     *
     * @param userMessage tin nhắn câu hỏi từ người dùng
     * @param systemPrompt hướng dẫn nghiệp vụ và bối cảnh khách sạn Grand Aurora
     * @return câu trả lời từ AI
     */
    String generateContent(String userMessage, String systemPrompt);

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

