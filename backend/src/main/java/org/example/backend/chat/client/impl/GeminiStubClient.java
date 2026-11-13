package org.example.backend.chat.client.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.chat.client.GeminiClient;
import org.example.backend.chat.dto.ChatModelResult;
import org.example.backend.chat.prompt.HotelPromptManager;
import org.example.backend.chat.session.ChatMessage;
import org.example.backend.chat.tools.ChatToolDispatcher;
import org.example.backend.chat.tools.ChatToolNames;
import org.example.backend.chat.tools.ToolCallResult;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Provider Stub cho Chatbot Grand Aurora:
 * - Cung cấp câu trả lời tư vấn phòng mẫu chuẩn xác theo nghiệp vụ khách sạn Grand Aurora.
 * - Hỗ trợ giả lập đầy đủ 4 Tool Function Calling (Task [SP2-CHAT-TOOLS-01]):
 *   1. searchAvailableRooms: Tra cứu phòng từ DB thật qua toolDispatcher
 *   2. getRoomTypeDetails: Lấy chi tiết tiện nghi loại phòng
 *   3. getBookingQuote: Tính số đêm, tổng tiền và cọc 50% VNPay (hạn 15p, không giữ phòng)
 *   4. prepareBooking: Kiểm tra đăng nhập qua Authentication, tạo Booking Draft gắn với session
 * - Tuân thủ nghiêm ngặt Guardrails:
 *   + Từ chối câu hỏi ngoài lề (code, toán học, chính trị...)
 *   + Từ chối các tool vượt quyền (confirm, payment, sql, refund...)
 *   + Không tự khẳng định đặt phòng hay thanh toán thành công
 *   + Thiếu ngày/số khách thì hỏi lại lịch sự, không bịa dữ liệu
 * - Hoàn toàn độc lập với Internet và Google API Key, phục vụ kiểm thử tự động 100% ổn định.
 */
@Slf4j
@Component("geminiStubClient")
@RequiredArgsConstructor
public class GeminiStubClient implements GeminiClient {

    private final HotelPromptManager promptManager;

    public static final String PROVIDER_NAME = "stub";
    public static final String MODEL_NAME = "stub-mock-provider";

    private static final Pattern DATE_PATTERN = Pattern.compile("(\\d{4}-\\d{2}-\\d{2})");
    private static final Pattern QUOTE_PATTERN = Pattern.compile("(quote-[a-zA-Z0-9]+)");

    public GeminiStubClient() {
        this(new HotelPromptManager());
    }

