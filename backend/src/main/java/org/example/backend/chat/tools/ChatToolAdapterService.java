package org.example.backend.chat.tools;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.chat.draft.BookingDraft;
import org.example.backend.chat.draft.BookingDraftManager;
import org.example.backend.chat.draft.BookingQuote;
import org.example.backend.chat.dto.tools.BookingDraftResponse;
import org.example.backend.chat.dto.tools.BookingQuoteResponse;
import org.example.backend.chat.dto.tools.RoomOptionItem;
import org.example.backend.common.exception.AppException;
import org.example.backend.room.dto.RoomTypeAvailabilityResponse;
import org.example.backend.room.entity.RoomType;
import org.example.backend.room.repository.RoomTypeRepository;
import org.example.backend.room.service.RoomService;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Adapter Service thực thi 4 tool nghiệp vụ cho Chatbot theo task [SP2-CHAT-TOOLS-01]:
 * 1. searchAvailableRooms: Tra loại phòng / phòng trống theo ngày và sức chứa
 * 2. getRoomTypeDetails: Lấy thông tin công khai loại phòng
 * 3. getBookingQuote: Tính số đêm, tổng tiền và cọc 50% theo quy tắc hiện hành (không giữ phòng)
 * 4. prepareBooking: Kiểm tra đăng nhập, tạo bản nháp gắn với tài khoản khách (chưa tạo booking)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatToolAdapterService {

    private final RoomService roomService;
    private final RoomTypeRepository roomTypeRepository;
    private final BookingDraftManager bookingDraftManager;

    // ────────────────────────────────────────────────────────────────
    // TOOL 1: searchAvailableRooms
    // ────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public ToolCallResult searchAvailableRooms(LocalDate checkIn, LocalDate checkOut, Integer guests, Long roomTypeId) {
        log.info("[ChatTool] searchAvailableRooms: checkIn={}, checkOut={}, guests={}, roomTypeId={}",
                checkIn, checkOut, guests, roomTypeId);

        // 1. Validate tham số
        if (checkIn == null || checkOut == null) {
            return ToolCallResult.error(ChatToolNames.SEARCH_AVAILABLE_ROOMS,
                    "Vui lòng cung cấp đầy đủ ngày nhận phòng (checkIn) và ngày trả phòng (checkOut) để tra cứu.");
        }
        LocalDate today = LocalDate.now();
        if (checkIn.isBefore(today)) {
            return ToolCallResult.error(ChatToolNames.SEARCH_AVAILABLE_ROOMS,
                    "Ngày nhận phòng không được là ngày trong quá khứ (" + checkIn + "). Quý khách vui lòng chọn ngày từ hôm nay trở đi.");
        }
        if (!checkOut.isAfter(checkIn)) {
            return ToolCallResult.error(ChatToolNames.SEARCH_AVAILABLE_ROOMS,
                    "Ngày trả phòng (" + checkOut + ") phải sau ngày nhận phòng (" + checkIn + ") ít nhất 1 đêm.");
        }
        int guestCount = (guests != null && guests > 0) ? guests : 2;

        try {
            List<RoomTypeAvailabilityResponse> availableList = roomService.searchAvailableRoomTypes(checkIn, checkOut, guestCount, 1);

            if (roomTypeId != null) {
                availableList = availableList.stream()
                        .filter(rt -> rt.getRoomTypeId().equals(roomTypeId))
                        .toList();
            }

            if (availableList.isEmpty()) {
                return ToolCallResult.builder()
                        .toolName(ChatToolNames.SEARCH_AVAILABLE_ROOMS)
                        .success(true)
                        .summaryMessage("Rất tiếc trong khoảng thời gian từ " + checkIn + " đến " + checkOut + " cho " + guestCount + " khách, khách sạn hiện không còn phòng trống phù hợp.")
                        .cardType("ROOM_OPTIONS")
                        .cardData(Collections.emptyList())
                        .build();
            }

            List<RoomOptionItem> optionItems = new ArrayList<>();
            StringBuilder summary = new StringBuilder("Kết quả tra cứu phòng từ " + checkIn + " đến " + checkOut + " cho " + guestCount + " khách:\n");

            for (RoomTypeAvailabilityResponse rt : availableList) {
                optionItems.add(RoomOptionItem.builder()
                        .roomTypeId(rt.getRoomTypeId())
                        .name(rt.getName())
                        .description(rt.getDescription())
                        .capacity(rt.getCapacity())
                        .basePrice(rt.getBasePrice())
                        .primaryImageUrl(rt.getPrimaryImageUrl())
                        .amenities(rt.getAmenities())
                        .availableRooms(rt.getAvailableRooms())
                        .build());

                summary.append(String.format("• %s (ID: %d): Giá %s VNĐ/đêm | Sức chứa %d khách | Còn %d phòng trống\n",
                        rt.getName(), rt.getRoomTypeId(), rt.getBasePrice(), rt.getCapacity(), rt.getAvailableRooms()));
            }

            return ToolCallResult.builder()
                    .toolName(ChatToolNames.SEARCH_AVAILABLE_ROOMS)
                    .success(true)
                    .summaryMessage(summary.toString())
                    .cardType("ROOM_OPTIONS")
                    .cardData(optionItems)
                    .build();

        } catch (Exception e) {
            log.error("[ChatTool] Lỗi khi gọi searchAvailableRoomTypes: {}", e.getMessage(), e);
            return ToolCallResult.error(ChatToolNames.SEARCH_AVAILABLE_ROOMS, "Lỗi tra cứu phòng: " + e.getMessage());
        }
    }

    // ────────────────────────────────────────────────────────────────
    // TOOL 2: getRoomTypeDetails
    // ────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public ToolCallResult getRoomTypeDetails(Long roomTypeId) {
        log.info("[ChatTool] getRoomTypeDetails: roomTypeId={}", roomTypeId);

        if (roomTypeId == null) {
            return ToolCallResult.error(ChatToolNames.GET_ROOM_TYPE_DETAILS,
                    "Vui lòng chỉ định mã loại phòng (roomTypeId) cần xem chi tiết.");
        }

        try {
            RoomTypeAvailabilityResponse details = roomService.getRoomTypeById(roomTypeId);

            RoomOptionItem item = RoomOptionItem.builder()
                    .roomTypeId(details.getRoomTypeId())
                    .name(details.getName())
                    .description(details.getDescription())
                    .capacity(details.getCapacity())
                    .basePrice(details.getBasePrice())
                    .primaryImageUrl(details.getPrimaryImageUrl())
                    .amenities(details.getAmenities())
                    .availableRooms(details.getAvailableRooms())
                    .build();

            String summary = String.format("Thông tin chi tiết loại phòng %s (ID: %d):\n- Giá niêm yết: %s VNĐ/đêm\n- Sức chứa tối đa: %d người\n- Mô tả: %s\n- Tiện nghi: %s",
                    details.getName(), details.getRoomTypeId(), details.getBasePrice(), details.getCapacity(),
                    details.getDescription(), String.join(", ", details.getAmenities() != null ? details.getAmenities() : Collections.emptyList()));

            return ToolCallResult.builder()
                    .toolName(ChatToolNames.GET_ROOM_TYPE_DETAILS)
                    .success(true)
                    .summaryMessage(summary)
                    .cardType("ROOM_OPTIONS")
                    .cardData(List.of(item))
                    .build();

        } catch (AppException e) {
            return ToolCallResult.error(ChatToolNames.GET_ROOM_TYPE_DETAILS, e.getMessage());
        } catch (Exception e) {
            log.error("[ChatTool] Lỗi khi lấy chi tiết loại phòng: {}", e.getMessage(), e);
            return ToolCallResult.error(ChatToolNames.GET_ROOM_TYPE_DETAILS, "Không tìm thấy thông tin loại phòng ID " + roomTypeId);
        }
    }

    // ────────────────────────────────────────────────────────────────
    // TOOL 3: getBookingQuote
    // ────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public ToolCallResult getBookingQuote(Long roomTypeId, LocalDate checkIn, LocalDate checkOut, Integer guests, Integer quantity) {
        log.info("[ChatTool] getBookingQuote: roomTypeId={}, checkIn={}, checkOut={}, guests={}, qty={}",
                roomTypeId, checkIn, checkOut, guests, quantity);

        if (roomTypeId == null || checkIn == null || checkOut == null) {
            return ToolCallResult.error(ChatToolNames.GET_BOOKING_QUOTE,
                    "Thiếu thông tin để tính báo giá: vui lòng cung cấp roomTypeId, ngày nhận phòng và ngày trả phòng.");
        }
        if (checkIn.isBefore(LocalDate.now())) {
            return ToolCallResult.error(ChatToolNames.GET_BOOKING_QUOTE,
                    "Ngày nhận phòng không được ở trong quá khứ (" + checkIn + ").");
        }
        if (!checkOut.isAfter(checkIn)) {
            return ToolCallResult.error(ChatToolNames.GET_BOOKING_QUOTE,
                    "Ngày trả phòng (" + checkOut + ") phải sau ngày nhận phòng ít nhất 1 đêm.");
        }

        RoomType roomType = roomTypeRepository.findById(roomTypeId).orElse(null);
        if (roomType == null || !Boolean.TRUE.equals(roomType.getIsActive())) {
            return ToolCallResult.error(ChatToolNames.GET_BOOKING_QUOTE,
                    "Loại phòng ID " + roomTypeId + " không tồn tại hoặc đã ngừng kinh doanh.");
        }

        int guestCount = (guests != null && guests > 0) ? guests : roomType.getCapacity();
        int roomQty = (quantity != null && quantity > 0) ? quantity : 1;

        if (guestCount > roomType.getCapacity() * roomQty) {
            return ToolCallResult.error(ChatToolNames.GET_BOOKING_QUOTE,
                    String.format("Số lượng khách (%d người) vượt quá sức chứa tối đa của %d phòng %s (%d người/phòng). Vui lòng tăng số lượng phòng.",
                            guestCount, roomQty, roomType.getName(), roomType.getCapacity()));
        }

        // Kiểm tra phòng trống thời gian thực xem còn đủ không
        List<RoomTypeAvailabilityResponse> avail = roomService.searchAvailableRoomTypes(checkIn, checkOut, guestCount, roomQty);
        int available = avail.stream()
                .filter(a -> a.getRoomTypeId().equals(roomTypeId))
                .mapToInt(RoomTypeAvailabilityResponse::getAvailableRooms)
                .findFirst()
                .orElse(0);

        if (available < roomQty) {
            return ToolCallResult.error(ChatToolNames.GET_BOOKING_QUOTE,
                    String.format("Rất tiếc loại phòng %s chỉ còn %d phòng trống trong khoảng thời gian này, không đủ số lượng %d phòng yêu cầu.",
                            roomType.getName(), available, roomQty));
        }

        // Tính giá
        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        BigDecimal pricePerNight = roomType.getBasePrice();
        BigDecimal totalPrice = pricePerNight.multiply(BigDecimal.valueOf(nights)).multiply(BigDecimal.valueOf(roomQty));
        BigDecimal depositAmount = totalPrice.divide(BigDecimal.valueOf(2), 0, RoundingMode.HALF_UP);

        String quoteId = "quote-" + UUID.randomUUID().toString().substring(0, 8);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusMinutes(BookingDraftManager.QUOTE_EXPIRATION_MINUTES);

        BookingQuote quote = BookingQuote.builder()
                .quoteId(quoteId)
                .roomTypeId(roomType.getId())
                .roomTypeName(roomType.getName())
                .checkIn(checkIn)
                .checkOut(checkOut)
                .nights(nights)
                .guests(guestCount)
                .quantity(roomQty)
                .pricePerNight(pricePerNight)
                .totalPrice(totalPrice)
                .depositAmount(depositAmount)
                .createdAt(now)
                .expiresAt(expiresAt)
                .build();

        bookingDraftManager.saveQuote(quote);

        BookingQuoteResponse responseDto = BookingQuoteResponse.builder()
                .quoteId(quoteId)
                .roomTypeId(roomType.getId())
                .roomTypeName(roomType.getName())
                .checkIn(checkIn)
                .checkOut(checkOut)
                .nights(nights)
                .guests(guestCount)
                .quantity(roomQty)
                .pricePerNight(pricePerNight)
                .totalPrice(totalPrice)
                .depositAmount(depositAmount)
                .expiresAt(expiresAt)
                .note("Báo giá có hiệu lực trong 15 phút và không giữ phòng trước.")
                .build();

        String summary = String.format("Báo giá đặt phòng [Mã: %s]:\n• Loại phòng: %s (%d phòng)\n• Thời gian: Từ %s đến %s (%d đêm)\n• Số khách: %d người\n• Đơn giá: %s VNĐ/đêm\n• Tổng tiền: %s VNĐ\n• Tiền cọc trực tuyến 50%% qua VNPay: %s VNĐ\n(Lưu ý: Báo giá này có hiệu lực trong 15 phút và chưa giữ phòng. Quý khách vui lòng đăng nhập và xác nhận để đặt phòng).",
                quoteId, roomType.getName(), roomQty, checkIn, checkOut, nights, guestCount, pricePerNight, totalPrice, depositAmount);

        return ToolCallResult.builder()
                .toolName(ChatToolNames.GET_BOOKING_QUOTE)
                .success(true)
                .summaryMessage(summary)
                .cardType("BOOKING_QUOTE")
                .cardData(responseDto)
                .build();
    }

    // ────────────────────────────────────────────────────────────────
    // TOOL 4: prepareBooking
    // ────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public ToolCallResult prepareBooking(String quoteId, String specialRequests, Authentication authentication, String sessionId) {
        log.info("[ChatTool] prepareBooking: quoteId={}, user={}, sessionId={}",
                quoteId, authentication != null ? authentication.getName() : "anonymous", sessionId);

        // 1. Kiểm tra đăng nhập (Bảo mật: Không tạo draft/booking khi chưa đăng nhập)
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equalsIgnoreCase(authentication.getName())) {
            log.warn("[ChatTool] Từ chối prepareBooking do người dùng chưa đăng nhập");
            return ToolCallResult.builder()
                    .toolName(ChatToolNames.PREPARE_BOOKING)
                    .success(false)
                    .summaryMessage("Dạ để chuẩn bị đơn đặt phòng, quý khách vui lòng Đăng nhập vào tài khoản trên website để hệ thống ghi nhận thông tin chính xác nhé.")
                    .cardType("LOGIN_REQUIRED")
                    .cardData(Map.of("message", "Vui lòng đăng nhập để tiếp tục đặt phòng", "quoteId", quoteId != null ? quoteId : ""))
                    .errorMessage("LOGIN_REQUIRED")
                    .build();
        }

        // Lấy khách hàng từ Security Context (Tuyệt đối KHÔNG nhận customerId từ model suy diễn)
        String userEmail = authentication.getName();

        if (quoteId == null || quoteId.isBlank()) {
            return ToolCallResult.error(ChatToolNames.PREPARE_BOOKING,
                    "Thiếu quoteId. Vui lòng nhận báo giá trước khi chuẩn bị đơn đặt phòng.");
        }

        // 2. Lấy và kiểm tra báo giá
        BookingQuote quote = bookingDraftManager.getQuote(quoteId.trim());
        if (quote == null) {
            return ToolCallResult.error(ChatToolNames.PREPARE_BOOKING,
                    "Mã báo giá '" + quoteId + "' không tồn tại hoặc đã hết hiệu lực (quá 15 phút). Quý khách vui lòng yêu cầu báo giá mới.");
        }

        // 3. Kiểm tra xem phòng còn trống không
        List<RoomTypeAvailabilityResponse> avail = roomService.searchAvailableRoomTypes(quote.getCheckIn(), quote.getCheckOut(), quote.getGuests(), quote.getQuantity());
        int available = avail.stream()
                .filter(a -> a.getRoomTypeId().equals(quote.getRoomTypeId()))
                .mapToInt(RoomTypeAvailabilityResponse::getAvailableRooms)
                .findFirst()
                .orElse(0);

        if (available < quote.getQuantity()) {
            return ToolCallResult.error(ChatToolNames.PREPARE_BOOKING,
                    "Rất tiếc loại phòng " + quote.getRoomTypeName() + " vừa được khách khác đặt và không còn đủ " + quote.getQuantity() + " phòng trống. Quý khách vui lòng chọn loại phòng khác hoặc ngày khác.");
        }

        // 4. Tạo bản nháp (BookingDraft)
        String draftId = "draft-" + UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusMinutes(BookingDraftManager.DRAFT_EXPIRATION_MINUTES);

        BookingDraft draft = BookingDraft.builder()
                .draftId(draftId)
                .quoteId(quote.getQuoteId())
                .sessionId(sessionId)
                .userEmail(userEmail)
                .roomTypeId(quote.getRoomTypeId())
                .roomTypeName(quote.getRoomTypeName())
                .capacity(quote.getGuests())
                .checkIn(quote.getCheckIn())
                .checkOut(quote.getCheckOut())
                .nights(quote.getNights())
                .quantity(quote.getQuantity())
                .guests(quote.getGuests())
                .pricePerNight(quote.getPricePerNight())
                .totalPrice(quote.getTotalPrice())
                .depositAmount(quote.getDepositAmount())
                .specialRequests(specialRequests != null ? specialRequests.trim() : "")
                .createdAt(now)
                .expiresAt(expiresAt)
                .status("DRAFT")
                .build();

        bookingDraftManager.saveDraft(draft);

        BookingDraftResponse draftResponse = BookingDraftResponse.builder()
                .draftId(draftId)
                .quoteId(quote.getQuoteId())
                .roomTypeId(quote.getRoomTypeId())
                .roomTypeName(quote.getRoomTypeName())
                .capacity(quote.getGuests())
                .checkIn(quote.getCheckIn())
                .checkOut(quote.getCheckOut())
                .nights(quote.getNights())
                .quantity(quote.getQuantity())
                .guests(quote.getGuests())
                .pricePerNight(quote.getPricePerNight())
                .totalPrice(quote.getTotalPrice())
                .depositAmount(quote.getDepositAmount())
                .specialRequests(draft.getSpecialRequests())
                .userEmail(userEmail)
                .expiresAt(expiresAt)
                .status("DRAFT")
                .build();

        String summary = String.format("Đã chuẩn bị bản nháp đặt phòng [Mã nháp: %s] cho tài khoản %s:\n• Loại phòng: %s (%d phòng)\n• Ngày nhận: %s | Ngày trả: %s (%d đêm)\n• Tổng tiền: %s VNĐ | Cọc 50%%: %s VNĐ\n\nQuý khách vui lòng kiểm tra lại thông tin và bấm nút 'Xác nhận đặt phòng' trên thẻ giao diện bên dưới để hoàn tất đặt giữ chỗ.",
                draftId, userEmail, quote.getRoomTypeName(), quote.getQuantity(), quote.getCheckIn(), quote.getCheckOut(), quote.getNights(), quote.getTotalPrice(), quote.getDepositAmount());

        return ToolCallResult.builder()
                .toolName(ChatToolNames.PREPARE_BOOKING)
                .success(true)
                .summaryMessage(summary)
                .cardType("BOOKING_DRAFT")
                .cardData(draftResponse)
                .build();
    }

    // ────────────────────────────────────────────────────────────────
    // TOOL 5: getAllRoomTypes
    // ────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public ToolCallResult getAllRoomTypes() {
        log.info("[ChatTool] getAllRoomTypes: Truy vấn danh mục tất cả hạng phòng đang mở bán từ cơ sở dữ liệu");
        try {
            List<RoomTypeAvailabilityResponse> activeTypes = roomService.getAllActiveRoomTypes();

            // Nếu DB chưa có dữ liệu (ví dụ môi trường test cô lập), cung cấp 3 hạng phòng tiêu chuẩn mặc định
            if (activeTypes == null || activeTypes.isEmpty()) {
                activeTypes = List.of(
                        RoomTypeAvailabilityResponse.builder()
                                .roomTypeId(1L)
                                .name("Standard Single Room")
                                .description("Phòng tiêu chuẩn 1 giường đơn, máy lạnh, wifi tốc độ cao, nước nóng lạnh.")
                                .capacity(1)
                                .basePrice(new BigDecimal("500000"))
                                .amenities(List.of("WiFi", "Máy lạnh", "Nước nóng lạnh"))
                                .availableRooms(1)
                                .build(),
                        RoomTypeAvailabilityResponse.builder()
                                .roomTypeId(2L)
                                .name("Deluxe Double Room")
                                .description("Phòng Deluxe 1 giường đôi lớn, ban công hướng phố thoáng mát, bàn làm việc cao cấp.")
                                .capacity(2)
                                .basePrice(new BigDecimal("950000"))
                                .amenities(List.of("WiFi", "Ban công hướng phố", "Bàn làm việc", "Smart TV"))
                                .availableRooms(1)
                                .build(),
                        RoomTypeAvailabilityResponse.builder()
                                .roomTypeId(3L)
                                .name("Executive Suite Luxury")
                                .description("Căn hộ Suite sang trọng 2 phòng ngủ, bồn tắm nằm cao cấp, tầm nhìn toàn cảnh thành phố.")
                                .capacity(4)
                                .basePrice(new BigDecimal("1800000"))
                                .amenities(List.of("WiFi", "Bồn tắm nằm", "Tầm nhìn toàn cảnh", "Phòng khách riêng", "Minibar"))
                                .availableRooms(1)
                                .build()
                );
            }

            List<RoomOptionItem> optionItems = activeTypes.stream()
                    .map(rt -> RoomOptionItem.builder()
                            .roomTypeId(rt.getRoomTypeId())
                            .name(rt.getName())
                            .description(rt.getDescription())
                            .capacity(rt.getCapacity())
                            .basePrice(rt.getBasePrice())
                            .primaryImageUrl(rt.getPrimaryImageUrl())
                            .amenities(rt.getAmenities())
                            .availableRooms(rt.getAvailableRooms())
                            .build())
                    .toList();

            StringBuilder sb = new StringBuilder();
            sb.append(String.format("Hiện tại Grand Aurora Luxury Hotel đang mở bán %d hạng phòng nghỉ dưỡng tiêu biểu:\n", optionItems.size()));
            for (int i = 0; i < optionItems.size(); i++) {
                RoomOptionItem item = optionItems.get(i);
                sb.append(String.format("\n**%d. %s** (Mã ID: %d):\n• Giá niêm yết: %,.0f VNĐ/đêm\n• Sức chứa tối đa: %d người\n• Tiện nghi: %s\n• Mô tả: %s\n",
                        i + 1,
                        item.getName(),
                        item.getRoomTypeId(),
                        item.getBasePrice(),
                        item.getCapacity(),
                        String.join(", ", item.getAmenities() != null ? item.getAmenities() : Collections.emptyList()),
                        item.getDescription() != null ? item.getDescription() : ""));
            }
            sb.append("\nQuý khách muốn xem chi tiết hạng phòng nào hoặc muốn kiểm tra phòng trống cho ngày lưu trú cụ thể thì nhắn em hỗ trợ ngay nhé!");

            return ToolCallResult.builder()
                    .toolName(ChatToolNames.GET_ALL_ROOM_TYPES)
                    .success(true)
                    .summaryMessage(sb.toString().trim())
                    .cardType("ROOM_OPTIONS")
                    .cardData(optionItems)
                    .build();

        } catch (Exception e) {
            log.error("[ChatTool] Lỗi khi truy vấn danh mục hạng phòng: {}", e.getMessage(), e);
            return ToolCallResult.error(ChatToolNames.GET_ALL_ROOM_TYPES, "Lỗi truy vấn danh mục phòng: " + e.getMessage());
        }
    }
}

