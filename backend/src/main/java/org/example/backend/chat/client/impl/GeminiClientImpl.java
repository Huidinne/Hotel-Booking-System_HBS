package org.example.backend.chat.client.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.chat.client.GeminiClient;
import org.example.backend.chat.config.GeminiProperties;
import org.example.backend.chat.dto.ChatModelResult;
import org.example.backend.chat.session.ChatMessage;
import org.example.backend.chat.tools.ChatToolDispatcher;
import org.example.backend.chat.tools.ChatToolNames;
import org.example.backend.chat.tools.ToolCallResult;
import org.example.backend.common.exception.AppException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;

import java.util.*;

/**
 * Adapter gọi trực tiếp Google Gemini Generative Language REST API sử dụng Spring RestClient:
 * POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}
 * - Hỗ trợ thiết lập Timeout (Connect Timeout & Read Timeout) có cấu hình qua SimpleClientHttpRequestFactory
 * - Hỗ trợ gửi mảng lịch sử đa lượt (Multi-turn Context)
 * - Hỗ trợ Gemini Function Calling / Tools theo task [SP2-CHAT-TOOLS-01] với tối đa 3 vòng gọi tool:
 *   + searchAvailableRooms
 *   + getRoomTypeDetails
 *   + getBookingQuote
 *   + prepareBooking
 * - Tự động bắt và phân loại rõ ràng các lỗi:
 *   + Thiếu hoặc sai API Key (401/403/ServiceUnavailable)
 *   + Hạn mức yêu cầu / Quota (429 Too Many Requests)
 *   + Quá tải hệ thống (503 Service Unavailable)
 *   + Hết thời gian chờ (Gateway Timeout do ResourceAccessException)
 */
@Slf4j
@Component("geminiClientImpl")
public class GeminiClientImpl implements GeminiClient {

    private final GeminiProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public static final String PROVIDER_NAME = "gemini";
    private static final int MAX_TOOL_TURNS = 3;

    @Autowired
    public GeminiClientImpl(GeminiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        int timeout = properties.getTimeoutMs() > 0 ? properties.getTimeoutMs() : 10000;
        factory.setConnectTimeout(timeout);
        factory.setReadTimeout(timeout);

        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .build();
    }

