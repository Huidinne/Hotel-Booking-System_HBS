package org.example.backend.chat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.backend.chat.client.GeminiClient;
import org.example.backend.chat.dto.ChatRequest;
import org.example.backend.common.exception.AppException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Kiểm thử Contract API Chatbot & Xác thực Validation:
 * POST /api/v1/chat/message
 */
@SpringBootTest
@AutoConfigureMockMvc
class ChatControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    @Qualifier("geminiClientImpl")
    private GeminiClient geminiClient;

    @Test
    @DisplayName("Gửi tin nhắn hợp lệ kèm sessionId → HTTP 200 OK, trả đúng sessionId và câu trả lời")
    void testSendMessage_Success_WithSessionId() throws Exception {
        when(geminiClient.isAvailable()).thenReturn(true);
        when(geminiClient.getProviderName()).thenReturn("gemini");
        when(geminiClient.getModelName()).thenReturn("gemini-3.5-flash-lite");
        when(geminiClient.generateContent(anyString(), anyString()))
                .thenReturn("Dạ chào bạn! Grand Aurora có các hạng phòng Deluxe và Suite hướng biển.");

        ChatRequest request = ChatRequest.builder()
                .sessionId("session-test-12345")
                .message("Cho mình hỏi thông tin các phòng nghỉ?")
                .build();

        mockMvc.perform(post("/api/v1/chat/message")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sessionId").value("session-test-12345"))
                .andExpect(jsonPath("$.data.reply").value(containsString("Deluxe và Suite")))
                .andExpect(jsonPath("$.data.provider").value("gemini"))
                .andExpect(jsonPath("$.data.timestamp").isNotEmpty());
    }

    @Test
    @DisplayName("Gửi tin nhắn không kèm sessionId → HTTP 200 OK, server tự sinh sessionId có tiền tố 'session-'")
    void testSendMessage_Success_AutoGenerateSessionId() throws Exception {
        when(geminiClient.isAvailable()).thenReturn(true);
        when(geminiClient.getProviderName()).thenReturn("gemini");
        when(geminiClient.getModelName()).thenReturn("gemini-3.5-flash-lite");
        when(geminiClient.generateContent(anyString(), anyString()))
                .thenReturn("Grand Aurora hân hạnh đón tiếp quý khách!");

        ChatRequest request = ChatRequest.builder()
                .message("Khách sạn ở địa chỉ nào thế bạn?")
                .build();

        mockMvc.perform(post("/api/v1/chat/message")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sessionId").value(startsWith("session-")))
                .andExpect(jsonPath("$.data.reply").isNotEmpty());
    }

    @Test
    @DisplayName("Validation: Tin nhắn để trống (message blank) → HTTP 400 Bad Request kèm thông báo lỗi rõ ràng")
    void testSendMessage_EmptyMessage_BadRequest() throws Exception {
        ChatRequest request = ChatRequest.builder()
                .sessionId("session-123")
                .message("   ")
                .build();

        mockMvc.perform(post("/api/v1/chat/message")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(containsString("Nội dung tin nhắn không được để trống")));
    }

    @Test
    @DisplayName("Validation: Tin nhắn vượt quá 1000 ký tự → HTTP 400 Bad Request")
    void testSendMessage_MessageExceedsMaxLength_BadRequest() throws Exception {
        String longMessage = "a".repeat(1001);
        ChatRequest request = ChatRequest.builder()
                .message(longMessage)
                .build();

        mockMvc.perform(post("/api/v1/chat/message")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(containsString("không được vượt quá 1000 ký tự")));
    }

    @Test
    @DisplayName("Kiểm thử Provider Stub: Khi không có Gemini API key, tự động kích hoạt Stub và trả về tri thức khách sạn chuẩn")
    void testSendMessage_FallbackToStubProvider_Success() throws Exception {
        // Giả lập Gemini không khả dụng (chưa có key)
        when(geminiClient.isAvailable()).thenReturn(false);

        ChatRequest request = ChatRequest.builder()
                .message("Giá phòng và các loại phòng của khách sạn là gì?")
                .build();

        mockMvc.perform(post("/api/v1/chat/message")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.provider").value("stub"))
                .andExpect(jsonPath("$.data.model").value("stub-mock-provider"))
                .andExpect(jsonPath("$.data.reply").value(containsString("Standard Single Room")))
                .andExpect(jsonPath("$.data.reply").value(containsString("Deluxe Double Room")))
                .andExpect(jsonPath("$.data.reply").value(containsString("Executive Suite Luxury")));
    }

    @Test
    @DisplayName("Khả năng phục hồi (Resilience): Khi Gemini bị lỗi Rate Limit hoặc ném exception, tự động fallback sang Stub trả lời khách")
    void testSendMessage_GeminiFailure_FallbackToStub() throws Exception {
        when(geminiClient.isAvailable()).thenReturn(true);
        when(geminiClient.generateContent(anyString(), anyString()))
                .thenThrow(new AppException(HttpStatus.TOO_MANY_REQUESTS, "429 Rate Limit"));

        ChatRequest request = ChatRequest.builder()
                .message("Mấy giờ thì nhận phòng và trả phòng?")
                .build();

        mockMvc.perform(post("/api/v1/chat/message")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.provider").value("stub"))
                .andExpect(jsonPath("$.data.reply").value(containsString("14:00")));
    }
}

