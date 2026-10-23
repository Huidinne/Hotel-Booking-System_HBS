package org.example.backend.room.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request tạo/cập nhật Phòng vật lý (Admin).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomRequest {

    @NotBlank(message = "Số phòng không được để trống")
    @Size(max = 20, message = "Số phòng tối đa 20 ký tự")
    private String roomNumber;

    @NotNull(message = "Loại phòng không được để trống")
    private Long roomTypeId;

    @NotNull(message = "Tầng không được để trống")
    @Min(value = 1, message = "Tầng tối thiểu là 1")
    @Max(value = 100, message = "Tầng tối đa là 100")
    private Integer floor;

    /** Trạng thái ban đầu khi tạo phòng (mặc định AVAILABLE) */
    private String status;
}
