package org.example.backend.chat;

import org.example.backend.booking.dto.BookingResponse;
import org.example.backend.booking.dto.CreateBookingRequest;
import org.example.backend.booking.service.BookingService;
import org.example.backend.chat.draft.BookingDraft;
import org.example.backend.chat.draft.BookingDraftManager;
import org.example.backend.chat.draft.BookingQuote;
import org.example.backend.chat.dto.ConfirmBookingDraftRequest;
import org.example.backend.chat.service.ChatBookingConfirmationService;
import org.example.backend.common.exception.AppException;
import org.example.backend.room.entity.RoomType;
import org.example.backend.room.repository.RoomTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Kiểm thử nghiệp vụ xác nhận bản nháp đặt phòng ChatBookingConfirmationService:
 * - Bảo mật tài khoản & quyền sở hữu draft
 * - Chống trùng lặp (Idempotency)
 * - Kiểm tra hạn hiệu lực và xung đột thay đổi giá (409 Conflict)
 * - Tái sử dụng BookingService và trả về booking trạng thái PENDING
 */
@ExtendWith(MockitoExtension.class)
class ChatBookingConfirmationTest {

    @Mock
    private BookingService bookingService;

    @Mock
    private RoomTypeRepository roomTypeRepository;

    private BookingDraftManager draftManager;
    private ChatBookingConfirmationService confirmationService;

    @BeforeEach
    void setUp() {
        draftManager = new BookingDraftManager();
        confirmationService = new ChatBookingConfirmationService(draftManager, bookingService, roomTypeRepository);
    }

    private void seedValidQuoteAndDraft(String quoteId, String draftId, String userEmail, BigDecimal price) {
        BookingQuote quote = BookingQuote.builder()
                .quoteId(quoteId)
                .roomTypeId(2L)
                .roomTypeName("Deluxe Double")
                .checkIn(LocalDate.now().plusDays(2))
                .checkOut(LocalDate.now().plusDays(4))
                .nights(2L)
                .guests(2)
                .quantity(1)
                .pricePerNight(price)
                .totalPrice(price.multiply(BigDecimal.valueOf(2)))
                .depositAmount(price)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build();
        draftManager.saveQuote(quote);

        BookingDraft draft = BookingDraft.builder()
                .draftId(draftId)
                .quoteId(quoteId)
                .sessionId("sess-1")
                .userEmail(userEmail)
                .roomTypeId(2L)
                .roomTypeName("Deluxe Double")
                .checkIn(quote.getCheckIn())
                .checkOut(quote.getCheckOut())
                .nights(quote.getNights())
                .quantity(quote.getQuantity())
                .guests(quote.getGuests())
                .pricePerNight(price)
                .totalPrice(quote.getTotalPrice())
                .depositAmount(quote.getDepositAmount())
                .specialRequests("Tầng cao")
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .status("DRAFT")
                .build();
        draftManager.saveDraft(draft);
    }

    @Test
    @DisplayName("Bảo mật: Chưa đăng nhập hoặc anonymousUser → Ném AppException 401 Unauthorized")
    void testConfirmDraft_Unauthenticated_ThrowsUnauthorized() {
        ConfirmBookingDraftRequest request = ConfirmBookingDraftRequest.builder()
                .draftId("draft-123")
                .idempotencyKey("idem-123")
                .paymentMethod("VIETQR")
                .build();

        assertThatThrownBy(() -> confirmationService.confirmBookingDraft(request, null))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getStatus())
                .isEqualTo(HttpStatus.UNAUTHORIZED);

