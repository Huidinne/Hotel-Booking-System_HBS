package org.example.backend.room.repository;

import jakarta.persistence.LockModeType;
import org.example.backend.room.entity.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RoomTypeRepository extends JpaRepository<RoomType, Long> {

    /** Danh sách loại phòng đang active (mở bán) */
    List<RoomType> findByIsActiveTrue();

    /** Danh sách loại phòng active có sức chứa >= guests */
    @Query("SELECT rt FROM RoomType rt WHERE rt.isActive = true AND rt.capacity >= :guests")
    List<RoomType> findActiveByCapacity(@Param("guests") int guests);

    /**
     * Pessimistic Lock trên RoomType — dùng khi tạo booking để chống overbooking.
     * SELECT ... FOR UPDATE ngăn các transaction khác đồng thời đọc/ghi cùng RoomType.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT rt FROM RoomType rt WHERE rt.id = :id")
    Optional<RoomType> findByIdForUpdate(@Param("id") Long id);
}
