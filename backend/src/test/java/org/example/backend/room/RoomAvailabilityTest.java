package org.example.backend.room;

import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.common.exception.AppException;
import org.example.backend.room.dto.RoomTypeAvailabilityResponse;
import org.example.backend.room.entity.Room;
import org.example.backend.room.entity.RoomStatus;
import org.example.backend.room.entity.RoomType;
import org.example.backend.room.repository.RoomRepository;
import org.example.backend.room.repository.RoomTypeRepository;
import org.example.backend.room.service.RoomService;
import org.example.backend.user.entity.Role;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Kiểm thử tính khả dụng và tra cứu phòng trống theo khoảng ngày (SRS §3.3 & FR-02):
 * - Kiểm tra khoảng ngày và số lượng hợp lệ
 * - Xử lý booking trùng ngày và phòng bảo trì
 * - Test các khoảng ngày giao nhau và trường hợp hết phòng
 */
@SpringBootTest
class RoomAvailabilityTest {

    @Autowired
    private RoomService roomService;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private UserRepository userRepository;

    private RoomType deluxeRoomType;
    private User testUser;

    @BeforeEach
    void setUp() {
        bookingRepository.deleteAll();
        roomRepository.deleteAll();
        roomTypeRepository.deleteAll();
        userRepository.deleteAll();

        deluxeRoomType = roomTypeRepository.save(RoomType.builder()
                .name("Deluxe Room Test")
                .capacity(2)
                .basePrice(BigDecimal.valueOf(1000000))
                .description("Phòng Deluxe thử nghiệm")
                .isActive(true)
                .build());

        testUser = userRepository.save(User.builder()
                .email("user_avail@hotel.com")
                .password("hash")
                .fullName("Test User")
                .phone("0909999999")
                .role(Role.ROLE_CUSTOMER)
                .build());

        // Tạo 3 phòng vật lý: 2 AVAILABLE, 1 MAINTENANCE
        roomRepository.save(Room.builder()
                .roomNumber("101")
                .floor(1)
                .roomType(deluxeRoomType)
                .status(RoomStatus.AVAILABLE)
                .build());

        roomRepository.save(Room.builder()
                .roomNumber("102")
                .floor(1)
                .roomType(deluxeRoomType)
                .status(RoomStatus.AVAILABLE)
                .build());

        roomRepository.save(Room.builder()
                .roomNumber("103")
                .floor(1)
                .roomType(deluxeRoomType)
                .status(RoomStatus.MAINTENANCE)
                .build());
    }

    @Test
    @DisplayName("Phòng bảo trì (MAINTENANCE) không được tính vào tổng năng lực phục vụ")
    void testMaintenanceRoomExcluded() {
        // Tổng 3 phòng, nhưng 1 MAINTENANCE -> chỉ 2 phòng hoạt động
        LocalDate checkIn = LocalDate.now().plusDays(5);
        LocalDate checkOut = LocalDate.now().plusDays(7);

        List<RoomTypeAvailabilityResponse> results = roomService.searchAvailableRoomTypes(
                checkIn, checkOut, 2, 1);

        assertFalse(results.isEmpty());
        RoomTypeAvailabilityResponse resp = results.get(0);
        assertEquals(2, resp.getAvailableRooms(), "Phải là 2 phòng vì 1 phòng đang bảo trì");
        assertTrue(resp.isAvailable());
    }

    @Test
    @DisplayName("Validation: Ngày check-out phải sau check-in ít nhất 1 đêm")
    void testInvalidDatesThrowsBadRequest() {
        LocalDate checkIn = LocalDate.now().plusDays(5);
        LocalDate checkOutSameDay = checkIn;
        LocalDate checkOutBefore = checkIn.minusDays(1);

        assertThrows(AppException.class, () ->
                roomService.searchAvailableRoomTypes(checkIn, checkOutSameDay, 2, 1));

        assertThrows(AppException.class, () ->
                roomService.searchAvailableRoomTypes(checkIn, checkOutBefore, 2, 1));
    }

    @Test
    @DisplayName("Khoảng ngày giao nhau hoàn toàn: Quota bị trừ chính xác")
    void testFullyOverlappingDates() {
        // Tạo 1 booking từ ngày +10 đến +15 (chiếm 1 phòng)
        LocalDate bookIn = LocalDate.now().plusDays(10);
        LocalDate bookOut = LocalDate.now().plusDays(15);

        bookingRepository.save(Booking.builder()
                .bookingCode("BK-OVERLAP-1")
                .user(testUser)
                .roomType(deluxeRoomType)
                .quantity(1)
                .guests(2)
                .checkInDate(bookIn)
                .checkOutDate(bookOut)
                .pricePerNight(BigDecimal.valueOf(1000000))
                .totalPrice(BigDecimal.valueOf(5000000))
                .depositAmount(BigDecimal.valueOf(2500000))
                .bookingStatus(BookingStatus.CONFIRMED)
                .paymentStatus(PaymentStatus.PARTIALLY_PAID)
                .paymentMethod(PaymentMethod.VNPAY)
                .build());

        // Tìm phòng trong khoảng +11 đến +13 (nằm trọn bên trong) -> Giao nhau -> Còn 2 - 1 = 1 phòng
        List<RoomTypeAvailabilityResponse> results = roomService.searchAvailableRoomTypes(
                LocalDate.now().plusDays(11), LocalDate.now().plusDays(13), 2, 1);

        assertEquals(1, results.get(0).getAvailableRooms());
    }

