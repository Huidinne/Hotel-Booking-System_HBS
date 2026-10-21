package org.example.backend.room.repository;

import org.example.backend.room.entity.RoomTypeImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoomTypeImageRepository extends JpaRepository<RoomTypeImage, Long> {

    List<RoomTypeImage> findByRoomTypeId(Long roomTypeId);

    /** Lấy ảnh chính (thumbnail) của loại phòng */
    Optional<RoomTypeImage> findByRoomTypeIdAndIsPrimaryTrue(Long roomTypeId);
}
