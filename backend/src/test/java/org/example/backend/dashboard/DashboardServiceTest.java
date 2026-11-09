package org.example.backend.dashboard;

import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.dashboard.dto.DashboardSummaryResponse;
import org.example.backend.dashboard.service.DashboardService;
import org.example.backend.payment.entity.PaymentTransaction;
import org.example.backend.payment.entity.TransactionStatus;
import org.example.backend.payment.repository.PaymentTransactionRepository;
import org.example.backend.room.entity.Room;
import org.example.backend.room.entity.RoomStatus;
import org.example.backend.room.entity.RoomType;
import org.example.backend.room.repository.RoomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Bộ kiểm thử toàn diện cho Dashboard Service theo task [SP2-1109-THANH]:
 * 1. Phân biệt rõ ràng Doanh thu lưu trú (Accrual Basis) và Dòng tiền (Cash Basis).
 * 2. Tính toán chính xác các chỉ số ADR, RevPAR, Room Nights, Occupancy Rate.
 * 3. Kiểm thử biên: Booking vắt qua tháng (Cross-month booking).
 * 4. Kiểm thử biên: Hủy phòng có hoàn cọc (Refunds).
 * 5. Kiểm thử biên: Mẫu số 0 (Zero Denominator) an toàn tuyệt đối, không chia cho 0.
 * 6. Chuỗi dữ liệu biểu đồ theo ngày (revenueSeries).
 */
