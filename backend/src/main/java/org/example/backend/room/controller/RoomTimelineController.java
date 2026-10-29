package org.example.backend.room.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.example.backend.common.response.ApiResponse;
import org.example.backend.room.dto.RoomTimelineResponse;
import org.example.backend.room.service.RoomService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * REST Controller cung cấp Endpoint Ma trận Buồng phòng PMS theo đúng đặc tả SRS §FR-13.4.
 * Endpoint: GET /api/v1/rooms/timeline?startDate=...&endDate=...&roomTypeId=...
 * Phân quyền: RECEPTIONIST hoặc ADMIN theo SRS §11.7.
 */
@RestController
@RequestMapping("/api/v1/rooms")
@PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN')")
@Tag(name = "Room Timeline", description = "Lịch phòng trực quan Ma trận Timeline theo chuẩn PMS quốc tế (SRS §FR-13)")
@SecurityRequirement(name = "Bearer Authentication")
public class RoomTimelineController {

    private final RoomService roomService;

    public RoomTimelineController(RoomService roomService) {
        this.roomService = roomService;
    }

    /**
     * Tra cứu Ma trận trạng thái phòng theo khoảng ngày [startDate, endDate] (SRS §FR-13.4).
     *
     * @param startDate  Ngày bắt đầu ma trận (bắt buộc, ISO 8601)
     * @param endDate    Ngày kết thúc ma trận (bắt buộc, ISO 8601, endDate >= startDate)
     * @param roomTypeId ID loại phòng cần lọc (tùy chọn)
     * @return Danh sách các phòng kèm trạng thái từng ngày và metadata tóm tắt đơn
     */
    @GetMapping("/timeline")
    @Operation(
            summary = "Tra cứu Ma trận trạng thái phòng (Timeline Matrix - SRS §FR-13.4)",
            description = "Trả về mảng phòng vật lý phân nhóm theo tầng và loại phòng kèm chuỗi trạng thái từng ngày " +
                    "(AVAILABLE, CONFIRMED, CHECKED_IN, CLEANING, MAINTENANCE) cùng metadata tóm tắt đơn đặt " +
                    "(mã đơn, tên khách, SĐT, số tiền đã thanh toán, tổng tiền). " +
                    "Tối ưu 2-query bulk fetch triệt tiêu hoàn toàn lỗi N+1."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Lấy dữ liệu ma trận timeline thành công"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Tham số ngày không hợp lệ (endDate < startDate hoặc khoảng ngày > 31 ngày)"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Chưa đăng nhập hoặc Bearer token không hợp lệ"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Không có quyền truy cập (Yêu cầu vai trò RECEPTIONIST hoặc ADMIN theo SRS §11.7)")
    })
    public ResponseEntity<ApiResponse<List<RoomTimelineResponse>>> getTimeline(
            @Parameter(description = "Ngày bắt đầu khoảng tra cứu (ISO 8601: YYYY-MM-DD)", example = "2026-11-01", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,

            @Parameter(description = "Ngày kết thúc khoảng tra cứu (ISO 8601: YYYY-MM-DD, tối đa 31 ngày)", example = "2026-11-07", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,

            @Parameter(description = "ID loại phòng cần lọc (tùy chọn, để trống nếu xem toàn bộ)", example = "1")
            @RequestParam(required = false) Long roomTypeId) {

        List<RoomTimelineResponse> timeline = roomService.getRoomTimeline(startDate, endDate, roomTypeId);
        return ResponseEntity.ok(ApiResponse.ok(timeline));
    }
}
