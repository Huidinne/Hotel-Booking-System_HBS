package org.example.backend.roomservice.dto;

import lombok.*;
import org.example.backend.roomservice.entity.RoomServiceOrderItem;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomServiceOrderItemResponse {

    private Long id;
    private Long serviceItemId;
    private String nameSnapshot;
    private String unitSnapshot;
    private BigDecimal unitPriceSnapshot;
    private Integer quantity;
    private BigDecimal lineTotal;

    public static RoomServiceOrderItemResponse from(RoomServiceOrderItem item) {
        if (item == null) return null;
        return RoomServiceOrderItemResponse.builder()
                .id(item.getId())
                .serviceItemId(item.getServiceItem() != null ? item.getServiceItem().getId() : null)
                .nameSnapshot(item.getNameSnapshot())
                .unitSnapshot(item.getUnitSnapshot())
                .unitPriceSnapshot(item.getUnitPriceSnapshot())
                .quantity(item.getQuantity())
                .lineTotal(item.getLineTotal())
                .build();
    }
}
