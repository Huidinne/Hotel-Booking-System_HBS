package org.example.backend.roomservice.repository;

import org.example.backend.roomservice.entity.RoomServiceOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomServiceOrderItemRepository extends JpaRepository<RoomServiceOrderItem, Long> {
    List<RoomServiceOrderItem> findByOrderId(Long orderId);
}
