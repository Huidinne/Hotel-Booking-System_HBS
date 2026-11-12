package org.example.backend.dashboard;

import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.dashboard.dto.DashboardMonthlyAnalyticsResponse;
import org.example.backend.dashboard.dto.DashboardMonthlyRevenuePoint;
import org.example.backend.dashboard.dto.DashboardSummaryResponse;
import org.example.backend.dashboard.projection.BookingPeriodProjection;
import org.example.backend.dashboard.projection.RefundBookingProjection;
import org.example.backend.dashboard.projection.RoomStatusCountProjection;
import org.example.backend.dashboard.repository.DashboardRepository;
import org.example.backend.dashboard.service.DashboardService;
import org.example.backend.payment.entity.PaymentTransaction;
import org.example.backend.payment.entity.TransactionStatus;
import org.example.backend.payment.repository.PaymentTransactionRepository;
import org.example.backend.room.entity.RoomStatus;
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
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Bộ kiểm thử toàn diện cho Dashboard Service theo task [SP2-1110-THANH]:
 * 1. Tiêu chí nghiệm thu 1: Giảm findAll(), chỉ truy vấn theo khoảng ngày và dùng Projection.
 * 2. Tiêu chí nghiệm thu 2: Checkout không tính thêm đêm (Ngày check-out không được tính là đêm lưu trú).
 * 3. Tiêu chí nghiệm thu 3: Biên đầu ngày & cuối ngày chính xác tuyệt đối.
 * 4. Tiêu chí nghiệm thu 4: Đơn lưu trú vắt qua tháng (Cross-month booking) phân bổ đúng số đêm từng tháng.
 * 5. Tiêu chí nghiệm thu 5: Giữ summary tương thích 100% với Frontend và các API hiện tại.
 * 6. Tiêu chí nghiệm thu 6: Xử lý an toàn mẫu số 0 (Zero Denominator) khi không có khách hoặc phòng bảo trì.
 */
