package org.example.backend.mail.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.common.config.AsyncConfig;
import org.example.backend.mail.util.EmailTemplateHelper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;

/**
 * Triển khai dịch vụ gửi Email bất đồng bộ:
 * - Chạy trên ThreadPoolTaskExecutor (AsyncConfig.MAIL_TASK_EXECUTOR - pool 2-5 workers).
 * - Không làm block request HTTP của Controller / Service (>15ms).
 * - Hỗ trợ gửi HTML Template sang trọng và đính kèm file (PDF hóa đơn).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${app.mail.from:noreply@grandaurora.com}")
    private String configuredFromAddress;

    @Value("${app.mail.personal-name:Grand Aurora Luxury Hotel}")
    private String personalName;

    @Override
    @Async(AsyncConfig.MAIL_TASK_EXECUTOR)
    public void sendHtmlEmail(String to, String subject, String htmlContent) {
        executeSendEmail(to, subject, htmlContent, null, null, null);
    }

    @Override
    @Async(AsyncConfig.MAIL_TASK_EXECUTOR)
    public void sendEmailWithAttachment(String to, String subject, String htmlContent,
                                        String attachmentFilename, byte[] attachmentBytes, String contentType) {
        executeSendEmail(to, subject, htmlContent, attachmentFilename, attachmentBytes, contentType);
    }

    @Override
    @Async(AsyncConfig.MAIL_TASK_EXECUTOR)
    public CompletableFuture<Boolean> sendHtmlEmailAsync(String to, String subject, String htmlContent) {
        boolean success = executeSendEmail(to, subject, htmlContent, null, null, null);
        return CompletableFuture.completedFuture(success);
    }

    @Override
    @Async(AsyncConfig.MAIL_TASK_EXECUTOR)
    public CompletableFuture<Boolean> sendEmailWithAttachmentAsync(String to, String subject, String htmlContent,
                                                                  String attachmentFilename, byte[] attachmentBytes, String contentType) {
        boolean success = executeSendEmail(to, subject, htmlContent, attachmentFilename, attachmentBytes, contentType);
        return CompletableFuture.completedFuture(success);
    }

    @Override
    @Async(AsyncConfig.MAIL_TASK_EXECUTOR)
    public void sendBookingConfirmationEmail(String to, String customerName, String bookingCode,
                                            String roomTypeName, int quantity,
                                            String checkInDate, String checkOutDate,
                                            long depositAmount, long totalAmount,
                                            byte[] pdfAttachment) {
        String subject = "Xác nhận đặt phòng thành công [" + bookingCode + "] - Grand Aurora Luxury Hotel";
        String htmlContent = EmailTemplateHelper.buildBookingConfirmationHtml(
                customerName, bookingCode, roomTypeName, quantity,
                checkInDate, checkOutDate, depositAmount, totalAmount
        );

        String attachmentName = (pdfAttachment != null && pdfAttachment.length > 0)
                ? "Hoa_don_" + bookingCode + ".pdf"
                : null;

        executeSendEmail(to, subject, htmlContent, attachmentName, pdfAttachment, "application/pdf");
    }

    /**
     * Hàm nội bộ gửi Email và bắt lỗi:
     * - Được thực thi trong luồng background (ví dụ 'mail-async-1').
     * - Không ném ngoại lệ lên calling thread.
     */
    private boolean executeSendEmail(String to, String subject, String htmlContent,
                                     String attachmentFilename, byte[] attachmentBytes, String contentType) {
        String threadName = Thread.currentThread().getName();
        long startTime = System.currentTimeMillis();
        log.info("[Async-Email] Bắt đầu gửi email đến [{}] với tiêu đề '{}' trên Thread [{}]", to, subject, threadName);

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            boolean isMultipart = (attachmentBytes != null && attachmentBytes.length > 0 && attachmentFilename != null);
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, isMultipart, StandardCharsets.UTF_8.name());

            // Thiết lập địa chỉ người gửi
            String fromAddress = (mailUsername != null && !mailUsername.isBlank()) ? mailUsername : configuredFromAddress;
            try {
                helper.setFrom(new InternetAddress(fromAddress, personalName, StandardCharsets.UTF_8.name()));
            } catch (UnsupportedEncodingException e) {
                helper.setFrom(fromAddress);
            }

            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true); // true = định dạng HTML

            // Đính kèm file nếu có
            if (isMultipart) {
                ByteArrayResource byteArrayResource = new ByteArrayResource(attachmentBytes);
                String mimeType = (contentType != null && !contentType.isBlank()) ? contentType : "application/octet-stream";
                helper.addAttachment(attachmentFilename, byteArrayResource, mimeType);
                log.debug("[Async-Email] Đã đính kèm file '{}' ({} bytes, type={})", attachmentFilename, attachmentBytes.length, mimeType);
            }

            mailSender.send(mimeMessage);
            long elapsed = System.currentTimeMillis() - startTime;
            log.info("[Async-Email] ĐÃ GỬI THÀNH CÔNG email đến [{}] trong {}ms trên Thread [{}]", to, elapsed, threadName);
            return true;

        } catch (MessagingException e) {
            log.error("[Async-Email] LỖI khi tạo hoặc gửi MIME Message đến [{}]: {}", to, e.getMessage(), e);
            return false;
        } catch (Exception e) {
            log.error("[Async-Email] LỖI KHÔNG MONG MUỐN khi gửi email đến [{}]: {}", to, e.getMessage(), e);
            return false;
        }
    }
}
