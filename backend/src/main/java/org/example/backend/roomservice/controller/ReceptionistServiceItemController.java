package org.example.backend.roomservice.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.common.response.ApiResponse;
import org.example.backend.common.response.PageResponse;
import org.example.backend.roomservice.dto.ServiceItemResponse;
import org.example.backend.roomservice.entity.ServiceItemCategory;
import org.example.backend.roomservice.service.ServiceItemService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Controller cho Lễ tân/Admin xem danh mục món đang mở bán (SRS Chapter 12: /api/v1/receptionist/service-items).
 */
@RestController
@RequestMapping("/api/v1/receptionist/service-items")
@PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN')")
@RequiredArgsConstructor
public class ReceptionistServiceItemController {

    private final ServiceItemService serviceItemService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ServiceItemResponse>>> getActiveItems(
            @RequestParam(required = false) ServiceItemCategory category,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "name,asc") String[] sort) {

        Sort sortObj = Sort.by(Sort.Direction.ASC, "name");
        if (sort.length >= 2) {
            sortObj = Sort.by(Sort.Direction.fromString(sort[1]), sort[0]);
        }
        Pageable pageable = PageRequest.of(page, size, sortObj);

        Page<ServiceItemResponse> result = serviceItemService.getActiveItems(category, keyword, pageable);
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(result)));
    }
}
