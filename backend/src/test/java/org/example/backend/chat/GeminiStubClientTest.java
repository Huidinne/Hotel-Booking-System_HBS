package org.example.backend.chat;

import org.example.backend.chat.client.impl.GeminiStubClient;
import org.example.backend.chat.prompt.HotelPromptManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Kiểm thử 100% Provider Stub cho Chatbot Grand Aurora theo task [SP2-1105-THANH]:
 * - Kiểm thử nghiệp vụ khách sạn (loại phòng công khai, buffet sáng, cọc 50% VNPay, hủy 14:00)
 * - Rào chắn an toàn Guardrails (từ chối tiếng Việt lịch sự cho câu hỏi ngoài phạm vi)
 * - Chống ảo giác: KHÔNG tự ý khẳng định còn phòng / hết phòng theo ngày
 * - Chống ảo giác: KHÔNG tự xác nhận đã đặt phòng thành công hay thanh toán thành công
 * - Hướng dẫn người dùng sang trang tra cứu tìm phòng
 */
class GeminiStubClientTest {

    private GeminiStubClient stubClient;

    @BeforeEach
    void setUp() {
        HotelPromptManager promptManager = new HotelPromptManager(new DefaultResourceLoader());
        stubClient = new GeminiStubClient(promptManager);
    }

    @Test
    @DisplayName("Stub Provider: getProviderName, getModelName và isAvailable luôn sẵn sàng 100%")
    void testStubProvider_Metadata() {
        assertThat(stubClient.getProviderName()).isEqualTo("stub");
        assertThat(stubClient.getModelName()).isEqualTo("stub-mock-provider");
        assertThat(stubClient.isAvailable()).isTrue();
    }

    @Test
    @DisplayName("Chống ảo giác: Khi khách hỏi còn phòng theo ngày → Bot hướng sang trang tra cứu, KHÔNG tự khẳng định")
    void testStub_AvailabilityInquiry_GuidesToSearchPage() {
        String reply = stubClient.generateContent("Ngày mai khách sạn còn phòng Deluxe không ạ?", "");

        // Không tự khẳng định còn phòng
        assertThat(reply).contains("không thể tự ý khẳng định còn phòng hay hết phòng");
        // Hướng dẫn sang trang tra cứu tìm phòng trên website
        assertThat(reply).contains("Tra cứu & Tìm phòng");
        assertThat(reply).contains("thời gian thực");
    }

    @Test
    @DisplayName("Chống ảo giác: Khi khách hỏi kiểm tra phòng trống → Hướng dẫn nhập ngày nhận/trả phòng trên website")
    void testStub_CheckRoomInquiry_DirectsToOnlineSearch() {
        String reply = stubClient.generateContent("Kiểm tra phòng cho tôi ngày 20/11", "");

        assertThat(reply).contains("Tra cứu & Tìm phòng");
        assertThat(reply).contains("không thể tự ý khẳng định");
    }

    @Test
    @DisplayName("Chống ảo giác: Khi khách hỏi đã đặt phòng thành công chưa → Bot KHÔNG tự xác nhận, hướng dẫn qua VNPay & lịch sử")
    void testStub_BookingConfirmationInquiry_ExplainsVNPayFlow() {
        String reply = stubClient.generateContent("Tôi đã đặt phòng thành công chưa?", "");

        assertThat(reply).contains("không có thẩm quyền tự xác nhận đã đặt phòng thành công");
        assertThat(reply).contains("VNPay");
        assertThat(reply).contains("Lịch sử đặt phòng");
    }

    @Test
    @DisplayName("Chống ảo giác: Khi khách hỏi đã thanh toán thành công chưa → Bot giải thích xác nhận qua cổng thanh toán VNPay")
    void testStub_PaymentConfirmationInquiry_ExplainsPaymentVerification() {
        String reply = stubClient.generateContent("Tôi đã thanh toán thành công chưa bạn ơi?", "");

        assertThat(reply).contains("không có thẩm quyền tự xác nhận");
        assertThat(reply).contains("VNPay");
        assertThat(reply).contains("1900 888 888");
    }

