package org.example.backend.roomservice.dto;

import lombok.*;
import org.example.backend.roomservice.entity.RoomServiceOrder;
import org.example.backend.roomservice.entity.RoomServiceOrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomServiceOrderResponse {

    private Long id;
    private Long bookingId;
    private Long bookingRoomId;
    private String roomNumber;
    private String orderCode;
    private RoomServiceOrderStatus status;
    private List<RoomServiceOrderItemResponse> items;
    private BigDecimal totalAmount;
    private String note;
    private String cancelReason;
    private String cancelledBy;
    private LocalDateTime deliveredAt;
    private String createdBy;
    private Long version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static RoomServiceOrderResponse from(RoomServiceOrder order) {
        if (order == null) return null;

        String roomNum = null;
        if (order.getBookingRoom() != null && order.getBookingRoom().getRoom() != null) {
            roomNum = order.getBookingRoom().getRoom().getRoomNumber();
        }

        List<RoomServiceOrderItemResponse> itemResponses = order.getItems() != null
                ? order.getItems().stream().map(RoomServiceOrderItemResponse::from).collect(Collectors.toList())
                : Collections.emptyList();

        return RoomServiceOrderResponse.builder()
                .id(order.getId())
                .bookingId(order.getBooking() != null ? order.getBooking().getId() : null)
                .bookingRoomId(order.getBookingRoom() != null ? order.getBookingRoom().getId() : null)
                .roomNumber(roomNum)
                .orderCode(order.getOrderCode())
                .status(order.getStatus())
                .items(itemResponses)
                .totalAmount(order.getTotalAmount())
                .note(order.getNote())
                .cancelReason(order.getCancelReason())
                .cancelledBy(order.getCancelledBy())
                .deliveredAt(order.getDeliveredAt())
                .createdBy(order.getCreatedBy())
                .version(order.getVersion())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }
}