@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private DashboardRepository dashboardRepository;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private RoomRepository roomRepository;

    @InjectMocks
    private DashboardService dashboardService;

    private List<RoomStatusCountProjection> sampleRoomCounts;

    @BeforeEach
    void setUp() {
        // 3 phòng khả dụng (2 AVAILABLE, 1 OCCUPIED)
        sampleRoomCounts = List.of(
                RoomStatusCountProjection.of(RoomStatus.AVAILABLE, 2L),
                RoomStatusCountProjection.of(RoomStatus.OCCUPIED, 1L)
        );
    }

    @Test
    @DisplayName("Nghiệm thu giảm findAll(): Xác minh không bao giờ gọi findAll(), chỉ gọi các query có khoảng ngày")
    void testReducedFindAll_VerifyNoFindAllCalled() {
        LocalDate dateFrom = LocalDate.of(2026, 11, 1);
        LocalDate dateTo = LocalDate.of(2026, 11, 10);

        when(roomRepository.countRoomsGroupByStatus()).thenReturn(sampleRoomCounts);
        when(dashboardRepository.findActivePeriodBookings(dateFrom, dateTo)).thenReturn(Collections.emptyList());
        when(dashboardRepository.findOccupiedBookingsInPeriod(dateFrom, dateTo)).thenReturn(Collections.emptyList());
        when(dashboardRepository.findRefundedBookingsInPeriod(any(), any())).thenReturn(Collections.emptyList());
        when(paymentTransactionRepository.findSuccessfulTransactionsBetween(any(), any())).thenReturn(Collections.emptyList());
        when(dashboardRepository.countTotalBookingsInPeriod(dateFrom, dateTo)).thenReturn(0L);

        DashboardSummaryResponse response = dashboardService.getSummary(dateFrom, dateTo);

        assertThat(response).isNotNull();

        // Xác minh TUYỆT ĐỐI KHÔNG GỌI findAll()
        verify(dashboardRepository, never()).findAll();
        verify(paymentTransactionRepository, never()).findAll();
        verify(roomRepository, never()).findAll();

        // Xác minh ĐÃ GỌI query theo khoảng ngày
        verify(dashboardRepository, times(1)).findOccupiedBookingsInPeriod(dateFrom, dateTo);
        verify(dashboardRepository, times(1)).findActivePeriodBookings(dateFrom, dateTo);
        verify(roomRepository, times(1)).countRoomsGroupByStatus();
    }

    @Test
    @DisplayName("Tháng chuẩn: Tính đúng Doanh thu lưu trú, Dòng tiền, ADR, RevPAR và Occupancy Rate")
    void testCalculateMetrics_StandardMonth_Success() {
        LocalDate dateFrom = LocalDate.of(2026, 11, 1);
        LocalDate dateTo = LocalDate.of(2026, 11, 10); // 10 ngày, 3 phòng khả dụng = 30 available room nights

        // Booking 1: 4 đêm Deluxe (01/11 - 05/11), 1 phòng, tổng 3.800.000 VNĐ (950k/đêm)
        BookingPeriodProjection b1 = BookingPeriodProjection.of(
                1L,
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 11, 5),
                1,
                BigDecimal.valueOf(3800000),
                BigDecimal.valueOf(1900000),
                BookingStatus.CHECKED_OUT,
                PaymentStatus.FULLY_PAID,
                2L,
                "Deluxe Double Room"
        );

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

        when(roomRepository.countRoomsGroupByStatus()).thenReturn(sampleRoomCounts);
        when(dashboardRepository.findActivePeriodBookings(dateFrom, dateTo)).thenReturn(List.of(b1));
        when(dashboardRepository.findOccupiedBookingsInPeriod(dateFrom, dateTo)).thenReturn(List.of(b1));
        when(dashboardRepository.findRefundedBookingsInPeriod(any(), any())).thenReturn(Collections.emptyList());
        when(paymentTransactionRepository.findSuccessfulTransactionsBetween(any(), any())).thenReturn(List.of(txn1, txn2));
        when(dashboardRepository.countTotalBookingsInPeriod(dateFrom, dateTo)).thenReturn(1L);

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
    @DisplayName("Nghiệm thu: Ngày Check-out không tính thêm đêm lưu trú (Checkout Date Exclusion)")
    void testCalculateMetrics_CheckoutDateDoesNotCountNight() {
        LocalDate dateFrom = LocalDate.of(2026, 11, 1);
        LocalDate dateTo = LocalDate.of(2026, 11, 10);

        // Khách ở từ 01/11 đến 05/11 (4 đêm: đêm 1, 2, 3, 4). Ngày 05/11 checkout lúc 11:00.
        BookingPeriodProjection b1 = BookingPeriodProjection.of(
                1L,
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 11, 5),
                1,
                BigDecimal.valueOf(4000000),
                BigDecimal.valueOf(2000000),
                BookingStatus.CHECKED_OUT,
                PaymentStatus.FULLY_PAID,
                2L,
                "Deluxe Double Room"
        );

        when(roomRepository.countRoomsGroupByStatus()).thenReturn(sampleRoomCounts);
        when(dashboardRepository.findActivePeriodBookings(dateFrom, dateTo)).thenReturn(List.of(b1));
        when(dashboardRepository.findOccupiedBookingsInPeriod(dateFrom, dateTo)).thenReturn(List.of(b1));
        when(dashboardRepository.findRefundedBookingsInPeriod(any(), any())).thenReturn(Collections.emptyList());
        when(paymentTransactionRepository.findSuccessfulTransactionsBetween(any(), any())).thenReturn(Collections.emptyList());
        when(dashboardRepository.countTotalBookingsInPeriod(dateFrom, dateTo)).thenReturn(1L);

        DashboardSummaryResponse response = dashboardService.getSummary(dateFrom, dateTo);

        // Tổng số đêm tính đúng 4 đêm (không phải 5 đêm)
        assertThat(response.getSoldRoomNights()).isEqualTo(4);

        // Kiểm tra biểu đồ theo ngày (revenueSeries):
        // Ngày 04/11 (đêm thứ 4): Có 1 phòng ở (soldRoomNights = 1)
        assertThat(response.getRevenueSeries().get(3).getDate()).isEqualTo(LocalDate.of(2026, 11, 4));
        assertThat(response.getRevenueSeries().get(3).getSoldRoomNights()).isEqualTo(1L);

        // Ngày 05/11 (ngày checkout): KHÔNG TÍNH ĐÊM (soldRoomNights = 0)
        assertThat(response.getRevenueSeries().get(4).getDate()).isEqualTo(LocalDate.of(2026, 11, 5));
        assertThat(response.getRevenueSeries().get(4).getSoldRoomNights()).isEqualTo(0L);
        assertThat(response.getRevenueSeries().get(4).getRoomRevenue()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Nghiệm thu biên đầu/cuối ngày: Check-in đúng ngày dateTo được tính đúng 1 đêm; Checkout đúng dateFrom tính 0 đêm")
    void testCalculateMetrics_BoundaryDates_HeadAndTailCalculatedCorrectly() {
        LocalDate dateFrom = LocalDate.of(2026, 11, 5);
        LocalDate dateTo = LocalDate.of(2026, 11, 10);

        // Booking A (Biên đầu ngày): Khách checkout đúng ngày dateFrom (01/11 -> 05/11) ➔ Trong kỳ [05/11, 10/11] tính 0 đêm
        BookingPeriodProjection bHead = BookingPeriodProjection.of(
                10L,
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 11, 5), // checkout ngày 5/11
                1,
                BigDecimal.valueOf(4000000),
                BigDecimal.valueOf(2000000),
                BookingStatus.CHECKED_OUT,
                PaymentStatus.FULLY_PAID,
                2L,
                "Deluxe Double Room"
        );

        // Booking B (Biên cuối ngày): Khách check-in đúng ngày dateTo (10/11 -> 12/11) ➔ Trong kỳ [05/11, 10/11] tính đúng 1 đêm (đêm 10/11)
        BookingPeriodProjection bTail = BookingPeriodProjection.of(
                11L,
                LocalDate.of(2026, 11, 10),
                LocalDate.of(2026, 11, 12),
                1,
                BigDecimal.valueOf(2000000),
                BigDecimal.valueOf(1000000),
                BookingStatus.CHECKED_IN,
                PaymentStatus.PARTIALLY_PAID,
                2L,
                "Deluxe Double Room"
        );

        when(roomRepository.countRoomsGroupByStatus()).thenReturn(sampleRoomCounts);
        when(dashboardRepository.findActivePeriodBookings(dateFrom, dateTo)).thenReturn(List.of(bHead, bTail));
        when(dashboardRepository.findOccupiedBookingsInPeriod(dateFrom, dateTo)).thenReturn(List.of(bHead, bTail));
        when(dashboardRepository.findRefundedBookingsInPeriod(any(), any())).thenReturn(Collections.emptyList());
        when(paymentTransactionRepository.findSuccessfulTransactionsBetween(any(), any())).thenReturn(Collections.emptyList());
        when(dashboardRepository.countTotalBookingsInPeriod(dateFrom, dateTo)).thenReturn(2L);

        DashboardSummaryResponse response = dashboardService.getSummary(dateFrom, dateTo);

        // Chỉ có bTail đóng góp 1 đêm (đêm 10/11) vào kỳ; bHead checkout sáng 05/11 đóng góp 0 đêm
        assertThat(response.getSoldRoomNights()).isEqualTo(1L);
        assertThat(response.getRoomRevenue()).isEqualByComparingTo(BigDecimal.valueOf(1000000)); // 2.000.000 / 2 đêm = 1.000.000/đêm

        // Điểm biểu đồ ngày cuối cùng 10/11 có 1 đêm bán
        int lastIndex = response.getRevenueSeries().size() - 1;
        assertThat(response.getRevenueSeries().get(lastIndex).getDate()).isEqualTo(dateTo);
        assertThat(response.getRevenueSeries().get(lastIndex).getSoldRoomNights()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Nghiệm thu qua tháng: Booking 28/10 -> 03/11 (6 đêm), chỉ tính 4 đêm cho tháng 10 và 2 đêm cho tháng 11")
    void testCalculateMetrics_CrossMonthBooking_AccrualRoomRevenueSplitCorrectly() {
        BookingPeriodProjection crossMonthBooking = BookingPeriodProjection.of(
                10L,
                LocalDate.of(2026, 10, 28),
                LocalDate.of(2026, 11, 3), // 6 đêm, 950k/đêm = 5.700.000 VNĐ
                1,
                BigDecimal.valueOf(5700000),
                BigDecimal.valueOf(2850000),
                BookingStatus.CHECKED_OUT,
                PaymentStatus.FULLY_PAID,
                2L,
                "Deluxe Double Room"
        );

        PaymentTransaction depositTxn = PaymentTransaction.builder()
                .id(100L)
                .amount(BigDecimal.valueOf(2850000))
                .status(TransactionStatus.SUCCESS)
                .createdAt(LocalDateTime.of(2026, 10, 28, 14, 0))
                .build();

        PaymentTransaction finalTxn = PaymentTransaction.builder()
                .id(101L)
                .amount(BigDecimal.valueOf(2850000))
                .status(TransactionStatus.SUCCESS)
                .createdAt(LocalDateTime.of(2026, 11, 3, 11, 0))
                .build();

        // 1. Kỳ tháng 10 (2026-10-01 đến 2026-10-31)
        LocalDate octFrom = LocalDate.of(2026, 10, 1);
        LocalDate octTo = LocalDate.of(2026, 10, 31);

        when(roomRepository.countRoomsGroupByStatus()).thenReturn(sampleRoomCounts);
        when(dashboardRepository.findActivePeriodBookings(octFrom, octTo)).thenReturn(List.of(crossMonthBooking));
        when(dashboardRepository.findOccupiedBookingsInPeriod(octFrom, octTo)).thenReturn(List.of(crossMonthBooking));
        when(dashboardRepository.findRefundedBookingsInPeriod(any(), any())).thenReturn(Collections.emptyList());
        when(paymentTransactionRepository.findSuccessfulTransactionsBetween(octFrom.atStartOfDay(), octTo.atTime(23, 59, 59, 999999999)))
                .thenReturn(List.of(depositTxn));
        when(dashboardRepository.countTotalBookingsInPeriod(octFrom, octTo)).thenReturn(1L);

        DashboardSummaryResponse octSummary = dashboardService.getSummary(octFrom, octTo);

        // Tháng 10 chỉ có 4 đêm (28, 29, 30, 31) -> 4 * 950.000 = 3.800.000 VNĐ
        assertThat(octSummary.getSoldRoomNights()).isEqualTo(4L);
        assertThat(octSummary.getRoomRevenue()).isEqualByComparingTo(BigDecimal.valueOf(3800000));
        assertThat(octSummary.getNetCashFlow()).isEqualByComparingTo(BigDecimal.valueOf(2850000));

        // 2. Kỳ tháng 11 (2026-11-01 đến 2026-11-30)
        LocalDate novFrom = LocalDate.of(2026, 11, 1);
        LocalDate novTo = LocalDate.of(2026, 11, 30);

        when(dashboardRepository.findActivePeriodBookings(novFrom, novTo)).thenReturn(List.of(crossMonthBooking));
        when(dashboardRepository.findOccupiedBookingsInPeriod(novFrom, novTo)).thenReturn(List.of(crossMonthBooking));
        when(paymentTransactionRepository.findSuccessfulTransactionsBetween(novFrom.atStartOfDay(), novTo.atTime(23, 59, 59, 999999999)))
                .thenReturn(List.of(finalTxn));
        when(dashboardRepository.countTotalBookingsInPeriod(novFrom, novTo)).thenReturn(1L);

        DashboardSummaryResponse novSummary = dashboardService.getSummary(novFrom, novTo);

        // Tháng 11 chỉ có 2 đêm (01, 02) -> 2 * 950.000 = 1.900.000 VNĐ (ngày 03/11 checkout không tính đêm)
        assertThat(novSummary.getSoldRoomNights()).isEqualTo(2L);
        assertThat(novSummary.getRoomRevenue()).isEqualByComparingTo(BigDecimal.valueOf(1900000));
        assertThat(novSummary.getNetCashFlow()).isEqualByComparingTo(BigDecimal.valueOf(2850000));
    }

    @Test
    @DisplayName("Kiểm thử hoàn cọc: Đơn bị hủy có hoàn tiền cọc thì giảm dòng tiền, không tính doanh thu lưu trú")
    void testCalculateMetrics_RefundCancellation_ReducesCashFlowWithoutIncurredRoomRevenue() {
        LocalDate dateFrom = LocalDate.of(2026, 11, 1);
        LocalDate dateTo = LocalDate.of(2026, 11, 7);

        PaymentTransaction deposit = PaymentTransaction.builder()
                .id(201L)
                .amount(BigDecimal.valueOf(950000))
                .status(TransactionStatus.SUCCESS)
                .createdAt(LocalDateTime.of(2026, 11, 2, 9, 0))
                .build();

        RefundBookingProjection refund = RefundBookingProjection.of(
                20L,
                BigDecimal.valueOf(950000),
                LocalDateTime.of(2026, 11, 3, 15, 0),
                LocalDateTime.of(2026, 11, 3, 15, 0)
        );

        when(roomRepository.countRoomsGroupByStatus()).thenReturn(sampleRoomCounts);
        when(dashboardRepository.findActivePeriodBookings(dateFrom, dateTo)).thenReturn(Collections.emptyList());
        when(dashboardRepository.findOccupiedBookingsInPeriod(dateFrom, dateTo)).thenReturn(Collections.emptyList());
        when(dashboardRepository.findRefundedBookingsInPeriod(any(), any())).thenReturn(List.of(refund));
        when(paymentTransactionRepository.findSuccessfulTransactionsBetween(any(), any())).thenReturn(List.of(deposit));
        when(dashboardRepository.countTotalBookingsInPeriod(dateFrom, dateTo)).thenReturn(0L);

        DashboardSummaryResponse response = dashboardService.getSummary(dateFrom, dateTo);

        // Khách không ở -> Doanh thu lưu trú = 0, Đêm bán = 0
        assertThat(response.getRoomRevenue()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getSoldRoomNights()).isEqualTo(0L);

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

        when(roomRepository.countRoomsGroupByStatus()).thenReturn(sampleRoomCounts);
        when(dashboardRepository.findActivePeriodBookings(dateFrom, dateTo)).thenReturn(Collections.emptyList());
        when(dashboardRepository.findOccupiedBookingsInPeriod(dateFrom, dateTo)).thenReturn(Collections.emptyList());
        when(dashboardRepository.findRefundedBookingsInPeriod(any(), any())).thenReturn(Collections.emptyList());
        when(paymentTransactionRepository.findSuccessfulTransactionsBetween(any(), any())).thenReturn(Collections.emptyList());
        when(dashboardRepository.countTotalBookingsInPeriod(dateFrom, dateTo)).thenReturn(0L);

        DashboardSummaryResponse response = dashboardService.getSummary(dateFrom, dateTo);

        assertThat(response.getSoldRoomNights()).isEqualTo(0L);
        assertThat(response.getAdr()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getRevpar()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getOccupancyRate()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Kiểm thử mẫu số 0: Khi tất cả phòng đều đang bảo trì (activeRooms = 0) → RevPAR trả về 0.0 an toàn")
    void testCalculateMetrics_ZeroDenominator_NoAvailableRooms_RevParIsZeroWithoutException() {
        LocalDate dateFrom = LocalDate.of(2026, 11, 1);
        LocalDate dateTo = LocalDate.of(2026, 11, 5);

        List<RoomStatusCountProjection> allMaintCounts = List.of(
                RoomStatusCountProjection.of(RoomStatus.MAINTENANCE, 2L)
        );

        when(roomRepository.countRoomsGroupByStatus()).thenReturn(allMaintCounts);
        when(dashboardRepository.findActivePeriodBookings(dateFrom, dateTo)).thenReturn(Collections.emptyList());
        when(dashboardRepository.findOccupiedBookingsInPeriod(dateFrom, dateTo)).thenReturn(Collections.emptyList());
        when(dashboardRepository.findRefundedBookingsInPeriod(any(), any())).thenReturn(Collections.emptyList());
        when(paymentTransactionRepository.findSuccessfulTransactionsBetween(any(), any())).thenReturn(Collections.emptyList());
        when(dashboardRepository.countTotalBookingsInPeriod(dateFrom, dateTo)).thenReturn(0L);

        DashboardSummaryResponse response = dashboardService.getSummary(dateFrom, dateTo);

        assertThat(response.getActiveRooms()).isEqualTo(0L);
        assertThat(response.getTotalAvailableRoomNights()).isEqualTo(0L);
        assertThat(response.getRevpar()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getOccupancyRate()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Nghiệm thu series theo khoảng ngày: Sinh đầy đủ và liên tục các mốc ngày trong kỳ [dateFrom, dateTo]")
    void testCalculateMetrics_DailyRevenueSeries_GeneratedAccurately() {
        LocalDate dateFrom = LocalDate.of(2026, 11, 1);
        LocalDate dateTo = LocalDate.of(2026, 11, 3); // 3 ngày

        when(roomRepository.countRoomsGroupByStatus()).thenReturn(sampleRoomCounts);
        when(dashboardRepository.findActivePeriodBookings(dateFrom, dateTo)).thenReturn(Collections.emptyList());
        when(dashboardRepository.findOccupiedBookingsInPeriod(dateFrom, dateTo)).thenReturn(Collections.emptyList());
        when(dashboardRepository.findRefundedBookingsInPeriod(any(), any())).thenReturn(Collections.emptyList());
        when(paymentTransactionRepository.findSuccessfulTransactionsBetween(any(), any())).thenReturn(Collections.emptyList());
        when(dashboardRepository.countTotalBookingsInPeriod(dateFrom, dateTo)).thenReturn(0L);

        DashboardSummaryResponse response = dashboardService.getSummary(dateFrom, dateTo);

        assertThat(response.getRevenueSeries()).hasSize(3);
        assertThat(response.getRevenueSeries().get(0).getDate()).isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(response.getRevenueSeries().get(1).getDate()).isEqualTo(LocalDate.of(2026, 11, 2));
        assertThat(response.getRevenueSeries().get(2).getDate()).isEqualTo(LocalDate.of(2026, 11, 3));
    }

    @Test
    @DisplayName("Nghiệm thu API 12 tháng: getMonthlyAnalytics sinh đủ 12 tháng, phân bổ đêm qua tháng chuẩn xác")
    void testMonthlyAnalytics_Full12Months_GeneratedAccurately() {
        BookingPeriodProjection crossMonthBooking = BookingPeriodProjection.of(
                10L,
                LocalDate.of(2026, 10, 28),
                LocalDate.of(2026, 11, 3), // 6 đêm, 950k/đêm = 5.700.000 VNĐ
                1,
                BigDecimal.valueOf(5700000),
                BigDecimal.valueOf(2850000),
                BookingStatus.CHECKED_OUT,
                PaymentStatus.FULLY_PAID,
                2L,
                "Deluxe Double Room"
        );

        BookingPeriodProjection juneBooking = BookingPeriodProjection.of(
                11L,
                LocalDate.of(2026, 6, 10),
                LocalDate.of(2026, 6, 15), // 5 đêm, 2.000.000/đêm = 10.000.000 VNĐ
                1,
                BigDecimal.valueOf(10000000),
                BigDecimal.valueOf(5000000),
                BookingStatus.CHECKED_OUT,
                PaymentStatus.FULLY_PAID,
                3L,
                "Executive Suite Luxury"
        );

        PaymentTransaction juneTxn = PaymentTransaction.builder()
                .id(301L)
                .amount(BigDecimal.valueOf(10000000))
                .status(TransactionStatus.SUCCESS)
                .createdAt(LocalDateTime.of(2026, 6, 10, 10, 0))
                .build();

        LocalDate yearStart = LocalDate.of(2026, 1, 1);
        LocalDate yearEnd = LocalDate.of(2026, 12, 31);

        when(roomRepository.countRoomsGroupByStatus()).thenReturn(sampleRoomCounts);
        when(dashboardRepository.findOccupiedBookingsInPeriod(yearStart, yearEnd))
                .thenReturn(List.of(crossMonthBooking, juneBooking));
        when(paymentTransactionRepository.findSuccessfulTransactionsBetween(any(), any()))
                .thenReturn(List.of(juneTxn));
        when(dashboardRepository.findRefundedBookingsInPeriod(any(), any()))
                .thenReturn(Collections.emptyList());

        DashboardMonthlyAnalyticsResponse response = dashboardService.getMonthlyAnalytics(2026, null, null);

        assertThat(response).isNotNull();
        assertThat(response.getYear()).isEqualTo(2026);
        assertThat(response.getMonthly()).hasSize(12);

        // Kiểm tra tháng 1: không có booking nào -> 0đ
        DashboardMonthlyRevenuePoint m1 = response.getMonthly().get(0);
        assertThat(m1.getMonth()).isEqualTo("Tháng 01/2026");
        assertThat(m1.getRoomRevenue()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(m1.getSoldRoomNights()).isEqualTo(0L);
        assertThat(m1.getAdr()).isEqualByComparingTo(BigDecimal.ZERO);

        // Kiểm tra tháng 6: 5 đêm * 2.000.000 = 10.000.000 VNĐ
        DashboardMonthlyRevenuePoint m6 = response.getMonthly().get(5);
        assertThat(m6.getMonth()).isEqualTo("Tháng 06/2026");
        assertThat(m6.getSoldRoomNights()).isEqualTo(5L);
        assertThat(m6.getRoomRevenue()).isEqualByComparingTo(BigDecimal.valueOf(10000000));
        assertThat(m6.getAdr()).isEqualByComparingTo(BigDecimal.valueOf(2000000));
        assertThat(m6.getNetCashFlow()).isEqualByComparingTo(BigDecimal.valueOf(10000000));

        // Kiểm tra tháng 10: 4 đêm * 950.000 = 3.800.000 VNĐ
        DashboardMonthlyRevenuePoint m10 = response.getMonthly().get(9);
        assertThat(m10.getMonth()).isEqualTo("Tháng 10/2026");
        assertThat(m10.getSoldRoomNights()).isEqualTo(4L);
        assertThat(m10.getRoomRevenue()).isEqualByComparingTo(BigDecimal.valueOf(3800000));

        // Kiểm tra tháng 11: 2 đêm * 950.000 = 1.900.000 VNĐ (ngày 03/11 checkout không tính đêm)
        DashboardMonthlyRevenuePoint m11 = response.getMonthly().get(10);
        assertThat(m11.getMonth()).isEqualTo("Tháng 11/2026");
        assertThat(m11.getSoldRoomNights()).isEqualTo(2L);
        assertThat(m11.getRoomRevenue()).isEqualByComparingTo(BigDecimal.valueOf(1900000));

        // Tổng doanh thu cả năm = 10M + 3.8M + 1.9M = 15.7M
        assertThat(response.getTotalRoomRevenue()).isEqualByComparingTo(BigDecimal.valueOf(15700000));
        assertThat(response.getTotalSoldRoomNights()).isEqualTo(11L);

        // Cơ cấu loại phòng có đủ 2 loại và có trường percentage
        assertThat(response.getRoomTypes()).hasSize(2);
        assertThat(response.getRoomTypes().get(0).getPercentage()).isNotNull();
    }

    @Test
    @DisplayName("Nghiệm thu API 12 tháng: Năm không có doanh thu xử lý mẫu số 0 an toàn không ném ngoại lệ")
    void testMonthlyAnalytics_ZeroRevenueYear_ZeroDenominatorSafe() {
        LocalDate yearStart = LocalDate.of(2026, 1, 1);
        LocalDate yearEnd = LocalDate.of(2026, 12, 31);

        when(roomRepository.countRoomsGroupByStatus()).thenReturn(sampleRoomCounts);
        when(dashboardRepository.findOccupiedBookingsInPeriod(yearStart, yearEnd))
                .thenReturn(Collections.emptyList());
        when(paymentTransactionRepository.findSuccessfulTransactionsBetween(any(), any()))
                .thenReturn(Collections.emptyList());
        when(dashboardRepository.findRefundedBookingsInPeriod(any(), any()))
                .thenReturn(Collections.emptyList());

        DashboardMonthlyAnalyticsResponse response = dashboardService.getMonthlyAnalytics(2026, null, null);

        assertThat(response).isNotNull();
        assertThat(response.getMonthly()).hasSize(12);
        assertThat(response.getTotalRoomRevenue()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getTotalSoldRoomNights()).isEqualTo(0L);
        assertThat(response.getAverageAdr()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getAverageRevpar()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getAverageOccupancyRate()).isEqualTo(0.0);
    }
}
