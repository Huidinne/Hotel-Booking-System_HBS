package org.example.backend.roomservice.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import org.example.backend.roomservice.entity.ServiceItemCategory;

import java.math.BigDecimal;

/**
 * DTO tạo / cập nhật món trong danh mục (SRS Chapter 12).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceItemRequest {

    @NotBlank(message = "Tên món không được để trống")
    @Size(max = 150, message = "Tên món tối đa 150 ký tự")
    private String name;

    @NotNull(message = "Phân loại món không được để trống")
    private ServiceItemCategory category;

    @NotBlank(message = "Đơn vị tính không được để trống")
    @Size(max = 30, message = "Đơn vị tính tối đa 30 ký tự")
    private String unit;

    @NotNull(message = "Đơn giá không được để trống")
    @DecimalMin(value = "0.0", inclusive = true, message = "Đơn giá không được âm")
    private BigDecimal price;

    @Size(max = 1000, message = "Đường dẫn ảnh tối đa 1000 ký tự")
    private String imageUrl;

    @Builder.Default
    private Boolean isActive = true;

    private Long version;
}
