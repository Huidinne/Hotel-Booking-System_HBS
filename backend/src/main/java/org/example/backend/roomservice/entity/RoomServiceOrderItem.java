package org.example.backend.roomservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity chi tiết từng món trong đơn dịch vụ phòng (SRS FR-21.2 & FR-21.3).
 * Lưu snapshot bất biến: nameSnapshot, unitSnapshot, unitPriceSnapshot.
 */
@Entity
@Table(name = "room_service_order_items",
        uniqueConstraints = @UniqueConstraint(name = "uk_rso_item", columnNames = {"order_id", "service_item_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomServiceOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private RoomServiceOrder order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_item_id", nullable = false)
    private ServiceItem serviceItem;

    @Column(name = "name_snapshot", nullable = false, length = 150)
    private String nameSnapshot;

    @Column(name = "unit_snapshot", nullable = false, length = 30)
    private String unitSnapshot;

    @Column(name = "unit_price_snapshot", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPriceSnapshot;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "line_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal lineTotal;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
