package org.example.backend.room;

import org.example.backend.auth.security.JwtProvider;
import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingRoom;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.booking.repository.BookingRoomRepository;
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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * MockMvc Integration Test cho REST API /api/v1/rooms/timeline (SRS §FR-13.4, §11.7, §11.8):
 * - Kiểm thử xác thực và phân quyền RBAC (ADMIN, RECEPTIONIST, CUSTOMER, Anonymous)
 * - Kiểm thử validation ràng buộc ngày (endDate >= startDate, tối đa 31 ngày)
 * - Kiểm thử dữ liệu JSON metadata (bookingCode, customerName, customerPhone, paidAmount, totalPrice)
 */
@SpringBootTest
@AutoConfigureMockMvc
class RoomTimelineIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtProvider jwtProvider;

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

    private String adminToken;
    private String receptionistToken;
    private String customerToken;

    private RoomType deluxeType;
    private Room room101;
    private Room room102;
    private User customer;

    @BeforeEach
    void setUp() {
        paymentTransactionRepository.deleteAll();
        bookingRoomRepository.deleteAll();
        bookingRepository.deleteAll();
        roomRepository.deleteAll();
        roomTypeRepository.deleteAll();
        userRepository.deleteAll();

        // 1. Tạo các tài khoản tương ứng 3 vai trò trong hệ thống
        User admin = userRepository.save(User.builder()
                .email("admin_it@hotel.com")
                .password("hash")
                .fullName("Quản Trị Viên IT")
                .phone("0901000001")
                .role(Role.ROLE_ADMIN)
                .build());

        User receptionist = userRepository.save(User.builder()
                .email("receptionist_it@hotel.com")
                .password("hash")
                .fullName("Lễ Tân IT")
                .phone("0901000002")
                .role(Role.ROLE_RECEPTIONIST)
                .build());

        customer = userRepository.save(User.builder()
                .email("customer_it@gmail.com")
                .password("hash")
                .fullName("Nguyễn Văn Khách IT")
                .phone("0988112233")
                .role(Role.ROLE_CUSTOMER)
                .build());

        // Sinh Bearer JWT tokens
        adminToken = jwtProvider.generateAccessToken(admin);
        receptionistToken = jwtProvider.generateAccessToken(receptionist);
        customerToken = jwtProvider.generateAccessToken(customer);

        // 2. Tạo Loại phòng & Phòng vật lý
        deluxeType = roomTypeRepository.save(RoomType.builder()
                .name("Deluxe Room")
                .description("Phòng Deluxe cao cấp")
                .capacity(2)
                .basePrice(new BigDecimal("1200000.00"))
                .isActive(true)
                .build());

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
                .status(RoomStatus.MAINTENANCE)
                .build());
    }

    @Test
    @DisplayName("IT01 - Gọi API với quyền RECEPTIONIST thành công trả về 200 OK (SRS §11.7)")
    void testTimeline_Success_AsReceptionist_Returns200() throws Exception {
        mockMvc.perform(get("/api/v1/rooms/timeline")
                        .header("Authorization", "Bearer " + receptionistToken)
                        .param("startDate", "2026-11-01")
                        .param("endDate", "2026-11-07")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].roomNumber").value("101"))
                .andExpect(jsonPath("$.data[0].dailyStatuses", hasSize(7)));
    }

    @Test
    @DisplayName("IT02 - Gọi API với quyền ADMIN thành công trả về 200 OK (SRS §11.7)")
    void testTimeline_Success_AsAdmin_Returns200() throws Exception {
        mockMvc.perform(get("/api/v1/rooms/timeline")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("startDate", "2026-11-01")
                        .param("endDate", "2026-11-05")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(2)));
    }

    @Test
    @DisplayName("IT03 - Gọi API với quyền CUSTOMER bị chặn và trả về 403 Forbidden (SRS §11.7)")
    void testTimeline_Forbidden_AsCustomer_Returns403() throws Exception {
        mockMvc.perform(get("/api/v1/rooms/timeline")
                        .header("Authorization", "Bearer " + customerToken)
                        .param("startDate", "2026-11-01")
                        .param("endDate", "2026-11-07")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("IT04 - Gọi API không có Token xác thực bị trả về 401 Unauthorized (SRS §11.7)")
    void testTimeline_Unauthorized_NoToken_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/rooms/timeline")
                        .param("startDate", "2026-11-01")
                        .param("endDate", "2026-11-07")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("IT05 - Validate startDate > endDate (nghịch lý thời gian) trả về 400 Bad Request")
    void testTimeline_BadRequest_StartDateAfterEndDate_Returns400() throws Exception {
        mockMvc.perform(get("/api/v1/rooms/timeline")
                        .header("Authorization", "Bearer " + receptionistToken)
                        .param("startDate", "2026-11-10")
                        .param("endDate", "2026-11-05")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Ngày kết thúc không được trước ngày bắt đầu")));
    }

    @Test
    @DisplayName("IT06 - Validate khoảng ngày vượt quá giới hạn 31 ngày trả về 400 Bad Request")
    void testTimeline_BadRequest_Exceeds31Days_Returns400() throws Exception {
        mockMvc.perform(get("/api/v1/rooms/timeline")
                        .header("Authorization", "Bearer " + receptionistToken)
                        .param("startDate", "2026-11-01")
                        .param("endDate", "2026-12-15")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("tối đa 31 ngày")));
    }

    @Test
    @DisplayName("IT07 - Kiểm tra tính toàn vẹn của JSON Metadata: bookingCode, tên khách, SĐT, tiền đã trả (SRS §FR-13.3)")
    void testTimeline_VerifyMetadata_InJsonResponse() throws Exception {
        // Tạo booking CONFIRMED đã cọc 50%
        Booking booking = bookingRepository.save(Booking.builder()
                .bookingCode("BK-META-999")
                .user(customer)
                .roomType(deluxeType)
                .quantity(1)
                .guests(2)
                .paymentMethod(PaymentMethod.VNPAY)
                .checkInDate(LocalDate.of(2026, 11, 2))
                .checkOutDate(LocalDate.of(2026, 11, 5))
                .pricePerNight(new BigDecimal("1200000.00"))
                .totalPrice(new BigDecimal("3600000.00"))
                .depositAmount(new BigDecimal("1800000.00"))
                .bookingStatus(BookingStatus.CONFIRMED)
                .paymentStatus(PaymentStatus.PARTIALLY_PAID)
                .build());

        bookingRoomRepository.save(BookingRoom.builder()
                .booking(booking)
                .room(room101)
                .assignedAt(LocalDateTime.now())
                .build());

        mockMvc.perform(get("/api/v1/rooms/timeline")
                        .header("Authorization", "Bearer " + receptionistToken)
                        .param("startDate", "2026-11-01")
                        .param("endDate", "2026-11-05")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].roomNumber").value("101"))
                // Ngày 2026-11-01: AVAILABLE
                .andExpect(jsonPath("$.data[0].dailyStatuses[0].date").value("2026-11-01"))
                .andExpect(jsonPath("$.data[0].dailyStatuses[0].status").value("AVAILABLE"))
                // Ngày 2026-11-02: CONFIRMED kèm đầy đủ Metadata
                .andExpect(jsonPath("$.data[0].dailyStatuses[1].date").value("2026-11-02"))
                .andExpect(jsonPath("$.data[0].dailyStatuses[1].status").value("CONFIRMED"))
                .andExpect(jsonPath("$.data[0].dailyStatuses[1].bookingCode").value("BK-META-999"))
                .andExpect(jsonPath("$.data[0].dailyStatuses[1].customerName").value("Nguyễn Văn Khách IT"))
                .andExpect(jsonPath("$.data[0].dailyStatuses[1].customerPhone").value("0988112233"))
                .andExpect(jsonPath("$.data[0].dailyStatuses[1].depositAmount").value(1800000.00))
                .andExpect(jsonPath("$.data[0].dailyStatuses[1].paidAmount").value(1800000.00))
                .andExpect(jsonPath("$.data[0].dailyStatuses[1].totalPrice").value(3600000.00))
                // Phòng 102: Toàn bộ ngày là MAINTENANCE
                .andExpect(jsonPath("$.data[1].roomNumber").value("102"))
                .andExpect(jsonPath("$.data[1].currentPhysicalStatus").value("MAINTENANCE"))
                .andExpect(jsonPath("$.data[1].dailyStatuses[0].status").value("MAINTENANCE"));
    }

    @Test
    @DisplayName("IT08 - Hỗ trợ alias endpoint /api/v1/receptionist/rooms/timeline hoạt động đồng nhất")
    void testTimeline_AliasEndpoint_Returns200() throws Exception {
        mockMvc.perform(get("/api/v1/receptionist/rooms/timeline")
                        .header("Authorization", "Bearer " + receptionistToken)
                        .param("startDate", "2026-11-01")
                        .param("endDate", "2026-11-03")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(2)));
    }
}
