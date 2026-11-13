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
    @DisplayName("Chống ảo giác: Khi khách hỏi đã đặt phòng thành công chưa → Bot KHÔNG tự xác nhận, hướng dẫn qua VietQR & lịch sử")
    void testStub_BookingConfirmationInquiry_ExplainsVNPayFlow() {
        String reply = stubClient.generateContent("Tôi đã đặt phòng thành công chưa?", "");

        assertThat(reply).contains("không có thẩm quyền tự xác nhận đã đặt phòng thành công");
        assertThat(reply).contains("VietQR");
        assertThat(reply).contains("Lịch sử đặt phòng");
    }

    @Test
    @DisplayName("Chống ảo giác: Khi khách hỏi đã thanh toán thành công chưa → Bot giải thích xác nhận qua cổng thanh toán VietQR")
    void testStub_PaymentConfirmationInquiry_ExplainsPaymentVerification() {
        String reply = stubClient.generateContent("Tôi đã thanh toán thành công chưa bạn ơi?", "");

        assertThat(reply).contains("không có thẩm quyền tự xác nhận");
        assertThat(reply).contains("VietQR");
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
    @DisplayName("Chính sách cọc 50% VietQR & hoàn hủy mốc 14:00: Trả lời chi tiết và chính xác")
    void testStub_DepositAndCancellationPolicy() {
        String reply = stubClient.generateContent("Chính sách cọc VietQR và hủy phòng của khách sạn thế nào?", "");

        assertThat(reply).contains("VietQR");
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

    @Test
    @DisplayName("Thời gian thực tế: Hỏi hôm nay thứ mấy, bây giờ mấy giờ trả lời chính xác ngày giờ hệ thống")
    void testStub_CurrentTimeAndDateInquiry() {
        String replyDay = stubClient.generateContent("Hôm nay là thứ mấy và ngày bao nhiêu?", "");
        assertThat(replyDay).contains("Grand Aurora Luxury Hotel");
        assertThat(replyDay).contains("Giờ Việt Nam GMT+7");

        String replyTime = stubClient.generateContent("Bây giờ là mấy giờ rồi bạn?", "");
        assertThat(replyTime).contains("Giờ Việt Nam GMT+7");

        String replyEn = stubClient.generateContent("What time is it and what day is today?", "");
        assertThat(replyEn).contains("Today is");
        assertThat(replyEn).contains("Grand Aurora Luxury Hotel");
    }

    @Test
    @DisplayName("Thời tiết & Du lịch biển: Hỏi thời tiết Đà Nẵng trả lời nhiệt độ mát mẻ và gợi ý hồ bơi vô cực")
    void testStub_WeatherInquiry() {
        String replyWeather = stubClient.generateContent("Thời tiết hôm nay thế nào, Đà Nẵng có mưa không?", "");
        assertThat(replyWeather).contains("bãi biển Mỹ Khê - Đà Nẵng");
        assertThat(replyWeather).contains("25°C - 28°C");
        assertThat(replyWeather).contains("Hồ bơi vô cực trên tầng thượng (Infinity Rooftop Pool)");

        String replyWeatherEn = stubClient.generateContent("How is the weather in Da Nang right now?", "");
        assertThat(replyWeatherEn).contains("My Khe Beach - Da Nang");
        assertThat(replyWeatherEn).contains("Infinity Rooftop Pool");
    }

    @Test
    @DisplayName("Chào hỏi & Nhận diện: Chào hỏi lễ tân trả lời ấm áp, lịch sự")
    void testStub_GreetingAndConciergeIdentity() {
        String replyWho = stubClient.generateContent("Bạn là ai thế?", "");
        assertThat(replyWho).contains("Trợ lý ảo AI Lễ tân của Grand Aurora Luxury Hotel");

        String replyGreeting = stubClient.generateContent("Chào bạn, chúc một ngày tốt lành", "");
        assertThat(replyGreeting).contains("Grand Aurora Luxury Hotel");
    }

    @Test
    @DisplayName("Cẩm nang du lịch: Hỏi di chuyển sân bay và bãi đỗ xe trả lời khoảng cách 6km và đỗ xe miễn phí")
    void testStub_AirportAndParkingInquiry() {
        String replyVi = stubClient.generateContent("Từ sân bay về khách sạn bao xa và có chỗ đỗ xe ô tô không?", "");
        assertThat(replyVi).contains("Sân bay Quốc tế Đà Nẵng");
        assertThat(replyVi).contains("6km");
        assertThat(replyVi).contains("đỗ xe ô tô và xe máy");

        String replyEn = stubClient.generateContent("How far is the hotel from the airport and is there parking?", "");
        assertThat(replyEn).contains("Da Nang International Airport");
        assertThat(replyEn).contains("6km");
        assertThat(replyEn).contains("parking");
    }

    @Test
    @DisplayName("Cẩm nang du lịch: Hỏi hải sản và quán ăn ngon trả lời bãi biển Mỹ Khê và nhà hàng Aurora")
    void testStub_FoodAndDiningInquiry() {
        String replyVi = stubClient.generateContent("Gần khách sạn có quán hải sản nào ngon không?", "");
        assertThat(replyVi).contains("Võ Nguyên Giáp");
        assertThat(replyVi).contains("hải sản tươi sống bãi Mỹ Khê");
        assertThat(replyVi).contains("Nhà hàng Aurora");

        String replyEn = stubClient.generateContent("Are there any good seafood restaurants nearby?", "");
        assertThat(replyEn).contains("My Khe Beach");
        assertThat(replyEn).contains("Aurora Restaurant");
    }

    @Test
    @DisplayName("Cẩm nang du lịch: Hỏi Cầu Rồng phun lửa trả lời 21:00 cuối tuần và khoảng cách Hội An / Bà Nà")
    void testStub_SightseeingInquiry() {
        String replyVi = stubClient.generateContent("Cầu Rồng phun lửa lúc mấy giờ và đi Hội An bao xa?", "");
        assertThat(replyVi).contains("21:00 tối Thứ Bảy và Chủ Nhật");
        assertThat(replyVi).contains("Phố cổ Hội An");

        String replyEn = stubClient.generateContent("When does Dragon Bridge breathe fire?", "");
        assertThat(replyEn).contains("Dragon Bridge");
        assertThat(replyEn).contains("21:00");
    }

    @Test
    @DisplayName("Dịch vụ gia đình: Hỏi nôi em bé, thú cưng hoặc honeymoon trả lời chi tiết và ân cần")
    void testStub_FamilyPetAndHoneymoonInquiry() {
        String replyBaby = stubClient.generateContent("Khách sạn có nôi cho em bé và cho mang thú cưng không?", "");
        assertThat(replyBaby).contains("nôi/cũi em bé miễn phí");
        assertThat(replyBaby).contains("thú cưng");

        String replyEn = stubClient.generateContent("Do you have baby cots and allow pets?", "");
        assertThat(replyEn).contains("baby cots");
        assertThat(replyEn).contains("pets are currently not permitted");
    }

    @Test
    @DisplayName("Thân thiện & Tri ân: Khách cảm ơn hoặc khen ngợi trả lời ấm áp và chúc kỳ nghỉ vui vẻ")
    void testStub_ThanksAndPraise() {
        String replyThanks = stubClient.generateContent("Cảm ơn bạn nhiều nhé, tư vấn rất nhiệt tình!", "");
        assertThat(replyThanks).contains("niềm vinh hạnh to lớn của em và toàn thể đội ngũ Grand Aurora Luxury Hotel");
        assertThat(replyThanks).contains("kỳ nghỉ dưỡng tuyệt vời");

        String replyEn = stubClient.generateContent("Thank you so much, great job!", "");
        assertThat(replyEn).contains("Grand Aurora Luxury Hotel wishes you a wonderful");
    }
}

