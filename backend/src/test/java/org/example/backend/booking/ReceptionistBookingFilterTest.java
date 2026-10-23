package org.example.backend.booking;

import org.example.backend.auth.security.JwtProvider;
import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.booking.repository.BookingRoomRepository;
import org.example.backend.payment.repository.PaymentTransactionRepository;
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
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiểm thử bộ lọc đa tiêu chí của Lễ tân theo SRS §11.4:
 * - Lọc theo trạng thái BookingStatus (không bị trả về 0 đơn do lỗi user_id null)
 * - Lọc theo khoảng ngày check-in (checkInFrom, checkInTo)
 * - Lọc theo mã đặt phòng (bookingCode)
 * - Lọc theo email khách hàng (customerEmail)
 */
@SpringBootTest
@AutoConfigureMockMvc
class ReceptionistBookingFilterTest {

    @Autowired
    private MockMvc mockMvc;

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

    private String receptionistToken;

    @BeforeEach
    void setUp() {
        paymentTransactionRepository.deleteAll();
        bookingRoomRepository.deleteAll();
        bookingRepository.deleteAll();
        roomRepository.deleteAll();
        roomTypeRepository.deleteAll();
        userRepository.deleteAll();

        User receptionist = userRepository.save(User.builder()
                .email("receptionist_filter@hotel.com")
                .password("hash")
                .fullName("Receptionist Filter")
                .phone("0901234567")
                .role(Role.ROLE_RECEPTIONIST)
                .build());

        receptionistToken = jwtProvider.generateAccessToken(receptionist);

        User customer1 = userRepository.save(User.builder()
                .email("alpha_customer@gmail.com")
                .password("hash")
                .fullName("Alpha Customer")
                .phone("0901111222")
                .role(Role.ROLE_CUSTOMER)
                .build());

        User customer2 = userRepository.save(User.builder()
                .email("beta_customer@gmail.com")
                .password("hash")
                .fullName("Beta Customer")
                .phone("0903333444")
                .role(Role.ROLE_CUSTOMER)
                .build());

        RoomType roomType = roomTypeRepository.save(RoomType.builder()
                .name("Filter Room Type")
                .capacity(2)
                .basePrice(BigDecimal.valueOf(1000000))
                .isActive(true)
                .build());

        // Booking 1: CONFIRMED, ngày 2026-11-05
        bookingRepository.save(Booking.builder()
                .bookingCode("BK-ALPHA-01")
                .user(customer1)
                .roomType(roomType)
                .quantity(1)
                .guests(2)
                .checkInDate(LocalDate.of(2026, 11, 5))
                .checkOutDate(LocalDate.of(2026, 11, 7))
                .pricePerNight(BigDecimal.valueOf(1000000))
                .totalPrice(BigDecimal.valueOf(2000000))
                .depositAmount(BigDecimal.valueOf(1000000))
                .bookingStatus(BookingStatus.CONFIRMED)
                .paymentStatus(PaymentStatus.PARTIALLY_PAID)
                .paymentMethod(PaymentMethod.VNPAY)
                .build());

        // Booking 2: PENDING, ngày 2026-11-15
        bookingRepository.save(Booking.builder()
                .bookingCode("BK-BETA-02")
                .user(customer2)
                .roomType(roomType)
                .quantity(1)
                .guests(2)
                .checkInDate(LocalDate.of(2026, 11, 15))
                .checkOutDate(LocalDate.of(2026, 11, 18))
                .pricePerNight(BigDecimal.valueOf(1000000))
                .totalPrice(BigDecimal.valueOf(3000000))
                .depositAmount(BigDecimal.valueOf(1500000))
                .bookingStatus(BookingStatus.PENDING)
                .paymentStatus(PaymentStatus.UNPAID)
                .paymentMethod(PaymentMethod.CASH)
                .build());
    }

    @Test
    @DisplayName("Lễ tân lọc theo trạng thái CONFIRMED → Trả về đúng 1 đơn, không bị rỗng")
    void testFilterByStatusConfirmed() throws Exception {
        mockMvc.perform(get("/api/v1/receptionist/bookings")
                        .param("status", "CONFIRMED")
                        .header("Authorization", "Bearer " + receptionistToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].bookingCode").value("BK-ALPHA-01"))
                .andExpect(jsonPath("$.data.content[0].bookingStatus").value("CONFIRMED"));
    }

    @Test
    @DisplayName("Lễ tân lọc theo mã đặt phòng (bookingCode) → Tìm thấy đơn chính xác")
    void testFilterByBookingCode() throws Exception {
        mockMvc.perform(get("/api/v1/receptionist/bookings")
                        .param("bookingCode", "BETA")
                        .header("Authorization", "Bearer " + receptionistToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].bookingCode").value("BK-BETA-02"));
    }

    @Test
    @DisplayName("Lễ tân lọc theo email khách hàng (customerEmail) → Tìm thấy đơn chính xác")
    void testFilterByCustomerEmail() throws Exception {
        mockMvc.perform(get("/api/v1/receptionist/bookings")
                        .param("customerEmail", "alpha_customer")
                        .header("Authorization", "Bearer " + receptionistToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].bookingCode").value("BK-ALPHA-01"));
    }

    @Test
    @DisplayName("Lễ tân lọc theo khoảng ngày check-in (checkInFrom, checkInTo)")
    void testFilterByCheckInDateRange() throws Exception {
        // Tìm các đơn check-in từ 2026-11-01 đến 2026-11-10 -> chỉ có BK-ALPHA-01 (2026-11-05)
        mockMvc.perform(get("/api/v1/receptionist/bookings")
                        .param("checkInFrom", "2026-11-01")
                        .param("checkInTo", "2026-11-10")
                        .header("Authorization", "Bearer " + receptionistToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].bookingCode").value("BK-ALPHA-01"));
    }
}
