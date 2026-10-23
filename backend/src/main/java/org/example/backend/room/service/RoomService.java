package org.example.backend.room.service;

import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.common.exception.AppException;
import org.example.backend.room.dto.RoomStatusUpdateRequest;
import org.example.backend.room.dto.RoomTypeAvailabilityResponse;
import org.example.backend.room.entity.Room;
import org.example.backend.room.entity.RoomStatus;
import org.example.backend.room.entity.RoomType;
import org.example.backend.room.entity.RoomTypeImage;
import org.example.backend.room.repository.RoomRepository;
import org.example.backend.room.repository.RoomTypeImageRepository;
import org.example.backend.room.repository.RoomTypeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

/**
 * Service quản lý Room Catalog (Loại phòng + Phòng vật lý) và tìm kiếm phòng trống.
 */
@Service
@Transactional(readOnly = true)
public class RoomService {

    private final RoomTypeRepository roomTypeRepository;
    private final RoomTypeImageRepository roomTypeImageRepository;
    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;

    public RoomService(RoomTypeRepository roomTypeRepository,
                       RoomTypeImageRepository roomTypeImageRepository,
                       RoomRepository roomRepository,
                       BookingRepository bookingRepository) {
        this.roomTypeRepository = roomTypeRepository;
        this.roomTypeImageRepository = roomTypeImageRepository;
        this.roomRepository = roomRepository;
        this.bookingRepository = bookingRepository;
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC - Danh sách & chi tiết loại phòng
    // ═══════════════════════════════════════════════════════════════

    /** Danh sách tất cả loại phòng đang active */
    public List<RoomTypeAvailabilityResponse> getAllActiveRoomTypes() {
        return roomTypeRepository.findByIsActiveTrue().stream()
                .map(rt -> toAvailabilityResponse(rt, 0, 0))
                .toList();
    }

    /** Chi tiết loại phòng theo ID */
    public RoomTypeAvailabilityResponse getRoomTypeById(Long id) {
        RoomType roomType = roomTypeRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Loại phòng không tồn tại"));
        return toAvailabilityResponse(roomType, 0, 0);
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC - Tìm kiếm phòng trống (SRS §3.3 & FR-02)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Tìm loại phòng phù hợp và số lượng phòng khả dụng trong khoảng lưu trú.
     *
     * Thuật toán (SRS §3.3):
     *   AvailableRooms = TotalActiveRooms - BookedRoomsCount
     *   - TotalActiveRooms = phòng vật lý có status != MAINTENANCE
     *   - BookedRoomsCount = SUM(quantity) các booking giao nhau thời gian & còn giữ quota
     *
     * @param checkIn  Ngày nhận phòng
     * @param checkOut Ngày trả phòng (phải > checkIn)
     * @param guests   Số khách (lọc theo sức chứa loại phòng)
     * @param quantity Số phòng cần tìm (mặc định 1)
     */
    public List<RoomTypeAvailabilityResponse> searchAvailableRoomTypes(
            LocalDate checkIn, LocalDate checkOut, int guests, int quantity) {

        // Validate đầu vào
        if (checkOut == null || checkIn == null || !checkOut.isAfter(checkIn)) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm");
        }
        if (guests < 1) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Số khách phải lớn hơn 0");
        }
        if (quantity < 1) {
            quantity = 1;
        }

        LocalDateTime now = LocalDateTime.now();
        int requestedQty = quantity;

        // Lọc loại phòng active có sức chứa >= guests
        List<RoomType> roomTypes = roomTypeRepository.findActiveByCapacity(guests);

        return roomTypes.stream()
                .map(rt -> {
                    // TotalActiveRooms: phòng không MAINTENANCE
                    int totalActive = roomRepository.countByRoomTypeIdAndStatusNot(
                            rt.getId(), RoomStatus.MAINTENANCE);

                    // BookedRoomsCount: SUM(quantity) booking giao nhau thời gian & giữ quota
                    int booked = bookingRepository.countBookedRooms(
                            rt.getId(), checkIn, checkOut, now);

                    int available = Math.max(0, totalActive - booked);

                    return toAvailabilityResponse(rt, available, requestedQty);
                })
                .toList();
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN - CRUD Loại phòng & Phòng vật lý
    // ═══════════════════════════════════════════════════════════════

    /** Admin: Danh sách tất cả phòng vật lý */
    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    /** Admin: Danh sách phòng theo loại phòng */
    public List<Room> getRoomsByRoomTypeId(Long roomTypeId) {
        return roomRepository.findByRoomTypeId(roomTypeId);
    }

    // ═══════════════════════════════════════════════════════════════
    // RECEPTIONIST - Quản lý trạng thái phòng vận hành
    // ═══════════════════════════════════════════════════════════════

    /** Lễ tân: Danh sách phòng vận hành, lọc theo trạng thái */
    public List<Room> getRoomsByStatus(RoomStatus status) {
        if (status == null) {
            return roomRepository.findAll();
        }
        return roomRepository.findByStatus(status);
    }

    /** Lễ tân: Danh sách phòng AVAILABLE thuộc loại phòng (dùng cho modal check-in) */
    public List<Room> getAvailableRoomsByRoomType(Long roomTypeId) {
        return roomRepository.findAvailableByRoomTypeId(roomTypeId);
    }

    /**
     * Lễ tân: Cập nhật trạng thái phòng vận hành.
     * Chỉ cho phép chuyển đổi hợp lệ (vd: CLEANING → AVAILABLE).
     */
    @Transactional
    public Room updateRoomStatus(Long roomId, RoomStatusUpdateRequest request) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Phòng không tồn tại"));

        RoomStatus newStatus;
        try {
            newStatus = RoomStatus.valueOf(request.getStatus().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Trạng thái không hợp lệ. Giá trị hợp lệ: " +
                    Arrays.toString(RoomStatus.values()));
        }

        // Validate chuyển đổi trạng thái hợp lệ
        validateStatusTransition(room.getStatus(), newStatus);

        room.setStatus(newStatus);
        return roomRepository.save(room);
    }

