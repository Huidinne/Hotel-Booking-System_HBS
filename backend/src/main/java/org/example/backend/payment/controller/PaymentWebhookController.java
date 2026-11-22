package org.example.backend.payment.controller;

import org.example.backend.payment.dto.SePayWebhookRequest;
import org.example.backend.payment.service.PaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller tiếp nhận Webhook thông báo biến động số dư từ cổng thanh toán SePay.
 */
@RestController
@RequestMapping("/api/v1/webhooks")
public class PaymentWebhookController {

    private static final Logger log = LoggerFactory.getLogger(PaymentWebhookController.class);
    private final PaymentService paymentService;

    public PaymentWebhookController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * Endpoint công khai tiếp nhận Webhook từ SePay.
     * POST /api/v1/webhooks/sepay
     *
     * Xác thực: Header Authorization (Apikey <key>)
     * Phản hồi: Luôn trả về 200 OK với JSON {"success": true} khi đã tiếp nhận hoặc bỏ qua.
     */
    @PostMapping("/sepay")
    public ResponseEntity<Map<String, Object>> handleSePayWebhook(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody SePayWebhookRequest request) {

        log.info("[SePay Webhook Controller] Nhận thông báo giao dịch: gateway={}, amount={}, content={}, referenceCode={}",
                request != null ? request.getGateway() : null,
                request != null ? request.getTransferAmount() : null,
                request != null ? request.getContent() : null,
                request != null ? request.getReferenceCode() : null);

        Map<String, Object> result = paymentService.processSePayWebhook(request, authHeader);
        return ResponseEntity.ok(result);
    }
}
