package org.example.backend.chat.dto.tools;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO đại diện cho một lựa chọn loại phòng trong thẻ gợi ý phòng trống (ROOM_OPTIONS).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomOptionItem {
    private Long roomTypeId;
    private String name;
    private String description;
    private Integer capacity;
    private BigDecimal basePrice;
    private String primaryImageUrl;
    private List<String> amenities;
    private int availableRooms;

    @JsonProperty("roomTypeName")
    public String getRoomTypeName() {
        return name;
    }

    @JsonProperty("pricePerNight")
    public BigDecimal getPricePerNight() {
        return basePrice;
    }
}

