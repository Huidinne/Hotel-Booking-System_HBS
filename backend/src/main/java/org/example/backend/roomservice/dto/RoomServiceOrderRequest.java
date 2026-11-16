package org.example.backend.roomservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

/**
 * Request tạo đơn dịch vụ phòng (SRS Chapter 12: RoomServiceOrderRequest).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomServiceOrderRequest {

    @NotNull(message = "bookingRoomId không được để trống")
    private Long bookingRoomId;

    @NotEmpty(message = "Đơn dịch vụ phòng phải có ít nhất một món")
    @Valid
    private List<RoomServiceOrderItemRequest> items;

    @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
    private String note;
}
