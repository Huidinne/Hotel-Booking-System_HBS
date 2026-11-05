package org.example.backend.chat.client.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.chat.client.GeminiClient;
import org.example.backend.chat.config.GeminiProperties;
import org.example.backend.chat.session.ChatMessage;
import org.example.backend.common.exception.AppException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;

import java.util.*;

/**
 * Adapter gọi trực tiếp Google Gemini Generative Language REST API sử dụng Spring RestClient:
 * POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}
 * - Hỗ trợ thiết lập Timeout (Connect Timeout & Read Timeout) qua SimpleClientHttpRequestFactory
 * - Hỗ trợ gửi mảng lịch sử đa lượt (Multi-turn Context)
 * - Tự động bắt và phân loại các lỗi 429 Rate Limit, 503 Overload, Timeout để kích hoạt Fallback
 */
@Slf4j
@Component("geminiClientImpl")
@RequiredArgsConstructor
public class GeminiClientImpl implements GeminiClient {

    private final GeminiProperties properties;
    private final ObjectMapper objectMapper;

    public static final String PROVIDER_NAME = "gemini";

    @Override
    public String generateContentWithHistory(String userMessage, String systemPrompt, List<ChatMessage> history) {
        if (!isAvailable()) {
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "Gemini API Key chưa được cấu hình trong hệ thống");
        }

        String targetModel = (properties.getModel() != null && !properties.getModel().isBlank())
                ? properties.getModel() : "gemini-3.5-flash-lite";

        String url = String.format("%s/%s:generateContent?key=%s",
                properties.getApiUrl(), targetModel, properties.getApiKey());

        int historySize = (history != null) ? history.size() : 0;
        log.info("[GeminiClientImpl] Gửi yêu cầu generateContent tới model [{}] với {} lượt hội thoại lịch sử",
                targetModel, historySize);

        try {
            RestClient restClient = createRestClient(properties.getTimeoutMs());
            Map<String, Object> requestBody = buildRequestBody(userMessage, systemPrompt, history);

            ResponseEntity<String> response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .toEntity(String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return parseReplyText(response.getBody());
            }

            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Không nhận được phản hồi hợp lệ từ Gemini API");

        } catch (HttpClientErrorException.TooManyRequests e) {
            log.error("[GeminiClientImpl] Gemini API Rate Limit (429): {}", e.getMessage());
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS, "Gemini API đang bị giới hạn tần suất yêu cầu (429 Rate Limit). Vui lòng thử lại sau.");

        } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.Forbidden e) {
            log.error("[GeminiClientImpl] Lỗi xác thực Gemini API Key (401/403): {}", e.getMessage());
            throw new AppException(HttpStatus.UNAUTHORIZED, "Gemini API Key không hợp lệ hoặc không có quyền truy cập");

        } catch (HttpClientErrorException.BadRequest e) {
            log.error("[GeminiClientImpl] Yêu cầu không hợp lệ tới Gemini (400): {}", e.getResponseBodyAsString());
            throw new AppException(HttpStatus.BAD_REQUEST, "Yêu cầu tới Gemini API không hợp lệ: " + extractErrorMessage(e.getResponseBodyAsString()));

        } catch (HttpServerErrorException.ServiceUnavailable e) {
            log.error("[GeminiClientImpl] Dịch vụ Gemini quá tải (503): {}", e.getMessage());
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "Dịch vụ Gemini AI hiện đang quá tải hoặc bảo trì (503). Vui lòng thử lại sau.");

        } catch (ResourceAccessException e) {
            log.error("[GeminiClientImpl] Timeout kết nối tới Gemini API: {}", e.getMessage());
            throw new AppException(HttpStatus.GATEWAY_TIMEOUT, "Quá thời gian kết nối (Timeout) tới Google Gemini AI.");

        } catch (AppException e) {
            throw e;

        } catch (Exception e) {
            log.error("[GeminiClientImpl] Lỗi không xác định khi gọi Gemini API: {}", e.getMessage(), e);
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi kết nối tới dịch vụ AI: " + e.getMessage());
        }
    }

    @Override
    public String getProviderName() {
        return PROVIDER_NAME;
    }

    @Override
    public String getModelName() {
        return properties.getModel() != null ? properties.getModel() : "gemini-3.5-flash-lite";
    }

    @Override
    public boolean isAvailable() {
        String key = properties.getApiKey();
        return key != null && !key.isBlank() && !key.trim().startsWith("your_");
    }

    private Map<String, Object> buildRequestBody(String userMessage, String systemPrompt, List<ChatMessage> history) {
        Map<String, Object> root = new HashMap<>();

        // 1. Build contents array with multi-turn conversation history
        List<Map<String, Object>> contents = new ArrayList<>();

        if (history != null && !history.isEmpty()) {
            for (ChatMessage msg : history) {
                if (msg.getText() != null && !msg.getText().isBlank()) {
                    String role = "model".equalsIgnoreCase(msg.getRole()) ? "model" : "user";
                    contents.add(Map.of(
                            "role", role,
                            "parts", List.of(Map.of("text", msg.getText()))
                    ));
                }
            }
        }

        // Add current user message
        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", userMessage))
        ));
        root.put("contents", contents);

        // 2. System Instruction (nếu có)
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            Map<String, Object> sysInstruction = Map.of(
                    "parts", List.of(Map.of("text", systemPrompt))
            );
            root.put("systemInstruction", sysInstruction);
        }

        // 3. Generation configuration
        Map<String, Object> genConfig = Map.of(
                "temperature", 0.7,
                "maxOutputTokens", 1000
        );
        root.put("generationConfig", genConfig);

        return root;
    }

    private String parseReplyText(String jsonResponse) {
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    return parts.get(0).path("text").asText();
                }
            }
            log.warn("[GeminiClientImpl] Không tìm thấy trường text trong phản hồi: {}", jsonResponse);
            return "Dạ cảm ơn quý khách đã liên hệ với Grand Aurora Luxury Hotel!";
        } catch (Exception e) {
            log.error("[GeminiClientImpl] Lỗi parse JSON phản hồi Gemini: {}", e.getMessage());
            return "Dạ cảm ơn quý khách đã liên hệ với Grand Aurora Luxury Hotel!";
        }
    }

    private String extractErrorMessage(String errorJson) {
        try {
            JsonNode root = objectMapper.readTree(errorJson);
            return root.path("error").path("message").asText(errorJson);
        } catch (Exception e) {
            return errorJson;
        }
    }

    private RestClient createRestClient(int timeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        int timeout = timeoutMs > 0 ? timeoutMs : 10000;
        factory.setConnectTimeout(timeout);
        factory.setReadTimeout(timeout);

        return RestClient.builder()
                .requestFactory(factory)
                .build();
    }
}