        assertThatThrownBy(() -> confirmationService.confirmBookingDraft(request, "anonymousUser"))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getStatus())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Quyền sở hữu (Ownership): Khách cố tình xác nhận draft của người khác → Ném AppException 403 Forbidden")
    void testConfirmDraft_AnotherUserDraft_ThrowsForbidden() {
        seedValidQuoteAndDraft("quote-1", "draft-1", "owner@example.com", new BigDecimal("950000"));

        ConfirmBookingDraftRequest request = ConfirmBookingDraftRequest.builder()
                .draftId("draft-1")
                .idempotencyKey("idem-attacker")
                .paymentMethod("VIETQR")
                .build();

        assertThatThrownBy(() -> confirmationService.confirmBookingDraft(request, "attacker@example.com"))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("không có quyền xác nhận")
                .extracting(e -> ((AppException) e).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Xung đột giá (Price Conflict): Quản trị viên đổi giá sau khi báo giá → Ném AppException 409 Conflict")
    void testConfirmDraft_PriceChanged_ThrowsConflict() {
        BigDecimal oldPrice = new BigDecimal("950000");
        BigDecimal newPrice = new BigDecimal("1200000"); // Giá tăng
        seedValidQuoteAndDraft("quote-price", "draft-price", "thanh@example.com", oldPrice);

        RoomType currentRoomType = RoomType.builder()
                .id(2L)
                .name("Deluxe Double")
                .basePrice(newPrice)
                .build();
        when(roomTypeRepository.findById(2L)).thenReturn(Optional.of(currentRoomType));

        ConfirmBookingDraftRequest request = ConfirmBookingDraftRequest.builder()
                .draftId("draft-price")
                .idempotencyKey("idem-price")
                .paymentMethod("VIETQR")
                .build();

        assertThatThrownBy(() -> confirmationService.confirmBookingDraft(request, "thanh@example.com"))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Giá phòng đã thay đổi")
                .extracting(e -> ((AppException) e).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    @DisplayName("Xác nhận thành công: Tạo đơn đặt phòng trạng thái PENDING qua BookingService")
    void testConfirmDraft_Success_CreatesPendingBooking() {
        BigDecimal price = new BigDecimal("950000");
        seedValidQuoteAndDraft("quote-ok", "draft-ok", "customer@example.com", price);

        RoomType currentRoomType = RoomType.builder()
                .id(2L)
                .name("Deluxe Double")
                .basePrice(price)
                .build();
        when(roomTypeRepository.findById(2L)).thenReturn(Optional.of(currentRoomType));

        BookingResponse mockBooking = BookingResponse.builder()
                .id(101L)
                .bookingCode("BK-CHAT-20261106-001")
                .bookingStatus("PENDING")
                .totalPrice(price.multiply(BigDecimal.valueOf(2)))
                .depositAmount(price)
                .build();

        when(bookingService.createBooking(any(CreateBookingRequest.class), eq("customer@example.com")))
                .thenReturn(mockBooking);

        ConfirmBookingDraftRequest request = ConfirmBookingDraftRequest.builder()
                .draftId("draft-ok")
                .idempotencyKey("idem-success-123")
                .paymentMethod("VIETQR")
                .note("Yêu cầu phòng không hút thuốc")
                .build();

        BookingResponse result = confirmationService.confirmBookingDraft(request, "customer@example.com");

        assertThat(result).isNotNull();
        assertThat(result.getBookingCode()).isEqualTo("BK-CHAT-20261106-001");
        assertThat(result.getBookingStatus()).isEqualTo("PENDING");

        // Kiểm tra draft đã chuyển trạng thái sang CONFIRMED
        BookingDraft updatedDraft = draftManager.getDraft("draft-ok");
        assertThat(updatedDraft.getStatus()).isEqualTo("CONFIRMED");
    }

    @Test
    @DisplayName("Chống trùng lặp (Idempotency): Khách bấm 2 lần cùng idempotencyKey → Trả lại đơn cũ, không tạo đơn mới")
    void testConfirmDraft_IdempotencyRetry_ReturnsExistingBooking() {
        BigDecimal price = new BigDecimal("950000");
        seedValidQuoteAndDraft("quote-idem", "draft-idem", "customer@example.com", price);

        RoomType currentRoomType = RoomType.builder()
                .id(2L)
                .name("Deluxe Double")
                .basePrice(price)
                .build();
        when(roomTypeRepository.findById(2L)).thenReturn(Optional.of(currentRoomType));

        BookingResponse mockBooking = BookingResponse.builder()
                .id(102L)
                .bookingCode("BK-CHAT-20261106-002")
                .bookingStatus("PENDING")
                .build();

        when(bookingService.createBooking(any(CreateBookingRequest.class), eq("customer@example.com")))
                .thenReturn(mockBooking);

        ConfirmBookingDraftRequest request = ConfirmBookingDraftRequest.builder()
                .draftId("draft-idem")
                .idempotencyKey("idem-duplicate-key")
                .paymentMethod("VIETQR")
                .build();

        // Lần 1: Tạo mới thành công
        BookingResponse firstCall = confirmationService.confirmBookingDraft(request, "customer@example.com");
        assertThat(firstCall.getBookingCode()).isEqualTo("BK-CHAT-20261106-002");

        // Lần 2: Gửi lại cùng idempotencyKey (retry mạng hoặc khách bấm đúp)
        BookingResponse secondCall = confirmationService.confirmBookingDraft(request, "customer@example.com");
        assertThat(secondCall.getBookingCode()).isEqualTo("BK-CHAT-20261106-002");

        // BookingService chỉ được gọi duy nhất 1 lần!
        verify(bookingService, times(1)).createBooking(any(CreateBookingRequest.class), eq("customer@example.com"));
    }
}

