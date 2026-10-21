package org.example.backend.room.service;

import org.example.backend.common.exception.AppException;
import org.example.backend.room.dto.RoomRequest;
import org.example.backend.room.dto.RoomTypeRequest;
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
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Service quản lý Admin CRUD cho Loại phòng và Phòng vật lý.
 */

@Service
@Transactional(readOnly = true)
public class AdminRoomService {

    private final RoomTypeRepository roomTypeRepository;
    private final RoomRepository roomRepository;
    private final RoomTypeImageRepository roomTypeImageRepository;
    private final CloudinaryService cloudinaryService;

    public AdminRoomService(RoomTypeRepository roomTypeRepository,
                            RoomRepository roomRepository,
                            RoomTypeImageRepository roomTypeImageRepository,
                            CloudinaryService cloudinaryService) {
        this.roomTypeRepository = roomTypeRepository;
        this.roomRepository = roomRepository;
        this.roomTypeImageRepository = roomTypeImageRepository;
        this.cloudinaryService = cloudinaryService;
    }

    // ════════════════════════════════════════
    // ROOM TYPE CRUD
    // ════════════════════════════════════════

    public List<RoomType> getAllRoomTypes() {
        return roomTypeRepository.findAll();
    }

    public RoomType getRoomTypeByIdAdmin(Long id) {
        return roomTypeRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Loại phòng không tồn tại"));
    }

    @Transactional
    public RoomType createRoomType(RoomTypeRequest request) {
        // Kiểm tra tên trùng
        boolean nameTaken = roomTypeRepository.findByIsActiveTrue().stream()
                .anyMatch(rt -> rt.getName().equalsIgnoreCase(request.getName().trim()));
        if (nameTaken) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Tên loại phòng '" + request.getName() + "' đã tồn tại");
        }

