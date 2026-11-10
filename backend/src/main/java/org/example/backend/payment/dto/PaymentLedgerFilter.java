package org.example.backend.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.payment.entity.TransactionStatus;

import java.time.LocalDate;

/**
 * Tiêu chí tra cứu & bộ lọc Sổ Cái Thanh Toán (SRS §FR-19.1).
 * Hỗ trợ lọc đa chiều theo ngày phát sinh giao dịch, phương thức, loại giao dịch và mã đơn.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentLedgerFilter {

    /** Ngày bắt đầu của khoảng thời gian phát sinh giao dịch (mặc định đầu tháng nếu null) */
    private LocalDate startDate;

    /** Ngày kết thúc của khoảng thời gian phát sinh giao dịch (mặc định cuối ngày hiện tại nếu null) */
    private LocalDate endDate;

    /** Phân loại giao dịch: DEPOSIT, COUNTER_PAYMENT, REFUND, ADDITIONAL_SERVICE */
    private PaymentTransactionType type;

    /** Phương thức thanh toán: VNPAY, CASH, BANK_TRANSFER */
    private PaymentMethod paymentMethod;

    /** Trạng thái giao dịch: SUCCESS (mặc định tính dòng tiền), PENDING, FAILED, EXPIRED */
    private TransactionStatus status;

    /** Lọc theo mã đơn đặt phòng (hỗ trợ tìm kiếm gần đúng LIKE %bookingCode%) */
    private String bookingCode;

    /** Số trang (bắt đầu từ 0) */
    @Builder.Default
    private int page = 0;

    /** Số lượng bản ghi trên một trang (giới hạn 1..100, mặc định 20) */
    @Builder.Default
    private int size = 20;
}

