package org.example.backend.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryResponse {
    private LocalDate dateFrom;
    private LocalDate dateTo;
    private BigDecimal expectedRevenue;
    private BigDecimal actualRevenue;
    private BigDecimal refundTotal;
    private Double occupancyRate;
    private Map<String, Integer> roomCounts;
}