    @Override
    public ChatModelResult executeChat(String userMessage,
                                       String systemPrompt,
                                       List<ChatMessage> history,
                                       ChatToolDispatcher toolDispatcher,
                                       Authentication authentication,
                                       String sessionId) {
        log.info("[GeminiStubClient] executeChat: userMessage=[{}], user=[{}]",
                userMessage, authentication != null ? authentication.getName() : "anonymous");

        boolean isEnglish = HotelPromptManager.isEnglishText(userMessage);

        if (userMessage == null || userMessage.isBlank()) {
            return ChatModelResult.builder()
                    .reply(isEnglish
                            ? "Hello! Welcome to Grand Aurora Luxury Hotel. How may I assist you with your stay today?"
                            : "Dạ chào quý khách! Em có thể giúp gì cho kỳ nghỉ dưỡng của quý khách tại Grand Aurora Luxury Hotel?")
                    .cardType("NONE")
                    .provider(PROVIDER_NAME)
                    .model(MODEL_NAME)
                    .build();
        }

        String lower = userMessage.toLowerCase(Locale.ROOT);

        // 0. Guardrails: Ngoài phạm vi khách sạn
        if (promptManager.isOutOfScope(userMessage)) {
            return ChatModelResult.builder()
                    .reply(promptManager.getOutOfScopeRefusalMessage(isEnglish))
                    .cardType("NONE")
                    .provider(PROVIDER_NAME)
                    .model(MODEL_NAME)
                    .build();
        }

        // 1. Chống vượt quyền: Khách yêu cầu AI sửa giá, can thiệp SQL, xác nhận thanh toán, hoàn tiền
        if (promptManager.isUnauthorizedActionRequest(userMessage)
                || lower.contains("gọi tool confirmbooking")
                || lower.contains("xác nhận đặt phòng giúp tôi")
                || lower.contains("thanh toán đơn đặt phòng")) {
            return ChatModelResult.builder()
                    .reply(promptManager.getUnauthorizedActionMessage(isEnglish))
                    .cardType("NONE")
                    .provider(PROVIDER_NAME)
                    .model(MODEL_NAME)
                    .build();
        }

        // 2. Chống ảo giác: Không tự xác nhận đặt phòng hay thanh toán thành công
        if (promptManager.isBookingOrPaymentConfirmationInquiry(userMessage)
                || lower.contains("đã thanh toán thành công chưa")
                || lower.contains("đã đặt phòng thành công chưa")) {
            return ChatModelResult.builder()
                    .reply(promptManager.getBookingOrPaymentGuidanceMessage(isEnglish))
                    .cardType("NONE")
                    .provider(PROVIDER_NAME)
                    .model(MODEL_NAME)
                    .build();
        }

        // 3. Nếu không có toolDispatcher -> fallback sang chat thông thường
        if (toolDispatcher == null) {
            String text = generateContentWithHistory(userMessage, systemPrompt, history);
            return ChatModelResult.builder()
                    .reply(text)
                    .cardType("NONE")
                    .provider(PROVIDER_NAME)
                    .model(MODEL_NAME)
                    .build();
        }

        // 4. FUNCTION CALLING SIMULATION THEO INTENT:

        // Tool 5: getAllRoomTypes (Khám phá danh mục phòng tổng quan từ DB)
        if (lower.contains("những loại phòng") || lower.contains("các loại phòng") || lower.contains("bao nhiêu hạng phòng")
                || lower.contains("có bao nhiêu loại") || lower.contains("danh mục phòng") || lower.contains("danh sách phòng")
                || lower.contains("danh sách loại phòng") || lower.contains("getallroomtypes") || lower.contains("listrooms")
                || lower.contains("phòng nào đắt nhất") || lower.contains("phòng nào rẻ nhất") || lower.contains("giới thiệu phòng")
                || lower.contains("room types") || lower.contains("room type") || lower.contains("what rooms")
                || lower.contains("which rooms") || lower.contains("list of rooms") || lower.contains("all rooms")
                || lower.contains("room catalog")
                || (lower.contains("hạng phòng") && !lower.contains("chi tiết") && !lower.contains("báo giá") && !lower.contains("từ ngày"))
                || (lower.contains("có phòng nào") && extractDates(userMessage).isEmpty())) {

            ToolCallResult result = toolDispatcher.dispatch(ChatToolNames.GET_ALL_ROOM_TYPES, Map.of(), authentication, sessionId);
            String replyText = isEnglish ? formatAllRoomTypesEnglish(result)
                    : (result.getSummaryMessage() != null ? result.getSummaryMessage() : result.getErrorMessage());
            return ChatModelResult.builder()
                    .reply(replyText)
                    .cardType(result.getCardType())
                    .cardData(result.getCardData())
                    .provider(PROVIDER_NAME)
                    .model(MODEL_NAME)
                    .build();
        }

        boolean isPolicyOrQuestion = lower.contains("chính sách") || lower.contains("quy định")
                || lower.contains("thế nào") || lower.contains("như thế nào") || lower.contains("lịch sử")
                || lower.contains("mấy giờ") || lower.contains("thời gian") || lower.contains("hoàn tiền")
                || lower.contains("hủy phòng") || lower.contains("how to") || lower.contains("policy");

        boolean hasSearchIntent = lower.contains("tìm phòng") || lower.contains("tra phòng")
                || lower.contains("còn phòng") || lower.contains("kiểm tra phòng") || lower.contains("phòng trống")
                || lower.contains("có phòng không") || lower.contains("có phòng trống")
                || lower.contains("search room") || lower.contains("find room") || lower.contains("available room");

        // Đặt phòng 1 chạm thông minh (Seamless 1-Click Booking) & Báo giá
        boolean hasBookingIntent = !isPolicyOrQuestion && !hasSearchIntent && (
                lower.contains("tôi muốn đặt") || lower.contains("đặt giúp") || lower.contains("đặt luôn")
                || lower.contains("đặt phòng") || lower.contains("book room") || lower.contains("book a room")
                || lower.contains("chuẩn bị đặt phòng") || lower.contains("tạo bản nháp")
                || lower.contains("bản nháp") || lower.contains("giữ phòng") || lower.contains("lấy phòng")
                || lower.contains("prepare booking") || lower.contains("preparebooking")
                || lower.contains("draft booking") || lower.contains("create draft")
                || lower.contains("đặt") || lower.contains("book") || lower.contains("thuê phòng")
        );

        boolean hasQuoteIntent = !isPolicyOrQuestion && !hasSearchIntent && (
                lower.contains("báo giá") || lower.contains("tính tiền")
                || lower.contains("giá bao nhiêu") || lower.contains("tổng tiền") || lower.contains("chi phí")
                || lower.contains("getbookingquote") || lower.contains("quote") || lower.contains("how much")
                || lower.contains("total cost")
        );

        if (!hasSearchIntent && (hasBookingIntent || hasQuoteIntent || (!isPolicyOrQuestion && (lower.contains("từ") || lower.contains("ngày")) && (lower.contains("đến") || lower.contains("tới") || lower.contains("-"))))) {
            // Trường hợp 1: Khách đã có quoteId cụ thể
            Matcher matcher = QUOTE_PATTERN.matcher(userMessage);
            if (matcher.find()) {
                String quoteId = matcher.group(1);
                ToolCallResult result = toolDispatcher.dispatch(ChatToolNames.PREPARE_BOOKING,
                        Map.of("quoteId", quoteId, "specialRequests", userMessage), authentication, sessionId);
                String replyText;
                if (isEnglish) {
                    if ("LOGIN_REQUIRED".equalsIgnoreCase(result.getCardType())) {
                        replyText = "Dear guest, to prepare your booking draft based on quote (" + quoteId + "), please kindly log in to your account on our website so the reservation details can be recorded properly.";
                    } else if (result.isSuccess()) {
                        replyText = "Your booking draft for quote [" + quoteId + "] has been prepared successfully. Please click 'Confirm & Pay Deposit' below to finalize your reservation via VNPay.";
                    } else {
                        replyText = result.getErrorMessage() != null ? result.getErrorMessage() : "Unable to prepare booking draft.";
                    }
                } else {
                    replyText = result.getSummaryMessage() != null ? result.getSummaryMessage() : result.getErrorMessage();
                }

                return ChatModelResult.builder()
                        .reply(replyText)
                        .cardType(result.getCardType())
                        .cardData(result.getCardData())
                        .provider(PROVIDER_NAME)
                        .model(MODEL_NAME)
                        .build();
            }

            // Trường hợp 2: Khách yêu cầu đặt phòng hoặc hỏi giá với ngày và số khách cụ thể
            List<LocalDate> dates = extractDates(userMessage);
            Long roomTypeId = detectRoomTypeId(lower);
            if (roomTypeId == null) {
                roomTypeId = 2L; // Mặc định Deluxe Double
            }
            int guests = detectGuests(lower, 2);
            int quantity = detectQuantity(lower, 1);

            if (dates.isEmpty()) {
                if (hasBookingIntent) {
                    return ChatModelResult.builder()
                            .reply(isEnglish
                                    ? "Grand Aurora Luxury Hotel is delighted to assist you with your reservation! Could you please let me know your intended check-in and check-out dates (e.g. from 15/11 to 17/11), along with the number of guests, so I can fill in the booking details and create your booking draft right away? 🛎️✨"
                                    : "Dạ Grand Aurora Luxury Hotel rất hân hạnh được hỗ trợ quý khách đặt phòng! Để em điền thông tin và tạo sẵn bản nháp đặt phòng cho mình ngay, quý khách vui lòng cho em biết ngày nhận phòng, ngày trả phòng (ví dụ: từ 15/11 đến 17/11) và số lượng khách đi cùng nhé! 🛎️✨")
                            .cardType("NONE")
                            .provider(PROVIDER_NAME)
                            .model(MODEL_NAME)
                            .build();
                }
            } else {
                LocalDate checkIn = dates.get(0);
                LocalDate checkOut = dates.size() >= 2 ? dates.get(1) : checkIn.plusDays(1);
                if (!checkOut.isAfter(checkIn)) {
                    checkOut = checkIn.plusDays(1);
                }

                Map<String, Object> quoteArgs = new HashMap<>();
                quoteArgs.put("roomTypeId", roomTypeId);
                quoteArgs.put("checkIn", checkIn.toString());
                quoteArgs.put("checkOut", checkOut.toString());
                quoteArgs.put("guests", guests);
                quoteArgs.put("quantity", quantity);

                ToolCallResult quoteResult = toolDispatcher.dispatch(ChatToolNames.GET_BOOKING_QUOTE, quoteArgs, authentication, sessionId);

                if (!quoteResult.isSuccess()) {
                    return ChatModelResult.builder()
                            .reply(quoteResult.getErrorMessage() != null ? quoteResult.getErrorMessage() : "Không thể tính báo giá cho ngày này.")
                            .cardType("NONE")
                            .provider(PROVIDER_NAME)
                            .model(MODEL_NAME)
                            .build();
                }

                // Nếu khách có ý định đặt phòng -> TỰ ĐỘNG CHUẨN BỊ BẢN NHÁP BOOKING DRAFT ĐIỀN ĐỦ THÔNG TIN
                if (hasBookingIntent && quoteResult.getCardData() instanceof org.example.backend.chat.dto.tools.BookingQuoteResponse quote) {
                    boolean isLoggedIn = authentication != null && authentication.isAuthenticated()
                            && !"anonymousUser".equalsIgnoreCase(authentication.getName());

                    if (isLoggedIn) {
                        ToolCallResult draftResult = toolDispatcher.dispatch(ChatToolNames.PREPARE_BOOKING,
                                Map.of("quoteId", quote.getQuoteId(), "specialRequests", userMessage), authentication, sessionId);

                        if (draftResult.isSuccess()) {
                            String replyText = isEnglish
                                    ? String.format("I have prepared your reservation details:\n• Room: %s (%d room(s))\n• Duration: From %s to %s (%d night(s))\n• Guests: %d guest(s)\n• Total: %,d VND\n• 50%% Online Deposit (VNPay): %,d VND\n\nPlease click 'Review Details & Pay Deposit' below to check your contact details and proceed to deposit payment! 🛎️✨",
                                    quote.getRoomTypeName(), quote.getQuantity(), quote.getCheckIn(), quote.getCheckOut(), quote.getNights(), quote.getGuests(), quote.getTotalPrice().longValue(), quote.getDepositAmount().longValue())
                                    : String.format("Dạ em đã điền đầy đủ thông tin đặt phòng cho quý khách:\n• Hạng phòng: %s (%d phòng)\n• Thời gian lưu trú: Từ %s đến %s (%d đêm)\n• Số lượng khách: %d người lớn\n• Tổng tiền: %,d VNĐ\n• Tiền đặt cọc trực tuyến 50%% qua VNPay: %,d VNĐ\n\nQuý khách vui lòng bấm nút **'Kiểm tra thông tin & Đặt cọc'** trên thẻ bên dưới để chuyển sang trang xác nhận thông tin lưu trú và tiến hành thanh toán cọc nhé! 🛎️✨",
                                    quote.getRoomTypeName(), quote.getQuantity(), quote.getCheckIn(), quote.getCheckOut(), quote.getNights(), quote.getGuests(), quote.getTotalPrice().longValue(), quote.getDepositAmount().longValue());

                            return ChatModelResult.builder()
                                    .reply(replyText)
                                    .cardType(draftResult.getCardType())
                                    .cardData(draftResult.getCardData())
                                    .provider(PROVIDER_NAME)
                                    .model(MODEL_NAME)
                                    .build();
                        }
                    } else {
                        // Khách chưa đăng nhập: Trả về quote kèm LOGIN_REQUIRED & link đặt trực tiếp
                        String checkoutUrl = String.format("/booking/checkout?roomTypeId=%d&checkIn=%s&checkOut=%s&guests=%d&quantity=%d",
                                quote.getRoomTypeId() != null ? quote.getRoomTypeId() : 2L,
                                quote.getCheckIn() != null ? quote.getCheckIn().toString() : "",
                                quote.getCheckOut() != null ? quote.getCheckOut().toString() : "",
                                quote.getGuests(),
                                quote.getQuantity());

                        String replyText = isEnglish
                                ? String.format("I have prepared all booking details for **%s**:\n• Duration: From %s to %s (%d night(s))\n• Guests: %d guest(s)\n• Total: %,d VND\n• 50%% Online Deposit: %,d VND\n\nPlease click **'Log in now'** below so our system can save your reservation and proceed directly to VNPay deposit payment! Alternatively, you can book directly via [Guest Checkout](%s). 🛎️✨",
                                quote.getRoomTypeName(), quote.getCheckIn(), quote.getCheckOut(), quote.getNights(), quote.getGuests(), quote.getTotalPrice().longValue(), quote.getDepositAmount().longValue(), checkoutUrl)
                                : String.format("Dạ em đã chuẩn bị đầy đủ thông tin đặt phòng cho quý khách (**%s**):\n• Thời gian lưu trú: Từ %s đến %s (%d đêm)\n• Số lượng khách: %d người lớn\n• Tổng tiền: %,d VNĐ\n• Tiền đặt cọc trực tuyến 50%% qua VNPay: %,d VNĐ\n\nQuý khách vui lòng bấm nút **'Đăng nhập ngay'** bên dưới để hệ thống ghi nhận tài khoản và chuyển thẳng sang cổng thanh toán cọc VNPay nhé! Hoặc quý khách cũng có thể đặt trực tiếp qua [Trang điền thông tin đặt phòng](%s) ạ! 🛎️✨",
                                quote.getRoomTypeName(), quote.getCheckIn(), quote.getCheckOut(), quote.getNights(), quote.getGuests(), quote.getTotalPrice().longValue(), quote.getDepositAmount().longValue(), checkoutUrl);

                        Map<String, Object> loginData = new HashMap<>();
                        loginData.put("message", "Vui lòng đăng nhập để hoàn tất đặt phòng");
                        loginData.put("quoteId", quote.getQuoteId() != null ? quote.getQuoteId() : "");
                        loginData.put("roomTypeId", quote.getRoomTypeId());
                        loginData.put("roomTypeName", quote.getRoomTypeName());
                        loginData.put("checkIn", quote.getCheckIn() != null ? quote.getCheckIn().toString() : "");
                        loginData.put("checkOut", quote.getCheckOut() != null ? quote.getCheckOut().toString() : "");
                        loginData.put("nights", quote.getNights());
                        loginData.put("guests", quote.getGuests());
                        loginData.put("quantity", quote.getQuantity());
                        loginData.put("totalPrice", quote.getTotalPrice());
                        loginData.put("depositAmount", quote.getDepositAmount());
                        loginData.put("checkoutUrl", checkoutUrl);

                        return ChatModelResult.builder()
                                .reply(replyText)
                                .cardType("LOGIN_REQUIRED")
                                .cardData(loginData)
                                .provider(PROVIDER_NAME)
                                .model(MODEL_NAME)
                                .build();
                    }
                }

                // Nếu khách chỉ hỏi báo giá đơn thuần
                String replyText;
                if (quoteResult.getCardData() instanceof org.example.backend.chat.dto.tools.BookingQuoteResponse quote) {
                    replyText = isEnglish
                            ? String.format("Booking Quotation [Code: %s]:\n• Room: %s (%d room(s))\n• Duration: From %s to %s (%d night(s))\n• Guests: %d guest(s)\n• Rate: %,d VND / night\n• Total: %,d VND\n• Online deposit (50%% via VNPay): %,d VND\n(Note: This quote is valid for 15 minutes and does not hold the room. Please log in and confirm your booking).",
                            quote.getQuoteId(), quote.getRoomTypeName(), quote.getQuantity(), quote.getCheckIn(), quote.getCheckOut(), quote.getNights(), quote.getGuests(), quote.getPricePerNight().longValue(), quote.getTotalPrice().longValue(), quote.getDepositAmount().longValue())
                            : String.format("Báo giá đặt phòng [Mã: %s]:\n• Hạng phòng: %s (%d phòng)\n• Thời gian: Từ %s đến %s (%d đêm)\n• Số khách: %d người\n• Đơn giá: %,d VNĐ/đêm\n• Tổng tiền: %,d VNĐ\n• Tiền cọc trực tuyến 50%% qua VNPay: %,d VNĐ\n(Lưu ý: Báo giá này có hiệu lực trong 15 phút và chưa giữ phòng. Quý khách vui lòng đăng nhập và xác nhận để đặt phòng).",
                            quote.getQuoteId(), quote.getRoomTypeName(), quote.getQuantity(), quote.getCheckIn(), quote.getCheckOut(), quote.getNights(), quote.getGuests(), quote.getPricePerNight().longValue(), quote.getTotalPrice().longValue(), quote.getDepositAmount().longValue());
                } else {
                    replyText = quoteResult.getSummaryMessage() != null ? quoteResult.getSummaryMessage() : quoteResult.getErrorMessage();
                }

                return ChatModelResult.builder()
                        .reply(replyText)
                        .cardType(quoteResult.getCardType())
                        .cardData(quoteResult.getCardData())
                        .provider(PROVIDER_NAME)
                        .model(MODEL_NAME)
                        .build();
            }
        }

        // Tool 2: getRoomTypeDetails
        if (lower.contains("chi tiết") || lower.contains("tiện nghi") || lower.contains("mô tả")
                || lower.contains("phòng có gì") || lower.contains("getroomtypedetails")
                || lower.contains("details of") || lower.contains("amenities of") || lower.contains("room details")) {

            Long roomTypeId = detectRoomTypeId(lower);
            if (roomTypeId != null) {
                ToolCallResult result = toolDispatcher.dispatch(ChatToolNames.GET_ROOM_TYPE_DETAILS,
                        Map.of("roomTypeId", roomTypeId), authentication, sessionId);
                String replyText;
                if (isEnglish && result.isSuccess() && result.getCardData() instanceof org.example.backend.chat.dto.tools.RoomOptionItem item) {
                    replyText = String.format("Room Details - %s (ID: %d):\n• Base rate: %,d VND / night\n• Capacity: %d guest(s)\n• Description: %s\n• Amenities: %s\n• Included: Daily buffet breakfast, Infinity Rooftop Pool, and 24/7 Gym access.",
                            item.getName(), item.getRoomTypeId(), item.getBasePrice().longValue(), item.getCapacity(),
                            item.getDescription() != null ? item.getDescription() : "Luxury 5-star accommodation",
                            item.getAmenities() != null ? String.join(", ", item.getAmenities()) : "High-speed Wi-Fi, air conditioning, modern bathroom");
                } else {
                    replyText = result.getSummaryMessage() != null ? result.getSummaryMessage() : result.getErrorMessage();
                }

                return ChatModelResult.builder()
                        .reply(replyText)
                        .cardType(result.getCardType())
                        .cardData(result.getCardData())
                        .provider(PROVIDER_NAME)
                        .model(MODEL_NAME)
                        .build();
            }
        }

        // Tool 1: searchAvailableRooms
        if (lower.contains("tìm phòng") || lower.contains("tra phòng") || lower.contains("còn phòng")
                || lower.contains("kiểm tra phòng") || lower.contains("searchavailablerooms")
                || lower.contains("có phòng không") || lower.contains("phòng trống") || lower.contains("có phòng")
                || lower.contains("available room") || lower.contains("search room") || lower.contains("find room")
                || lower.contains("check available") || lower.contains("vacancy") || lower.contains("vacancies")) {

            List<LocalDate> dates = extractDates(userMessage);

            // Xử lý từ khóa ngày tự nhiên: "hôm nay", "ngày mai", "today", "tomorrow"
            if (dates.isEmpty()) {
                if (lower.contains("hôm nay") || lower.contains("today")) {
                    dates.add(LocalDate.now());
                    dates.add(LocalDate.now().plusDays(1));
                } else if (lower.contains("ngày mai") || lower.contains("mai") || lower.contains("tomorrow")) {
                    dates.add(LocalDate.now().plusDays(1));
                    dates.add(LocalDate.now().plusDays(2));
                }
            }

            // Tiêu chí nghiệm thu: "Thiếu ngày/số khách thì hỏi lại; không bịa dữ liệu"
            if (dates.isEmpty()) {
                return ChatModelResult.builder()
                        .reply(isEnglish
                                ? "Dear guest, to accurately check available rooms and live rates from our hotel database, please kindly provide: Check-in date, Check-out date (e.g. YYYY-MM-DD), and the number of guests!"
                                : "Dạ thưa quý khách, để em tra cứu chính xác số lượng phòng trống và giá thời gian thực từ cơ sở dữ liệu khách sạn, quý khách vui lòng cung cấp: Ngày nhận phòng (check-in), ngày trả phòng (check-out) và số lượng khách dự kiến lưu trú nhé ạ!")
                        .cardType("NONE")
                        .provider(PROVIDER_NAME)
                        .model(MODEL_NAME)
                        .build();
            }

            LocalDate checkIn = dates.get(0);
            LocalDate checkOut = dates.size() >= 2 ? dates.get(1) : checkIn.plusDays(1);
            int guests = detectGuests(lower, 2);
            Long roomTypeId = detectRoomTypeId(lower);

            Map<String, Object> searchArgs = new HashMap<>();
            searchArgs.put("checkIn", checkIn.toString());
            searchArgs.put("checkOut", checkOut.toString());
            searchArgs.put("guests", guests);
            if (roomTypeId != null) {
                searchArgs.put("roomTypeId", roomTypeId);
            }

            ToolCallResult result = toolDispatcher.dispatch(ChatToolNames.SEARCH_AVAILABLE_ROOMS, searchArgs, authentication, sessionId);
            String replyText;
            if (isEnglish) {
                if (result.getCardData() instanceof List<?> list && !list.isEmpty()) {
                    StringBuilder sb = new StringBuilder(String.format("Available room results from %s to %s for %d guest(s):\n", checkIn, checkOut, guests));
                    for (Object obj : list) {
                        if (obj instanceof org.example.backend.chat.dto.tools.RoomOptionItem item) {
                            sb.append(String.format("• %s (ID: %d): Rate %,d VND / night | Capacity: %d guest(s) | %d available room(s)\n",
                                    item.getName(), item.getRoomTypeId(), item.getBasePrice().longValue(), item.getCapacity(), item.getAvailableRooms()));
                        }
                    }
                    replyText = sb.toString();
                } else {
                    replyText = String.format("We apologize, but there are no available rooms for %d guest(s) from %s to %s.", guests, checkIn, checkOut);
                }
            } else {
                replyText = result.getSummaryMessage() != null ? result.getSummaryMessage() : result.getErrorMessage();
            }

            return ChatModelResult.builder()
                    .reply(replyText)
                    .cardType(result.getCardType())
                    .cardData(result.getCardData())
                    .provider(PROVIDER_NAME)
                    .model(MODEL_NAME)
                    .build();
        }

        // 5. Câu hỏi thông tin chung (Check-in/Check-out, buffet, địa chỉ, hotline...)
        String text = generateContentWithHistory(userMessage, systemPrompt, history);
        return ChatModelResult.builder()
                .reply(text)
                .cardType("NONE")
                .provider(PROVIDER_NAME)
                .model(MODEL_NAME)
                .build();
    }

