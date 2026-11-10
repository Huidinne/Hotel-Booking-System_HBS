package org.example.backend.dashboard;

import org.example.backend.auth.security.JwtProvider;
import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.booking.repository.BookingRoomRepository;
import org.example.backend.dashboard.dto.DashboardSummaryResponse;
import org.example.backend.dashboard.projection.BookingPeriodProjection;
import org.example.backend.dashboard.repository.DashboardRepository;
import org.example.backend.dashboard.service.DashboardService;
import org.example.backend.payment.entity.PaymentTransaction;
import org.example.backend.payment.entity.TransactionStatus;
import org.example.backend.payment.repository.PaymentTransactionRepository;
import org.example.backend.room.entity.Room;
import org.example.backend.room.entity.RoomStatus;
import org.example.backend.room.entity.RoomType;
import org.example.backend.room.repository.RoomRepository;
import org.example.backend.room.repository.RoomTypeRepository;
import org.example.backend.user.entity.Role;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiểm thử tích hợp truy vấn thống kê theo khoảng ngày cho Admin Dashboard theo task [SP2-1110-THANH]:
 * 1. Nghiệm thu giảm findAll: Kiểm chứng repository query & projection trực tiếp trên H2 Database.
 * 2. Nghiệm thu tính room nights:
 *    - Đơn vắt qua tháng (Cross-month).
 *    - Ngày checkout KHÔNG tính thêm đêm (Checkout exclusion).
 *    - Biên đầu ngày (dateFrom) và biên cuối ngày (dateTo).
 * 3. Nghiệm thu giữ summary tương thích: Response đầy đủ hợp đồng API FR-14.
 */
