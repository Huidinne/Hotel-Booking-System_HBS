package org.example.backend.roomservice.repository;

import org.example.backend.roomservice.entity.MaintenancePriority;
import org.example.backend.roomservice.entity.MaintenanceRequest;
import org.example.backend.roomservice.entity.MaintenanceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MaintenanceRequestRepository extends JpaRepository<MaintenanceRequest, Long> {

    Optional<MaintenanceRequest> findByIdempotencyKey(String idempotencyKey);

    Optional<MaintenanceRequest> findByRequestCode(String requestCode);

    List<MaintenanceRequest> findByBookingId(Long bookingId);

    @Query("SELECT m FROM MaintenanceRequest m WHERE m.booking.id = :bookingId " +
           "AND (:bookingRoomId IS NULL OR m.bookingRoom.id = :bookingRoomId) " +
           "AND (:status IS NULL OR m.status = :status)")
    Page<MaintenanceRequest> findByBookingAndRoomAndStatus(
            @Param("bookingId") Long bookingId,
            @Param("bookingRoomId") Long bookingRoomId,
            @Param("status") MaintenanceStatus status,
            Pageable pageable);

    @Query("SELECT m FROM MaintenanceRequest m WHERE " +
           "(:roomId IS NULL OR m.room.id = :roomId) " +
           "AND (:status IS NULL OR m.status = :status) " +
           "AND (:priority IS NULL OR m.priority = :priority) " +
           "AND (:blocksResale IS NULL OR m.blocksResale = :blocksResale)")
    Page<MaintenanceRequest> findAllWithFilter(
            @Param("roomId") Long roomId,
            @Param("status") MaintenanceStatus status,
            @Param("priority") MaintenancePriority priority,
            @Param("blocksResale") Boolean blocksResale,
            Pageable pageable);

    @Query("SELECT COUNT(m) FROM MaintenanceRequest m WHERE m.room.id = :roomId " +
           "AND m.status IN ('OPEN', 'IN_PROGRESS') AND m.blocksResale = true")
    long countActiveBlockingRequestsByRoomId(@Param("roomId") Long roomId);
}
