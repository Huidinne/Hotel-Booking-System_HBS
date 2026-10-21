package org.example.backend.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VnPayReturnResponse {
    private String bookingCode;
    private String transactionCode;
    private String vnpTransactionNo;
    private BigDecimal amount;
    private String responseCode;
    private boolean success;
    private String message;
}
