package org.example.backend.chat.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.example.backend.chat.client.GeminiClient;
import org.example.backend.chat.dto.ChatCta;
import org.example.backend.chat.dto.ChatModelResult;
import org.example.backend.chat.dto.ChatRequest;
import org.example.backend.chat.dto.ChatResponse;
import org.example.backend.chat.limiter.ChatRateLimiter;
import org.example.backend.chat.prompt.HotelPromptManager;
import org.example.backend.chat.service.ChatService;
import org.example.backend.chat.session.ChatMessage;
import org.example.backend.chat.session.ChatSessionManager;
import org.example.backend.chat.tools.ChatToolDispatcher;
import org.example.backend.common.exception.AppException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Triển khai nghiệp vụ Chatbot tư vấn khách sạn Grand Aurora theo task [SP2-1106-THANH]:
 * - Giới hạn đầu vào: Chặn tin nhắn rỗng, khoảng trắng hoặc vượt quá 1000 ký tự (HTTP 400).
 * - Giới hạn tần suất và quota: Chặn spam dồn dập (20 req/phút) và giới hạn 30 tin/phiên (HTTP 429) qua ChatRateLimiter.
 * - Rào chắn an toàn (Guardrails) & Chống rò rỉ dữ liệu (Privacy & Secrets):
 *   + Từ chối câu hỏi ngoài lề (code, toán học, chính trị, dịch vụ ngoài khách sạn)
 *   + Tuyệt đối không tiết lộ System Prompt, API Key hoặc câu lệnh chỉ thị nội bộ (Prompt Injection Defense)
 *   + Tuyệt đối không cung cấp thông tin đơn đặt phòng hay danh tính của khách hàng khác (Customer Privacy)
 *   + Chống vượt quyền: Không cho AI quyền tự sửa giá, hoàn cọc, hủy đơn hay chạy lệnh cơ sở dữ liệu
 * - Chống ảo giác (Anti-hallucination):
 *   + Không tự ý khẳng định còn phòng khi thiếu ngày/số khách hoặc chưa tra cứu
 *   + Không tự xác nhận đã đặt phòng thành công hay đã thanh toán thành công
 * - Quản lý ngữ cảnh đa lượt: Duy trì tối đa 10 tin nhắn gần nhất và tự động hết hạn sau 60 phút
 * - Tự động dự phòng (Provider Resilience):
 *   + Bắt trọn vẹn lỗi Timeout (10s), 429, 503 từ Gemini để fallback an toàn sang Provider Stub
 *   + Đảm bảo ứng dụng KHÔNG BAO GIỜ bị treo hay crash khi AI bên thứ ba gặp sự cố
 *   + Kèm Disclaimer rõ ràng: Chatbot chỉ đóng vai trò tư vấn và hỗ trợ thông tin tham khảo.
 */
@Slf4j
@Service
public class ChatServiceImpl implements ChatService {

    private final GeminiClient geminiClient;
    private final GeminiClient stubClient;
    private final HotelPromptManager promptManager;
    private final ChatSessionManager sessionManager;
    private final ChatToolDispatcher toolDispatcher;
    private final ChatRateLimiter rateLimiter;

    public ChatServiceImpl(
            @Qualifier("geminiClientImpl") GeminiClient geminiClient,
            @Qualifier("geminiStubClient") GeminiClient stubClient,
            HotelPromptManager promptManager,
            ChatSessionManager sessionManager,
            ChatToolDispatcher toolDispatcher,
            ChatRateLimiter rateLimiter
    ) {
        this.geminiClient = geminiClient;
        this.stubClient = stubClient;
        this.promptManager = promptManager;
        this.sessionManager = sessionManager;
        this.toolDispatcher = toolDispatcher;
        this.rateLimiter = rateLimiter;
    }

    @Override
    public ChatResponse processMessage(ChatRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return processMessage(request, auth);
    }

