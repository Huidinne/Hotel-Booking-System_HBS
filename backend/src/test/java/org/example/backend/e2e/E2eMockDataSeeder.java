package org.example.backend.e2e;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.room.entity.Room;
import org.example.backend.room.entity.RoomStatus;
import org.example.backend.room.entity.RoomType;
import org.example.backend.room.repository.RoomRepository;
import org.example.backend.room.repository.RoomTypeRepository;
import org.example.backend.user.entity.Role;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Seeder dữ liệu chuẩn cho profile {@code e2e-mock} (chạy H2 in-memory phục vụ bộ kiểm thử E2E / CI).
 * Chỉ kích hoạt khi bật spring.profiles.active=e2e-mock.
 */
@Slf4j
@Component
@Profile("e2e-mock")
@RequiredArgsConstructor
public class E2eMockDataSeeder implements CommandLineRunner {

    private static final String DEFAULT_DEMO_PASSWORD = "Password@123";

    private final UserRepository userRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomRepository roomRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0 || roomTypeRepository.count() > 0) {
            log.info("[E2eMockDataSeeder] Database đã có dữ liệu, bỏ qua bước seed.");
            return;
        }

        String encodedPassword = passwordEncoder.encode(DEFAULT_DEMO_PASSWORD);
        userRepository.saveAll(List.of(
                User.builder()
                        .email("admin@hotel.com")
                        .password(encodedPassword)
                        .fullName("Quản Trị Viên")
                        .phone("0901234567")
                        .role(Role.ROLE_ADMIN)
                        .isActive(true)
                        .build(),
                User.builder()
                        .email("receptionist@hotel.com")
                        .password(encodedPassword)
                        .fullName("Lễ Tân Khách Sạn")
                        .phone("0912345678")
                        .role(Role.ROLE_RECEPTIONIST)
                        .isActive(true)
                        .build(),
                User.builder()
                        .email("customer@gmail.com")
                        .password(encodedPassword)
                        .fullName("Nguyễn Văn Khách")
                        .phone("0987654321")
                        .role(Role.ROLE_CUSTOMER)
                        .isActive(true)
                        .build()
        ));

        RoomType standardSingle = roomTypeRepository.save(RoomType.builder()
                .name("Standard Single Room")
                .capacity(1)
                .basePrice(new BigDecimal("500000.00"))
                .description("Phòng tiêu chuẩn 1 giường đơn, máy lạnh, wifi tốc độ cao, nước nóng lạnh.")
                .amenities("WiFi, Máy lạnh, Nước nóng lạnh")
                .isActive(true)
                .build());

        RoomType deluxeDouble = roomTypeRepository.save(RoomType.builder()
                .name("Deluxe Double Room")
                .capacity(2)
                .basePrice(new BigDecimal("950000.00"))
                .description("Phòng Deluxe 1 giường đôi lớn, ban công hướng phố thoáng mát, bàn làm việc cao cấp.")
                .amenities("WiFi, Ban công hướng phố, Bàn làm việc, Smart TV")
                .isActive(true)
                .build());

        RoomType suiteLuxury = roomTypeRepository.save(RoomType.builder()
                .name("Executive Suite Luxury")
                .capacity(4)
                .basePrice(new BigDecimal("1800000.00"))
                .description("Căn hộ Suite sang trọng 2 phòng ngủ, bồn tắm nằm cao cấp, tầm nhìn toàn cảnh thành phố.")
                .amenities("WiFi, Bồn tắm nằm, Tầm nhìn toàn cảnh, Phòng khách riêng, Minibar")
                .isActive(true)
                .build());

        roomRepository.saveAll(List.of(
                Room.builder().roomNumber("101").roomType(standardSingle).floor(1).status(RoomStatus.AVAILABLE).build(),
                Room.builder().roomNumber("102").roomType(standardSingle).floor(1).status(RoomStatus.AVAILABLE).build(),
                Room.builder().roomNumber("103").roomType(standardSingle).floor(1).status(RoomStatus.AVAILABLE).build(),
                Room.builder().roomNumber("201").roomType(deluxeDouble).floor(2).status(RoomStatus.AVAILABLE).build(),
                Room.builder().roomNumber("202").roomType(deluxeDouble).floor(2).status(RoomStatus.AVAILABLE).build(),
                Room.builder().roomNumber("203").roomType(deluxeDouble).floor(2).status(RoomStatus.AVAILABLE).build(),
                Room.builder().roomNumber("204").roomType(deluxeDouble).floor(2).status(RoomStatus.AVAILABLE).build(),
                Room.builder().roomNumber("301").roomType(suiteLuxury).floor(3).status(RoomStatus.AVAILABLE).build(),
                Room.builder().roomNumber("302").roomType(suiteLuxury).floor(3).status(RoomStatus.AVAILABLE).build(),
                Room.builder().roomNumber("303").roomType(suiteLuxury).floor(3).status(RoomStatus.MAINTENANCE).build()
        ));

        log.info("[E2eMockDataSeeder] Đã khởi tạo dữ liệu mẫu E2E thành công: 3 users, 3 room types, 10 rooms.");
    }
}

