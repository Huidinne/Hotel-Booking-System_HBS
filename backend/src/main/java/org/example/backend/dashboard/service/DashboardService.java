package org.example.backend.dashboard.service;

import lombok.extern.slf4j.Slf4j;
import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.dashboard.dto.DashboardDailyRevenuePoint;
import org.example.backend.dashboard.dto.DashboardRoomTypeRevenue;
import org.example.backend.dashboard.dto.DashboardSummaryResponse;
import org.example.backend.payment.entity.PaymentTransaction;
import org.example.backend.payment.entity.TransactionStatus;
import org.example.backend.payment.repository.PaymentTransactionRepository;
import org.example.backend.room.entity.Room;
import org.example.backend.room.entity.RoomStatus;
import org.example.backend.room.entity.RoomType;
import org.example.backend.room.repository.RoomRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Service tính toán số liệu thống kê quản trị cho Admin Dashboard theo SRS §2.7, §11.6 & FR-14:
 * 1. Phân biệt rạch ròi:
 *    - Doanh thu lưu trú (Room Revenue / Accrual Basis): Giá trị đêm phòng thực tế tiêu dùng trong kỳ.
 *    - Dòng tiền thực thu (Net Cash Flow / Cash Basis): Tiền thu vào qua VNPay/tiền mặt trừ đi tiền cọc hoàn.
 * 2. Các chỉ số hiệu suất chuẩn ngành khách sạn:
 *    - ADR (Average Daily Rate): Giá bán bình quân mỗi đêm phòng đã bán.
 *    - RevPAR (Revenue Per Available Room): Doanh thu trên mỗi phòng khả dụng.
 *    - Tỷ lệ lấp đầy (Occupancy Rate) và Đêm phòng (Room Nights).
 * 3. Xử lý an toàn các biên nghiệp vụ phức tạp:
 *    - Đơn đặt phòng vắt qua tháng (Cross-month booking): Phân bổ chính xác số đêm thuộc kỳ báo cáo.
 *    - Đơn hủy có hoàn tiền cọc (Refunds): Trừ dòng tiền nhưng không ảnh hưởng doanh thu lưu trú.
 *    - Xử lý mẫu số 0 (Zero Denominator): An toàn tuyệt đối, không ném ArithmeticException khi không có khách hoặc không có phòng khả dụng.
 * 4. Chuỗi dữ liệu biểu đồ theo ngày (revenueSeries) và cơ cấu doanh thu theo hạng phòng.
 */
