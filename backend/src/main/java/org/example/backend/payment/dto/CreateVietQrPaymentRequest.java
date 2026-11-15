package org.example.backend.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request tạo hoặc lấy yêu cầu thanh toán VietQR.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateVietQrPaymentRequest {
    private Long bookingId;
    private String bookingCode;
}
