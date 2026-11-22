package org.example.backend.roomservice.repository;

import org.example.backend.roomservice.entity.RoomServiceOrder;
import org.example.backend.roomservice.entity.RoomServiceOrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomServiceOrderRepository extends JpaRepository<RoomServiceOrder, Long> {

    Optional<RoomServiceOrder> findByIdempotencyKey(String idempotencyKey);

    Optional<RoomServiceOrder> findByOrderCode(String orderCode);

    List<RoomServiceOrder> findByBookingId(Long bookingId);

    @Query("SELECT DISTINCT o FROM RoomServiceOrder o LEFT JOIN FETCH o.items WHERE o.booking.id = :bookingId")
    List<RoomServiceOrder> findByBookingIdWithItems(@Param("bookingId") Long bookingId);

    List<RoomServiceOrder> findByBookingIdAndStatus(Long bookingId, RoomServiceOrderStatus status);

    @Query("SELECT o FROM RoomServiceOrder o WHERE o.booking.id = :bookingId " +
           "AND (:bookingRoomId IS NULL OR o.bookingRoom.id = :bookingRoomId) " +
           "AND (:status IS NULL OR o.status = :status)")
    Page<RoomServiceOrder> findByBookingAndRoomAndStatus(
            @Param("bookingId") Long bookingId,
            @Param("bookingRoomId") Long bookingRoomId,
            @Param("status") RoomServiceOrderStatus status,
            Pageable pageable);

    @Query("SELECT COUNT(o) FROM RoomServiceOrder o WHERE o.booking.id = :bookingId AND o.status IN ('PENDING', 'PREPARING')")
    long countPendingOrdersByBookingId(@Param("bookingId") Long bookingId);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM RoomServiceOrder o WHERE o.booking.id = :bookingId AND o.status = org.example.backend.roomservice.entity.RoomServiceOrderStatus.DELIVERED")
    java.math.BigDecimal sumDeliveredOrdersAmount(@Param("bookingId") Long bookingId);
}