    @Test
    @DisplayName("Loại phòng & Giá niêm yết: Trả lời đúng 3 loại phòng công khai và nhắc tra cứu ngày thực tế")
    void testStub_RoomTypesAndListedPrices() {
        String reply = stubClient.generateContent("Khách sạn có những hạng phòng nào và giá bao nhiêu?", "");

        assertThat(reply).contains("Standard Single Room");
        assertThat(reply).contains("500.000 VNĐ");
        assertThat(reply).contains("Deluxe Double Room");
        assertThat(reply).contains("950.000 VNĐ");
        assertThat(reply).contains("Executive Suite Luxury");
        assertThat(reply).contains("1.800.000 VNĐ");
        assertThat(reply).contains("Tra cứu & Tìm phòng");
    }

    @Test
    @DisplayName("Chính sách cọc 50% VNPay & hoàn hủy mốc 14:00: Trả lời chi tiết và chính xác")
    void testStub_DepositAndCancellationPolicy() {
        String reply = stubClient.generateContent("Chính sách cọc VNPay và hủy phòng của khách sạn thế nào?", "");

        assertThat(reply).contains("VNPay");
        assertThat(reply).contains("50%");
        assertThat(reply).contains("14:00");
        assertThat(reply).contains("24h");
        assertThat(reply).contains("100%");
        assertThat(reply).contains("12h đến 24h");
        assertThat(reply).contains("70%");
        assertThat(reply).contains("No-Show");
    }

    @Test
    @DisplayName("Thời gian Check-in 14:00 và Check-out 12:00, hỗ trợ gửi hành lý miễn phí")
    void testStub_CheckInOutHours() {
        String reply = stubClient.generateContent("Mấy giờ thì nhận phòng và trả phòng?", "");

        assertThat(reply).contains("14:00");
        assertThat(reply).contains("12:00");
        assertThat(reply).contains("hành lý");
    }

    @Test
    @DisplayName("Tiện ích đi kèm: Buffet sáng 06:30 - 09:30, hồ bơi vô cực rooftop, phòng gym 24/7")
    void testStub_BreakfastAndAmenities() {
        String reply = stubClient.generateContent("Tiền phòng có bao gồm ăn sáng buffet và hồ bơi không?", "");

        assertThat(reply).contains("Buffet");
        assertThat(reply).contains("06:30 - 09:30");
        assertThat(reply).contains("hồ bơi vô cực");
        assertThat(reply).contains("Gym");
    }

    @Test
    @DisplayName("Địa chỉ & Hotline: Tọa lạc tại 01 Võ Nguyên Giáp, Đà Nẵng, hotline 1900 888 888")
    void testStub_LocationAndHotline() {
        String reply = stubClient.generateContent("Địa chỉ khách sạn ở đâu và hotline liên hệ thế nào?", "");

        assertThat(reply).contains("01 Võ Nguyên Giáp");
        assertThat(reply).contains("Đà Nẵng");
        assertThat(reply).contains("1900 888 888");
    }

    @Test
    @DisplayName("Guardrails: Từ chối lịch thiệp câu hỏi lập trình, viết code hoặc giải toán bằng tiếng Việt")
    void testStub_Guardrails_OutOfScopeQuestions() {
        String replyCode = stubClient.generateContent("Viết code Java Spring Boot kết nối MySQL", "");
        assertThat(replyCode).contains("Dạ em là Trợ lý ảo Lễ tân của Grand Aurora Luxury Hotel");
        assertThat(replyCode).contains("chỉ có thể hỗ trợ quý khách các thông tin về phòng nghỉ, tiện ích và chính sách");

        String replyMath = stubClient.generateContent("Giải phương trình bậc hai 2x^2 + 5x - 3 = 0", "");
        assertThat(replyMath).contains("Dạ em là Trợ lý ảo Lễ tân của Grand Aurora Luxury Hotel");

        String replyPolitics = stubClient.generateContent("Bầu cử chính trị Mỹ năm nay ra sao?", "");
        assertThat(replyPolitics).contains("Dạ em là Trợ lý ảo Lễ tân của Grand Aurora Luxury Hotel");
    }

    @Test
    @DisplayName("Tin nhắn rỗng hoặc null: Trả lời lời chào mừng ấm áp chuẩn khách sạn")
    void testStub_BlankMessage_ReturnsGreeting() {
        String replyNull = stubClient.generateContentWithHistory(null, "", Collections.emptyList());
        assertThat(replyNull).contains("Grand Aurora Luxury Hotel");

        String replyBlank = stubClient.generateContentWithHistory("   ", "", Collections.emptyList());
        assertThat(replyBlank).contains("Grand Aurora Luxury Hotel");
    }
}

