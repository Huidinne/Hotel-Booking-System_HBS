package org.example.backend.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Thống kê tổng hợp Dòng tiền Sổ Cái trong kỳ báo cáo (SRS §FR-19.2).
 * Công thức chuẩn:
 * Dòng tiền thực thu (Net Cash Flow) = Tổng cọc online + Tổng thu quầy (tiền mặt & chuyển khoản) - Tổng đã hoàn cọc.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentLedgerSummaryDTO {

    /** Ngày bắt đầu kỳ đối soát */
    private LocalDate periodStart;

    /** Ngày kết thúc kỳ đối soát */
    private LocalDate periodEnd;

    /** Tổng tiền cọc trực tuyến đã thanh toán thành công (VNPay) */
    @Builder.Default
    private BigDecimal totalDepositOnline = BigDecimal.ZERO;

    /** Tổng tiền thu tại quầy bằng tiền mặt (CASH) */
    @Builder.Default
    private BigDecimal totalCounterCash = BigDecimal.ZERO;

    /** Tổng tiền thu tại quầy bằng chuyển khoản / quẹt thẻ (BANK_TRANSFER) */
    @Builder.Default
    private BigDecimal totalCounterTransfer = BigDecimal.ZERO;

    /** Tổng thu tại quầy (Tiền mặt + Chuyển khoản) */
    @Builder.Default
    private BigDecimal totalCounterRevenue = BigDecimal.ZERO;

    /** Tổng các khoản tiền đã thực tế xuất chuyển khoản hoàn trả khách (REFUND) */
    @Builder.Default
    private BigDecimal totalRefunded = BigDecimal.ZERO;

    /**
     * Dòng tiền thực thu ròng (Net Cash Flow):
     * Net = (totalDepositOnline + totalCounterRevenue) - totalRefunded
     */
    @Builder.Default
    private BigDecimal netCashFlow = BigDecimal.ZERO;

    /** Tổng số lượng giao dịch thành công trong kỳ */
    @Builder.Default
    private long successfulTransactionCount = 0;

    /** Tổng số lượng giao dịch thất bại / đã hủy trong kỳ */
    @Builder.Default
    private long failedTransactionCount = 0;
}

