package org.example.backend.chat.session;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Quản lý lịch sử hội thoại nhiều lượt (Multi-turn Chat Session Memory) theo sessionId:
 * - Lưu trữ ngữ cảnh câu hỏi và phản hồi để Gemini AI ghi nhớ mạch trò chuyện của khách hàng.
 * - Giới hạn tối đa MAX_HISTORY_TURNS tin nhắn gần nhất để tối ưu token.
 * - Tự động dọn dẹp các session không hoạt động sau 60 phút để chống rò rỉ bộ nhớ.
 */
@Slf4j
@Component
public class ChatSessionManager {

    public static final int MAX_HISTORY_MESSAGES = 10;
    public static final long SESSION_EXPIRATION_MINUTES = 60;

    private static class SessionEntry {
        final List<ChatMessage> messages = Collections.synchronizedList(new ArrayList<>());
        volatile LocalDateTime lastAccessed = LocalDateTime.now();
    }

    private final Map<String, SessionEntry> sessionStore = new ConcurrentHashMap<>();

    /**
     * Lấy danh sách lịch sử tin nhắn của session
     */
    public List<ChatMessage> getHistory(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return Collections.emptyList();
        }
        cleanExpiredSessions();

        SessionEntry entry = sessionStore.get(sessionId);
        if (entry == null) {
            return Collections.emptyList();
        }
        entry.lastAccessed = LocalDateTime.now();
        synchronized (entry.messages) {
            return new ArrayList<>(entry.messages);
        }
    }

    /**
     * Ghi nhận tin nhắn mới vào session
     */
    public void recordMessage(String sessionId, String role, String text) {
        if (sessionId == null || sessionId.isBlank() || text == null || text.isBlank()) {
            return;
        }

        SessionEntry entry = sessionStore.computeIfAbsent(sessionId, k -> new SessionEntry());
        entry.lastAccessed = LocalDateTime.now();

        synchronized (entry.messages) {
            entry.messages.add(ChatMessage.builder()
                    .role(role)
                    .text(text)
                    .timestamp(LocalDateTime.now())
                    .build());

            // Giữ lại tối đa MAX_HISTORY_MESSAGES tin nhắn gần nhất
            while (entry.messages.size() > MAX_HISTORY_MESSAGES) {
                entry.messages.remove(0);
            }
        }
    }

    /**
     * Xóa sạch lịch sử một session (khi kết thúc hoặc reset)
     */
    public void clearSession(String sessionId) {
        if (sessionId != null) {
            sessionStore.remove(sessionId);
        }
    }

    /**
     * Đếm tổng số session đang hoạt động
     */
    public int getActiveSessionCount() {
        return sessionStore.size();
    }

    private void cleanExpiredSessions() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(SESSION_EXPIRATION_MINUTES);
        sessionStore.entrySet().removeIf(entry -> entry.getValue().lastAccessed.isBefore(threshold));
    }
}

