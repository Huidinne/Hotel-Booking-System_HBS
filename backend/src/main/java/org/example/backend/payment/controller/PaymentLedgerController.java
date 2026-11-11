package org.example.backend.payment.controller;

import jakarta.validation.Valid;
import org.example.backend.common.response.ApiResponse;
import org.example.backend.payment.dto.*;
import org.example.backend.payment.service.PaymentService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * REST Controller cho Sổ Cái Thanh Toán & Dòng Tiền Thực Thu (SRS §FR-19).
 * - GET  /api/v1/admin/payment-ledger          (Admin xem sổ cái phân trang & bộ lọc)
 * - GET  /api/v1/admin/payment-ledger/summary  (Admin & Dashboard xem KPI dòng tiền ròng)
 * - POST /api/v1/receptionist/payments/counter (Lễ tân/Admin ghi nhận thu tiền tại quầy)
 */
@RestController
@RequestMapping("/api/v1")
public class PaymentLedgerController {

    private final PaymentService paymentService;

    public PaymentLedgerController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * Admin: Tra cứu Sổ Cái Thanh Toán phân trang kèm bộ lọc và tổng hợp dòng tiền ròng.
     */
    @GetMapping("/admin/payment-ledger")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PaymentLedgerResponse>> getPaymentLedger(
            @ModelAttribute PaymentLedgerFilter filter) {

        PaymentLedgerResponse response = paymentService.getPaymentLedger(filter);
        return ResponseEntity.ok(ApiResponse.ok("Tra cứu sổ cái thanh toán thành công", response));
    }

    /**
     * Admin/Dashboard: Tra cứu nhanh KPI dòng tiền ròng (Net Cash Flow) theo khoảng ngày.
     */
    @GetMapping("/admin/payment-ledger/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PaymentLedgerSummaryDTO>> getLedgerSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        PaymentLedgerSummaryDTO summary = paymentService.getLedgerSummary(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.ok("Tổng hợp dòng tiền thành công", summary));
    }

    /**
     * Lễ tân/Admin: Ghi nhận thanh toán tại quầy thực tế (CASH hoặc POS/BANK_TRANSFER).
     */
    @PostMapping("/receptionist/payments/counter")
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN')")
    public ResponseEntity<ApiResponse<PaymentLedgerEntryDTO>> recordCounterPayment(
            @Valid @RequestBody RecordCounterPaymentRequest request,
            Authentication authentication) {

        String receptionistEmail = authentication != null ? authentication.getName() : "receptionist@grandaurora.com";
        PaymentLedgerEntryDTO entry = paymentService.recordCounterPayment(request, receptionistEmail);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Ghi nhận thu tiền tại quầy thành công", entry));
    }
}
