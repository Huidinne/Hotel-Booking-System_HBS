package org.example.backend.chat;

import org.example.backend.chat.prompt.HotelPromptManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Kiểm thử Quản lý System Prompt và Rào chắn Guardrails theo task [SP2-1105-THANH]:
 * - Tải thành công từ classpath:chat/system-prompt.txt
 * - Thông tin các loại phòng được phép công khai và giá niêm yết
 * - Chính sách cọc 50% VNPay và hủy phòng căn cứ mốc 14:00
 * - Quy tắc không tự khẳng định còn phòng / đã đặt hoặc thanh toán thành công
 * - Hướng người dùng sang trang tra cứu tìm phòng theo ngày
 * - Nhận diện câu hỏi ngoài phạm vi nghiệp vụ khách sạn
 */
class HotelPromptManagerTest {

    private final HotelPromptManager promptManagerWithLoader = new HotelPromptManager(new DefaultResourceLoader());
    private final HotelPromptManager defaultPromptManager = new HotelPromptManager();

    @Test
    @DisplayName("System Prompt: Tải thành công từ classpath:chat/system-prompt.txt")
    void testSystemPrompt_LoadedFromResourceFile() {
        String prompt = promptManagerWithLoader.getSystemPrompt();
        assertThat(prompt).isNotBlank();
        assertThat(prompt).contains("Grand Aurora Luxury Hotel");
    }

    @Test
    @DisplayName("System Prompt: Chứa đầy đủ thông tin khách sạn, tiện ích và các hạng phòng công khai")
    void testSystemPrompt_ContainsRequiredHotelKnowledge() {
        String prompt = promptManagerWithLoader.getSystemPrompt();

        // Khách sạn & vị trí
        assertThat(prompt).contains("Grand Aurora Luxury Hotel");
        assertThat(prompt).contains("Đà Nẵng");
        assertThat(prompt).contains("01 Võ Nguyên Giáp");
        assertThat(prompt).contains("1900 888 888");

        // 3 Hạng phòng công khai & giá niêm yết
        assertThat(prompt).contains("Standard Single Room");
        assertThat(prompt).contains("500.000 VNĐ");
        assertThat(prompt).contains("Deluxe Double Room");
        assertThat(prompt).contains("950.000 VNĐ");
        assertThat(prompt).contains("Executive Suite Luxury");
        assertThat(prompt).contains("1.800.000 VNĐ");

        // Tiện ích & Buffet sáng
        assertThat(prompt).contains("Buffet");
        assertThat(prompt).contains("06:30 - 09:30");
        assertThat(prompt).contains("hồ bơi vô cực");
        assertThat(prompt).contains("Gym");
        assertThat(prompt).contains("14:00");
        assertThat(prompt).contains("12:00");
    }

    @Test
    @DisplayName("System Prompt: Chứa quy định cọc 50% VNPay và chính sách hoàn hủy tính theo mốc 14:00")
    void testSystemPrompt_ContainsDepositAndCancellationPolicy() {
        String prompt = promptManagerWithLoader.getSystemPrompt();

        assertThat(prompt).contains("50%");
        assertThat(prompt).contains("VNPay");
        assertThat(prompt).contains("14:00");
        assertThat(prompt).contains(">= 24 giờ");
        assertThat(prompt).contains("12 giờ đến 24 giờ");
        assertThat(prompt).contains("dưới 12 giờ");
    }

    @Test
    @DisplayName("System Prompt: Ràng buộc KHÔNG tự ý khẳng định còn phòng và KHÔNG tự xác nhận thanh toán/đặt phòng")
    void testSystemPrompt_ContainsAntiHallucinationRules() {
        String prompt = promptManagerWithLoader.getSystemPrompt();

        // Không tự khẳng định còn phòng
        assertThat(prompt).contains("TUYỆT ĐỐI KHÔNG TỰ Ý KHẲNG ĐỊNH CÒN PHÒNG HOẶC HẾT PHÒNG");
        // Không tự xác nhận thanh toán / đặt phòng
        assertThat(prompt).contains("TUYỆT ĐỐI KHÔNG TỰ XÁC NHẬN ĐÃ ĐẶT PHÒNG THÀNH CÔNG HOẶC ĐÃ THANH TOÁN THÀNH CÔNG");
        // Hướng người dùng sang trang tra cứu
        assertThat(prompt).contains("Tra cứu phòng trống");
    }

