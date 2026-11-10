package org.example.backend.dashboard.projection;

import org.example.backend.room.entity.RoomStatus;

/**
 * Spring Data JPA Projection cho cơ cấu trạng thái phòng buồng vật lý:
 * Thống kê nhanh bằng GROUP BY tại database, loại bỏ hoàn toàn roomRepository.findAll().
 */
public interface RoomStatusCountProjection {

    RoomStatus getStatus();

    Long getCount();

    static RoomStatusCountProjection of(RoomStatus status, Long count) {
        return new RoomStatusCountProjectionImpl(status, count);
    }
}

record RoomStatusCountProjectionImpl(
        RoomStatus status,
        Long count
) implements RoomStatusCountProjection {

    @Override
    public RoomStatus getStatus() {
        return status;
    }

    @Override
    public Long getCount() {
        return count;
    }
}

