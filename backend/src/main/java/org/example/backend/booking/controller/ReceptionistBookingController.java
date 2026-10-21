package org.example.backend.booking.controller;

import jakarta.validation.Valid;
import org.example.backend.booking.dto.*;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.service.BookingService;
import org.example.backend.common.response.ApiResponse;
import org.example.backend.common.response.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller cho Lễ tân/Admin quản lý booking vận hành.
 * Endpoints theo SRS §11.4.
 */
@RestController
@RequestMapping("/api/v1/receptionist/bookings")
@PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN')")
public class ReceptionistBookingController {

    private final BookingService bookingService;

    public ReceptionistBookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    /**
     * Danh sách toàn bộ booking, lọc theo trạng thái.
     * GET /api/v1/receptionist/bookings?status=CONFIRMED&page=0&size=20
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<BookingResponse>>> getAllBookings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) BookingStatus status) {

        Page<BookingResponse> bookingPage = bookingService.getAllBookings(page, size, status);

        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(bookingPage)));
    }

    /**
     * Xác nhận đơn PENDING (thanh toán tại quầy).
     * PUT /api/v1/receptionist/bookings/{bookingId}/confirm
     */
    @PutMapping("/{bookingId}/confirm")
    public ResponseEntity<ApiResponse<BookingResponse>> confirmBooking(
            @PathVariable Long bookingId) {

        BookingResponse response = bookingService.confirmBooking(bookingId);
        return ResponseEntity.ok(ApiResponse.ok("Đã xác nhận đặt phòng thành công", response));
    }

    /**
     * Check-in: gán N phòng vật lý với Pessimistic Lock.
     * POST /api/v1/receptionist/bookings/{bookingId}/check-in
     */
    @PostMapping("/{bookingId}/check-in")
    public ResponseEntity<ApiResponse<BookingResponse>> checkIn(
            @PathVariable Long bookingId,
            @Valid @RequestBody CheckInRequest request,
            Authentication authentication) {

        BookingResponse response = bookingService.checkIn(bookingId, request, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Check-in thành công", response));
    }

    /**
     * Check-out: đối soát và chuyển phòng sang CLEANING.
     * POST /api/v1/receptionist/bookings/{bookingId}/check-out
     */
    @PostMapping("/{bookingId}/check-out")
    public ResponseEntity<ApiResponse<CheckOutResponse>> checkOut(
            @PathVariable Long bookingId,
            Authentication authentication) {

        CheckOutResponse response = bookingService.checkOut(bookingId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Check-out thành công", response));
    }

    /**
     * Đánh dấu No-Show (sau 12:00 ngày check-in + 1).
     * POST /api/v1/receptionist/bookings/{bookingId}/no-show
     */
    @PostMapping("/{bookingId}/no-show")
    public ResponseEntity<ApiResponse<BookingResponse>> markNoShow(
            @PathVariable Long bookingId) {

        BookingResponse response = bookingService.markNoShow(bookingId);
        return ResponseEntity.ok(ApiResponse.ok("Đã đánh dấu No-Show", response));
    }
}
