package org.example.backend.roomservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

/**
 * Chi tiết từng món khi đặt đơn (SRS Chapter 12: items: [{serviceItemId, quantity, itemVersion}]).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomServiceOrderItemRequest {

    @NotNull(message = "serviceItemId không được để trống")
    private Long serviceItemId;

    @NotNull(message = "Số lượng không được để trống")
    @Min(value = 1, message = "Số lượng phải là số nguyên dương (>= 1)")
    private Integer quantity;

    @NotNull(message = "itemVersion không được để trống để phát hiện đổi giá")
    private Long itemVersion;
}
