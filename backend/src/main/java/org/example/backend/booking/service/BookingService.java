package org.example.backend.booking.service;

import lombok.extern.slf4j.Slf4j;
import org.example.backend.audit.annotation.Auditable;
import org.example.backend.audit.entity.AuditAction;
import org.example.backend.booking.dto.*;
import org.example.backend.booking.entity.*;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.booking.repository.BookingRoomRepository;
import org.example.backend.booking.util.BookingCodeGenerator;
import org.example.backend.common.exception.AppException;
import org.example.backend.mail.service.EmailService;
import org.example.backend.mail.service.PdfInvoiceService;
import org.example.backend.payment.dto.PaymentTransactionType;
import org.example.backend.payment.entity.PaymentTransaction;
import org.example.backend.payment.entity.TransactionStatus;
import org.example.backend.payment.repository.PaymentTransactionRepository;
import org.example.backend.room.entity.Room;
import org.example.backend.room.entity.RoomStatus;
import org.example.backend.room.entity.RoomType;
import org.example.backend.room.repository.RoomRepository;
import org.example.backend.room.repository.RoomTypeRepository;
import org.example.backend.user.entity.Role;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Service xử lý toàn bộ nghiệp vụ Booking:
 * - Tạo booking với Pessimistic Lock chống overbooking (SRS §3.3)
 * - Xem lịch sử booking cá nhân
 * - Hủy booking & tính phạt theo chính sách 14:00 ngày check-in (SRS §2.6)
 * - Check-in gán N phòng vật lý (SRS §2.5)
 * - Check-out đối soát (SRS §2.5)
 * - Xác nhận đơn PENDING (Lễ tân)
 * - Xử lý No-Show (SRS §2.6)
 */
