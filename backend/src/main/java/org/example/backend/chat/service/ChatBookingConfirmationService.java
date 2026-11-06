package org.example.backend.chat.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.booking.dto.BookingResponse;
import org.example.backend.booking.dto.CreateBookingRequest;
import org.example.backend.booking.service.BookingService;
import org.example.backend.chat.draft.BookingDraft;
import org.example.backend.chat.draft.BookingDraftManager;
import org.example.backend.chat.draft.BookingQuote;
import org.example.backend.chat.dto.ConfirmBookingDraftRequest;
import org.example.backend.common.exception.AppException;
import org.example.backend.room.entity.RoomType;
import org.example.backend.room.repository.RoomTypeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service xử lý hành động xác nhận bản nháp đặt phòng từ phía khách hàng (qua thẻ UI Chat):
 * - Đây là hành động do khách hàng trực tiếp bấm nút, KHÔNG PHẢI tool để model tự suy diễn tạo booking.
 * - Kiểm tra Idempotency key chống trùng lặp request khi retry/bấm nhiều lần.
 * - Kiểm tra quyền sở hữu bản nháp (ownership check).
 * - Kiểm tra thời hạn báo giá và giá phòng không bị thay đổi.
 * - Tái sử dụng BookingService với khóa Pessimistic Lock chống overbooking.
 * - Đơn đặt phòng mới tạo luôn ở trạng thái PENDING.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatBookingConfirmationService {

    private final BookingDraftManager bookingDraftManager;
    private final BookingService bookingService;
    private final RoomTypeRepository roomTypeRepository;

    @Transactional
    public BookingResponse confirmBookingDraft(ConfirmBookingDraftRequest request, String userEmail) {
        log.info("[ChatConfirm] Bắt đầu xác nhận bản nháp: draftId={}, idemKey={}, user={}",
                request.getDraftId(), request.getIdempotencyKey(), userEmail);

        if (userEmail == null || userEmail.isBlank() || "anonymousUser".equalsIgnoreCase(userEmail)) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Quý khách vui lòng đăng nhập để xác nhận đặt phòng");
        }

        // 1. Chống lặp (Idempotency check): nếu request cùng idemKey đã thành công, trả lại booking đó ngay
        BookingResponse existing = bookingDraftManager.getIdempotentResponse(request.getIdempotencyKey().trim());
        if (existing != null) {
            log.info("[ChatConfirm] Idempotency Hit: Trả lại kết quả booking cũ [{}] cho key [{}]",
                    existing.getBookingCode(), request.getIdempotencyKey());
            return existing;
        }

        // 2. Lấy bản nháp
        BookingDraft draft = bookingDraftManager.getDraft(request.getDraftId().trim());
        if (draft == null || draft.isExpired()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Bản nháp đặt phòng không tồn tại hoặc đã hết hạn (quá 15 phút)");
        }

        // 3. Kiểm tra quyền sở hữu bản nháp (không được xác nhận draft của người khác)
        if (!draft.getUserEmail().equalsIgnoreCase(userEmail.trim())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền xác nhận bản nháp đặt phòng của khách hàng khác");
        }

        if ("CONFIRMED".equalsIgnoreCase(draft.getStatus())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Bản nháp này đã được xác nhận tạo đơn đặt phòng trước đó");
        }

        // 4. Kiểm tra báo giá gắn với draft
        BookingQuote quote = bookingDraftManager.getQuote(draft.getQuoteId());
        if (quote == null || quote.isExpired()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Báo giá gắn với bản nháp này đã hết hạn. Quý khách vui lòng lấy báo giá mới.");
        }

        // 5. Kiểm tra giá phòng có bị quản trị viên thay đổi giữa chừng không
        RoomType roomType = roomTypeRepository.findById(draft.getRoomTypeId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Loại phòng không còn tồn tại trong hệ thống"));

        if (roomType.getBasePrice().compareTo(draft.getPricePerNight()) != 0) {
            log.warn("[ChatConfirm] Giá phòng đã đổi: Giá cũ quote={}, Giá mới DB={}",
                    draft.getPricePerNight(), roomType.getBasePrice());
            throw new AppException(HttpStatus.CONFLICT,
                    String.format("Giá phòng đã thay đổi từ %s VNĐ sang %s VNĐ/đêm. Vui lòng nhận báo giá mới trước khi xác nhận.",
                            draft.getPricePerNight(), roomType.getBasePrice()));
        }

        // 6. Xây dựng request chuyển tiếp cho BookingService (tái sử dụng Pessimistic Lock chống overbooking)
        String combinedNote = (draft.getSpecialRequests() != null && !draft.getSpecialRequests().isBlank())
                ? "[Đặt qua Chatbot AI] " + draft.getSpecialRequests()
                : "[Đặt qua Chatbot AI]";
        if (request.getNote() != null && !request.getNote().isBlank()) {
            combinedNote += " | Ghi chú thêm: " + request.getNote().trim();
        }

        CreateBookingRequest bookingRequest = CreateBookingRequest.builder()
                .roomTypeId(draft.getRoomTypeId())
                .quantity(draft.getQuantity())
                .guests(draft.getGuests())
                .checkIn(draft.getCheckIn())
                .checkOut(draft.getCheckOut())
                .paymentMethod(request.getPaymentMethod().trim().toUpperCase())
                .note(combinedNote)
                .build();

        // 7. Gọi BookingService.createBooking
        BookingResponse bookingResponse = bookingService.createBooking(bookingRequest, userEmail);

        // 8. Đánh dấu bản nháp đã xác nhận và lưu vào Idempotency Store
        bookingDraftManager.saveIdempotentResponse(request.getIdempotencyKey().trim(), bookingResponse);
        bookingDraftManager.markDraftConfirmed(draft.getDraftId());

        log.info("[ChatConfirm] Đặt phòng thành công từ Chatbot! Mã booking: [{}], Trạng thái: [{}]",
                bookingResponse.getBookingCode(), bookingResponse.getBookingStatus());

        return bookingResponse;
    }
}

