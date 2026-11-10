package org.example.backend.dashboard.repository;

import org.example.backend.booking.entity.Booking;
import org.example.backend.dashboard.projection.BookingPeriodProjection;
import org.example.backend.dashboard.projection.RefundBookingProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository chuyên biệt cho Dashboard thống kê (SRS §11.6, §2.7 & FR-14):
 * - Tối ưu hóa truy vấn có điều kiện theo khoảng ngày [dateFrom, dateTo].
 * - Triệt để loại bỏ findAll() gây quá tải bộ nhớ JVM.
 * - Sử dụng Projection trích xuất nhẹ nhàng chỉ các trường cần thiết.
 * - Cô lập hoàn toàn với BookingRepository chung (không xung đột khi phối hợp Đức Anh).
 */
@Repository
public interface DashboardRepository extends JpaRepository<Booking, Long> {

    /**
     * Lấy danh sách booking lưu trú (CHECKED_IN, CHECKED_OUT) giao cắt với kỳ [dateFrom, dateTo].
     * Điều kiện giao cắt: b.checkInDate <= :dateTo AND b.checkOutDate > :dateFrom.
     * Quy tắc lưu trú: Khách checkout đúng ngày dateFrom (b.checkOutDate = dateFrom) có 0 đêm trong kỳ nên bị loại trừ.
     */
    @Query("""
            SELECT b.id AS id,
                   b.checkInDate AS checkInDate,
                   b.checkOutDate AS checkOutDate,
                   b.quantity AS quantity,
                   b.totalPrice AS totalPrice,
                   b.depositAmount AS depositAmount,
                   b.bookingStatus AS bookingStatus,
                   b.paymentStatus AS paymentStatus,
                   rt.id AS roomTypeId,
                   rt.name AS roomTypeName
            FROM Booking b
            JOIN b.roomType rt
            WHERE b.checkInDate <= :dateTo
              AND b.checkOutDate > :dateFrom
              AND b.bookingStatus IN (org.example.backend.booking.entity.BookingStatus.CHECKED_IN,
                                      org.example.backend.booking.entity.BookingStatus.CHECKED_OUT)
            ORDER BY b.checkInDate ASC
            """)
    List<BookingPeriodProjection> findOccupiedBookingsInPeriod(@Param("dateFrom") LocalDate dateFrom,
                                                              @Param("dateTo") LocalDate dateTo);

    /**
     * Lấy tất cả các đơn hợp lệ (CONFIRMED, CHECKED_IN, CHECKED_OUT) giao cắt với kỳ để tính expectedRevenue và confirmedBookings.
     */
    @Query("""
            SELECT b.id AS id,
                   b.checkInDate AS checkInDate,
                   b.checkOutDate AS checkOutDate,
                   b.quantity AS quantity,
                   b.totalPrice AS totalPrice,
                   b.depositAmount AS depositAmount,
                   b.bookingStatus AS bookingStatus,
                   b.paymentStatus AS paymentStatus,
                   rt.id AS roomTypeId,
                   rt.name AS roomTypeName
            FROM Booking b
            JOIN b.roomType rt
            WHERE b.checkInDate <= :dateTo
              AND b.checkOutDate > :dateFrom
              AND b.bookingStatus IN (org.example.backend.booking.entity.BookingStatus.CONFIRMED,
                                      org.example.backend.booking.entity.BookingStatus.CHECKED_IN,
                                      org.example.backend.booking.entity.BookingStatus.CHECKED_OUT)
            ORDER BY b.checkInDate ASC
            """)
    List<BookingPeriodProjection> findActivePeriodBookings(@Param("dateFrom") LocalDate dateFrom,
                                                          @Param("dateTo") LocalDate dateTo);

    /**
     * Đếm tổng số booking giao cắt với kỳ báo cáo (không phân biệt status).
     */
    @Query("""
            SELECT COUNT(b) FROM Booking b
            WHERE b.checkInDate IS NOT NULL
              AND b.checkOutDate IS NOT NULL
              AND b.checkInDate <= :dateTo
              AND b.checkOutDate > :dateFrom
            """)
    long countTotalBookingsInPeriod(@Param("dateFrom") LocalDate dateFrom,
                                   @Param("dateTo") LocalDate dateTo);

    /**
     * Lấy các đơn hủy/hoàn tiền có sự kiện hoàn tiền phát sinh trong khoảng thời gian [startDateTime, endDateTime].
     */
    @Query("""
            SELECT b.id AS id,
                   b.refundAmount AS refundAmount,
                   b.cancelledAt AS cancelledAt,
                   b.updatedAt AS updatedAt
            FROM Booking b
            WHERE (b.paymentStatus = org.example.backend.booking.entity.PaymentStatus.REFUNDED
                   OR (b.refundAmount IS NOT NULL AND b.refundAmount > 0))
              AND ((b.cancelledAt >= :startDateTime AND b.cancelledAt <= :endDateTime)
                   OR (b.updatedAt >= :startDateTime AND b.updatedAt <= :endDateTime))
            """)
    List<RefundBookingProjection> findRefundedBookingsInPeriod(@Param("startDateTime") LocalDateTime startDateTime,
                                                              @Param("endDateTime") LocalDateTime endDateTime);
}

