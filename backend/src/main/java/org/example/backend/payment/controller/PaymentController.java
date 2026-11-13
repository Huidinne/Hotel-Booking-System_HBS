package org.example.backend.payment.controller;

import jakarta.validation.Valid;
import org.example.backend.common.response.ApiResponse;
import org.example.backend.common.response.PageResponse;
import org.example.backend.payment.dto.*;
import org.example.backend.payment.service.PaymentService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
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

    // ═══════════════════════════════════════════════════════════════
    // VIETQR ENDPOINTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Tạo yêu cầu thanh toán VietQR cho booking.
     * POST /api/v1/payments/vietqr
     */
    @PostMapping("/payments/vietqr")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<VietQrPaymentResponse>> createVietQrPayment(
            @Valid @RequestBody CreateVietQrPaymentRequest request,
            Authentication authentication) {

        boolean isAdminOrRec = hasRoleAdminOrReceptionist(authentication);
        VietQrPaymentResponse response = paymentService.createVietQrPayment(
                request, authentication.getName(), isAdminOrRec);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Khởi tạo yêu cầu thanh toán VietQR thành công", response));
    }

    /**
     * Lấy chi tiết giao dịch thanh toán theo paymentId.
     * GET /api/v1/payments/{paymentId}
     */
    @GetMapping("/payments/{paymentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<VietQrPaymentResponse>> getPaymentById(
            @PathVariable Long paymentId,
            Authentication authentication) {

        boolean isAdminOrRec = hasRoleAdminOrReceptionist(authentication);
        VietQrPaymentResponse response = paymentService.getPaymentById(
                paymentId, authentication.getName(), isAdminOrRec);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * Lấy giao dịch thanh toán theo bookingId hoặc bookingCode.
     * GET /api/v1/payments/booking/{bookingId}
     */
    @GetMapping("/payments/booking/{bookingId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<VietQrPaymentResponse>> getPaymentByBooking(
            @PathVariable String bookingId,
            Authentication authentication) {

        boolean isAdminOrRec = hasRoleAdminOrReceptionist(authentication);
        VietQrPaymentResponse response = paymentService.getPaymentByBooking(
                bookingId, authentication.getName(), isAdminOrRec);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * Kiểm tra nhanh trạng thái thanh toán theo paymentId (cho polling).
     * GET /api/v1/payments/{paymentId}/status
     */
    @GetMapping("/payments/{paymentId}/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PaymentStatusResponse>> getPaymentStatus(
            @PathVariable Long paymentId,
            Authentication authentication) {

        boolean isAdminOrRec = hasRoleAdminOrReceptionist(authentication);
        PaymentStatusResponse response = paymentService.getPaymentStatus(
                paymentId, authentication.getName(), isAdminOrRec);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * Danh sách giao dịch VietQR đang chờ xác nhận đối soát.
     * GET /api/v1/admin/payments/pending
     */
    @GetMapping("/admin/payments/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<PageResponse<VietQrPaymentResponse>>> getPendingPayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {

        Page<VietQrPaymentResponse> pageResult = paymentService.getPendingVietQrPayments(page, size, search);
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(pageResult)));
    }

    /**
     * Admin/Lễ tân xác nhận giao dịch chuyển khoản VietQR thành công sau khi kiểm tra tài khoản thực tế.
     * PUT/POST /api/v1/admin/payments/{paymentId}/confirm
     */
    @RequestMapping(value = "/admin/payments/{paymentId}/confirm", method = {RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<VietQrPaymentResponse>> confirmPayment(
            @PathVariable Long paymentId,
            Authentication authentication) {

        VietQrPaymentResponse response = paymentService.confirmVietQrPayment(
                paymentId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Xác nhận thanh toán thành công", response));
    }

    /**
     * Admin/Lễ tân từ chối giao dịch chuyển khoản VietQR nếu không hợp lệ hoặc tiền chưa vào.
     * PUT/POST /api/v1/admin/payments/{paymentId}/reject
     */
    @RequestMapping(value = "/admin/payments/{paymentId}/reject", method = {RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<VietQrPaymentResponse>> rejectPayment(
            @PathVariable Long paymentId,
            @Valid @RequestBody RejectPaymentRequest request,
            Authentication authentication) {

        VietQrPaymentResponse response = paymentService.rejectVietQrPayment(
                paymentId, request, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Đã từ chối giao dịch thanh toán", response));
    }

    private boolean hasRoleAdminOrReceptionist(Authentication authentication) {
        if (authentication == null) return false;
        return authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_RECEPTIONIST".equals(a.getAuthority()));
    }
}
