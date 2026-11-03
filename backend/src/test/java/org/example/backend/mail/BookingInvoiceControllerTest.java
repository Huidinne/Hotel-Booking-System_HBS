package org.example.backend.mail;

import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.BookingStatus;
import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.booking.entity.PaymentStatus;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.mail.service.PdfInvoiceService;
import org.example.backend.room.entity.RoomType;
import org.example.backend.user.entity.Role;
import org.example.backend.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Optional;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class BookingInvoiceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BookingRepository bookingRepository;

    @MockBean
    private PdfInvoiceService pdfInvoiceService;

    private static final byte[] MOCK_PDF_BYTES = "%PDF-1.4\n% Grand Aurora Official Invoice PDF\n%%EOF".getBytes(StandardCharsets.UTF_8);

    private Booking mockBooking;
    private User ownerCustomer;

    @BeforeEach
    void setUp() {
        ownerCustomer = User.builder()
                .id(1L)
                .fullName("Nguyễn Thị Yến")
                .email("yen.customer@grandaurora.com")
                .phone("0988661339")
                .role(Role.ROLE_CUSTOMER)
                .build();

        RoomType roomType = RoomType.builder()
                .id(10L)
                .name("Deluxe Ocean View Double")
                .basePrice(new BigDecimal("1200000"))
                .build();

        mockBooking = Booking.builder()
                .id(100L)
                .bookingCode("BK-20261103-YEN1")
                .user(ownerCustomer)
                .roomType(roomType)
                .quantity(1)
                .guests(2)
                .checkInDate(LocalDate.of(2026, 11, 15))
                .checkOutDate(LocalDate.of(2026, 11, 17))
                .pricePerNight(new BigDecimal("1200000"))
                .totalPrice(new BigDecimal("2400000"))
                .depositAmount(new BigDecimal("1200000"))
                .bookingStatus(BookingStatus.CONFIRMED)
                .paymentMethod(PaymentMethod.VNPAY)
                .paymentStatus(PaymentStatus.PARTIALLY_PAID)
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/bookings/BK-DEMO-2026/invoice-pdf không cần login (Public Demo) → HTTP 200, Content-Type: application/pdf")
    void testGetInvoicePdf_DemoCode_Anonymous_Success() throws Exception {
        when(pdfInvoiceService.generateInvoicePdf(anyString())).thenReturn(MOCK_PDF_BYTES);

        mockMvc.perform(get("/api/v1/bookings/BK-DEMO-2026/invoice-pdf"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition", containsString("Invoice-BK-DEMO-2026.pdf")))
                .andExpect(content().bytes(MOCK_PDF_BYTES));
    }

    @Test
    @DisplayName("GET /api/v1/bookings/{id}/invoice-pdf khi chưa đăng nhập (đơn thật) → HTTP 401 UNAUTHORIZED")
    void testGetInvoicePdf_RealBooking_Anonymous_Unauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/bookings/100/invoice-pdf"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "yen.customer@grandaurora.com", roles = "CUSTOMER")
    @DisplayName("GET /api/v1/bookings/{id}/invoice-pdf bởi chính chủ đơn (Customer) → HTTP 200, Content-Type: application/pdf")
    void testGetInvoicePdf_ByOwnerCustomer_Success() throws Exception {
        when(bookingRepository.findById(100L)).thenReturn(Optional.of(mockBooking));
        when(pdfInvoiceService.generateInvoicePdf(any(Booking.class))).thenReturn(MOCK_PDF_BYTES);

        mockMvc.perform(get("/api/v1/bookings/100/invoice-pdf"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition", containsString("Invoice-BK-20261103-YEN1.pdf")))
                .andExpect(content().bytes(MOCK_PDF_BYTES));
    }

    @Test
    @WithMockUser(username = "hacker@other.com", roles = "CUSTOMER")
    @DisplayName("GET /api/v1/bookings/{id}/invoice-pdf bởi khách hàng khác (không có quyền) → HTTP 403 FORBIDDEN")
    void testGetInvoicePdf_ByOtherCustomer_Forbidden() throws Exception {
        when(bookingRepository.findById(100L)).thenReturn(Optional.of(mockBooking));

        mockMvc.perform(get("/api/v1/bookings/100/invoice-pdf"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("Bạn không có quyền tải hóa đơn đặt phòng của khách hàng khác"));
    }

    @Test
    @WithMockUser(username = "receptionist@grandaurora.com", roles = "RECEPTIONIST")
    @DisplayName("GET /api/v1/bookings/{id}/invoice-pdf bởi Lễ tân (ROLE_RECEPTIONIST) → HTTP 200 thành công")
    void testGetInvoicePdf_ByReceptionist_Success() throws Exception {
        when(bookingRepository.findById(100L)).thenReturn(Optional.of(mockBooking));
        when(pdfInvoiceService.generateInvoicePdf(any(Booking.class))).thenReturn(MOCK_PDF_BYTES);

        mockMvc.perform(get("/api/v1/bookings/100/invoice-pdf"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition", containsString("Invoice-BK-20261103-YEN1.pdf")))
                .andExpect(content().bytes(MOCK_PDF_BYTES));
    }

    @Test
    @WithMockUser(username = "admin@grandaurora.com", roles = "ADMIN")
    @DisplayName("GET /api/v1/bookings/code/{bookingCode}/invoice-pdf bởi Quản trị viên (ROLE_ADMIN) → HTTP 200 thành công")
    void testGetInvoicePdf_ByAdmin_Success() throws Exception {
        when(bookingRepository.findByBookingCode("BK-20261103-YEN1")).thenReturn(Optional.of(mockBooking));
        when(pdfInvoiceService.generateInvoicePdf(any(Booking.class))).thenReturn(MOCK_PDF_BYTES);

        mockMvc.perform(get("/api/v1/bookings/code/BK-20261103-YEN1/invoice-pdf"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition", containsString("Invoice-BK-20261103-YEN1.pdf")))
                .andExpect(content().bytes(MOCK_PDF_BYTES));
    }

    @Test
    @WithMockUser(username = "yen.customer@grandaurora.com", roles = "CUSTOMER")
    @DisplayName("GET /api/v1/bookings/{id}/invoice-pdf khi ID không tồn tại → HTTP 404 NOT_FOUND")
    void testGetInvoicePdf_NotFound() throws Exception {
        when(bookingRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/bookings/999/invoice-pdf"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Không tìm thấy đặt phòng với ID: 999"));
    }
}
