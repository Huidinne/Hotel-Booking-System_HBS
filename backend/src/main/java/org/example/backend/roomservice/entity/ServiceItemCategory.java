package org.example.backend.roomservice.entity;

/**
 * Phân loại món trong danh mục dịch vụ phòng (SRS FR-21.2).
 */
public enum ServiceItemCategory {
    FOOD,       // Món ăn chính / điểm tâm
    BEVERAGE,   // Đồ uống / cà phê / nước ép
    SNACK,      // Đồ ăn nhẹ
    MINIBAR,    // Đồ minibar có sẵn trong phòng
    OTHER       // Dịch vụ khác
}
