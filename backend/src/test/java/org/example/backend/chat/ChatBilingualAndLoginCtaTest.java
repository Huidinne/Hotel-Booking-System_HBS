package org.example.backend.chat;

import org.example.backend.chat.client.impl.GeminiStubClient;
import org.example.backend.chat.draft.BookingDraftManager;
import org.example.backend.chat.dto.ChatRequest;
import org.example.backend.chat.dto.ChatResponse;
import org.example.backend.chat.prompt.HotelPromptManager;
import org.example.backend.chat.limiter.ChatRateLimiter;
import org.example.backend.chat.service.impl.ChatServiceImpl;
import org.example.backend.chat.session.ChatSessionManager;
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
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

/**
 * Kiểm thử tính năng Góc độ 2 (CTA Đăng nhập ngay) và Góc độ 3 (Song ngữ Anh - Việt / Bilingual Concierge).
 */
@ExtendWith(MockitoExtension.class)
class ChatBilingualAndLoginCtaTest {

    @Mock
    private RoomService roomService;

    @Mock
    private RoomTypeRepository roomTypeRepository;

    private ChatServiceImpl chatService;
    private Authentication anonymousAuth;

    @BeforeEach
    void setUp() {
        HotelPromptManager promptManager = new HotelPromptManager(new DefaultResourceLoader());
        BookingDraftManager draftManager = new BookingDraftManager();
        ChatToolAdapterService adapterService = new ChatToolAdapterService(roomService, roomTypeRepository, draftManager);
        ChatToolDispatcher toolDispatcher = new ChatToolDispatcher(adapterService);
        GeminiStubClient stubClient = new GeminiStubClient(promptManager);
        ChatSessionManager sessionManager = new ChatSessionManager();
        ChatRateLimiter rateLimiter = new ChatRateLimiter();

        chatService = new ChatServiceImpl(
                stubClient,
                stubClient,
                promptManager,
                sessionManager,
                toolDispatcher,
                rateLimiter
        );

        anonymousAuth = new AnonymousAuthenticationToken(
                "key", "anonymousUser", List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))
        );
    }

    // ────────────────────────────────────────────────────────────────
    // GÓC ĐỘ 2: CTA ĐĂNG NHẬP NGAY KHI CHƯA ĐĂNG NHẬP
    // ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Góc độ 2 (Tiếng Việt): Chuẩn bị đặt phòng khi chưa đăng nhập → Trả thẻ LOGIN_REQUIRED kèm CTA Đăng nhập ngay /login")
    void testPrepareBooking_Unauthenticated_Vietnamese_ReturnsLoginCta() {
        ChatRequest request = ChatRequest.builder()
                .message("Chuẩn bị đặt phòng với mã quote-123456")
                .sessionId("sess-login-vi")
                .build();

        ChatResponse response = chatService.processMessage(request, anonymousAuth);

        assertThat(response.getCardType()).isEqualTo("LOGIN_REQUIRED");
        assertThat(response.getReply()).contains("Đăng nhập");
        assertThat(response.getCta()).isNotNull();
        assertThat(response.getCta().getUrl()).isEqualTo("/login");
        assertThat(response.getCta().getLabel()).isEqualTo("Đăng nhập ngay");
    }

    @Test
    @DisplayName("Góc độ 2 (Tiếng Anh): Chuẩn bị đặt phòng bằng tiếng Anh khi chưa đăng nhập → Trả CTA 'Log in now' /login")
    void testPrepareBooking_Unauthenticated_English_ReturnsEnglishLoginCta() {
        ChatRequest request = ChatRequest.builder()
                .message("Please prepare booking with quote-123456")
                .sessionId("sess-login-en")
                .build();

        ChatResponse response = chatService.processMessage(request, anonymousAuth);

        assertThat(response.getCardType()).isEqualTo("LOGIN_REQUIRED");
        assertThat(response.getReply()).contains("log in");
        assertThat(response.getCta()).isNotNull();
        assertThat(response.getCta().getUrl()).isEqualTo("/login");
        assertThat(response.getCta().getLabel()).isEqualTo("Log in now");
    }

    // ────────────────────────────────────────────────────────────────
    // GÓC ĐỘ 3: HỖ TRỢ SONG NGỮ ANH - VIỆT (BILINGUAL CONCIERGE)
    // ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Góc độ 3: Khách hỏi danh mục phòng bằng tiếng Anh → Phản hồi 100% tiếng Anh chuẩn mực kèm CTA View Room Catalog")
    void testEnglish_RoomTypesInquiry_ReturnsEnglishResponseAndCta() {
        RoomType rt1 = RoomType.builder().id(1L).name("Standard Single Room").basePrice(new BigDecimal("500000")).capacity(1).isActive(true).build();
        RoomType rt2 = RoomType.builder().id(2L).name("Deluxe Double Room").basePrice(new BigDecimal("950000")).capacity(2).isActive(true).build();
        RoomType rt3 = RoomType.builder().id(3L).name("Executive Suite Luxury").basePrice(new BigDecimal("1800000")).capacity(4).isActive(true).build();

        when(roomService.getAllActiveRoomTypes()).thenReturn(List.of(
                RoomTypeAvailabilityResponse.builder().roomTypeId(1L).name(rt1.getName()).basePrice(rt1.getBasePrice()).capacity(1).build(),
                RoomTypeAvailabilityResponse.builder().roomTypeId(2L).name(rt2.getName()).basePrice(rt2.getBasePrice()).capacity(2).build(),
                RoomTypeAvailabilityResponse.builder().roomTypeId(3L).name(rt3.getName()).basePrice(rt3.getBasePrice()).capacity(4).build()
        ));

        ChatRequest request = ChatRequest.builder()
                .message("What room types do you have at the hotel?")
                .sessionId("sess-en-rooms")
                .build();

        ChatResponse response = chatService.processMessage(request, null);

        assertThat(response.getCardType()).isEqualTo("ROOM_OPTIONS");
        assertThat(response.getReply()).contains("Grand Aurora Luxury Hotel");
        assertThat(response.getReply()).contains("Standard Single Room");
        assertThat(response.getReply()).contains("Deluxe Double Room");
        assertThat(response.getReply()).contains("Executive Suite Luxury");
        assertThat(response.getReply()).contains("VND / night");
        assertThat(response.getCta()).isNotNull();
        assertThat(response.getCta().getLabel()).isEqualTo("View Room Catalog");
        assertThat(response.getCta().getUrl()).isEqualTo("/rooms");
    }

    @Test
    @DisplayName("Góc độ 3: Khách hỏi giờ check-in / check-out bằng tiếng Anh → Phản hồi thông tin 14:00 và 12:00 bằng tiếng Anh")
    void testEnglish_CheckInCheckOut_ReturnsEnglishInformation() {
        ChatRequest request = ChatRequest.builder()
                .message("What are the check-in and check-out times?")
                .sessionId("sess-en-checkin")
                .build();

        ChatResponse response = chatService.processMessage(request, null);

        assertThat(response.getReply()).contains("14:00");
        assertThat(response.getReply()).contains("12:00");
        assertThat(response.getReply()).contains("Grand Aurora Luxury Hotel");
        assertThat(response.getReply()).contains("luggage storage");
    }

    @Test
    @DisplayName("Góc độ 3: Khách hỏi chính sách cọc & hủy bằng tiếng Anh → Phản hồi quy định 50% VietQR và mốc 14:00 bằng tiếng Anh")
    void testEnglish_CancellationPolicy_ReturnsEnglishPolicy() {
        ChatRequest request = ChatRequest.builder()
                .message("What is your cancellation and deposit policy?")
                .sessionId("sess-en-policy")
                .build();

        ChatResponse response = chatService.processMessage(request, null);

        assertThat(response.getReply()).contains("50%");
        assertThat(response.getReply()).contains("VietQR");
        assertThat(response.getReply()).contains("14:00");
        assertThat(response.getReply()).contains("Free cancellation");
    }

    @Test
    @DisplayName("Góc độ 3: Khách hỏi tính báo giá bằng tiếng Anh → Trả báo giá chi tiết và CTA View Room Catalog bằng tiếng Anh")
    void testEnglish_BookingQuote_ReturnsEnglishQuotation() {
        LocalDate checkIn = LocalDate.now().plusDays(5);
        LocalDate checkOut = LocalDate.now().plusDays(7);

        RoomType roomType = RoomType.builder()
                .id(2L)
                .name("Deluxe Double Room")
                .capacity(2)
                .basePrice(new BigDecimal("950000"))
                .isActive(true)
                .build();
        when(roomTypeRepository.findById(2L)).thenReturn(Optional.of(roomType));
        when(roomService.searchAvailableRoomTypes(any(), any(), anyInt(), anyInt()))
                .thenReturn(List.of(RoomTypeAvailabilityResponse.builder().roomTypeId(2L).availableRooms(5).build()));

        ChatRequest request = ChatRequest.builder()
                .message(String.format("Please give me a quote for Deluxe Double room from %s to %s for 2 guests", checkIn, checkOut))
                .sessionId("sess-en-quote")
                .build();

        ChatResponse response = chatService.processMessage(request, null);

        assertThat(response.getCardType()).isEqualTo("BOOKING_QUOTE");
        assertThat(response.getReply()).contains("Booking Quotation");
        assertThat(response.getReply()).contains("Deluxe Double Room");
        assertThat(response.getReply()).contains("Online deposit (50% via VietQR)");
        assertThat(response.getCta()).isNotNull();
        assertThat(response.getCta().getLabel()).isEqualTo("View Room Catalog");
        assertThat(response.getCta().getUrl()).isEqualTo("/rooms");
    }

    @Test
    @DisplayName("Góc độ 3: Guardrail từ chối câu hỏi ngoài lề (code) bằng tiếng Anh lịch thiệp")
    void testEnglish_OutOfScope_ReturnsEnglishRefusal() {
        ChatRequest request = ChatRequest.builder()
                .message("Can you write a python script to solve math equations?")
                .sessionId("sess-en-guardrail")
                .build();

        ChatResponse response = chatService.processMessage(request, null);

        assertThat(response.getReply()).contains("I am the Virtual Concierge of Grand Aurora Luxury Hotel in Da Nang");
        assertThat(response.getReply()).contains("room reservations, hotel amenities");
    }
}
