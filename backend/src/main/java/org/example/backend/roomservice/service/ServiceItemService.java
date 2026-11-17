package org.example.backend.roomservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.common.exception.AppException;
import org.example.backend.roomservice.dto.ServiceItemRequest;
import org.example.backend.roomservice.dto.ServiceItemResponse;
import org.example.backend.roomservice.entity.ServiceItem;
import org.example.backend.roomservice.entity.ServiceItemCategory;
import org.example.backend.roomservice.repository.ServiceItemRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ServiceItemService {

    private final ServiceItemRepository serviceItemRepository;

    @Transactional(readOnly = true)
    public Page<ServiceItemResponse> getActiveItems(ServiceItemCategory category, String keyword, Pageable pageable) {
        return serviceItemRepository.findActiveItems(category, keyword, pageable)
                .map(ServiceItemResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<ServiceItemResponse> getAllAdmin(ServiceItemCategory category, String keyword, Boolean isActive, Pageable pageable) {
        return serviceItemRepository.findAllAdmin(category, keyword, isActive, pageable)
                .map(ServiceItemResponse::from);
    }

    @Transactional(readOnly = true)
    public ServiceItemResponse getById(Long id) {
        ServiceItem item = serviceItemRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy món với ID: " + id));
        return ServiceItemResponse.from(item);
    }

    @Transactional
    public ServiceItemResponse createServiceItem(ServiceItemRequest request) {
        serviceItemRepository.findByNameIgnoreCase(request.getName().trim()).ifPresent(existing -> {
            throw new AppException(HttpStatus.CONFLICT, "Món với tên '" + request.getName() + "' đã tồn tại");
        });

        ServiceItem item = ServiceItem.builder()
                .name(request.getName().trim())
                .category(request.getCategory())
                .unit(request.getUnit().trim())
                .price(request.getPrice())
                .imageUrl(request.getImageUrl())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .version(0L)
                .build();

        ServiceItem saved = serviceItemRepository.save(item);
        log.info("[ServiceItem] Created item: id={}, name={}, price={}", saved.getId(), saved.getName(), saved.getPrice());
        return ServiceItemResponse.from(saved);
    }

    @Transactional
    public ServiceItemResponse updateServiceItem(Long id, ServiceItemRequest request) {
        ServiceItem item = serviceItemRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy món với ID: " + id));

        // Optimistic locking check
        if (request.getVersion() != null && !request.getVersion().equals(item.getVersion())) {
            throw new AppException(HttpStatus.CONFLICT, "Dữ liệu món ăn đã bị thay đổi bởi người khác (version mismatch). Vui lòng tải lại.");
        }

        // Tên mới không trùng món khác
        serviceItemRepository.findByNameIgnoreCase(request.getName().trim()).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new AppException(HttpStatus.CONFLICT, "Tên món '" + request.getName() + "' đã được sử dụng bởi món khác");
            }
        });

        item.setName(request.getName().trim());
        item.setCategory(request.getCategory());
        item.setUnit(request.getUnit().trim());
        item.setPrice(request.getPrice());
        if (request.getImageUrl() != null) {
            item.setImageUrl(request.getImageUrl());
        }
        if (request.getIsActive() != null) {
            item.setIsActive(request.getIsActive());
        }

        ServiceItem updated = serviceItemRepository.save(item);
        log.info("[ServiceItem] Updated item: id={}, name={}, price={}, isActive={}, version={}",
                updated.getId(), updated.getName(), updated.getPrice(), updated.getIsActive(), updated.getVersion());
        return ServiceItemResponse.from(updated);
    }
}
