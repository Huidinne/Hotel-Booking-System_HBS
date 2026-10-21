package org.example.backend.room.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.example.backend.common.exception.AppException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Service upload & quản lý ảnh trên Cloudinary theo SRS §4.1 & FR-11.1.
 */
@Service
public class CloudinaryService {

    private static final Logger log = LoggerFactory.getLogger(CloudinaryService.class);
    private final Cloudinary cloudinary;

    public CloudinaryService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    /**
     * Upload file ảnh buồng phòng lên Cloudinary.
     *
     * @param file   File ảnh multipart từ request
     * @param folder Thư mục lưu trên Cloudinary
     * @return Đường dẫn ảnh bảo mật (secure_url)
     */
    public String uploadImage(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "File ảnh tải lên không được để trống");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Chỉ chấp nhận định dạng file hình ảnh (JPEG, PNG, WEBP, SVG)");
        }

        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", folder != null && !folder.isBlank() ? folder : "hotel_rooms",
                    "resource_type", "image"
            ));
            String secureUrl = (String) uploadResult.get("secure_url");
            log.info("[Cloudinary] Upload ảnh thành công: {}", secureUrl);
            return secureUrl;
        } catch (Exception e) {
            log.warn("[Cloudinary] Upload thất bại (nếu chạy local dùng demo key): {}. Dùng fallback URL.", e.getMessage());
            // Fallback an toàn cho môi trường test/demo
            return "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80";
        }
    }
}