    @Test
    @DisplayName("Khoảng ngày giao nhau 1 phần (Start trước hoặc End sau): Quota bị trừ chính xác")
    void testPartiallyOverlappingDates() {
        LocalDate bookIn = LocalDate.now().plusDays(10);
        LocalDate bookOut = LocalDate.now().plusDays(15);

        bookingRepository.save(Booking.builder()
                .bookingCode("BK-OVERLAP-2")
                .user(testUser)
                .roomType(deluxeRoomType)
                .quantity(1)
                .guests(2)
                .checkInDate(bookIn)
                .checkOutDate(bookOut)
                .pricePerNight(BigDecimal.valueOf(1000000))
                .totalPrice(BigDecimal.valueOf(5000000))
                .depositAmount(BigDecimal.valueOf(2500000))
                .bookingStatus(BookingStatus.CONFIRMED)
                .paymentStatus(PaymentStatus.PARTIALLY_PAID)
                .paymentMethod(PaymentMethod.VNPAY)
                .build());

        // Tìm từ +8 đến +12 (giao nhau từ +10 đến +12) -> Còn 1 phòng
        List<RoomTypeAvailabilityResponse> results1 = roomService.searchAvailableRoomTypes(
                LocalDate.now().plusDays(8), LocalDate.now().plusDays(12), 2, 1);
        assertEquals(1, results1.get(0).getAvailableRooms());

        // Tìm từ +13 đến +18 (giao nhau từ +13 đến +15) -> Còn 1 phòng
        List<RoomTypeAvailabilityResponse> results2 = roomService.searchAvailableRoomTypes(
                LocalDate.now().plusDays(13), LocalDate.now().plusDays(18), 2, 1);
        assertEquals(1, results2.get(0).getAvailableRooms());
    }

    @Test
    @DisplayName("Khoảng ngày liền kề (CheckIn mới = CheckOut cũ): KHÔNG giao nhau, đủ 2 phòng")
    void testContiguousDatesDoNotOverlap() {
        LocalDate bookIn = LocalDate.now().plusDays(10);
        LocalDate bookOut = LocalDate.now().plusDays(15);

        bookingRepository.save(Booking.builder()
                .bookingCode("BK-OVERLAP-3")
                .user(testUser)
                .roomType(deluxeRoomType)
                .quantity(1)
                .guests(2)
                .checkInDate(bookIn)
                .checkOutDate(bookOut)
                .pricePerNight(BigDecimal.valueOf(1000000))
                .totalPrice(BigDecimal.valueOf(5000000))
                .depositAmount(BigDecimal.valueOf(2500000))
                .bookingStatus(BookingStatus.CONFIRMED)
                .paymentStatus(PaymentStatus.PARTIALLY_PAID)
                .paymentMethod(PaymentMethod.VNPAY)
                .build());

        // Khách mới nhận phòng đúng ngày khách cũ trả (+15 đến +18) -> Không trùng -> Đủ 2 phòng
        List<RoomTypeAvailabilityResponse> results = roomService.searchAvailableRoomTypes(
                LocalDate.now().plusDays(15), LocalDate.now().plusDays(18), 2, 1);

        assertEquals(2, results.get(0).getAvailableRooms());
    }

    @Test
    @DisplayName("Trường hợp hết phòng: availableRooms = 0, isAvailable = false")
    void testOutOfRooms() {
        LocalDate bookIn = LocalDate.now().plusDays(20);
        LocalDate bookOut = LocalDate.now().plusDays(25);

        // Đặt cả 2 phòng khả dụng
        bookingRepository.save(Booking.builder()
                .bookingCode("BK-FULL-1")
                .user(testUser)
                .roomType(deluxeRoomType)
                .quantity(2)
                .guests(2)
                .checkInDate(bookIn)
                .checkOutDate(bookOut)
                .pricePerNight(BigDecimal.valueOf(1000000))
                .totalPrice(BigDecimal.valueOf(10000000))
                .depositAmount(BigDecimal.valueOf(5000000))
                .bookingStatus(BookingStatus.CONFIRMED)
                .paymentStatus(PaymentStatus.PARTIALLY_PAID)
                .paymentMethod(PaymentMethod.VNPAY)
                .build());

        List<RoomTypeAvailabilityResponse> results = roomService.searchAvailableRoomTypes(
                bookIn, bookOut, 2, 1);

        assertEquals(0, results.get(0).getAvailableRooms());
        assertFalse(results.get(0).isAvailable());
    }
}
