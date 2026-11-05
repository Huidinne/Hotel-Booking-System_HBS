package org.example.backend.chat.session;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Một tin nhắn trong lịch sử hội thoại nhiều lượt (Multi-turn Chat)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {
    /**
     * "user" hoặc "model" (theo chuẩn Google Gemini API)
     */
    private String role;
    private String text;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}

