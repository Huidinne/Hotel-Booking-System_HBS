package org.example.backend.booking.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.backend.room.entity.Room;
import org.example.backend.user.entity.User;

import java.time.LocalDateTime;

/**
 * Entity tương ứng bảng `booking_rooms`.
 * Gán phòng vật lý cụ thể cho booking khi Lễ tân thực hiện Check-in.
 */
@Entity
@Table(name = "booking_rooms",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_booking_room",
                columnNames = {"booking_id", "room_id"}
        ))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt;

    /** Lễ tân thực hiện gán phòng — có thể null nếu tự động gán */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by")
    private User assignedBy;

    @PrePersist
    protected void onCreate() {
        if (this.assignedAt == null) {
            this.assignedAt = LocalDateTime.now();
        }
    }
}
