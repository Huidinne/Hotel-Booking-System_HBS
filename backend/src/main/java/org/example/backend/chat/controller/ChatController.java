package org.example.backend.chat.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.booking.dto.BookingResponse;
import org.example.backend.chat.dto.ChatRequest;
import org.example.backend.chat.dto.ChatResponse;
import org.example.backend.chat.dto.ConfirmBookingDraftRequest;
import org.example.backend.chat.service.ChatBookingConfirmationService;
import org.example.backend.chat.service.ChatService;
import org.example.backend.common.exception.AppException;
import org.example.backend.common.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Controller Chatbot tư vấn khách sạn Grand Aurora theo task [SP2-CHAT-TOOLS-01]:
 * - POST /api/v1/chat/message: Tiếp nhận câu hỏi, tự động gọi Tool tra cứu phòng, báo giá, chuẩn bị bản nháp.
 * - POST /api/v1/chat/booking/confirm: Khách hàng bấm nút "Xác nhận đặt phòng" trên thẻ giao diện để chốt đơn PENDING.
 *   (Yêu cầu đăng nhập, kiểm tra draftId, idempotencyKey, quyền sở hữu, giá hiện hành và pessimistic lock).
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Tag(name = "Chatbot API", description = "Endpoint tư vấn đặt phòng, gọi Tool AI và xác nhận đặt phòng qua Chat")
public class ChatController {

    private final ChatService chatService;
    private final ChatBookingConfirmationService bookingConfirmationService;

    /**
     * Gửi tin nhắn và nhận phản hồi từ Chatbot (Hỗ trợ Tool Function Calling)
     * POST /api/v1/chat/message
     *
     * @param request payload chứa sessionId và nội dung tin nhắn message
     * @param authentication thông tin xác thực nếu khách đã đăng nhập
     * @return ChatResponse kèm cardType / cardData nếu có
     */
    @PostMapping("/message")
    @Operation(summary = "Gửi tin nhắn tư vấn và nhận phản hồi từ Chatbot Grand Aurora (Hỗ trợ Tool Function Calling)")
    public ResponseEntity<ApiResponse<ChatResponse>> sendMessage(
            @Valid @RequestBody ChatRequest request,
            Authentication authentication
    ) {
        log.info("[ChatController] Tiếp nhận tin nhắn: sessionId=[{}], user=[{}], messageLength={}",
                request.getSessionId(),
                authentication != null ? authentication.getName() : "anonymous",
                request.getMessage() != null ? request.getMessage().length() : 0);

        ChatResponse response = chatService.processMessage(request, authentication);
        return ResponseEntity.ok(ApiResponse.ok("Phản hồi tin nhắn thành công", response));
    }

    /**
     * Khách hàng bấm nút "Xác nhận đặt phòng" trên thẻ giao diện Chat
     * POST /api/v1/chat/booking/confirm
     *
     * @param request thông tin xác nhận: draftId, idempotencyKey, paymentMethod, note
     * @param authentication bắt buộc đăng nhập (Customer)
     * @return BookingResponse chứa mã đặt phòng và trạng thái PENDING
     */
    @PostMapping("/booking/confirm")
    @Operation(summary = "Xác nhận bản nháp đặt phòng từ thẻ giao diện Chat (Tạo đơn đặt phòng trạng thái PENDING)")
    public ResponseEntity<ApiResponse<BookingResponse>> confirmBookingDraft(
            @Valid @RequestBody ConfirmBookingDraftRequest request,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equalsIgnoreCase(authentication.getName())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Quý khách vui lòng đăng nhập tài khoản để xác nhận đặt phòng");
        }

        String userEmail = authentication.getName();
        log.info("[ChatController] Xác nhận đặt phòng từ chat: draftId=[{}], idempotencyKey=[{}], user=[{}]",
                request.getDraftId(), request.getIdempotencyKey(), userEmail);

        BookingResponse response = bookingConfirmationService.confirmBookingDraft(request, userEmail);
        return ResponseEntity.ok(ApiResponse.ok("Xác nhận tạo đơn đặt phòng thành công", response));
    }
}
