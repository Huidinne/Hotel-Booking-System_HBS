package org.example.backend.roomservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.example.backend.roomservice.entity.MaintenanceStatus;

/**
 * Request cập nhật trạng thái phiếu sự cố (SRS Chapter 12: {status, version, blocksResale, resolutionNote?, reason?}).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceStatusUpdateRequest {

    @NotNull(message = "status không được để trống")
    private MaintenanceStatus status;

    @NotNull(message = "version không được để trống để đảm bảo Optimistic Locking")
    private Long version;

    private Boolean blocksResale;

    @Size(max = 1000, message = "Ghi chú kết quả xử lý tối đa 1000 ký tự")
    private String resolutionNote;

    @Size(max = 500, message = "Lý do hủy tối đa 500 ký tự")
    private String reason;
}
