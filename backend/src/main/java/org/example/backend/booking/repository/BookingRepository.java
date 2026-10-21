package org.example.backend.booking.repository;

import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    /** Tìm booking theo mã đặt phòng */
    Optional<Booking> findByBookingCode(String bookingCode);

    /** Danh sách booking cá nhân của customer */
    Page<Booking> findByUserId(Long userId, Pageable pageable);

    /** Danh sách booking cá nhân theo trạng thái */
    Page<Booking> findByUserIdAndBookingStatus(Long userId, BookingStatus status, Pageable pageable);

    /** Danh sách booking theo trạng thái thanh toán (dùng cho hoàn tiền) */
    Page<Booking> findByPaymentStatus(org.example.backend.booking.entity.PaymentStatus paymentStatus, Pageable pageable);

    /**
     * Tính tổng số phòng đã bị chiếm (booked) của một loại phòng trong khoảng thời gian.
     * Dùng cho thuật toán kiểm tra khả dụng & chống overbooking (SRS §3.3):
     *
     * BookedRoomsCount = SUM(quantity) WHERE:
     *   - Cùng room_type_id
     *   - Khoảng thời gian giao nhau: check_in_date < :checkOut AND check_out_date > :checkIn
     *   - Trạng thái giữ quota hợp lệ:
     *     + CONFIRMED hoặc CHECKED_IN (luôn giữ quota)
     *     + PENDING còn trong hạn hold_expires_at
     */
    @Query("""
            SELECT COALESCE(SUM(b.quantity), 0) FROM Booking b
            WHERE b.roomType.id = :roomTypeId
            AND b.checkInDate < :checkOut
            AND b.checkOutDate > :checkIn
            AND (
                b.bookingStatus IN (org.example.backend.booking.entity.BookingStatus.CONFIRMED,
                                    org.example.backend.booking.entity.BookingStatus.CHECKED_IN)
                OR (b.bookingStatus = org.example.backend.booking.entity.BookingStatus.PENDING
                    AND b.holdExpiresAt > :now)
            )
            """)
    int countBookedRooms(@Param("roomTypeId") Long roomTypeId,
                         @Param("checkIn") LocalDate checkIn,
                         @Param("checkOut") LocalDate checkOut,
                         @Param("now") LocalDateTime now);

    /**
     * Tìm booking PENDING đã quá hạn hold_expires_at — dùng cho Cronjob auto-cancel.
     */
    @Query("""
            SELECT b FROM Booking b
            WHERE b.bookingStatus = org.example.backend.booking.entity.BookingStatus.PENDING
            AND b.holdExpiresAt IS NOT NULL
            AND b.holdExpiresAt < :now
            """)
    List<Booking> findExpiredPendingBookings(@Param("now") LocalDateTime now);

    /**
     * Tìm booking CONFIRMED đã quá ngày check-in + 1 (12:00 trưa) mà chưa check-in
     * — dùng cho Cronjob xử lý No-Show.
     */
    @Query("""
            SELECT b FROM Booking b
            WHERE b.bookingStatus = org.example.backend.booking.entity.BookingStatus.CONFIRMED
            AND b.checkInDate < :today
            """)
    List<Booking> findNoShowCandidates(@Param("today") LocalDate today);
}