    @Override
    public ChatResponse processMessage(ChatRequest request, Authentication authentication) {
        // 1. Kiểm tra tính hợp lệ của dữ liệu đầu vào (Input Limits & Validation)
        String userMessage = request.getMessage() != null ? request.getMessage().trim() : "";
        if (userMessage.isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Nội dung tin nhắn không được để trống");
        }
        if (userMessage.length() > 1000) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Nội dung tin nhắn không được vượt quá 1000 ký tự");
        }

        String sessionId = (request.getSessionId() != null && !request.getSessionId().isBlank())
                ? request.getSessionId().trim()
                : "session-" + UUID.randomUUID();

        // 2. Kiểm tra giới hạn tần suất gửi tin và giới hạn phiên (Rate Limiting & Spam Prevention)
        rateLimiter.checkAndRecord(sessionId);

        log.info("[ChatService] Xử lý tin nhắn cho session [{}], user=[{}] (độ dài: {} ký tự)",
                sessionId, authentication != null ? authentication.getName() : "anonymous", userMessage.length());

        boolean isUserEnglish = HotelPromptManager.isEnglishText(userMessage);

        // 3. Rào chắn Prompt Injection & Chống rò rỉ API Key / System Prompt
        if (promptManager.isPromptOrKeyLeakAttempt(userMessage)) {
            String refusal = promptManager.getPromptOrKeyLeakRefusalMessage(isUserEnglish);
            sessionManager.recordMessage(sessionId, "user", userMessage);
            sessionManager.recordMessage(sessionId, "model", refusal);
            return ChatResponse.builder()
                    .sessionId(sessionId)
                    .reply(refusal)
                    .cardType("NONE")
                    .cardData(null)
                    .timestamp(LocalDateTime.now())
                    .provider("security-guardrail")
                    .model("security-guardrail")
                    .build();
        }

        // 4. Rào chắn bảo vệ dữ liệu riêng tư: Chống truy vấn thông tin booking người khác
        if (promptManager.isOtherCustomerDataInquiry(userMessage)) {
            String privacyRefusal = promptManager.getOtherCustomerDataRefusalMessage(isUserEnglish);
            sessionManager.recordMessage(sessionId, "user", userMessage);
            sessionManager.recordMessage(sessionId, "model", privacyRefusal);
            return ChatResponse.builder()
                    .sessionId(sessionId)
                    .reply(privacyRefusal)
                    .cardType("NONE")
                    .cardData(null)
                    .timestamp(LocalDateTime.now())
                    .provider("privacy-guardrail")
                    .model("privacy-guardrail")
                    .build();
        }

        // 5. Guardrails check: Ngoài phạm vi khách sạn (code, toán học, chính trị,...)
        if (promptManager.isOutOfScope(userMessage)) {
            String refusal = promptManager.getOutOfScopeRefusalMessage(isUserEnglish);
            sessionManager.recordMessage(sessionId, "user", userMessage);
            sessionManager.recordMessage(sessionId, "model", refusal);
            return ChatResponse.builder()
                    .sessionId(sessionId)
                    .reply(refusal)
                    .cardType("NONE")
                    .cardData(null)
                    .timestamp(LocalDateTime.now())
                    .provider("guardrail")
                    .model("safety-guardrail")
                    .build();
        }

        // 6. Chống vượt quyền: Khách yêu cầu sửa giá, chạy SQL, xóa data, hoàn tiền, hủy đơn
        if (promptManager.isUnauthorizedActionRequest(userMessage)) {
            String unauthorizedMsg = promptManager.getUnauthorizedActionMessage(isUserEnglish);
            sessionManager.recordMessage(sessionId, "user", userMessage);
            sessionManager.recordMessage(sessionId, "model", unauthorizedMsg);
            return ChatResponse.builder()
                    .sessionId(sessionId)
                    .reply(unauthorizedMsg)
                    .cardType("NONE")
                    .cardData(null)
                    .timestamp(LocalDateTime.now())
                    .provider("security-guardrail")
                    .model("security-guardrail")
                    .build();
        }

