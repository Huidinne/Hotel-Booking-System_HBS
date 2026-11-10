package org.example.backend.dashboard.projection;

import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Spring Data JPA Projection cho Booking phục vụ thống kê Dashboard theo khoảng ngày (SRS §11.6, FR-14):
 * - Tránh nạp toàn bộ entity nặng (loại bỏ findAll(), không load các cột TEXT/BLOB lớn và quan hệ không cần thiết).
 * - Trích xuất các trường cốt lõi tính Room Revenue, Sold Room Nights, ADR, RevPAR và phân bổ loại phòng.
 */
public interface BookingPeriodProjection {

    Long getId();

    LocalDate getCheckInDate();

    LocalDate getCheckOutDate();

    Integer getQuantity();

    BigDecimal getTotalPrice();

    BigDecimal getDepositAmount();

    BookingStatus getBookingStatus();

    PaymentStatus getPaymentStatus();

    Long getRoomTypeId();

    String getRoomTypeName();

    /**
     * Factory method tạo đối tượng thuận tiện cho Unit Test và Mocking.
     */
    static BookingPeriodProjection of(Long id,
                                      LocalDate checkInDate,
                                      LocalDate checkOutDate,
                                      Integer quantity,
                                      BigDecimal totalPrice,
                                      BigDecimal depositAmount,
                                      BookingStatus bookingStatus,
                                      PaymentStatus paymentStatus,
                                      Long roomTypeId,
                                      String roomTypeName) {
        return new BookingPeriodProjectionImpl(
                id, checkInDate, checkOutDate, quantity,
                totalPrice, depositAmount, bookingStatus, paymentStatus,
                roomTypeId, roomTypeName
        );
    }
}

record BookingPeriodProjectionImpl(
        Long id,
        LocalDate checkInDate,
        LocalDate checkOutDate,
        Integer quantity,
        BigDecimal totalPrice,
        BigDecimal depositAmount,
        BookingStatus bookingStatus,
        PaymentStatus paymentStatus,
        Long roomTypeId,
        String roomTypeName
) implements BookingPeriodProjection {

    @Override
    public Long getId() {
        return id;
    }

    @Override
    public LocalDate getCheckInDate() {
        return checkInDate;
    }

    @Override
    public LocalDate getCheckOutDate() {
        return checkOutDate;
    }

    @Override
    public Integer getQuantity() {
        return quantity;
    }

    @Override
    public BigDecimal getTotalPrice() {
        return totalPrice;
    }

    @Override
    public BigDecimal getDepositAmount() {
        return depositAmount;
    }

    @Override
    public BookingStatus getBookingStatus() {
        return bookingStatus;
    }

    @Override
    public PaymentStatus getPaymentStatus() {
        return paymentStatus;
    }

    @Override
    public Long getRoomTypeId() {
        return roomTypeId;
    }

    @Override
    public String getRoomTypeName() {
        return roomTypeName;
    }
}

