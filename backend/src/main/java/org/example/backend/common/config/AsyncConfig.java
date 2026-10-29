package org.example.backend.common.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Cấu hình ThreadPoolTaskExecutor cho xử lý bất đồng bộ (@Async):
 * - Phục vụ gửi email thông báo, hóa đơn PDF không làm nghẽn HTTP request thread (chặn < 15ms).
 * - corePoolSize: 2 workers
 * - maxPoolSize: 5 workers
 * - queueCapacity: 50 tasks
 * - threadNamePrefix: "mail-async-"
 */
@Slf4j
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    public static final String MAIL_TASK_EXECUTOR = "mailTaskExecutor";

    @Bean(name = MAIL_TASK_EXECUTOR)
    @Primary
    public ThreadPoolTaskExecutor mailTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(50);
        executor.setKeepAliveSeconds(60);
        executor.setThreadNamePrefix("mail-async-");
        // Khi hàng đợi đầy, task sẽ được thực thi trên chính calling thread để tránh thất thoát dữ liệu
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.initialize();
        log.info("Khởi tạo ThreadPoolTaskExecutor thành công [corePoolSize=2, maxPoolSize=5, prefix='mail-async-']");
        return executor;
    }

    @Override
    public Executor getAsyncExecutor() {
        return mailTaskExecutor();
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (throwable, method, params) -> {
            log.error("Lỗi ngoại lệ trong phương thức bất đồng bộ [{}]: {}", method.getName(), throwable.getMessage(), throwable);
        };
    }
}
