package org.example.backend.mail.util;

import lombok.extern.slf4j.Slf4j;
import org.example.backend.common.util.QrCodeGenerator;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.util.Locale;

/**
 * Lớp tiện ích sinh các mẫu HTML Email chuyên nghiệp và chuẩn mực giao diện:
 * - Tự động tải template từ /templates/email-booking-confirmed.html.
 * - Nhúng mã QR Code Base64 độ phân giải cao tra cứu tại quầy.
 * - Tính toán bóc tách thuế VAT 8% và số tiền cọc/còn lại chuẩn xác.
 */
@Slf4j
public class EmailTemplateHelper {

    private static final NumberFormat CURRENCY_FORMAT = NumberFormat.getInstance(Locale.forLanguageTag("vi-VN"));

    private EmailTemplateHelper() {
        // Utility class
    }

    /**
     * Dựng mẫu Email xác nhận đặt phòng đầy đủ kèm mã QR và phân bổ VAT 8%.
     */
    public static String buildBookingConfirmationHtml(String customerName, String customerPhone,
                                                      String bookingCode, String roomTypeName, int quantity,
                                                      long nights, String checkInDate, String checkOutDate,
                                                      long depositAmount, long totalAmount) {

        // Tính toán chi tiết thuế VAT 8%
        long totalBeforeVat = Math.round(totalAmount / 1.08);
        long vatAmount = totalAmount - totalBeforeVat;
        long remaining = Math.max(0, totalAmount - depositAmount);

        String formattedTotalBeforeVat = CURRENCY_FORMAT.format(totalBeforeVat) + " ₫";
        String formattedVat = CURRENCY_FORMAT.format(vatAmount) + " ₫";
        String formattedTotal = CURRENCY_FORMAT.format(totalAmount) + " ₫";
        String formattedDeposit = CURRENCY_FORMAT.format(depositAmount) + " ₫";
        String formattedRemaining = CURRENCY_FORMAT.format(remaining) + " ₫";

        // Sinh mã QR Code cho đặt phòng
        String qrContent = String.format("GRAND AURORA LUXURY HOTEL\nBooking Code: %s\nKhách hàng: %s\nNhận phòng: %s\nTrả phòng: %s\nTổng tiền: %s\nĐã cọc: %s",
                bookingCode, customerName, checkInDate, checkOutDate, formattedTotal, formattedDeposit);
        String qrCodeBase64 = QrCodeGenerator.generateQrCodeBase64(qrContent, 200, 200);

        // Tải template từ file resources
        try (InputStream inputStream = EmailTemplateHelper.class.getResourceAsStream("/templates/email-booking-confirmed.html")) {
            if (inputStream != null) {
                String template = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
                return template
                        .replace("{{customerName}}", escapeHtml(customerName))
                        .replace("{{customerPhone}}", escapeHtml(customerPhone != null ? customerPhone : "N/A"))
                        .replace("{{bookingCode}}", escapeHtml(bookingCode))
                        .replace("{{roomTypeName}}", escapeHtml(roomTypeName))
                        .replace("{{quantity}}", String.valueOf(quantity))
                        .replace("{{nights}}", String.valueOf(Math.max(1, nights)))
                        .replace("{{checkInDate}}", escapeHtml(checkInDate))
                        .replace("{{checkOutDate}}", escapeHtml(checkOutDate))
                        .replace("{{roomAmountBeforeVat}}", formattedTotalBeforeVat)
                        .replace("{{vatAmount}}", formattedVat)
                        .replace("{{totalAmount}}", formattedTotal)
                        .replace("{{depositAmount}}", formattedDeposit)
                        .replace("{{remainingAmount}}", formattedRemaining)
                        .replace("{{qrCodeBase64}}", qrCodeBase64);
            }
        } catch (Exception e) {
            log.warn("Không thể tải file /templates/email-booking-confirmed.html, sử dụng fallback template: {}", e.getMessage());
        }

        // Fallback sang phương thức inline nếu không đọc được file template
        return buildBookingConfirmationHtml(customerName, bookingCode, roomTypeName, quantity, checkInDate, checkOutDate, depositAmount, totalAmount);
    }

    /**
     * Phương thức tương thích ngược cho template đơn giản.
     */
    public static String buildBookingConfirmationHtml(String customerName, String bookingCode,
                                                      String roomTypeName, int quantity,
                                                      String checkInDate, String checkOutDate,
                                                      long depositAmount, long totalAmount) {
        return buildBookingConfirmationHtml(customerName, "", bookingCode, roomTypeName, quantity, 1, checkInDate, checkOutDate, depositAmount, totalAmount);
    }

    /**
     * Mẫu Email thông báo chung (Test email, hủy đơn, hoàn tiền...).
     */
    public static String buildGenericNotificationHtml(String title, String preheader, String mainMessage,
                                                      String ctaText, String ctaUrl) {
        String buttonHtml = "";
        if (ctaText != null && !ctaText.isBlank() && ctaUrl != null && !ctaUrl.isBlank()) {
            buttonHtml = """
                <div style="text-align: center; margin: 30px 0;">
                  <a href="%s" style="background-color: #c59b27; color: #0f172a; padding: 12px 28px; font-weight: 700; text-decoration: none; border-radius: 6px; font-size: 14px; display: inline-block;">
                    %s
                  </a>
                </div>
                """.formatted(escapeHtml(ctaUrl), escapeHtml(ctaText));
        }

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>%s</title>
              <style>
                body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; color: #1e293b; }
                .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
                .header { background: linear-gradient(135deg, #0f172a 0%%, #1e293b 100%%); color: #ffffff; padding: 30px; text-align: center; border-bottom: 4px solid #c59b27; }
                .content { padding: 32px 30px; }
                .footer { background-color: #0f172a; color: #94a3b8; padding: 20px 30px; text-align: center; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 22px; color: #f8fafc; letter-spacing: 1.5px;">Grand Aurora Luxury Hotel</h1>
                  <p style="margin: 6px 0 0; color: #c59b27; font-size: 12px; font-weight: 600; text-transform: uppercase;">%s</p>
                </div>
                <div class="content">
                  <h2 style="color: #0f172a; margin-top: 0;">%s</h2>
                  <div style="font-size: 15px; line-height: 1.7; color: #334155;">
                    %s
                  </div>
                  %s
                </div>
                <div class="footer">
                  <p>Grand Aurora Luxury Hotel &bull; Hỗ trợ: support@grandaurora.com &bull; 1900 888 888</p>
                </div>
              </div>
            </body>
            </html>
            """.formatted(
                escapeHtml(title),
                escapeHtml(preheader),
                escapeHtml(title),
                mainMessage,
                buttonHtml
        );
    }

    private static String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&#39;");
    }
}
