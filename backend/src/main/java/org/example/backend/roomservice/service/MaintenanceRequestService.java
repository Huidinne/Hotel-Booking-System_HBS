package org.example.backend.roomservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingRoom;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.booking.repository.BookingRoomRepository;
import org.example.backend.common.exception.AppException;
import org.example.backend.room.entity.Room;
import org.example.backend.room.entity.RoomStatus;
import org.example.backend.roomservice.dto.MaintenanceRequestCreateDTO;
import org.example.backend.roomservice.dto.MaintenanceRequestResponse;
import org.example.backend.roomservice.dto.MaintenanceStatusUpdateRequest;
import org.example.backend.roomservice.entity.MaintenancePriority;
import org.example.backend.roomservice.entity.MaintenanceRequest;
import org.example.backend.roomservice.entity.MaintenanceStatus;
import org.example.backend.roomservice.repository.MaintenanceRequestRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MaintenanceRequestService {

    private final MaintenanceRequestRepository maintenanceRequestRepository;
    private final BookingRepository bookingRepository;
    private final BookingRoomRepository bookingRoomRepository;

    @Transactional
    public MaintenanceRequestResponse createRequest(Long bookingId,
                                                    MaintenanceRequestCreateDTO request,
                                                    String idempotencyKey,
                                                    String currentActorEmail) {

        // 1. Kiểm tra Idempotency
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<MaintenanceRequest> existing = maintenanceRequestRepository.findByIdempotencyKey(idempotencyKey.trim());
            if (existing.isPresent()) {
                MaintenanceRequest mr = existing.get();
                if (mr.getBooking().getId().equals(bookingId) &&
                    mr.getBookingRoom().getId().equals(request.getBookingRoomId())) {
                    log.info("[Maintenance] Idempotency hit: returning existing request {}", mr.getRequestCode());
                    return MaintenanceRequestResponse.from(mr);
                }
                throw new AppException(HttpStatus.CONFLICT, "Idempotency-Key đã được sử dụng cho một yêu cầu khác");
            }
        }

        // 2. Kiểm tra Booking
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy booking với ID: " + bookingId));

        if (booking.getBookingStatus() != BookingStatus.CHECKED_IN) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Chỉ được tạo phiếu báo sự cố khi booking đang ở trạng thái CHECKED_IN (Hiện tại: " + booking.getBookingStatus() + ")");
        }

        // 3. Kiểm tra BookingRoom & Room
        BookingRoom bookingRoom = bookingRoomRepository.findById(request.getBookingRoomId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng gán với ID: " + request.getBookingRoomId()));

        if (!bookingRoom.getBooking().getId().equals(bookingId)) {
            throw new AppException(HttpStatus.CONFLICT, "Phòng này không thuộc lượt lưu trú của booking hiện tại");
        }

        Room room = bookingRoom.getRoom();
        if (room.getStatus() != RoomStatus.OCCUPIED) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Phòng " + room.getRoomNumber() + " chưa có khách lưu trú (phải ở trạng thái OCCUPIED, hiện tại: " + room.getStatus() + ")");
        }

        if (request.getDescription() == null || request.getDescription().trim().isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Mô tả sự cố không được để trống");
        }

        // 4. Sinh mã phiếu duy nhất MR-YYYYMMDD-XXXXXX
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randPart = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String requestCode = "MR-" + datePart + "-" + randPart;

        // Lưu ý cốt lõi (SRS AC-21-04): Báo sự cố không tính tiền, không tự chuyển phòng sang MAINTENANCE
        MaintenanceRequest mr = MaintenanceRequest.builder()
                .booking(booking)
                .bookingRoom(bookingRoom)
                .room(room)
                .requestCode(requestCode)
                .description(request.getDescription().trim())
                .priority(request.getPriority() != null ? request.getPriority() : MaintenancePriority.NORMAL)
                .status(MaintenanceStatus.OPEN)
                .blocksResale(Boolean.TRUE.equals(request.getBlocksResale()))
                .idempotencyKey(idempotencyKey != null ? idempotencyKey.trim() : null)
                .createdBy(currentActorEmail)
                .version(0L)
                .build();

        MaintenanceRequest saved = maintenanceRequestRepository.save(mr);
        log.info("[Maintenance] Created request: code={}, roomNumber={}, priority={}, blocksResale={}",
                saved.getRequestCode(), room.getRoomNumber(), saved.getPriority(), saved.getBlocksResale());

        return MaintenanceRequestResponse.from(saved);
    }

    @Transactional
    public MaintenanceRequestResponse updateStatus(Long id, MaintenanceStatusUpdateRequest request, String currentActorEmail) {
        MaintenanceRequest mr = maintenanceRequestRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy phiếu sự cố với ID: " + id));

        // Optimistic locking check
        if (request.getVersion() != null && !request.getVersion().equals(mr.getVersion())) {
            throw new AppException(HttpStatus.CONFLICT, "Phiếu sự cố đã được cập nhật bởi thao tác khác (version mismatch). Vui lòng tải lại.");
        }

        MaintenanceStatus currentStatus = mr.getStatus();
        MaintenanceStatus targetStatus = request.getStatus();

        if (currentStatus == MaintenanceStatus.RESOLVED) {
            throw new AppException(HttpStatus.CONFLICT, "Phiếu sự cố đã hoàn thành xử lý (RESOLVED), không thể sửa đổi trạng thái");
        }

        if (currentStatus == MaintenanceStatus.CANCELLED) {
            throw new AppException(HttpStatus.CONFLICT, "Phiếu sự cố đã bị hủy (CANCELLED), không thể sửa đổi trạng thái");
        }

        if (request.getBlocksResale() != null) {
            mr.setBlocksResale(request.getBlocksResale());
        }

        if (targetStatus == MaintenanceStatus.IN_PROGRESS) {
            if (currentStatus != MaintenanceStatus.OPEN) {
                throw new AppException(HttpStatus.CONFLICT, "Chỉ có thể chuyển sang IN_PROGRESS từ trạng thái OPEN");
            }
            mr.setStatus(MaintenanceStatus.IN_PROGRESS);

        } else if (targetStatus == MaintenanceStatus.RESOLVED) {
            if (request.getResolutionNote() == null || request.getResolutionNote().trim().isEmpty()) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Bắt buộc ghi chú kết quả xử lý kỹ thuật khi hoàn tất sự cố");
            }
            mr.setStatus(MaintenanceStatus.RESOLVED);
            mr.setResolutionNote(request.getResolutionNote().trim());
            mr.setResolvedAt(LocalDateTime.now());
            mr.setResolvedBy(currentActorEmail);

        } else if (targetStatus == MaintenanceStatus.CANCELLED) {
            if (request.getReason() == null || request.getReason().trim().isEmpty()) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Bắt buộc cung cấp lý do khi hủy phiếu sự cố");
            }
            mr.setStatus(MaintenanceStatus.CANCELLED);
            mr.setCancelReason(request.getReason().trim());

        } else {
            throw new AppException(HttpStatus.BAD_REQUEST, "Trạng thái chuyển đổi không hợp lệ: " + targetStatus);
        }

        MaintenanceRequest updated = maintenanceRequestRepository.save(mr);
        log.info("[Maintenance] Request {} status changed from {} to {}", updated.getRequestCode(), currentStatus, targetStatus);
        return MaintenanceRequestResponse.from(updated);
    }

    @Transactional(readOnly = true)
    public MaintenanceRequestResponse getById(Long id) {
        MaintenanceRequest mr = maintenanceRequestRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy phiếu sự cố với ID: " + id));
        return MaintenanceRequestResponse.from(mr);
    }

    @Transactional(readOnly = true)
    public Page<MaintenanceRequestResponse> getAllWithFilter(Long roomId,
                                                             MaintenanceStatus status,
                                                             MaintenancePriority priority,
                                                             Boolean blocksResale,
                                                             Pageable pageable) {
        return maintenanceRequestRepository.findAllWithFilter(roomId, status, priority, blocksResale, pageable)
                .map(MaintenanceRequestResponse::from);
    }
}
