package org.example.backend.room.repository;

import org.example.backend.room.entity.RoomTypeImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RoomTypeImageRepository extends JpaRepository<RoomTypeImage, Long> {

    @Query("SELECT rti FROM RoomTypeImage rti WHERE rti.roomType.id = :roomTypeId")
    List<RoomTypeImage> findByRoomTypeId(@Param("roomTypeId") Long roomTypeId);

    /** Lấy ảnh chính (thumbnail) của loại phòng */
    @Query("SELECT rti FROM RoomTypeImage rti WHERE rti.roomType.id = :roomTypeId AND rti.isPrimary = true")
    Optional<RoomTypeImage> findByRoomTypeIdAndIsPrimaryTrue(@Param("roomTypeId") Long roomTypeId);
}
