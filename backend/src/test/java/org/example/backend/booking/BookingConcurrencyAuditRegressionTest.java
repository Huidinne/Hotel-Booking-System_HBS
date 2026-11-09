package org.example.backend.booking;

import org.example.backend.audit.entity.AuditAction;
import org.example.backend.audit.entity.AuditLog;
import org.example.backend.audit.repository.AuditLogRepository;
import org.example.backend.booking.dto.BookingResponse;
import org.example.backend.booking.dto.CreateBookingRequest;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.booking.repository.BookingRoomRepository;
import org.example.backend.booking.service.BookingService;
import org.example.backend.common.exception.AppException;
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
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Bộ kiểm thử hồi quy cạnh tranh & kiểm toán giao dịch (Task [SP2-1109-ANH]):
 * Tách biệt 3 Test Cases độc lập phục vụ nghiệm thu chuẩn SRS §FR-03, §FR-16, §FR-17:
 *
 * Case 1: Chống Overbooking (Pessimistic Lock trên MySQL).
 * Case 2: Tính toàn vẹn của Audit Transaction (REQUIRES_NEW).
 * Case 3: Ổn định Hikari Connection Pool & Không xảy ra Deadlock / Timeout.
 */
@SpringBootTest
class BookingConcurrencyAuditRegressionTest {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private BookingRoomRepository bookingRoomRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    private RoomType singleRoomType;
    private final List<User> testUsers = new ArrayList<>();

