package org.example.backend.roomservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.example.backend.roomservice.entity.RoomServiceOrderStatus;

/**
 * Request chuyển trạng thái đơn dịch vụ phòng (SRS Chapter 12: {status, version, reason?}).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomServiceStatusUpdateRequest {

    @NotNull(message = "status không được để trống")
    private RoomServiceOrderStatus status;

    @NotNull(message = "version không được để trống để bảo đảm Optimistic Locking")
    private Long version;

    @Size(max = 500, message = "Lý do hủy tối đa 500 ký tự")
    private String reason;
}
