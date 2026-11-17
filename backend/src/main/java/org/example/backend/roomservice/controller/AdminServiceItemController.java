package org.example.backend.roomservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.common.response.ApiResponse;
import org.example.backend.common.response.PageResponse;
import org.example.backend.roomservice.dto.ServiceItemRequest;
import org.example.backend.roomservice.dto.ServiceItemResponse;
import org.example.backend.roomservice.entity.ServiceItemCategory;
import org.example.backend.roomservice.service.ServiceItemService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Controller cho Admin quản lý danh mục món ăn / đồ uống (SRS Chapter 12: /api/v1/admin/service-items).
 */
@RestController
@RequestMapping("/api/v1/admin/service-items")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminServiceItemController {

    private final ServiceItemService serviceItemService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ServiceItemResponse>>> getAllAdmin(
            @RequestParam(required = false) ServiceItemCategory category,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id,desc") String[] sort) {

        Sort sortObj = Sort.by(Sort.Direction.DESC, "id");
        if (sort.length >= 2) {
            sortObj = Sort.by(Sort.Direction.fromString(sort[1]), sort[0]);
        }
        Pageable pageable = PageRequest.of(page, size, sortObj);

        Page<ServiceItemResponse> result = serviceItemService.getAllAdmin(category, keyword, isActive, pageable);
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(result)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ServiceItemResponse>> getById(@PathVariable Long id) {
        ServiceItemResponse response = serviceItemService.getById(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ServiceItemResponse>> create(
            @Valid @RequestBody ServiceItemRequest request) {
        ServiceItemResponse response = serviceItemService.createServiceItem(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Thêm món mới thành công", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ServiceItemResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody ServiceItemRequest request) {
        ServiceItemResponse response = serviceItemService.updateServiceItem(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật thông tin món thành công", response));
    }
}
