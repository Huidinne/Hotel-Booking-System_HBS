package org.example.backend.payment;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.backend.auth.security.JwtProvider;
import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.booking.repository.BookingRoomRepository;
import org.example.backend.mail.service.EmailService;
import org.example.backend.payment.dto.ConfirmRefundRequest;
import org.example.backend.payment.entity.PaymentTransaction;
import org.example.backend.payment.entity.TransactionStatus;
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
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiểm thử tích hợp nghiệp vụ Hoàn tiền cho Lễ tân theo SRS §2.4 & §11.5.
 */
@SpringBootTest
@AutoConfigureMockMvc
class PaymentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    @Autowired
    private BookingRoomRepository bookingRoomRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private JwtProvider jwtProvider;

    @MockBean
    private EmailService emailService;

    private User receptionistUser;
    private String receptionistToken;
    private Booking testBooking;
    private PaymentTransaction testTxn;

    @BeforeEach
    void setUp() {
        paymentTransactionRepository.deleteAll();
        bookingRoomRepository.deleteAll();
        bookingRepository.deleteAll();
        roomRepository.deleteAll();
        roomTypeRepository.deleteAll();
        userRepository.deleteAll();

        // 1. Tạo User Lễ tân
        receptionistUser = userRepository.save(User.builder()
                .email("recept_pay@hotel.com")
                .password("hash123")
                .fullName("Receptionist Pay")
                .phone("0901111111")
                .role(Role.ROLE_RECEPTIONIST)
                .build());
        receptionistToken = jwtProvider.generateAccessToken(receptionistUser);

        // 2. Tạo User Khách hàng
        User customerUser = userRepository.save(User.builder()
                .email("cust_pay@hotel.com")
                .password("hash123")
                .fullName("Customer Pay")
                .phone("0902222222")
                .role(Role.ROLE_CUSTOMER)
                .build());

        // 3. Tạo RoomType
        RoomType roomType = roomTypeRepository.save(RoomType.builder()
                .name("VIP Room Pay")
                .basePrice(BigDecimal.valueOf(2000000))
                .capacity(2)
                .description("VIP Room Description")
                .build());

        // 4. Tạo Booking cọc
        testBooking = bookingRepository.save(Booking.builder()
                .bookingCode("BK-PAY-001")
                .user(customerUser)
                .roomType(roomType)
                .quantity(1)
                .guests(2)
                .paymentMethod(PaymentMethod.VIETQR)
                .checkInDate(LocalDate.now().plusDays(2))
                .checkOutDate(LocalDate.now().plusDays(4))
                .pricePerNight(BigDecimal.valueOf(2000000))
                .totalPrice(BigDecimal.valueOf(4000000))
                .depositAmount(BigDecimal.valueOf(2000000))
                .bookingStatus(BookingStatus.PENDING)
                .paymentStatus(PaymentStatus.UNPAID)
                .holdExpiresAt(LocalDateTime.now().plusMinutes(15))
                .build());

        // 5. Tạo Transaction
        testTxn = paymentTransactionRepository.save(PaymentTransaction.builder()
                .booking(testBooking)
                .transactionCode("TXN-PAY-001")
                .amount(BigDecimal.valueOf(2000000))
                .paymentMethod(PaymentMethod.VIETQR)
                .status(TransactionStatus.PENDING)
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build());
    }

    @Test
    @DisplayName("Lễ tân xác nhận hoàn tiền (POST /receptionist/refunds/{id}/confirm) → REFUNDED")
    void testConfirmRefundSuccess() throws Exception {
        // Chuẩn bị booking REFUND_PENDING
        testBooking.setBookingStatus(BookingStatus.CANCELLED);
        testBooking.setPaymentStatus(PaymentStatus.REFUND_PENDING);
        testBooking.setRefundAmount(BigDecimal.valueOf(1000000));
        testBooking.setBankAccountNumber("0071001234567");
        testBooking.setBankName("VCB");
        testBooking.setBankAccountHolder("NGUYEN VAN A");
        bookingRepository.save(testBooking);

        ConfirmRefundRequest request = ConfirmRefundRequest.builder()
                .referenceNote("Đã chuyển khoản qua app VCB mã FT123456")
                .build();

        mockMvc.perform(post("/api/v1/receptionist/refunds/" + testBooking.getId() + "/confirm")
                        .header("Authorization", "Bearer " + receptionistToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.paymentStatus").value("REFUNDED"))
                .andExpect(jsonPath("$.data.accountNumberMasked").value("**** **** 4567"));

        Booking updated = bookingRepository.findById(testBooking.getId()).orElseThrow();
        assertEquals(PaymentStatus.REFUNDED, updated.getPaymentStatus());
    }
}
