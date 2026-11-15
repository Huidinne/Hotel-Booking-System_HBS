package org.example.backend.audit.entity;

/**
 * Danh mục các hành động nghiệp vụ và bảo mật cần ghi vết hệ thống (SRS §FR-16.1).
 */
public enum AuditAction {
    CHECK_IN_ASSIGN_ROOM("Gán phòng & Check-in cho khách"),
    CHECK_OUT_SETTLEMENT("Check-out & Đối soát thanh toán"),
    CANCEL_BOOKING("Hủy đơn đặt phòng & Tính phạt"),
    CONFIRM_BOOKING("Xác nhận đặt phòng"),
    CONFIRM_VIETQR_PAYMENT("Xác nhận thanh toán VietQR"),
    REJECT_VIETQR_PAYMENT("Từ chối giao dịch VietQR"),
    CONFIRM_REFUND("Xác nhận hoàn tiền"),
    CHANGE_ROOM_STATUS("Thay đổi trạng thái phòng vật lý"),
    UPDATE_PRICE("Cập nhật giá loại phòng"),
    CREATE_BOOKING("Tạo đơn đặt phòng"),
    MARK_NO_SHOW("Đánh dấu khách vắng mặt (No-Show)"),
    LOGIN_SUCCESS("Đăng nhập thành công"),
    LOGIN_FAILED("Đăng nhập thất bại");

    private final String description;

    AuditAction(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}

