package org.example.backend.room.controller;

import jakarta.validation.Valid;
import org.example.backend.common.response.ApiResponse;
import org.example.backend.room.dto.RoomRequest;
import org.example.backend.room.dto.RoomTypeRequest;
import org.example.backend.room.entity.Room;
import org.example.backend.room.entity.RoomType;
import org.example.backend.room.service.AdminRoomService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin REST Controller — CRUD quản lý Loại phòng và Phòng vật lý.
 * Yêu cầu vai trò ADMIN.
 * Endpoints theo SRS §11.3.
 */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminRoomController {

    private final AdminRoomService adminRoomService;

    public AdminRoomController(AdminRoomService adminRoomService) {
        this.adminRoomService = adminRoomService;
    }

    // ════════════════════════════════════════
    // ROOM TYPE — /api/v1/admin/room-types
    // ════════════════════════════════════════

    /**
     * Danh sách TẤT CẢ loại phòng (kể cả inactive).
     * GET /api/v1/admin/room-types
     */
    @GetMapping("/room-types")
    public ResponseEntity<ApiResponse<List<RoomType>>> getAllRoomTypes() {
        return ResponseEntity.ok(ApiResponse.ok(adminRoomService.getAllRoomTypes()));
    }

    /**
     * Chi tiết loại phòng theo ID.
     * GET /api/v1/admin/room-types/{id}
     */
    @GetMapping("/room-types/{id}")
    public ResponseEntity<ApiResponse<RoomType>> getRoomTypeById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(adminRoomService.getRoomTypeByIdAdmin(id)));
    }

    /**
     * Tạo loại phòng mới.
     * POST /api/v1/admin/room-types
     */
    @PostMapping("/room-types")
    public ResponseEntity<ApiResponse<RoomType>> createRoomType(
            @Valid @RequestBody RoomTypeRequest request) {
        RoomType created = adminRoomService.createRoomType(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Tạo loại phòng thành công", created));
    }

    /**
     * Cập nhật thông tin loại phòng.
     * PUT /api/v1/admin/room-types/{id}
     */
    @PutMapping("/room-types/{id}")
    public ResponseEntity<ApiResponse<RoomType>> updateRoomType(
            @PathVariable Long id,
            @Valid @RequestBody RoomTypeRequest request) {
        RoomType updated = adminRoomService.updateRoomType(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật loại phòng thành công", updated));
    }

    /**
     * Vô hiệu hóa loại phòng (soft-delete).
     * DELETE /api/v1/admin/room-types/{id}
     */
    @DeleteMapping("/room-types/{id}")
    public ResponseEntity<ApiResponse<Void>> deactivateRoomType(@PathVariable Long id) {
        adminRoomService.deactivateRoomType(id);
        return ResponseEntity.ok(ApiResponse.ok("Vô hiệu hóa loại phòng thành công", null));
    }

    // ════════════════════════════════════════
    // ROOM — /api/v1/admin/rooms
    // ════════════════════════════════════════

    /**
     * Danh sách TẤT CẢ phòng vật lý.
     * GET /api/v1/admin/rooms
     */
    @GetMapping("/rooms")
    public ResponseEntity<ApiResponse<List<Room>>> getAllRooms(
            @RequestParam(required = false) Long roomTypeId) {
        List<Room> rooms = roomTypeId != null
                ? adminRoomService.getRoomsByRoomType(roomTypeId)
                : adminRoomService.getAllRooms();
        return ResponseEntity.ok(ApiResponse.ok(rooms));
    }

    /**
     * Tạo phòng vật lý mới.
     * POST /api/v1/admin/rooms
     */
    @PostMapping("/rooms")
    public ResponseEntity<ApiResponse<Room>> createRoom(
            @Valid @RequestBody RoomRequest request) {
        Room created = adminRoomService.createRoom(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Tạo phòng thành công", created));
    }

    /**
     * Cập nhật phòng vật lý.
     * PUT /api/v1/admin/rooms/{id}
     */
    @PutMapping("/rooms/{id}")
    public ResponseEntity<ApiResponse<Room>> updateRoom(
            @PathVariable Long id,
            @Valid @RequestBody RoomRequest request) {
        Room updated = adminRoomService.updateRoom(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật phòng thành công", updated));
    }

    /**
     * Xóa phòng vật lý (chỉ khi không OCCUPIED).
     * DELETE /api/v1/admin/rooms/{id}
     */
    @DeleteMapping("/rooms/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRoom(@PathVariable Long id) {
        adminRoomService.deleteRoom(id);
        return ResponseEntity.ok(ApiResponse.ok("Xóa phòng thành công", null));
    }
}
