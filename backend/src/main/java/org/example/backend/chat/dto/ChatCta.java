package org.example.backend.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO Call-To-Action (CTA) cho tin nhắn Chatbot:
 * Cho phép Chatbot đề xuất điều hướng an toàn tới các trang danh mục phòng hoặc đặt phòng
 * Tương thích với bộ lọc allowlist tại Frontend (Yến): /rooms, /rooms/:id, /booking/checkout
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Nút bấm điều hướng hành động nhanh (CTA) đính kèm tin nhắn")
public class ChatCta {

    @Schema(description = "Nhãn hiển thị trên nút bấm CTA", example = "Xem phòng Deluxe Double")
    private String label;

    @Schema(description = "Đường dẫn URL an toàn nội bộ (/rooms, /rooms/:id, /booking/checkout)", example = "/rooms/2")
    private String url;
}

