package org.example.backend.mail;

import org.example.backend.common.exception.AppException;
import org.example.backend.mail.service.PdfInvoiceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.anyLong;
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
    private PdfInvoiceService pdfInvoiceService;

    private static final byte[] MOCK_PDF_BYTES = "%PDF-1.4\n% Grand Aurora Official Invoice PDF\n%%EOF".getBytes(StandardCharsets.UTF_8);

    @Test
    @DisplayName("GET /api/v1/bookings/{id}/invoice-pdf với ID số hợp lệ → HTTP 200, Content-Type: application/pdf")
    void testGetInvoicePdf_ByNumericId_Success() throws Exception {
        when(pdfInvoiceService.generateInvoicePdf(100L)).thenReturn(MOCK_PDF_BYTES);

        mockMvc.perform(get("/api/v1/bookings/100/invoice-pdf"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition", containsString("Invoice-100.pdf")))
                .andExpect(content().bytes(MOCK_PDF_BYTES));
    }

    @Test
    @DisplayName("GET /api/v1/bookings/{id}/invoice-pdf với Booking Code dạng chuỗi → HTTP 200, Content-Type: application/pdf")
    void testGetInvoicePdf_ByBookingCode_Success() throws Exception {
        when(pdfInvoiceService.generateInvoicePdf("BK-20261029-ABCD")).thenReturn(MOCK_PDF_BYTES);

        mockMvc.perform(get("/api/v1/bookings/BK-20261029-ABCD/invoice-pdf"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition", containsString("Invoice-BK-20261029-ABCD.pdf")))
                .andExpect(content().bytes(MOCK_PDF_BYTES));
    }

    @Test
    @DisplayName("GET /api/v1/bookings/code/{bookingCode}/invoice-pdf → HTTP 200, Content-Type: application/pdf")
    void testGetInvoicePdfByCode_Success() throws Exception {
        when(pdfInvoiceService.generateInvoicePdf("BK-DEMO-2026")).thenReturn(MOCK_PDF_BYTES);

        mockMvc.perform(get("/api/v1/bookings/code/BK-DEMO-2026/invoice-pdf"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition", containsString("Invoice-BK-DEMO-2026.pdf")))
                .andExpect(content().bytes(MOCK_PDF_BYTES));
    }

    @Test
    @DisplayName("GET /api/v1/bookings/{id}/invoice-pdf khi không tìm thấy booking → HTTP 404 NOT_FOUND")
    void testGetInvoicePdf_NotFound() throws Exception {
        when(pdfInvoiceService.generateInvoicePdf(anyLong()))
                .thenThrow(new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy đặt phòng với ID: 999"));

        mockMvc.perform(get("/api/v1/bookings/999/invoice-pdf"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Không tìm thấy đặt phòng với ID: 999"));
    }
}
