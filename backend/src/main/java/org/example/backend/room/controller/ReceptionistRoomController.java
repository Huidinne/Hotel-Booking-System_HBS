package org.example.backend.room.controller;

import jakarta.validation.Valid;
import org.example.backend.common.response.ApiResponse;
import org.example.backend.room.dto.RoomStatusUpdateRequest;
import org.example.backend.room.entity.Room;
import org.example.backend.room.entity.RoomStatus;
import org.example.backend.room.service.RoomService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller cho Lễ tân quản lý phòng vận hành.
 * Endpoints theo SRS §11.3.
 */
@RestController
@RequestMapping("/api/v1/receptionist/rooms")
@PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN')")
public class ReceptionistRoomController {

    private final RoomService roomService;

    public ReceptionistRoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    /**
     * Danh sách phòng phục vụ vận hành, lọc theo trạng thái và loại phòng.
     * GET /api/v1/receptionist/rooms?status=CLEANING
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Room>>> getRooms(
            @RequestParam(required = false) RoomStatus status) {
        List<Room> rooms = roomService.getRoomsByStatus(status);
        return ResponseEntity.ok(ApiResponse.ok(rooms));
    }

    /**
     * Danh sách phòng AVAILABLE thuộc loại phòng (dùng cho modal check-in).
     * GET /api/v1/receptionist/rooms/available?roomTypeId=1
     */
    @GetMapping("/available")
    public ResponseEntity<ApiResponse<List<Room>>> getAvailableRooms(
            @RequestParam Long roomTypeId) {
        List<Room> rooms = roomService.getAvailableRoomsByRoomType(roomTypeId);
        return ResponseEntity.ok(ApiResponse.ok(rooms));
    }

    /**
     * Cập nhật trạng thái vận hành phòng (vd: CLEANING → AVAILABLE).
     * PUT /api/v1/receptionist/rooms/{id}/status
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateRoomStatus(
            @PathVariable Long id,
            @Valid @RequestBody RoomStatusUpdateRequest request) {
        roomService.updateRoomStatus(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật trạng thái phòng thành công", null));
    }

    /**
     * Lịch phòng trực quan Ma trận Timeline (SRS §FR-13 & §FR-13.4).
     * GET /api/v1/receptionist/rooms/timeline?startDate=2026-11-01&endDate=2026-11-15&roomTypeId=1
     */
    @GetMapping("/timeline")
    public ResponseEntity<ApiResponse<List<org.example.backend.room.dto.RoomTimelineResponse>>> getRoomTimeline(
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate endDate,
            @RequestParam(required = false) Long roomTypeId) {
        List<org.example.backend.room.dto.RoomTimelineResponse> timeline =
                roomService.getRoomTimeline(startDate, endDate, roomTypeId);
        return ResponseEntity.ok(ApiResponse.ok(timeline));
    }
}