    @Override
    public String generateContentWithHistory(String userMessage, String systemPrompt, List<ChatMessage> history) {
        log.info("[GeminiStubClient] generateContentWithHistory: [{}]", userMessage);

        boolean isEnglish = HotelPromptManager.isEnglishText(userMessage);

        if (userMessage == null || userMessage.isBlank()) {
            return isEnglish
                    ? "Hello! Welcome to Grand Aurora Luxury Hotel. How may I assist you with your stay today?"
                    : "Dạ chào quý khách! Em có thể giúp gì cho kỳ nghỉ dưỡng của quý khách tại Grand Aurora Luxury Hotel?";
        }

        String lower = userMessage.toLowerCase(Locale.ROOT);

        if (promptManager.isOutOfScope(userMessage)) {
            return promptManager.getOutOfScopeRefusalMessage(isEnglish);
        }

        if (promptManager.isUnauthorizedActionRequest(userMessage)) {
            return promptManager.getUnauthorizedActionMessage(isEnglish);
        }

        if (promptManager.isBookingOrPaymentConfirmationInquiry(userMessage)) {
            return promptManager.getBookingOrPaymentGuidanceMessage(isEnglish);
        }

        if (promptManager.isAvailabilityInquiry(userMessage)) {
            return promptManager.getAvailabilityGuidanceMessage(isEnglish);
        }

        // 0. Thời gian thực tế & Ngày tháng hiện tại (Dynamic Real-time Date/Time)
        if (isCurrentTimeOrDateInquiry(lower)) {
            return formatCurrentTimeOrDate(isEnglish);
        }

        // 0.1. Thời tiết & Khí hậu du lịch (Weather & Coastal Climate)
        if (isWeatherInquiry(lower)) {
            return formatWeatherResponse(lower, isEnglish);
        }

        // 0.2. Chào hỏi & Nhận diện Lễ tân (Greeting & Virtual Concierge Identity)
        if (isGreetingOrIdentity(lower)) {
            return formatGreetingResponse(isEnglish);
        }

        // 0.3. Lời cảm ơn & Khen ngợi (Gratitude & Compliments)
        if (isThanksOrPraise(lower)) {
            return formatThanksResponse(isEnglish);
        }

        // 0.4. Di chuyển, Sân bay & Bãi đỗ xe (Airport & Transportation)
        if (isAirportOrTransportationInquiry(lower)) {
            return formatAirportResponse(isEnglish);
        }

        // 0.5. Ẩm thực, Hải sản & Đặc sản địa phương (Food & Seafood Dining)
        if (isFoodOrLocalDiningInquiry(lower)) {
            return formatDiningResponse(isEnglish);
        }

        // 0.6. Cầu Rồng & Điểm du lịch tham quan (Dragon Bridge & Sightseeing)
        if (isSightseeingInquiry(lower)) {
            return formatSightseeingResponse(isEnglish);
        }

        // 0.7. Nhu cầu gia đình, cũi em bé, thú cưng, kỷ niệm (Family, Pet & Special Events)
        if (isFamilyPetOrEventInquiry(lower)) {
            return formatFamilyPetOrEventResponse(isEnglish);
        }

        // Giờ nhận / trả phòng (Check-in 14:00, Check-out 12:00)
        if (lower.contains("giờ nhận phòng") || lower.contains("giờ trả phòng")
                || lower.contains("giờ check-in") || lower.contains("giờ checkin")
                || lower.contains("giờ check-out") || lower.contains("giờ checkout")
                || lower.contains("mấy giờ nhận phòng") || lower.contains("mấy giờ trả phòng")
                || lower.contains("mấy giờ thì nhận phòng")
                || lower.contains("nhận phòng lúc mấy giờ") || lower.contains("trả phòng lúc mấy giờ")
                || lower.contains("nhận phòng") || lower.contains("trả phòng")
                || lower.contains("check-in") || lower.contains("check in")
                || lower.contains("check-out") || lower.contains("check out")
                || lower.contains("check in time") || lower.contains("checkout time")) {
            if (isEnglish) {
                return "Standard check-in time at Grand Aurora Luxury Hotel is from 14:00 (2:00 PM) and check-out is before 12:00 (12:00 PM). " +
                        "Complimentary luggage storage is available at the front desk 24/7 if you arrive prior to 14:00.";
            }
            return "Thời gian nhận phòng (Check-in) tiêu chuẩn tại Grand Aurora là từ 14:00 chiều và trả phòng (Check-out) trước 12:00 trưa hôm sau. " +
                    "Nếu quý khách đến sớm hơn 14:00, khách sạn có hỗ trợ gửi hành lý hoàn toàn miễn phí tại quầy lễ tân tầng 1.";
        }

        // Bữa sáng Buffet & Tiện ích
        if (lower.contains("ăn sáng") || lower.contains("buffet") || lower.contains("tiện ích")
                || lower.contains("bể bơi") || lower.contains("hồ bơi") || lower.contains("gym")
                || lower.contains("breakfast") || lower.contains("pool") || lower.contains("amenities")) {
            if (isEnglish) {
                return "All room reservations at Grand Aurora include: Daily international breakfast buffet from 06:30 - 09:30 at Aurora Restaurant (2nd floor), " +
                        "complimentary access to our Infinity Rooftop Pool, and 24/7 modern Fitness Center.";
            }
            return "Tất cả các đơn đặt phòng tại Grand Aurora đều đã bao gồm: Bữa sáng Buffet tự chọn hàng ngày từ 06:30 - 09:30 tại nhà hàng Aurora (tầng 2), " +
                    "miễn phí sử dụng hồ bơi vô cực trên tầng thượng (Infinity Rooftop Pool) và phòng tập Gym hiện đại 24/7.";
        }

        // Chính sách cọc 50% VNPay & Hoàn hủy tính theo mốc 14:00
        if (lower.contains("hủy") || lower.contains("cọc") || lower.contains("chính sách")
                || lower.contains("hoàn tiền") || lower.contains("vnpay") || lower.contains("thanh toán")
                || lower.contains("cancellation") || lower.contains("deposit") || lower.contains("refund")
                || lower.contains("policy")) {
            if (isEnglish) {
                return "Deposit & Cancellation Policy at Grand Aurora Luxury Hotel (based on standard 14:00 check-in):\n" +
                        "• Online Deposit: A 50% deposit via VNPay is required to secure your room; the remaining 50% is paid at the front desk upon check-out.\n" +
                        "• Cancellation schedule relative to 14:00 on check-in date:\n" +
                        "  - Cancellation >= 24 hours prior to 14:00: 100% refund of deposit (Free cancellation).\n" +
                        "  - Cancellation 12 to 24 hours prior to 14:00: 30% penalty, 70% refund of deposit.\n" +
                        "  - Cancellation < 12 hours prior to 14:00 (or No-Show): 50% penalty (deposit is non-refundable).";
            }
            return "Chính sách đặt cọc VNPay & hoàn hủy theo mốc 14:00 của Grand Aurora:\n" +
                    "• Đặt cọc trực tuyến: Quý khách cọc trước 50% tổng giá trị đơn qua cổng thanh toán VNPay khi giữ phòng; 50% còn lại thanh toán tại quầy khi trả phòng.\n" +
                    "• Mốc giờ Check-in là 14:00 của ngày nhận phòng:\n" +
                    "  - Hủy trước >= 24h so với mốc 14:00: Hoàn lại 100% tiền cọc (miễn phí hủy).\n" +
                    "  - Hủy từ 12h đến 24h trước mốc 14:00: Phạt 30% tiền cọc, hoàn lại 70%.\n" +
                    "  - Hủy dưới 12h trước mốc 14:00 (hoặc vắng mặt No-Show): Phạt 50% tiền cọc (không hoàn cọc).";
        }

        // Địa chỉ & Hotline liên hệ
        if (lower.contains("địa chỉ") || lower.contains("vị trí") || lower.contains("hotline")
                || lower.contains("liên hệ") || lower.contains("ở đâu")
                || lower.contains("address") || lower.contains("location") || lower.contains("contact")
                || lower.contains("phone")) {
            if (isEnglish) {
                return "Grand Aurora Luxury Hotel is situated in a prime beachfront location: 01 Vo Nguyen Giap Street, Phuoc My Ward, Son Tra District, Da Nang City (right on My Khe Beach).\n" +
                        "24/7 Concierge Hotline: 1900 888 888 | Email: contact@grandaurora.com.";
            }
            return "Khách sạn Grand Aurora Luxury tọa lạc tại vị trí đắc địa: 01 Võ Nguyên Giáp, Phường Phước Mỹ, Quận Sơn Trà, TP. Đà Nẵng (sát bãi biển Mỹ Khê).\n" +
                    "Hotline hỗ trợ 24/7: 1900 888 888 | Email: contact@grandaurora.com.";
        }

        // Xem lịch sử đặt phòng / Đơn đặt phòng cá nhân (Booking History)
        if (lower.contains("lịch sử đặt") || lower.contains("lịch sử phòng") || lower.contains("đơn đặt của tôi")
                || lower.contains("đơn đặt phòng của tôi") || lower.contains("booking history")
                || lower.contains("my booking") || lower.contains("my bookings")) {
            if (isEnglish) {
                return "Dear guest, you can review your complete reservation details under 'Booking History' (/my-bookings) on our website.";
            }
            return "Dạ để kiểm tra toàn bộ thông tin các đơn đặt phòng của mình, quý khách có thể bấm ngay vào mục **\"Lịch sử đặt\"** (/my-bookings) trên thanh menu của website ạ!";
        }

        // Danh sách phòng & Giá niêm yết công khai
        if (lower.contains("phòng") || lower.contains("giá") || lower.contains("loại") || lower.contains("room")
                || lower.contains("rate") || lower.contains("rates")) {
            if (isEnglish) {
                return "Grand Aurora Luxury Hotel currently features 3 premier room categories (reference rates):\n" +
                        "1. Standard Single Room: 500,000 VND / night (1 adult, modern walk-in shower).\n" +
                        "2. Deluxe Double Room: 950,000 VND / night (2 adults, private balcony with My Khe beach view).\n" +
                        "3. Executive Suite Luxury: 1,800,000 VND / night (4 adults, 2-bedroom suite, ocean panorama).\n\n" +
                        "Please visit our 'Explore Rooms' page on the website to check live availability and place a 50% deposit via VNPay!";
            }
            return "Khách sạn Grand Aurora Luxury hiện cung cấp 3 hạng phòng tiêu chuẩn 5 sao quốc tế (giá niêm yết tham khảo):\n" +
                    "1. Standard Single Room: 500.000 VNĐ / đêm (1 người lớn, tiện nghi hiện đại).\n" +
                    "2. Deluxe Double Room: 950.000 VNĐ / đêm (2 người lớn, ban công riêng view biển Mỹ Khê).\n" +
                    "3. Executive Suite Luxury: 1.800.000 VNĐ / đêm (4 người lớn, căn hộ 2 phòng ngủ, bồn tắm view bán đảo Sơn Trà).\n\n" +
                    "Để kiểm tra chính xác số lượng phòng trống và nhận giá ưu đãi theo ngày lưu trú cụ thể của quý khách, xin vui lòng truy cập trang 'Tra cứu & Tìm phòng' trên website để đặt cọc 50% qua VNPay ạ!";
        }

        if (isEnglish) {
            return "Welcome to Grand Aurora Luxury Hotel! I am your 5-star Virtual Concierge. " +
                    "You may ask me about live room availability, room amenities, booking quotations, or our 50% VNPay deposit and cancellation policies. How may I assist you today?";
        }

        return "Dạ Grand Aurora xin chào quý khách! Em là Trợ lý ảo Lễ tân của khách sạn. " +
                "Quý khách có thể hỏi em về: tra cứu phòng trống theo ngày, xem tiện nghi loại phòng, tính báo giá đặt phòng, hoặc chính sách cọc 50% VNPay và hoàn hủy phòng ạ!";
    }

