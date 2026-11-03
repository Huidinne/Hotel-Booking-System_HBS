package org.example.backend.mail.service.impl;

import com.lowagie.text.*;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.repository.BookingRepository;
import org.example.backend.common.exception.AppException;
import org.example.backend.common.util.QrCodeGenerator;
import org.example.backend.mail.service.PdfInvoiceService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

/**
 * Triển khai dịch vụ xuất Hóa đơn PDF A4:
 * - Khổ giấy chuẩn PageSize.A4.
 * - Nhúng font TrueType Roboto-Regular & Roboto-Bold qua BaseFont.IDENTITY_H, UTF-8 không lỗi dấu tiếng Việt.
 * - Trình bày sang trọng chuẩn Grand Aurora Luxury Hotel.
 * - Bóc tách thuế VAT 8%, tiền phòng, tiền cọc 50%, số tiền còn lại phải thu tại quầy.
 * - Tích hợp ảnh QR Code kiểm tra check-in tại quầy.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PdfInvoiceServiceImpl implements PdfInvoiceService {

    private final BookingRepository bookingRepository;

    private static final NumberFormat CURRENCY_FORMAT = NumberFormat.getInstance(Locale.forLanguageTag("vi-VN"));
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    // Bảng màu sang trọng Grand Aurora Luxury
    private static final Color COLOR_PRIMARY_NAVY = new Color(15, 23, 42);      // #0F172A
    private static final Color COLOR_GOLD = new Color(197, 155, 39);           // #C59B27
    private static final Color COLOR_LIGHT_BG = new Color(248, 250, 252);      // #F8FAFC
    private static final Color COLOR_BORDER = new Color(226, 232, 240);        // #E2E8F0
    private static final Color COLOR_DARK_TEXT = new Color(30, 41, 59);        // #1E293B
    private static final Color COLOR_MUTED_TEXT = new Color(100, 116, 139);    // #64748B
    private static final Color COLOR_TABLE_HEADER = new Color(15, 23, 42);     // #0F172A

    @Override
    @Transactional(readOnly = true)
    public byte[] generateInvoicePdf(Booking booking) {
        if (booking == null) {
            throw new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin đặt phòng để xuất hóa đơn");
        }

        String customerName = (booking.getUser() != null && booking.getUser().getFullName() != null)
                ? booking.getUser().getFullName() : "Quý khách";
        String customerEmail = (booking.getUser() != null) ? booking.getUser().getEmail() : "N/A";
        String customerPhone = (booking.getUser() != null) ? booking.getUser().getPhone() : "N/A";

        String roomTypeName = (booking.getRoomType() != null && booking.getRoomType().getName() != null)
                ? booking.getRoomType().getName() : "Phòng tiêu chuẩn Grand Aurora";

        int quantity = (booking.getQuantity() != null) ? booking.getQuantity() : 1;
        int guests = (booking.getGuests() != null) ? booking.getGuests() : 1;

        LocalDate checkIn = (booking.getCheckInDate() != null) ? booking.getCheckInDate() : LocalDate.now();
        LocalDate checkOut = (booking.getCheckOutDate() != null) ? booking.getCheckOutDate() : checkIn.plusDays(1);

        BigDecimal pricePerNight = (booking.getPricePerNight() != null) ? booking.getPricePerNight() : BigDecimal.ZERO;
        BigDecimal totalPrice = (booking.getTotalPrice() != null) ? booking.getTotalPrice() : BigDecimal.ZERO;
        BigDecimal depositAmount = (booking.getDepositAmount() != null) ? booking.getDepositAmount() : BigDecimal.ZERO;

        String paymentMethod = (booking.getPaymentMethod() != null) ? booking.getPaymentMethod().name() : "VNPAY";
        String paymentStatus = (booking.getPaymentStatus() != null) ? booking.getPaymentStatus().name() : "UNPAID";
        String invoiceNumber = "HD-" + booking.getBookingCode();

        return generateInvoicePdf(
                invoiceNumber,
                booking.getBookingCode(),
                customerName,
                customerEmail,
                customerPhone,
                roomTypeName,
                quantity,
                guests,
                checkIn,
                checkOut,
                pricePerNight,
                totalPrice,
                depositAmount,
                paymentMethod,
                paymentStatus,
                booking.getNote()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generateInvoicePdf(Long bookingId) {
        if (bookingId != null && bookingId == 0L) {
            return generateDemoInvoice("BK-DEMO-2026");
        }
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy đặt phòng với ID: " + bookingId));
        return generateInvoicePdf(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generateInvoicePdf(String bookingCode) {
        if (bookingCode != null && (bookingCode.equalsIgnoreCase("demo") || bookingCode.toUpperCase().startsWith("BK-DEMO"))) {
            return generateDemoInvoice(bookingCode);
        }
        Booking booking = bookingRepository.findByBookingCode(bookingCode)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy đặt phòng với mã: " + bookingCode));
        return generateInvoicePdf(booking);
    }

    private byte[] generateDemoInvoice(String bookingCode) {
        String code = (bookingCode != null && !bookingCode.isBlank()) ? bookingCode : "BK-DEMO-2026";
        return generateInvoicePdf(
                "HD-" + code,
                code,
                "Nguyễn Văn A",
                "khachhang@grandaurora.com",
                "0901 234 567",
                "Deluxe Ocean View Double",
                1,
                2,
                LocalDate.now().plusDays(3),
                LocalDate.now().plusDays(5),
                new BigDecimal("1200000"),
                new BigDecimal("2400000"),
                new BigDecimal("1200000"),
                "VNPAY",
                "PARTIALLY_PAID",
                "Phòng tầng cao ngắm trọn biển Mỹ Khê, kèm bữa sáng Buffet"
        );
    }

    @Override
    public byte[] generateInvoicePdf(
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
    ) {
        long nights = Math.max(1, ChronoUnit.DAYS.between(checkInDate, checkOutDate));

        // Tính toán thuế VAT 8% và phân bổ chi phí
        BigDecimal totalBeforeVat = totalPrice.divide(BigDecimal.valueOf(1.08), 0, RoundingMode.HALF_UP);
        BigDecimal vatAmount = totalPrice.subtract(totalBeforeVat);
        BigDecimal remainingAmount = totalPrice.subtract(depositAmount).max(BigDecimal.ZERO);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 36, 36);

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Khởi tạo Font Tiếng Việt TrueType
            BaseFont bfRegular = loadTrueTypeFont("/fonts/Roboto-Regular.ttf", "Roboto-Regular");
            BaseFont bfBold = loadTrueTypeFont("/fonts/Roboto-Bold.ttf", "Roboto-Bold");

            Font fontHotelTitle = new Font(bfBold, 15, Font.BOLD, COLOR_PRIMARY_NAVY);
            Font fontHotelSubtitle = new Font(bfBold, 8, Font.BOLD, COLOR_GOLD);
            Font fontHotelInfo = new Font(bfRegular, 8, Font.NORMAL, COLOR_MUTED_TEXT);

            Font fontInvoiceTitle = new Font(bfBold, 16, Font.BOLD, COLOR_PRIMARY_NAVY);
            Font fontInvoiceSubtitle = new Font(bfRegular, 8, Font.ITALIC, COLOR_MUTED_TEXT);
            Font fontInvoiceMeta = new Font(bfBold, 9, Font.BOLD, COLOR_DARK_TEXT);

            Font fontSectionHeader = new Font(bfBold, 9.5f, Font.BOLD, COLOR_PRIMARY_NAVY);
            Font fontLabel = new Font(bfRegular, 8.5f, Font.NORMAL, COLOR_MUTED_TEXT);
            Font fontValue = new Font(bfBold, 8.5f, Font.BOLD, COLOR_DARK_TEXT);

            Font fontTableHeader = new Font(bfBold, 8.5f, Font.BOLD, Color.WHITE);
            Font fontTableCell = new Font(bfRegular, 8.5f, Font.NORMAL, COLOR_DARK_TEXT);
            Font fontTableCellBold = new Font(bfBold, 8.5f, Font.BOLD, COLOR_DARK_TEXT);

            Font fontTotalLabel = new Font(bfBold, 9.5f, Font.BOLD, COLOR_PRIMARY_NAVY);
            Font fontTotalValue = new Font(bfBold, 10f, Font.BOLD, COLOR_PRIMARY_NAVY);
            Font fontHighlightRemaining = new Font(bfBold, 11f, Font.BOLD, COLOR_GOLD);

            Font fontSmall = new Font(bfRegular, 7.5f, Font.NORMAL, COLOR_MUTED_TEXT);
            Font fontSmallBold = new Font(bfBold, 8f, Font.BOLD, COLOR_DARK_TEXT);

            // ================= 1. HEADER KHÁCH SẠN & QR CODE =================
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{72f, 28f});

            // Cột thông tin khách sạn bên trái
            PdfPCell hotelInfoCell = new PdfPCell();
            hotelInfoCell.setBorder(Rectangle.NO_BORDER);
            hotelInfoCell.setPadding(0);

            hotelInfoCell.addElement(new Paragraph("GRAND AURORA LUXURY HOTEL", fontHotelTitle));
            hotelInfoCell.addElement(new Paragraph("KHÁCH SẠN NGHỈ DƯỠNG TIÊU CHUẨN QUỐC TẾ 5 SAO", fontHotelSubtitle));
            hotelInfoCell.addElement(new Paragraph("Địa chỉ: 01 Võ Nguyên Giáp, Sơn Trà, TP. Đà Nẵng, Việt Nam", fontHotelInfo));
            hotelInfoCell.addElement(new Paragraph("Hotline: 1900 888 888 | Email: contact@grandaurora.com", fontHotelInfo));
            hotelInfoCell.addElement(new Paragraph("Mã số thuế (MST): 0401234567 | Website: grandaurora.com", fontHotelInfo));

            headerTable.addCell(hotelInfoCell);

            // Cột QR Code bên phải
            PdfPCell qrCell = new PdfPCell();
            qrCell.setBorder(Rectangle.NO_BORDER);
            qrCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            qrCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            qrCell.setPadding(0);

            try {
                String qrData = String.format("GRAND AURORA LUXURY HOTEL\nInvoice: %s\nBooking: %s\nGuest: %s\nCheck-in: %s\nCheck-out: %s\nTotal: %s VND",
                        invoiceNumber, bookingCode, customerName, checkInDate, checkOutDate, CURRENCY_FORMAT.format(totalPrice));
                byte[] qrPng = QrCodeGenerator.generateQrCodePng(qrData, 180, 180);
                Image qrImage = Image.getInstance(qrPng);
                qrImage.scaleToFit(80, 80);
                qrImage.setAlignment(Element.ALIGN_RIGHT);
                qrCell.addElement(qrImage);

                Paragraph qrCaption = new Paragraph("Quét QR Check-in nhanh", fontSmall);
                qrCaption.setAlignment(Element.ALIGN_RIGHT);
                qrCell.addElement(qrCaption);
            } catch (Exception e) {
                log.warn("Không thể sinh ảnh QR code nhúng vào PDF: {}", e.getMessage());
            }

            headerTable.addCell(qrCell);
            document.add(headerTable);

            // Dải phân cách màu vàng kim sang trọng
            document.add(createDivider(COLOR_GOLD, 2f, 8f, 10f));

            // ================= 2. TIÊU ĐỀ HÓA ĐƠN =================
            PdfPTable titleTable = new PdfPTable(1);
            titleTable.setWidthPercentage(100);

            PdfPCell titleCell = new PdfPCell();
            titleCell.setBorder(Rectangle.NO_BORDER);
            titleCell.setHorizontalAlignment(Element.ALIGN_CENTER);

            Paragraph pTitle = new Paragraph("HÓA ĐƠN XÁC NHẬN ĐẶT PHÒNG", fontInvoiceTitle);
            pTitle.setAlignment(Element.ALIGN_CENTER);
            titleCell.addElement(pTitle);

            Paragraph pSubtitle = new Paragraph("BOOKING CONFIRMATION & OFFICIAL INVOICE", fontInvoiceSubtitle);
            pSubtitle.setAlignment(Element.ALIGN_CENTER);
            titleCell.addElement(pSubtitle);

            String formattedNow = LocalDateTime.now().format(DATE_TIME_FORMATTER);
            Paragraph pMeta = new Paragraph(String.format("Số hóa đơn: %s   |   Ngày lập: %s", invoiceNumber, formattedNow), fontInvoiceMeta);
            pMeta.setAlignment(Element.ALIGN_CENTER);
            titleCell.addElement(pMeta);

            titleTable.addCell(titleCell);
            document.add(titleTable);

            document.add(new Paragraph(" ", new Font(bfRegular, 4)));

            // ================= 3. THÔNG TIN KHÁCH HÀNG & THÔNG TIN ĐẶT PHÒNG =================
            PdfPTable infoBoxTable = new PdfPTable(2);
            infoBoxTable.setWidthPercentage(100);
            infoBoxTable.setWidths(new float[]{50f, 50f});

            // Khối Thông tin khách hàng (Trái)
            PdfPCell customerCell = new PdfPCell();
            customerCell.setBackgroundColor(COLOR_LIGHT_BG);
            customerCell.setBorderColor(COLOR_BORDER);
            customerCell.setPadding(10);

            customerCell.addElement(new Paragraph("THÔNG TIN KHÁCH HÀNG", fontSectionHeader));
            customerCell.addElement(createLabelValueParagraph("Họ và tên:", customerName, fontLabel, fontValue));
            customerCell.addElement(createLabelValueParagraph("Số điện thoại:", customerPhone, fontLabel, fontValue));
            customerCell.addElement(createLabelValueParagraph("Email:", customerEmail, fontLabel, fontValue));

            infoBoxTable.addCell(customerCell);

            // Khối Thông tin đặt phòng (Phải)
            PdfPCell bookingCell = new PdfPCell();
            bookingCell.setBackgroundColor(COLOR_LIGHT_BG);
            bookingCell.setBorderColor(COLOR_BORDER);
            bookingCell.setPadding(10);

            bookingCell.addElement(new Paragraph("CHI TIẾT LƯU TRÚ", fontSectionHeader));
            bookingCell.addElement(createLabelValueParagraph("Mã đặt phòng:", bookingCode, fontLabel, fontValue));
            bookingCell.addElement(createLabelValueParagraph("Ngày nhận phòng:", checkInDate.format(DATE_FORMATTER) + " (từ 14:00)", fontLabel, fontValue));
            bookingCell.addElement(createLabelValueParagraph("Ngày trả phòng:", checkOutDate.format(DATE_FORMATTER) + " (trước 12:00)", fontLabel, fontValue));
            bookingCell.addElement(createLabelValueParagraph("Thời gian & Số lượng:", String.format("%d đêm  |  %d phòng  |  %d khách", nights, quantity, guests), fontLabel, fontValue));

            String paymentDesc = paymentMethod + " (" + formatPaymentStatus(paymentStatus) + ")";
            bookingCell.addElement(createLabelValueParagraph("Phương thức TT:", paymentDesc, fontLabel, fontValue));

            infoBoxTable.addCell(bookingCell);
            document.add(infoBoxTable);

            document.add(new Paragraph(" ", new Font(bfRegular, 8)));

            // ================= 4. BẢNG TIỀN PHÒNG & DỊCH VỤ =================
            PdfPTable itemsTable = new PdfPTable(6);
            itemsTable.setWidthPercentage(100);
            itemsTable.setWidths(new float[]{6f, 36f, 10f, 16f, 12f, 20f});

            // Header hàng
            addHeaderCell(itemsTable, "STT", fontTableHeader, Element.ALIGN_CENTER);
            addHeaderCell(itemsTable, "Loại phòng & Dịch vụ", fontTableHeader, Element.ALIGN_LEFT);
            addHeaderCell(itemsTable, "SL", fontTableHeader, Element.ALIGN_CENTER);
            addHeaderCell(itemsTable, "Đơn giá / đêm", fontTableHeader, Element.ALIGN_RIGHT);
            addHeaderCell(itemsTable, "Số đêm", fontTableHeader, Element.ALIGN_CENTER);
            addHeaderCell(itemsTable, "Thành tiền (VND)", fontTableHeader, Element.ALIGN_RIGHT);

            // Dòng dữ liệu phòng (tiền trước VAT)
            addBodyCell(itemsTable, "1", fontTableCell, Element.ALIGN_CENTER);
            addBodyCell(itemsTable, roomTypeName + "\n(Bao gồm bữa sáng tự chọn & tiện ích khách sạn)", fontTableCellBold, Element.ALIGN_LEFT);
            addBodyCell(itemsTable, String.valueOf(quantity), fontTableCell, Element.ALIGN_CENTER);
            addBodyCell(itemsTable, CURRENCY_FORMAT.format(pricePerNight) + " ₫", fontTableCell, Element.ALIGN_RIGHT);
            addBodyCell(itemsTable, String.valueOf(nights), fontTableCell, Element.ALIGN_CENTER);
            addBodyCell(itemsTable, CURRENCY_FORMAT.format(totalBeforeVat) + " ₫", fontTableCellBold, Element.ALIGN_RIGHT);

            document.add(itemsTable);

            // ================= 5. BẢNG TÍNH TOÁN TÀI CHÍNH & THUẾ VAT 8% =================
            PdfPTable summaryTable = new PdfPTable(2);
            summaryTable.setWidthPercentage(100);
            summaryTable.setWidths(new float[]{52f, 48f});

            // Cột bên trái: Ghi chú thanh toán & chính sách
            PdfPCell policyCell = new PdfPCell();
            policyCell.setBorder(Rectangle.NO_BORDER);
            policyCell.setPadding(8);

            policyCell.addElement(new Paragraph("Ghi chú & Chính sách khách sạn:", fontSmallBold));
            String policyText = "• Miễn phí bữa sáng Buffet và tiện ích hồ bơi vô cực, phòng Gym.\n" +
                    "• Thời gian Check-in: từ 14:00 | Check-out: trước 12:00 trưa.\n" +
                    "• Quý khách vui lòng xuất trình CMND/CCCD hoặc Hộ chiếu khi nhận phòng.\n" +
                    (note != null && !note.isBlank() ? "• Yêu cầu đặc biệt: " + note : "");
            policyCell.addElement(new Paragraph(policyText, fontSmall));

            summaryTable.addCell(policyCell);

            // Cột bên phải: Bảng chi tiết VAT 8% và Cọc
            PdfPTable costBreakdownTable = new PdfPTable(2);
            costBreakdownTable.setWidthPercentage(100);
            costBreakdownTable.setWidths(new float[]{60f, 40f});

            addSummaryRow(costBreakdownTable, "Tiền phòng (chưa VAT):", CURRENCY_FORMAT.format(totalBeforeVat) + " ₫", fontTableCell, fontTableCell, false, null);
            addSummaryRow(costBreakdownTable, "Thuế GTGT (VAT 8%):", CURRENCY_FORMAT.format(vatAmount) + " ₫", fontTableCell, fontTableCell, false, null);
            addSummaryRow(costBreakdownTable, "Tổng tiền thanh toán:", CURRENCY_FORMAT.format(totalPrice) + " ₫", fontTotalLabel, fontTotalValue, true, COLOR_LIGHT_BG);
            addSummaryRow(costBreakdownTable, "Tiền cọc đã thanh toán (50%):", CURRENCY_FORMAT.format(depositAmount) + " ₫", fontTableCellBold, fontTableCellBold, false, null);
            addSummaryRow(costBreakdownTable, "CÒN LẠI PHẢI THU TẠI QUẦY:", CURRENCY_FORMAT.format(remainingAmount) + " ₫", fontTotalLabel, fontHighlightRemaining, true, new Color(254, 243, 199)); // vàng nhạt nổi bật

            PdfPCell costCell = new PdfPCell(costBreakdownTable);
            costCell.setBorder(Rectangle.NO_BORDER);
            costCell.setPadding(0);

            summaryTable.addCell(costCell);
            document.add(summaryTable);

            document.add(new Paragraph(" ", new Font(bfRegular, 10)));

            // ================= 6. CHỮ KÝ VÀ DẤU XÁC NHẬN =================
            PdfPTable signTable = new PdfPTable(2);
            signTable.setWidthPercentage(100);
            signTable.setWidths(new float[]{50f, 50f});

            // Khách hàng
            PdfPCell customerSignCell = new PdfPCell();
            customerSignCell.setBorder(Rectangle.NO_BORDER);
            customerSignCell.setHorizontalAlignment(Element.ALIGN_CENTER);

            Paragraph pCustSignTitle = new Paragraph("KHÁCH HÀNG", fontSectionHeader);
            pCustSignTitle.setAlignment(Element.ALIGN_CENTER);
            customerSignCell.addElement(pCustSignTitle);

            Paragraph pCustSignSub = new Paragraph("(Ký và ghi rõ họ tên)", fontSmall);
            pCustSignSub.setAlignment(Element.ALIGN_CENTER);
            customerSignCell.addElement(pCustSignSub);

            customerSignCell.addElement(new Paragraph("\n\n\n")); // Khoảng trống ký tên

            Paragraph pCustName = new Paragraph(customerName, fontSmallBold);
            pCustName.setAlignment(Element.ALIGN_CENTER);
            customerSignCell.addElement(pCustName);

            signTable.addCell(customerSignCell);

            // Đại diện khách sạn
            PdfPCell hotelSignCell = new PdfPCell();
            hotelSignCell.setBorder(Rectangle.NO_BORDER);
            hotelSignCell.setHorizontalAlignment(Element.ALIGN_CENTER);

            Paragraph pHotelSignTitle = new Paragraph("ĐẠI DIỆN KHÁCH SẠN GRAND AURORA", fontSectionHeader);
            pHotelSignTitle.setAlignment(Element.ALIGN_CENTER);
            hotelSignCell.addElement(pHotelSignTitle);

            Paragraph pHotelSignSub = new Paragraph("(Ký tên & đóng dấu điện tử)", fontSmall);
            pHotelSignSub.setAlignment(Element.ALIGN_CENTER);
            hotelSignCell.addElement(pHotelSignSub);

            // Dấu mộc điện tử số Grand Aurora
            Paragraph pStamp = new Paragraph("\n[ĐÃ KÝ ĐIỆN TỬ BỞI HỆ THỐNG]\nGRAND AURORA RESORT MANAGEMENT\nNgày: " + formattedNow, fontSmallBold);
            pStamp.setAlignment(Element.ALIGN_CENTER);
            hotelSignCell.addElement(pStamp);

            signTable.addCell(hotelSignCell);
            document.add(signTable);

            // Footer kết thúc
            document.add(createDivider(COLOR_BORDER, 1f, 15f, 5f));
            Paragraph footer = new Paragraph("Cảm ơn quý khách đã tin tưởng và lựa chọn Grand Aurora Luxury Hotel. Chúc quý khách một kỳ nghỉ tuyệt vời!", fontSmall);
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

        } catch (DocumentException e) {
            log.error("Lỗi khi dựng tài liệu PDF hóa đơn cho mã [{}]: {}", bookingCode, e.getMessage(), e);
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi khi xuất hóa đơn PDF: " + e.getMessage());
        } finally {
            if (document.isOpen()) {
                document.close();
            }
        }

        return out.toByteArray();
    }

    /**
     * Tải font TrueType từ classpath resources:
     * Sử dụng BaseFont.IDENTITY_H và BaseFont.EMBEDDED để nhúng toàn bộ ký tự Unicode tiếng Việt.
     */
    private BaseFont loadTrueTypeFont(String resourcePath, String fontName) {
        try (InputStream is = getClass().getResourceAsStream(resourcePath)) {
            if (is != null) {
                byte[] fontBytes = is.readAllBytes();
                return BaseFont.createFont(fontName + ".ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, fontBytes, null);
            }
        } catch (Exception e) {
            log.warn("Không thể tải TrueType font từ [{}]: {}. Fallback font mặc định.", resourcePath, e.getMessage());
        }

        try {
            return BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
        } catch (Exception e) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi khởi tạo font cho PDF: " + e.getMessage());
        }
    }

    private PdfPTable createDivider(Color color, float height, float spacingBefore, float spacingAfter) {
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);
        table.setSpacingBefore(spacingBefore);
        table.setSpacingAfter(spacingAfter);

        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(color);
        cell.setFixedHeight(height);
        cell.setBorder(Rectangle.NO_BORDER);
        table.addCell(cell);

        return table;
    }

    private Paragraph createLabelValueParagraph(String label, String value, Font fontLabel, Font fontValue) {
        Paragraph p = new Paragraph();
        p.setSpacingBefore(2f);
        p.add(new Chunk(label + " ", fontLabel));
        p.add(new Chunk(value != null ? value : "", fontValue));
        return p;
    }

    private void addHeaderCell(PdfPTable table, String text, Font font, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(COLOR_TABLE_HEADER);
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPaddingTop(6f);
        cell.setPaddingBottom(6f);
        cell.setPaddingLeft(5f);
        cell.setPaddingRight(5f);
        cell.setBorderColor(COLOR_BORDER);
        table.addCell(cell);
    }

    private void addBodyCell(PdfPTable table, String text, Font font, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPaddingTop(6f);
        cell.setPaddingBottom(6f);
        cell.setPaddingLeft(5f);
        cell.setPaddingRight(5f);
        cell.setBorderColor(COLOR_BORDER);
        table.addCell(cell);
    }

    private void addSummaryRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont, boolean hasBorder, Color bgColor) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setHorizontalAlignment(Element.ALIGN_LEFT);
        labelCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        labelCell.setPadding(4f);
        labelCell.setBorder(hasBorder ? Rectangle.BOX : Rectangle.NO_BORDER);
        if (hasBorder) labelCell.setBorderColor(COLOR_BORDER);
        if (bgColor != null) labelCell.setBackgroundColor(bgColor);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, valueFont));
        valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        valueCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        valueCell.setPadding(4f);
        valueCell.setBorder(hasBorder ? Rectangle.BOX : Rectangle.NO_BORDER);
        if (hasBorder) valueCell.setBorderColor(COLOR_BORDER);
        if (bgColor != null) valueCell.setBackgroundColor(bgColor);
        table.addCell(valueCell);
    }

    private String formatPaymentStatus(String status) {
        if (status == null) return "Chưa thanh toán";
        return switch (status.toUpperCase()) {
            case "FULLY_PAID", "PAID" -> "Đã thanh toán đầy đủ";
            case "PARTIALLY_PAID", "DEPOSITED" -> "Đã đặt cọc 50%";
            case "REFUND_PENDING" -> "Chờ hoàn tiền";
            case "REFUNDED" -> "Đã hoàn tiền";
            case "UNPAID" -> "Chưa thanh toán";
            default -> status;
        };
    }
}
