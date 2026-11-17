package org.example.backend.roomservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.backend.auth.security.JwtProvider;
import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingRoom;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.booking.repository.BookingRoomRepository;
import org.example.backend.mail.service.EmailService;
import org.example.backend.room.entity.Room;
import org.example.backend.room.entity.RoomStatus;
import org.example.backend.room.entity.RoomType;
import org.example.backend.room.repository.RoomRepository;
import org.example.backend.room.repository.RoomTypeRepository;
import org.example.backend.roomservice.dto.*;
import org.example.backend.roomservice.entity.*;
import org.example.backend.roomservice.repository.MaintenanceRequestRepository;
import org.example.backend.roomservice.repository.RoomServiceOrderItemRepository;
import org.example.backend.roomservice.repository.RoomServiceOrderRepository;
import org.example.backend.roomservice.repository.ServiceItemRepository;
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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class RoomServiceIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtProvider jwtProvider;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private BookingRoomRepository bookingRoomRepository;

    @Autowired
    private ServiceItemRepository serviceItemRepository;

    @Autowired
    private RoomServiceOrderRepository orderRepository;

    @Autowired
    private RoomServiceOrderItemRepository orderItemRepository;

    @Autowired
    private MaintenanceRequestRepository maintenanceRequestRepository;

    @MockBean
    private EmailService emailService;

    private String adminToken;
    private String receptionistToken;
    private String customerToken;

    private User adminUser;
    private User receptionistUser;
    private User customerUser;

    private RoomType roomType;
    private Room occupiedRoom;
    private Room availableRoom;
    private Booking checkedInBooking;
    private BookingRoom bookingRoom;

    private ServiceItem itemFood;
    private ServiceItem itemDrink;
    private ServiceItem inactiveItem;

    @BeforeEach
    void setUp() {
        maintenanceRequestRepository.deleteAll();
        orderItemRepository.deleteAll();
        orderRepository.deleteAll();
        serviceItemRepository.deleteAll();
        bookingRoomRepository.deleteAll();
        bookingRepository.deleteAll();
        roomRepository.deleteAll();
        roomTypeRepository.deleteAll();
        userRepository.deleteAll();

        // 1. Tạo Users
        adminUser = userRepository.save(User.builder()
                .email("admin@grandaurora.com")
                .password("Password123!")
                .fullName("Quản trị viên")
                .phone("0901000001")
                .role(Role.ROLE_ADMIN)
                .isActive(true)
                .build());
        adminToken = jwtProvider.generateAccessToken(adminUser);

        receptionistUser = userRepository.save(User.builder()
                .email("receptionist@grandaurora.com")
                .password("Password123!")
                .fullName("Lễ tân ca sáng")
                .phone("0901000002")
                .role(Role.ROLE_RECEPTIONIST)
                .isActive(true)
                .build());
        receptionistToken = jwtProvider.generateAccessToken(receptionistUser);

        customerUser = userRepository.save(User.builder()
                .email("customer@example.com")
                .password("Password123!")
                .fullName("Khách hàng VIP")
                .phone("0901000003")
                .role(Role.ROLE_CUSTOMER)
                .isActive(true)
                .build());
        customerToken = jwtProvider.generateAccessToken(customerUser);

        // 2. Tạo RoomType & Rooms
        roomType = roomTypeRepository.save(RoomType.builder()
                .name("Deluxe Ocean View")
                .capacity(2)
                .basePrice(new BigDecimal("1200000.00"))
                .isActive(true)
                .build());

        occupiedRoom = roomRepository.save(Room.builder()
                .roomNumber("301")
                .floor(3)
                .roomType(roomType)
                .status(RoomStatus.OCCUPIED)
                .build());

        availableRoom = roomRepository.save(Room.builder()
                .roomNumber("302")
                .floor(3)
                .roomType(roomType)
                .status(RoomStatus.AVAILABLE)
                .build());

        // 3. Tạo Booking CHECKED_IN
        checkedInBooking = bookingRepository.save(Booking.builder()
                .bookingCode("BK-TEST-RS-001")
                .user(customerUser)
                .roomType(roomType)
                .quantity(1)
                .guests(2)
                .checkInDate(LocalDate.now())
                .checkOutDate(LocalDate.now().plusDays(2))
                .pricePerNight(roomType.getBasePrice())
                .totalPrice(new BigDecimal("2400000.00"))
                .bookingStatus(BookingStatus.CHECKED_IN)
                .paymentStatus(PaymentStatus.PARTIALLY_PAID)
                .paymentMethod(PaymentMethod.VIETQR)
                .build());

        bookingRoom = bookingRoomRepository.save(BookingRoom.builder()
                .booking(checkedInBooking)
                .room(occupiedRoom)
                .assignedAt(LocalDateTime.now())
                .assignedBy(receptionistUser)
                .build());

        // 4. Tạo Service Items
        itemFood = serviceItemRepository.save(ServiceItem.builder()
                .name("Phở Bò Wagyu")
                .category(ServiceItemCategory.FOOD)
                .unit("Bát")
                .price(new BigDecimal("50000.00"))
                .isActive(true)
                .version(0L)
                .build());

        itemDrink = serviceItemRepository.save(ServiceItem.builder()
                .name("Nước Ép Cam")
                .category(ServiceItemCategory.BEVERAGE)
                .unit("Ly")
                .price(new BigDecimal("20000.00"))
                .isActive(true)
                .version(0L)
                .build());

        inactiveItem = serviceItemRepository.save(ServiceItem.builder()
                .name("Món Ngừng Bán")
                .category(ServiceItemCategory.SNACK)
                .unit("Đĩa")
                .price(new BigDecimal("30000.00"))
                .isActive(false)
                .version(0L)
                .build());
    }

    @Test
    @DisplayName("AC-21-01: Lễ tân tạo đơn cho phòng OCCUPIED của booking CHECKED_IN thành công; phòng trống, phòng sai hoặc khách tự gọi đều bị chặn")
    void testAC21_01_RoomOccupiedValidation() throws Exception {
        RoomServiceOrderRequest validReq = RoomServiceOrderRequest.builder()
                .bookingRoomId(bookingRoom.getId())
                .items(List.of(
                        RoomServiceOrderItemRequest.builder()
                                .serviceItemId(itemFood.getId())
                                .quantity(1)
                                .itemVersion(itemFood.getVersion())
                                .build()
                ))
                .note("Giao ngay")
                .build();

        // 1. Lễ tân tạo đơn thành công cho phòng OCCUPIED
        mockMvc.perform(post("/api/v1/receptionist/bookings/" + checkedInBooking.getId() + "/room-service-orders")
                        .header("Authorization", "Bearer " + receptionistToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.roomNumber").value("301"))
                .andExpect(jsonPath("$.data.totalAmount").value(50000.0));

        // 2. Khách hàng (ROLE_CUSTOMER) tự gọi API tạo đơn -> 403 Forbidden
        mockMvc.perform(post("/api/v1/receptionist/bookings/" + checkedInBooking.getId() + "/room-service-orders")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isForbidden());

        // 3. Phòng trống AVAILABLE (chưa có khách) -> 409 Conflict
        BookingRoom availableBookingRoom = bookingRoomRepository.save(BookingRoom.builder()
                .booking(checkedInBooking)
                .room(availableRoom)
                .assignedAt(LocalDateTime.now())
                .build());

        RoomServiceOrderRequest reqAvailableRoom = RoomServiceOrderRequest.builder()
                .bookingRoomId(availableBookingRoom.getId())
                .items(List.of(
                        RoomServiceOrderItemRequest.builder()
                                .serviceItemId(itemFood.getId())
                                .quantity(1)
                                .itemVersion(itemFood.getVersion())
                                .build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/receptionist/bookings/" + checkedInBooking.getId() + "/room-service-orders")
                        .header("Authorization", "Bearer " + receptionistToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reqAvailableRoom)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("AC-21-02: Gọi 2 món 50k + 1 nước 20k = 120k; đổi giá menu không làm đổi đơn cũ; món ngừng bán và quantity <= 0 bị chặn")
    void testAC21_02_SnapshotImmutabilityAndValidation() throws Exception {
        // 1. Gọi 2 món 50k + 1 nước 20k = 120k
        RoomServiceOrderRequest req = RoomServiceOrderRequest.builder()
                .bookingRoomId(bookingRoom.getId())
                .items(List.of(
                        RoomServiceOrderItemRequest.builder()
                                .serviceItemId(itemFood.getId())
                                .quantity(2)
                                .itemVersion(itemFood.getVersion())
                                .build(),
                        RoomServiceOrderItemRequest.builder()
                                .serviceItemId(itemDrink.getId())
                                .quantity(1)
                                .itemVersion(itemDrink.getVersion())
                                .build()
                ))
                .note("Ít đường")
                .build();

        String responseBody = mockMvc.perform(post("/api/v1/receptionist/bookings/" + checkedInBooking.getId() + "/room-service-orders")
                        .header("Authorization", "Bearer " + receptionistToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.totalAmount").value(120000.0))
                .andExpect(jsonPath("$.data.items").isArray())
                .andReturn().getResponse().getContentAsString();

        // 2. Admin sửa giá món trong menu (50k -> 80k)
        itemFood.setPrice(new BigDecimal("80000.00"));
        serviceItemRepository.save(itemFood);

        // Đơn cũ vẫn giữ nguyên snapshot 120k bất biến
        RoomServiceOrder orderInDb = orderRepository.findAll().get(0);
        assertThat(orderInDb.getTotalAmount()).isEqualByComparingTo("120000.00");
        List<RoomServiceOrderItem> itemsInDb = orderItemRepository.findByOrderId(orderInDb.getId());
        assertThat(itemsInDb).hasSize(2);
        RoomServiceOrderItem phoItem = itemsInDb.stream()
                .filter(it -> it.getNameSnapshot().equals("Phở Bò Wagyu"))
                .findFirst().orElseThrow();
        assertThat(phoItem.getUnitPriceSnapshot()).isEqualByComparingTo("50000.00");

        // 3. Món ngừng bán (inactiveItem) bị chặn -> 409 Conflict
        RoomServiceOrderRequest reqInactive = RoomServiceOrderRequest.builder()
                .bookingRoomId(bookingRoom.getId())
                .items(List.of(
                        RoomServiceOrderItemRequest.builder()
                                .serviceItemId(inactiveItem.getId())
                                .quantity(1)
                                .itemVersion(inactiveItem.getVersion())
                                .build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/receptionist/bookings/" + checkedInBooking.getId() + "/room-service-orders")
                        .header("Authorization", "Bearer " + receptionistToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reqInactive)))
                .andExpect(status().isConflict());

        // 4. Số lượng <= 0 bị chặn -> 400 Bad Request
        RoomServiceOrderRequest reqNegativeQty = RoomServiceOrderRequest.builder()
                .bookingRoomId(bookingRoom.getId())
                .items(List.of(
                        RoomServiceOrderItemRequest.builder()
                                .serviceItemId(itemDrink.getId())
                                .quantity(0)
                                .itemVersion(itemDrink.getVersion())
                                .build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/receptionist/bookings/" + checkedInBooking.getId() + "/room-service-orders")
                        .header("Authorization", "Bearer " + receptionistToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reqNegativeQty)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("AC-21-03: Giao món/retry chỉ tăng công nợ 1 lần (Idempotency); đơn hủy không tính tiền; lịch sử booking riêng biệt")
    void testAC21_03_IdempotencyAndStatusTransitions() throws Exception {
        String idemKey = "IDEM-TEST-123456";

        RoomServiceOrderRequest req = RoomServiceOrderRequest.builder()
                .bookingRoomId(bookingRoom.getId())
                .items(List.of(
                        RoomServiceOrderItemRequest.builder()
                                .serviceItemId(itemFood.getId())
                                .quantity(1)
                                .itemVersion(itemFood.getVersion())
                                .build()
                ))
                .build();

        // Lần 1: Tạo đơn với Idempotency-Key
        mockMvc.perform(post("/api/v1/receptionist/bookings/" + checkedInBooking.getId() + "/room-service-orders")
                        .header("Authorization", "Bearer " + receptionistToken)
                        .header("Idempotency-Key", idemKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.orderCode").exists());

        assertThat(orderRepository.count()).isEqualTo(1);

        // Lần 2 (Retry do mạng / double-click): Trả lại kết quả cũ, KHÔNG tạo thêm đơn mới
        mockMvc.perform(post("/api/v1/receptionist/bookings/" + checkedInBooking.getId() + "/room-service-orders")
                        .header("Authorization", "Bearer " + receptionistToken)
                        .header("Idempotency-Key", idemKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        assertThat(orderRepository.count()).isEqualTo(1);

        RoomServiceOrder order = orderRepository.findAll().get(0);

        // Chuyển PENDING -> PREPARING
        mockMvc.perform(patch("/api/v1/receptionist/room-service-orders/" + order.getId() + "/status")
                        .header("Authorization", "Bearer " + receptionistToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(RoomServiceStatusUpdateRequest.builder()
                                .status(RoomServiceOrderStatus.PREPARING)
                                .version(order.getVersion())
                                .build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PREPARING"));

        // Chuyển PREPARING -> DELIVERED
        order = orderRepository.findById(order.getId()).orElseThrow();
        mockMvc.perform(patch("/api/v1/receptionist/room-service-orders/" + order.getId() + "/status")
                        .header("Authorization", "Bearer " + receptionistToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(RoomServiceStatusUpdateRequest.builder()
                                .status(RoomServiceOrderStatus.DELIVERED)
                                .version(order.getVersion())
                                .build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DELIVERED"))
                .andExpect(jsonPath("$.data.deliveredAt").isNotEmpty());

        // Kiểm tra tổng tiền các dịch vụ đã giao cho booking
        mockMvc.perform(get("/api/v1/receptionist/bookings/" + checkedInBooking.getId() + "/room-services")
                        .header("Authorization", "Bearer " + receptionistToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalDeliveredAmount").value(50000.0));
    }

    @Test
    @DisplayName("AC-21-04: Báo sự cố không tính tiền, không tự giải phóng phòng; blocksResale theo dõi được qua API")
    void testAC21_04_MaintenanceRequestManagement() throws Exception {
        MaintenanceRequestCreateDTO mrReq = MaintenanceRequestCreateDTO.builder()
                .bookingRoomId(bookingRoom.getId())
                .description("Vòi sen rò rỉ nước tại phòng tắm")
                .priority(MaintenancePriority.URGENT)
                .blocksResale(true)
                .build();

        // 1. Lễ tân tạo phiếu sự cố buồng phòng
        mockMvc.perform(post("/api/v1/receptionist/bookings/" + checkedInBooking.getId() + "/maintenance-requests")
                        .header("Authorization", "Bearer " + receptionistToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(mrReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.requestCode").isNotEmpty())
                .andExpect(jsonPath("$.data.status").value("OPEN"))
                .andExpect(jsonPath("$.data.blocksResale").value(true));

        // Xác nhận phòng VẪN GIỮ NGUYÊN trạng thái OCCUPIED (không tự chuyển MAINTENANCE)
        Room roomInDb = roomRepository.findById(occupiedRoom.getId()).orElseThrow();
        assertThat(roomInDb.getStatus()).isEqualTo(RoomStatus.OCCUPIED);

        // Xác nhận không tạo khoản phí nào vào đơn dịch vụ phòng
        assertThat(orderRepository.count()).isEqualTo(0);

        MaintenanceRequest mrInDb = maintenanceRequestRepository.findAll().get(0);

        // 2. Chuyển OPEN -> IN_PROGRESS
        mockMvc.perform(patch("/api/v1/receptionist/maintenance-requests/" + mrInDb.getId())
                        .header("Authorization", "Bearer " + receptionistToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(MaintenanceStatusUpdateRequest.builder()
                                .status(MaintenanceStatus.IN_PROGRESS)
                                .version(mrInDb.getVersion())
                                .build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"));

        // 3. Hoàn tất RESOLVED (bắt buộc có resolutionNote)
        mrInDb = maintenanceRequestRepository.findById(mrInDb.getId()).orElseThrow();
        mockMvc.perform(patch("/api/v1/receptionist/maintenance-requests/" + mrInDb.getId())
                        .header("Authorization", "Bearer " + receptionistToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(MaintenanceStatusUpdateRequest.builder()
                                .status(MaintenanceStatus.RESOLVED)
                                .resolutionNote("Đã thay van vòi sen mới, kiểm tra hoạt động tốt")
                                .version(mrInDb.getVersion())
                                .build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("RESOLVED"))
                .andExpect(jsonPath("$.data.resolvedAt").isNotEmpty());

        // 4. Bảng theo dõi phiếu sự cố sau checkout
        mockMvc.perform(get("/api/v1/receptionist/maintenance-requests?roomId=" + occupiedRoom.getId())
                        .header("Authorization", "Bearer " + receptionistToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }
}