    private String formatAllRoomTypesEnglish(ToolCallResult result) {
        if (result.getCardData() instanceof List<?> list && !list.isEmpty()) {
            StringBuilder sb = new StringBuilder("Grand Aurora Luxury Hotel currently offers the following 5-star room categories:\n");
            for (Object obj : list) {
                if (obj instanceof org.example.backend.chat.dto.tools.RoomOptionItem item) {
                    sb.append(String.format("• %s (ID: %d): Rate %,d VND / night | Capacity: %d guest(s)\n",
                            item.getName(), item.getRoomTypeId(), item.getBasePrice().longValue(), item.getCapacity()));
                }
            }
            sb.append("\nComplimentary amenities: Daily international breakfast buffet (06:30 - 09:30), Infinity Rooftop Pool, and 24/7 Fitness Center.");
            return sb.toString();
        }
        return "Grand Aurora Luxury Hotel currently features 3 premier room categories (reference rates):\n" +
                "1. Standard Single Room: 500,000 VND / night (1 adult, modern walk-in shower).\n" +
                "2. Deluxe Double Room: 950,000 VND / night (2 adults, private balcony with My Khe beach view).\n" +
                "3. Executive Suite Luxury: 1,800,000 VND / night (4 adults, 2-bedroom suite, ocean panorama).\n\n" +
                "All rates include daily buffet breakfast, rooftop pool, and 24/7 gym access.";
    }

