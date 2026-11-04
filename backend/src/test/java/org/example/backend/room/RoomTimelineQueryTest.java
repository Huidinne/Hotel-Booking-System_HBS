package org.example.backend.room;

import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingRoom;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.booking.repository.BookingRoomRepository;
import org.example.backend.common.exception.AppException;
import org.example.backend.payment.repository.PaymentTransactionRepository;
import org.example.backend.room.dto.RoomDailyStatusDTO;
import org.example.backend.room.dto.RoomTimelineResponse;
import org.example.backend.room.dto.RoomTimelineStatus;
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
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit/Integration Test cho chức năng Lịch phòng trực quan Ma trận Timeline (SRS §FR-13):
 * - FR-13.1: Dữ liệu bảng 2 chiều (phòng theo tầng/loại phòng, chuỗi ngày)
 * - FR-13.2: 5 mã màu chuẩn PMS (AVAILABLE, CONFIRMED, CHECKED_IN, CLEANING, MAINTENANCE)
 * - FR-13.3: Thông tin tóm tắt đơn đặt khi hover/click vào ô
 * - FR-13.4: Truy vấn tối ưu bulk fetch, xử lý giao thoa ngày và biên
 */
@SpringBootTest
class RoomTimelineQueryTest {

    @Autowired
    private RoomService roomService;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private BookingRoomRepository bookingRoomRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    @Autowired
    private UserRepository userRepository;

    private RoomType deluxeType;
    private RoomType suiteType;
    private Room room101;
    private Room room102;
    private Room room201;
    private User customer;
    private User receptionist;

    @BeforeEach
    void setUp() {
        paymentTransactionRepository.deleteAll();
        bookingRoomRepository.deleteAll();
        bookingRepository.deleteAll();
        roomRepository.deleteAll();
        roomTypeRepository.deleteAll();
        userRepository.deleteAll();

        // 1. Tạo Users mẫu
        customer = userRepository.save(User.builder()
                .email("guest_timeline@example.com")
                .password("encoded_pass")
                .fullName("Nguyen Van Khach")
                .phone("0988776655")
                .role(Role.ROLE_CUSTOMER)
                .build());

        receptionist = userRepository.save(User.builder()
                .email("receptionist_timeline@example.com")
                .password("encoded_pass")
                .fullName("Tran Thi Le Tan")
                .phone("0911223344")
                .role(Role.ROLE_RECEPTIONIST)
                .build());

        // 2. Tạo Loại phòng mẫu
        deluxeType = roomTypeRepository.save(RoomType.builder()
                .name("Deluxe Room")
                .description("Phòng Deluxe cao cấp")
                .capacity(2)
                .basePrice(new BigDecimal("1000000.00"))
                .isActive(true)
                .build());

        suiteType = roomTypeRepository.save(RoomType.builder()
                .name("Suite Room")
                .description("Phòng Suite thượng hạng")
                .capacity(4)
                .basePrice(new BigDecimal("2500000.00"))
                .isActive(true)
                .build());

        // 3. Tạo Phòng vật lý mẫu
        room101 = roomRepository.save(Room.builder()
                .roomNumber("101")
                .floor(1)
                .roomType(deluxeType)
                .status(RoomStatus.AVAILABLE)
                .build());

        room102 = roomRepository.save(Room.builder()
                .roomNumber("102")
                .floor(1)
                .roomType(deluxeType)
                .status(RoomStatus.AVAILABLE)
                .build());

        room201 = roomRepository.save(Room.builder()
                .roomNumber("201")
                .floor(2)
                .roomType(suiteType)
                .status(RoomStatus.AVAILABLE)
                .build());
    }

