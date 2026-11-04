package org.example.backend.chat.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Cấu hình tham số kết nối Google Gemini API:
 * Tải từ application.yaml hoặc biến môi trường GEMINI_*
 */
@Data
@Component
@ConfigurationProperties(prefix = "gemini")
public class GeminiProperties {

    /**
     * Khóa API Google AI Studio (Gemini API Key)
     */
    private String apiKey = "";

    /**
     * Tên mô hình Gemini (mặc định: gemini-3.5-flash-lite)
     */
    private String model = "gemini-3.5-flash-lite";

    /**
     * URL gốc của Google Generative Language API
     */
    private String apiUrl = "https://generativelanguage.googleapis.com/v1beta/models";

    /**
     * Thời gian chờ gọi API (milliseconds)
     */
    private int timeoutMs = 10000;
}

