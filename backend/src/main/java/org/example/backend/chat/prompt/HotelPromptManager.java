package org.example.backend.chat.prompt;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Quản lý System Prompt & Rào chắn an toàn (Guardrails) cho Chatbot Grand Aurora.
 * Đáp ứng yêu cầu task [SP2-1105-THANH] / [SP2-BE-03]:
 * - Tải System Prompt từ tài nguyên bên ngoài: classpath:chat/system-prompt.txt
 * - Thông tin các loại phòng được phép công khai và giá niêm yết chuẩn 5 sao
 * - Tiện ích khách sạn (Buffet sáng 06:30-09:30, hồ bơi vô cực, Gym 24/7)
 * - Chính sách đặt cọc 50% qua cổng thanh toán VNPay
 * - Chính sách hủy phòng căn cứ mốc 14:00 ngày nhận phòng
 * - Rào chắn phạm vi (Scope limitation): từ chối lịch thiệp câu hỏi ngoài phạm vi khách sạn
 * - Chống ảo giác: Không tự khẳng định còn phòng, không tự xác nhận đặt phòng hay thanh toán thành công
 * - Luôn hướng người dùng sang trang tra cứu tìm phòng để biết tình trạng phòng trống và giá thời gian thực
 */
@Slf4j
@Component
public class HotelPromptManager {

    public static final String PROMPT_RESOURCE_PATH = "classpath:chat/system-prompt.txt";

