package org.example.backend.chat;

import org.example.backend.chat.draft.BookingDraftManager;
import org.example.backend.chat.dto.tools.BookingDraftResponse;
import org.example.backend.chat.dto.tools.BookingQuoteResponse;
import org.example.backend.chat.dto.tools.RoomOptionItem;
import org.example.backend.chat.tools.ChatToolAdapterService;
import org.example.backend.chat.tools.ChatToolDispatcher;
import org.example.backend.chat.tools.ChatToolNames;
import org.example.backend.chat.tools.ToolCallResult;
import org.example.backend.room.dto.RoomTypeAvailabilityResponse;
import org.example.backend.room.entity.RoomType;
import org.example.backend.room.repository.RoomTypeRepository;
import org.example.backend.room.service.RoomService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

/**
 * Kiểm thử bảo mật và thực thi ChatToolDispatcher theo task [SP2-CHAT-TOOLS-01]:
 * - Kiểm tra danh sách Allowlist (chỉ 4 tool an toàn).
 * - Chặn đứng các tool nguy hiểm (confirmBooking, pay, cancel, delete, sql...).
 * - Kiểm tra validate tham số (ngày quá khứ, checkOut <= checkIn, sức chứa vượt mức).
 * - Kiểm tra prepareBooking yêu cầu đăng nhập và lấy email từ SecurityContext.
 */
@ExtendWith(MockitoExtension.class)
class ChatToolDispatcherTest {

    @Mock
    private RoomService roomService;

    @Mock
    private RoomTypeRepository roomTypeRepository;

    private BookingDraftManager bookingDraftManager;
    private ChatToolAdapterService adapterService;
    private ChatToolDispatcher dispatcher;

    @BeforeEach
    void setUp() {
        bookingDraftManager = new BookingDraftManager();
        adapterService = new ChatToolAdapterService(roomService, roomTypeRepository, bookingDraftManager);
        dispatcher = new ChatToolDispatcher(adapterService);
    }

    // ────────────────────────────────────────────────────────────────
    // BẢO MẬT: ALLOWLIST & TOOL NGUY HIỂM
    // ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Bảo mật Allowlist: Từ chối ngay lập tức các tool nguy hiểm (confirmBooking, pay, cancel, sql)")
    void testDispatch_DisallowsUnauthorizedTools() {
        Authentication auth = new UsernamePasswordAuthenticationToken("user@example.com", null, List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")));

        // Thử gọi confirmBooking từ model
        ToolCallResult r1 = dispatcher.dispatch("confirmBooking", Map.of("bookingId", 123), auth, "sess-1");
        assertThat(r1.isSuccess()).isFalse();
        assertThat(r1.getErrorMessage()).contains("không được phép gọi");

        // Thử gọi thanh toán
        ToolCallResult r2 = dispatcher.dispatch("processPayment", Map.of("amount", 1000000), auth, "sess-1");
        assertThat(r2.isSuccess()).isFalse();
        assertThat(r2.getErrorMessage()).contains("không được phép gọi");

        // Thử gọi chạy SQL
        ToolCallResult r3 = dispatcher.dispatch("executeSql", Map.of("query", "DROP TABLE users"), auth, "sess-1");
        assertThat(r3.isSuccess()).isFalse();
        assertThat(r3.getErrorMessage()).contains("không được phép gọi");

        // Thử gọi null hoặc rỗng
        ToolCallResult r4 = dispatcher.dispatch("", Map.of(), auth, "sess-1");
        assertThat(r4.isSuccess()).isFalse();
    }

    // ────────────────────────────────────────────────────────────────
    // TOOL 1: searchAvailableRooms
    // ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Tool searchAvailableRooms: Thiếu ngày nhận/trả phòng → Báo lỗi rõ ràng")
    void testSearchRooms_MissingDates_ReturnsError() {
        ToolCallResult result = dispatcher.dispatch(ChatToolNames.SEARCH_AVAILABLE_ROOMS,
                Map.of("guests", 2), null, "sess-1");

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getErrorMessage()).contains("Vui lòng cung cấp đầy đủ ngày nhận phòng");
    }

