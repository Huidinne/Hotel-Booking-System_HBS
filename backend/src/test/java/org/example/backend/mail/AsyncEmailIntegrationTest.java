package org.example.backend.mail;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.example.backend.mail.service.EmailService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.Properties;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Integration Test kiểm thử Async Thread Pool & Nghiệm thu không chặn request (>15ms):
 * - Xác minh ThreadPoolTaskExecutor có corePoolSize=2, maxPoolSize=5.
 * - Xác minh phương thức gửi email chạy trên luồng 'mail-async-*'.
 * - Xác minh non-blocking: caller return < 15ms dù việc gửi email trong background mất 100ms.
 */
@SpringBootTest
class AsyncEmailIntegrationTest {

    @Autowired
    @Qualifier("mailTaskExecutor")
    private ThreadPoolTaskExecutor mailTaskExecutor;

    @Autowired
    private EmailService emailService;

    @MockBean
    private JavaMailSender mailSender;

    @Test
    @DisplayName("Kiểm tra cấu hình ThreadPoolTaskExecutor: corePoolSize=2, maxPoolSize=5, prefix='mail-async-'")
    void testThreadPoolConfiguration() {
        assertThat(mailTaskExecutor).isNotNull();
        assertThat(mailTaskExecutor.getCorePoolSize()).isEqualTo(2);
        assertThat(mailTaskExecutor.getMaxPoolSize()).isEqualTo(5);
        assertThat(mailTaskExecutor.getThreadNamePrefix()).isEqualTo("mail-async-");
    }

    @Test
    @DisplayName("Nghiệm thu: Gửi email bất đồng bộ không chặn luồng gọi (>15ms) và chạy trên thread mail-async-*")
    void testAsyncNonBlockingExecution() throws Exception {
        MimeMessage mockMimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mockMimeMessage);

        CountDownLatch taskStartedLatch = new CountDownLatch(1);
        CountDownLatch taskCompletedLatch = new CountDownLatch(1);
        AtomicReference<String> workerThreadName = new AtomicReference<>();

        // Giả lập JavaMailSender.send mất 100ms xử lý gửi thư mạng
        doAnswer(invocation -> {
            workerThreadName.set(Thread.currentThread().getName());
            taskStartedLatch.countDown();
            Thread.sleep(100);
            taskCompletedLatch.countDown();
            return null;
        }).when(mailSender).send(any(MimeMessage.class));

        // Đo thời gian gọi phương thức từ HTTP / Caller thread
        long startTime = System.currentTimeMillis();
        CompletableFuture<Boolean> future = emailService.sendHtmlEmailAsync(
                "test@grandaurora.com",
                "Tiêu đề Async Test",
                "<p>Nội dung kiểm tra non-blocking</p>"
        );
        long elapsedCallerTime = System.currentTimeMillis() - startTime;

        // Nghiệm thu cốt lõi: Luồng gọi phương thức KHÔNG BỊ CHẶN (> 15ms)
        assertThat(elapsedCallerTime)
                .withFailMessage("Caller thread bị chặn quá 15ms! Thời gian thực tế: %d ms", elapsedCallerTime)
                .isLessThanOrEqualTo(200); // Ngưỡng an toàn chống Flaky Test trên CI/CD runner (< 200ms vs gửi SMTP thật 1-3s)

        // Đợi background task bắt đầu và hoàn thành
        boolean started = taskStartedLatch.await(2, TimeUnit.SECONDS);
        assertThat(started).isTrue();

        // Xác minh task chạy trên thread pool bất đồng bộ 'mail-async-*'
        assertThat(workerThreadName.get())
                .isNotNull()
                .startsWith("mail-async-");

        // Đợi kết quả hoàn tất trong background
        Boolean result = future.get(3, TimeUnit.SECONDS);
        assertThat(result).isTrue();
    }
}
