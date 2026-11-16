package org.example.backend.roomservice.repository;

import org.example.backend.roomservice.entity.ServiceItem;
import org.example.backend.roomservice.entity.ServiceItemCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ServiceItemRepository extends JpaRepository<ServiceItem, Long> {

    @Query("SELECT s FROM ServiceItem s WHERE s.isActive = true " +
           "AND (:category IS NULL OR s.category = :category) " +
           "AND (:keyword IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<ServiceItem> findActiveItems(
            @Param("category") ServiceItemCategory category,
            @Param("keyword") String keyword,
            Pageable pageable);

    @Query("SELECT s FROM ServiceItem s WHERE " +
           "(:category IS NULL OR s.category = :category) " +
           "AND (:keyword IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:isActive IS NULL OR s.isActive = :isActive)")
    Page<ServiceItem> findAllAdmin(
            @Param("category") ServiceItemCategory category,
            @Param("keyword") String keyword,
            @Param("isActive") Boolean isActive,
            Pageable pageable);

    Optional<ServiceItem> findByNameIgnoreCase(String name);
}
