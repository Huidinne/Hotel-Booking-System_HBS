package org.example.backend.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO yêu cầu gửi tin nhắn đến Chatbot Grand Aurora:
 * POST /api/v1/chat/message
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Payload gửi tin nhắn đến trợ lý ảo Grand Aurora")
public class ChatRequest {

    @Schema(description = "Mã phiên trò chuyện (Client có thể gửi để tiếp tục ngữ cảnh, hoặc để null để Server tự cấp)", example = "session-123e4567-e89b-12d3-a456-426614174000")
    @Size(max = 100, message = "Session ID không được vượt quá 100 ký tự")
    private String sessionId;

    @Schema(description = "Nội dung câu hỏi hoặc tin nhắn của khách hàng", requiredMode = Schema.RequiredMode.REQUIRED, example = "Khách sạn có những loại phòng nào cho gia đình 4 người?")
    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    @Size(max = 1000, message = "Nội dung tin nhắn không được vượt quá 1000 ký tự")
    private String message;
}

