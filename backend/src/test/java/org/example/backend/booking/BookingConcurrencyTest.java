package org.example.backend.booking;

import org.example.backend.booking.dto.BookingResponse;
import org.example.backend.booking.dto.CreateBookingRequest;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.booking.service.BookingService;
import org.example.backend.common.exception.AppException;
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
 * Kiểm thử khả năng chịu tải đồng thời & chống Overbooking bằng Pessimistic Lock (SRS §3.3 & NFR-03):
 *
 * Kịch bản: Khách sạn chỉ còn ĐÚNG 1 PHÒNG TRỐNG duy nhất cho loại phòng này.
 * Giả lập 10 requests cùng gửi đến đồng thời trong cùng 1 tích tắc.
 *
 * Kỳ vọng nghiệm thu:
 * - Đúng 1 request thành công (Tạo đơn thành công)
 * - 9 requests còn lại bị từ chối với HTTP 409 Conflict
 * - Trong DB chỉ có duy nhất 1 bản ghi Booking được tạo
 */
@SpringBootTest
class BookingConcurrencyTest {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private BookingRepository bookingRepository;

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
        bookingRepository.deleteAll();
        roomRepository.deleteAll();
        roomTypeRepository.deleteAll();
        userRepository.deleteAll();
        testUsers.clear();

        // 1. Tạo loại phòng có đúng 1 phòng vật lý
        singleRoomType = roomTypeRepository.save(RoomType.builder()
                .name("Single Luxury Room")
                .capacity(1)
                .basePrice(BigDecimal.valueOf(800000))
                .description("Phòng đơn chỉ có 1 phòng duy nhất")
                .isActive(true)
                .build());

        roomRepository.save(Room.builder()
                .roomNumber("501")
                .floor(5)
                .roomType(singleRoomType)
                .status(RoomStatus.AVAILABLE)
                .build());

        // 2. Tạo 10 tài khoản khách hàng độc lập
        for (int i = 1; i <= 10; i++) {
            User user = userRepository.save(User.builder()
                    .email("guest" + i + "@concurrency.com")
                    .password("Pass@123")
                    .fullName("Guest " + i)
                    .phone("090000000" + i)
                    .role(Role.ROLE_CUSTOMER)
                    .build());
            testUsers.add(user);
        }
    }

    @Test
    @DisplayName("Đặt đồng thời 10 luồng vào 1 phòng cuối cùng: Chỉ đúng 1 thành công, 9 bị từ chối 409 Conflict")
    void testConcurrentBookingLastRoom() throws InterruptedException {
        int numberOfThreads = 10;
        ExecutorService executorService = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch readyLatch = new CountDownLatch(numberOfThreads);
        CountDownLatch startSignal = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(numberOfThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);
        AtomicInteger otherErrorsCount = new AtomicInteger(0);

        LocalDate checkIn = LocalDate.now().plusDays(10);
        LocalDate checkOut = LocalDate.now().plusDays(12);

        for (int i = 0; i < numberOfThreads; i++) {
            final User user = testUsers.get(i);
            executorService.submit(() -> {
                readyLatch.countDown();
                try {
                    // Đợi tất cả 10 luồng sẵn sàng rồi cùng kích hoạt một lúc
                    startSignal.await();

                    CreateBookingRequest request = CreateBookingRequest.builder()
                            .roomTypeId(singleRoomType.getId())
                            .quantity(1)
                            .checkIn(checkIn)
                            .checkOut(checkOut)
                            .guests(1)
                            .paymentMethod("CASH")
                            .note("Concurrent booking test")
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

        // Đợi 10 luồng vào vị trí xuất phát
        readyLatch.await(5, TimeUnit.SECONDS);
        // Bắn súng hiệu cho 10 luồng cùng chạy
        startSignal.countDown();
        // Đợi 10 luồng hoàn tất
        boolean completed = doneLatch.await(15, TimeUnit.SECONDS);
        executorService.shutdown();

        assertTrue(completed, "Toàn bộ 10 luồng phải hoàn thành trong thời gian cho phép");
        assertEquals(1, successCount.get(), "Chỉ DUY NHẤT 1 request được phép thành công");
        assertEquals(9, conflictCount.get(), "9 requests còn lại bắt buộc phải nhận HTTP 409 Conflict");
        assertEquals(0, otherErrorsCount.get(), "Không được có lỗi không mong muốn khác");

        // Kiểm tra trong database: chỉ có đúng 1 booking được lưu
        long totalBookingsInDb = bookingRepository.count();
        assertEquals(1, totalBookingsInDb, "Trong cơ sở dữ liệu chỉ được tồn tại đúng 1 booking");
    }
}
