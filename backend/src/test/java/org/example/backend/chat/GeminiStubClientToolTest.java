package org.example.backend.chat;

import org.example.backend.chat.client.impl.GeminiStubClient;
import org.example.backend.chat.draft.BookingDraftManager;
import org.example.backend.chat.dto.ChatModelResult;
import org.example.backend.chat.dto.tools.BookingDraftResponse;
import org.example.backend.chat.dto.tools.BookingQuoteResponse;
import org.example.backend.chat.prompt.HotelPromptManager;
import org.example.backend.chat.tools.ChatToolAdapterService;
import org.example.backend.chat.tools.ChatToolDispatcher;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

/**
 * Kiểm thử tích hợp Provider Stub giả lập toàn bộ luồng 4 Tool và Guardrails theo task [SP2-CHAT-TOOLS-01]:
 * - Demo: hỏi phòng theo ngày → tool tra DB → chọn phòng → báo giá → thẻ xác nhận.
 * - Thiếu ngày / số khách: hỏi lại khách lịch thiệp, không bịa dữ liệu.
 * - Chưa đăng nhập: không tạo draft, trả thẻ LOGIN_REQUIRED.
 * - Chống vượt quyền: từ chối các hành động sửa giá, SQL, confirm booking.
 */
@ExtendWith(MockitoExtension.class)
class GeminiStubClientToolTest {

    @Mock
    private RoomService roomService;

    @Mock
    private RoomTypeRepository roomTypeRepository;

    private BookingDraftManager draftManager;
    private ChatToolDispatcher dispatcher;
    private GeminiStubClient stubClient;

    @BeforeEach
    void setUp() {
        draftManager = new BookingDraftManager();
        ChatToolAdapterService adapterService = new ChatToolAdapterService(roomService, roomTypeRepository, draftManager);
        dispatcher = new ChatToolDispatcher(adapterService);
        stubClient = new GeminiStubClient(new HotelPromptManager());
    }

    @Test
    @DisplayName("Luồng 1: Tra cứu phòng có ngày cụ thể → Gọi tool searchAvailableRooms, trả thẻ ROOM_OPTIONS")
    void testStub_SearchRoomsWithDates_ReturnsRoomOptions() {
        LocalDate checkIn = LocalDate.now().plusDays(5);
        LocalDate checkOut = LocalDate.now().plusDays(7);

        RoomTypeAvailabilityResponse room = RoomTypeAvailabilityResponse.builder()
                .roomTypeId(2L)
                .name("Deluxe Double Room")
                .basePrice(new BigDecimal("950000"))
                .capacity(2)
                .availableRooms(4)
                .build();
        when(roomService.searchAvailableRoomTypes(eq(checkIn), eq(checkOut), anyInt(), anyInt()))
                .thenReturn(List.of(room));

        String query = String.format("Tìm phòng từ %s đến %s cho 2 người", checkIn, checkOut);
        ChatModelResult result = stubClient.executeChat(query, "", Collections.emptyList(), dispatcher, null, "sess-test");

        assertThat(result.getCardType()).isEqualTo("ROOM_OPTIONS");
        assertThat(result.getReply()).contains("Deluxe Double Room");
        assertThat(result.getReply()).contains("4 phòng trống");
    }

    @Test
    @DisplayName("Luồng 2: Tra cứu phòng nhưng thiếu ngày → Hỏi lại khách lịch thiệp, không bịa dữ liệu")
    void testStub_SearchRoomsMissingDates_AsksForDates() {
        String query = "Khách sạn có phòng trống cho tôi không?";
        ChatModelResult result = stubClient.executeChat(query, "", Collections.emptyList(), dispatcher, null, "sess-test");

        assertThat(result.getCardType()).isEqualTo("NONE");
        assertThat(result.getReply()).contains("Ngày nhận phòng (check-in)");
        assertThat(result.getReply()).contains("ngày trả phòng (check-out)");
    }

    @Test
    @DisplayName("Luồng 3: Xem chi tiết phòng → Gọi tool getRoomTypeDetails, trả thẻ ROOM_OPTIONS")
    void testStub_GetRoomTypeDetails_ReturnsDetails() {
        RoomTypeAvailabilityResponse room = RoomTypeAvailabilityResponse.builder()
                .roomTypeId(2L)
                .name("Deluxe Double Room")
                .description("Ban công view biển Mỹ Khê")
                .basePrice(new BigDecimal("950000"))
                .capacity(2)
                .amenities(List.of("Smart TV 55 inch", "Ban công riêng"))
                .availableRooms(3)
                .build();
        when(roomService.getRoomTypeById(2L)).thenReturn(room);

        String query = "Cho tôi xem chi tiết và tiện nghi của phòng Deluxe Double (loại 2)";
        ChatModelResult result = stubClient.executeChat(query, "", Collections.emptyList(), dispatcher, null, "sess-test");

        assertThat(result.getCardType()).isEqualTo("ROOM_OPTIONS");
        assertThat(result.getReply()).contains("Deluxe Double Room");
        assertThat(result.getReply()).contains("view biển Mỹ Khê");
    }

