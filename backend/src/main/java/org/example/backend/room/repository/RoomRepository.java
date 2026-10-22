package org.example.backend.room.repository;

import jakarta.persistence.LockModeType;
import org.example.backend.room.entity.Room;
import org.example.backend.room.entity.RoomStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RoomRepository extends JpaRepository<Room, Long> {

    /** Đếm phòng active (không MAINTENANCE) thuộc loại phòng — dùng tính quota */
    @Query("SELECT COUNT(r) FROM Room r WHERE r.roomType.id = :roomTypeId AND r.status <> :status")
    int countByRoomTypeIdAndStatusNot(@Param("roomTypeId") Long roomTypeId, @Param("status") RoomStatus status);

    /** Danh sách tất cả phòng kèm loại phòng */
    @Override
    @EntityGraph(attributePaths = {"roomType"})
    List<Room> findAll();

    /** Danh sách phòng theo loại và trạng thái */
    @EntityGraph(attributePaths = {"roomType"})
    @Query("SELECT r FROM Room r WHERE r.roomType.id = :roomTypeId AND r.status = :status")
    List<Room> findByRoomTypeIdAndStatus(@Param("roomTypeId") Long roomTypeId, @Param("status") RoomStatus status);

    /** Danh sách phòng AVAILABLE thuộc loại phòng — dùng cho giao diện check-in */
    @EntityGraph(attributePaths = {"roomType"})
    @Query("SELECT r FROM Room r WHERE r.roomType.id = :roomTypeId AND r.status = 'AVAILABLE' ORDER BY r.roomNumber")
    List<Room> findAvailableByRoomTypeId(@Param("roomTypeId") Long roomTypeId);

    /** Đếm phòng theo trạng thái — dùng cho dashboard */
    int countByStatus(RoomStatus status);

    /**
     * Pessimistic Lock trên các phòng vật lý cụ thể — dùng khi check-in.
     * Ngăn 2 quầy lễ tân gán trùng cùng một phòng.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Room r WHERE r.id IN :ids")
    List<Room> findAllByIdInForUpdate(@Param("ids") List<Long> ids);

    /** Danh sách phòng theo loại phòng */
    @EntityGraph(attributePaths = {"roomType"})
    @Query("SELECT r FROM Room r WHERE r.roomType.id = :roomTypeId")
    List<Room> findByRoomTypeId(@Param("roomTypeId") Long roomTypeId);

    /** Danh sách phòng theo trạng thái */
    @EntityGraph(attributePaths = {"roomType"})
    List<Room> findByStatus(RoomStatus status);
}
