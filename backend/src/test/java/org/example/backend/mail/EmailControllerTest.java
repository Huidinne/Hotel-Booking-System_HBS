package org.example.backend.mail;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.backend.mail.dto.TestEmailRequest;
import org.example.backend.mail.service.EmailService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class EmailControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private EmailService emailService;

    @Test
    @DisplayName("API POST /api/v1/test/email/send thành công → HTTP 200, status ACCEPTED, nonBlocking=true")
    void testSendEmailEndpoint() throws Exception {
        doNothing().when(emailService).sendHtmlEmail(anyString(), anyString(), anyString());

        TestEmailRequest request = TestEmailRequest.builder()
                .to("testguest@example.com")
                .subject("Test Email Controller")
                .message("Test email non-blocking endpoint")
                .withAttachment(false)
                .build();

        mockMvc.perform(post("/api/v1/test/email/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.recipient").value("testguest@example.com"))
                .andExpect(jsonPath("$.executionTimeMs").isNumber())
                .andExpect(jsonPath("$.nonBlocking").value(true));

        verify(emailService).sendHtmlEmail(eq("testguest@example.com"), anyString(), anyString());
    }

    @Test
    @DisplayName("API POST /api/v1/test/email/send có file đính kèm thành công → HTTP 200")
    void testSendEmailWithAttachmentEndpoint() throws Exception {
        doNothing().when(emailService).sendEmailWithAttachment(anyString(), anyString(), anyString(), anyString(), any(), anyString());

        TestEmailRequest request = TestEmailRequest.builder()
                .to("invoice@example.com")
                .subject("Test Email With PDF")
                .message("Please see attached invoice")
                .withAttachment(true)
                .build();

        mockMvc.perform(post("/api/v1/test/email/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.recipient").value("invoice@example.com"))
                .andExpect(jsonPath("$.nonBlocking").value(true));

        verify(emailService).sendEmailWithAttachment(eq("invoice@example.com"), anyString(), anyString(), anyString(), any(), anyString());
    }

    @Test
    @DisplayName("API POST /api/v1/test/email/booking-confirmation thành công → HTTP 200")
    void testBookingConfirmationEndpoint() throws Exception {
        doNothing().when(emailService).sendBookingConfirmationEmail(
                anyString(), anyString(), anyString(), anyString(), anyInt(), anyString(), anyString(), anyLong(), anyLong(), any()
        );

        TestEmailRequest request = TestEmailRequest.builder()
                .to("customer@grandaurora.com")
                .withAttachment(true)
                .build();

        mockMvc.perform(post("/api/v1/test/email/booking-confirmation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.recipient").value("customer@grandaurora.com"))
                .andExpect(jsonPath("$.nonBlocking").value(true));

        verify(emailService).sendBookingConfirmationEmail(
                eq("customer@grandaurora.com"), anyString(), anyString(), anyString(), anyInt(), anyString(), anyString(), anyLong(), anyLong(), any()
        );
    }

    @Test
    @DisplayName("API POST /api/v1/test/email/send với email không hợp lệ → HTTP 400 Bad Request")
    void testInvalidEmailValidation() throws Exception {
        TestEmailRequest request = TestEmailRequest.builder()
                .to("invalid-email-address")
                .build();

        mockMvc.perform(post("/api/v1/test/email/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
