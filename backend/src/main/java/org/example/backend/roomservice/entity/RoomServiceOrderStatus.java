package org.example.backend.roomservice.entity;

/**
 * Trạng thái vòng đời đơn dịch vụ phòng (SRS FR-21.4).
 * PENDING    - Đơn mới lập, chờ chế biến/chuẩn bị
 * PREPARING  - Bếp/phục vụ đang chế biến/chuẩn bị
 * DELIVERED  - Đã giao thành công tới phòng khách (cộng vào công nợ)
 * CANCELLED  - Đã hủy (bắt buộc có lý do hủy)
 */
public enum RoomServiceOrderStatus {
    PENDING,
    PREPARING,
    DELIVERED,
    CANCELLED
}
