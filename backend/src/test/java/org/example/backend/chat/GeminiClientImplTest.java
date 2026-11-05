package org.example.backend.chat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.backend.chat.client.impl.GeminiClientImpl;
import org.example.backend.chat.config.GeminiProperties;
import org.example.backend.common.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

/**
 * Kiểm thử GeminiClientImpl theo task [SP2-1105-THANH]:
 * - Timeout kết nối được cấu hình
 * - Xử lý thông báo rõ ràng cho timeout, quota (429 RateLimit), key thiếu hoặc không hợp lệ, 503 quá tải
 * - Parse kết quả JSON thành công
 */
class GeminiClientImplTest {

    private GeminiProperties properties;
    private ObjectMapper objectMapper;
    private RestClient.Builder restClientBuilder;
    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        properties = new GeminiProperties();
        properties.setApiKey("test-valid-gemini-api-key");
        properties.setModel("gemini-3.5-flash-lite");
        properties.setApiUrl("https://generativelanguage.googleapis.com/v1beta/models");
        properties.setTimeoutMs(5000);

        objectMapper = new ObjectMapper();
        restClientBuilder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(restClientBuilder).build();
    }

    private GeminiClientImpl createClient() {
        return new GeminiClientImpl(properties, objectMapper, restClientBuilder.build());
    }

    @Test
    @DisplayName("Lỗi thiếu Key: Khi API key rỗng hoặc chưa cấu hình → Ném AppException 503 kèm thông báo rõ ràng")
    void testMissingApiKey_ThrowsServiceUnavailable() {
        properties.setApiKey("");
        GeminiClientImpl client = createClient();

        assertThat(client.isAvailable()).isFalse();
        assertThatThrownBy(() -> client.generateContent("Xin chào", "Prompt"))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Gemini API Key bị thiếu hoặc chưa được cấu hình")
                .extracting(e -> ((AppException) e).getStatus())
                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }

    @Test
    @DisplayName("Lỗi Key mặc định: Khi API key bắt đầu bằng 'your_' → Coi là chưa cấu hình")
    void testPlaceholderApiKey_ThrowsServiceUnavailable() {
        properties.setApiKey("your_gemini_api_key_here");
        GeminiClientImpl client = createClient();

        assertThat(client.isAvailable()).isFalse();
    }

    @Test
    @DisplayName("Lỗi Quota / Tần suất: Khi Gemini trả về 429 Too Many Requests → Ném AppException 429 thông báo rõ quota")
    void testQuotaExceeded_429RateLimit_ThrowsClearMessage() {
        GeminiClientImpl client = createClient();

        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=test-valid-gemini-api-key"))
                .andRespond(withTooManyRequests().body("{\"error\":{\"code\":429,\"message\":\"Resource has been exhausted (e.g. check quota).\"}}")
                        .contentType(MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.generateContentWithHistory("Còn phòng không?", "Prompt", Collections.emptyList()))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("429 Rate Limit / Quota Exceeded")
                .extracting(e -> ((AppException) e).getStatus())
                .isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }

    @Test
    @DisplayName("Lỗi xác thực Key: Khi Gemini trả về 401 Unauthorized → Ném AppException 401 thông báo key không hợp lệ")
    void testInvalidApiKey_401Unauthorized_ThrowsClearMessage() {
        GeminiClientImpl client = createClient();

        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=test-valid-gemini-api-key"))
                .andRespond(withUnauthorizedRequest().body("{\"error\":{\"code\":401,\"message\":\"API key not valid.\"}}")
                        .contentType(MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.generateContentWithHistory("Giá phòng?", "Prompt", Collections.emptyList()))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Gemini API Key không hợp lệ")
                .extracting(e -> ((AppException) e).getStatus())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Lỗi Quá tải hệ thống: Khi Gemini trả về 503 Service Unavailable → Ném AppException 503")
    void testServerOverloaded_503_ThrowsClearMessage() {
        GeminiClientImpl client = createClient();

        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=test-valid-gemini-api-key"))
                .andRespond(withServiceUnavailable().body("{\"error\":{\"code\":503,\"message\":\"The model is overloaded. Please try again later.\"}}")
                        .contentType(MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.generateContentWithHistory("Check in mấy giờ?", "Prompt", Collections.emptyList()))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Dịch vụ Gemini AI hiện đang quá tải hoặc bảo trì (503)")
                .extracting(e -> ((AppException) e).getStatus())
                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }

    @Test
    @DisplayName("Lỗi Timeout kết nối: Khi xảy ra SocketTimeoutException → Ném AppException 504 Gateway Timeout")
    void testTimeout_ThrowsGatewayTimeout() {
        GeminiClientImpl client = createClient();

        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=test-valid-gemini-api-key"))
                .andRespond(withException(new SocketTimeoutException("Read timed out")));

        assertThatThrownBy(() -> client.generateContentWithHistory("Tư vấn phòng", "Prompt", Collections.emptyList()))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Quá thời gian kết nối (Timeout) tới Google Gemini AI")
                .extracting(e -> ((AppException) e).getStatus())
                .isEqualTo(HttpStatus.GATEWAY_TIMEOUT);
    }

    @Test
    @DisplayName("Thành công: Khi Gemini trả HTTP 200 OK → Parse đúng text trong candidates.parts")
    void testGenerateContent_Success_ParsesCandidatesText() {
        GeminiClientImpl client = createClient();

        String mockResponseBody = """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {
                            "text": "Chào quý khách! Grand Aurora có 3 hạng phòng tiêu chuẩn 5 sao view biển Mỹ Khê."
                          }
                        ],
                        "role": "model"
                      },
                      "finishReason": "STOP"
                    }
                  ]
                }
                """;

        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=test-valid-gemini-api-key"))
                .andRespond(withSuccess(mockResponseBody, MediaType.APPLICATION_JSON));

        String reply = client.generateContentWithHistory("Khách sạn có phòng gì?", "System instruction", Collections.emptyList());

        mockServer.verify();
        assertThat(reply).isEqualTo("Chào quý khách! Grand Aurora có 3 hạng phòng tiêu chuẩn 5 sao view biển Mỹ Khê.");
        assertThat(client.getProviderName()).isEqualTo("gemini");
        assertThat(client.getModelName()).isEqualTo("gemini-3.5-flash-lite");
        assertThat(client.isAvailable()).isTrue();
    }
}
