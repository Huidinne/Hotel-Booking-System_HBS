package org.example.backend.room.controller;

import org.example.backend.common.response.ApiResponse;
import org.example.backend.room.dto.RoomTypeAvailabilityResponse;
import org.example.backend.room.service.RoomService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Public REST Controller cho tra cứu Loại phòng & Tìm phòng trống.
 * Tất cả endpoint đều public (không cần đăng nhập).
 * Endpoints theo SRS §11.3.
 */
@RestController
@RequestMapping("/api/v1/room-types")
public class PublicRoomTypeController {

    private final RoomService roomService;

    public PublicRoomTypeController(RoomService roomService) {
        this.roomService = roomService;
    }

    /**
     * Danh sách loại phòng đang mở bán.
     * GET /api/v1/room-types
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<RoomTypeAvailabilityResponse>>> getAllRoomTypes() {
        List<RoomTypeAvailabilityResponse> roomTypes = roomService.getAllActiveRoomTypes();
        return ResponseEntity.ok(ApiResponse.ok(roomTypes));
    }

    /**
     * Chi tiết loại phòng.
     * GET /api/v1/room-types/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RoomTypeAvailabilityResponse>> getRoomTypeById(
            @PathVariable Long id) {
        RoomTypeAvailabilityResponse roomType = roomService.getRoomTypeById(id);
        return ResponseEntity.ok(ApiResponse.ok(roomType));
    }

    /**
     * Tìm loại phòng phù hợp và số lượng phòng khả dụng trong khoảng lưu trú.
     * GET /api/v1/room-types/search?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&guests=2&quantity=1
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<RoomTypeAvailabilityResponse>>> searchAvailableRoomTypes(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut,
            @RequestParam int guests,
            @RequestParam(defaultValue = "1") int quantity) {

        List<RoomTypeAvailabilityResponse> results =
                roomService.searchAvailableRoomTypes(checkIn, checkOut, guests, quantity);
        return ResponseEntity.ok(ApiResponse.ok(results));
    }
}
