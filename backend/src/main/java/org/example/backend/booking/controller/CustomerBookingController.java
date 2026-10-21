package org.example.backend.booking.controller;

import jakarta.validation.Valid;
import org.example.backend.booking.dto.*;
import org.example.backend.booking.service.BookingService;
import org.example.backend.common.response.ApiResponse;
import org.example.backend.common.response.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller cho Customer thao tác với booking cá nhân.
 * Endpoints theo SRS §11.4.
 */
@RestController
@RequestMapping("/api/v1/bookings")
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerBookingController {

    private final BookingService bookingService;

    public CustomerBookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    /**
     * Tạo booking mới — Pessimistic Lock chống overbooking.
     * POST /api/v1/bookings
     */
    @PostMapping
    public ResponseEntity<ApiResponse<BookingResponse>> createBooking(
            @Valid @RequestBody CreateBookingRequest request,
            Authentication authentication) {

        BookingResponse response = bookingService.createBooking(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Đặt phòng thành công", response));
    }

    /**
     * Danh sách booking cá nhân (phân trang).
     * GET /api/v1/bookings/my-bookings?page=0&size=10
     */
    @GetMapping("/my-bookings")
    public ResponseEntity<ApiResponse<PageResponse<BookingResponse>>> getMyBookings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {

        Page<BookingResponse> bookingPage = bookingService.getMyBookings(
                authentication.getName(), page, size);

        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(bookingPage)));
    }

    /**
     * Chi tiết booking theo booking code.
     * GET /api/v1/bookings/{bookingCode}
     */
    @GetMapping("/{bookingCode}")
    public ResponseEntity<ApiResponse<BookingResponse>> getBookingByCode(
            @PathVariable String bookingCode,
            Authentication authentication) {

        BookingResponse response = bookingService.getBookingByCode(bookingCode, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * Hủy booking theo chính sách phạt.
     * POST /api/v1/bookings/{bookingCode}/cancel
     */
    @PostMapping("/{bookingCode}/cancel")
    public ResponseEntity<ApiResponse<CancelBookingResponse>> cancelBooking(
            @PathVariable String bookingCode,
            @Valid @RequestBody CancelBookingRequest request,
            Authentication authentication) {

        CancelBookingResponse response = bookingService.cancelBooking(
                bookingCode, request, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Yêu cầu hủy đã được xử lý", response));
    }
}