    @BeforeEach
    void setUp() {
        paymentTransactionRepository.deleteAll();
        bookingRoomRepository.deleteAll();
        bookingRepository.deleteAll();
        auditLogRepository.deleteAll();
        roomRepository.deleteAll();
        roomTypeRepository.deleteAll();
        userRepository.deleteAll();
        testUsers.clear();

        // 1 loại phòng có đúng 1 phòng vật lý khả dụng duy nhất
        singleRoomType = roomTypeRepository.save(RoomType.builder()
                .name("Single Penthouse Suite")
                .capacity(2)
                .basePrice(BigDecimal.valueOf(1500000))
                .description("Phòng duy nhất phục vụ kiểm thử tranh chấp")
                .isActive(true)
                .build());

        roomRepository.save(Room.builder()
                .roomNumber("901")
                .floor(9)
                .roomType(singleRoomType)
                .status(RoomStatus.AVAILABLE)
                .build());

        // 10 khách hàng độc lập
        for (int i = 1; i <= 10; i++) {
            User user = userRepository.save(User.builder()
                    .email("concurrency_guest" + i + "@hotel.com")
                    .password("Password@123")
                    .fullName("Guest " + i)
                    .phone("098800000" + i)
                    .role(Role.ROLE_CUSTOMER)
                    .build());
            testUsers.add(user);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEST CASE 1: CHỐNG OVERBOOKING (PESSIMISTIC LOCK VERIFICATION)
    // ═════════════════════════════════════════════════════════════════════════
    @Test
    @DisplayName("Case 1: Khóa bi quan chống Overbooking -> Đúng 1 thành công (201), 9 bị chặn (409 Conflict)")
    void testCase1_PessimisticLockPreventsOverbooking() throws InterruptedException {
        ConcurrentExecutionResult result = executeConcurrentBookings(10);

        // Khẳng định 1 request thành công, 9 request bị chặn 409
        assertEquals(1, result.successCount.get(), "Chỉ duy nhất 1 request được phép tạo đơn thành công");
        assertEquals(9, result.conflictCount.get(), "9 requests còn lại bắt buộc nhận HTTP 409 Conflict");

        // Khẳng định trong CSDL chỉ có chính xác 1 đơn booking được lưu
        long totalBookingsInDb = bookingRepository.count();
        assertEquals(1, totalBookingsInDb, "DB Integrity: Trong bảng bookings chỉ được có đúng 1 đơn (ZERO OVERBOOKING)");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEST CASE 2: KIỂM CHỨNG TÍNH TOÀN VẸN CỦA AUDIT TRANSACTION (REQUIRES_NEW)
    // ═════════════════════════════════════════════════════════════════════════
    @Test
    @DisplayName("Case 2: Audit Transaction độc lập -> 1 log SUCCESS, 9 log FAILED lưu đầy đủ lý do hết phòng")
    void testCase2_AuditTransactionIntegrityUnderConcurrency() throws InterruptedException {
        executeConcurrentBookings(10);

        List<AuditLog> allAuditLogs = auditLogRepository.findAll();
        assertEquals(10, allAuditLogs.size(), "Toàn bộ 10 hành động đều phải được ghi lại trong audit_logs");

        // 1 bản ghi thành công
        long successAuditLogs = allAuditLogs.stream()
                .filter(log -> "SUCCESS".equalsIgnoreCase(log.getStatus()))
                .count();
        assertEquals(1, successAuditLogs, "Chính xác 1 bản ghi audit log có trạng thái SUCCESS");

        // 9 bản ghi thất bại
        long failedAuditLogs = allAuditLogs.stream()
                .filter(log -> "FAILED".equalsIgnoreCase(log.getStatus()))
                .count();
        assertEquals(9, failedAuditLogs, "Chính xác 9 bản ghi audit log có trạng thái FAILED (không bị rollback mất dấu)");

        // Khẳng định thông báo lỗi trong log thể hiện rõ lý do hết phòng
        for (AuditLog failLog : allAuditLogs) {
            if ("FAILED".equalsIgnoreCase(failLog.getStatus())) {
                assertEquals(AuditAction.CREATE_BOOKING, failLog.getAction());
                assertNotNull(failLog.getErrorMessage(), "Audit log thất bại phải lưu thông điệp lỗi nghiệp vụ");
                assertTrue(failLog.getErrorMessage().contains("phòng") || failLog.getErrorMessage().contains("trống"),
                        "Thông báo lỗi phải thể hiện lý do không đủ phòng trống");
            }
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEST CASE 3: ĐỘ ỔN ĐỊNH CỦA CONNECTION POOL & KHÔNG BỊ DEADLOCK
    // ═════════════════════════════════════════════════════════════════════════
    @Test
    @DisplayName("Case 3: Độ ổn định HikariCP -> 100% luồng hoàn tất trong timeout, không bị Connection Starvation")
    void testCase3_ConnectionPoolStabilityNoDeadlock() throws InterruptedException {
        ConcurrentExecutionResult result = executeConcurrentBookings(10);

        // Khẳng định toàn bộ luồng kết thúc trong giới hạn thời gian (không bị treo hay timeout chờ kết nối)
        assertTrue(result.completedInTime, "Toàn bộ 10 luồng phải hoàn thành trong thời gian cho phép mà không bị deadlock");
        assertEquals(0, result.otherErrorsCount.get(), "Không được phát sinh lỗi 500, lỗi Connection Timeout hay ngoại lệ khác");
    }

    // ─── Helper method tái sử dụng logic phát tải đồng thời ──────────────────
    private ConcurrentExecutionResult executeConcurrentBookings(int numberOfThreads) throws InterruptedException {
        ExecutorService executorService = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch readyLatch = new CountDownLatch(numberOfThreads);
        CountDownLatch startSignal = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(numberOfThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);
        AtomicInteger otherErrorsCount = new AtomicInteger(0);

        LocalDate checkIn = LocalDate.now().plusDays(20);
        LocalDate checkOut = LocalDate.now().plusDays(22);

        for (int i = 0; i < numberOfThreads; i++) {
            final User user = testUsers.get(i);
            executorService.submit(() -> {
                readyLatch.countDown();
                try {
                    startSignal.await();

                    CreateBookingRequest request = CreateBookingRequest.builder()
                            .roomTypeId(singleRoomType.getId())
                            .quantity(1)
                            .checkIn(checkIn)
                            .checkOut(checkOut)
                            .guests(2)
                            .paymentMethod("CASH")
                            .note("Tranh chấp phòng regression test")
                            .build();

                    BookingResponse response = bookingService.createBooking(request, user.getEmail());
                    if (response != null && response.getId() != null) {
                        successCount.incrementAndGet();
                    }
                } catch (AppException e) {
                    if (e.getStatus() == HttpStatus.CONFLICT) {
                        conflictCount.incrementAndGet();
                    } else {
                        otherErrorsCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    otherErrorsCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(5, TimeUnit.SECONDS);
        startSignal.countDown();
        boolean completed = doneLatch.await(20, TimeUnit.SECONDS);
        executorService.shutdown();

        return new ConcurrentExecutionResult(successCount, conflictCount, otherErrorsCount, completed);
    }

    private static class ConcurrentExecutionResult {
        final AtomicInteger successCount;
        final AtomicInteger conflictCount;
        final AtomicInteger otherErrorsCount;
        final boolean completedInTime;

        ConcurrentExecutionResult(AtomicInteger successCount, AtomicInteger conflictCount, AtomicInteger otherErrorsCount, boolean completedInTime) {
            this.successCount = successCount;
            this.conflictCount = conflictCount;
            this.otherErrorsCount = otherErrorsCount;
            this.completedInTime = completedInTime;
        }
    }
}
