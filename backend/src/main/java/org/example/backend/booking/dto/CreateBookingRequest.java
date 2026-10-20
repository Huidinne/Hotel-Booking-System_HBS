package org.example.backend.booking.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBookingRequest {
    @NotNull(message = "roomTypeId không được để trống")
    private Long roomTypeId;

    @NotNull(message = "Số lượng phòng không được để trống")
    @Min(value = 1, message = "Số lượng phòng tối thiểu là 1")
    private Integer quantity;

    @NotNull(message = "Số lượng khách không được để trống")
    @Min(value = 1, message = "Số lượng khách tối thiểu là 1")
    private Integer guests;

    @NotNull(message = "Ngày nhận phòng không được để trống")
    @FutureOrPresent(message = "Ngày nhận phòng phải từ ngày hiện tại trở đi")
    private LocalDate checkIn;

    @NotNull(message = "Ngày trả phòng không được để trống")
    private LocalDate checkOut;

    @NotBlank(message = "Phương thức thanh toán không được để trống")
    private String paymentMethod; // VNPAY, CASH

    private String note;
}
