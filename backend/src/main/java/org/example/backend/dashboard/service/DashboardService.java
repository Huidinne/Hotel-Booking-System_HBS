package org.example.backend.dashboard.service;

import lombok.extern.slf4j.Slf4j;
import org.example.backend.dashboard.dto.DashboardDailyRevenuePoint;
import org.example.backend.dashboard.dto.DashboardMonthlyAnalyticsResponse;
import org.example.backend.dashboard.dto.DashboardMonthlyRevenuePoint;
import org.example.backend.dashboard.dto.DashboardRoomTypeRevenue;
import org.example.backend.dashboard.dto.DashboardSummaryResponse;
import org.example.backend.dashboard.projection.BookingPeriodProjection;
import org.example.backend.dashboard.projection.RefundBookingProjection;
import org.example.backend.dashboard.projection.RoomStatusCountProjection;
import org.example.backend.dashboard.repository.DashboardRepository;
import org.example.backend.payment.entity.PaymentTransaction;
import org.example.backend.payment.repository.PaymentTransactionRepository;
import org.example.backend.room.entity.RoomStatus;
import org.example.backend.room.repository.RoomRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Service tính toán số liệu thống kê quản trị cho Admin Dashboard theo SRS §2.7, §11.6 & FR-14:
 * 1. Triệt để loại bỏ findAll():
 *    - Sử dụng DashboardRepository, PaymentTransactionRepository và RoomRepository truy vấn có điều kiện theo khoảng ngày [dateFrom, dateTo].
 *    - Dùng Spring Data JPA Projection trích xuất nhẹ dữ liệu, tối ưu RAM và giảm tải I/O.
 * 2. Phân biệt rạch ròi:
 *    - Doanh thu lưu trú (Room Revenue / Accrual Basis): Giá trị đêm phòng thực tế tiêu dùng trong kỳ.
 *    - Dòng tiền thực thu (Net Cash Flow / Cash Basis): Tiền thu vào qua VNPay/tiền mặt trừ đi tiền cọc hoàn.
 * 3. Các chỉ số hiệu suất chuẩn ngành khách sạn:
 *    - ADR (Average Daily Rate): Giá bán bình quân mỗi đêm phòng đã bán.
 *    - RevPAR (Revenue Per Available Room): Doanh thu trên mỗi phòng khả dụng.
 *    - Tỷ lệ lấp đầy (Occupancy Rate) và Đêm phòng (Room Nights).
 * 4. Xử lý an toàn các biên nghiệp vụ phức tạp:
 *    - Đơn đặt phòng vắt qua tháng (Cross-month booking): Phân bổ chính xác số đêm thuộc kỳ báo cáo.
 *    - Checkout không tính thêm đêm: Ngày khách trả phòng (checkOutDate) không được tính là đêm lưu trú.
 *    - Biên đầu ngày, cuối ngày chính xác tuyệt đối.
 *    - Đơn hủy có hoàn tiền cọc (Refunds): Trừ dòng tiền nhưng không ảnh hưởng doanh thu lưu trú.
 *    - Xử lý mẫu số 0 (Zero Denominator): An toàn tuyệt đối, không ném ArithmeticException khi không có khách hoặc không có phòng khả dụng.
 * 5. Chuỗi dữ liệu biểu đồ theo ngày (revenueSeries) và cơ cấu doanh thu theo hạng phòng, giữ tương thích 100% với Frontend.
 */
