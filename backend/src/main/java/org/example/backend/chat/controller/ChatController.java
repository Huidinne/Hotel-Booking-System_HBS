package org.example.backend.chat.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.chat.dto.ChatRequest;
import org.example.backend.chat.dto.ChatResponse;
import org.example.backend.chat.service.ChatService;
import org.example.backend.common.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller Chatbot tư vấn khách sạn Grand Aurora:
 * - Chuẩn REST: POST /api/v1/chat/message
 * - Cho phép truy cập công khai (Public) để du khách và khách hàng chưa đăng nhập đều có thể chat hỏi đáp.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Tag(name = "Chatbot API", description = "Endpoint tư vấn đặt phòng và giải đáp thắc mắc tự động qua AI")
public class ChatController {

    private final ChatService chatService;

    /**
     * Gửi tin nhắn và nhận phản hồi từ Chatbot
     * POST /api/v1/chat/message
     *
     * @param request payload chứa sessionId và nội dung tin nhắn message
     * @return ChatResponse bọc trong ApiResponse chuẩn
     */
    @PostMapping("/message")
    @Operation(summary = "Gửi tin nhắn tư vấn và nhận phản hồi từ Chatbot Grand Aurora")
    public ResponseEntity<ApiResponse<ChatResponse>> sendMessage(@Valid @RequestBody ChatRequest request) {
        log.info("[ChatController] Tiếp nhận tin nhắn: sessionId=[{}], messageLength={}",
                request.getSessionId(), request.getMessage() != null ? request.getMessage().length() : 0);

        ChatResponse response = chatService.processMessage(request);
        return ResponseEntity.ok(ApiResponse.ok("Phản hồi tin nhắn thành công", response));
    }
}

