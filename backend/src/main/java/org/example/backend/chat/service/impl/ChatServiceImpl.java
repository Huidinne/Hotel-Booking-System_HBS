package org.example.backend.chat.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.example.backend.chat.client.GeminiClient;
import org.example.backend.chat.dto.ChatRequest;
import org.example.backend.chat.dto.ChatResponse;
import org.example.backend.chat.prompt.HotelPromptManager;
import org.example.backend.chat.service.ChatService;
import org.example.backend.chat.session.ChatMessage;
import org.example.backend.chat.session.ChatSessionManager;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Triển khai nghiệp vụ Chatbot tư vấn khách sạn Grand Aurora theo task [SP2-1105-THANH] / [SP2-BE-03]:
 * - Tích hợp quản lý System Prompt chuẩn 5 sao qua HotelPromptManager
 * - Rào chắn an toàn (Guardrails): từ chối câu hỏi ngoài phạm vi khách sạn
 * - Chống ảo giác (Anti-hallucination):
 *   + Tuyệt đối KHÔNG tự khẳng định còn phòng / hết phòng theo ngày cụ thể -> hướng sang trang tra cứu tìm phòng
 *   + Tuyệt đối KHÔNG tự xác nhận đã đặt phòng hay thanh toán thành công -> hướng dẫn qua quy trình VNPay & email
 * - Duy trì ngữ cảnh hội thoại đa lượt (Multi-turn Context) theo sessionId qua ChatSessionManager
 * - Tự động Fallback sang Provider Stub khi Gemini gặp sự cố (timeout, 429, 503, thiếu key)
 */
@Slf4j
@Service
public class ChatServiceImpl implements ChatService {

    private final GeminiClient geminiClient;
    private final GeminiClient stubClient;
    private final HotelPromptManager promptManager;
    private final ChatSessionManager sessionManager;

    public ChatServiceImpl(
            @Qualifier("geminiClientImpl") GeminiClient geminiClient,
            @Qualifier("geminiStubClient") GeminiClient stubClient,
            HotelPromptManager promptManager,
            ChatSessionManager sessionManager
    ) {
        this.geminiClient = geminiClient;
        this.stubClient = stubClient;
        this.promptManager = promptManager;
        this.sessionManager = sessionManager;
    }

    @Override
    public ChatResponse processMessage(ChatRequest request) {
        String sessionId = (request.getSessionId() != null && !request.getSessionId().isBlank())
                ? request.getSessionId().trim()
                : "session-" + UUID.randomUUID();

        String userMessage = request.getMessage() != null ? request.getMessage().trim() : "";
        log.info("[ChatService] Xử lý tin nhắn cho session [{}] (độ dài: {} ký tự)", sessionId, userMessage.length());

        // 1. Guardrails check: Nếu người dùng cố ý hỏi câu hỏi ngoài lề (code, toán học, chính trị,...)
        if (promptManager.isOutOfScope(userMessage)) {
            String refusal = promptManager.getOutOfScopeRefusalMessage();
            sessionManager.recordMessage(sessionId, "user", userMessage);
            sessionManager.recordMessage(sessionId, "model", refusal);
            return ChatResponse.builder()
                    .sessionId(sessionId)
                    .reply(refusal)
                    .timestamp(LocalDateTime.now())
                    .provider("guardrail")
                    .model("safety-guardrail")
                    .build();
        }

        GeminiClient activeClient = resolveClient();

        // 2. Chống ảo giác: Không tự khẳng định còn phòng theo ngày; hướng sang trang tra cứu phòng online
        if (promptManager.isAvailabilityInquiry(userMessage)) {
            String guidance = promptManager.getAvailabilityGuidanceMessage();
            sessionManager.recordMessage(sessionId, "user", userMessage);
            sessionManager.recordMessage(sessionId, "model", guidance);
            return ChatResponse.builder()
                    .sessionId(sessionId)
                    .reply(guidance)
                    .timestamp(LocalDateTime.now())
                    .provider(activeClient.getProviderName())
                    .model(activeClient.getModelName())
                    .build();
        }

        // 3. Chống ảo giác: Không tự xác nhận đặt phòng hay thanh toán thành công
        if (promptManager.isBookingOrPaymentConfirmationInquiry(userMessage)) {
            String guidance = promptManager.getBookingOrPaymentGuidanceMessage();
            sessionManager.recordMessage(sessionId, "user", userMessage);
            sessionManager.recordMessage(sessionId, "model", guidance);
            return ChatResponse.builder()
                    .sessionId(sessionId)
                    .reply(guidance)
                    .timestamp(LocalDateTime.now())
                    .provider(activeClient.getProviderName())
                    .model(activeClient.getModelName())
                    .build();
        }

        // 4. Lấy lịch sử ngữ cảnh hội thoại đa lượt
        List<ChatMessage> history = sessionManager.getHistory(sessionId);
        String systemPrompt = promptManager.getSystemPrompt();

        String replyText;

        try {
            replyText = activeClient.generateContentWithHistory(userMessage, systemPrompt, history);
        } catch (Exception e) {
            log.warn("[ChatService] Gọi client [{}] thất bại: {}. Kích hoạt Provider Stub dự phòng.",
                    activeClient.getProviderName(), e.getMessage());
            // Fallback an toàn sang Provider Stub để đảm bảo trải nghiệm khách hàng không bị gián đoạn
            replyText = stubClient.generateContentWithHistory(userMessage, systemPrompt, history);
            activeClient = stubClient;
        }

        // 5. Ghi nhận tin nhắn và câu trả lời vào bộ nhớ phiên chat
        sessionManager.recordMessage(sessionId, "user", userMessage);
        sessionManager.recordMessage(sessionId, "model", replyText);

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
