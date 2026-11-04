package org.example.backend.chat.client.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.chat.client.GeminiClient;
import org.example.backend.chat.config.GeminiProperties;
import org.example.backend.common.exception.AppException;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Adapter gọi trực tiếp Google Gemini Generative Language REST API:
 * POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}
 */
@Slf4j
@Component("geminiClientImpl")
@RequiredArgsConstructor
public class GeminiClientImpl implements GeminiClient {

    private final GeminiProperties properties;
    private final ObjectMapper objectMapper;

    public static final String PROVIDER_NAME = "gemini";

    @Override
    public String generateContent(String userMessage, String systemPrompt) {
        if (!isAvailable()) {
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "Gemini API Key chưa được cấu hình trong hệ thống");
        }

        String targetModel = (properties.getModel() != null && !properties.getModel().isBlank())
                ? properties.getModel() : "gemini-3.5-flash-lite";

        String url = String.format("%s/%s:generateContent?key=%s",
                properties.getApiUrl(), targetModel, properties.getApiKey());

        log.info("[GeminiClientImpl] Gửi yêu cầu generateContent tới model [{}]", targetModel);

        try {
            RestTemplate restTemplate = createRestTemplate(properties.getTimeoutMs());

            Map<String, Object> requestBody = buildRequestBody(userMessage, systemPrompt);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

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

    private Map<String, Object> buildRequestBody(String userMessage, String systemPrompt) {
        Map<String, Object> root = new HashMap<>();

        // 1. User message content
        Map<String, Object> userContent = Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", userMessage))
        );
        root.put("contents", List.of(userContent));

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

    private RestTemplate createRestTemplate(int timeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeoutMs > 0 ? timeoutMs : 10000);
        factory.setReadTimeout(timeoutMs > 0 ? timeoutMs : 10000);
        return new RestTemplate(factory);
    }
}