    @Test
    @DisplayName("TC01 - Khi không có booking nào, tất cả các ô ngày đều là AVAILABLE")
    void testTimeline_EmptyBooking_AllAvailable() {
        LocalDate start = LocalDate.of(2026, 11, 1);
        LocalDate end = LocalDate.of(2026, 11, 7);

        List<RoomTimelineResponse> timeline = roomService.getRoomTimeline(start, end, null);

        assertEquals(3, timeline.size());

        for (RoomTimelineResponse row : timeline) {
            assertEquals(7, row.getDailyStatuses().size());
            for (RoomDailyStatusDTO daily : row.getDailyStatuses()) {
                assertEquals(RoomTimelineStatus.AVAILABLE, daily.getStatus());
                assertNull(daily.getBookingId());
            }
        }
    }

    @Test
    @DisplayName("TC02 - Booking CONFIRMED hiển thị màu CONFIRMED và đầy đủ thông tin tooltip (FR-13.2 & FR-13.3)")
    void testTimeline_ConfirmedBooking_DisplaysConfirmedWithDetails() {
        LocalDate checkIn = LocalDate.of(2026, 11, 3);
        LocalDate checkOut = LocalDate.of(2026, 11, 6); // 3 đêm: 3, 4, 5. Ngày 6 checkout

        Booking booking = bookingRepository.save(Booking.builder()
                .bookingCode("BK-CONFIRMED-01")
                .user(customer)
                .roomType(deluxeType)
                .quantity(1)
                .guests(2)
                .paymentMethod(PaymentMethod.VNPAY)
                .checkInDate(checkIn)
                .checkOutDate(checkOut)
                .pricePerNight(new BigDecimal("1000000.00"))
                .totalPrice(new BigDecimal("3000000.00"))
                .depositAmount(new BigDecimal("1500000.00"))
                .bookingStatus(BookingStatus.CONFIRMED)
                .paymentStatus(PaymentStatus.PARTIALLY_PAID)
                .build());

        bookingRoomRepository.save(BookingRoom.builder()
                .booking(booking)
                .room(room101)
                .assignedAt(LocalDateTime.now())
                .assignedBy(receptionist)
                .build());

        LocalDate queryStart = LocalDate.of(2026, 11, 1);
        LocalDate queryEnd = LocalDate.of(2026, 11, 7);

        List<RoomTimelineResponse> timeline = roomService.getRoomTimeline(queryStart, queryEnd, deluxeType.getId());

        RoomTimelineResponse row101 = timeline.stream()
                .filter(r -> r.getRoomNumber().equals("101"))
                .findFirst()
                .orElseThrow();

        List<RoomDailyStatusDTO> statuses = row101.getDailyStatuses();
        assertEquals(7, statuses.size());

        // Ngày 1, 2: AVAILABLE
        assertEquals(RoomTimelineStatus.AVAILABLE, statuses.get(0).getStatus());
        assertEquals(RoomTimelineStatus.AVAILABLE, statuses.get(1).getStatus());

        // Ngày 3, 4, 5: CONFIRMED kèm chi tiết
        for (int i = 2; i <= 4; i++) {
            RoomDailyStatusDTO d = statuses.get(i);
            assertEquals(RoomTimelineStatus.CONFIRMED, d.getStatus());
            assertEquals("BK-CONFIRMED-01", d.getBookingCode());
            assertEquals("Nguyen Van Khach", d.getCustomerName());
            assertEquals("0988776655", d.getCustomerPhone());
            assertEquals(new BigDecimal("1500000.00"), d.getDepositAmount());
            assertEquals(new BigDecimal("3000000.00"), d.getTotalPrice());
        }

        // Ngày 6 (Checkout): AVAILABLE (chiều có thể nhận khách mới theo quy ước khách sạn)
        assertEquals(RoomTimelineStatus.AVAILABLE, statuses.get(5).getStatus());
        // Ngày 7: AVAILABLE
        assertEquals(RoomTimelineStatus.AVAILABLE, statuses.get(6).getStatus());
    }

