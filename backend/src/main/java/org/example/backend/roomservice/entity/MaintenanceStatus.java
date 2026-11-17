package org.example.backend.roomservice.entity;

/**
 * Trạng thái xử lý phiếu sự cố kỹ thuật (SRS FR-21.5).
 * OPEN        - Phiếu mới tiếp nhận, chờ kỹ thuật kiểm tra
 * IN_PROGRESS - Đang trong quá trình sửa chữa
 * RESOLVED    - Đã xử lý khắc phục xong (bắt buộc có resolutionNote)
 * CANCELLED   - Đã hủy (bắt buộc có lý do)
 */
public enum MaintenanceStatus {
    OPEN,
    IN_PROGRESS,
    RESOLVED,
    CANCELLED
}
