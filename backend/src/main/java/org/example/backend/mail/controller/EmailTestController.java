package org.example.backend.mail.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.mail.dto.TestEmailRequest;
import org.example.backend.mail.dto.TestEmailResponse;
import org.example.backend.mail.service.EmailService;
import org.example.backend.mail.service.PdfInvoiceService;
import org.example.backend.mail.util.EmailTemplateHelper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;

@Slf4j
@RestController
@RequestMapping("/api/v1/test/email")
@RequiredArgsConstructor
@Tag(name = "Email Test API", description = "Endpoint kiểm thử dịch vụ gửi Email bất đồng bộ (Non-blocking)")
public class EmailTestController {

    public static final long NON_BLOCKING_THRESHOLD_MS = 200;

    private final EmailService emailService;
    private final PdfInvoiceService pdfInvoiceService;

    @PostMapping("/send")
    @Operation(summary = "Kiểm thử gửi email mẫu bất đồng bộ (Nghiệm thu non-blocking < 200ms)")
    public ResponseEntity<TestEmailResponse> sendTestEmail(@Valid @RequestBody TestEmailRequest request) {
        String httpThread = Thread.currentThread().getName();

        String subject = (request.getSubject() != null && !request.getSubject().isBlank())
                ? request.getSubject()
                : "Thử nghiệm hệ thống Email tự động - Grand Aurora Luxury Hotel";

        String message = (request.getMessage() != null && !request.getMessage().isBlank())
                ? request.getMessage()
                : "<p>Đây là email kiểm thử dịch vụ gửi thư bất đồng bộ (Async Thread Pool) của hệ thống quản lý khách sạn Grand Aurora.</p>";

        String htmlContent = EmailTemplateHelper.buildGenericNotificationHtml(
                subject,
                "HỆ THỐNG THÔNG BÁO TỰ ĐỘNG",
                message,
                "Xem trang chủ khách sạn",
                "http://localhost:5173"
        );

        byte[] samplePdf = null;
        if (request.isWithAttachment()) {
            samplePdf = generateSampleInvoicePdf(request.getTo());
        }

        long startTime = System.currentTimeMillis();
        if (samplePdf != null) {
            emailService.sendEmailWithAttachment(
                    request.getTo(),
                    subject,
                    htmlContent,
                    "GrandAurora_Hoa_don_BK-DEMO-2026.pdf",
                    samplePdf,
                    "application/pdf"
            );
        } else {
            emailService.sendHtmlEmail(request.getTo(), subject, htmlContent);
        }

        long executionTimeMs = System.currentTimeMillis() - startTime;
        boolean isNonBlocking = executionTimeMs <= NON_BLOCKING_THRESHOLD_MS;

        log.info("[EmailTestController] Request gửi email xử lý trong {}ms trên thread [{}] (nonBlocking={})",
                executionTimeMs, httpThread, isNonBlocking);

        TestEmailResponse response = TestEmailResponse.builder()
                .status("ACCEPTED")
                .message("Yêu cầu gửi email đã được đưa vào hàng đợi ThreadPoolTaskExecutor thành công.")
                .recipient(request.getTo())
                .executionTimeMs(executionTimeMs)
                .httpThread(httpThread)
                .nonBlocking(isNonBlocking)
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/booking-confirmation")
    @Operation(summary = "Kiểm thử gửi email xác nhận đặt phòng đầy đủ kèm file đính kèm")
    public ResponseEntity<TestEmailResponse> sendTestBookingConfirmation(@Valid @RequestBody TestEmailRequest request) {
        String httpThread = Thread.currentThread().getName();
        byte[] samplePdf = null;
        if (request.isWithAttachment()) {
            samplePdf = generateSampleInvoicePdf(request.getTo());
        }

        long startTime = System.currentTimeMillis();
        emailService.sendBookingConfirmationEmail(
                request.getTo(),
                "Nguyễn Văn A",
                "BK-DEMO-2026",
                "Deluxe Ocean View Double",
                1,
                "2026-11-15",
                "2026-11-17",
                1200000L,
                2400000L,
                samplePdf
        );

        long executionTimeMs = System.currentTimeMillis() - startTime;
        boolean isNonBlocking = executionTimeMs <= NON_BLOCKING_THRESHOLD_MS;

        TestEmailResponse response = TestEmailResponse.builder()
                .status("ACCEPTED")
                .message("Đã xếp hàng email xác nhận đặt phòng sang thread pool thành công.")
                .recipient(request.getTo())
                .executionTimeMs(executionTimeMs)
                .httpThread(httpThread)
                .nonBlocking(isNonBlocking)
                .build();

        return ResponseEntity.ok(response);
    }

    private byte[] generateSampleInvoicePdf(String customerEmail) {
        return pdfInvoiceService.generateInvoicePdf(
                "HD-DEMO-2026",
                "BK-DEMO-2026",
                "Nguyễn Văn A",
                customerEmail != null ? customerEmail : "guest@example.com",
                "0901 234 567",
                "Deluxe Ocean View Double",
                1,
                2,
                LocalDate.of(2026, 11, 15),
                LocalDate.of(2026, 11, 17),
                new BigDecimal("1200000"),
                new BigDecimal("2400000"),
                new BigDecimal("1200000"),
                "VNPAY",
                "PAID",
                "Phòng tầng cao view biển trực diện, kèm bữa sáng Buffet"
        );
    }
}
