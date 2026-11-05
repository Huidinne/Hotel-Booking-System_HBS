package org.example.backend.booking.controller;

import jakarta.validation.Valid;
import org.example.backend.audit.annotation.Auditable;
import org.example.backend.audit.entity.AuditAction;
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
 * REST Controller cho Booking thao tác bởi Khách hàng, Lễ tân và Quản trị viên.
 * Endpoints theo SRS §11.4 & §11.7.
 */
@RestController
@RequestMapping("/api/v1/bookings")
public class CustomerBookingController {

    private final BookingService bookingService;

    public CustomerBookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    /**
     * Tạo booking mới — Pessimistic Lock chống overbooking.
     * Cho phép Customer (đặt online), Receptionist và Admin (đặt tại quầy / timeline).
     * POST /api/v1/bookings
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('CUSTOMER', 'RECEPTIONIST', 'ADMIN')")
    @Auditable(action = AuditAction.CREATE_BOOKING, targetType = "BOOKING", description = "Tạo đơn đặt phòng")
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
    @PreAuthorize("hasAnyRole('CUSTOMER', 'RECEPTIONIST', 'ADMIN')")
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
     * Cho phép Customer (booking của mình), Receptionist và Admin.
     * GET /api/v1/bookings/{bookingCode}
     */
    @GetMapping("/{bookingCode}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'RECEPTIONIST', 'ADMIN')")
    public ResponseEntity<ApiResponse<BookingResponse>> getBookingByCode(
            @PathVariable String bookingCode,
            Authentication authentication) {

        BookingResponse response = bookingService.getBookingByCode(bookingCode, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * Hủy booking theo chính sách phạt.
     * Cho phép Customer (booking của mình), Receptionist và Admin.
     * POST /api/v1/bookings/{bookingCode}/cancel
     */
    @PostMapping("/{bookingCode}/cancel")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'RECEPTIONIST', 'ADMIN')")
    @Auditable(action = AuditAction.CANCEL_BOOKING, targetType = "BOOKING", description = "Hủy đơn đặt phòng")
    public ResponseEntity<ApiResponse<CancelBookingResponse>> cancelBooking(
            @PathVariable String bookingCode,
            @Valid @RequestBody CancelBookingRequest request,
            Authentication authentication) {

        CancelBookingResponse response = bookingService.cancelBooking(
                bookingCode, request, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Yêu cầu hủy đã được xử lý", response));
    }
}
