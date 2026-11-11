package org.example.backend.payment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.example.backend.booking.entity.PaymentMethod;

import java.math.BigDecimal;

/**
 * Request ghi nhận giao dịch thanh toán tại quầy Lễ tân (SRS §FR-19.1).
 * Áp dụng khi khách thanh toán lúc Check-in, Check-out, hoặc thanh toán tiền phòng/phụ thu tại quầy.
 * Lưu trực tiếp bút toán vào payment_transactions để Sổ Cái và Dashboard ghi nhận đúng nguồn thời điểm.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecordCounterPaymentRequest {

    /** ID của đơn đặt phòng */
    @NotNull(message = "ID đặt phòng không được để trống")
    private Long bookingId;

    /** Số tiền thực tế thu tại quầy (bắt buộc > 0) */
    @NotNull(message = "Số tiền thu không được để trống")
    @DecimalMin(value = "1000", message = "Số tiền thanh toán tối thiểu là 1.000 VNĐ")
    private BigDecimal amount;

    /** Phương thức thanh toán tại quầy: CASH (tiền mặt) hoặc BANK_TRANSFER (quẹt thẻ POS / QR chuyển khoản) */
    @NotNull(message = "Phương thức thanh toán không được để trống")
    private PaymentMethod paymentMethod;

    /** Phân loại giao dịch (mặc định COUNTER_PAYMENT) */
    @Builder.Default
    private PaymentTransactionType type = PaymentTransactionType.COUNTER_PAYMENT;

    /** Ghi chú nghiệp vụ / Mã biên lai POS / Mã tham chiếu chuyển khoản */
    private String referenceNote;
}

