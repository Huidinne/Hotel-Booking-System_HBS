package org.example.backend.payment.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfirmRefundRequest {
    @NotBlank(message = "Ghi chú mã giao dịch hoàn cọc không được để trống")
    private String referenceNote;
}