@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private RoomRepository roomRepository;

    @InjectMocks
    private DashboardService dashboardService;

    private RoomType deluxeRoomType;
    private RoomType suiteRoomType;
    private Room room101;
    private Room room102;
    private Room room103;

    @BeforeEach
    void setUp() {
        deluxeRoomType = RoomType.builder()
                .id(2L)
                .name("Deluxe Double Room")
                .basePrice(BigDecimal.valueOf(950000))
                .build();

        suiteRoomType = RoomType.builder()
                .id(3L)
                .name("Executive Suite Luxury")
                .basePrice(BigDecimal.valueOf(1800000))
                .build();

        room101 = Room.builder().id(1L).roomNumber("101").status(RoomStatus.AVAILABLE).build();
        room102 = Room.builder().id(2L).roomNumber("102").status(RoomStatus.OCCUPIED).build();
        room103 = Room.builder().id(3L).roomNumber("103").status(RoomStatus.AVAILABLE).build();
    }

    @Test
    @DisplayName("Tháng chuẩn: Tính đúng Doanh thu lưu trú, Dòng tiền, ADR, RevPAR và Occupancy")
    void testCalculateMetrics_StandardMonth_Success() {
        LocalDate dateFrom = LocalDate.of(2026, 11, 1);
        LocalDate dateTo = LocalDate.of(2026, 11, 10); // 10 ngày, 3 phòng khả dụng = 30 available room nights

        // Booking 1: 2 khách ở 4 đêm Deluxe (01/11 - 05/11), 1 phòng, tổng 3.800.000 VNĐ
        Booking b1 = Booking.builder()
                .id(1L)
                .checkInDate(LocalDate.of(2026, 11, 1))
                .checkOutDate(LocalDate.of(2026, 11, 5))
                .quantity(1)
                .totalPrice(BigDecimal.valueOf(3800000))
                .bookingStatus(BookingStatus.CHECKED_OUT)
                .paymentStatus(PaymentStatus.FULLY_PAID)
                .roomType(deluxeRoomType)
                .build();

        // Giao dịch thanh toán: Đã cọc 1.900.000 VNĐ vào ngày 01/11 và tất toán 1.900.000 VNĐ vào ngày 05/11
        PaymentTransaction txn1 = PaymentTransaction.builder()
                .id(1L)
                .amount(BigDecimal.valueOf(1900000))
                .status(TransactionStatus.SUCCESS)
                .createdAt(LocalDateTime.of(2026, 11, 1, 10, 0))
                .build();

        PaymentTransaction txn2 = PaymentTransaction.builder()
                .id(2L)
                .amount(BigDecimal.valueOf(1900000))
                .status(TransactionStatus.SUCCESS)
                .createdAt(LocalDateTime.of(2026, 11, 5, 11, 30))
                .build();

        when(bookingRepository.findAll()).thenReturn(List.of(b1));
        when(paymentTransactionRepository.findAll()).thenReturn(List.of(txn1, txn2));
        when(roomRepository.findAll()).thenReturn(List.of(room101, room102, room103));

        DashboardSummaryResponse response = dashboardService.getSummary(dateFrom, dateTo);

        assertThat(response).isNotNull();
        // Doanh thu lưu trú = 4 đêm * 950.000 = 3.800.000
        assertThat(response.getRoomRevenue()).isEqualByComparingTo(BigDecimal.valueOf(3800000));
        // Dòng tiền thực thu = 1.900.000 + 1.900.000 = 3.800.000
        assertThat(response.getNetCashFlow()).isEqualByComparingTo(BigDecimal.valueOf(3800000));
        assertThat(response.getSoldRoomNights()).isEqualTo(4);
        assertThat(response.getTotalAvailableRoomNights()).isEqualTo(30); // 3 phòng * 10 ngày

        // ADR = 3.800.000 / 4 đêm = 950.000
        assertThat(response.getAdr()).isEqualByComparingTo(BigDecimal.valueOf(950000));
        // RevPAR = 3.800.000 / 30 đêm khả dụng = 126.666,67
        assertThat(response.getRevpar()).isEqualByComparingTo(new BigDecimal("126666.67"));
        // Occupancy Rate = 4 / 30 = 0.1333 (13.33%)
        assertThat(response.getOccupancyRate()).isEqualTo(0.1333);
        assertThat(response.getRevenueSeries()).hasSize(10);
    }

    @Test
    @DisplayName("Kiểm thử qua tháng: Booking 28/10 -> 03/11 (6 đêm), chỉ tính 4 đêm cho tháng 10 và 2 đêm cho tháng 11")
    void testCalculateMetrics_CrossMonthBooking_AccrualRoomRevenueSplitCorrectly() {
        // Booking từ 28/10 đến 03/11 (6 đêm), giá 5.700.000 VNĐ (950.000/đêm)
        Booking crossMonthBooking = Booking.builder()
                .id(10L)
                .checkInDate(LocalDate.of(2026, 10, 28))
                .checkOutDate(LocalDate.of(2026, 11, 3))
                .quantity(1)
                .totalPrice(BigDecimal.valueOf(5700000))
                .bookingStatus(BookingStatus.CHECKED_OUT)
                .paymentStatus(PaymentStatus.FULLY_PAID)
                .roomType(deluxeRoomType)
                .build();

        // Giao dịch cọc: ngày 28/10 cọc 2.850.000 VNĐ
        PaymentTransaction depositTxn = PaymentTransaction.builder()
                .id(100L)
                .amount(BigDecimal.valueOf(2850000))
                .status(TransactionStatus.SUCCESS)
                .createdAt(LocalDateTime.of(2026, 10, 28, 14, 0))
                .build();

        // Giao dịch thanh toán còn lại: ngày 03/11 thanh toán 2.850.000 VNĐ
        PaymentTransaction finalTxn = PaymentTransaction.builder()
                .id(101L)
                .amount(BigDecimal.valueOf(2850000))
                .status(TransactionStatus.SUCCESS)
                .createdAt(LocalDateTime.of(2026, 11, 3, 11, 0))
                .build();

        when(bookingRepository.findAll()).thenReturn(List.of(crossMonthBooking));
        when(paymentTransactionRepository.findAll()).thenReturn(List.of(depositTxn, finalTxn));
        when(roomRepository.findAll()).thenReturn(List.of(room101, room102, room103));

        // 1. Kiểm tra kỳ tháng 10 (2026-10-01 đến 2026-10-31)
        DashboardSummaryResponse octSummary = dashboardService.getSummary(
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31));

        // Tháng 10 chỉ có 4 đêm (28, 29, 30, 31) -> 4 * 950.000 = 3.800.000 VNĐ
        assertThat(octSummary.getSoldRoomNights()).isEqualTo(4);
        assertThat(octSummary.getRoomRevenue()).isEqualByComparingTo(BigDecimal.valueOf(3800000));
        // Dòng tiền tháng 10 chỉ nhận cọc 2.850.000 VNĐ
        assertThat(octSummary.getNetCashFlow()).isEqualByComparingTo(BigDecimal.valueOf(2850000));
        assertThat(octSummary.getAdr()).isEqualByComparingTo(BigDecimal.valueOf(950000));

        // 2. Kiểm tra kỳ tháng 11 (2026-11-01 đến 2026-11-30)
        DashboardSummaryResponse novSummary = dashboardService.getSummary(
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30));

        // Tháng 11 chỉ có 2 đêm (01, 02) -> 2 * 950.000 = 1.900.000 VNĐ
        assertThat(novSummary.getSoldRoomNights()).isEqualTo(2);
        assertThat(novSummary.getRoomRevenue()).isEqualByComparingTo(BigDecimal.valueOf(1900000));
        // Dòng tiền tháng 11 nhận tiền tất toán 2.850.000 VNĐ
        assertThat(novSummary.getNetCashFlow()).isEqualByComparingTo(BigDecimal.valueOf(2850000));
        assertThat(novSummary.getAdr()).isEqualByComparingTo(BigDecimal.valueOf(950000));
    }

    @Test
    @DisplayName("Kiểm thử hoàn cọc: Đơn bị hủy có hoàn trả tiền cọc thì giảm dòng tiền, không tính doanh thu lưu trú")
    void testCalculateMetrics_RefundCancellation_ReducesCashFlowWithoutIncurredRoomRevenue() {
        LocalDate dateFrom = LocalDate.of(2026, 11, 1);
        LocalDate dateTo = LocalDate.of(2026, 11, 7);

        // Khách cọc 950.000 VNĐ vào ngày 02/11
        PaymentTransaction deposit = PaymentTransaction.builder()
                .id(201L)
                .amount(BigDecimal.valueOf(950000))
                .status(TransactionStatus.SUCCESS)
                .createdAt(LocalDateTime.of(2026, 11, 2, 9, 0))
                .build();

        // Đơn booking bị CANCELLED và được REFUNDED 100% (950.000 VNĐ) vào ngày 03/11
        Booking cancelledBooking = Booking.builder()
                .id(20L)
                .checkInDate(LocalDate.of(2026, 11, 5))
                .checkOutDate(LocalDate.of(2026, 11, 7))
                .quantity(1)
                .totalPrice(BigDecimal.valueOf(1900000))
                .bookingStatus(BookingStatus.CANCELLED)
                .paymentStatus(PaymentStatus.REFUNDED)
                .refundAmount(BigDecimal.valueOf(950000))
                .cancelledAt(LocalDateTime.of(2026, 11, 3, 15, 0))
                .roomType(deluxeRoomType)
                .build();

        when(bookingRepository.findAll()).thenReturn(List.of(cancelledBooking));
        when(paymentTransactionRepository.findAll()).thenReturn(List.of(deposit));
        when(roomRepository.findAll()).thenReturn(List.of(room101, room102, room103));

        DashboardSummaryResponse response = dashboardService.getSummary(dateFrom, dateTo);

        // Khách không ở -> Doanh thu lưu trú = 0, Đêm bán = 0
        assertThat(response.getRoomRevenue()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getSoldRoomNights()).isEqualTo(0);

        // Dòng tiền: Tiền vào 950k - Hoàn cọc 950k = 0
        assertThat(response.getTotalPaid()).isEqualByComparingTo(BigDecimal.valueOf(950000));
        assertThat(response.getRefundTotal()).isEqualByComparingTo(BigDecimal.valueOf(950000));
        assertThat(response.getNetCashFlow()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Kiểm thử mẫu số 0: Khi không có đêm phòng nào được bán (soldRoomNights = 0) → ADR trả về 0.0 an toàn")
    void testCalculateMetrics_ZeroDenominator_NoRoomsSold_AdrIsZeroWithoutException() {
        LocalDate dateFrom = LocalDate.of(2026, 11, 1);
        LocalDate dateTo = LocalDate.of(2026, 11, 5);

        when(bookingRepository.findAll()).thenReturn(List.of());
        when(paymentTransactionRepository.findAll()).thenReturn(List.of());
        when(roomRepository.findAll()).thenReturn(List.of(room101, room102, room103));

        DashboardSummaryResponse response = dashboardService.getSummary(dateFrom, dateTo);

        assertThat(response.getSoldRoomNights()).isEqualTo(0);
        assertThat(response.getAdr()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getRevpar()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getOccupancyRate()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Kiểm thử mẫu số 0: Khi tất cả phòng đều đang bảo trì (activeRooms = 0) → RevPAR trả về 0.0 an toàn")
    void testCalculateMetrics_ZeroDenominator_NoAvailableRooms_RevParIsZeroWithoutException() {
        LocalDate dateFrom = LocalDate.of(2026, 11, 1);
        LocalDate dateTo = LocalDate.of(2026, 11, 5);

        // Cả 2 phòng đều MAINTENANCE
        Room maint1 = Room.builder().id(10L).roomNumber("901").status(RoomStatus.MAINTENANCE).build();
        Room maint2 = Room.builder().id(11L).roomNumber("902").status(RoomStatus.MAINTENANCE).build();

        when(bookingRepository.findAll()).thenReturn(List.of());
        when(paymentTransactionRepository.findAll()).thenReturn(List.of());
        when(roomRepository.findAll()).thenReturn(List.of(maint1, maint2));

        DashboardSummaryResponse response = dashboardService.getSummary(dateFrom, dateTo);

        assertThat(response.getActiveRooms()).isEqualTo(0);
        assertThat(response.getTotalAvailableRoomNights()).isEqualTo(0);
        assertThat(response.getRevpar()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getOccupancyRate()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Revenue Series: Sinh đầy đủ các điểm dữ liệu cho từng ngày trong kỳ")
    void testCalculateMetrics_DailyRevenueSeries_GeneratedAccurately() {
        LocalDate dateFrom = LocalDate.of(2026, 11, 1);
        LocalDate dateTo = LocalDate.of(2026, 11, 3); // 3 ngày

        when(bookingRepository.findAll()).thenReturn(List.of());
        when(paymentTransactionRepository.findAll()).thenReturn(List.of());
        when(roomRepository.findAll()).thenReturn(List.of(room101));

        DashboardSummaryResponse response = dashboardService.getSummary(dateFrom, dateTo);

        assertThat(response.getRevenueSeries()).hasSize(3);
        assertThat(response.getRevenueSeries().get(0).getDate()).isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(response.getRevenueSeries().get(1).getDate()).isEqualTo(LocalDate.of(2026, 11, 2));
        assertThat(response.getRevenueSeries().get(2).getDate()).isEqualTo(LocalDate.of(2026, 11, 3));
    }
}