@Slf4j
@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final DashboardRepository dashboardRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final RoomRepository roomRepository;

    public DashboardService(DashboardRepository dashboardRepository,
                            PaymentTransactionRepository paymentTransactionRepository,
                            RoomRepository roomRepository) {
        this.dashboardRepository = dashboardRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.roomRepository = roomRepository;
    }

    public DashboardSummaryResponse getSummary(LocalDate dateFrom, LocalDate dateTo) {
        // Mặc định tháng hiện tại nếu không truyền khoảng ngày
        LocalDate now = LocalDate.now();
        if (dateFrom == null) {
            dateFrom = now.withDayOfMonth(1);
        }
        if (dateTo == null) {
            dateTo = now.withDayOfMonth(now.lengthOfMonth());
        }

        // Đảm bảo dateFrom luôn <= dateTo
        if (dateFrom.isAfter(dateTo)) {
            LocalDate temp = dateFrom;
            dateFrom = dateTo;
            dateTo = temp;
        }

        LocalDateTime startDateTime = dateFrom.atStartOfDay();
        LocalDateTime endDateTime = dateTo.atTime(LocalTime.MAX);

        final LocalDate from = dateFrom;
        final LocalDate to = dateTo;

        // =========================================================================
        // 1. THỐNG KÊ BUỒNG PHÒNG VẬT LÝ & ĐÊM PHÒNG KHẢ DỤNG (Không dùng findAll)
        // =========================================================================
        List<RoomStatusCountProjection> roomStatusCounts = roomRepository.countRoomsGroupByStatus();
        Map<String, Integer> roomCounts = new HashMap<>();
        for (RoomStatus status : RoomStatus.values()) {
            roomCounts.put(status.name(), 0);
        }
        long totalRooms = 0;
        long activeRooms = 0;

        if (roomStatusCounts != null) {
            for (RoomStatusCountProjection item : roomStatusCounts) {
                if (item != null && item.getStatus() != null) {
                    int count = item.getCount() != null ? item.getCount().intValue() : 0;
                    roomCounts.put(item.getStatus().name(), count);
                    totalRooms += count;
                    if (item.getStatus() != RoomStatus.MAINTENANCE) {
                        activeRooms += count;
                    }
                }
            }
        }

        long totalDaysInPeriod = Math.max(1, ChronoUnit.DAYS.between(from, to) + 1);
        long totalAvailableRoomNights = activeRooms * totalDaysInPeriod;

        // =========================================================================
        // 2. DOANH THU DỰ KIẾN (EXPECTED REVENUE) & BOOKING ĐÃ XÁC NHẬN
        // =========================================================================
        List<BookingPeriodProjection> activePeriodBookings = dashboardRepository.findActivePeriodBookings(from, to);
        if (activePeriodBookings == null) {
            activePeriodBookings = Collections.emptyList();
        }

        BigDecimal expectedRevenue = activePeriodBookings.stream()
                .map(b -> b.getTotalPrice() != null ? b.getTotalPrice() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long confirmedBookings = activePeriodBookings.size();

        // =========================================================================
        // 3. DOANH THU LƯU TRÚ (ROOM REVENUE) & ĐÊM PHÒNG ĐÃ BÁN (SOLD ROOM NIGHTS)
        //    (Nguyên tắc dồn tích - Accrual Basis, xử lý đơn vắt qua tháng, checkout không thêm đêm)
        // =========================================================================
        List<BookingPeriodProjection> occupiedBookings = dashboardRepository.findOccupiedBookingsInPeriod(from, to);
        if (occupiedBookings == null) {
            occupiedBookings = Collections.emptyList();
        }

        BigDecimal roomRevenue = BigDecimal.ZERO;
        long soldRoomNights = 0;
        Map<Long, RoomTypeStats> roomTypeStatsMap = new LinkedHashMap<>();

        for (BookingPeriodProjection booking : occupiedBookings) {
            if (booking.getCheckInDate() == null || booking.getCheckOutDate() == null) {
                continue;
            }
            long totalBookingNights = Math.max(1, ChronoUnit.DAYS.between(booking.getCheckInDate(), booking.getCheckOutDate()));
            int quantity = booking.getQuantity() != null && booking.getQuantity() > 0 ? booking.getQuantity() : 1;
            BigDecimal totalPrice = booking.getTotalPrice() != null ? booking.getTotalPrice() : BigDecimal.ZERO;

            // Đơn giá mỗi đêm cho 1 phòng
            BigDecimal pricePerNightPerRoom = totalPrice.divide(
                    BigDecimal.valueOf(totalBookingNights * (long) quantity), 2, RoundingMode.HALF_UP);

            // Xác định số đêm thực tế nằm trong kỳ báo cáo [from, to]
            // Quy tắc: Khách check-out vào ngày checkOutDate (trước 12:00) ➔ KHÔNG tính đêm cho ngày checkOutDate.
            LocalDate overlapStart = booking.getCheckInDate().isBefore(from) ? from : booking.getCheckInDate();
            LocalDate overlapEnd = booking.getCheckOutDate().isAfter(to.plusDays(1)) ? to.plusDays(1) : booking.getCheckOutDate();

            long nightsInPeriod = Math.max(0, ChronoUnit.DAYS.between(overlapStart, overlapEnd));
            if (nightsInPeriod > 0) {
                long currentSoldRoomNights = nightsInPeriod * quantity;
                BigDecimal incurredRevenue = pricePerNightPerRoom.multiply(BigDecimal.valueOf(currentSoldRoomNights));

                roomRevenue = roomRevenue.add(incurredRevenue);
                soldRoomNights += currentSoldRoomNights;

                // Thống kê theo loại phòng
                Long rtId = booking.getRoomTypeId();
                String rtName = booking.getRoomTypeName() != null ? booking.getRoomTypeName() : "Unknown";
                if (rtId != null) {
                    RoomTypeStats stats = roomTypeStatsMap.computeIfAbsent(rtId, k -> new RoomTypeStats(rtId, rtName));
                    stats.roomRevenue = stats.roomRevenue.add(incurredRevenue);
                    stats.soldRoomNights += currentSoldRoomNights;
                }
            }
        }

        // =========================================================================
        // 4. DÒNG TIỀN THỰC THU (NET CASH FLOW / CASH BASIS) - Theo khoảng thời gian giao dịch thực tế
        // =========================================================================
        List<PaymentTransaction> periodTxns = paymentTransactionRepository.findSuccessfulTransactionsBetween(startDateTime, endDateTime);
        if (periodTxns == null) {
            periodTxns = Collections.emptyList();
        }

        BigDecimal depositAndCounterTotal = periodTxns.stream()
                .filter(pt -> pt.getType() != org.example.backend.payment.dto.PaymentTransactionType.REFUND)
                .map(PaymentTransaction::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal refundTxnTotal = periodTxns.stream()
                .filter(pt -> pt.getType() == org.example.backend.payment.dto.PaymentTransactionType.REFUND)
                .map(PaymentTransaction::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<RefundBookingProjection> refundedBookings = dashboardRepository.findRefundedBookingsInPeriod(startDateTime, endDateTime);
        BigDecimal legacyRefundTotal = (refundedBookings != null) ? refundedBookings.stream()
                .map(RefundBookingProjection::getRefundAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add) : BigDecimal.ZERO;

        BigDecimal totalPaid = depositAndCounterTotal;
        BigDecimal refundTotal = refundTxnTotal.compareTo(BigDecimal.ZERO) > 0 ? refundTxnTotal : legacyRefundTotal;
        BigDecimal netCashFlow = totalPaid.subtract(refundTotal);
        BigDecimal actualRevenue = netCashFlow.max(BigDecimal.ZERO);

        // =========================================================================
        // 5. TÍNH TOÁN CÁC CHỈ SỐ KPI KHÁCH SẠN (XỬ LÝ MẪU SỐ 0 AN TOÀN)
        // =========================================================================
        // Tỷ lệ lấp đầy (Occupancy Rate)
        double occupancyRate = 0.0;
        if (totalAvailableRoomNights > 0) {
            occupancyRate = Math.min(1.0, (double) soldRoomNights / totalAvailableRoomNights);
            occupancyRate = BigDecimal.valueOf(occupancyRate)
                    .setScale(4, RoundingMode.HALF_UP)
                    .doubleValue();
        }

        // Giá bán phòng bình quân (ADR = Room Revenue / Sold Room Nights)
        BigDecimal adr = BigDecimal.ZERO;
        if (soldRoomNights > 0) {
            adr = roomRevenue.divide(BigDecimal.valueOf(soldRoomNights), 2, RoundingMode.HALF_UP);
        }

        // Doanh thu trên mỗi phòng khả dụng (RevPAR = Room Revenue / Total Available Room Nights)
        BigDecimal revpar = BigDecimal.ZERO;
        if (totalAvailableRoomNights > 0) {
            revpar = roomRevenue.divide(BigDecimal.valueOf(totalAvailableRoomNights), 2, RoundingMode.HALF_UP);
        }

        // =========================================================================
        // 6. CHUỖI DỮ LIỆU BIỂU ĐỒ THEO TỪNG NGÀY (REVENUE SERIES)
        // =========================================================================
        List<DashboardDailyRevenuePoint> revenueSeries = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            final LocalDate currentDay = d;

            long daySoldRoomNights = 0;
            BigDecimal dayRoomRevenue = BigDecimal.ZERO;

            for (BookingPeriodProjection booking : occupiedBookings) {
                // Booking có bao gồm đêm ngày currentDay: checkInDate <= currentDay < checkOutDate.
                // Lưu ý: Ngày checkout (checkOutDate == currentDay) KHÔNG tính đêm cho currentDay.
                if (!booking.getCheckInDate().isAfter(currentDay) && booking.getCheckOutDate().isAfter(currentDay)) {
                    long totalNights = Math.max(1, ChronoUnit.DAYS.between(booking.getCheckInDate(), booking.getCheckOutDate()));
                    int qty = booking.getQuantity() != null && booking.getQuantity() > 0 ? booking.getQuantity() : 1;
                    BigDecimal rate = (booking.getTotalPrice() != null ? booking.getTotalPrice() : BigDecimal.ZERO)
                            .divide(BigDecimal.valueOf(totalNights * (long) qty), 2, RoundingMode.HALF_UP);

                    daySoldRoomNights += qty;
                    dayRoomRevenue = dayRoomRevenue.add(rate.multiply(BigDecimal.valueOf(qty)));
                }
            }

            // Dòng tiền vào trong ngày (chỉ tính DEPOSIT, COUNTER_PAYMENT, loại trừ REFUND)
            BigDecimal dayInflow = periodTxns.stream()
                    .filter(t -> t.getType() != org.example.backend.payment.dto.PaymentTransactionType.REFUND)
                    .filter(t -> {
                        LocalDateTime txTime = t.getTransactionTime() != null ? t.getTransactionTime() : t.getCreatedAt();
                        return txTime != null && txTime.toLocalDate().isEqual(currentDay);
                    })
                    .map(PaymentTransaction::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Tiền cọc hoàn trong ngày (ưu tiên bút toán REFUND sổ cái, fallback legacy projection)
            BigDecimal dayRefundTxn = periodTxns.stream()
                    .filter(t -> t.getType() == org.example.backend.payment.dto.PaymentTransactionType.REFUND)
                    .filter(t -> {
                        LocalDateTime txTime = t.getTransactionTime() != null ? t.getTransactionTime() : t.getCreatedAt();
                        return txTime != null && txTime.toLocalDate().isEqual(currentDay);
                    })
                    .map(PaymentTransaction::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal dayLegacyRefund = refundedBookings.stream()
                    .filter(b -> {
                        LocalDateTime eventTime = b.getCancelledAt() != null ? b.getCancelledAt() : b.getUpdatedAt();
                        return eventTime != null && eventTime.toLocalDate().isEqual(currentDay);
                    })
                    .map(RefundBookingProjection::getRefundAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal dayRefund = dayRefundTxn.compareTo(BigDecimal.ZERO) > 0 ? dayRefundTxn : dayLegacyRefund;
            BigDecimal dayNetCashFlow = dayInflow.subtract(dayRefund);

            // Chỉ số ngày an toàn mẫu số 0
            double dayOccRate = activeRooms > 0 ? Math.min(1.0, (double) daySoldRoomNights / activeRooms) : 0.0;
            dayOccRate = BigDecimal.valueOf(dayOccRate).setScale(4, RoundingMode.HALF_UP).doubleValue();

            BigDecimal dayAdr = daySoldRoomNights > 0
                    ? dayRoomRevenue.divide(BigDecimal.valueOf(daySoldRoomNights), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            BigDecimal dayRevPar = activeRooms > 0
                    ? dayRoomRevenue.divide(BigDecimal.valueOf(activeRooms), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            revenueSeries.add(DashboardDailyRevenuePoint.builder()
                    .date(currentDay)
                    .roomRevenue(dayRoomRevenue)
                    .netCashFlow(dayNetCashFlow)
                    .soldRoomNights(daySoldRoomNights)
                    .availableRooms(activeRooms)
                    .occupancyRate(dayOccRate)
                    .adr(dayAdr)
                    .revpar(dayRevPar)
                    .build());
        }

        // =========================================================================
        // 7. CƠ CẤU DOANH THU THEO LOẠI PHÒNG (ROOM TYPE REVENUES)
        // =========================================================================
        List<DashboardRoomTypeRevenue> roomTypeRevenues = new ArrayList<>();
        BigDecimal finalRoomRevenue = roomRevenue;
        for (RoomTypeStats stats : roomTypeStatsMap.values()) {
            double share = 0.0;
            if (finalRoomRevenue.compareTo(BigDecimal.ZERO) > 0) {
                share = stats.roomRevenue.divide(finalRoomRevenue, 4, RoundingMode.HALF_UP).doubleValue();
            }
            double pct = Math.round(share * 10000.0) / 100.0;
            roomTypeRevenues.add(DashboardRoomTypeRevenue.builder()
                    .roomTypeId(stats.roomTypeId)
                    .roomTypeName(stats.roomTypeName)
                    .roomRevenue(stats.roomRevenue)
                    .revenue(stats.roomRevenue)
                    .soldRoomNights(stats.soldRoomNights)
                    .revenueShare(share)
                    .percentage(pct)
                    .build());
        }

        // =========================================================================
        // 8. TỔNG SỐ LƯỢT ĐẶT TRONG KỲ
        // =========================================================================
        long totalBookings = dashboardRepository.countTotalBookingsInPeriod(from, to);

        return DashboardSummaryResponse.builder()
                .dateFrom(from)
                .dateTo(to)
                .roomRevenue(roomRevenue)
                .netCashFlow(netCashFlow)
                .expectedRevenue(expectedRevenue)
                .actualRevenue(actualRevenue)
                .totalPaid(totalPaid)
                .refundTotal(refundTotal)
                .adr(adr)
                .revpar(revpar)
                .occupancyRate(occupancyRate)
                .soldRoomNights(soldRoomNights)
                .totalAvailableRoomNights(totalAvailableRoomNights)
                .totalRooms(totalRooms)
                .activeRooms(activeRooms)
                .totalBookings(totalBookings)
                .confirmedBookings(confirmedBookings)
                .roomCounts(roomCounts)
                .revenueSeries(revenueSeries)
                .roomTypeRevenues(roomTypeRevenues)
                .build();
    }

    /**
     * Báo cáo phân tích doanh thu 12 tháng (hoặc chu kỳ tùy chọn) và hiệu suất buồng phòng:
     * - Sinh liên tục các mốc tháng (đủ 12 tháng từ Tháng 01 đến Tháng 12 cho cả năm).
     * - Phân bổ chuẩn xác số đêm phòng và doanh thu lưu trú cho từng tháng (xử lý booking vắt qua tháng).
     * - Ngày check-out không tính thêm đêm lưu trú.
     * - Dòng tiền thực thu ròng (Net Cash Flow) theo tháng = Tiền vào - Hoàn cọc.
     * - ADR, RevPAR, Occupancy Rate an toàn mẫu số 0 cho từng tháng và bình quân cả chu kỳ.
     * - Phân tích cơ cấu doanh thu theo từng loại phòng tương thích 100% với Frontend.
     */
    public DashboardMonthlyAnalyticsResponse getMonthlyAnalytics(Integer year, LocalDate startDate, LocalDate endDate) {
        LocalDate now = LocalDate.now();
        if (year != null) {
            startDate = LocalDate.of(year, 1, 1);
            endDate = LocalDate.of(year, 12, 31);
        } else if (startDate == null && endDate == null) {
            year = now.getYear();
            startDate = LocalDate.of(year, 1, 1);
            endDate = LocalDate.of(year, 12, 31);
        } else if (startDate != null && endDate == null) {
            endDate = startDate.plusYears(1).minusDays(1);
        } else if (startDate == null) {
            startDate = endDate.minusYears(1).plusDays(1);
        }

        if (startDate.isAfter(endDate)) {
            LocalDate temp = startDate;
            startDate = endDate;
            endDate = temp;
        }

        final LocalDate from = startDate;
        final LocalDate to = endDate;
        final int reportYear = (year != null) ? year : from.getYear();

        // 1. Phân bổ buồng phòng vật lý
        List<RoomStatusCountProjection> roomStatusCounts = roomRepository.countRoomsGroupByStatus();
        long activeRooms = 0;
        if (roomStatusCounts != null) {
            for (RoomStatusCountProjection item : roomStatusCounts) {
                if (item != null && item.getStatus() != null && item.getStatus() != RoomStatus.MAINTENANCE) {
                    activeRooms += (item.getCount() != null ? item.getCount() : 0);
                }
            }
        }

        // 2. Dữ liệu booking trong chu kỳ
        List<BookingPeriodProjection> occupiedBookings = dashboardRepository.findOccupiedBookingsInPeriod(from, to);
        if (occupiedBookings == null) {
            occupiedBookings = Collections.emptyList();
        }

        // 3. Dòng tiền và hoàn cọc
        List<PaymentTransaction> periodTxns = paymentTransactionRepository.findSuccessfulTransactionsBetween(
                from.atStartOfDay(), to.atTime(LocalTime.MAX));
        if (periodTxns == null) {
            periodTxns = Collections.emptyList();
        }

        List<RefundBookingProjection> refundedBookings = dashboardRepository.findRefundedBookingsInPeriod(
                from.atStartOfDay(), to.atTime(LocalTime.MAX));
        if (refundedBookings == null) {
            refundedBookings = Collections.emptyList();
        }

        // 4. Lặp theo từng tháng
        YearMonth startYm = YearMonth.from(from);
        YearMonth endYm = YearMonth.from(to);

        List<DashboardMonthlyRevenuePoint> monthlyPoints = new ArrayList<>();
        Map<Long, RoomTypeStats> roomTypeStatsMap = new LinkedHashMap<>();

        BigDecimal totalRoomRevenue = BigDecimal.ZERO;
        BigDecimal totalNetCashFlow = BigDecimal.ZERO;
        long totalSoldRoomNights = 0;
        long totalAvailableRoomNights = 0;

        for (YearMonth ym = startYm; !ym.isAfter(endYm); ym = ym.plusMonths(1)) {
            final YearMonth currentYm = ym;
            LocalDate mStart = currentYm.atDay(1);
            LocalDate mEnd = currentYm.atEndOfMonth();

            LocalDate effectiveStart = mStart.isBefore(from) ? from : mStart;
            LocalDate effectiveEnd = mEnd.isAfter(to) ? to : mEnd;

            long daysInMonth = Math.max(1, ChronoUnit.DAYS.between(effectiveStart, effectiveEnd) + 1);
            long mAvailableRoomNights = activeRooms * daysInMonth;
            totalAvailableRoomNights += mAvailableRoomNights;

            long mSoldRoomNights = 0;
            BigDecimal mRoomRevenue = BigDecimal.ZERO;

            for (BookingPeriodProjection booking : occupiedBookings) {
                if (booking.getCheckInDate() == null || booking.getCheckOutDate() == null) {
                    continue;
                }
                long totalBookingNights = Math.max(1, ChronoUnit.DAYS.between(booking.getCheckInDate(), booking.getCheckOutDate()));
                int qty = booking.getQuantity() != null && booking.getQuantity() > 0 ? booking.getQuantity() : 1;
                BigDecimal totalPrice = booking.getTotalPrice() != null ? booking.getTotalPrice() : BigDecimal.ZERO;
                BigDecimal pricePerNightPerRoom = totalPrice.divide(
                        BigDecimal.valueOf(totalBookingNights * (long) qty), 2, RoundingMode.HALF_UP);

                // Số đêm thực tế thuộc tháng này (khách checkout ngày checkOutDate không tính đêm)
                LocalDate overlapStart = booking.getCheckInDate().isBefore(effectiveStart) ? effectiveStart : booking.getCheckInDate();
                LocalDate overlapEnd = booking.getCheckOutDate().isAfter(effectiveEnd.plusDays(1)) ? effectiveEnd.plusDays(1) : booking.getCheckOutDate();

                long nightsInMonth = Math.max(0, ChronoUnit.DAYS.between(overlapStart, overlapEnd));
                if (nightsInMonth > 0) {
                    long nights = nightsInMonth * qty;
                    BigDecimal incurred = pricePerNightPerRoom.multiply(BigDecimal.valueOf(nights));
                    mSoldRoomNights += nights;
                    mRoomRevenue = mRoomRevenue.add(incurred);

                    // Thống kê loại phòng toàn kỳ
                    Long rtId = booking.getRoomTypeId();
                    String rtName = booking.getRoomTypeName() != null ? booking.getRoomTypeName() : "Unknown";
                    if (rtId != null) {
                        RoomTypeStats stats = roomTypeStatsMap.computeIfAbsent(rtId, k -> new RoomTypeStats(rtId, rtName));
                        stats.roomRevenue = stats.roomRevenue.add(incurred);
                        stats.soldRoomNights += nights;
                    }
                }
            }

            // Dòng tiền vào trong tháng
            BigDecimal mInflow = periodTxns.stream()
                    .filter(t -> t.getCreatedAt() != null && YearMonth.from(t.getCreatedAt()).equals(currentYm))
                    .map(PaymentTransaction::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Tiền cọc hoàn trong tháng
            BigDecimal mRefund = refundedBookings.stream()
                    .filter(b -> {
                        LocalDateTime eventTime = b.getCancelledAt() != null ? b.getCancelledAt() : b.getUpdatedAt();
                        return eventTime != null && YearMonth.from(eventTime).equals(currentYm);
                    })
                    .map(RefundBookingProjection::getRefundAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal mNetCashFlow = mInflow.subtract(mRefund);

            // Chỉ số ADR, RevPAR, Occupancy Rate an toàn mẫu số 0
            BigDecimal mAdr = mSoldRoomNights > 0
                    ? mRoomRevenue.divide(BigDecimal.valueOf(mSoldRoomNights), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            BigDecimal mRevpar = mAvailableRoomNights > 0
                    ? mRoomRevenue.divide(BigDecimal.valueOf(mAvailableRoomNights), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            double mOccRate = mAvailableRoomNights > 0
                    ? Math.min(1.0, (double) mSoldRoomNights / mAvailableRoomNights)
                    : 0.0;
            mOccRate = BigDecimal.valueOf(mOccRate).setScale(4, RoundingMode.HALF_UP).doubleValue();

            String monthLabel = String.format("Tháng %02d/%d", currentYm.getMonthValue(), currentYm.getYear());
            String monthKey = currentYm.toString();

            monthlyPoints.add(DashboardMonthlyRevenuePoint.builder()
                    .month(monthLabel)
                    .monthKey(monthKey)
                    .monthIndex(currentYm.getMonthValue())
                    .year(currentYm.getYear())
                    .revenue(mRoomRevenue)
                    .roomRevenue(mRoomRevenue)
                    .netCashFlow(mNetCashFlow)
                    .totalPaid(mInflow)
                    .refundTotal(mRefund)
                    .soldRoomNights(mSoldRoomNights)
                    .availableRoomNights(mAvailableRoomNights)
                    .adr(mAdr)
                    .revpar(mRevpar)
                    .occupancyRate(mOccRate)
                    .build());

            totalRoomRevenue = totalRoomRevenue.add(mRoomRevenue);
            totalNetCashFlow = totalNetCashFlow.add(mNetCashFlow);
            totalSoldRoomNights += mSoldRoomNights;
        }

        // 5. Thống kê theo loại phòng toàn kỳ
        List<DashboardRoomTypeRevenue> roomTypes = new ArrayList<>();
        BigDecimal finalRoomRevenue = totalRoomRevenue;
        for (RoomTypeStats stats : roomTypeStatsMap.values()) {
            double share = 0.0;
            if (finalRoomRevenue.compareTo(BigDecimal.ZERO) > 0) {
                share = stats.roomRevenue.divide(finalRoomRevenue, 4, RoundingMode.HALF_UP).doubleValue();
            }
            double pct = Math.round(share * 10000.0) / 100.0;
            roomTypes.add(DashboardRoomTypeRevenue.builder()
                    .roomTypeId(stats.roomTypeId)
                    .roomTypeName(stats.roomTypeName)
                    .roomRevenue(stats.roomRevenue)
                    .revenue(stats.roomRevenue)
                    .soldRoomNights(stats.soldRoomNights)
                    .revenueShare(share)
                    .percentage(pct)
                    .build());
        }

        // 6. Tính chỉ số bình quân toàn chu kỳ
        BigDecimal avgAdr = totalSoldRoomNights > 0
                ? totalRoomRevenue.divide(BigDecimal.valueOf(totalSoldRoomNights), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal avgRevpar = totalAvailableRoomNights > 0
                ? totalRoomRevenue.divide(BigDecimal.valueOf(totalAvailableRoomNights), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        double avgOccRate = totalAvailableRoomNights > 0
                ? Math.min(1.0, (double) totalSoldRoomNights / totalAvailableRoomNights)
                : 0.0;
        avgOccRate = BigDecimal.valueOf(avgOccRate).setScale(4, RoundingMode.HALF_UP).doubleValue();

        return DashboardMonthlyAnalyticsResponse.builder()
                .year(reportYear)
                .startDate(from)
                .endDate(to)
                .totalRevenue(totalRoomRevenue)
                .totalRoomRevenue(totalRoomRevenue)
                .totalNetCashFlow(totalNetCashFlow)
                .averageAdr(avgAdr)
                .averageRevpar(avgRevpar)
                .averageOccupancyRate(avgOccRate)
                .totalSoldRoomNights(totalSoldRoomNights)
                .totalAvailableRoomNights(totalAvailableRoomNights)
                .monthly(monthlyPoints)
                .roomTypes(roomTypes)
                .build();
    }

    private static class RoomTypeStats {
        final Long roomTypeId;
        final String roomTypeName;
        BigDecimal roomRevenue = BigDecimal.ZERO;
        long soldRoomNights = 0;

        RoomTypeStats(Long roomTypeId, String roomTypeName) {
            this.roomTypeId = roomTypeId;
            this.roomTypeName = roomTypeName;
        }
    }

    /**
     * Xuất dữ liệu báo cáo thống kê quản trị ra mảng byte CSV (UTF-8 with BOM, chống Formula Injection).
     * Kiểm tra validation ngày sai: Nếu dateFrom > dateTo -> ném IllegalArgumentException (HTTP 400).
     */
    public byte[] exportCsv(LocalDate dateFrom, LocalDate dateTo, String reportType) {
        if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
            throw new IllegalArgumentException("Ngày bắt đầu không được lớn hơn ngày kết thúc");
        }

        DashboardSummaryResponse summary = getSummary(dateFrom, dateTo);
        LocalDate effectiveFrom = summary != null && summary.getDateFrom() != null
                ? summary.getDateFrom()
                : (dateFrom != null ? dateFrom : LocalDate.now().withDayOfMonth(1));
        LocalDate effectiveTo = summary != null && summary.getDateTo() != null
                ? summary.getDateTo()
                : (dateTo != null ? dateTo : LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth()));

        return org.example.backend.dashboard.util.DashboardCsvHelper.generateSummaryCsv(
                summary, effectiveFrom, effectiveTo, reportType);
    }
}
