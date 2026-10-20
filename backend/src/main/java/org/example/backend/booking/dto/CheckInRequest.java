package org.example.backend.booking.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckInRequest {
    @NotEmpty(message = "Danh sách ID phòng vật lý gán khi Check-in không được để trống")
    private List<Long> assignedRoomIds;
}
