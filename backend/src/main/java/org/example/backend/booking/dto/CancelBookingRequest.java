package org.example.backend.booking.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CancelBookingRequest {
    @NotBlank(message = "Lý do hủy phòng không được để trống")
    private String reason;

    private String bankName;
    private String accountNumber;
    private String accountHolder;
}
