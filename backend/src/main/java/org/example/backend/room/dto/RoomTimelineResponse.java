package org.example.backend.room.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.backend.room.entity.RoomStatus;

import java.util.List;

/**
 * Dữ liệu dòng phòng trên Ma trận Timeline (SRS §FR-13.1 & §FR-13.4).
 * Đại diện cho một phòng vật lý và toàn bộ trạng thái chuỗi ngày [startDate, endDate].
 * Cung cấp floor và roomType để giao diện PMS phân nhóm theo Tầng và Loại phòng.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomTimelineResponse {

    private Long roomId;
    private String roomNumber;
    private Integer floor;
    private Long roomTypeId;
    private String roomTypeName;

    /** Trạng thái vật lý hiện tại của phòng (AVAILABLE, OCCUPIED, CLEANING, MAINTENANCE) */
    private RoomStatus currentPhysicalStatus;

    /** Danh sách trạng thái theo từng ngày liên tục trong khoảng truy vấn */
    private List<RoomDailyStatusDTO> dailyStatuses;
}
