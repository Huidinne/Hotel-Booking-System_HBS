package org.example.backend.booking.repository;

import org.example.backend.booking.entity.BookingRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingRoomRepository extends JpaRepository<BookingRoom, Long> {

    /** Danh sách phòng đã gán cho booking (dùng khi hiển thị chi tiết booking) */
    List<BookingRoom> findByBookingId(Long bookingId);

    /** Đếm số phòng đã gán cho booking */
    int countByBookingId(Long bookingId);

    /**
     * Lấy toàn bộ phân bổ phòng của các booking giao thoa trong khoảng [startDate, endDate]
     * có trạng thái CONFIRMED hoặc CHECKED_IN.
     * Sử dụng JOIN FETCH triệt để (Room, Booking, User, RoomType) trong 1 query duy nhất,
     * ngăn chặn hoàn toàn lỗi N+1 truy vấn (SRS §FR-13.4).
     */
    @org.springframework.data.jpa.repository.Query("""
            SELECT br FROM BookingRoom br
            JOIN FETCH br.room r
            JOIN FETCH br.booking b
            JOIN FETCH b.user u
            JOIN FETCH b.roomType rt
            WHERE b.checkInDate <= :endDate
              AND b.checkOutDate > :startDate
              AND b.bookingStatus IN (
                  org.example.backend.booking.entity.BookingStatus.CONFIRMED,
                  org.example.backend.booking.entity.BookingStatus.CHECKED_IN
              )
            ORDER BY b.checkInDate ASC
            """)
    List<BookingRoom> findActiveBookingRoomsBetween(
            @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate,
            @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate);
}
