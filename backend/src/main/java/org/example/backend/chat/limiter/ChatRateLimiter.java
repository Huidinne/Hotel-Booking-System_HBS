package org.example.backend.chat.limiter;

import lombok.extern.slf4j.Slf4j;
import org.example.backend.common.exception.AppException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Bộ kiểm soát tần suất gửi tin và giới hạn phiên trò chuyện (Chat Rate Limiter):
 * Triển khai theo task [SP2-1106-THANH]:
 * - Giới hạn tần suất (Sliding window rate limit): Tối đa MAX_REQUESTS_PER_MINUTE (20 req/phút) để chống spam dồn dập.
 * - Giới hạn phiên (Session quota limit): Tối đa MAX_MESSAGES_PER_SESSION (30 tin/phiên) để ngăn tràn token và lạm dụng API.
 * - Tự động ném AppException(HttpStatus.TOO_MANY_REQUESTS) khi vượt giới hạn.
 * - Thread-safe cho môi trường đa luồng và tự động dọn dẹp phiên hết hạn sau 60 phút.
 */
@Slf4j
@Component
public class ChatRateLimiter {

    public static final int MAX_REQUESTS_PER_MINUTE = 20;
    public static final int MAX_MESSAGES_PER_SESSION = 30;
    public static final long EXPIRATION_MILLIS = 60 * 60 * 1000L; // 60 phút

    private static class SessionRateData {
        final List<Long> requestTimestamps = Collections.synchronizedList(new ArrayList<>());
        int totalSessionMessages = 0;
        long lastAccessTime = System.currentTimeMillis();
    }

    private final Map<String, SessionRateData> limiterStore = new ConcurrentHashMap<>();

    /**
     * Kiểm tra và ghi nhận lượt gọi tin nhắn cho một session.
     * Ném AppException(429) nếu vi phạm tần suất hoặc vượt quota phiên.
     *
     * @param sessionId mã phiên trò chuyện
     */
    public void checkAndRecord(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return;
        }

        cleanupExpired();

        SessionRateData data = limiterStore.computeIfAbsent(sessionId, k -> new SessionRateData());

        synchronized (data) {
            long now = System.currentTimeMillis();
            data.lastAccessTime = now;

            // 1. Kiểm tra giới hạn tổng số tin nhắn trong phiên
            if (data.totalSessionMessages >= MAX_MESSAGES_PER_SESSION) {
                log.warn("[ChatRateLimiter] Session [{}] đã vượt hạn mức phiên: {}/{} tin nhắn",
                        sessionId, data.totalSessionMessages, MAX_MESSAGES_PER_SESSION);
                throw new AppException(HttpStatus.TOO_MANY_REQUESTS,
                        String.format("Phiên trò chuyện đã đạt giới hạn tối đa (%d tin nhắn). Quý khách vui lòng bấm 'Xóa lịch sử' hoặc mở phiên mới để tiếp tục.",
                                MAX_MESSAGES_PER_SESSION));
            }

            // 2. Kiểm tra giới hạn tần suất trong 1 phút gần nhất (Sliding Window 60s)
            long windowStart = now - 60_000L;
            data.requestTimestamps.removeIf(ts -> ts < windowStart);

            if (data.requestTimestamps.size() >= MAX_REQUESTS_PER_MINUTE) {
                log.warn("[ChatRateLimiter] Session [{}] gửi quá nhanh: {} tin trong 60s (Giới hạn: {})",
                        sessionId, data.requestTimestamps.size(), MAX_REQUESTS_PER_MINUTE);
                throw new AppException(HttpStatus.TOO_MANY_REQUESTS,
                        "Bạn đang gửi tin nhắn quá nhanh. Vui lòng đợi trong giây lát rồi thử lại (HTTP 429 Too Many Requests).");
            }

            // Ghi nhận lượt gửi thành công
            data.requestTimestamps.add(now);
            data.totalSessionMessages++;
        }
    }

    /**
     * Lấy số lượt tin nhắn đã gửi trong phiên
     */
    public int getSessionMessageCount(String sessionId) {
        if (sessionId == null) return 0;
        SessionRateData data = limiterStore.get(sessionId);
        if (data == null) return 0;
        synchronized (data) {
            return data.totalSessionMessages;
        }
    }

    /**
     * Lấy số tin nhắn còn lại trong phiên
     */
    public int getRemainingSessionMessages(String sessionId) {
        return Math.max(0, MAX_MESSAGES_PER_SESSION - getSessionMessageCount(sessionId));
    }

    /**
     * Reset hoặc xóa dữ liệu rate limit khi phiên bị reset / xóa lịch sử
     */
    public void resetSession(String sessionId) {
        if (sessionId != null) {
            limiterStore.remove(sessionId);
        }
    }

    /**
     * Dọn dẹp các session không hoạt động quá 60 phút
     */
    public void cleanupExpired() {
        long now = System.currentTimeMillis();
        limiterStore.entrySet().removeIf(entry -> (now - entry.getValue().lastAccessTime) > EXPIRATION_MILLIS);
    }

    /**
     * Xóa sạch toàn bộ bộ nhớ (chủ yếu phục vụ kiểm thử)
     */
    public void clearAll() {
        limiterStore.clear();
    }

    /**
     * Thiết lập số lượng tin nhắn trong phiên (chủ yếu phục vụ kiểm thử)
     */
    public void setSessionMessageCountForTesting(String sessionId, int count) {
        if (sessionId != null) {
            SessionRateData data = limiterStore.computeIfAbsent(sessionId, k -> new SessionRateData());
            synchronized (data) {
                data.totalSessionMessages = count;
            }
        }
    }
}