    public static final String FALLBACK_SYSTEM_PROMPT = """
            Bạn là Trợ lý ảo AI Lễ tân thông minh, lịch thiệp và chuyên nghiệp của Khách sạn 5 sao quốc tế Grand Aurora Luxury Hotel (Đà Nẵng).
            Nhiệm vụ của bạn là hỗ trợ, tư vấn đặt phòng, giải đáp thắc mắc về giá cả, dịch vụ và chính sách của khách sạn cho du khách bằng tiếng Việt chuẩn mực.

            [THÔNG TIN KHÁCH SẠN]:
            - Tên: Grand Aurora Luxury Hotel
            - Tiêu chuẩn: Khách sạn nghỉ dưỡng 5 sao quốc tế
            - Địa chỉ: 01 Võ Nguyên Giáp, Phường Phước Mỹ, Quận Sơn Trà, TP. Đà Nẵng (nằm sát bãi biển Mỹ Khê)
            - Hotline hỗ trợ 24/7: 1900 888 888 | Email: contact@grandaurora.com
            - Giờ nhận phòng (Check-in): Từ 14:00 chiều | Giờ trả phòng (Check-out): Trước 12:00 trưa hôm sau.
            - Hỗ trợ gửi hành lý miễn phí tại quầy lễ tân nếu khách đến trước giờ nhận phòng 14:00.

            [DANH SÁCH HẠNG PHÒNG ĐƯỢC PHÉP CÔNG KHAI & GIÁ NIÊM YẾT THAM KHẢO]:
            1. Standard Single Room:
               - Giá niêm yết: 500.000 VNĐ / đêm
               - Sức chứa: 1 người lớn
               - Tiện nghi: 1 giường đơn cao cấp, máy lạnh, wifi tốc độ cao, phòng tắm đứng nóng lạnh hiện đại.
            2. Deluxe Double Room:
               - Giá niêm yết: 950.000 VNĐ / đêm
               - Sức chứa: 2 người lớn (rất phù hợp cho cặp đôi)
               - Tiện nghi: 1 giường đôi King-size, ban công riêng ngắm trọn biển Mỹ Khê, bàn làm việc cao cấp, Smart TV 55 inch.
            3. Executive Suite Luxury:
               - Giá niêm yết: 1.800.000 VNĐ / đêm
               - Sức chứa: 4 người lớn (lý tưởng cho gia đình hoặc nhóm bạn)
               - Tiện nghi: Căn hộ 2 phòng ngủ riêng biệt, bồn tắm nằm thư giãn, phòng khách rộng rãi, minibar, tầm nhìn panorama toàn cảnh bán đảo Sơn Trà.

            [DỊCH VỤ & TIỆN ÍCH MIỄN PHÍ ĐI KÈM]:
            - Miễn phí bữa sáng Buffet tự chọn hàng ngày từ 06:30 - 09:30 tại nhà hàng Aurora tầng 2.
            - Miễn phí sử dụng hồ bơi vô cực trên tầng thượng (Infinity Rooftop Pool) và phòng Gym thể hình 24/7.
            - Dịch vụ dọn phòng hàng ngày, wifi tốc độ cao phủ sóng toàn bộ khách sạn.

            [CHÍNH SÁCH ĐẶT CỌC VNPAY & HOÀN HỦY THEO MỐC 14:00]:
            - Đặt cọc trực tuyến: Quý khách cần đặt cọc trước 50% tổng giá trị đơn đặt phòng qua cổng thanh toán VNPay khi giữ phòng online. 50% còn lại thanh toán tại quầy lễ tân khi trả phòng.
            - Thời gian Check-in chuẩn là 14:00 của ngày nhận phòng. Chính sách hoàn hủy căn cứ nghiêm ngặt theo mốc 14:00 này:
              + Hủy trước >= 24 giờ so với mốc 14:00 ngày nhận phòng: Hoàn lại 100% tiền cọc (miễn phí hủy phòng).
              + Hủy từ 12 giờ đến 24 giờ trước mốc 14:00: Phạt 30% tiền cọc, hoàn lại 70% tiền cọc.
              + Hủy dưới 12 giờ trước mốc 14:00 (hoặc không đến nhận phòng - No Show): Phạt 50% tiền cọc (không hoàn tiền cọc).

            [QUY TẮC BẢO VỆ NGHIỆP VỤ & CHỐNG ẢO GIÁC - BẮT BUỘC TUÂN THỦ]:
            1. TUYỆT ĐỐI KHÔNG TỰ Ý KHẲNG ĐỊNH CÒN PHÒNG HOẶC HẾT PHÒNG vào ngày cụ thể:
               - Do số lượng phòng trống thay đổi liên tục theo thời gian thực theo hệ thống quản lý phòng (PMS), bạn KHÔNG ĐƯỢC phép cam kết còn hay hết phòng vào ngày khách hỏi.
               - Luôn hướng dẫn khách hàng truy cập trang "Tra cứu phòng trống" hoặc "Đặt phòng" trên website để chọn ngày nhận/trả phòng và kiểm tra tình trạng phòng trống thực tế.
            2. TUYỆT ĐỐI KHÔNG TỰ XÁC NHẬN ĐÃ ĐẶT PHÒNG THÀNH CÔNG HOẶC ĐÃ THANH TOÁN THÀNH CÔNG:
               - Bạn chỉ là Trợ lý ảo tư vấn thông tin, không trực tiếp xử lý giao dịch tài chính hay giữ chỗ.
               - Nhắc khách rằng đơn đặt phòng chỉ thành công khi khách hoàn tất cọc 50% qua cổng VNPay và nhận email xác nhận kèm mã đặt phòng.
               - Khi khách hỏi về trạng thái thanh toán hoặc đặt phòng, hãy hướng dẫn khách kiểm tra mục "Lịch sử đặt phòng" trên tài khoản website hoặc liên hệ hotline 1900 888 888.
            3. HƯỚNG DẪN TRA CỨU GIÁ VÀ TÌNH TRẠNG PHÒNG THEO NGÀY:
               - Khi khách hỏi giá cho ngày cụ thể hoặc dịp lễ tết: Hãy nêu giá niêm yết tham khảo, đồng thời hướng dẫn khách nhập ngày lưu trú trên trang tra cứu của website để nhận báo giá chính xác cùng các chương trình khuyến mãi hiện hành.
            4. RÀO CHẮN PHẠM VI (GUARDRAILS) & GIỌNG ĐIỆU:
               - Luôn trả lời bằng TIẾNG VIỆT với thái độ tôn trọng, lịch thiệp, chu đáo: "Dạ Grand Aurora xin chào quý khách...", "Em rất vui được hỗ trợ quý khách...".
               - CHỈ trả lời các nội dung thuộc phạm vi khách sạn Grand Aurora.
               - Nếu khách hỏi ngoài lề (lập trình, viết code, giải toán, chính trị, dịch vụ ngoài khách sạn,...), hãy từ chối lịch sự:
                 "Dạ em là Trợ lý ảo Lễ tân của Grand Aurora Luxury Hotel. Em chỉ có thể hỗ trợ quý khách các thông tin về phòng nghỉ, tiện ích và chính sách đặt phòng của khách sạn tại Đà Nẵng. Quý khách cần em tư vấn thêm về loại phòng hoặc hướng dẫn tra cứu phòng trên website không ạ?"
            """;

    public static final String HOTEL_SYSTEM_PROMPT = FALLBACK_SYSTEM_PROMPT;

    private final ResourceLoader resourceLoader;
    private String loadedPrompt;

    public HotelPromptManager() {
        this(null);
    }

    public HotelPromptManager(@Nullable ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
        this.loadedPrompt = loadPromptFromResource();
    }

    @PostConstruct
    public void init() {
        this.loadedPrompt = loadPromptFromResource();
    }

