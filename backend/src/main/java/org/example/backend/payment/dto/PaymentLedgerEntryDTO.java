package org.example.backend.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.payment.entity.TransactionStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Dòng dữ liệu Sổ Cái Thanh Toán (SRS §FR-19.1).
 * Đại diện cho một bút toán phát sinh dòng tiền thực tế có thời điểm giao dịch xác định.
 * Tuyệt đối không suy đoán từ giá trị booking.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentLedgerEntryDTO {

    /** ID khóa chính của bản ghi giao dịch (bảng payment_transactions) */
    private Long transactionId;

    /** Mã giao dịch nội bộ (VD: TXN-BK-... hoặc COUNTER-BK-... hoặc REFUND-BK-...) */
    private String transactionCode;

    /** Mã đơn đặt phòng liên kết */
    private String bookingCode;

    /** Phân loại giao dịch: DEPOSIT (Cọc), COUNTER_PAYMENT (Thu quầy), REFUND (Hoàn tiền) */
    private PaymentTransactionType type;

    /** Số tiền phát sinh của giao dịch (luôn là số dương) */
    private BigDecimal amount;

    /** Dấu dòng tiền để hạch toán (+1 cho thu vào: DEPOSIT, COUNTER; -1 cho chi ra: REFUND) */
    private int cashFlowSign;

    /** Phương thức thanh toán: VNPAY, CASH, BANK_TRANSFER */
    private PaymentMethod paymentMethod;

    /** Trạng thái giao dịch: SUCCESS, PENDING, FAILED, EXPIRED */
    private TransactionStatus status;

    /**
     * Nguồn thời điểm giao dịch thực tế (transaction_time hoặc created_at của bản ghi).
     * Đây là mốc thời gian để kế toán và Dashboard ghi nhận dòng tiền, không lấy booking.created_at.
     */
    private LocalDateTime transactionTime;

    /** Mã phản hồi kỹ thuật (VD: '00' từ VNPay, hoặc 'REFUND_CONFIRMED', 'CASH_RECEIVED') */
    private String responseCode;

    /** Người thực hiện ghi nhận giao dịch (Khách hàng hoặc Lễ tân/Admin) */
    private String actorEmail;

    /** Thông tin tham chiếu đơn đặt phòng & đối soát chi tiết */
    private PaymentReferenceDTO reference;
}

