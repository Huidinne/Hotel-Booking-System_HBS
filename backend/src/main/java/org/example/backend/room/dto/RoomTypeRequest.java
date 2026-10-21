package org.example.backend.room.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request tạo/cập nhật Loại phòng (Admin).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomTypeRequest {

    @NotBlank(message = "Tên loại phòng không được để trống")
    @Size(max = 100, message = "Tên loại phòng tối đa 100 ký tự")
    private String name;

    @NotNull(message = "Sức chứa không được để trống")
    @Min(value = 1, message = "Sức chứa tối thiểu là 1 người")
    @Max(value = 20, message = "Sức chứa tối đa là 20 người")
    private Integer capacity;

    @NotNull(message = "Giá phòng không được để trống")
    @DecimalMin(value = "0.01", message = "Giá phòng phải lớn hơn 0")
    private BigDecimal basePrice;

    private String description;

    /** Danh sách tiện nghi, ngăn cách bằng dấu phẩy (vd: "Wi-Fi, TV, Điều hòa") */
    private String amenities;

    @Builder.Default
    private Boolean isActive = true;
}