    private String loadPromptFromResource() {
        if (resourceLoader == null) {
            return FALLBACK_SYSTEM_PROMPT;
        }

        try {
            Resource resource = resourceLoader.getResource(PROMPT_RESOURCE_PATH);
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    String text = new String(is.readAllBytes(), StandardCharsets.UTF_8).trim();
                    if (!text.isEmpty()) {
                        log.info("[HotelPromptManager] Đã tải System Prompt thành công từ [{}] ({} ký tự)",
                                PROMPT_RESOURCE_PATH, text.length());
                        return text;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[HotelPromptManager] Không thể đọc System Prompt từ {}: {}. Sử dụng nội dung mặc định.",
                    PROMPT_RESOURCE_PATH, e.getMessage());
        }

        return FALLBACK_SYSTEM_PROMPT;
    }

    public String getSystemPrompt() {
        return (loadedPrompt != null && !loadedPrompt.isBlank()) ? loadedPrompt : FALLBACK_SYSTEM_PROMPT;
    }

    /**
     * Kiểm tra xem câu hỏi có nằm ngoài phạm vi khách sạn hay không (Guardrails Heuristics)
     */
    public boolean isOutOfScope(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }
        String lower = message.toLowerCase(Locale.ROOT);

        // Các từ khóa lập trình / công nghệ ngoài lề
        if (lower.contains("viết code") || lower.contains("python") || lower.contains("javascript")
                || lower.contains("java code") || lower.contains("html/css") || lower.contains("function ")
                || lower.contains("lập trình") || lower.contains("giải phương trình") || lower.contains("toán học")) {
            return true;
        }

        // Các chủ đề chính trị, tin tức ngoài lề
        if (lower.contains("chính trị") || lower.contains("bầu cử") || lower.contains("chiến tranh")
                || lower.contains("thơ tình") || lower.contains("viết bài văn")) {
            return true;
        }

        return false;
    }

    public String getOutOfScopeRefusalMessage() {
        return "Dạ em là Trợ lý ảo Lễ tân của Grand Aurora Luxury Hotel. Em chỉ có thể hỗ trợ quý khách các thông tin về phòng nghỉ, tiện ích và chính sách đặt phòng của khách sạn tại Đà Nẵng. Quý khách cần em tư vấn thêm về loại phòng hoặc hướng dẫn tra cứu phòng trên website không ạ?";
    }

    /**
     * Nhận diện câu hỏi liên quan đến tình trạng còn phòng / phòng trống theo ngày cụ thể
     */
    public boolean isAvailabilityInquiry(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }
        String lower = message.toLowerCase(Locale.ROOT);
        return lower.contains("còn phòng")
                || lower.contains("hết phòng")
                || lower.contains("phòng trống")
                || lower.contains("trống phòng")
                || lower.contains("ngày mai còn")
                || lower.contains("hôm nay còn")
                || lower.contains("kiểm tra phòng")
                || lower.contains("check phòng");
    }

    /**
     * Thông điệp hướng dẫn tra cứu phòng theo thời gian thực (không tự ý khẳng định)
     */
    public String getAvailabilityGuidanceMessage() {
        return "Dạ thưa quý khách, tình trạng phòng trống và giá phòng thay đổi liên tục theo thời gian thực trên hệ thống quản lý phòng của Grand Aurora. " +
                "Em không thể tự ý khẳng định còn phòng hay hết phòng vào ngày cụ thể. " +
                "Quý khách vui lòng truy cập trang **Tra cứu & Tìm phòng** trên website (nhập ngày nhận phòng, ngày trả phòng và số khách) để kiểm tra số lượng phòng trống và giá thời gian thực chính xác nhất ạ!";
    }

    /**
     * Nhận diện câu hỏi yêu cầu xác nhận đặt phòng hoặc thanh toán thành công
     */
    public boolean isBookingOrPaymentConfirmationInquiry(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }
        String lower = message.toLowerCase(Locale.ROOT);
        return lower.contains("đã đặt phòng thành công")
                || lower.contains("đã thanh toán thành công")
                || lower.contains("xác nhận đặt phòng")
                || lower.contains("xác nhận thanh toán")
                || lower.contains("kiểm tra thanh toán")
                || lower.contains("booking của tôi đã thành công chưa");
    }

    /**
     * Thông điệp giải thích quy trình xác nhận đặt phòng và cọc VNPay
     */
    public String getBookingOrPaymentGuidanceMessage() {
        return "Dạ thưa quý khách, Trợ lý ảo không có thẩm quyền tự xác nhận đã đặt phòng thành công hay đã thanh toán thành công. " +
                "Mọi đơn đặt phòng và giao dịch cọc 50% chỉ được xác nhận chính thức khi quý khách hoàn tất thanh toán qua cổng VNPay và nhận email hóa đơn xác nhận từ Grand Aurora. " +
                "Quý khách có thể kiểm tra trạng thái tại mục 'Lịch sử đặt phòng' trên website hoặc liên hệ hotline 1900 888 888 để được hỗ trợ kiểm tra ạ!";
    }
}
