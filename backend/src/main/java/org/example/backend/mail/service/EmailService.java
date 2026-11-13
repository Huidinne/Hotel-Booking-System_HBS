package org.example.backend.mail.service;

import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Interface dịch vụ gửi Email bất đồng bộ:
 * - Hỗ trợ gửi Email văn bản đơn giản (plain text).
 * - Hỗ trợ gửi Email định dạng HTML (template hóa đơn, xác nhận cọc...).
 * - Hỗ trợ gửi Email có đính kèm file (PDF, hình ảnh, tài liệu).
 * - Toàn bộ phương thức được thực thi bất đồng bộ trên pool `mail-async-` không chặn HTTP request.
 */
public interface EmailService {

    /**
     * Gửi email HTML đơn giản (Fire-and-forget).
     *
     * @param to          Địa chỉ người nhận
     * @param subject     Tiêu đề email
     * @param htmlContent Nội dung HTML
     */
    void sendHtmlEmail(String to, String subject, String htmlContent);

    /**
     * Gửi email HTML có đính kèm file byte array (ví dụ PDF sinh từ OpenPDF).
     *
     * @param to                 Địa chỉ người nhận
     * @param subject            Tiêu đề email
     * @param htmlContent        Nội dung HTML
     * @param attachmentFilename Tên file đính kèm (vd: "Hoa_don_BK-123.pdf")
     * @param attachmentBytes    Mảng byte nội dung file
     * @param contentType        Loại MIME (vd: "application/pdf")
     */
    void sendEmailWithAttachment(String to, String subject, String htmlContent,
                                 String attachmentFilename, byte[] attachmentBytes, String contentType);

    /**
     * Gửi email HTML bất đồng bộ có trả về CompletableFuture (phục vụ test hoặc kiểm tra luồng async).
     *
     * @param to          Địa chỉ người nhận
     * @param subject     Tiêu đề email
     * @param htmlContent Nội dung HTML
     * @return CompletableFuture chứa kết quả boolean (true nếu gửi thành công)
     */
    CompletableFuture<Boolean> sendHtmlEmailAsync(String to, String subject, String htmlContent);

    /**
     * Gửi email kèm file đính kèm bất đồng bộ có trả về CompletableFuture.
     */
    CompletableFuture<Boolean> sendEmailWithAttachmentAsync(String to, String subject, String htmlContent,
                                                           String attachmentFilename, byte[] attachmentBytes, String contentType);

    /**
     * Gửi email xác nhận đặt phòng và cọc thành công theo mẫu HTML sang trọng của Grand Aurora Luxury Hotel.
     *
     * @param to            Email khách hàng
     * @param customerName  Tên khách hàng
     * @param bookingCode   Mã đặt phòng
     * @param roomTypeName  Tên loại phòng
     * @param quantity      Số lượng phòng
     * @param checkInDate   Ngày nhận phòng
     * @param checkOutDate  Ngày trả phòng
     * @param depositAmount Số tiền cọc đã thanh toán (VND)
     * @param totalAmount   Tổng tiền phòng (VND)
     * @param pdfAttachment File PDF hóa đơn (tùy chọn, có thể null)
     */
    void sendBookingConfirmationEmail(String to, String customerName, String bookingCode,
                                      String roomTypeName, int quantity,
                                      String checkInDate, String checkOutDate,
                                      long depositAmount, long totalAmount,
                                      byte[] pdfAttachment);

    /**
     * Gửi email cảm ơn và hóa đơn quyết toán khi Check-out thành công (tất toán 100%).
     *
     * @param to            Email khách hàng
     * @param customerName  Tên khách hàng
     * @param bookingCode   Mã đặt phòng
     * @param roomTypeName  Tên loại phòng
     * @param quantity      Số lượng phòng
     * @param checkInDate   Ngày nhận phòng
     * @param checkOutDate  Ngày trả phòng
     * @param totalAmount   Tổng tiền phòng đã tất toán 100% (VND)
     * @param pdfAttachment File PDF hóa đơn quyết toán
     */
    void sendCheckOutInvoiceEmail(String to, String customerName, String bookingCode,
                                  String roomTypeName, int quantity,
                                  String checkInDate, String checkOutDate,
                                  long totalAmount,
                                  byte[] pdfAttachment);

    /** Bản ghi email giả lập được lưu tạm trong bộ nhớ khi bật USE_MOCK_PROVIDERS=true */
    record MockEmailRecord(
            String to,
            String subject,
            boolean hasAttachment,
            String attachmentFilename,
            int attachmentSizeBytes,
            String contentType,
            String sentAt
    ) {}

    default List<MockEmailRecord> getMockSentEmails() {
        return List.of();
    }

    default void clearMockSentEmails() {
    }
}
