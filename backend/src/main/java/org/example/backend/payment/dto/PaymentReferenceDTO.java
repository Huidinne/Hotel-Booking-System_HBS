package org.example.backend.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Thông tin tham chiếu đối soát của giao dịch Sổ Cái (SRS §FR-19.1).
 * Liên kết giao dịch thanh toán với Đơn đặt phòng, Khách hàng và Cổng đối tác.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentReferenceDTO {

    /** ID của đơn đặt phòng liên kết */
    private Long bookingId;

    /** Mã hiển thị của đơn đặt phòng (VD: BK-20261110-001) */
    private String bookingCode;

    /** Họ tên khách hàng */
    private String customerName;

    /** Email khách hàng */
    private String customerEmail;

    /** Số điện thoại liên hệ khách hàng */
    private String customerPhone;

    /** Tên loại phòng đặt */
    private String roomTypeName;

    /** Ngày nhận phòng (Check-in) */
    private LocalDate checkInDate;

    /** Ngày trả phòng (Check-out) */
    private LocalDate checkOutDate;

    /** Tổng giá trị hợp đồng booking */
    private BigDecimal totalBookingPrice;

    /** Mã giao dịch duy nhất từ đối tác cổng thanh toán (VD: vnp_TransactionNo từ VNPay) */
    private String externalTransactionNo;

    /** Ghi chú nghiệp vụ đối soát hoặc mã giao dịch ngân hàng do Lễ tân ghi chú */
    private String referenceNote;
}