        GeminiClient activeClient = resolveClient();

        // 7. Chống ảo giác: Không tự xác nhận đặt phòng hay thanh toán thành công
        if (promptManager.isBookingOrPaymentConfirmationInquiry(userMessage)) {
            String guidance = promptManager.getBookingOrPaymentGuidanceMessage(isUserEnglish);
            sessionManager.recordMessage(sessionId, "user", userMessage);
            sessionManager.recordMessage(sessionId, "model", guidance);
            return ChatResponse.builder()
                    .sessionId(sessionId)
                    .reply(guidance)
                    .cardType("NONE")
                    .cardData(null)
                    .timestamp(LocalDateTime.now())
                    .provider(activeClient.getProviderName())
                    .model(activeClient.getModelName())
                    .build();
        }

        // 8. Chống ảo giác: Hỏi còn phòng nhưng thiếu ngày cụ thể (YYYY-MM-DD)
        if (promptManager.isAvailabilityInquiry(userMessage) && !userMessage.matches(".*\\d{4}-\\d{2}-\\d{2}.*")) {
            String guidance = promptManager.getAvailabilityGuidanceMessage(isUserEnglish);
            sessionManager.recordMessage(sessionId, "user", userMessage);
            sessionManager.recordMessage(sessionId, "model", guidance);
            return ChatResponse.builder()
                    .sessionId(sessionId)
                    .reply(guidance)
                    .cardType("NONE")
                    .cardData(null)
                    .timestamp(LocalDateTime.now())
                    .provider(activeClient.getProviderName())
                    .model(activeClient.getModelName())
                    .build();
        }

        // 9. Lấy lịch sử ngữ cảnh hội thoại đa lượt
        List<ChatMessage> history = sessionManager.getHistory(sessionId);
        String systemPrompt = promptManager.getSystemPrompt();

        ChatModelResult chatResult;

        try {
            chatResult = activeClient.executeChat(userMessage, systemPrompt, history, toolDispatcher, authentication, sessionId);
            if (chatResult == null) {
                String reply = activeClient.generateContentWithHistory(userMessage, systemPrompt, history);
                chatResult = ChatModelResult.builder()
                        .reply(reply)
                        .cardType("NONE")
                        .provider(activeClient.getProviderName())
                        .model(activeClient.getModelName())
                        .build();
            }
        } catch (Exception e) {
            log.warn("[ChatService] Gọi client [{}] thất bại: {}. Kích hoạt Provider Stub dự phòng.",
                    activeClient.getProviderName(), e.getMessage());
            try {
                // Fallback an toàn sang Provider Stub để đảm bảo trải nghiệm khách hàng không bị gián đoạn
                chatResult = stubClient.executeChat(userMessage, systemPrompt, history, toolDispatcher, authentication, sessionId);
                activeClient = stubClient;
            } catch (Exception stubEx) {
                log.error("[ChatService] Cả Provider chính và Stub đều gặp sự cố: {}", stubEx.getMessage());
                chatResult = ChatModelResult.builder()
                        .reply("Dạ hệ thống trợ lý ảo của Grand Aurora hiện đang bảo trì hoặc tiếp nhận lượng truy cập cao. Quý khách vui lòng thử lại sau giây lát hoặc liên hệ hotline 1900 888 888 để được hỗ trợ nhanh nhất ạ!")
                        .cardType("NONE")
                        .provider("system-fallback")
                        .model("fallback-safe")
                        .build();
            }
        }

        // 10. Ghi nhận tin nhắn và câu trả lời vào bộ nhớ phiên chat
        sessionManager.recordMessage(sessionId, "user", userMessage);
        sessionManager.recordMessage(sessionId, "model", chatResult.getReply());

