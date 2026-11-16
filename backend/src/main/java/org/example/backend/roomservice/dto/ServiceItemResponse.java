package org.example.backend.roomservice.dto;

import lombok.*;
import org.example.backend.roomservice.entity.ServiceItem;
import org.example.backend.roomservice.entity.ServiceItemCategory;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceItemResponse {

    private Long id;
    private String name;
    private ServiceItemCategory category;
    private String unit;
    private BigDecimal price;
    private String imageUrl;
    private Boolean isActive;
    private Long version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ServiceItemResponse from(ServiceItem item) {
        if (item == null) return null;
        return ServiceItemResponse.builder()
                .id(item.getId())
                .name(item.getName())
                .category(item.getCategory())
                .unit(item.getUnit())
                .price(item.getPrice())
                .imageUrl(item.getImageUrl())
                .isActive(item.getIsActive())
                .version(item.getVersion())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}
