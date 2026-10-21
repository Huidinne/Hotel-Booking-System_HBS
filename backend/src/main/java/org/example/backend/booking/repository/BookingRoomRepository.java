package org.example.backend.booking.repository;

import org.example.backend.booking.entity.BookingRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingRoomRepository extends JpaRepository<BookingRoom, Long> {

    /** Danh sách phòng đã gán cho booking (dùng khi hiển thị chi tiết booking) */
    List<BookingRoom> findByBookingId(Long bookingId);

    /** Đếm số phòng đã gán cho booking */
    int countByBookingId(Long bookingId);
}
