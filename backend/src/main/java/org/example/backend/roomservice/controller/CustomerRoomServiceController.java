package org.example.backend.roomservice.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.common.response.ApiResponse;
import org.example.backend.roomservice.dto.BookingServicesSummaryResponse;
import org.example.backend.roomservice.service.RoomServiceOrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller cho Khách hàng & Lễ tân tra cứu danh sách dịch vụ đã dùng của một booking (SRS Chapter 12).
 * GET /api/v1/bookings/{bookingCode}/services
 */
@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class CustomerRoomServiceController {

    private final RoomServiceOrderService roomServiceOrderService;

    @GetMapping("/{bookingCode}/services")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'RECEPTIONIST', 'ADMIN')")
    public ResponseEntity<ApiResponse<BookingServicesSummaryResponse>> getBookingServices(
            @PathVariable String bookingCode,
            Authentication authentication) {

        String userEmail = authentication != null ? authentication.getName() : null;
        BookingServicesSummaryResponse response = roomServiceOrderService.getBookingServicesSummary(bookingCode, userEmail);

        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
