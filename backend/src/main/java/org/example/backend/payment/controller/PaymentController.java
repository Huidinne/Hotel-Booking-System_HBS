package org.example.backend.payment.controller;

import jakarta.validation.Valid;
import org.example.backend.common.response.ApiResponse;
import org.example.backend.common.response.PageResponse;
import org.example.backend.payment.dto.ConfirmRefundRequest;
import org.example.backend.payment.dto.RefundResponse;
import org.example.backend.payment.dto.VnPayReturnResponse;
import org.example.backend.payment.service.PaymentService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST Controller cho các giao dịch thanh toán và đối soát hoàn tiền:
 * Endpoints theo SRS §11.5:
 * - GET  /api/v1/payments/vnpay-ipn                       (Public VNPay Server callback)
 * - GET  /api/v1/payments/vnpay-return                    (Public User Browser redirect)
 * - GET  /api/v1/receptionist/refunds                     (Receptionist/Admin)
 * - POST /api/v1/receptionist/refunds/{bookingId}/confirm (Receptionist/Admin)
 */
@RestController
@RequestMapping("/api/v1")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * Webhook IPN nhận kết quả giao dịch tự động từ VNPay server.
     * Trả về JSON theo định dạng chuẩn { "RspCode": "00", "Message": "Confirm Success" }.
     */
    @GetMapping("/payments/vnpay-ipn")
    public ResponseEntity<Map<String, String>> vnpayIpn(
            @RequestParam Map<String, String> allParams) {

        Map<String, String> result = paymentService.processIpn(allParams);
        return ResponseEntity.ok(result);
    }

    /**
     * Return URL: Trình duyệt của khách hàng được chuyển hướng về sau khi thanh toán.
     */
    @GetMapping("/payments/vnpay-return")
    public ResponseEntity<ApiResponse<VnPayReturnResponse>> vnpayReturn(
            @RequestParam Map<String, String> allParams) {

        VnPayReturnResponse response = paymentService.processReturn(allParams);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * Danh sách các đơn yêu cầu hoàn tiền đang chờ xử lý (REFUND_PENDING).
     */
    @GetMapping("/receptionist/refunds")
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<RefundResponse>>> getPendingRefunds(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<RefundResponse> refunds = paymentService.getPendingRefunds(page, size);
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(refunds)));
    }

    /**
     * Lễ tân/Admin xác nhận đã thực hiện chuyển khoản hoàn tiền thủ công cho khách.
     */
    @PostMapping("/receptionist/refunds/{bookingId}/confirm")
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN')")
    public ResponseEntity<ApiResponse<RefundResponse>> confirmRefund(
            @PathVariable Long bookingId,
            @Valid @RequestBody ConfirmRefundRequest request,
            Authentication authentication) {

        RefundResponse response = paymentService.confirmRefund(
                bookingId, request, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Đã xác nhận hoàn tiền thành công", response));
    }
}
