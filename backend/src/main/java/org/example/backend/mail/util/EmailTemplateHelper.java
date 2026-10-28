package org.example.backend.mail.util;

import java.text.NumberFormat;
import java.util.Locale;

/**
 * Lớp tiện ích sinh các mẫu HTML Email chuyên nghiệp và chuẩn mực giao diện:
 * - Chuẩn hóa hiển thị trên các ứng dụng Mail (Gmail, Outlook, Apple Mail).
 * - Tông màu sang trọng (Gold #c59b27 / Navy #0f172a / Slate #334155) phù hợp khách sạn cao cấp Grand Aurora.
 */
public class EmailTemplateHelper {

    private static final NumberFormat CURRENCY_FORMAT = NumberFormat.getInstance(Locale.forLanguageTag("vi-VN"));

    private EmailTemplateHelper() {
        // Utility class
    }

    /**
     * Mẫu Email xác nhận đặt phòng & thanh toán cọc thành công kèm thông tin chi tiết.
     */
    public static String buildBookingConfirmationHtml(String customerName, String bookingCode,
                                                      String roomTypeName, int quantity,
                                                      String checkInDate, String checkOutDate,
                                                      long depositAmount, long totalAmount) {
        String formattedDeposit = CURRENCY_FORMAT.format(depositAmount) + " ₫";
        String formattedTotal = CURRENCY_FORMAT.format(totalAmount) + " ₫";
        long remaining = Math.max(0, totalAmount - depositAmount);
        String formattedRemaining = CURRENCY_FORMAT.format(remaining) + " ₫";

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Xác nhận đặt phòng - Grand Aurora Luxury Hotel</title>
              <style>
                body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; color: #1e293b; }
                .container { max-width: 620px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
                .header { background: linear-gradient(135deg, #0f172a 0%%, #1e293b 100%%); color: #ffffff; padding: 36px 30px; text-align: center; border-bottom: 4px solid #c59b27; }
                .header h1 { margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase; color: #e2e8f0; }
                .header p { margin: 8px 0 0; color: #c59b27; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; }
                .content { padding: 32px 30px; }
                .badge-box { background-color: #f8fafc; border: 1px dashed #c59b27; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px; }
                .badge-title { font-size: 13px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
                .badge-code { font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: 2px; }
                .section-title { font-size: 16px; font-weight: 700; color: #0f172a; border-left: 4px solid #c59b27; padding-left: 10px; margin: 24px 0 14px; }
                .info-table { width: 100%%; border-collapse: collapse; margin-bottom: 20px; }
                .info-table td { padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
                .info-table td.label { color: #64748b; width: 40%%; }
                .info-table td.value { color: #0f172a; font-weight: 600; }
                .price-box { background: #fdfbf5; border: 1px solid #f2e2be; border-radius: 8px; padding: 18px; margin: 24px 0; }
                .price-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
                .price-total { border-top: 1px solid #e2d2aa; padding-top: 10px; margin-top: 10px; font-weight: 700; font-size: 16px; color: #0f172a; }
                .highlight-deposit { color: #16a34a; font-weight: 700; }
                .highlight-due { color: #ea580c; font-weight: 700; }
                .policy-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; font-size: 13px; color: #1e3a8a; border-radius: 4px; line-height: 1.5; }
                .footer { background-color: #0f172a; color: #94a3b8; padding: 24px 30px; text-align: center; font-size: 12px; line-height: 1.6; }
                .footer a { color: #c59b27; text-decoration: none; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Grand Aurora</h1>
                  <p>LUXURY HOTEL &amp; RESORT</p>
                </div>
                <div class="content">
                  <p style="font-size: 16px;">Kính chào Quý khách <strong>%s</strong>,</p>
                  <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                    Cảm ơn Quý khách đã tin tưởng và lựa chọn <strong>Grand Aurora Luxury Hotel</strong>. Đơn đặt phòng của Quý khách đã được hệ thống xác nhận và bảo đảm giữ chỗ thành công!
                  </p>

                  <div class="badge-box">
                    <div class="badge-title">Mã số đặt phòng của Quý khách</div>
                    <div class="badge-code">%s</div>
                  </div>

                  <div class="section-title">Chi tiết lịch trình lưu trú</div>
                  <table class="info-table">
                    <tr><td class="label">Loại phòng:</td><td class="value">%s</td></tr>
                    <tr><td class="label">Số lượng phòng:</td><td class="value">%d phòng</td></tr>
                    <tr><td class="label">Ngày nhận phòng (Check-in):</td><td class="value">%s (từ 14:00)</td></tr>
                    <tr><td class="label">Ngày trả phòng (Check-out):</td><td class="value">%s (trước 12:00)</td></tr>
                  </table>

                  <div class="section-title">Chi tiết thanh toán &amp; Đối soát</div>
                  <div class="price-box">
                    <div class="price-row">
                      <span>Tổng tiền phòng:</span>
                      <strong>%s</strong>
                    </div>
                    <div class="price-row">
                      <span>Tiền cọc quy chuẩn đã thanh toán (50%%):</span>
                      <span class="highlight-deposit">%s</span>
                    </div>
                    <div class="price-row price-total">
                      <span>Khoản tiền còn lại thanh toán khi nhận phòng:</span>
                      <span class="highlight-due">%s</span>
                    </div>
                  </div>

                  <div class="policy-box">
                    <strong>Lưu ý quan trọng:</strong>
                    <br>&bull; Giờ nhận phòng tiêu chuẩn: <strong>14:00</strong>. Giờ trả phòng: <strong>12:00 trưa</strong>.
                    <br>&bull; Chính sách hủy phòng: Miễn phí hủy trước 24h so với 14:00 ngày Check-in.
                    <br>&bull; Quý khách vui lòng xuất trình mã đặt phòng này cùng CCCD/Hộ chiếu tại quầy Lễ tân khi làm thủ tục nhận phòng.
                  </div>
                </div>

                <div class="footer">
                  <p>Grand Aurora Luxury Hotel &bull; 01 Đường Biển, Quận Sơn Trà, TP. Đà Nẵng</p>
                  <p>Hotline hỗ trợ 24/7: <a href="tel:1900888888">1900 888 888</a> | Email: <a href="mailto:support@grandaurora.com">support@grandaurora.com</a></p>
                  <p style="margin-top: 12px; color: #64748b;">Đây là email tự động từ hệ thống quản lý khách sạn HBS. Vui lòng không trả lời trực tiếp email này.</p>
                </div>
              </div>
            </body>
            </html>
            """.formatted(
                escapeHtml(customerName),
                escapeHtml(bookingCode),
                escapeHtml(roomTypeName),
                quantity,
                escapeHtml(checkInDate),
                escapeHtml(checkOutDate),
                formattedTotal,
                formattedDeposit,
                formattedRemaining
        );
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
