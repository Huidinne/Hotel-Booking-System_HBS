package org.example.backend.payment.service;

import org.example.backend.payment.dto.VietQrPaymentResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Quản lý kết nối Server-Sent Events (SSE) để thông báo kết quả thanh toán
 * tức thời cho Frontend của khách hàng khi Webhook ngân hàng kích hoạt.
 */
@Service
public class PaymentSseService {

    private static final Logger log = LoggerFactory.getLogger(PaymentSseService.class);
    private static final long SSE_TIMEOUT_MS = 15 * 60 * 1000L; // 15 phút khớp hạn giữ chỗ

    private final Map<Long, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    /**
     * Khách hàng đăng ký lắng nghe sự kiện thanh toán của paymentId.
     */
    public SseEmitter subscribe(Long paymentId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        emitters.computeIfAbsent(paymentId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(paymentId, emitter));
        emitter.onTimeout(() -> {
            emitter.complete();
            removeEmitter(paymentId, emitter);
        });
        emitter.onError(e -> removeEmitter(paymentId, emitter));

        try {
            emitter.send(SseEmitter.event()
                    .name("INIT")
                    .data(Map.of("message", "Connected to payment SSE stream", "paymentId", paymentId)));
        } catch (IOException e) {
            removeEmitter(paymentId, emitter);
        }

        return emitter;
    }

    /**
     * Bắn sự kiện PAYMENT_SUCCESS đến toàn bộ client đang mở trang thanh toán của paymentId này.
     */
    public void notifyPaymentSuccess(Long paymentId, VietQrPaymentResponse response) {
        List<SseEmitter> list = emitters.get(paymentId);
        if (list == null || list.isEmpty()) {
            log.info("[PaymentSseService] Không có client SSE nào đang lắng nghe paymentId={}", paymentId);
            return;
        }

        log.info("[PaymentSseService] Đẩy sự kiện PAYMENT_SUCCESS tới {} client cho paymentId={}", list.size(), paymentId);
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event()
                        .name("PAYMENT_SUCCESS")
                        .data(response));
                emitter.complete();
            } catch (Exception e) {
                log.warn("[PaymentSseService] Lỗi gửi SSE event cho paymentId {}: {}", paymentId, e.getMessage());
            }
        }
        emitters.remove(paymentId);
    }

    private void removeEmitter(Long paymentId, SseEmitter emitter) {
        List<SseEmitter> list = emitters.get(paymentId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                emitters.remove(paymentId);
            }
        }
    }
}