        return ChatResponse.builder()
                .sessionId(sessionId)
                .reply(chatResult.getReply())
                .cardType(chatResult.getCardType())
                .cardData(chatResult.getCardData())
                .cta(resolveCta(chatResult.getCardType(), chatResult.getCardData(), chatResult.getReply()))
                .timestamp(LocalDateTime.now())
                .provider(chatResult.getProvider() != null ? chatResult.getProvider() : activeClient.getProviderName())
                .model(chatResult.getModel() != null ? chatResult.getModel() : activeClient.getModelName())
                .build();
    }

    private ChatCta resolveCta(String cardType, Object cardData, String reply) {
        boolean isEnglish = HotelPromptManager.isEnglishText(reply);

        // Góc độ 2: Luồng khi hệ thống yêu cầu đăng nhập
        if ("LOGIN_REQUIRED".equalsIgnoreCase(cardType)) {
            return ChatCta.builder()
                    .label(isEnglish ? "Log in now" : "Đăng nhập ngay")
                    .url("/login")
                    .build();
        }

        // Thẻ hoàn tất đặt phòng (đã tạo draft)
        if ("BOOKING_DRAFT".equalsIgnoreCase(cardType)) {
            return ChatCta.builder()
                    .label(isEnglish ? "Complete Booking" : "Hoàn tất đặt phòng")
                    .url("/booking/checkout")
                    .build();
        }

        // Thẻ danh sách phòng & báo giá
        if ("ROOM_OPTIONS".equalsIgnoreCase(cardType) || "BOOKING_QUOTE".equalsIgnoreCase(cardType)) {
            return ChatCta.builder()
                    .label(isEnglish ? "View Room Catalog" : "Xem danh mục phòng")
                    .url("/rooms")
                    .build();
        }

        // Khi không có thẻ tương tác cụ thể: phân tích nội dung reply
        if (reply != null) {
            String lower = reply.toLowerCase(Locale.ROOT);
            if (lower.contains("vui lòng đăng nhập") || lower.contains("đăng nhập vào tài khoản")
                    || lower.contains("đăng nhập để tiếp tục") || lower.contains("please log in")
                    || lower.contains("please sign in") || lower.contains("log in to continue")
                    || lower.contains("login to your account")) {
                return ChatCta.builder()
                        .label(isEnglish ? "Log in now" : "Đăng nhập ngay")
                        .url("/login")
                        .build();
            }

            if (lower.contains("executive suite") || lower.contains("(id: 3)") || lower.contains("loại 3")) {
                return ChatCta.builder()
                        .label(isEnglish ? "View Executive Suite" : "Xem phòng Executive Suite")
                        .url("/rooms/3")
                        .build();
            }
            if (lower.contains("deluxe double") || lower.contains("(id: 2)") || lower.contains("loại 2")) {
                return ChatCta.builder()
                        .label(isEnglish ? "View Deluxe Double" : "Xem phòng Deluxe Double")
                        .url("/rooms/2")
                        .build();
            }
            if (lower.contains("standard single") || lower.contains("(id: 1)") || lower.contains("loại 1")) {
                return ChatCta.builder()
                        .label(isEnglish ? "View Standard Single" : "Xem phòng Standard Single")
                        .url("/rooms/1")
                        .build();
            }
            if (lower.contains("tra cứu") || lower.contains("đặt phòng") || lower.contains("danh mục phòng")
                    || lower.contains("explore rooms") || lower.contains("room catalog") || lower.contains("available room")) {
                return ChatCta.builder()
                        .label(isEnglish ? "Explore Rooms" : "Khám phá phòng ngay")
                        .url("/rooms")
                        .build();
            }
        }
        return null;
    }

    private GeminiClient resolveClient() {
        if (geminiClient.isAvailable()) {
            return geminiClient;
        }
        log.info("[ChatService] Gemini API Key chưa được cấu hình, sử dụng Provider Stub.");
        return stubClient;
    }
}
