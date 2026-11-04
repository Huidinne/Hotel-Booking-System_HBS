package org.example.backend.chat.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO phản hồi tin nhắn từ Chatbot Grand Aurora:
 * POST /api/v1/chat/message -> data
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Dữ liệu phản hồi tin nhắn từ trợ lý ảo Grand Aurora")
public class ChatResponse {

    @Schema(description = "Mã định danh phiên chat", example = "session-123e4567-e89b-12d3-a456-426614174000")
    private String sessionId;

    @Schema(description = "Nội dung phản hồi tư vấn của trợ lý ảo", example = "Dạ chào quý khách! Khách sạn Grand Aurora có hạng phòng Executive Suite Luxury rất phù hợp cho gia đình 4 người...")
    private String reply;

    @Schema(description = "Thời điểm phản hồi", example = "2026-11-04T10:00:00")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime timestamp;

    @Schema(description = "Nhà cung cấp AI xử lý (gemini hoặc stub)", example = "gemini")
    private String provider;

    @Schema(description = "Phiên bản mô hình AI (nếu dùng Gemini)", example = "gemini-3.5-flash-lite")
    private String model;
}