    public GeminiClientImpl(GeminiProperties properties, ObjectMapper objectMapper, RestClient restClient) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.restClient = restClient;
    }

    @Override
    public String generateContentWithHistory(String userMessage, String systemPrompt, List<ChatMessage> history) {
        ChatModelResult result = executeChat(userMessage, systemPrompt, history, null, null, null);
        return result.getReply();
    }

    @Override
    public ChatModelResult executeChat(String userMessage,
                                       String systemPrompt,
                                       List<ChatMessage> history,
                                       ChatToolDispatcher toolDispatcher,
                                       Authentication authentication,
                                       String sessionId) {
        if (!isAvailable()) {
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "Gemini API Key bị thiếu hoặc chưa được cấu hình trong hệ thống");
        }

        String targetModel = (properties.getModel() != null && !properties.getModel().isBlank())
                ? properties.getModel() : "gemini-3.5-flash-lite";

        String url = String.format("%s/%s:generateContent?key=%s",
                properties.getApiUrl(), targetModel, properties.getApiKey());

        // Xây dựng hội thoại ban đầu
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
        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", userMessage))
        ));

        List<Map<String, Object>> tools = (toolDispatcher != null) ? buildToolDeclarations() : null;

        String lastCardType = "NONE";
        Object lastCardData = null;
        String finalReply = null;

        int turns = 0;
        while (turns < MAX_TOOL_TURNS) {
            turns++;
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("contents", contents);

            if (systemPrompt != null && !systemPrompt.isBlank()) {
                requestBody.put("systemInstruction", Map.of(
                        "parts", List.of(Map.of("text", systemPrompt))
                ));
            }

            if (tools != null) {
                requestBody.put("tools", tools);
            }

            requestBody.put("generationConfig", Map.of(
                    "temperature", 0.7,
                    "maxOutputTokens", 1000
            ));

            String responseBody = sendGenerateContentRequest(url, requestBody);
            JsonNode candidate = extractFirstCandidate(responseBody);
            if (candidate == null) {
                finalReply = "Dạ cảm ơn quý khách đã liên hệ với Grand Aurora Luxury Hotel!";
                break;
            }

            JsonNode contentNode = candidate.path("content");
            JsonNode parts = contentNode.path("parts");

            // Kiểm tra xem Gemini có trả về Function Call hay không
            JsonNode functionCallNode = null;
            StringBuilder textContent = new StringBuilder();

            if (parts.isArray()) {
                for (JsonNode part : parts) {
                    if (part.has("functionCall")) {
                        functionCallNode = part.path("functionCall");
                    }
                    if (part.has("text")) {
                        textContent.append(part.path("text").asText()).append(" ");
                    }
                }
            }

            // Nếu không có tool call hoặc không có tool dispatcher -> hoàn thành
            if (functionCallNode == null || toolDispatcher == null) {
                String text = textContent.toString().trim();
                finalReply = !text.isEmpty() ? text : "Dạ cảm ơn quý khách đã liên hệ với Grand Aurora Luxury Hotel!";
                break;
            }

            // Có Function Call: trích xuất tên hàm và tham số
            String functionName = functionCallNode.path("name").asText();
            JsonNode argsNode = functionCallNode.path("args");
            Map<String, Object> args = new HashMap<>();
            if (argsNode.isObject()) {
                try {
                    args = objectMapper.convertValue(argsNode, new TypeReference<Map<String, Object>>() {});
                } catch (Exception e) {
                    log.warn("[GeminiClientImpl] Lỗi convert args của tool [{}]: {}", functionName, e.getMessage());
                }
            }

            log.info("[GeminiClientImpl] Gemini yêu cầu gọi tool: [{}] với args: {}", functionName, args);

            // Thực thi tool qua Dispatcher
            ToolCallResult toolResult = toolDispatcher.dispatch(functionName, args, authentication, sessionId);
            if (toolResult.getCardType() != null && !"NONE".equals(toolResult.getCardType())) {
                lastCardType = toolResult.getCardType();
                lastCardData = toolResult.getCardData();
            }

            // Thêm lượt gọi tool của Model vào contents
            contents.add(Map.of(
                    "role", "model",
                    "parts", List.of(Map.of("functionCall", Map.of("name", functionName, "args", args)))
            ));

            // Thêm kết quả tool phản hồi (Gemini API v1beta yêu cầu role: user cho functionResponse)
            Map<String, Object> toolResponsePayload = new HashMap<>();
            toolResponsePayload.put("success", toolResult.isSuccess());
            toolResponsePayload.put("result", toolResult.getSummaryMessage() != null ? toolResult.getSummaryMessage() : "");
            if (toolResult.getErrorMessage() != null) {
                toolResponsePayload.put("error", toolResult.getErrorMessage());
            }

            contents.add(Map.of(
                    "role", "user",
                    "parts", List.of(Map.of(
                            "functionResponse", Map.of(
                                    "name", functionName,
                                    "response", Map.of(
                                            "name", functionName,
                                            "content", toolResponsePayload
                                    )
                            )
                    ))
            ));
        }

        if (finalReply == null || finalReply.isBlank()) {
            finalReply = "Dạ cảm ơn quý khách đã liên hệ với Grand Aurora Luxury Hotel!";
        }

        return ChatModelResult.builder()
                .reply(finalReply)
                .cardType(lastCardType)
                .cardData(lastCardData)
                .provider(PROVIDER_NAME)
                .model(getModelName())
                .build();
    }

    private String sendGenerateContentRequest(String url, Map<String, Object> requestBody) {
        try {
            ResponseEntity<String> response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .toEntity(String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }

            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Không nhận được phản hồi hợp lệ từ Gemini API");

        } catch (HttpClientErrorException.TooManyRequests e) {
            log.error("[GeminiClientImpl] Gemini API Rate Limit / Hết Quota (429): {}", maskApiKey(e.getMessage()));
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS, "Gemini API đang bị giới hạn tần suất yêu cầu hoặc vượt hạn ngạch (429 Rate Limit / Quota Exceeded). Vui lòng thử lại sau.");

        } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.Forbidden e) {
            log.error("[GeminiClientImpl] Lỗi xác thực Gemini API Key (401/403): {}", maskApiKey(e.getMessage()));
            throw new AppException(HttpStatus.UNAUTHORIZED, "Gemini API Key không hợp lệ hoặc không có quyền truy cập");

        } catch (HttpClientErrorException.BadRequest e) {
            log.error("[GeminiClientImpl] Yêu cầu không hợp lệ tới Gemini (400): {}", maskApiKey(e.getResponseBodyAsString()));
            throw new AppException(HttpStatus.BAD_REQUEST, "Yêu cầu tới Gemini API không hợp lệ: " + extractErrorMessage(e.getResponseBodyAsString()));

        } catch (HttpServerErrorException.ServiceUnavailable e) {
            log.error("[GeminiClientImpl] Dịch vụ Gemini quá tải (503): {}", maskApiKey(e.getMessage()));
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "Dịch vụ Gemini AI hiện đang quá tải hoặc bảo trì (503). Vui lòng thử lại sau.");

        } catch (ResourceAccessException e) {
            log.error("[GeminiClientImpl] Timeout kết nối tới Gemini API: {}", maskApiKey(e.getMessage()));
            throw new AppException(HttpStatus.GATEWAY_TIMEOUT, "Quá thời gian kết nối (Timeout) tới Google Gemini AI.");

        } catch (AppException e) {
            throw e;

        } catch (Exception e) {
            log.error("[GeminiClientImpl] Lỗi không xác định khi gọi Gemini API: {}", maskApiKey(e.getMessage()), e);
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi kết nối tới dịch vụ Gemini AI. Vui lòng thử lại sau.");
        }
    }

    private String maskApiKey(String text) {
        if (text == null) return "";
        return text.replaceAll("key=[^&\\s]+", "key=***");
    }

    private JsonNode extractFirstCandidate(String jsonResponse) {
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                return candidates.get(0);
            }
        } catch (Exception e) {
            log.error("[GeminiClientImpl] Lỗi parse JSON phản hồi Gemini: {}", e.getMessage());
        }
        return null;
    }

    private List<Map<String, Object>> buildToolDeclarations() {
        Map<String, Object> searchRooms = Map.of(
                "name", ChatToolNames.SEARCH_AVAILABLE_ROOMS,
                "description", "Tra cứu loại phòng và phòng còn trống theo ngày nhận phòng, trả phòng và số khách từ cơ sở dữ liệu khách sạn.",
                "parameters", Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "checkIn", Map.of("type", "STRING", "description", "Ngày nhận phòng định dạng YYYY-MM-DD (Ví dụ: 2026-11-15)"),
                                "checkOut", Map.of("type", "STRING", "description", "Ngày trả phòng định dạng YYYY-MM-DD (Ví dụ: 2026-11-17)"),
                                "guests", Map.of("type", "INTEGER", "description", "Số lượng khách lưu trú (mặc định 2)"),
                                "roomTypeId", Map.of("type", "INTEGER", "description", "Mã ID loại phòng nếu muốn kiểm tra cụ thể một loại (tùy chọn)")
                        ),
                        "required", List.of("checkIn", "checkOut")
                )
        );

        Map<String, Object> roomDetails = Map.of(
                "name", ChatToolNames.GET_ROOM_TYPE_DETAILS,
                "description", "Lấy thông tin chi tiết, tiện nghi, sức chứa và chính sách công khai của một loại phòng.",
                "parameters", Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "roomTypeId", Map.of("type", "INTEGER", "description", "Mã ID loại phòng (1: Standard Single, 2: Deluxe Double, 3: Executive Suite)")
                        ),
                        "required", List.of("roomTypeId")
                )
        );

        Map<String, Object> quote = Map.of(
                "name", ChatToolNames.GET_BOOKING_QUOTE,
                "description", "Tính báo giá đặt phòng gồm số đêm, đơn giá, tổng tiền và tiền cọc 50% theo chính sách khách sạn. Báo giá có hiệu lực trong 15 phút và không giữ phòng.",
                "parameters", Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "roomTypeId", Map.of("type", "INTEGER", "description", "Mã ID loại phòng muốn đặt"),
                                "checkIn", Map.of("type", "STRING", "description", "Ngày nhận phòng YYYY-MM-DD"),
                                "checkOut", Map.of("type", "STRING", "description", "Ngày trả phòng YYYY-MM-DD"),
                                "guests", Map.of("type", "INTEGER", "description", "Số lượng khách lưu trú"),
                                "quantity", Map.of("type", "INTEGER", "description", "Số lượng phòng muốn đặt (mặc định 1)")
                        ),
                        "required", List.of("roomTypeId", "checkIn", "checkOut")
                )
        );

        Map<String, Object> prepareBooking = Map.of(
                "name", ChatToolNames.PREPARE_BOOKING,
                "description", "Chuẩn bị bản nháp đặt phòng dựa trên quoteId còn hiệu lực cho khách hàng đã đăng nhập. Trả về thẻ xác nhận đặt phòng để khách hàng kiểm tra và tự bấm nút xác nhận. Tuyệt đối không tự tạo booking PENDING hay CONFIRMED.",
                "parameters", Map.of(
                        "type", "OBJECT",
                        "properties", Map.of(
                                "quoteId", Map.of("type", "STRING", "description", "Mã báo giá hợp lệ được cấp từ tool getBookingQuote"),
                                "specialRequests", Map.of("type", "STRING", "description", "Yêu cầu đặc biệt của khách hàng nếu có (tùy chọn)")
                        ),
                        "required", List.of("quoteId")
                )
        );

        return List.of(Map.of(
                "functionDeclarations", List.of(searchRooms, roomDetails, quote, prepareBooking)
        ));
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

    private String extractErrorMessage(String errorJson) {
        try {
            JsonNode root = objectMapper.readTree(errorJson);
            return root.path("error").path("message").asText(errorJson);
        } catch (Exception e) {
            return errorJson;
        }
    }
}
