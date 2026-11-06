package org.example.backend.chat.draft;

import lombok.extern.slf4j.Slf4j;
import org.example.backend.booking.dto.BookingResponse;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Quản lý vòng đời của Báo giá (Quotes), Bản nháp (Drafts) và Bộ đệm chống lặp (Idempotency Store):
 * - Lưu trữ tạm thời trong bộ nhớ an toàn luồng (ConcurrentHashMap)
 * - Tự động dọn dẹp các mục đã hết hạn (sau 15-60 phút)
 */
@Slf4j
@Component
public class BookingDraftManager {

    public static final int QUOTE_EXPIRATION_MINUTES = 15;
    public static final int DRAFT_EXPIRATION_MINUTES = 15;

    private final Map<String, BookingQuote> quotes = new ConcurrentHashMap<>();
    private final Map<String, BookingDraft> drafts = new ConcurrentHashMap<>();
    private final Map<String, BookingResponse> idempotencyStore = new ConcurrentHashMap<>();

    // ─── QUOTE MANAGEMENT ──────────────────────────────────────────

    public void saveQuote(BookingQuote quote) {
        if (quote != null && quote.getQuoteId() != null) {
            cleanExpiredItems();
            quotes.put(quote.getQuoteId(), quote);
            log.info("[BookingDraftManager] Đã lưu báo giá [{}] cho loại phòng [{}], hết hạn lúc {}",
                    quote.getQuoteId(), quote.getRoomTypeId(), quote.getExpiresAt());
        }
    }

    public BookingQuote getQuote(String quoteId) {
        if (quoteId == null || quoteId.isBlank()) {
            return null;
        }
        cleanExpiredItems();
        BookingQuote quote = quotes.get(quoteId);
        if (quote != null && quote.isExpired()) {
            quotes.remove(quoteId);
            return null;
        }
        return quote;
    }

    // ─── DRAFT MANAGEMENT ──────────────────────────────────────────

    public void saveDraft(BookingDraft draft) {
        if (draft != null && draft.getDraftId() != null) {
            cleanExpiredItems();
            drafts.put(draft.getDraftId(), draft);
            log.info("[BookingDraftManager] Đã lưu bản nháp [{}] của khách [{}] (hết hạn lúc {})",
                    draft.getDraftId(), draft.getUserEmail(), draft.getExpiresAt());
        }
    }

    public BookingDraft getDraft(String draftId) {
        if (draftId == null || draftId.isBlank()) {
            return null;
        }
        cleanExpiredItems();
        BookingDraft draft = drafts.get(draftId);
        if (draft != null && draft.isExpired()) {
            drafts.remove(draftId);
            return null;
        }
        return draft;
    }

    public void markDraftConfirmed(String draftId) {
        BookingDraft draft = drafts.get(draftId);
        if (draft != null) {
            draft.setStatus("CONFIRMED");
            log.info("[BookingDraftManager] Bản nháp [{}] đã được khách hàng xác nhận thành công", draftId);
        }
    }

    // ─── IDEMPOTENCY STORE ─────────────────────────────────────────

    public void saveIdempotentResponse(String idempotencyKey, BookingResponse response) {
        if (idempotencyKey != null && !idempotencyKey.isBlank() && response != null) {
            idempotencyStore.put(idempotencyKey, response);
            log.info("[BookingDraftManager] Ghi nhận Idempotency key [{}] gắn với mã booking [{}]",
                    idempotencyKey, response.getBookingCode());
        }
    }

    public BookingResponse getIdempotentResponse(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return null;
        }
        return idempotencyStore.get(idempotencyKey);
    }

    // ─── CLEANUP ───────────────────────────────────────────────────

    public void clearAll() {
        quotes.clear();
        drafts.clear();
        idempotencyStore.clear();
    }

    private void cleanExpiredItems() {
        LocalDateTime now = LocalDateTime.now();
        quotes.entrySet().removeIf(entry -> entry.getValue().isExpired());
        drafts.entrySet().removeIf(entry -> entry.getValue().isExpired());
    }
}

