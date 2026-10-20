package org.example.backend.room.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomTypeAvailabilityResponse {
    private Long roomTypeId;
    private String name;
    private String description;
    private Integer capacity;
    private BigDecimal basePrice;
    private String primaryImageUrl;
    private List<String> amenities;
    private int availableRooms;
    private int requestedQuantity;
    private boolean isAvailable;
}
