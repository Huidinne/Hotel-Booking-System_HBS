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

    private BookingCodeGenerator() {}

    /**
     * Sinh booking code dạng: BK-20261110-0001
     * Counter reset lại nếu cần (trong môi trường thực tế dùng UUID hoặc sequence DB).
     */
    public static String generate() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        int seq = counter.incrementAndGet() % 10000;
        return String.format("BK-%s-%04d", datePart, seq);
    }

    /**
     * Sinh booking code với timestamp nano-second để đảm bảo unique hơn trong load cao.
     */
    public static String generateUnique() {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
        long nano = System.nanoTime() % 10000;
        return String.format("BK-%s-%04d", datePart, nano);
    }
}