    @Override
    public String getProviderName() {
        return PROVIDER_NAME;
    }

    @Override
    public String getModelName() {
        return MODEL_NAME;
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    // ────────────────────────────────────────────────────────────────
    // TIỆN ÍCH TRÍCH XUẤT INTENT TỰ NHIÊN CHO PROVIDER STUB
    // ────────────────────────────────────────────────────────────────

    private List<LocalDate> extractDates(String message) {
        List<LocalDate> dates = new ArrayList<>();
        if (message == null || message.isBlank()) return dates;

        LocalDate today = LocalDate.now();
        int currentYear = today.getYear();
        String lower = message.toLowerCase(Locale.ROOT);

        // Ngày tương đối:
        if (lower.contains("hôm nay") || lower.contains("today")) {
            dates.add(today);
        }
        if (lower.contains("ngày mai") || lower.contains("mai") || lower.contains("tomorrow")) {
            dates.add(today.plusDays(1));
        }
        if (lower.contains("ngày kia") || lower.contains("ngày mốt") || lower.contains("mốt")) {
            dates.add(today.plusDays(2));
        }

        // Dạng 1: YYYY-MM-DD
        Matcher matcherIso = DATE_PATTERN.matcher(message);
        while (matcherIso.find()) {
            try {
                LocalDate d = LocalDate.parse(matcherIso.group(1));
                if (!dates.contains(d)) dates.add(d);
            } catch (Exception ignored) {}
        }

        // Dạng 2: dd/MM/yyyy hoặc dd-MM-yyyy
        Matcher matcherFull = Pattern.compile("(\\d{1,2})[/-](\\d{1,2})[/-](\\d{4})").matcher(message);
        while (matcherFull.find()) {
            try {
                int day = Integer.parseInt(matcherFull.group(1));
                int month = Integer.parseInt(matcherFull.group(2));
                int year = Integer.parseInt(matcherFull.group(3));
                LocalDate d = LocalDate.of(year, month, day);
                if (!dates.contains(d)) dates.add(d);
            } catch (Exception ignored) {}
        }

        // Dạng 3: dd/MM hoặc dd-MM (tự gán năm hiện tại)
        Matcher matcherShort = Pattern.compile("(\\d{1,2})[/-](\\d{1,2})(?![/-]\\d{2,4})").matcher(message);
        while (matcherShort.find()) {
            try {
                int day = Integer.parseInt(matcherShort.group(1));
                int month = Integer.parseInt(matcherShort.group(2));
                if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    LocalDate d = LocalDate.of(currentYear, month, day);
                    if (d.isBefore(today)) {
                        d = d.plusYears(1);
                    }
                    if (!dates.contains(d)) dates.add(d);
                }
            } catch (Exception ignored) {}
        }

        // Dạng 4: (ngày) X đến (ngày) Y tháng Z
        Matcher matcherVnText = Pattern.compile("(?:ngày\\s*)?(\\d{1,2})\\s*(?:đến|-|tới)\\s*(?:ngày\\s*)?(\\d{1,2})\\s*tháng\\s*(\\d{1,2})").matcher(lower);
        if (matcherVnText.find()) {
            try {
                int day1 = Integer.parseInt(matcherVnText.group(1));
                int day2 = Integer.parseInt(matcherVnText.group(2));
                int month = Integer.parseInt(matcherVnText.group(3));
                LocalDate d1 = LocalDate.of(currentYear, month, day1);
                LocalDate d2 = LocalDate.of(currentYear, month, day2);
                if (!dates.contains(d1)) dates.add(d1);
                if (!dates.contains(d2)) dates.add(d2);
            } catch (Exception ignored) {}
        }

        // Dạng 5: (từ) (ngày) X đến/tới/- (ngày) Y/M/(yyyy) (ví dụ: "từ ngày 14 tới ngày 17/11/2026", "từ 14 đến 17/11", "14 - 17/11/2026")
        Matcher matcherRange = Pattern.compile("(?:từ\\s*)?(?:ngày\\s*)?(\\d{1,2})\\s*(?:đến|-|tới|qua)\\s*(?:ngày\\s*)?(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{4}))?").matcher(lower);
        if (matcherRange.find()) {
            try {
                int day1 = Integer.parseInt(matcherRange.group(1));
                int day2 = Integer.parseInt(matcherRange.group(2));
                int month = Integer.parseInt(matcherRange.group(3));
                String yearGroup = matcherRange.group(4);
                int year = (yearGroup != null && !yearGroup.isBlank()) ? Integer.parseInt(yearGroup) : currentYear;
                if (month >= 1 && month <= 12 && day1 >= 1 && day1 <= 31 && day2 >= 1 && day2 <= 31) {
                    LocalDate d1 = LocalDate.of(year, month, day1);
                    LocalDate d2 = LocalDate.of(year, month, day2);
                    if (d1.isBefore(today) && yearGroup == null) {
                        d1 = d1.plusYears(1);
                        d2 = d2.plusYears(1);
                    }
                    if (!dates.contains(d1)) dates.add(d1);
                    if (!dates.contains(d2)) dates.add(d2);
                }
            } catch (Exception ignored) {}
        }

        dates.sort(LocalDate::compareTo);
        return dates;
    }