    @Test
    @DisplayName("Tool searchAvailableRooms: Ngày nhận phòng trong quá khứ → Báo lỗi rõ ràng")
    void testSearchRooms_PastDate_ReturnsError() {
        LocalDate pastDate = LocalDate.now().minusDays(2);
        LocalDate checkOut = LocalDate.now().plusDays(1);

        ToolCallResult result = dispatcher.dispatch(ChatToolNames.SEARCH_AVAILABLE_ROOMS,
                Map.of("checkIn", pastDate.toString(), "checkOut", checkOut.toString(), "guests", 2), null, "sess-1");

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getErrorMessage()).contains("quá khứ");
    }

    @Test
    @DisplayName("Tool searchAvailableRooms: Ngày trả phòng trước hoặc bằng ngày nhận phòng → Báo lỗi rõ ràng")
    void testSearchRooms_CheckOutBeforeCheckIn_ReturnsError() {
        LocalDate checkIn = LocalDate.now().plusDays(5);
        LocalDate checkOut = LocalDate.now().plusDays(4);

        ToolCallResult result = dispatcher.dispatch(ChatToolNames.SEARCH_AVAILABLE_ROOMS,
                Map.of("checkIn", checkIn.toString(), "checkOut", checkOut.toString()), null, "sess-1");

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getErrorMessage()).contains("phải sau ngày nhận phòng");
    }

    @Test
    @DisplayName("Tool searchAvailableRooms: Thành công → Trả cardType ROOM_OPTIONS và danh sách phòng")
    void testSearchRooms_Success() {
        LocalDate checkIn = LocalDate.now().plusDays(2);
        LocalDate checkOut = LocalDate.now().plusDays(4);

        RoomTypeAvailabilityResponse room = RoomTypeAvailabilityResponse.builder()
                .roomTypeId(2L)
                .name("Deluxe Double Room")
                .description("Phòng view biển Mỹ Khê")
                .capacity(2)
                .basePrice(new BigDecimal("950000"))
                .availableRooms(5)
                .amenities(List.of("Wifi", "Smart TV", "Ban công"))
                .build();

        when(roomService.searchAvailableRoomTypes(eq(checkIn), eq(checkOut), eq(2), eq(1)))
                .thenReturn(List.of(room));

        ToolCallResult result = dispatcher.dispatch(ChatToolNames.SEARCH_AVAILABLE_ROOMS,
                Map.of("checkIn", checkIn.toString(), "checkOut", checkOut.toString(), "guests", 2), null, "sess-1");

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getCardType()).isEqualTo("ROOM_OPTIONS");
        assertThat(result.getCardData()).asList().hasSize(1);
        RoomOptionItem item = (RoomOptionItem) ((List<?>) result.getCardData()).get(0);
        assertThat(item.getName()).isEqualTo("Deluxe Double Room");
        assertThat(item.getAvailableRooms()).isEqualTo(5);
        assertThat(result.getSummaryMessage()).contains("Deluxe Double Room");
    }

    // ────────────────────────────────────────────────────────────────
    // TOOL 2: getRoomTypeDetails
    // ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Tool getRoomTypeDetails: Lấy thành công chi tiết loại phòng công khai")
    void testGetRoomTypeDetails_Success() {
        RoomTypeAvailabilityResponse detail = RoomTypeAvailabilityResponse.builder()
                .roomTypeId(1L)
                .name("Standard Single Room")
                .description("Phòng đơn tiện nghi")
                .capacity(1)
                .basePrice(new BigDecimal("500000"))
                .availableRooms(3)
                .amenities(List.of("Wifi", "Điều hòa"))
                .build();

        when(roomService.getRoomTypeById(1L)).thenReturn(detail);

        ToolCallResult result = dispatcher.dispatch(ChatToolNames.GET_ROOM_TYPE_DETAILS,
                Map.of("roomTypeId", 1), null, "sess-1");

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getCardType()).isEqualTo("ROOM_OPTIONS");
        assertThat(result.getSummaryMessage()).contains("Standard Single Room");
        assertThat(result.getSummaryMessage()).contains("500000");
    }

    // ────────────────────────────────────────────────────────────────
    // TOOL 3: getBookingQuote
    // ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Tool getBookingQuote: Tính đúng số đêm, tổng tiền và cọc 50%, hạn 15 phút")
    void testGetBookingQuote_Success() {
        LocalDate checkIn = LocalDate.now().plusDays(3);
        LocalDate checkOut = LocalDate.now().plusDays(5); // 2 đêm

        RoomType roomType = RoomType.builder()
                .id(2L)
                .name("Deluxe Double Room")
                .capacity(2)
                .basePrice(new BigDecimal("1000000"))
                .isActive(true)
                .build();

        when(roomTypeRepository.findById(2L)).thenReturn(Optional.of(roomType));
        when(roomService.searchAvailableRoomTypes(eq(checkIn), eq(checkOut), eq(2), eq(1)))
                .thenReturn(List.of(RoomTypeAvailabilityResponse.builder()
                        .roomTypeId(2L)
                        .availableRooms(4)
                        .build()));

        ToolCallResult result = dispatcher.dispatch(ChatToolNames.GET_BOOKING_QUOTE,
                Map.of("roomTypeId", 2, "checkIn", checkIn.toString(), "checkOut", checkOut.toString(), "guests", 2, "quantity", 1),
                null, "sess-1");

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getCardType()).isEqualTo("BOOKING_QUOTE");
        BookingQuoteResponse quoteDto = (BookingQuoteResponse) result.getCardData();
        assertThat(quoteDto.getQuoteId()).startsWith("quote-");
        assertThat(quoteDto.getNights()).isEqualTo(2);
        assertThat(quoteDto.getTotalPrice()).isEqualByComparingTo(new BigDecimal("2000000"));
        assertThat(quoteDto.getDepositAmount()).isEqualByComparingTo(new BigDecimal("1000000")); // Cọc 50%
        assertThat(quoteDto.getNote()).contains("15 phút");
    }

    @Test
    @DisplayName("Tool getBookingQuote: Số khách vượt quá sức chứa phòng → Báo lỗi rõ ràng")
    void testGetBookingQuote_GuestExceedsCapacity_ReturnsError() {
        LocalDate checkIn = LocalDate.now().plusDays(1);
        LocalDate checkOut = LocalDate.now().plusDays(2);

        RoomType roomType = RoomType.builder()
                .id(1L)
                .name("Standard Single")
                .capacity(1) // Tối đa 1 người
                .basePrice(new BigDecimal("500000"))
                .isActive(true)
                .build();

        when(roomTypeRepository.findById(1L)).thenReturn(Optional.of(roomType));

        ToolCallResult result = dispatcher.dispatch(ChatToolNames.GET_BOOKING_QUOTE,
                Map.of("roomTypeId", 1, "checkIn", checkIn.toString(), "checkOut", checkOut.toString(), "guests", 4, "quantity", 1),
                null, "sess-1");

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getErrorMessage()).contains("vượt quá sức chứa");
    }

    // ────────────────────────────────────────────────────────────────
    // TOOL 4: prepareBooking
    // ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Tool prepareBooking: Người dùng chưa đăng nhập → Trả về LOGIN_REQUIRED, không tạo draft")
    void testPrepareBooking_Unauthenticated_ReturnsLoginRequired() {
        ToolCallResult result = dispatcher.dispatch(ChatToolNames.PREPARE_BOOKING,
                Map.of("quoteId", "quote-12345"), null, "sess-1");

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getCardType()).isEqualTo("LOGIN_REQUIRED");
        assertThat(result.getSummaryMessage()).contains("Đăng nhập");
    }

    @Test
    @DisplayName("Tool prepareBooking: Đã đăng nhập nhưng quoteId hết hạn/không tồn tại → Báo lỗi rõ ràng")
    void testPrepareBooking_ExpiredQuote_ReturnsError() {
        Authentication auth = new UsernamePasswordAuthenticationToken("customer@example.com", null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")));

        ToolCallResult result = dispatcher.dispatch(ChatToolNames.PREPARE_BOOKING,
                Map.of("quoteId", "quote-invalid"), auth, "sess-1");

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getErrorMessage()).contains("hết hiệu lực");
    }

    @Test
    @DisplayName("Tool prepareBooking: Đã đăng nhập và quoteId hợp lệ → Tạo bản nháp BookingDraft gắn với userEmail")
    void testPrepareBooking_Success() {
        Authentication auth = new UsernamePasswordAuthenticationToken("thanh@example.com", null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")));

        LocalDate checkIn = LocalDate.now().plusDays(2);
        LocalDate checkOut = LocalDate.now().plusDays(4);

        // Tạo quote trước
        RoomType roomType = RoomType.builder()
                .id(2L)
                .name("Deluxe Double")
                .capacity(2)
                .basePrice(new BigDecimal("950000"))
                .isActive(true)
                .build();
        when(roomTypeRepository.findById(2L)).thenReturn(Optional.of(roomType));
        when(roomService.searchAvailableRoomTypes(any(), any(), anyInt(), anyInt()))
                .thenReturn(List.of(RoomTypeAvailabilityResponse.builder().roomTypeId(2L).availableRooms(5).build()));

        ToolCallResult quoteRes = dispatcher.dispatch(ChatToolNames.GET_BOOKING_QUOTE,
                Map.of("roomTypeId", 2, "checkIn", checkIn.toString(), "checkOut", checkOut.toString(), "guests", 2, "quantity", 1),
                null, "sess-1");
        String quoteId = ((BookingQuoteResponse) quoteRes.getCardData()).getQuoteId();

        // Chuẩn bị draft
        ToolCallResult draftRes = dispatcher.dispatch(ChatToolNames.PREPARE_BOOKING,
                Map.of("quoteId", quoteId, "specialRequests", "Tầng cao view biển"), auth, "sess-1");

        assertThat(draftRes.isSuccess()).isTrue();
        assertThat(draftRes.getCardType()).isEqualTo("BOOKING_DRAFT");
        BookingDraftResponse draft = (BookingDraftResponse) draftRes.getCardData();
        assertThat(draft.getDraftId()).startsWith("draft-");
        assertThat(draft.getUserEmail()).isEqualTo("thanh@example.com");
        assertThat(draft.getSpecialRequests()).isEqualTo("Tầng cao view biển");
        assertThat(draftRes.getSummaryMessage()).contains("Đã chuẩn bị bản nháp đặt phòng");
        assertThat(draftRes.getSummaryMessage()).contains("Xác nhận đặt phòng");
    }

    // ────────────────────────────────────────────────────────────────
    // TOOL 5: getAllRoomTypes
    // ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Tool getAllRoomTypes: Truy vấn danh mục tất cả hạng phòng đang mở bán từ DB")
    void testGetAllRoomTypes_Success() {
        RoomTypeAvailabilityResponse r1 = RoomTypeAvailabilityResponse.builder()
                .roomTypeId(1L)
                .name("Standard Single")
                .description("Phòng đơn")
                .capacity(1)
                .basePrice(new BigDecimal("500000"))
                .amenities(List.of("WiFi", "Máy lạnh"))
                .availableRooms(1)
                .build();
        RoomTypeAvailabilityResponse r2 = RoomTypeAvailabilityResponse.builder()
                .roomTypeId(2L)
                .name("Deluxe Double")
                .description("Phòng đôi")
                .capacity(2)
                .basePrice(new BigDecimal("950000"))
                .amenities(List.of("WiFi", "Ban công"))
                .availableRooms(1)
                .build();

        when(roomService.getAllActiveRoomTypes()).thenReturn(List.of(r1, r2));

        ToolCallResult result = dispatcher.dispatch(ChatToolNames.GET_ALL_ROOM_TYPES, Map.of(), null, "sess-1");

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getCardType()).isEqualTo("ROOM_OPTIONS");
        assertThat(result.getSummaryMessage()).contains("Standard Single");
        assertThat(result.getSummaryMessage()).contains("Deluxe Double");
        assertThat(result.getSummaryMessage()).contains("2 hạng phòng");
        List<?> items = (List<?>) result.getCardData();
        assertThat(items).hasSize(2);
    }
}

