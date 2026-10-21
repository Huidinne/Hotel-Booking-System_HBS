package org.example.backend.user.entity;

/**
 * Vai trò người dùng trong hệ thống.
 * Giá trị phải khớp chính xác với MySQL ENUM trong bảng users.
 */
public enum Role {
    ROLE_CUSTOMER,
    ROLE_RECEPTIONIST,
    ROLE_ADMIN
}
