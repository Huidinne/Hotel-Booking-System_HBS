package org.example.backend.dashboard.projection;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Spring Data JPA Projection cho các đơn hoàn tiền cọc trong kỳ (Refunds / Net Cash Flow).
 */
public interface RefundBookingProjection {

    Long getId();

    BigDecimal getRefundAmount();

    LocalDateTime getCancelledAt();

    LocalDateTime getUpdatedAt();

    static RefundBookingProjection of(Long id, BigDecimal refundAmount, LocalDateTime cancelledAt, LocalDateTime updatedAt) {
        return new RefundBookingProjectionImpl(id, refundAmount, cancelledAt, updatedAt);
    }
}

record RefundBookingProjectionImpl(
        Long id,
        BigDecimal refundAmount,
        LocalDateTime cancelledAt,
        LocalDateTime updatedAt
) implements RefundBookingProjection {

    @Override
    public Long getId() {
        return id;
    }

    @Override
    public BigDecimal getRefundAmount() {
        return refundAmount;
    }

    @Override
    public LocalDateTime getCancelledAt() {
        return cancelledAt;
    }

    @Override
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}

