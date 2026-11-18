package org.example.backend.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO thống kê tổng quan tài khoản cho màn hình Admin Users.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserStatsResponse {
    private long totalUsers;
    private long activeUsers;
    private long lockedUsers;
    private long adminCount;
    private long receptionistCount;
    private long customerCount;
}
