package org.example.backend.roomservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.common.response.ApiResponse;
import org.example.backend.roomservice.dto.BookingRoomServicesResponse;
import org.example.backend.roomservice.dto.RoomServiceOrderRequest;
import org.example.backend.roomservice.dto.RoomServiceOrderResponse;
import org.example.backend.roomservice.dto.RoomServiceStatusUpdateRequest;
import org.example.backend.roomservice.service.RoomServiceOrderService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Controller cho Lễ tân/Admin thao tác đơn dịch vụ buồng phòng (SRS Chapter 12).
 */
@RestController
@RequestMapping("/api/v1/receptionist")
@PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN')")
@RequiredArgsConstructor
public class ReceptionistRoomServiceController {

    private final RoomServiceOrderService roomServiceOrderService;

    /**
     * Tạo đơn dịch vụ phòng mới theo BookingRoom.
     * POST /api/v1/receptionist/bookings/{bookingId}/room-service-orders
     */
    @PostMapping("/bookings/{bookingId}/room-service-orders")
    public ResponseEntity<ApiResponse<RoomServiceOrderResponse>> createOrder(
            @PathVariable Long bookingId,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody RoomServiceOrderRequest request,
            Authentication authentication) {

        String currentActorEmail = authentication != null ? authentication.getName() : "system";
        RoomServiceOrderResponse response = roomServiceOrderService.createOrder(
                bookingId, request, idempotencyKey, currentActorEmail);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Tạo đơn dịch vụ phòng thành công", response));
    }

    /**
     * Cập nhật trạng thái đơn dịch vụ phòng (PENDING -> PREPARING -> DELIVERED hoặc CANCELLED).
     * PATCH /api/v1/receptionist/room-service-orders/{id}/status
     */
    @PatchMapping("/room-service-orders/{id}/status")
    public ResponseEntity<ApiResponse<RoomServiceOrderResponse>> updateOrderStatus(
            @PathVariable Long id,
            @Valid @RequestBody RoomServiceStatusUpdateRequest request,
            Authentication authentication) {

        String currentActorEmail = authentication != null ? authentication.getName() : "system";
        RoomServiceOrderResponse response = roomServiceOrderService.updateStatus(id, request, currentActorEmail);

        return ResponseEntity.ok(ApiResponse.ok("Cập nhật trạng thái đơn dịch vụ thành công", response));
    }

    /**
     * Xem chi tiết một đơn dịch vụ phòng.
     * GET /api/v1/receptionist/room-service-orders/{id}
     */
    @GetMapping("/room-service-orders/{id}")
    public ResponseEntity<ApiResponse<RoomServiceOrderResponse>> getOrderById(@PathVariable Long id) {
        RoomServiceOrderResponse response = roomServiceOrderService.getById(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * Lịch sử đơn món và phiếu sự cố theo booking/phòng.
     * GET /api/v1/receptionist/bookings/{bookingId}/room-services
     */
    @GetMapping("/bookings/{bookingId}/room-services")
    public ResponseEntity<ApiResponse<BookingRoomServicesResponse>> getBookingRoomServices(
            @PathVariable Long bookingId,
            @RequestParam(required = false) Long bookingRoomId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id,desc") String[] sort) {

        Sort sortObj = Sort.by(Sort.Direction.DESC, "id");
        if (sort.length >= 2) {
            sortObj = Sort.by(Sort.Direction.fromString(sort[1]), sort[0]);
        }
        Pageable pageable = PageRequest.of(page, size, sortObj);

        BookingRoomServicesResponse response = roomServiceOrderService.getBookingRoomServices(
                bookingId, bookingRoomId, status, type, pageable);

        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