    @Test
    @DisplayName("Guardrails: Nhận diện chính xác câu hỏi ngoài phạm vi (code, toán, chính trị)")
    void testIsOutOfScope_DetectsOutOfScopeRequests() {
        assertThat(promptManagerWithLoader.isOutOfScope("Viết code Python giải phương trình bậc 2")).isTrue();
        assertThat(promptManagerWithLoader.isOutOfScope("Cho tôi hàm javascript tính fibonacci")).isTrue();
        assertThat(promptManagerWithLoader.isOutOfScope("Tình hình bầu cử chính trị thế giới thế nào?")).isTrue();
        assertThat(promptManagerWithLoader.isOutOfScope("Viết cho tôi một bài thơ tình lãng mạn")).isTrue();

        // Câu hỏi trong phạm vi khách sạn
        assertThat(promptManagerWithLoader.isOutOfScope("Khách sạn có những hạng phòng nào?")).isFalse();
        assertThat(promptManagerWithLoader.isOutOfScope("Mấy giờ nhận phòng và check-out?")).isFalse();
        assertThat(promptManagerWithLoader.isOutOfScope("Chính sách hủy phòng và đặt cọc VNPay thế nào?")).isFalse();
        assertThat(promptManagerWithLoader.isOutOfScope("Tiền phòng có gồm ăn sáng buffet không?")).isFalse();
    }

    @Test
    @DisplayName("Chống ảo giác: Nhận diện câu hỏi còn phòng và cung cấp thông điệp hướng sang trang tra cứu")
    void testAvailabilityInquiryAndGuidance() {
        assertThat(promptManagerWithLoader.isAvailabilityInquiry("Ngày mai còn phòng Deluxe không bạn?")).isTrue();
        assertThat(promptManagerWithLoader.isAvailabilityInquiry("Ngày 10/11 có còn phòng trống không?")).isTrue();
        assertThat(promptManagerWithLoader.isAvailabilityInquiry("Kiểm tra phòng cho tôi ngày 20")).isTrue();

        String guidance = promptManagerWithLoader.getAvailabilityGuidanceMessage();
        assertThat(guidance).contains("không thể tự ý khẳng định còn phòng hay hết phòng");
        assertThat(guidance).contains("Tra cứu & Tìm phòng");
    }

    @Test
    @DisplayName("Chống ảo giác: Nhận diện câu hỏi xác nhận đặt phòng / thanh toán và giải thích quy trình VNPay")
    void testBookingOrPaymentConfirmationInquiryAndGuidance() {
        assertThat(promptManagerWithLoader.isBookingOrPaymentConfirmationInquiry("Tôi đã đặt phòng thành công chưa?")).isTrue();
        assertThat(promptManagerWithLoader.isBookingOrPaymentConfirmationInquiry("Tôi đã thanh toán thành công chưa?")).isTrue();
        assertThat(promptManagerWithLoader.isBookingOrPaymentConfirmationInquiry("Xác nhận thanh toán cho mã này giúp tôi")).isTrue();

        String guidance = promptManagerWithLoader.getBookingOrPaymentGuidanceMessage();
        assertThat(guidance).contains("không có thẩm quyền tự xác nhận đã đặt phòng thành công");
        assertThat(guidance).contains("VNPay");
        assertThat(guidance).contains("Lịch sử đặt phòng");
    }

    @Test
    @DisplayName("Fallback an toàn: Constructor mặc định không có ResourceLoader vẫn trả về System Prompt hợp lệ")
    void testDefaultConstructor_ReturnsValidPrompt() {
        String prompt = defaultPromptManager.getSystemPrompt();
        assertThat(prompt).isNotBlank();
        assertThat(prompt).contains("Grand Aurora Luxury Hotel");
    }
}
