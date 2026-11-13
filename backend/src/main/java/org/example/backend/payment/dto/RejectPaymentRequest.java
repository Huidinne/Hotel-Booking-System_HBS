package org.example.backend.payment.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO yêu cầu từ chối giao dịch chuyển khoản VietQR từ Admin/Lễ tân.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RejectPaymentRequest {
    @NotBlank(message = "Lý do từ chối không được để trống")
    private String reason;
}
