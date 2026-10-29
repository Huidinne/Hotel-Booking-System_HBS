package org.example.backend.booking.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.mail.service.PdfInvoiceService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller phục vụ xuất và tải Hóa đơn đặt phòng PDF:
 * - Chuẩn REST: GET /api/v1/bookings/{id}/invoice-pdf
 * - Trả về Content-Type: application/pdf
 * - Content-Disposition: inline để trình duyệt (Chrome, Edge, Safari, Firefox) mở trực tiếp
 *   và có thể in ấn hoặc lưu trữ qua Adobe Acrobat không lỗi font tiếng Việt.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
@Tag(name = "Booking Invoice API", description = "Endpoint xuất Hóa đơn PDF A4 chuẩn nhận diện Grand Aurora")
public class BookingInvoiceController {

    private final PdfInvoiceService pdfInvoiceService;

    /**
     * Xuất hóa đơn PDF theo ID đặt phòng hoặc theo mã booking code.
     * GET /api/v1/bookings/{id}/invoice-pdf
     *
     * @param id ID của booking (số) hoặc Mã đặt phòng (ví dụ: BK-20261029-XXXX)
     * @return file PDF binary với Content-Type application/pdf
     */
    @GetMapping("/{id}/invoice-pdf")
    @Operation(summary = "Xuất hóa đơn PDF A4 theo ID hoặc Mã đặt phòng (application/pdf)")
    public ResponseEntity<byte[]> getInvoicePdf(@PathVariable String id) {
        log.info("[BookingInvoiceController] Yêu cầu xuất hóa đơn PDF cho định danh [{}]", id);

        byte[] pdfBytes;
        String filename;

        try {
            Long bookingId = Long.parseLong(id);
            pdfBytes = pdfInvoiceService.generateInvoicePdf(bookingId);
            filename = "Invoice-" + id + ".pdf";
        } catch (NumberFormatException e) {
            // Trường hợp người dùng truyền trực tiếp bookingCode (ví dụ: BK-DEMO-2026)
            pdfBytes = pdfInvoiceService.generateInvoicePdf(id);
            filename = "Invoice-" + id + ".pdf";
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(
                ContentDisposition.inline()
                        .filename(filename)
                        .build()
        );
        headers.setContentLength(pdfBytes.length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

    /**
     * Xuất hóa đơn PDF tường minh theo Mã đặt phòng.
     * GET /api/v1/bookings/code/{bookingCode}/invoice-pdf
     */
    @GetMapping("/code/{bookingCode}/invoice-pdf")
    @Operation(summary = "Xuất hóa đơn PDF A4 theo Mã đặt phòng (bookingCode)")
    public ResponseEntity<byte[]> getInvoicePdfByCode(@PathVariable String bookingCode) {
        log.info("[BookingInvoiceController] Yêu cầu xuất hóa đơn PDF theo bookingCode [{}]", bookingCode);

        byte[] pdfBytes = pdfInvoiceService.generateInvoicePdf(bookingCode);
        String filename = "Invoice-" + bookingCode + ".pdf";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(
                ContentDisposition.inline()
                        .filename(filename)
                        .build()
        );
        headers.setContentLength(pdfBytes.length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }
}
