package org.example.backend.chat.service;

import org.example.backend.chat.dto.ChatRequest;
import org.example.backend.chat.dto.ChatResponse;

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
    ChatResponse processMessage(ChatRequest request);
}

