package org.example.backend.roomservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingRoom;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.booking.repository.BookingRoomRepository;
import org.example.backend.common.exception.AppException;
import org.example.backend.common.response.PageResponse;
import org.example.backend.room.entity.RoomStatus;
import org.example.backend.roomservice.dto.*;
import org.example.backend.roomservice.entity.*;
import org.example.backend.roomservice.repository.MaintenanceRequestRepository;
import org.example.backend.roomservice.repository.RoomServiceOrderRepository;
import org.example.backend.roomservice.repository.ServiceItemRepository;
import org.example.backend.user.entity.Role;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoomServiceOrderService {

    private final RoomServiceOrderRepository orderRepository;
    private final ServiceItemRepository serviceItemRepository;
    private final BookingRepository bookingRepository;
    private final BookingRoomRepository bookingRoomRepository;
    private final MaintenanceRequestRepository maintenanceRequestRepository;
    private final UserRepository userRepository;

    @Transactional
    public RoomServiceOrderResponse createOrder(Long bookingId,
                                                RoomServiceOrderRequest request,
                                                String idempotencyKey,
                                                String currentActorEmail) {

        // 1. Kiểm tra Idempotency
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<RoomServiceOrder> existing = orderRepository.findByIdempotencyKey(idempotencyKey.trim());
            if (existing.isPresent()) {
                RoomServiceOrder order = existing.get();
                if (order.getBooking().getId().equals(bookingId) &&
                    order.getBookingRoom().getId().equals(request.getBookingRoomId())) {
                    log.info("[RoomService] Idempotency hit: returning existing order {}", order.getOrderCode());
                    return RoomServiceOrderResponse.from(order);
                }
                throw new AppException(HttpStatus.CONFLICT, "Idempotency-Key đã được sử dụng cho một yêu cầu khác");
            }
        }

        // 2. Kiểm tra Booking
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy booking với ID: " + bookingId));

        if (booking.getBookingStatus() != BookingStatus.CHECKED_IN) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Chỉ được tạo đơn dịch vụ phòng khi booking đang ở trạng thái CHECKED_IN (Hiện tại: " + booking.getBookingStatus() + ")");
        }

        // 3. Kiểm tra BookingRoom & Room (hỗ trợ cả BookingRoom.id và Room.id linh hoạt)
        BookingRoom bookingRoom = null;
        if (request.getBookingRoomId() != null) {
            bookingRoom = bookingRoomRepository.findById(request.getBookingRoomId()).orElse(null);
        }

        if (bookingRoom == null || !bookingRoom.getBooking().getId().equals(bookingId)) {
            List<BookingRoom> bRooms = bookingRoomRepository.findByBookingId(bookingId);
            BookingRoom matched = bRooms.stream()
                    .filter(br -> (request.getBookingRoomId() != null && br.getRoom().getId().equals(request.getBookingRoomId()))
                            || (request.getBookingRoomId() != null && br.getId().equals(request.getBookingRoomId())))
                    .findFirst()
                    .orElse(null);

            if (matched != null) {
                bookingRoom = matched;
            } else if (bRooms.size() == 1) {
                bookingRoom = bRooms.get(0);
            }
        }

        if (bookingRoom == null) {
            throw new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng gán với ID: " + request.getBookingRoomId());
        }

        if (!bookingRoom.getBooking().getId().equals(bookingId)) {
            throw new AppException(HttpStatus.CONFLICT, "Phòng này không thuộc lượt lưu trú của booking hiện tại");
        }

        if (bookingRoom.getRoom().getStatus() != RoomStatus.OCCUPIED) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Phòng " + bookingRoom.getRoom().getRoomNumber() + " chưa có khách lưu trú (phải ở trạng thái OCCUPIED, hiện tại: " + bookingRoom.getRoom().getStatus() + ")");
        }

        // 4. Validate items & tính toán snapshot bất biến
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Đơn dịch vụ phòng phải có ít nhất một món");
        }

        Set<Long> itemIds = new HashSet<>();
        List<RoomServiceOrderItem> orderItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (RoomServiceOrderItemRequest itemReq : request.getItems()) {
            if (itemReq.getQuantity() == null || itemReq.getQuantity() <= 0) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Số lượng món phải lớn hơn 0");
            }

            if (!itemIds.add(itemReq.getServiceItemId())) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Không được đặt trùng cùng một món trong một đơn (serviceItemId: " + itemReq.getServiceItemId() + ")");
            }

            ServiceItem serviceItem = serviceItemRepository.findById(itemReq.getServiceItemId())
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy món với ID: " + itemReq.getServiceItemId()));

            if (!Boolean.TRUE.equals(serviceItem.getIsActive())) {
                throw new AppException(HttpStatus.CONFLICT, "Món '" + serviceItem.getName() + "' hiện đã ngừng kinh doanh");
            }

            // Kiểm tra version món ăn để phát hiện đổi giá
            if (itemReq.getItemVersion() != null && !itemReq.getItemVersion().equals(serviceItem.getVersion())) {
                throw new AppException(HttpStatus.CONFLICT,
                        "Giá hoặc thông tin món '" + serviceItem.getName() + "' đã bị thay đổi (version mismatch). Vui lòng kiểm tra lại đơn giá mới.");
            }

            BigDecimal unitPrice = serviceItem.getPrice();
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            totalAmount = totalAmount.add(lineTotal);

            RoomServiceOrderItem orderItem = RoomServiceOrderItem.builder()
                    .serviceItem(serviceItem)
                    .nameSnapshot(serviceItem.getName())
                    .unitSnapshot(serviceItem.getUnit())
                    .unitPriceSnapshot(unitPrice)
                    .quantity(itemReq.getQuantity())
                    .lineTotal(lineTotal)
                    .build();

            orderItems.add(orderItem);
        }

        // 5. Tạo mã đơn hàng duy nhất RSO-YYYYMMDD-XXXXXX
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randPart = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String orderCode = "RSO-" + datePart + "-" + randPart;

        RoomServiceOrder order = RoomServiceOrder.builder()
                .booking(booking)
                .bookingRoom(bookingRoom)
                .orderCode(orderCode)
                .status(RoomServiceOrderStatus.PENDING)
                .totalAmount(totalAmount)
                .note(request.getNote())
                .idempotencyKey(idempotencyKey != null ? idempotencyKey.trim() : null)
                .createdBy(currentActorEmail)
                .version(0L)
                .build();

        for (RoomServiceOrderItem oi : orderItems) {
            order.addItem(oi);
        }

        RoomServiceOrder saved = orderRepository.save(order);
        log.info("[RoomService] Created order: code={}, bookingId={}, roomNumber={}, totalAmount={}",
                saved.getOrderCode(), bookingId, bookingRoom.getRoom().getRoomNumber(), saved.getTotalAmount());

        return RoomServiceOrderResponse.from(saved);
    }

    @Transactional
    public RoomServiceOrderResponse updateStatus(Long id, RoomServiceStatusUpdateRequest request, String currentActorEmail) {
        RoomServiceOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn dịch vụ phòng với ID: " + id));

        // Optimistic locking check
        if (request.getVersion() != null && !request.getVersion().equals(order.getVersion())) {
            throw new AppException(HttpStatus.CONFLICT, "Đơn hàng đã được cập nhật bởi thao tác khác (version mismatch). Vui lòng tải lại trang.");
        }

        RoomServiceOrderStatus currentStatus = order.getStatus();
        RoomServiceOrderStatus targetStatus = request.getStatus();

        if (currentStatus == RoomServiceOrderStatus.DELIVERED) {
            throw new AppException(HttpStatus.CONFLICT, "Đơn dịch vụ phòng đã giao thành công (DELIVERED), không thể sửa đổi trạng thái");
        }

        if (currentStatus == RoomServiceOrderStatus.CANCELLED) {
            throw new AppException(HttpStatus.CONFLICT, "Đơn dịch vụ phòng đã bị hủy (CANCELLED), không thể sửa đổi trạng thái");
        }

        if (targetStatus == RoomServiceOrderStatus.PREPARING) {
            if (currentStatus != RoomServiceOrderStatus.PENDING) {
                throw new AppException(HttpStatus.CONFLICT, "Chỉ có thể chuyển sang PREPARING từ trạng thái PENDING");
            }
            order.setStatus(RoomServiceOrderStatus.PREPARING);

        } else if (targetStatus == RoomServiceOrderStatus.DELIVERED) {
            if (currentStatus != RoomServiceOrderStatus.PENDING && currentStatus != RoomServiceOrderStatus.PREPARING) {
                throw new AppException(HttpStatus.CONFLICT, "Chỉ có thể chuyển sang DELIVERED từ PENDING hoặc PREPARING");
            }
            order.setStatus(RoomServiceOrderStatus.DELIVERED);
            order.setDeliveredAt(LocalDateTime.now());

        } else if (targetStatus == RoomServiceOrderStatus.CANCELLED) {
            if (request.getReason() == null || request.getReason().trim().isEmpty()) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Bắt buộc cung cấp lý do khi hủy đơn dịch vụ phòng");
            }
            order.setStatus(RoomServiceOrderStatus.CANCELLED);
            order.setCancelReason(request.getReason().trim());
            order.setCancelledBy(currentActorEmail);

        } else {
            throw new AppException(HttpStatus.BAD_REQUEST, "Trạng thái chuyển đổi không hợp lệ: " + targetStatus);
        }

        RoomServiceOrder updated = orderRepository.save(order);
        log.info("[RoomService] Order {} status changed from {} to {}", updated.getOrderCode(), currentStatus, targetStatus);
        return RoomServiceOrderResponse.from(updated);
    }

    @Transactional(readOnly = true)
    public RoomServiceOrderResponse getById(Long id) {
        RoomServiceOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn dịch vụ phòng với ID: " + id));
        return RoomServiceOrderResponse.from(order);
    }

    @Transactional(readOnly = true)
    public BookingRoomServicesResponse getBookingRoomServices(Long bookingId,
                                                              Long bookingRoomId,
                                                              String statusStr,
                                                              String type,
                                                              Pageable pageable) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy booking với ID: " + bookingId));

        PageResponse<RoomServiceOrderResponse> orderPageResponse = null;
        PageResponse<MaintenanceRequestResponse> maintenancePageResponse = null;

        if (type == null || "ORDER".equalsIgnoreCase(type.trim())) {
            RoomServiceOrderStatus orderStatus = null;
            if (statusStr != null && !statusStr.isBlank()) {
                try {
                    orderStatus = RoomServiceOrderStatus.valueOf(statusStr.trim().toUpperCase());
                } catch (IllegalArgumentException ignored) {}
            }
            Page<RoomServiceOrderResponse> orderPage = orderRepository
                    .findByBookingAndRoomAndStatus(bookingId, bookingRoomId, orderStatus, pageable)
                    .map(RoomServiceOrderResponse::from);
            orderPageResponse = PageResponse.from(orderPage);
        }

        if (type == null || "MAINTENANCE".equalsIgnoreCase(type.trim())) {
            MaintenanceStatus mrStatus = null;
            if (statusStr != null && !statusStr.isBlank()) {
                try {
                    mrStatus = MaintenanceStatus.valueOf(statusStr.trim().toUpperCase());
                } catch (IllegalArgumentException ignored) {}
            }
            Page<MaintenanceRequestResponse> mrPage = maintenanceRequestRepository
                    .findByBookingAndRoomAndStatus(bookingId, bookingRoomId, mrStatus, pageable)
                    .map(MaintenanceRequestResponse::from);
            maintenancePageResponse = PageResponse.from(mrPage);
        }

        // Tính tổng tiền các đơn đã giao thành công (DELIVERED)
        List<RoomServiceOrder> deliveredOrders = orderRepository.findByBookingIdAndStatus(bookingId, RoomServiceOrderStatus.DELIVERED);
        BigDecimal totalDelivered = deliveredOrders.stream()
                .map(RoomServiceOrder::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return BookingRoomServicesResponse.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .totalDeliveredAmount(totalDelivered)
                .orders(orderPageResponse)
                .maintenanceRequests(maintenancePageResponse)
                .build();
    }

    @Transactional(readOnly = true)
    public BookingServicesSummaryResponse getBookingServicesSummary(String bookingCode, String currentUserEmail) {
        Booking booking = bookingRepository.findByBookingCode(bookingCode)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy booking với mã: " + bookingCode));

        if (currentUserEmail != null) {
            User user = userRepository.findByEmail(currentUserEmail).orElse(null);
            if (user != null && user.getRole() == Role.ROLE_CUSTOMER) {
                if (booking.getUser() != null && !booking.getUser().getEmail().equals(currentUserEmail)) {
                    throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền xem chi tiết dịch vụ của booking này");
                }
            }
        }

        List<RoomServiceOrder> orders = orderRepository.findByBookingId(booking.getId());
        List<RoomServiceOrderResponse> deliveredOrders = orders.stream()
                .filter(o -> o.getStatus() == RoomServiceOrderStatus.DELIVERED)
                .map(RoomServiceOrderResponse::from)
                .collect(Collectors.toList());

        BigDecimal totalAmount = deliveredOrders.stream()
                .map(RoomServiceOrderResponse::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return BookingServicesSummaryResponse.builder()
                .bookingCode(booking.getBookingCode())
                .bookingId(booking.getId())
                .totalServicesAmount(totalAmount)
                .orders(deliveredOrders)
                .build();
    }
}
