package org.example.backend.mail;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.example.backend.mail.service.EmailServiceImpl;
import org.example.backend.mail.util.EmailTemplateHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.util.Properties;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailServiceImpl emailService;

    private MimeMessage mimeMessage;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "mailUsername", "hotel@grandaurora.com");
        ReflectionTestUtils.setField(emailService, "configuredFromAddress", "noreply@grandaurora.com");
        ReflectionTestUtils.setField(emailService, "personalName", "Grand Aurora Luxury Hotel");

        mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        lenient().when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
    }

    @Test
    @DisplayName("Gửi Email HTML thành công: đúng người nhận, tiêu đề và nội dung")
    void testSendHtmlEmailSuccess() throws Exception {
        String to = "guest@example.com";
        String subject = "Chào mừng quý khách đến với Grand Aurora";
        String htmlContent = "<h1>Chào mừng</h1><p>Đơn đặt phòng của bạn đã thành công.</p>";

        emailService.sendHtmlEmail(to, subject, htmlContent);

        verify(mailSender, times(1)).send(mimeMessage);
        assertThat(mimeMessage.getAllRecipients()).isNotNull();
        assertThat(mimeMessage.getAllRecipients()[0].toString()).isEqualTo(to);
        assertThat(mimeMessage.getSubject()).isEqualTo(subject);
    }

    @Test
    @DisplayName("Gửi Email có file đính kèm PDF thành công")
    void testSendEmailWithAttachmentSuccess() {
        String to = "guest@example.com";
        String subject = "Hóa đơn điện tử Grand Aurora";
        String htmlContent = "<p>Vui lòng xem file hóa đơn đính kèm.</p>";
        byte[] pdfBytes = "%PDF-1.4 test invoice content".getBytes(StandardCharsets.UTF_8);

        emailService.sendEmailWithAttachment(to, subject, htmlContent, "Hoa_don_BK123.pdf", pdfBytes, "application/pdf");

        verify(mailSender, times(1)).send(mimeMessage);
    }

    @Test
    @DisplayName("Gửi Email xác nhận đặt phòng đầy đủ (Booking Confirmation)")
    void testSendBookingConfirmationEmail() {
        byte[] invoicePdf = "%PDF-1.4 Grand Aurora Official Invoice".getBytes(StandardCharsets.UTF_8);

        emailService.sendBookingConfirmationEmail(
                "customer@gmail.com",
                "Trần Văn Khách",
                "BK-AURORA-999",
                "Deluxe Suite Ocean View",
                2,
                "2026-11-20",
                "2026-11-23",
                2500000L,
                5000000L,
                invoicePdf
        );

        verify(mailSender, times(1)).send(mimeMessage);
    }

    @Test
    @DisplayName("Xử lý lỗi an toàn: khi mailSender ném MailSendException không làm sập ứng dụng")
    void testSendEmailExceptionHandling() {
        doThrow(new MailSendException("SMTP connection refused")).when(mailSender).send(any(MimeMessage.class));

        // Phương thức không được ném Exception ra ngoài
        CompletableFuture<Boolean> future = emailService.sendHtmlEmailAsync(
                "error@example.com",
                "Tiêu đề thử lỗi",
                "<p>Test error</p>"
        );

        assertThat(future.join()).isFalse();
        verify(mailSender, times(1)).send(mimeMessage);
    }

    @Test
    @DisplayName("Kiểm tra template HTML xác nhận đặt phòng chứa đúng mã đặt phòng và thông tin")
    void testBookingConfirmationTemplateGeneration() {
        String html = EmailTemplateHelper.buildBookingConfirmationHtml(
                "Lê Thị Hoa",
                "BK-777",
                "Executive Suite",
                1,
                "2026-12-01",
                "2026-12-03",
                1500000L,
                3000000L
        );

        assertThat(html).contains("BK-777");
        assertThat(html).contains("Lê Thị Hoa");
        assertThat(html).contains("Executive Suite");
        assertThat(html).contains("1.500.000 ₫");
        assertThat(html).contains("Grand Aurora");
    }
}
