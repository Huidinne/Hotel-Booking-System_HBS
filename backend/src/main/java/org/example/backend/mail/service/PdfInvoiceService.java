package org.example.backend.mail.service;

import org.example.backend.booking.entity.Booking;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Service xuất Hóa đơn đặt phòng định dạng PDF khổ A4:
 * - Sử dụng OpenPDF và font TrueType Roboto hiển thị tiếng Việt UTF-8 chuẩn xác.
 * - Trình bày đầy đủ thông tin khách sạn Grand Aurora, thông tin khách hàng, chi tiết lưu trú.
 * - Bảng kê chi phí, bóc tách thuế VAT 8%, số tiền đã cọc (50%) và số tiền còn lại phải thu.
 * - Tích hợp mã QR Code ZXing phục vụ check-in nhanh tại quầy lễ tân.
 */
public interface PdfInvoiceService {

    /**
     * Sinh file PDF hóa đơn A4 từ đối tượng Booking.
     *
     * @param booking đối tượng đặt phòng
     * @return mảng byte chứa nội dung file PDF
     */
    byte[] generateInvoicePdf(Booking booking);

    /**
     * Sinh file PDF hóa đơn A4 theo ID của booking.
     *
     * @param bookingId ID của booking
     * @return mảng byte chứa nội dung file PDF
     */
    byte[] generateInvoicePdf(Long bookingId);

    /**
     * Sinh file PDF hóa đơn A4 theo Booking Code.
     *
     * @param bookingCode mã đặt phòng
     * @return mảng byte chứa nội dung file PDF
     */
    byte[] generateInvoicePdf(String bookingCode);

    /**
     * Sinh file PDF hóa đơn A4 từ các dữ liệu chi tiết (tiện cho Unit Test và Mock preview).
     */
    byte[] generateInvoicePdf(
            String invoiceNumber,
            String bookingCode,
            String customerName,
            String customerEmail,
            String customerPhone,
            String roomTypeName,
            int quantity,
            int guests,
            LocalDate checkInDate,
            LocalDate checkOutDate,
            BigDecimal pricePerNight,
            BigDecimal totalPrice,
            BigDecimal depositAmount,
            String paymentMethod,
            String paymentStatus,
            String note
    );
}

