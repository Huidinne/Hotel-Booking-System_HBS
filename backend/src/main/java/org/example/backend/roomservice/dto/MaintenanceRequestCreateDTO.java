package org.example.backend.roomservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.example.backend.roomservice.entity.MaintenancePriority;

/**
 * Request tạo phiếu sự cố kỹ thuật buồng phòng (SRS Chapter 12: MaintenanceRequest).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceRequestCreateDTO {

    @NotNull(message = "bookingRoomId không được để trống")
    private Long bookingRoomId;

    @NotBlank(message = "Mô tả sự cố không được để trống")
    @Size(max = 1000, message = "Mô tả sự cố tối đa 1000 ký tự")
    private String description;

    @Builder.Default
    private MaintenancePriority priority = MaintenancePriority.NORMAL;

    @Builder.Default
    private Boolean blocksResale = false;
}