@Slf4j
@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final BookingRoomRepository bookingRoomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final org.example.backend.payment.service.PaymentService paymentService;
    private final PasswordEncoder passwordEncoder;

    @Autowired(required = false)
    private EmailService emailService;

    @Autowired(required = false)
    private PdfInvoiceService pdfInvoiceService;

    public BookingService(BookingRepository bookingRepository,
                          BookingRoomRepository bookingRoomRepository,
                          RoomTypeRepository roomTypeRepository,
                          RoomRepository roomRepository,
                          UserRepository userRepository,
                          PaymentTransactionRepository paymentTransactionRepository,
                          @org.springframework.context.annotation.Lazy org.example.backend.payment.service.PaymentService paymentService,
                          PasswordEncoder passwordEncoder) {
        this.bookingRepository = bookingRepository;
        this.bookingRoomRepository = bookingRoomRepository;
        this.roomTypeRepository = roomTypeRepository;
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.paymentService = paymentService;
        this.passwordEncoder = passwordEncoder;
    }

    public void setEmailService(EmailService emailService) {
        this.emailService = emailService;
    }

    public void setPdfInvoiceService(PdfInvoiceService pdfInvoiceService) {
        this.pdfInvoiceService = pdfInvoiceService;
    }

    // ═══════════════════════════════════════════════════════════════
    // CUSTOMER — Tạo booking (SRS §FR-03 + §3.3 Pessimistic Lock)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Tạo booking với Pessimistic Lock trên RoomType để chống overbooking.
     *
     * Transaction flow:
     * 1. Lock RoomType (PESSIMISTIC_WRITE)
     * 2. Tính AvailableRooms = TotalActive - BookedCount
     * 3. Nếu đủ phòng → tạo Booking (PENDING) + tính hold_expires_at
     * 4. Nếu VNPAY → tạo PaymentTransaction stub (phần sinh URL xử lý ở PaymentService)
     * 5. Commit → trả BookingResponse
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Auditable(action = AuditAction.CREATE_BOOKING, targetType = "BOOKING", description = "Tạo đơn đặt phòng")
    public BookingResponse createBooking(CreateBookingRequest request, String userEmail) {
        // Validate ngày
        if (!request.getCheckOut().isAfter(request.getCheckIn())) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm");
        }
        if (request.getCheckIn().isBefore(LocalDate.now())) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Ngày nhận phòng không được là ngày trong quá khứ");
        }

        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Tài khoản không tồn tại"));

        User bookingUser = currentUser;
        if (currentUser.getRole() != Role.ROLE_CUSTOMER && request.getCustomerEmail() != null && !request.getCustomerEmail().isBlank()) {
            String cEmail = request.getCustomerEmail().trim();
            bookingUser = userRepository.findByEmail(cEmail)
                    .orElseGet(() -> {
                        String name = (request.getCustomerName() != null && !request.getCustomerName().isBlank())
                                ? request.getCustomerName().trim() : "Khách vãng lai";
                        String phone = (request.getCustomerPhone() != null && !request.getCustomerPhone().isBlank())
                                ? request.getCustomerPhone().trim() : "0000000000";
                        User newCustomer = User.builder()
                                .email(cEmail)
                                .fullName(name)
                                .phone(phone)
                                .password(passwordEncoder.encode(java.util.UUID.randomUUID().toString()))
                                .role(Role.ROLE_CUSTOMER)
                                .build();
                        return userRepository.save(newCustomer);
                    });
        }

        String note = request.getNote();
        StringBuilder extra = new StringBuilder();
        if (request.getCustomerName() != null && !request.getCustomerName().isBlank()) {
            extra.append("Khách: ").append(request.getCustomerName().trim()).append(" | ");
        }
        if (request.getCustomerPhone() != null && !request.getCustomerPhone().isBlank()) {
            extra.append("SĐT: ").append(request.getCustomerPhone().trim()).append(" | ");
        }
        if (request.getCustomerEmail() != null && !request.getCustomerEmail().isBlank()) {
            extra.append("Email: ").append(request.getCustomerEmail().trim()).append(" | ");
        }
        if (extra.length() > 0) {
            note = (note != null && !note.isBlank()) ? "[" + extra + "] " + note : "[" + extra + "]";
        }

        // 1. Pessimistic Lock RoomType
        RoomType roomType = roomTypeRepository.findByIdForUpdate(request.getRoomTypeId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Loại phòng không tồn tại hoặc đã ngừng bán"));

        if (!roomType.getIsActive()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Loại phòng đã ngừng bán");
        }

        // 2. Tính AvailableRooms
        LocalDateTime now = LocalDateTime.now();
        int totalActive = roomRepository.countByRoomTypeIdAndStatusNot(
                roomType.getId(), RoomStatus.MAINTENANCE);
        int booked = bookingRepository.countBookedRooms(
                roomType.getId(), request.getCheckIn(), request.getCheckOut(), now);
        int available = totalActive - booked;

        if (available < request.getQuantity()) {
            throw new AppException(HttpStatus.CONFLICT,
                    String.format("Số phòng trống không đủ. Hiện còn %d phòng, bạn yêu cầu %d phòng",
                            Math.max(0, available), request.getQuantity()));
        }

        // 3. Tính giá (snapshot tại thời điểm đặt)
        long nights = ChronoUnit.DAYS.between(request.getCheckIn(), request.getCheckOut());
        BigDecimal pricePerNight = roomType.getBasePrice();
        BigDecimal totalPrice = pricePerNight
                .multiply(BigDecimal.valueOf(nights))
                .multiply(BigDecimal.valueOf(request.getQuantity()));
        BigDecimal depositAmount = totalPrice.divide(BigDecimal.valueOf(2), 0, RoundingMode.HALF_UP);

        // 4. Tính hold_expires_at theo phương thức thanh toán (SRS §8 rule 3)
        LocalDateTime holdExpiresAt = calculateHoldExpiry(request.getPaymentMethod(), request.getCheckIn(), now);

        // 5. Tạo Booking
        PaymentMethod paymentMethod;
        try {
            paymentMethod = PaymentMethod.valueOf(request.getPaymentMethod().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Phương thức thanh toán không hợp lệ. Chọn VNPAY hoặc CASH");
        }

        Booking booking = Booking.builder()
                .bookingCode(BookingCodeGenerator.generateUnique())
                .user(bookingUser)
                .roomType(roomType)
                .quantity(request.getQuantity())
                .guests(request.getGuests())
                .paymentMethod(paymentMethod)
                .checkInDate(request.getCheckIn())
                .checkOutDate(request.getCheckOut())
                .pricePerNight(pricePerNight)
                .totalPrice(totalPrice)
                .depositAmount(depositAmount)
                .bookingStatus(BookingStatus.PENDING)
                .paymentStatus(PaymentStatus.UNPAID)
                .holdExpiresAt(holdExpiresAt)
                .note(note)
                .build();

        booking = bookingRepository.save(booking);

        // 6. Nếu VNPAY → sinh paymentUrl từ PaymentService
        String paymentUrl = null;
        if (booking.getPaymentMethod() == PaymentMethod.VNPAY) {
            paymentUrl = paymentService.createPaymentUrl(booking, null);
        }

        return toBookingResponse(booking, null, paymentUrl);
    }

    // ═══════════════════════════════════════════════════════════════
    // CUSTOMER — Xem lịch sử booking
    // ═══════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<BookingResponse> getMyBookings(String userEmail, int page, int size) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Tài khoản không tồn tại"));

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return bookingRepository.findByUserId(user.getId(), pageable)
                .map(b -> toBookingResponse(b, null));
    }

    @Transactional(readOnly = true)
    public BookingResponse getBookingByCode(String bookingCode, String userEmail) {
        Booking booking = bookingRepository.findByBookingCode(bookingCode)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy đặt phòng"));

        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Tài khoản không tồn tại"));

        // Customer chỉ xem booking của mình, Receptionist/Admin xem được tất cả theo quyền vận hành (SRS §11.7)
        if (currentUser.getRole() == Role.ROLE_CUSTOMER && !booking.getUser().getEmail().equals(userEmail)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền xem đặt phòng này");
        }

        List<BookingResponse.AssignedRoomDto> assignedRooms = bookingRoomRepository
                .findByBookingId(booking.getId()).stream()
                .map(br -> BookingResponse.AssignedRoomDto.builder()
                        .roomId(br.getRoom().getId())
                        .roomNumber(br.getRoom().getRoomNumber())
                        .floor(br.getRoom().getFloor())
                        .build())
                .toList();

        return toBookingResponse(booking, assignedRooms);
    }

    // ═══════════════════════════════════════════════════════════════
    // CUSTOMER — Hủy booking & tính phạt (SRS §2.6, §8 rule 7)
    // ═══════════════════════════════════════════════════════════════

    @Transactional
    @Auditable(action = AuditAction.CANCEL_BOOKING, targetType = "BOOKING", description = "Hủy đơn đặt phòng")
    public CancelBookingResponse cancelBooking(String bookingCode, CancelBookingRequest request,
                                               String userEmail) {
        Booking booking = bookingRepository.findByBookingCode(bookingCode)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy đặt phòng"));

        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Tài khoản không tồn tại"));

        // Customer chỉ hủy booking của mình, Receptionist/Admin được hủy theo nghiệp vụ (SRS §11.7)
        if (currentUser.getRole() == Role.ROLE_CUSTOMER && !booking.getUser().getEmail().equals(userEmail)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền hủy đặt phòng này");
        }

        // Chặn tuyệt đối hủy sau CHECKED_IN / CHECKED_OUT / NO_SHOW / CANCELLED
        BookingStatus status = booking.getBookingStatus();
        if (status == BookingStatus.CHECKED_IN || status == BookingStatus.CHECKED_OUT
                || status == BookingStatus.NO_SHOW || status == BookingStatus.CANCELLED) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    String.format("Không thể hủy đặt phòng ở trạng thái %s", status));
        }

        // Tính số tiền đã thanh toán thực tế
        BigDecimal totalPaid = paymentTransactionRepository.sumSuccessfulPayments(booking.getId());

        // Nếu chưa thanh toán → hủy ngay, không phạt
        if (totalPaid.compareTo(BigDecimal.ZERO) == 0) {
            booking.setBookingStatus(BookingStatus.CANCELLED);
            booking.setCancellationReason(request.getReason());
            booking.setCancelledAt(LocalDateTime.now());
            booking.setRefundAmount(BigDecimal.ZERO);
            bookingRepository.save(booking);

            return CancelBookingResponse.builder()
                    .bookingCode(booking.getBookingCode())
                    .bookingStatus("CANCELLED")
                    .paymentStatus(booking.getPaymentStatus().name())
                    .penaltyAmount(BigDecimal.ZERO)
                    .refundAmount(BigDecimal.ZERO)
                    .message("Đặt phòng đã được hủy thành công")
                    .build();
        }

        // Tính tiền phạt theo mốc 14:00 ngày check-in (SRS §2.6)
        BigDecimal depositStandard = booking.getDepositAmount(); // 50% tổng tiền phòng
        BigDecimal penaltyAmount = calculatePenaltyAmount(booking.getCheckInDate(), depositStandard);
        BigDecimal refundAmount = totalPaid.subtract(penaltyAmount).max(BigDecimal.ZERO);

        // Cập nhật trạng thái
        booking.setBookingStatus(BookingStatus.CANCELLED);
        booking.setCancellationReason(request.getReason());
        booking.setCancelledAt(LocalDateTime.now());
        booking.setRefundAmount(refundAmount);

        String paymentStatus;
        if (refundAmount.compareTo(BigDecimal.ZERO) > 0) {
            // Có tiền cần hoàn → lưu thông tin ngân hàng, chuyển REFUND_PENDING
            booking.setPaymentStatus(PaymentStatus.REFUND_PENDING);
            booking.setBankName(request.getBankName());
            // Che số tài khoản: lưu full nhưng chỉ trả masked khi hiển thị
            booking.setBankAccountNumber(request.getAccountNumber());
            booking.setBankAccountHolder(request.getAccountHolder());
            paymentStatus = "REFUND_PENDING";
        } else {
            // Phạt toàn bộ, không hoàn → giữ PARTIALLY_PAID hoặc FULLY_PAID
            paymentStatus = booking.getPaymentStatus().name();
        }

        bookingRepository.save(booking);

        return CancelBookingResponse.builder()
                .bookingCode(booking.getBookingCode())
                .bookingStatus("CANCELLED")
                .paymentStatus(paymentStatus)
                .penaltyAmount(penaltyAmount)
                .refundAmount(refundAmount)
                .message("Yêu cầu hủy đã được ghi nhận. " +
                        (refundAmount.compareTo(BigDecimal.ZERO) > 0
                                ? String.format("Số tiền hoàn: %,.0f VNĐ", refundAmount)
                                : "Không có khoản hoàn tiền"))
                .build();
    }

    // ═══════════════════════════════════════════════════════════════
    // RECEPTIONIST — Xác nhận đơn PENDING (SRS §FR-05)
    // ═══════════════════════════════════════════════════════════════

    @Transactional
    @Auditable(action = AuditAction.CONFIRM_BOOKING, targetType = "BOOKING", description = "Xác nhận đặt phòng tại quầy")
    public BookingResponse confirmBooking(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy đặt phòng"));

        if (booking.getBookingStatus() != BookingStatus.PENDING) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Chỉ có thể xác nhận đặt phòng đang ở trạng thái PENDING");
        }

        // Khóa ghi RoomType và kiểm tra lại availability trước khi xác nhận đơn (SRS Acceptance Criterion)
        RoomType roomType = roomTypeRepository.findByIdForUpdate(booking.getRoomType().getId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Loại phòng không tồn tại"));

        LocalDateTime now = LocalDateTime.now();
        int totalActive = roomRepository.countByRoomTypeIdAndStatusNot(roomType.getId(), RoomStatus.MAINTENANCE);
        int booked = bookingRepository.countBookedRooms(roomType.getId(), booking.getCheckInDate(), booking.getCheckOutDate(), now);

        boolean isAlreadyCounted = booking.getHoldExpiresAt() != null && booking.getHoldExpiresAt().isAfter(now);
        int otherBooked = isAlreadyCounted ? (booked - booking.getQuantity()) : booked;
        int available = totalActive - otherBooked;

        if (available < booking.getQuantity()) {
            throw new AppException(HttpStatus.CONFLICT,
                    String.format("Không thể xác nhận đơn: số phòng trống không đủ (hiện còn %d phòng, đơn yêu cầu %d phòng)",
                            Math.max(0, available), booking.getQuantity()));
        }

        booking.setBookingStatus(BookingStatus.CONFIRMED);
        // Xóa hold_expires_at vì đã xác nhận → không còn giới hạn thời gian
        booking.setHoldExpiresAt(null);
        bookingRepository.save(booking);

        // Tự động gửi Email xác nhận đặt phòng và đính kèm hóa đơn cọc sau khi xác nhận đơn
        sendBookingConfirmationEmailSafely(booking);

        return toBookingResponse(booking, null);
    }

    // ═══════════════════════════════════════════════════════════════
    // RECEPTIONIST — Check-in: gán N phòng vật lý (SRS §FR-06)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Check-in gán N phòng vật lý cụ thể với Pessimistic Lock trên Room.
     * Ngăn 2 quầy lễ tân gán trùng cùng phòng.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Auditable(action = AuditAction.CHECK_IN_ASSIGN_ROOM, targetType = "BOOKING", description = "Check-in và gán phòng vật lý")
    public BookingResponse checkIn(Long bookingId, CheckInRequest request, String receptionistEmail) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy đặt phòng"));

        // Điều kiện tiên quyết: CONFIRMED
        if (booking.getBookingStatus() != BookingStatus.CONFIRMED) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Chỉ có thể check-in đặt phòng đang ở trạng thái CONFIRMED");
        }

        // Kiểm tra số lượng phòng gán đúng N
        if (request.getAssignedRoomIds().size() != booking.getQuantity()) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    String.format("Phải gán đúng %d phòng (bạn chọn %d phòng)",
                            booking.getQuantity(), request.getAssignedRoomIds().size()));
        }

        User receptionist = userRepository.findByEmail(receptionistEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Tài khoản không tồn tại"));

        // Pessimistic Lock toàn bộ N phòng vật lý
        List<Room> rooms = roomRepository.findAllByIdInForUpdate(request.getAssignedRoomIds());

        if (rooms.size() != request.getAssignedRoomIds().size()) {
            throw new AppException(HttpStatus.NOT_FOUND, "Một hoặc nhiều phòng không tồn tại");
        }

        // Validate: đúng loại phòng, tất cả AVAILABLE
        for (Room room : rooms) {
            if (!room.getRoomType().getId().equals(booking.getRoomType().getId())) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        String.format("Phòng %s không thuộc loại phòng đã đặt", room.getRoomNumber()));
            }
            if (room.getStatus() != RoomStatus.AVAILABLE) {
                throw new AppException(HttpStatus.CONFLICT,
                        String.format("Phòng %s không còn trống (trạng thái: %s). Vui lòng chọn phòng khác",
                                room.getRoomNumber(), room.getStatus()));
            }
        }

        // Gán phòng vào booking_rooms, cập nhật trạng thái phòng → OCCUPIED
        LocalDateTime now = LocalDateTime.now();
        for (Room room : rooms) {
            BookingRoom bookingRoom = BookingRoom.builder()
                    .booking(booking)
                    .room(room)
                    .assignedAt(now)
                    .assignedBy(receptionist)
                    .build();
            bookingRoomRepository.save(bookingRoom);

            room.setStatus(RoomStatus.OCCUPIED);
            roomRepository.save(room);
        }

        // Booking → CHECKED_IN
        booking.setBookingStatus(BookingStatus.CHECKED_IN);
        bookingRepository.save(booking);

        List<BookingResponse.AssignedRoomDto> assignedRoomDtos = rooms.stream()
                .map(r -> BookingResponse.AssignedRoomDto.builder()
                        .roomId(r.getId())
                        .roomNumber(r.getRoomNumber())
                        .floor(r.getFloor())
                        .build())
                .toList();

        return toBookingResponse(booking, assignedRoomDtos);
    }

    // ═══════════════════════════════════════════════════════════════
    // RECEPTIONIST — Check-out (SRS §FR-07)
    // ═══════════════════════════════════════════════════════════════

    @Transactional
    @Auditable(action = AuditAction.CHECK_OUT_SETTLEMENT, targetType = "BOOKING", description = "Check-out và đối soát phòng")
    public CheckOutResponse checkOut(Long bookingId, String receptionistEmail) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy đặt phòng"));

        if (booking.getBookingStatus() != BookingStatus.CHECKED_IN) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Chỉ có thể check-out đặt phòng đang ở trạng thái CHECKED_IN");
        }

        // Tính số tiền còn phải thu
        BigDecimal totalPaid = paymentTransactionRepository.sumSuccessfulPayments(booking.getId());
        BigDecimal remaining = booking.getTotalPrice().subtract(totalPaid).max(BigDecimal.ZERO);

        // Nếu còn số tiền chưa thanh toán -> Ghi nhận bút toán thu quầy Lễ tân tại thời điểm Check-out thực tế
        if (remaining.compareTo(BigDecimal.ZERO) > 0) {
            PaymentTransaction checkOutTxn = PaymentTransaction.builder()
                    .booking(booking)
                    .transactionCode("COUNTER-" + booking.getBookingCode() + "-" + System.currentTimeMillis())
                    .amount(remaining)
                    .paymentMethod(booking.getPaymentMethod() != null ? booking.getPaymentMethod() : PaymentMethod.CASH)
                    .status(TransactionStatus.SUCCESS)
                    .type(PaymentTransactionType.COUNTER_PAYMENT)
                    .responseCode("COUNTER_PAID")
                    .transactionTime(java.time.LocalDateTime.now())
                    .actorEmail(receptionistEmail)
                    .referenceNote("Thu phần tiền phòng còn lại khi Check-out tại quầy")
                    .build();
            paymentTransactionRepository.save(checkOutTxn);
        }

        // Lấy danh sách phòng đang gán
        List<BookingRoom> bookingRooms = bookingRoomRepository.findByBookingId(booking.getId());
        List<Long> roomNumbers = bookingRooms.stream()
                .map(br -> br.getRoom().getId())
                .toList();

        // Cập nhật booking → CHECKED_OUT, FULLY_PAID
        booking.setBookingStatus(BookingStatus.CHECKED_OUT);
        booking.setPaymentStatus(PaymentStatus.FULLY_PAID);
        bookingRepository.save(booking);

        // Tất cả phòng → CLEANING
        for (BookingRoom br : bookingRooms) {
            Room room = br.getRoom();
            room.setStatus(RoomStatus.CLEANING);
            roomRepository.save(room);
        }

        // Tự động gửi Email Quyết toán & đính kèm Hóa đơn PDF sau khi Check-out thành công (SRS §FR-15.2)
        sendCheckOutEmailSafely(booking);

        return CheckOutResponse.builder()
                .bookingCode(booking.getBookingCode())
                .bookingStatus("CHECKED_OUT")
                .paymentStatus("FULLY_PAID")
                .totalAmount(booking.getTotalPrice())
                .amountPaid(totalPaid)
                .remainingAmount(remaining)
                .roomsToClean(roomNumbers)
                .build();
    }

    private void sendCheckOutEmailSafely(Booking booking) {
        if (emailService == null) {
            return;
        }
        try {
            String recipientEmail = null;
            String customerName = "Quý khách";

            // 1. Kiểm tra email lưu trong note đặt phòng (khi khách nhập ở checkout)
            if (booking.getNote() != null) {
                java.util.regex.Matcher m = java.util.regex.Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}").matcher(booking.getNote());
                if (m.find()) {
                    recipientEmail = m.group();
                }
            }

            // 2. Fallback sang email của User
            if ((recipientEmail == null || recipientEmail.isBlank()) && booking.getUser() != null) {
                recipientEmail = booking.getUser().getEmail();
            }

            if (booking.getUser() != null && booking.getUser().getFullName() != null && !booking.getUser().getFullName().isBlank()) {
                customerName = booking.getUser().getFullName();
            } else if (booking.getNote() != null && booking.getNote().contains("Khách:")) {
                try {
                    String sub = booking.getNote().substring(booking.getNote().indexOf("Khách:") + 6);
                    int pipe = sub.indexOf('|');
                    customerName = (pipe > 0 ? sub.substring(0, pipe) : sub).trim();
                } catch (Exception ignored) {
                }
            }

            if (recipientEmail == null || recipientEmail.isBlank()) {
                log.warn("[BookingService] Không tìm thấy email khách hàng cho booking [{}], bỏ qua gửi mail check-out.",
                        booking.getBookingCode());
                return;
            }

            byte[] pdfBytes = null;
            if (pdfInvoiceService != null) {
                try {
                    pdfBytes = pdfInvoiceService.generateInvoicePdf(booking);
                } catch (Exception pdfEx) {
                    log.warn("[BookingService] Lỗi khi sinh hóa đơn PDF cho booking [{}]: {}",
                            booking.getBookingCode(), pdfEx.getMessage());
                }
            }

            String roomTypeName = booking.getRoomType() != null ? booking.getRoomType().getName() : "Phòng nghỉ Grand Aurora";
            int quantity = booking.getQuantity() != null ? booking.getQuantity() : 1;
            String checkIn = booking.getCheckInDate() != null ? booking.getCheckInDate().toString() : "";
            String checkOut = booking.getCheckOutDate() != null ? booking.getCheckOutDate().toString() : "";
            long totalAmount = booking.getTotalPrice() != null ? booking.getTotalPrice().longValue() : 0L;

            emailService.sendCheckOutInvoiceEmail(
                    recipientEmail,
                    customerName,
                    booking.getBookingCode(),
                    roomTypeName,
                    quantity,
                    checkIn,
                    checkOut,
                    totalAmount,
                    pdfBytes
            );
            log.info("[BookingService] Đã kích hoạt gửi Email quyết toán Check-out cho booking [{}] tới [{}]",
                    booking.getBookingCode(), recipientEmail);
        } catch (Exception e) {
            log.error("[BookingService] Gặp lỗi khi gửi email check-out cho booking [{}]: {}",
                    booking.getBookingCode(), e.getMessage());
        }
    }

    private void sendBookingConfirmationEmailSafely(Booking booking) {
        if (emailService == null) {
            return;
        }
        try {
            String recipientEmail = null;
            String customerName = "Quý khách";
            if (booking.getUser() != null) {
                recipientEmail = booking.getUser().getEmail();
                if (booking.getUser().getFullName() != null && !booking.getUser().getFullName().isBlank()) {
                    customerName = booking.getUser().getFullName();
                }
            }

            if (recipientEmail == null || recipientEmail.isBlank()) {
                log.warn("[BookingService] Không tìm thấy email khách hàng cho booking [{}], bỏ qua gửi mail xác nhận cọc.",
                        booking.getBookingCode());
                return;
            }

            byte[] pdfBytes = null;
            if (pdfInvoiceService != null) {
                try {
                    pdfBytes = pdfInvoiceService.generateInvoicePdf(booking);
                } catch (Exception pdfEx) {
                    log.warn("[BookingService] Lỗi khi sinh hóa đơn PDF cọc cho booking [{}]: {}",
                            booking.getBookingCode(), pdfEx.getMessage());
                }
            }

            String roomTypeName = booking.getRoomType() != null ? booking.getRoomType().getName() : "Phòng nghỉ Grand Aurora";
            int quantity = booking.getQuantity() != null ? booking.getQuantity() : 1;
            String checkIn = booking.getCheckInDate() != null ? booking.getCheckInDate().toString() : "";
            String checkOut = booking.getCheckOutDate() != null ? booking.getCheckOutDate().toString() : "";
            long depositAmount = booking.getDepositAmount() != null ? booking.getDepositAmount().longValue() : 0L;
            long totalAmount = booking.getTotalPrice() != null ? booking.getTotalPrice().longValue() : 0L;

            emailService.sendBookingConfirmationEmail(
                    recipientEmail,
                    customerName,
                    booking.getBookingCode(),
                    roomTypeName,
                    quantity,
                    checkIn,
                    checkOut,
                    depositAmount,
                    totalAmount,
                    pdfBytes
            );
            log.info("[BookingService] Đã kích hoạt gửi Email xác nhận cọc cho booking [{}] tới [{}]",
                    booking.getBookingCode(), recipientEmail);
        } catch (Exception e) {
            log.error("[BookingService] Gặp lỗi khi gửi email xác nhận cọc cho booking [{}]: {}",
                    booking.getBookingCode(), e.getMessage());
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // RECEPTIONIST — No-Show (SRS §FR-10, §2.6)
    // ═══════════════════════════════════════════════════════════════

    @Transactional
    @Auditable(action = AuditAction.MARK_NO_SHOW, targetType = "BOOKING", description = "Đánh dấu khách No-Show")
    public BookingResponse markNoShow(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy đặt phòng"));

        if (booking.getBookingStatus() != BookingStatus.CONFIRMED) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Chỉ có thể đánh dấu No-Show cho đặt phòng ở trạng thái CONFIRMED");
        }

        // Chỉ cho phép No-Show từ sau 12:00 ngày check-in + 1
        LocalDateTime noShowThreshold = booking.getCheckInDate().plusDays(1)
                .atTime(LocalTime.NOON);
        if (LocalDateTime.now().isBefore(noShowThreshold)) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    String.format("Chỉ được đánh dấu No-Show sau 12:00 ngày %s",
                            booking.getCheckInDate().plusDays(1)));
        }

        booking.setBookingStatus(BookingStatus.NO_SHOW);

        // Xử lý tài chính No-Show (SRS §2.6):
        BigDecimal totalPaid = paymentTransactionRepository.sumSuccessfulPayments(booking.getId());
        if (totalPaid.compareTo(booking.getTotalPrice()) >= 0) {
            // Khách đã trả 100% → hoàn 50% còn lại (các đêm chưa ở)
            BigDecimal refundAmount = booking.getTotalPrice().subtract(booking.getDepositAmount());
            booking.setRefundAmount(refundAmount);
            booking.setPaymentStatus(PaymentStatus.REFUND_PENDING);
        }
        // Nếu chỉ cọc 50% → giữ PARTIALLY_PAID, không hoàn

        bookingRepository.save(booking);
        return toBookingResponse(booking, null);
    }

    // ═══════════════════════════════════════════════════════════════
    // ═══════════════════════════════════════════════════════════════
    // RECEPTIONIST — Danh sách booking & Bộ lọc tìm kiếm (SRS §11.4)
    // ═══════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<BookingResponse> getAllBookings(int page, int size, BookingStatus status) {
        return getAllBookings(page, size, status, null, null, null, null);
    }

    @Transactional(readOnly = true)
    public Page<BookingResponse> getAllBookings(int page, int size,
                                               BookingStatus status,
                                               LocalDate checkInFrom,
                                               LocalDate checkInTo,
                                               String bookingCode,
                                               String customerEmail) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        Specification<Booking> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(cb.equal(root.get("bookingStatus"), status));
            }
            if (checkInFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("checkInDate"), checkInFrom));
            }
            if (checkInTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("checkInDate"), checkInTo));
            }
            if (bookingCode != null && !bookingCode.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("bookingCode")), "%" + bookingCode.trim().toLowerCase() + "%"));
            }
            if (customerEmail != null && !customerEmail.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("user").get("email")), "%" + customerEmail.trim().toLowerCase() + "%"));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return bookingRepository.findAll(spec, pageable).map(b -> toBookingResponse(b, null));
    }

    // ═══════════════════════════════════════════════════════════════
    // Private helpers
    // ═══════════════════════════════════════════════════════════════

    /**
     * Tính hold_expires_at theo phương thức thanh toán và thời điểm check-in (SRS §8 rule 3).
     * - VNPAY: created_at + 15 phút
     * - CASH đặt trước >= 24h: created_at + 24h
     * - CASH đặt trong ngày (<24h): min(created_at + 2h, check_in 18:00)
     */
    private LocalDateTime calculateHoldExpiry(String paymentMethod, LocalDate checkInDate,
                                              LocalDateTime now) {
        if ("VNPAY".equalsIgnoreCase(paymentMethod)) {
            return now.plusMinutes(15);
        }

        // CASH
        LocalDateTime checkIn18 = checkInDate.atTime(18, 0);
        long hoursToCheckIn = ChronoUnit.HOURS.between(now, checkIn18);

        if (hoursToCheckIn >= 24) {
            // Đặt trước >= 24h: giữ 24h
            return now.plusHours(24);
        } else {
            // Đặt sát giờ: min(created_at + 2h, 18:00 check-in)
            LocalDateTime plus2h = now.plusHours(2);
            return plus2h.isBefore(checkIn18) ? plus2h : checkIn18;
        }
    }

    /**
     * Tính tiền phạt hủy phòng theo mốc 14:00 ngày check-in (SRS §2.6, §8 rule 7).
     * T = khoảng thời gian từ NOW đến 14:00 ngày check-in (giờ).
     *
     * T >= 24h  → Phạt 0%
     * 12h <= T < 24h → Phạt 30% cọc
     * 0h < T < 12h  → Phạt 50% cọc
     * T <= 0         → Phạt 100% cọc
     */
    private BigDecimal calculatePenaltyAmount(LocalDate checkInDate, BigDecimal depositAmount) {
        LocalDateTime deadline = checkInDate.atTime(14, 0);
        long hoursToDeadline = ChronoUnit.HOURS.between(LocalDateTime.now(), deadline);

        double penaltyRate;
        if (hoursToDeadline >= 24) {
            penaltyRate = 0.0;
        } else if (hoursToDeadline >= 12) {
            penaltyRate = 0.30;
        } else if (hoursToDeadline > 0) {
            penaltyRate = 0.50;
        } else {
            penaltyRate = 1.0; // Phạt 100% cọc
        }

        return depositAmount
                .multiply(BigDecimal.valueOf(penaltyRate))
                .setScale(0, RoundingMode.HALF_UP);
    }

    private BookingResponse toBookingResponse(Booking booking,
                                              List<BookingResponse.AssignedRoomDto> assignedRooms) {
        return toBookingResponse(booking, assignedRooms, null);
    }

    private BookingResponse toBookingResponse(Booking booking,
                                              List<BookingResponse.AssignedRoomDto> assignedRooms,
                                              String paymentUrl) {
        Long userId = null;
        String customerName = null;
        String customerEmail = null;
        String customerPhone = null;

        if (booking.getUser() != null) {
            userId = booking.getUser().getId();
            customerName = booking.getUser().getFullName();
            customerEmail = booking.getUser().getEmail();
            customerPhone = booking.getUser().getPhone();
        }

        long nights = ChronoUnit.DAYS.between(booking.getCheckInDate(), booking.getCheckOutDate());

        return BookingResponse.builder()
                .id(booking.getId())
                .bookingCode(booking.getBookingCode())
                .userId(userId)
                .customerName(customerName)
                .customerEmail(customerEmail)
                .customerPhone(customerPhone)
                .roomTypeId(booking.getRoomType().getId())
                .roomTypeName(booking.getRoomType().getName())
                .quantity(booking.getQuantity())
                .guests(booking.getGuests())
                .checkIn(booking.getCheckInDate())
                .checkOut(booking.getCheckOutDate())
                .numberOfNights(nights)
                .pricePerNight(booking.getPricePerNight())
                .totalPrice(booking.getTotalPrice())
                .depositAmount(booking.getDepositAmount())
                .paymentUrl(paymentUrl)
                .bookingStatus(booking.getBookingStatus().name())
                .paymentStatus(booking.getPaymentStatus().name())
                .paymentMethod(booking.getPaymentMethod().name())
                .holdExpiresAt(booking.getHoldExpiresAt())
                .assignedRooms(assignedRooms)
                .createdAt(booking.getCreatedAt())
                .build();
    }
}
