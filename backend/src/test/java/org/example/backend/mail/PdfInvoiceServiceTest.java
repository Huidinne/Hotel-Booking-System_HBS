package org.example.backend.mail;

import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.common.exception.AppException;
import org.example.backend.mail.service.PdfInvoiceService;
import org.example.backend.mail.service.impl.PdfInvoiceServiceImpl;
import org.example.backend.room.entity.RoomType;
import org.example.backend.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PdfInvoiceServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @InjectMocks
    private PdfInvoiceServiceImpl pdfInvoiceService;

    private Booking mockBooking;

    @BeforeEach
    void setUp() {
        User user = User.builder()
                .id(1L)
                .fullName("Nguyễn Hoàng Long")
                .email("hoanglong.test@example.com")
                .phone("0987654321")
                .build();

        RoomType roomType = RoomType.builder()
                .id(10L)
                .name("Grand Luxury Ocean Suite")
                .basePrice(new BigDecimal("3500000"))
                .build();

        mockBooking = Booking.builder()
                .id(100L)
                .bookingCode("BK-20261029-A1B2")
                .user(user)
                .roomType(roomType)
                .quantity(1)
                .guests(2)
                .checkInDate(LocalDate.of(2026, 11, 20))
                .checkOutDate(LocalDate.of(2026, 11, 22)) // 2 đêm
                .pricePerNight(new BigDecimal("3500000"))
                .totalPrice(new BigDecimal("7000000"))
                .depositAmount(new BigDecimal("3500000")) // Cọc 50%
                .bookingStatus(BookingStatus.CONFIRMED)
                .paymentMethod(PaymentMethod.VNPAY)
                .paymentStatus(PaymentStatus.PARTIALLY_PAID)
                .note("Yêu cầu phòng hoa tươi mừng kỷ niệm ngày cưới.")
                .build();
    }

    @Test
    @DisplayName("Xuất PDF từ Booking entity → Sinh mảng byte hợp lệ (%PDF-), dung lượng > 1KB")
    void testGenerateInvoicePdf_FromBookingEntity_Success() {
        byte[] pdfBytes = pdfInvoiceService.generateInvoicePdf(mockBooking);

        assertThat(pdfBytes).isNotNull();
        assertThat(pdfBytes.length).isGreaterThan(1000);

        // Kiểm tra PDF Header bắt đầu bằng magic bytes %PDF-
        String pdfHeader = new String(pdfBytes, 0, Math.min(pdfBytes.length, 8));
        assertThat(pdfHeader).startsWith("%PDF-");
    }

    @Test
    @DisplayName("Xuất PDF theo Booking ID → Tìm thấy entity và sinh PDF hợp lệ")
    void testGenerateInvoicePdf_ById_Success() {
        when(bookingRepository.findById(100L)).thenReturn(Optional.of(mockBooking));

        byte[] pdfBytes = pdfInvoiceService.generateInvoicePdf(100L);

        assertThat(pdfBytes).isNotNull();
        assertThat(pdfBytes.length).isGreaterThan(1000);
        String pdfHeader = new String(pdfBytes, 0, Math.min(pdfBytes.length, 8));
        assertThat(pdfHeader).startsWith("%PDF-");
    }

    @Test
    @DisplayName("Xuất PDF theo Booking ID không tồn tại → Ném ngoại lệ 404 NOT_FOUND")
    void testGenerateInvoicePdf_ById_NotFound() {
        when(bookingRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> pdfInvoiceService.generateInvoicePdf(999L))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("Xuất PDF theo Booking Code → Tìm thấy entity và sinh PDF hợp lệ")
    void testGenerateInvoicePdf_ByCode_Success() {
        when(bookingRepository.findByBookingCode("BK-20261029-A1B2")).thenReturn(Optional.of(mockBooking));

        byte[] pdfBytes = pdfInvoiceService.generateInvoicePdf("BK-20261029-A1B2");

        assertThat(pdfBytes).isNotNull();
        assertThat(pdfBytes.length).isGreaterThan(1000);
        String pdfHeader = new String(pdfBytes, 0, Math.min(pdfBytes.length, 8));
        assertThat(pdfHeader).startsWith("%PDF-");
    }

    @Test
    @DisplayName("Xuất PDF với các tham số chi tiết và kiểm tra bóc tách thuế VAT 8% chuẩn xác")
    void testGenerateInvoicePdf_CustomParameters_WithVat8Percent() {
        // Tổng tiền 2.400.000 VNĐ, cọc 1.200.000 VNĐ
        // Trước VAT = 2.400.000 / 1.08 = 2.222.222
        // VAT 8% = 177.778
        // Còn lại = 1.200.000
        byte[] pdfBytes = pdfInvoiceService.generateInvoicePdf(
                "HD-BK-DEMO-99",
                "BK-DEMO-99",
                "Trần Thị Mai Anh",
                "maianh@example.com",
                "0912345678",
                "Deluxe Twin Room",
                2,
                4,
                LocalDate.of(2026, 12, 1),
                LocalDate.of(2026, 12, 3),
                new BigDecimal("1200000"),
                new BigDecimal("2400000"),
                new BigDecimal("1200000"),
                "VNPAY",
                "PARTIALLY_PAID",
                "Chuẩn bị thêm 2 nôi em bé"
        );

        assertThat(pdfBytes).isNotNull();
        assertThat(pdfBytes.length).isGreaterThan(2000);
        String pdfHeader = new String(pdfBytes, 0, Math.min(pdfBytes.length, 8));
        assertThat(pdfHeader).startsWith("%PDF-");
    }

    @Test
    @DisplayName("Xuất PDF khi entity Booking null → Ném ngoại lệ 404 NOT_FOUND")
    void testGenerateInvoicePdf_NullBooking() {
        assertThatThrownBy(() -> pdfInvoiceService.generateInvoicePdf((Booking) null))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.NOT_FOUND);
    }
}
