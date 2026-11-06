package org.example.backend.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Kết quả xử lý từ Model AI (Gemini hoặc Stub):
 * Bao gồm lời phản hồi tự nhiên và dữ liệu có cấu trúc từ tool (nếu có).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatModelResult {
    private String reply;
    @Builder.Default
    private String cardType = "NONE";
    private Object cardData;
    private String provider;
    private String model;
}