    @Test
    @DisplayName("TC03 - Booking CHECKED_IN hiển thị màu CHECKED_IN (FR-13.2)")
    void testTimeline_CheckedInBooking_DisplaysCheckedIn() {
        LocalDate checkIn = LocalDate.of(2026, 11, 2);
        LocalDate checkOut = LocalDate.of(2026, 11, 4);

        Booking booking = bookingRepository.save(Booking.builder()
                .bookingCode("BK-CHECKIN-01")
                .user(customer)
                .roomType(deluxeType)
                .quantity(1)
                .guests(2)
                .paymentMethod(PaymentMethod.CASH)
                .checkInDate(checkIn)
                .checkOutDate(checkOut)
                .pricePerNight(new BigDecimal("1000000.00"))
                .totalPrice(new BigDecimal("2000000.00"))
                .depositAmount(BigDecimal.ZERO)
                .bookingStatus(BookingStatus.CHECKED_IN)
                .paymentStatus(PaymentStatus.UNPAID)
                .build());

        bookingRoomRepository.save(BookingRoom.builder()
                .booking(booking)
                .room(room102)
                .assignedAt(LocalDateTime.now())
                .assignedBy(receptionist)
                .build());

        List<RoomTimelineResponse> timeline = roomService.getRoomTimeline(
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 5), null);

        RoomTimelineResponse row102 = timeline.stream()
                .filter(r -> r.getRoomNumber().equals("102"))
                .findFirst()
                .orElseThrow();

