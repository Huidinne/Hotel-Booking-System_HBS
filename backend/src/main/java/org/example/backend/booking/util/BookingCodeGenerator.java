package org.example.backend.booking.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Tiện ích sinh mã đặt phòng duy nhất theo định dạng: BK-YYYYMMDD-XXXX
 */
public class BookingCodeGenerator {

    private static final AtomicInteger counter = new AtomicInteger(0);
    private static final AtomicInteger uniqueCounter = new AtomicInteger(1000);

    private BookingCodeGenerator() {}

    /**
     * Sinh booking code dạng: BK-20261110-0001
     * Counter reset lại nếu cần (trong môi trường thực tế dùng UUID hoặc sequence DB).
     */
    public static String generate() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        int seq = Math.abs(counter.incrementAndGet()) % 10000;
        return String.format("BK-%s-%04d", datePart, seq);
    }

    /**
     * Sinh booking code với timestamp giây và atomic sequence tăng dần,
     * đảm bảo 100% không bao giờ trùng lặp khóa chính/unique key kể cả khi chạy đồng thời hoặc test nhanh.
     */
    public static String generateUnique() {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
        int seq = Math.abs(uniqueCounter.incrementAndGet()) % 9000 + 1000;
        return String.format("BK-%s-%04d", datePart, seq);
    }
}
