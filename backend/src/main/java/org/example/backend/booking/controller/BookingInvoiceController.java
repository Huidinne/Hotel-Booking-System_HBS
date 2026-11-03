package org.example.backend.booking.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.common.exception.AppException;
import org.example.backend.mail.service.PdfInvoiceService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Controller phục vụ xuất và tải Hóa đơn đặt phòng PDF:
 * - Chuẩn REST: GET /api/v1/bookings/{id}/invoice-pdf
 * - Trả về Content-Type: application/pdf
 * - Content-Disposition: inline để trình duyệt mở xem trực tiếp và in ấn
 * - Kiểm soát phân quyền nghiêm ngặt:
 *   + Hóa đơn demo (BK-DEMO-2026) cho phép xem công khai phục vụ kiểm thử
 *   + Khách hàng (ROLE_CUSTOMER) chỉ được phép tải hóa đơn booking của chính mình (403 nếu truy cập đơn người khác)
 *   + Lễ tân & Quản trị viên (ROLE_RECEPTIONIST, ROLE_ADMIN) có quyền tải hóa đơn của mọi booking
 *   + Người dùng chưa đăng nhập không có quyền tải hóa đơn thật (401)
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
@Tag(name = "Booking Invoice API", description = "Endpoint xuất Hóa đơn PDF A4 chuẩn nhận diện Grand Aurora")
public class BookingInvoiceController {

    private final BookingRepository bookingRepository;
    private final PdfInvoiceService pdfInvoiceService;

    public static final String DEMO_BOOKING_CODE = "BK-DEMO-2026";

    /**
     * Xuất hóa đơn PDF theo ID đặt phòng hoặc theo mã booking code.
     * GET /api/v1/bookings/{id}/invoice-pdf
     *
     * @param id ID của booking (số) hoặc Mã đặt phòng (ví dụ: BK-20261029-XXXX)
     * @param authentication thông tin xác thực của người dùng hiện tại
     * @return file PDF binary với Content-Type application/pdf
     */
    @GetMapping("/{id}/invoice-pdf")
    @Operation(summary = "Xuất hóa đơn PDF A4 theo ID hoặc Mã đặt phòng (application/pdf)")
    public ResponseEntity<byte[]> getInvoicePdf(@PathVariable String id, Authentication authentication) {
        log.info("[BookingInvoiceController] Yêu cầu xuất hóa đơn PDF cho định danh [{}] từ user [{}]",
                id, authentication != null ? authentication.getName() : "Anonymous");

        // 1. Cho phép xem hóa đơn mẫu demo công khai
        if (isDemoIdentifier(id)) {
            byte[] pdfBytes = pdfInvoiceService.generateInvoicePdf(DEMO_BOOKING_CODE);
            return buildPdfResponse(pdfBytes, "Invoice-" + DEMO_BOOKING_CODE + ".pdf");
        }

        // 2. Với đơn thật: Kiểm tra đăng nhập (401)
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập để tải hóa đơn đặt phòng");
        }

        // 3. Tìm kiếm booking tương ứng trong cơ sở dữ liệu
        Booking booking = findBookingByIdOrCode(id);

        // 4. Kiểm tra quyền sở hữu (403 nếu không phải chủ đơn và không phải nhân viên)
        validateInvoiceAccessPermission(booking, authentication);

        // 5. Xuất PDF từ dữ liệu booking thực tế khớp từng con số
        byte[] pdfBytes = pdfInvoiceService.generateInvoicePdf(booking);
        String filename = "Invoice-" + booking.getBookingCode() + ".pdf";

        return buildPdfResponse(pdfBytes, filename);
    }

    /**
     * Xuất hóa đơn PDF tường minh theo Mã đặt phòng.
     * GET /api/v1/bookings/code/{bookingCode}/invoice-pdf
     */
    @GetMapping("/code/{bookingCode}/invoice-pdf")
    @Operation(summary = "Xuất hóa đơn PDF A4 theo Mã đặt phòng (bookingCode)")
    public ResponseEntity<byte[]> getInvoicePdfByCode(@PathVariable String bookingCode, Authentication authentication) {
        return getInvoicePdf(bookingCode, authentication);
    }

    private boolean isDemoIdentifier(String id) {
        if (id == null) return false;
        String trimmed = id.trim();
        return trimmed.equalsIgnoreCase(DEMO_BOOKING_CODE)
                || trimmed.equalsIgnoreCase("demo")
                || trimmed.equalsIgnoreCase("0");
    }

    private Booking findBookingByIdOrCode(String identifier) {
        try {
            Long bookingId = Long.parseLong(identifier);
            return bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy đặt phòng với ID: " + bookingId));
        } catch (NumberFormatException e) {
            return bookingRepository.findByBookingCode(identifier)
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy đặt phòng với mã: " + identifier));
        }
    }

    private void validateInvoiceAccessPermission(Booking booking, Authentication authentication) {
        boolean isStaff = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_RECEPTIONIST".equals(a.getAuthority()) || "ROLE_ADMIN".equals(a.getAuthority()));

        if (isStaff) {
            return; // Lễ tân và Quản trị viên có toàn quyền xem/tải hóa đơn của mọi khách
        }

        String currentUserEmail = authentication.getName();
        if (booking.getUser() == null || !booking.getUser().getEmail().equalsIgnoreCase(currentUserEmail)) {
            log.warn("[BookingInvoiceController] User [{}] cố tình truy cập trái phép hóa đơn booking [{}] của user [{}]",
                    currentUserEmail, booking.getBookingCode(), booking.getUser() != null ? booking.getUser().getEmail() : "N/A");
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền tải hóa đơn đặt phòng của khách hàng khác");
        }
    }

    private ResponseEntity<byte[]> buildPdfResponse(byte[] pdfBytes, String filename) {
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