    private Long detectRoomTypeId(String lower) {
        if (lower.contains("executive") || lower.contains("suite") || lower.contains("hạng 3") || lower.contains("loại 3") || lower.contains("roomtypeid: 3") || lower.contains("roomtypeid 3")) {
            return 3L;
        }
        if (lower.contains("deluxe") || lower.contains("hạng 2") || lower.contains("loại 2") || lower.contains("roomtypeid: 2") || lower.contains("roomtypeid 2")) {
            return 2L;
        }
        if (lower.contains("standard") || lower.contains("single") || lower.contains("hạng 1") || lower.contains("loại 1") || lower.contains("roomtypeid: 1") || lower.contains("roomtypeid 1")) {
            return 1L;
        }
        return null;
    }

    private int detectGuests(String lower, int defaultGuests) {
        Pattern pattern = Pattern.compile("(\\d+)\\s*(khách|người|nguoi|pax|guest|guests|adult|adults|person|people)");
        Matcher matcher = pattern.matcher(lower);
        if (matcher.find()) {
            try {
                return Integer.parseInt(matcher.group(1));
            } catch (Exception ignored) {
            }
        }
        return defaultGuests;
    }

    private int detectQuantity(String lower, int defaultQty) {
        Pattern pattern = Pattern.compile("(\\d+)\\s*(phòng|phong|room|rooms)");
        Matcher matcher = pattern.matcher(lower);
        if (matcher.find()) {
            try {
                return Integer.parseInt(matcher.group(1));
            } catch (Exception ignored) {
            }
        }
        return defaultQty;
    }

    private boolean isCurrentTimeOrDateInquiry(String lower) {
        return lower.contains("mấy giờ rồi")
                || lower.contains("bây giờ là mấy giờ")
                || lower.contains("bây giờ mấy giờ")
                || lower.contains("hiện tại là mấy giờ")
                || lower.contains("xem giờ")
                || lower.contains("thời gian hiện tại")
                || lower.contains("mấy giờ thế")
                || lower.contains("mấy giờ r")
                || lower.contains("what time is it")
                || lower.contains("current time")
                || lower.contains("what's the time")
                || lower.contains("hôm nay thứ mấy")
                || lower.contains("hôm nay là thứ mấy")
                || lower.contains("hôm nay ngày mấy")
                || lower.contains("hôm nay ngày bao nhiêu")
                || lower.contains("hôm nay là ngày")
                || lower.contains("ngày hôm nay")
                || lower.contains("bữa nay thứ mấy")
                || lower.contains("what day is it")
                || lower.contains("what day is today")
                || lower.contains("today's date")
                || lower.contains("what is today's date");
    }

