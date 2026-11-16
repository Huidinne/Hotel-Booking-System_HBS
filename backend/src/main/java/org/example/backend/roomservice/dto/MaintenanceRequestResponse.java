package org.example.backend.roomservice.dto;

import lombok.*;
import org.example.backend.roomservice.entity.MaintenancePriority;
import org.example.backend.roomservice.entity.MaintenanceRequest;
import org.example.backend.roomservice.entity.MaintenanceStatus;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceRequestResponse {

    private Long id;
    private Long bookingId;
    private Long bookingRoomId;
    private Long roomId;
    private String roomNumber;
    private String requestCode;
    private String description;
    private MaintenancePriority priority;
    private MaintenanceStatus status;
    private Boolean blocksResale;
    private String resolutionNote;
    private String cancelReason;
    private LocalDateTime resolvedAt;
    private String createdBy;
    private String resolvedBy;
    private Long version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static MaintenanceRequestResponse from(MaintenanceRequest req) {
        if (req == null) return null;

        String roomNum = req.getRoom() != null ? req.getRoom().getRoomNumber() : null;

        return MaintenanceRequestResponse.builder()
                .id(req.getId())
                .bookingId(req.getBooking() != null ? req.getBooking().getId() : null)
                .bookingRoomId(req.getBookingRoom() != null ? req.getBookingRoom().getId() : null)
                .roomId(req.getRoom() != null ? req.getRoom().getId() : null)
                .roomNumber(roomNum)
                .requestCode(req.getRequestCode())
                .description(req.getDescription())
                .priority(req.getPriority())
                .status(req.getStatus())
                .blocksResale(req.getBlocksResale())
                .resolutionNote(req.getResolutionNote())
                .cancelReason(req.getCancelReason())
                .resolvedAt(req.getResolvedAt())
                .createdBy(req.getCreatedBy())
                .resolvedBy(req.getResolvedBy())
                .version(req.getVersion())
                .createdAt(req.getCreatedAt())
                .updatedAt(req.getUpdatedAt())
                .build();
    }
}