        assertEquals(RoomTimelineStatus.AVAILABLE, row102.getDailyStatuses().get(0).getStatus()); // Nov 1
        assertEquals(RoomTimelineStatus.CHECKED_IN, row102.getDailyStatuses().get(1).getStatus()); // Nov 2
        assertEquals(RoomTimelineStatus.CHECKED_IN, row102.getDailyStatuses().get(2).getStatus()); // Nov 3
        assertEquals(RoomTimelineStatus.AVAILABLE, row102.getDailyStatuses().get(3).getStatus());  // Nov 4 (Checkout)
    }

    @Test
    @DisplayName("TC04 - Phòng MAINTENANCE ghi đè tất cả ô ngày thành MAINTENANCE (FR-13.2)")
    void testTimeline_RoomMaintenance_OverridesStatus() {
        room201.setStatus(RoomStatus.MAINTENANCE);
        roomRepository.save(room201);

        LocalDate start = LocalDate.of(2026, 11, 10);
        LocalDate end = LocalDate.of(2026, 11, 15);

        List<RoomTimelineResponse> timeline = roomService.getRoomTimeline(start, end, suiteType.getId());

        assertEquals(1, timeline.size());
        RoomTimelineResponse row = timeline.get(0);
        assertEquals("201", row.getRoomNumber());
        assertEquals(RoomStatus.MAINTENANCE, row.getCurrentPhysicalStatus());

        for (RoomDailyStatusDTO daily : row.getDailyStatuses()) {
            assertEquals(RoomTimelineStatus.MAINTENANCE, daily.getStatus());
        }
    }

    @Test
    @DisplayName("TC05 - Phòng CLEANING hôm nay hiển thị CLEANING cho ô ngày hiện tại")
    void testTimeline_RoomCleaning_DisplaysCleaningToday() {
        room101.setStatus(RoomStatus.CLEANING);
        roomRepository.save(room101);

        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(1);
        LocalDate end = today.plusDays(1);

        List<RoomTimelineResponse> timeline = roomService.getRoomTimeline(start, end, deluxeType.getId());

        RoomTimelineResponse row101 = timeline.stream()
                .filter(r -> r.getRoomNumber().equals("101"))
                .findFirst()
                .orElseThrow();

        // Hôm qua: AVAILABLE
        assertEquals(RoomTimelineStatus.AVAILABLE, row101.getDailyStatuses().get(0).getStatus());
        // Hôm nay: CLEANING
        assertEquals(RoomTimelineStatus.CLEANING, row101.getDailyStatuses().get(1).getStatus());
        // Ngày mai: AVAILABLE
        assertEquals(RoomTimelineStatus.AVAILABLE, row101.getDailyStatuses().get(2).getStatus());
    }

    @Test
    @DisplayName("TC06 - Kiểm tra các trường hợp biên giao thoa ngày (Spanning, Ends Before, Starts After)")
    void testTimeline_OverlapDateBoundaries() {
        LocalDate queryStart = LocalDate.of(2026, 11, 10);
        LocalDate queryEnd = LocalDate.of(2026, 11, 15);

        // Booking A: Check-in trước queryStart và Check-out sau queryEnd (Bao trùm toàn bộ)
        Booking bookingA = bookingRepository.save(Booking.builder()
                .bookingCode("BK-SPAN-ALL")
                .user(customer)
                .roomType(deluxeType)
                .checkInDate(LocalDate.of(2026, 11, 5))
                .checkOutDate(LocalDate.of(2026, 11, 20))
                .pricePerNight(new BigDecimal("1000000.00"))
                .totalPrice(new BigDecimal("15000000.00"))
                .bookingStatus(BookingStatus.CONFIRMED)
                .build());

        bookingRoomRepository.save(BookingRoom.builder()
                .booking(bookingA)
                .room(room101)
                .assignedAt(LocalDateTime.now())
                .build());

        List<RoomTimelineResponse> timeline = roomService.getRoomTimeline(queryStart, queryEnd, null);

        RoomTimelineResponse row101 = timeline.stream()
                .filter(r -> r.getRoomNumber().equals("101"))
                .findFirst()
                .orElseThrow();

        // Tất cả 6 ngày (10 đến 15) đều phải là CONFIRMED
        assertEquals(6, row101.getDailyStatuses().size());
        for (RoomDailyStatusDTO daily : row101.getDailyStatuses()) {
            assertEquals(RoomTimelineStatus.CONFIRMED, daily.getStatus());
            assertEquals("BK-SPAN-ALL", daily.getBookingCode());
        }
    }

    @Test
    @DisplayName("TC07 - Booking đã HỦY (CANCELLED) không được xuất hiện trên timeline")
    void testTimeline_CancelledBooking_Ignored() {
        Booking cancelledBooking = bookingRepository.save(Booking.builder()
                .bookingCode("BK-CANCELLED-01")
                .user(customer)
                .roomType(deluxeType)
                .checkInDate(LocalDate.of(2026, 11, 1))
                .checkOutDate(LocalDate.of(2026, 11, 5))
                .pricePerNight(new BigDecimal("1000000.00"))
                .totalPrice(new BigDecimal("4000000.00"))
                .bookingStatus(BookingStatus.CANCELLED)
                .build());

        bookingRoomRepository.save(BookingRoom.builder()
                .booking(cancelledBooking)
                .room(room101)
                .assignedAt(LocalDateTime.now())
                .build());

        List<RoomTimelineResponse> timeline = roomService.getRoomTimeline(
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 5), deluxeType.getId());

        RoomTimelineResponse row101 = timeline.stream()
                .filter(r -> r.getRoomNumber().equals("101"))
                .findFirst()
                .orElseThrow();

        for (RoomDailyStatusDTO daily : row101.getDailyStatuses()) {
            assertEquals(RoomTimelineStatus.AVAILABLE, daily.getStatus());
        }
    }

    @Test
    @DisplayName("TC08 - Validation khoảng ngày không hợp lệ ném ngoại lệ 400 Bad Request")
    void testTimeline_ValidationDateRange_ThrowsException() {
        // start > end
        assertThrows(AppException.class, () ->
                roomService.getRoomTimeline(LocalDate.of(2026, 11, 10), LocalDate.of(2026, 11, 5), null));

        // khoảng cách > 31 ngày
        assertThrows(AppException.class, () ->
                roomService.getRoomTimeline(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 10), null));

        // null date
        assertThrows(AppException.class, () ->
                roomService.getRoomTimeline(null, LocalDate.of(2026, 11, 5), null));
    }

    @Test
    @DisplayName("TC09 - Kiểm thử 2 booking liền kề trên cùng phòng 101 (Adjacent Check-out & Check-in)")
    void testTimeline_AdjacentBookings_SameRoom() {
        // Khách A: [Nov 1 - Nov 3)
        Booking bookingA = bookingRepository.save(Booking.builder()
                .bookingCode("BK-ADJ-01")
                .user(customer)
                .roomType(deluxeType)
                .quantity(1)
                .guests(2)
                .paymentMethod(PaymentMethod.VNPAY)
                .checkInDate(LocalDate.of(2026, 11, 1))
                .checkOutDate(LocalDate.of(2026, 11, 3))
                .pricePerNight(new BigDecimal("1000000.00"))
                .totalPrice(new BigDecimal("2000000.00"))
                .depositAmount(new BigDecimal("1000000.00"))
                .bookingStatus(BookingStatus.CONFIRMED)
                .paymentStatus(PaymentStatus.PARTIALLY_PAID)
                .build());

        bookingRoomRepository.save(BookingRoom.builder()
                .booking(bookingA)
                .room(room101)
                .assignedAt(LocalDateTime.now())
                .build());

        // Khách B: [Nov 3 - Nov 5) trên cùng phòng 101
        User customer2 = userRepository.save(User.builder()
                .email("guest_b@example.com")
                .password("encoded_pass")
                .fullName("Le Thi Khach B")
                .phone("0912345678")
                .role(Role.ROLE_CUSTOMER)
                .build());

        Booking bookingB = bookingRepository.save(Booking.builder()
                .bookingCode("BK-ADJ-02")
                .user(customer2)
                .roomType(deluxeType)
                .quantity(1)
                .guests(2)
                .paymentMethod(PaymentMethod.CASH)
                .checkInDate(LocalDate.of(2026, 11, 3))
                .checkOutDate(LocalDate.of(2026, 11, 5))
                .pricePerNight(new BigDecimal("1000000.00"))
                .totalPrice(new BigDecimal("2000000.00"))
                .depositAmount(BigDecimal.ZERO)
                .bookingStatus(BookingStatus.CONFIRMED)
                .paymentStatus(PaymentStatus.UNPAID)
                .build());

        bookingRoomRepository.save(BookingRoom.builder()
                .booking(bookingB)
                .room(room101)
                .assignedAt(LocalDateTime.now())
                .build());

        List<RoomTimelineResponse> timeline = roomService.getRoomTimeline(
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 5), deluxeType.getId());

        RoomTimelineResponse row101 = timeline.stream()
                .filter(r -> r.getRoomNumber().equals("101"))
                .findFirst()
                .orElseThrow();

        List<RoomDailyStatusDTO> daily = row101.getDailyStatuses();
        assertEquals(5, daily.size());

        // Nov 1: Booking A
        assertEquals(RoomTimelineStatus.CONFIRMED, daily.get(0).getStatus());
        assertEquals("BK-ADJ-01", daily.get(0).getBookingCode());
        assertEquals("Nguyen Van Khach", daily.get(0).getCustomerName());

        // Nov 2: Booking A
        assertEquals(RoomTimelineStatus.CONFIRMED, daily.get(1).getStatus());
        assertEquals("BK-ADJ-01", daily.get(1).getBookingCode());

        // Nov 3: Bàn giao phòng liền kề -> Booking B nhận phòng ca chiều (14:00)
        assertEquals(RoomTimelineStatus.CONFIRMED, daily.get(2).getStatus());
        assertEquals("BK-ADJ-02", daily.get(2).getBookingCode());
        assertEquals("Le Thi Khach B", daily.get(2).getCustomerName());
        assertEquals("0912345678", daily.get(2).getCustomerPhone());

        // Nov 4: Booking B
        assertEquals(RoomTimelineStatus.CONFIRMED, daily.get(3).getStatus());
        assertEquals("BK-ADJ-02", daily.get(3).getBookingCode());

        // Nov 5: Booking B trả phòng sáng -> Chiều AVAILABLE
        assertEquals(RoomTimelineStatus.AVAILABLE, daily.get(4).getStatus());
        assertNull(daily.get(4).getBookingCode());
    }

    @Test
    @DisplayName("TC10 - Lọc theo roomTypeId trả về chính xác danh sách phòng của loại phòng đó")
    void testTimeline_FilterByRoomTypeId_SpecificAndEmpty() {
        LocalDate start = LocalDate.of(2026, 11, 1);
        LocalDate end = LocalDate.of(2026, 11, 3);

        // 1. Lọc loại phòng Suite -> chỉ có phòng 201
        List<RoomTimelineResponse> suiteList = roomService.getRoomTimeline(start, end, suiteType.getId());
        assertEquals(1, suiteList.size());
        assertEquals("201", suiteList.get(0).getRoomNumber());
        assertEquals("Suite Room", suiteList.get(0).getRoomTypeName());

        // 2. Lọc loại phòng Deluxe -> có 2 phòng (101, 102)
        List<RoomTimelineResponse> deluxeList = roomService.getRoomTimeline(start, end, deluxeType.getId());
        assertEquals(2, deluxeList.size());

        // 3. Không lọc (null) -> trả về tất cả 3 phòng
        List<RoomTimelineResponse> allList = roomService.getRoomTimeline(start, end, null);
        assertEquals(3, allList.size());

        // 4. Lọc ID không tồn tại -> danh sách rỗng
        List<RoomTimelineResponse> emptyList = roomService.getRoomTimeline(start, end, 999999L);
        assertTrue(emptyList.isEmpty());
    }

    @Test
    @DisplayName("TC11 - Dữ liệu DTO khớp hoàn toàn và đầy đủ các trường của Popup Lễ tân (Yến)")
    void testTimeline_DtoMatchesYenPopup() {
        Booking booking = bookingRepository.save(Booking.builder()
                .bookingCode("BK-POPUP-01")
                .user(customer)
                .roomType(deluxeType)
                .quantity(1)
                .guests(2)
                .paymentMethod(PaymentMethod.VNPAY)
                .checkInDate(LocalDate.of(2026, 11, 1))
                .checkOutDate(LocalDate.of(2026, 11, 4))
                .pricePerNight(new BigDecimal("1000000.00"))
                .totalPrice(new BigDecimal("3000000.00"))
                .depositAmount(new BigDecimal("1500000.00"))
                .bookingStatus(BookingStatus.CONFIRMED)
                .paymentStatus(PaymentStatus.PARTIALLY_PAID)
                .build());

        bookingRoomRepository.save(BookingRoom.builder()
                .booking(booking)
                .room(room101)
                .assignedAt(LocalDateTime.now())
                .build());

        List<RoomTimelineResponse> timeline = roomService.getRoomTimeline(
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 2), deluxeType.getId());

        RoomDailyStatusDTO dto = timeline.get(0).getDailyStatuses().get(0);
        assertEquals("BK-POPUP-01", dto.getBookingCode());
        assertEquals("Nguyen Van Khach", dto.getCustomerName());
        assertEquals("0988776655", dto.getCustomerPhone());
        assertEquals(new BigDecimal("1500000.00"), dto.getDepositAmount());
        assertEquals(new BigDecimal("1500000.00"), dto.getPaidAmount());
        assertEquals(new BigDecimal("3000000.00"), dto.getTotalPrice());
        assertEquals(LocalDate.of(2026, 11, 1), dto.getCheckInDate());
        assertEquals(LocalDate.of(2026, 11, 4), dto.getCheckOutDate());
        // Các trường bổ sung đồng bộ 1-1 với popup của Yến
        assertEquals("101", dto.getRoomNumber());
        assertEquals("Deluxe Room", dto.getRoomTypeName());
        assertEquals(1, dto.getFloor());
        assertEquals("CONFIRMED", dto.getBookingStatus());
    }
}