@SpringBootTest
@AutoConfigureMockMvc
class DashboardQueryStatisticsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DashboardService dashboardService;

    @Autowired
    private DashboardRepository dashboardRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private BookingRoomRepository bookingRoomRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtProvider jwtProvider;

    private User adminUser;
    private String adminToken;
    private RoomType deluxeRoomType;

    @BeforeEach
    void setUp() {
        paymentTransactionRepository.deleteAll();
        bookingRoomRepository.deleteAll();
        bookingRepository.deleteAll();
        roomRepository.deleteAll();
        roomTypeRepository.deleteAll();
        userRepository.deleteAll();

        adminUser = userRepository.save(User.builder()
                .email("admin_dash@hotel.com")
                .password("hash123")
                .fullName("Admin Manager")
                .phone("0909999999")
                .role(Role.ROLE_ADMIN)
                .isActive(true)
                .build());

        adminToken = jwtProvider.generateAccessToken(adminUser);

        deluxeRoomType = roomTypeRepository.save(RoomType.builder()
                .name("Deluxe Double Ocean")
                .capacity(2)
                .basePrice(BigDecimal.valueOf(1000000))
                .isActive(true)
                .build());

        // 3 phòng vật lý: 2 active (AVAILABLE, OCCUPIED) và 1 MAINTENANCE
        roomRepository.save(Room.builder().roomNumber("101").floor(1).status(RoomStatus.AVAILABLE).roomType(deluxeRoomType).build());
        roomRepository.save(Room.builder().roomNumber("102").floor(1).status(RoomStatus.OCCUPIED).roomType(deluxeRoomType).build());
        roomRepository.save(Room.builder().roomNumber("103").floor(1).status(RoomStatus.MAINTENANCE).roomType(deluxeRoomType).build());

        // -------------------------------------------------------------
        // DỮ LIỆU ĐẶT PHÒNG THỬ NGHIỆM CHO CÁC TÌNH HUỐNG BIÊN:
        // -------------------------------------------------------------
        // Booking 1 (Chuẩn nội kỳ): 01/11/2026 -> 05/11/2026 (4 đêm), 1 phòng, 4.000.000 VNĐ
        Booking b1 = bookingRepository.save(Booking.builder()
                .bookingCode("BK-NOV-001")
                .user(adminUser)
                .roomType(deluxeRoomType)
                .quantity(1)
                .guests(2)
                .checkInDate(LocalDate.of(2026, 11, 1))
                .checkOutDate(LocalDate.of(2026, 11, 5))
                .pricePerNight(BigDecimal.valueOf(1000000))
                .totalPrice(BigDecimal.valueOf(4000000))
                .depositAmount(BigDecimal.valueOf(2000000))
                .bookingStatus(BookingStatus.CHECKED_OUT)
                .paymentStatus(PaymentStatus.FULLY_PAID)
                .paymentMethod(PaymentMethod.VNPAY)
                .build());

        paymentTransactionRepository.save(PaymentTransaction.builder()
                .booking(b1)
                .transactionCode("TXN-001")
                .paymentMethod(PaymentMethod.VNPAY)
                .amount(BigDecimal.valueOf(4000000))
                .status(TransactionStatus.SUCCESS)
                .createdAt(LocalDateTime.of(2026, 11, 1, 10, 0))
                .build());

        // Booking 2 (Vắt qua tháng): 28/10/2026 -> 03/11/2026 (6 đêm), 1 phòng, 6.000.000 VNĐ
        Booking b2 = bookingRepository.save(Booking.builder()
                .bookingCode("BK-CROSS-002")
                .user(adminUser)
                .roomType(deluxeRoomType)
                .quantity(1)
                .guests(2)
                .checkInDate(LocalDate.of(2026, 10, 28))
                .checkOutDate(LocalDate.of(2026, 11, 3))
                .pricePerNight(BigDecimal.valueOf(1000000))
                .totalPrice(BigDecimal.valueOf(6000000))
                .depositAmount(BigDecimal.valueOf(3000000))
                .bookingStatus(BookingStatus.CHECKED_OUT)
                .paymentStatus(PaymentStatus.FULLY_PAID)
                .paymentMethod(PaymentMethod.VNPAY)
                .build());

        paymentTransactionRepository.save(PaymentTransaction.builder()
                .booking(b2)
                .transactionCode("TXN-002")
                .paymentMethod(PaymentMethod.VNPAY)
                .amount(BigDecimal.valueOf(6000000))
                .status(TransactionStatus.SUCCESS)
                .createdAt(LocalDateTime.of(2026, 10, 28, 14, 0))
                .build());

        // Booking 3 (Checkout đúng ngày dateFrom 01/11): 29/10/2026 -> 01/11/2026 (3 đêm)
        // Checkout sáng 01/11 trước 12:00 ➔ Trong kỳ [01/11, 10/11] tính đúng 0 đêm!
        Booking b3 = bookingRepository.save(Booking.builder()
                .bookingCode("BK-CHECKOUT-EDGE-003")
                .user(adminUser)
                .roomType(deluxeRoomType)
                .quantity(1)
                .guests(2)
                .checkInDate(LocalDate.of(2026, 10, 29))
                .checkOutDate(LocalDate.of(2026, 11, 1))
                .pricePerNight(BigDecimal.valueOf(1000000))
                .totalPrice(BigDecimal.valueOf(3000000))
                .depositAmount(BigDecimal.valueOf(1500000))
                .bookingStatus(BookingStatus.CHECKED_OUT)
                .paymentStatus(PaymentStatus.FULLY_PAID)
                .paymentMethod(PaymentMethod.VNPAY)
                .build());

        // Booking 4 (Check-in đúng ngày dateTo 10/11): 10/11/2026 -> 12/11/2026 (2 đêm)
        // Trong kỳ [01/11, 10/11] tính đúng 1 đêm (đêm 10/11)
        Booking b4 = bookingRepository.save(Booking.builder()
                .bookingCode("BK-CHECKIN-EDGE-004")
                .user(adminUser)
                .roomType(deluxeRoomType)
                .quantity(1)
                .guests(2)
                .checkInDate(LocalDate.of(2026, 11, 10))
                .checkOutDate(LocalDate.of(2026, 11, 12))
                .pricePerNight(BigDecimal.valueOf(1000000))
                .totalPrice(BigDecimal.valueOf(2000000))
                .depositAmount(BigDecimal.valueOf(1000000))
                .bookingStatus(BookingStatus.CHECKED_IN)
                .paymentStatus(PaymentStatus.PARTIALLY_PAID)
                .paymentMethod(PaymentMethod.VNPAY)
                .build());
    }

    @Test
    @DisplayName("Nghiệm thu truy vấn Projection: DashboardRepository chỉ lấy booking giao cắt và đúng các trường")
    void testDashboardRepository_ProjectionsWorkCorrectly() {
        LocalDate dateFrom = LocalDate.of(2026, 11, 1);
        LocalDate dateTo = LocalDate.of(2026, 11, 10);

        List<BookingPeriodProjection> list = dashboardRepository.findOccupiedBookingsInPeriod(dateFrom, dateTo);

        // b3 (checkout ngày 01/11) đã được câu lệnh SQL lọc bỏ vì b.checkOutDate > :dateFrom
        // Danh sách giao cắt gồm: b1, b2, b4 (3 booking)
        assertThat(list).hasSize(3);

        BookingPeriodProjection first = list.get(0);
        assertThat(first.getCheckInDate()).isNotNull();
        assertThat(first.getCheckOutDate()).isNotNull();
        assertThat(first.getRoomTypeName()).isEqualTo("Deluxe Double Ocean");
        assertThat(first.getTotalPrice()).isNotNull();
    }

    @Test
    @DisplayName("Nghiệm thu tính room nights: Phân bổ đúng đêm qua tháng, loại trừ ngày checkout, tính đúng biên đầu/cuối")
    void testDashboardService_CalculateRoomNights_AccurateLogic() {
        LocalDate dateFrom = LocalDate.of(2026, 11, 1);
        LocalDate dateTo = LocalDate.of(2026, 11, 10);

        DashboardSummaryResponse response = dashboardService.getSummary(dateFrom, dateTo);

        // Phân tích đêm bán (soldRoomNights) trong kỳ [01/11, 10/11]:
        // - b1: 01/11 -> 05/11 = 4 đêm (ngày 1, 2, 3, 4. Ngày 5 checkout không tính đêm)
        // - b2: 28/10 -> 03/11 = 2 đêm trong tháng 11 (ngày 1, 2. Ngày 3 checkout không tính đêm)
        // - b3: 29/10 -> 01/11 = 0 đêm trong kỳ (checkout sáng 01/11)
        // - b4: 10/11 -> 12/11 = 1 đêm trong kỳ (đêm 10/11)
        // => Tổng soldRoomNights = 4 + 2 + 0 + 1 = 7 đêm!
        assertThat(response.getSoldRoomNights()).isEqualTo(7L);

        // Doanh thu lưu trú = 7 đêm * 1.000.000 = 7.000.000 VNĐ
        assertThat(response.getRoomRevenue()).isEqualByComparingTo(BigDecimal.valueOf(7000000));

        // Phòng khả dụng = 2 phòng active * 10 ngày = 20 đêm khả dụng
        assertThat(response.getActiveRooms()).isEqualTo(2L);
        assertThat(response.getTotalAvailableRoomNights()).isEqualTo(20L);

        // ADR = 7.000.000 / 7 đêm = 1.000.000 VNĐ
        assertThat(response.getAdr()).isEqualByComparingTo(BigDecimal.valueOf(1000000));

        // RevPAR = 7.000.000 / 20 = 350.000 VNĐ
        assertThat(response.getRevpar()).isEqualByComparingTo(BigDecimal.valueOf(350000));

        // Occupancy Rate = 7 / 20 = 0.35 (35%)
        assertThat(response.getOccupancyRate()).isEqualTo(0.35);

        // Chuỗi biểu đồ 10 ngày đầy đủ
        assertThat(response.getRevenueSeries()).hasSize(10);

        // Kiểm tra điểm biểu đồ ngày 05/11:
        // b1 checkout ngày 05/11 ➔ không có đêm nào của b1.
        // b2 đã checkout từ 03/11.
        // b4 chưa check-in.
        // ➔ soldRoomNights ngày 05/11 = 0! (Minh chứng ngày checkout không cộng đêm)
        assertThat(response.getRevenueSeries().get(4).getDate()).isEqualTo(LocalDate.of(2026, 11, 5));
        assertThat(response.getRevenueSeries().get(4).getSoldRoomNights()).isEqualTo(0L);

        // Kiểm tra điểm biểu đồ ngày 10/11 (ngày cuối kỳ):
        // b4 check-in ngày 10/11 ➔ soldRoomNights = 1!
        assertThat(response.getRevenueSeries().get(9).getDate()).isEqualTo(LocalDate.of(2026, 11, 10));
        assertThat(response.getRevenueSeries().get(9).getSoldRoomNights()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Nghiệm thu API HTTP: GET /api/v1/admin/dashboard/summary tương thích 100% hợp đồng Frontend")
    void testAdminDashboardEndpoint_HttpContractCompatibility() throws Exception {
        mockMvc.perform(get("/api/v1/admin/dashboard/summary")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("dateFrom", "2026-11-01")
                        .param("dateTo", "2026-11-10")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.dateFrom").value("2026-11-01"))
                .andExpect(jsonPath("$.data.dateTo").value("2026-11-10"))
                .andExpect(jsonPath("$.data.soldRoomNights").value(7))
                .andExpect(jsonPath("$.data.roomRevenue").value(7000000.0))
                .andExpect(jsonPath("$.data.adr").value(1000000.0))
                .andExpect(jsonPath("$.data.revpar").value(350000.0))
                .andExpect(jsonPath("$.data.occupancyRate").value(0.35))
                .andExpect(jsonPath("$.data.totalRooms").value(3))
                .andExpect(jsonPath("$.data.activeRooms").value(2))
                .andExpect(jsonPath("$.data.roomCounts.AVAILABLE").value(1))
                .andExpect(jsonPath("$.data.roomCounts.OCCUPIED").value(1))
                .andExpect(jsonPath("$.data.roomCounts.MAINTENANCE").value(1))
                .andExpect(jsonPath("$.data.revenueSeries.length()").value(10))
                .andExpect(jsonPath("$.data.roomTypeRevenues[0].roomTypeName").value("Deluxe Double Ocean"));
    }
}