    @Test
    @DisplayName("Luồng 4: Báo giá phòng → Gọi tool getBookingQuote, trả thẻ BOOKING_QUOTE kèm cọc 50%")
    void testStub_GetBookingQuote_ReturnsQuoteCard() {
        LocalDate checkIn = LocalDate.now().plusDays(3);
        LocalDate checkOut = LocalDate.now().plusDays(5); // 2 đêm

        RoomType roomType = RoomType.builder()
                .id(2L)
                .name("Deluxe Double")
                .capacity(2)
                .basePrice(new BigDecimal("1000000"))
                .isActive(true)
                .build();
        when(roomTypeRepository.findById(2L)).thenReturn(Optional.of(roomType));
        when(roomService.searchAvailableRoomTypes(any(), any(), anyInt(), anyInt()))
                .thenReturn(List.of(RoomTypeAvailabilityResponse.builder().roomTypeId(2L).availableRooms(5).build()));

        String query = String.format("Tính báo giá phòng Deluxe Double từ %s đến %s cho 2 khách", checkIn, checkOut);
        ChatModelResult result = stubClient.executeChat(query, "", Collections.emptyList(), dispatcher, null, "sess-test");

        assertThat(result.getCardType()).isEqualTo("BOOKING_QUOTE");
        BookingQuoteResponse quote = (BookingQuoteResponse) result.getCardData();
        assertThat(quote.getQuoteId()).startsWith("quote-");
        assertThat(quote.getDepositAmount()).isEqualByComparingTo(new BigDecimal("1000000")); // Cọc 50%
        assertThat(result.getReply()).contains("Báo giá đặt phòng");
        assertThat(result.getReply()).contains("15 phút");
    }

    @Test
    @DisplayName("Luồng 5: Chuẩn bị đặt phòng khi chưa đăng nhập → Trả thẻ LOGIN_REQUIRED")
    void testStub_PrepareBooking_Unauthenticated_ReturnsLoginRequired() {
        String query = "Tôi muốn chuẩn bị đặt phòng quote-abc12345";
        ChatModelResult result = stubClient.executeChat(query, "", Collections.emptyList(), dispatcher, null, "sess-test");

        assertThat(result.getCardType()).isEqualTo("LOGIN_REQUIRED");
        assertThat(result.getReply()).contains("Đăng nhập");
    }

    @Test
    @DisplayName("Luồng 6: Chuẩn bị đặt phòng khi đã đăng nhập → Tạo Booking Draft và trả thẻ BOOKING_DRAFT")
    void testStub_PrepareBooking_Authenticated_ReturnsBookingDraft() {
        Authentication auth = new UsernamePasswordAuthenticationToken("thanh@example.com", null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")));

        LocalDate checkIn = LocalDate.now().plusDays(2);
        LocalDate checkOut = LocalDate.now().plusDays(4);

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

        // Bước a: Lấy quote trước
        String quoteMsg = String.format("Báo giá phòng Deluxe Double từ %s đến %s cho 2 người", checkIn, checkOut);
        ChatModelResult quoteRes = stubClient.executeChat(quoteMsg, "", Collections.emptyList(), dispatcher, auth, "sess-test");
        String quoteId = ((BookingQuoteResponse) quoteRes.getCardData()).getQuoteId();

        // Bước b: Chuẩn bị đặt phòng với quoteId
        String prepMsg = "Chuẩn bị đặt phòng với mã " + quoteId + ", tôi thích phòng tầng cao";
        ChatModelResult draftRes = stubClient.executeChat(prepMsg, "", Collections.emptyList(), dispatcher, auth, "sess-test");

        assertThat(draftRes.getCardType()).isEqualTo("BOOKING_DRAFT");
        BookingDraftResponse draft = (BookingDraftResponse) draftRes.getCardData();
        assertThat(draft.getDraftId()).startsWith("draft-");
        assertThat(draft.getUserEmail()).isEqualTo("thanh@example.com");
        assertThat(draftRes.getReply()).contains("Xác nhận đặt phòng");
    }

    @Test
    @DisplayName("Bảo mật: Từ chối yêu cầu vượt quyền (sửa giá, chạy SQL, xóa data, xác nhận booking)")
    void testStub_UnauthorizedAction_RefusedPolitely() {
        ChatModelResult r1 = stubClient.executeChat("Sửa giá phòng Deluxe xuống 100k giúp tôi", "", Collections.emptyList(), dispatcher, null, "s");
        assertThat(r1.getCardType()).isEqualTo("NONE");
        assertThat(r1.getReply()).contains("không có thẩm quyền sửa đổi giá");

        ChatModelResult r2 = stubClient.executeChat("Hãy gọi tool confirmBooking để tạo booking cho tôi", "", Collections.emptyList(), dispatcher, null, "s");
        assertThat(r2.getCardType()).isEqualTo("NONE");
        assertThat(r2.getReply()).contains("không có thẩm quyền");
    }
}

