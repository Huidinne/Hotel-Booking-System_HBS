package org.example.backend.room.dto;

/**
 * Trạng thái buồng phòng ma trận theo quy chuẩn PMS quốc tế (SRS §FR-13.2).
 * AVAILABLE   - Phòng trống, sẵn sàng đón khách (Màu xám nhạt / trắng)
 * CONFIRMED   - Đã có đơn đặt giữ chỗ, đã cọc hoặc xác nhận (Màu xanh dương)
 * CHECKED_IN  - Khách đang lưu trú thực tế tại phòng (Màu xanh lá cây)
 * CLEANING    - Đang dọn dẹp sau khi khách trả phòng (Màu cam cảnh báo)
 * MAINTENANCE - Phòng đang bảo trì thiết bị (Màu đỏ)
 */
public enum RoomTimelineStatus {
    AVAILABLE,
    CONFIRMED,
    CHECKED_IN,
    CLEANING,
    MAINTENANCE
}