@Slf4j
@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final BookingRepository bookingRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final RoomRepository roomRepository;

    public DashboardService(BookingRepository bookingRepository,
                            PaymentTransactionRepository paymentTransactionRepository,
                            RoomRepository roomRepository) {
        this.bookingRepository = bookingRepository;
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

        List<Booking> allBookings = bookingRepository.findAll();
        List<PaymentTransaction> allTxns = paymentTransactionRepository.findAll();
        List<Room> allRooms = roomRepository.findAll();

        final LocalDate from = dateFrom;
        final LocalDate to = dateTo;

        // =========================================================================
        // 1. THỐNG KÊ BUỒNG PHÒNG VẬT LÝ & ĐÊM PHÒNG KHẢ DỤNG
        // =========================================================================
        long totalRooms = allRooms.size();
        long activeRooms = allRooms.stream()
                .filter(r -> r.getStatus() != RoomStatus.MAINTENANCE)
                .count();

        long totalDaysInPeriod = Math.max(1, ChronoUnit.DAYS.between(from, to) + 1);
        long totalAvailableRoomNights = activeRooms * totalDaysInPeriod;

        // Cơ cấu trạng thái buồng phòng vật lý hiện tại
        Map<String, Integer> roomCounts = new HashMap<>();
        for (RoomStatus status : RoomStatus.values()) {
            roomCounts.put(status.name(), 0);
        }
        for (Room room : allRooms) {
            String statusName = room.getStatus().name();
            roomCounts.put(statusName, roomCounts.getOrDefault(statusName, 0) + 1);
        }

        // =========================================================================
        // 2. DOANH THU DỰ KIẾN (EXPECTED REVENUE)
        // =========================================================================
        // Lấy tất cả các đơn CONFIRMED, CHECKED_IN, CHECKED_OUT giao cắt với kỳ
        List<Booking> activePeriodBookings = allBookings.stream()
                .filter(b -> b.getCheckInDate() != null && b.getCheckOutDate() != null)
                .filter(b -> b.getBookingStatus() == BookingStatus.CONFIRMED
                        || b.getBookingStatus() == BookingStatus.CHECKED_IN
                        || b.getBookingStatus() == BookingStatus.CHECKED_OUT)
                .filter(b -> !b.getCheckInDate().isAfter(to) && !b.getCheckOutDate().isBefore(from.plusDays(1)))
                .toList();

        BigDecimal expectedRevenue = activePeriodBookings.stream()
                .map(b -> b.getTotalPrice() != null ? b.getTotalPrice() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // =========================================================================
        // 3. DOANH THU LƯU TRÚ (ROOM REVENUE) & ĐÊM PHÒNG ĐÃ BÁN (SOLD ROOM NIGHTS)
        //    (Theo nguyên tắc kế toán dồn tích - Accrual Basis, xử lý đơn vắt qua tháng)
        // =========================================================================
        BigDecimal roomRevenue = BigDecimal.ZERO;
        long soldRoomNights = 0;
        Map<Long, RoomTypeStats> roomTypeStatsMap = new LinkedHashMap<>();

        // Chỉ tính doanh thu lưu trú thực tế từ khách đã/đang ở (CHECKED_IN, CHECKED_OUT)
        List<Booking> occupiedBookings = allBookings.stream()
                .filter(b -> b.getCheckInDate() != null && b.getCheckOutDate() != null)
                .filter(b -> b.getBookingStatus() == BookingStatus.CHECKED_IN
                        || b.getBookingStatus() == BookingStatus.CHECKED_OUT)
                .filter(b -> !b.getCheckInDate().isAfter(to) && !b.getCheckOutDate().isBefore(from.plusDays(1)))
                .toList();

        for (Booking booking : occupiedBookings) {
            long totalBookingNights = Math.max(1, ChronoUnit.DAYS.between(booking.getCheckInDate(), booking.getCheckOutDate()));
            int quantity = booking.getQuantity() != null && booking.getQuantity() > 0 ? booking.getQuantity() : 1;
            BigDecimal totalPrice = booking.getTotalPrice() != null ? booking.getTotalPrice() : BigDecimal.ZERO;

            // Đơn giá mỗi đêm cho 1 phòng
            BigDecimal pricePerNightPerRoom = totalPrice.divide(
                    BigDecimal.valueOf((long) totalBookingNights * quantity), 2, RoundingMode.HALF_UP);

            // Xác định số đêm thực tế nằm trong kỳ báo cáo [from, to]
            LocalDate overlapStart = booking.getCheckInDate().isBefore(from) ? from : booking.getCheckInDate();
            LocalDate overlapEnd = booking.getCheckOutDate().isAfter(to.plusDays(1)) ? to.plusDays(1) : booking.getCheckOutDate();

            long nightsInPeriod = Math.max(0, ChronoUnit.DAYS.between(overlapStart, overlapEnd));
            if (nightsInPeriod > 0) {
                long currentSoldRoomNights = nightsInPeriod * quantity;
                BigDecimal incurredRevenue = pricePerNightPerRoom.multiply(BigDecimal.valueOf(currentSoldRoomNights));

                roomRevenue = roomRevenue.add(incurredRevenue);
                soldRoomNights += currentSoldRoomNights;

                // Thống kê theo loại phòng
                RoomType rt = booking.getRoomType();
                if (rt != null) {
                    RoomTypeStats stats = roomTypeStatsMap.computeIfAbsent(rt.getId(), k -> new RoomTypeStats(rt.getId(), rt.getName()));
                    stats.roomRevenue = stats.roomRevenue.add(incurredRevenue);
                    stats.soldRoomNights += currentSoldRoomNights;
                }
            }
        }

        // =========================================================================
        // 4. DÒNG TIỀN THỰC THU (NET CASH FLOW / CASH BASIS)
        // =========================================================================
        // Dòng tiền vào: Tổng số tiền từ các giao dịch thanh toán thành công trong kỳ
        BigDecimal totalPaid = allTxns.stream()
                .filter(t -> t.getStatus() == TransactionStatus.SUCCESS)
                .filter(t -> t.getCreatedAt() != null
                        && !t.getCreatedAt().isBefore(startDateTime)
                        && !t.getCreatedAt().isAfter(endDateTime))
                .map(PaymentTransaction::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Dòng tiền ra: Tổng tiền cọc đã hoàn trả lại cho khách hàng trong kỳ
        BigDecimal refundTotal = allBookings.stream()
                .filter(b -> b.getPaymentStatus() == PaymentStatus.REFUNDED
                        || (b.getRefundAmount() != null && b.getRefundAmount().compareTo(BigDecimal.ZERO) > 0))
                .filter(b -> {
                    LocalDateTime eventTime = b.getCancelledAt() != null ? b.getCancelledAt() : b.getUpdatedAt();
                    return eventTime != null && !eventTime.isBefore(startDateTime) && !eventTime.isAfter(endDateTime);
                })
                .map(Booking::getRefundAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Dòng tiền ròng thực tế
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

            // Số phòng có khách ở trong ngày hiện tại
            long daySoldRoomNights = 0;
            BigDecimal dayRoomRevenue = BigDecimal.ZERO;

            for (Booking booking : occupiedBookings) {
                // Booking có bao gồm đêm ngày currentDay (checkIn <= d < checkOut)
                if (!booking.getCheckInDate().isAfter(currentDay) && booking.getCheckOutDate().isAfter(currentDay)) {
                    long totalNights = Math.max(1, ChronoUnit.DAYS.between(booking.getCheckInDate(), booking.getCheckOutDate()));
                    int qty = booking.getQuantity() != null && booking.getQuantity() > 0 ? booking.getQuantity() : 1;
                    BigDecimal rate = (booking.getTotalPrice() != null ? booking.getTotalPrice() : BigDecimal.ZERO)
                            .divide(BigDecimal.valueOf(totalNights * qty), 2, RoundingMode.HALF_UP);

                    daySoldRoomNights += qty;
                    dayRoomRevenue = dayRoomRevenue.add(rate.multiply(BigDecimal.valueOf(qty)));
                }
            }

            // Dòng tiền vào trong ngày
            BigDecimal dayInflow = allTxns.stream()
                    .filter(t -> t.getStatus() == TransactionStatus.SUCCESS)
                    .filter(t -> t.getCreatedAt() != null && t.getCreatedAt().toLocalDate().isEqual(currentDay))
                    .map(PaymentTransaction::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Tiền cọc hoàn trong ngày
            BigDecimal dayRefund = allBookings.stream()
                    .filter(b -> b.getPaymentStatus() == PaymentStatus.REFUNDED
                            || (b.getRefundAmount() != null && b.getRefundAmount().compareTo(BigDecimal.ZERO) > 0))
                    .filter(b -> {
                        LocalDateTime eventTime = b.getCancelledAt() != null ? b.getCancelledAt() : b.getUpdatedAt();
                        return eventTime != null && eventTime.toLocalDate().isEqual(currentDay);
                    })
                    .map(Booking::getRefundAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

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
            roomTypeRevenues.add(DashboardRoomTypeRevenue.builder()
                    .roomTypeId(stats.roomTypeId)
                    .roomTypeName(stats.roomTypeName)
                    .roomRevenue(stats.roomRevenue)
                    .soldRoomNights(stats.soldRoomNights)
                    .revenueShare(share)
                    .build());
        }

        // =========================================================================
        // 8. TỔNG SỐ LƯỢT ĐẶT VÀ XÁC NHẬN
        // =========================================================================
        long totalBookings = allBookings.stream()
                .filter(b -> b.getCheckInDate() != null && b.getCheckOutDate() != null)
                .filter(b -> !b.getCheckInDate().isAfter(to) && !b.getCheckOutDate().isBefore(from.plusDays(1)))
                .count();

        long confirmedBookings = activePeriodBookings.size();

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
}