    private String formatCurrentTimeOrDate(boolean isEnglish) {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");

        if (isEnglish) {
            String dayOfWeekEn = now.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
            return String.format("Today is %s, %s (current time: %s, Vietnam Time GMT+7). Grand Aurora Luxury Hotel in Da Nang wishes you a pleasant day! How may I assist you with your booking or stay?",
                    dayOfWeekEn, now.format(dateFormatter), now.format(timeFormatter));
        }

        String dayOfWeekVi = switch (now.getDayOfWeek()) {
            case MONDAY -> "Thứ Hai";
            case TUESDAY -> "Thứ Ba";
            case WEDNESDAY -> "Thứ Tư";
            case THURSDAY -> "Thứ Năm";
            case FRIDAY -> "Thứ Sáu";
            case SATURDAY -> "Thứ Bảy";
            case SUNDAY -> "Chủ Nhật";
        };

        return String.format("Dạ hôm nay là %s, ngày %s, hiện tại là %s (Giờ Việt Nam GMT+7). Grand Aurora Luxury Hotel tại bãi biển Đà Nẵng chúc quý khách một ngày thật nhiều niềm vui! Quý khách có dự định lưu trú tại khách sạn trong thời gian tới không ạ, em có thể hỗ trợ tra cứu phòng giúp mình nhé?",
                dayOfWeekVi, now.format(dateFormatter), now.format(timeFormatter));
    }

    private boolean isWeatherInquiry(String lower) {
        return lower.contains("thời tiết")
                || lower.contains("mưa không")
                || lower.contains("có mưa")
                || lower.contains("trời mưa")
                || lower.contains("trời nắng")
                || lower.contains("nhiệt độ")
                || lower.contains("khí hậu")
                || lower.contains("weather")
                || lower.contains("forecast")
                || lower.contains("climate")
                || lower.contains("temperature")
                || lower.contains("raining")
                || lower.contains("sunny");
    }

    private String formatWeatherResponse(boolean isEnglish) {
        return formatWeatherResponse("", isEnglish);
    }

    private String formatWeatherResponse(String lower, boolean isEnglish) {
        if (lower != null && (lower.contains("hà nội") || lower.contains("hanoi") || lower.contains("ha noi"))) {
            if (isEnglish) {
                return "Currently in Hanoi, the autumn/early winter weather is pleasantly cool with mild breezes and temperatures around 19°C - 24°C (chilly at night). If you are planning a trip from Hanoi to Da Nang, our coastal city offers delightfully warm sunshine and refreshing sea breezes around 25°C - 28°C, perfect for a relaxing getaway at Grand Aurora Luxury Hotel! Would you like me to recommend our premier ocean-view rooms or airport pickup service? 🌊🛎️";
            }
            return "Dạ thời tiết tại Hà Nội mùa này (tháng 11) đang vào đầu đông se se lạnh, ban ngày mát mẻ có nắng nhẹ khoảng 20°C - 24°C, đêm và sáng sớm nhiệt độ giảm xuống khoảng 17°C - 19°C. Nếu quý khách đang chuẩn bị bay từ Hà Nội vào Đà Nẵng nghỉ dưỡng thì thời tiết Đà Nẵng hiện tại rất đẹp và nắng ấm (25°C - 28°C), biển Mỹ Khê trong lành rất lý tưởng để tắm biển và thư giãn tại Grand Aurora Luxury Hotel ạ! Quý khách cần em tư vấn thêm về các hạng phòng hoặc dịch vụ đón tiễn sân bay không ạ? 🌊🛎️";
        }

        if (lower != null && (lower.contains("sài gòn") || lower.contains("hồ chí minh") || lower.contains("saigon") || lower.contains("hcm"))) {
            if (isEnglish) {
                return "The weather in Ho Chi Minh City is typically tropical and warm around 28°C - 33°C. Direct flights from Tan Son Nhat to Da Nang International Airport take only about 1 hour 15 minutes. Grand Aurora Luxury Hotel is located just 6km from the airport right by My Khe Beach. We look forward to welcoming you! 🏖️✨";
            }
            return "Dạ thời tiết TP. Hồ Chí Minh hiện tại nắng ấm đặc trưng phương Nam, nhiệt độ dao động từ 28°C - 33°C. Các chuyến bay từ Tân Sơn Nhất đến Sân bay Quốc tế Đà Nẵng chỉ mất khoảng 1 giờ 15 phút. Khách sạn Grand Aurora cách sân bay Đà Nẵng chỉ 6km (~12 phút taxi) thẳng ra biển Mỹ Khê. Rất hân hạnh được đón tiếp quý khách đến nghỉ dưỡng ạ! 🏖️✨";
        }

        if (lower != null && (lower.contains("bà nà") || lower.contains("bana") || lower.contains("hội an") || lower.contains("sơn trà"))) {
            if (isEnglish) {
                return "The weather around Da Nang, Hoi An, and Ba Na Hills is wonderfully mild and scenic. On top of Ba Na Hills, it is noticeably cooler (around 18°C - 20°C with romantic mountain mists, so a light jacket is recommended). Grand Aurora Luxury Hotel is ideally situated for day trips to both destinations! 🌄✨";
            }
            return "Dạ thời tiết tại Đà Nẵng, Hội An và Bán đảo Sơn Trà hiện rất mát mẻ, dễ chịu. Riêng trên đỉnh Bà Nà Hills nhiệt độ sẽ mát lạnh hơn khoảng 7°C - 8°C (khoảng 18°C - 20°C, có sương mù nhẹ lãng mạn), quý khách nên mang theo áo khoác mỏng khi đi cáp treo. Grand Aurora Luxury Hotel chỉ cách Hội An 25km và Bà Nà 35km, lễ tân có thể hỗ trợ quý khách xe đưa đón thuận tiện nhé! 🌄✨";
        }

        if (isEnglish) {
            return "The weather at My Khe Beach - Da Nang is currently very pleasant with refreshing sea breezes and mild temperatures around 25°C - 28°C. It is perfect for swimming, strolling along the beach, or relaxing at our Infinity Rooftop Pool. Would you like me to recommend our premier ocean-view rooms at Grand Aurora Luxury Hotel?";
        }
        return "Dạ thời tiết tại khu vực bãi biển Mỹ Khê - Đà Nẵng hiện tại rất mát mẻ, dễ chịu với gió biển trong lành, nhiệt độ dao động khoảng 25°C - 28°C. Rất lý tưởng để quý khách đi dạo bờ biển, tắm biển hoặc thư giãn ngắm cảnh đại dương tại Hồ bơi vô cực trên tầng thượng (Infinity Rooftop Pool) của Grand Aurora Luxury Hotel. Quý khách cần em tư vấn thêm về các hạng phòng view biển đẹp cho kỳ nghỉ không ạ?";
    }

    private boolean isGreetingOrIdentity(String lower) {
        return lower.contains("bạn là ai")
                || lower.contains("who are you")
                || lower.contains("bạn tên gì")
                || lower.contains("tên bạn là gì")
                || lower.contains("what is your name")
                || lower.contains("bạn khỏe không")
                || lower.contains("how are you")
                || lower.contains("chúc ngày mới")
                || lower.contains("chúc một ngày")
                || lower.contains("chào bạn")
                || lower.contains("xin chào")
                || lower.contains("chào em")
                || lower.contains("chào bot")
                || lower.equals("hi") || lower.equals("hello") || lower.equals("chào");
    }

    private String formatGreetingResponse(boolean isEnglish) {
        if (isEnglish) {
            return "Hello! I am the AI Virtual Concierge of Grand Aurora Luxury Hotel in Da Nang. I am delighted to welcome you! How may I assist you today with room reservations, amenities, or special requests for your stay?";
        }
        return "Dạ em là Trợ lý ảo AI Lễ tân của Grand Aurora Luxury Hotel (Đà Nẵng). Em rất vui được đón tiếp quý khách! Quý khách cần em hỗ trợ tra cứu phòng trống, báo giá hay tư vấn tiện ích nghỉ dưỡng nào của khách sạn không ạ?";
    }

    private boolean isThanksOrPraise(String lower) {
        return lower.contains("cảm ơn")
                || lower.contains("cam on")
                || lower.contains("thank you")
                || lower.contains("thanks")
                || lower.contains("tuyệt vời")
                || lower.contains("tuyet voi")
                || lower.contains("nhiệt tình")
                || lower.contains("nhiet tinh")
                || lower.contains("khách sạn đẹp")
                || lower.contains("dịch vụ tốt")
                || lower.contains("good service")
                || lower.contains("great job")
                || lower.contains("awesome");
    }

