package org.example.backend.dashboard.service;

import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.dashboard.dto.DashboardSummaryResponse;
import org.example.backend.payment.entity.PaymentTransaction;
import org.example.backend.payment.entity.TransactionStatus;
import org.example.backend.payment.repository.PaymentTransactionRepository;
import org.example.backend.room.entity.Room;
import org.example.backend.room.entity.RoomStatus;
import org.example.backend.room.repository.RoomRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service tính toán số liệu thống kê cho Admin Dashboard theo SRS §2.7 & §11.6:
 * - Doanh thu dự kiến
 * - Doanh thu thực thu (đã trừ cọc hoàn)
 * - Tỷ lệ lấp đầy phòng (occupancy rate từ 0.0 đến 1.0)
 * - Cơ cấu buồng phòng hiện tại
 */
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

        LocalDateTime startDateTime = dateFrom.atStartOfDay();
        LocalDateTime endDateTime = dateTo.atTime(LocalTime.MAX);

        List<Booking> allBookings = bookingRepository.findAll();
        List<PaymentTransaction> allTxns = paymentTransactionRepository.findAll();
        List<Room> allRooms = roomRepository.findAll();

        // 1. Doanh thu dự kiến (từ các đơn CONFIRMED, CHECKED_IN, CHECKED_OUT trong khoảng ngày)
        final LocalDate from = dateFrom;
        final LocalDate to = dateTo;
        BigDecimal expectedRevenue = allBookings.stream()
                .filter(b -> (b.getBookingStatus() == BookingStatus.CONFIRMED
                        || b.getBookingStatus() == BookingStatus.CHECKED_IN
                        || b.getBookingStatus() == BookingStatus.CHECKED_OUT))
                .filter(b -> b.getCheckInDate().isBefore(to.plusDays(1))
                        && b.getCheckOutDate().isAfter(from.minusDays(1)))
                .map(Booking::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 2. Doanh thu thực thu = Tổng giao dịch SUCCESS - Tiền cọc đã hoàn REFUNDED
        BigDecimal totalPaid = allTxns.stream()
                .filter(t -> t.getStatus() == TransactionStatus.SUCCESS)
                .filter(t -> t.getCreatedAt().isAfter(startDateTime) && t.getCreatedAt().isBefore(endDateTime))
                .map(PaymentTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal refundTotal = allBookings.stream()
                .filter(b -> b.getPaymentStatus() == PaymentStatus.REFUNDED)
                .filter(b -> b.getCancelledAt() != null
                        && b.getCancelledAt().isAfter(startDateTime)
                        && b.getCancelledAt().isBefore(endDateTime))
                .map(b -> b.getRefundAmount() != null ? b.getRefundAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal actualRevenue = totalPaid.subtract(refundTotal).max(BigDecimal.ZERO);

        // 3. Tỷ lệ lấp đầy phòng (Occupancy Rate)
        long totalDays = Math.max(1, ChronoUnit.DAYS.between(dateFrom, dateTo) + 1);
        long activeRoomsCount = allRooms.stream()
                .filter(r -> r.getStatus() != RoomStatus.MAINTENANCE)
                .count();
        long totalAvailableRoomNights = Math.max(1, activeRoomsCount * totalDays);

        long occupiedRoomNights = allBookings.stream()
                .filter(b -> b.getBookingStatus() == BookingStatus.CHECKED_IN
                        || b.getBookingStatus() == BookingStatus.CHECKED_OUT)
                .filter(b -> b.getCheckInDate().isBefore(to.plusDays(1))
                        && b.getCheckOutDate().isAfter(from.minusDays(1)))
                .mapToLong(b -> {
                    LocalDate start = b.getCheckInDate().isBefore(from) ? from : b.getCheckInDate();
                    LocalDate end = b.getCheckOutDate().isAfter(to.plusDays(1)) ? to.plusDays(1) : b.getCheckOutDate();
                    long nights = Math.max(0, ChronoUnit.DAYS.between(start, end));
                    return nights * b.getQuantity();
                })
                .sum();

        double occupancyRate = Math.min(1.0, (double) occupiedRoomNights / totalAvailableRoomNights);
        occupancyRate = BigDecimal.valueOf(occupancyRate)
                .setScale(4, RoundingMode.HALF_UP)
                .doubleValue();

        // 4. Cơ cấu trạng thái buồng phòng hiện tại
        Map<String, Integer> roomCounts = new HashMap<>();
        for (RoomStatus status : RoomStatus.values()) {
            roomCounts.put(status.name(), 0);
        }
        for (Room room : allRooms) {
            String statusName = room.getStatus().name();
            roomCounts.put(statusName, roomCounts.getOrDefault(statusName, 0) + 1);
        }

        return DashboardSummaryResponse.builder()
                .dateFrom(dateFrom)
                .dateTo(dateTo)
                .expectedRevenue(expectedRevenue)
                .actualRevenue(actualRevenue)
                .refundTotal(refundTotal)
                .occupancyRate(occupancyRate)
                .roomCounts(roomCounts)
                .build();
    }
}
