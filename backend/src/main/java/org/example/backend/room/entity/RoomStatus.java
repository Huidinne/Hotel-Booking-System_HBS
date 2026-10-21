package org.example.backend.room.entity;

/**
 * Trạng thái buồng phòng vật lý.
 * AVAILABLE  — Sẵn sàng đón khách
 * OCCUPIED   — Đang có khách lưu trú
 * CLEANING   — Đang dọn dẹp sau khi khách trả phòng
 * MAINTENANCE — Đang bảo trì / sửa chữa (loại khỏi quota bán phòng)
 */
public enum RoomStatus {
    AVAILABLE,
    OCCUPIED,
    CLEANING,
    MAINTENANCE
}