    private String formatThanksResponse(boolean isEnglish) {
        if (isEnglish) {
            return "It is our absolute pleasure to assist you! ✨ Grand Aurora Luxury Hotel wishes you a wonderful and memorable stay in Da Nang. Please feel free to ask if you need any further assistance! 🌊";
        }
        return "Dạ được hỗ trợ quý khách là niềm vinh hạnh to lớn của em và toàn thể đội ngũ Grand Aurora Luxury Hotel ạ! ✨ Chúc quý khách một ngày thật an vui và có một kỳ nghỉ dưỡng tuyệt vời trọn vẹn tại Đà Nẵng. Nếu cần thêm bất kỳ thông tin nào, em luôn sẵn sàng hỗ trợ quý khách nhé! 🌊";
    }

    private boolean isAirportOrTransportationInquiry(String lower) {
        return lower.contains("sân bay")
                || lower.contains("san bay")
                || lower.contains("airport")
                || lower.contains("xe đưa đón")
                || lower.contains("xe dua don")
                || lower.contains("đỗ xe")
                || lower.contains("do xe")
                || lower.contains("bãi xe")
                || lower.contains("bai xe")
                || lower.contains("parking")
                || lower.contains("gửi xe")
                || lower.contains("bãi đỗ");
    }

    private String formatAirportResponse(boolean isEnglish) {
        if (isEnglish) {
            return "Grand Aurora Luxury Hotel is located approximately 6km from Da Nang International Airport (about 10-15 minutes by taxi or Grab directly to My Khe Beach) 🚗. We also provide complimentary 24/7 secure underground parking for cars and motorbikes for our staying guests. May I assist you with further travel directions?";
        }
        return "Dạ từ Sân bay Quốc tế Đà Nẵng về khách sạn Grand Aurora chỉ khoảng 6km (tầm 10-15 phút di chuyển taxi hoặc Grab thẳng theo trục Nguyễn Văn Thoại ra bãi biển Mỹ Khê) rất thuận tiện ạ! 🚗 Khách sạn cũng có hầm đỗ xe ô tô và xe máy rộng rãi, an ninh 24/7 hoàn toàn miễn phí cho quý khách lưu trú. Quý khách cần em tư vấn thêm về hướng di chuyển hoặc hỗ trợ hành lý không ạ?";
    }

    private boolean isFoodOrLocalDiningInquiry(String lower) {
        return lower.contains("hải sản")
                || lower.contains("hai san")
                || lower.contains("seafood")
                || lower.contains("ăn gì")
                || lower.contains("an gi")
                || lower.contains("quán ngon")
                || lower.contains("quan ngon")
                || lower.contains("đặc sản")
                || lower.contains("dac san")
                || lower.contains("nhà hàng")
                || lower.contains("nha hang")
                || lower.contains("quán ăn")
                || lower.contains("quan an")
                || lower.contains("dining");
    }

    private String formatDiningResponse(boolean isEnglish) {
        if (isEnglish) {
            return "Around our beachfront Vo Nguyen Giap street, you will find renowned fresh seafood restaurants along My Khe Beach (such as Be Man, Nam Danh...) 🦀. In addition, our Aurora Restaurant on the 2nd floor serves exquisite seafood and Asian - Western dishes. Don't miss local specialties like Mi Quang noodles and pork belly rice paper rolls! Would you like further dining recommendations?";
        }
        return "Dạ xung quanh khách sạn dọc tuyến đường ven biển Võ Nguyên Giáp có rất nhiều phố hải sản tươi sống bãi Mỹ Khê nổi tiếng (như Bé Mặn, Năm Đảnh...) 🦀. Ngay tại tầng 2 của khách sạn, Nhà hàng Aurora cũng phục vụ ẩm thực hải sản và món Á - Âu cao cấp theo thực đơn À la carte. Ngoài ra, Đà Nẵng còn nổi tiếng với Mì Quảng, bánh tráng cuốn thịt heo hai đầu da và chè sầu Liên nữa đó ạ! ✨ Quý khách cần em gợi ý thêm món ngon nào không ạ?";
    }

    private boolean isSightseeingInquiry(String lower) {
        return lower.contains("cầu rồng")
                || lower.contains("cau rong")
                || lower.contains("dragon bridge")
                || lower.contains("phun lửa")
                || lower.contains("phun lua")
                || lower.contains("bà nà")
                || lower.contains("ba na")
                || lower.contains("bana hills")
                || lower.contains("hội an")
                || lower.contains("hoi an")
                || lower.contains("sơn trà")
                || lower.contains("son tra")
                || lower.contains("chùa linh ứng")
                || lower.contains("chua linh ung")
                || lower.contains("linh ứng")
                || lower.contains("điểm tham quan")
                || lower.contains("diem tham quan")
                || lower.contains("sightseeing");
    }

    private String formatSightseeingResponse(boolean isEnglish) {
        if (isEnglish) {
            return "The famous Dragon Bridge breathes fire and water every Saturday and Sunday at exactly 21:00 (9:00 PM) 🐉! It is only 2.5km (5 minutes by taxi) from our hotel. Furthermore, ancient Hoi An is 25km away (30-35 mins), Ba Na Hills is 35km, and the Son Tra Peninsula / Linh Ung Pagoda is 8km. It is very convenient to combine sightseeing with a beach getaway at Grand Aurora! 🏖️";
        }
        return "Dạ Cầu Rồng sẽ trình diễn phun lửa và phun nước độc đáo vào đúng 21:00 tối Thứ Bảy và Chủ Nhật hàng tuần ạ! 🐉 Từ khách sạn đi taxi sang đầu Cầu Rồng chỉ mất khoảng 5 phút (~2.5km). Ngoài ra, từ Grand Aurora đi Phố cổ Hội An chỉ khoảng 25km (30-35 phút), Bà Nà Hills khoảng 35km (45-50 phút) và Bán đảo Sơn Trà - Chùa Linh Ứng khoảng 8km. Quý khách có thể kết hợp lịch trình tắm biển Mỹ Khê ngay trước khách sạn và tham quan rất thuận tiện ạ! 🏖️";
    }

    private boolean isFamilyPetOrEventInquiry(String lower) {
        return lower.contains("thú cưng")
                || lower.contains("thu cung")
                || lower.contains("chó")
                || lower.contains("mèo")
                || lower.contains("pet")
                || lower.contains("pets")
                || lower.contains("trẻ em")
                || lower.contains("tre em")
                || lower.contains("em bé")
                || lower.contains("em be")
                || lower.contains("cũi")
                || lower.contains("cui")
                || lower.contains("nôi")
                || lower.contains("noi")
                || lower.contains("baby cot")
                || lower.contains("sinh nhật")
                || lower.contains("sinh nhat")
                || lower.contains("kỷ niệm")
                || lower.contains("ky niem")
                || lower.contains("trăng mật")
                || lower.contains("trang mat")
                || lower.contains("honeymoon")
                || lower.contains("anniversary");
    }

    private String formatFamilyPetOrEventResponse(boolean isEnglish) {
        if (isEnglish) {
            return "Grand Aurora Luxury Hotel is delighted to cater to your special requests: 💐\n• Families with infants: Complimentary baby cots are available upon request during booking.\n• Honeymoons, Anniversaries & Birthdays: We gladly offer romantic towel swan art, fresh flowers, and greeting treats when requested in advance.\n• Pets: To maintain strict hygiene and allergen-free standards for all guests, pets are currently not permitted in guestrooms. How may we further personalize your stay?";
        }
        return "Dạ Grand Aurora luôn chu đáo với mọi nhu cầu đặc biệt của quý khách: 💐\n• Gia đình có bé nhỏ: Khách sạn hỗ trợ nôi/cũi em bé miễn phí, quý khách chỉ cần ghi chú khi đặt phòng.\n• Trăng mật (Honeymoon) / Kỷ niệm / Sinh nhật: Khách sạn hỗ trợ setup thiên nga gấp khăn, hoa tươi và thiệp/bánh kem chúc mừng nhỏ khi báo trước.\n• Về thú cưng (Pets): Nhằm đảm bảo tiêu chuẩn vệ sinh và không gian không dị ứng cho tất cả khách lưu trú, khách sạn hiện chưa hỗ trợ mang thú cưng vào phòng ạ. Quý khách có yêu cầu đặc biệt nào cho kỳ nghỉ sắp tới không ạ?";
    }
}