    // ═══════════════════════════════════════════════════════════════
    // Private helpers
    // ═══════════════════════════════════════════════════════════════

    private RoomTypeAvailabilityResponse toAvailabilityResponse(
            RoomType rt, int availableRooms, int requestedQuantity) {

        // Lấy ảnh chính
        String primaryImageUrl = roomTypeImageRepository
                .findByRoomTypeIdAndIsPrimaryTrue(rt.getId())
                .map(RoomTypeImage::getImageUrl)
                .orElse(null);

        // Parse amenities string → list
        List<String> amenitiesList = rt.getAmenities() != null
                ? Arrays.stream(rt.getAmenities().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList()
                : List.of();

        return RoomTypeAvailabilityResponse.builder()
                .roomTypeId(rt.getId())
                .name(rt.getName())
                .description(rt.getDescription())
                .capacity(rt.getCapacity())
                .basePrice(rt.getBasePrice())
                .primaryImageUrl(primaryImageUrl)
                .amenities(amenitiesList)
                .availableRooms(availableRooms)
                .requestedQuantity(requestedQuantity)
                .isAvailable(requestedQuantity <= 0 || availableRooms >= requestedQuantity)
                .build();
    }

    /**
     * Validate chuyển đổi trạng thái phòng hợp lệ theo SRS §3.2:
     * - CLEANING → AVAILABLE (dọn xong)
     * - AVAILABLE → MAINTENANCE (bảo trì)
     * - MAINTENANCE → AVAILABLE (sửa xong)
     * - OCCUPIED → CLEANING (check-out tự chuyển, không cho lễ tân chuyển thẳng AVAILABLE)
     */
    private void validateStatusTransition(RoomStatus current, RoomStatus target) {
        if (current == target) return;

        boolean valid = switch (current) {
            case CLEANING -> target == RoomStatus.AVAILABLE;
            case AVAILABLE -> target == RoomStatus.MAINTENANCE;
            case MAINTENANCE -> target == RoomStatus.AVAILABLE;
            case OCCUPIED -> target == RoomStatus.CLEANING;
        };

        if (!valid) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    String.format("Không thể chuyển phòng từ %s sang %s", current, target));
        }
    }
}
