package org.example.backend.roomservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingRoom;
import org.example.backend.room.entity.Room;

import java.time.LocalDateTime;

/**
 * Entity phiếu yêu cầu bảo trì / báo hỏng thiết bị phòng (SRS FR-21.5 & FR-21.6).
 * Quy tắc cốt lõi: Không tính tiền khách, không tự ý chuyển phòng sang MAINTENANCE hay giải phóng phòng.
 */
@Entity
@Table(name = "maintenance_requests", indexes = {
        @Index(name = "idx_mr_room_status", columnList = "room_id, status"),
        @Index(name = "idx_mr_booking_status", columnList = "booking_id, status"),
        @Index(name = "idx_mr_blocks_resale", columnList = "blocks_resale, status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_room_id", nullable = false)
    private BookingRoom bookingRoom;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "request_code", nullable = false, unique = true, length = 50)
    private String requestCode;

    @Column(nullable = false, length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MaintenancePriority priority = MaintenancePriority.NORMAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private MaintenanceStatus status = MaintenanceStatus.OPEN;

    @Column(name = "blocks_resale", nullable = false)
    @Builder.Default
    private Boolean blocksResale = false;

    @Column(name = "resolution_note", length = 1000)
    private String resolutionNote;

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "resolved_by", length = 100)
    private String resolvedBy;

    @Column(name = "idempotency_key", length = 128)
    private String idempotencyKey;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