        RoomType roomType = RoomType.builder()
                .name(request.getName().trim())
                .capacity(request.getCapacity())
                .basePrice(request.getBasePrice())
                .description(request.getDescription())
                .amenities(request.getAmenities())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        return roomTypeRepository.save(roomType);
    }

    @Transactional
    public RoomType updateRoomType(Long id, RoomTypeRequest request) {
        RoomType roomType = getRoomTypeByIdAdmin(id);

        roomType.setName(request.getName().trim());
        roomType.setCapacity(request.getCapacity());
        roomType.setBasePrice(request.getBasePrice());
        roomType.setDescription(request.getDescription());
        roomType.setAmenities(request.getAmenities());
        if (request.getIsActive() != null) {
            roomType.setIsActive(request.getIsActive());
        }

        return roomTypeRepository.save(roomType);
    }

    /**
     * Vô hiệu hóa loại phòng (soft-delete).
     * Không xóa vật lý vì còn booking lịch sử.
     */
    @Transactional
    public void deactivateRoomType(Long id) {
        RoomType roomType = getRoomTypeByIdAdmin(id);

        // Kiểm tra còn phòng AVAILABLE không
        long activeRooms = roomRepository.findByRoomTypeId(id).stream()
                .filter(r -> r.getStatus() != RoomStatus.MAINTENANCE)
                .count();
        if (activeRooms > 0) {
            throw new AppException(HttpStatus.CONFLICT,
                    String.format("Không thể vô hiệu hóa: loại phòng còn %d phòng đang hoạt động. " +
                            "Hãy chuyển tất cả phòng sang trạng thái MAINTENANCE trước.", activeRooms));
        }

        roomType.setIsActive(false);
        roomTypeRepository.save(roomType);
    }

    // ════════════════════════════════════════
    // ROOM (phòng vật lý) CRUD
    // ════════════════════════════════════════

    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    public List<Room> getRoomsByRoomType(Long roomTypeId) {
        // Validate roomType tồn tại
        getRoomTypeByIdAdmin(roomTypeId);
        return roomRepository.findByRoomTypeId(roomTypeId);
    }

    @Transactional
    public Room createRoom(RoomRequest request) {
        // Kiểm tra số phòng trùng
        boolean numberTaken = roomRepository.findAll().stream()
                .anyMatch(r -> r.getRoomNumber().equalsIgnoreCase(request.getRoomNumber().trim()));
        if (numberTaken) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Số phòng '" + request.getRoomNumber() + "' đã tồn tại");
        }

        RoomType roomType = getRoomTypeByIdAdmin(request.getRoomTypeId());

        RoomStatus initialStatus = RoomStatus.AVAILABLE;
        if (request.getStatus() != null) {
            try {
                initialStatus = RoomStatus.valueOf(request.getStatus().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "Trạng thái phòng không hợp lệ");
            }
        }

        Room room = Room.builder()
                .roomNumber(request.getRoomNumber().trim())
                .roomType(roomType)
                .floor(request.getFloor())
                .status(initialStatus)
                .build();

        return roomRepository.save(room);
    }

    @Transactional
    public Room updateRoom(Long id, RoomRequest request) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Phòng không tồn tại"));

        // Kiểm tra số phòng trùng (ngoại trừ chính nó)
        boolean numberTaken = roomRepository.findAll().stream()
                .anyMatch(r -> !r.getId().equals(id)
                        && r.getRoomNumber().equalsIgnoreCase(request.getRoomNumber().trim()));
        if (numberTaken) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Số phòng '" + request.getRoomNumber() + "' đã tồn tại");
        }

        RoomType roomType = getRoomTypeByIdAdmin(request.getRoomTypeId());
        room.setRoomNumber(request.getRoomNumber().trim());
        room.setRoomType(roomType);
        room.setFloor(request.getFloor());

        return roomRepository.save(room);
    }

    /** Xóa phòng vật lý (chỉ cho phép nếu không có booking đang active) */
    @Transactional
    public void deleteRoom(Long id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Phòng không tồn tại"));

        if (room.getStatus() == RoomStatus.OCCUPIED) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Không thể xóa phòng đang có khách (trạng thái OCCUPIED)");
        }

        roomRepository.delete(room);
    }

    // ════════════════════════════════════════
    // ROOM TYPE IMAGES (Cloudinary Upload)
    // ════════════════════════════════════════

    public List<RoomTypeImage> getRoomTypeImages(Long roomTypeId) {
        getRoomTypeByIdAdmin(roomTypeId);
        return roomTypeImageRepository.findByRoomTypeId(roomTypeId);
    }

    @Transactional
    public RoomTypeImage uploadRoomTypeImage(Long roomTypeId, MultipartFile file, boolean isPrimary) {
        RoomType roomType = getRoomTypeByIdAdmin(roomTypeId);

        // Upload file ảnh lên Cloudinary
        String imageUrl = cloudinaryService.uploadImage(file, "hotel_rooms/" + roomTypeId);

        // Nếu là ảnh đại diện chính -> bỏ chọn cờ của các ảnh cũ
        if (isPrimary) {
            List<RoomTypeImage> existingImages = roomTypeImageRepository.findByRoomTypeId(roomTypeId);
            for (RoomTypeImage img : existingImages) {
                if (Boolean.TRUE.equals(img.getIsPrimary())) {
                    img.setIsPrimary(false);
                    roomTypeImageRepository.save(img);
                }
            }
        }

        RoomTypeImage newImage = RoomTypeImage.builder()
                .roomType(roomType)
                .imageUrl(imageUrl)
                .isPrimary(isPrimary)
                .build();

        return roomTypeImageRepository.save(newImage);
    }

    @Transactional
    public void deleteRoomTypeImage(Long roomTypeId, Long imageId) {
        getRoomTypeByIdAdmin(roomTypeId);
        RoomTypeImage image = roomTypeImageRepository.findById(imageId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Hình ảnh không tồn tại"));

        if (!image.getRoomType().getId().equals(roomTypeId)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Ảnh không thuộc loại phòng chỉ định");
        }

        roomTypeImageRepository.delete(image);
    }
}
