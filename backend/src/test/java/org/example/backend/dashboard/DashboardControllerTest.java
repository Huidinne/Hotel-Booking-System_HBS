package org.example.backend.dashboard;

import org.example.backend.dashboard.controller.DashboardController;
import org.example.backend.dashboard.dto.DashboardMonthlyAnalyticsResponse;
import org.example.backend.dashboard.dto.DashboardMonthlyRevenuePoint;
import org.example.backend.dashboard.dto.DashboardRoomTypeRevenue;
import org.example.backend.dashboard.dto.DashboardSummaryResponse;
import org.example.backend.dashboard.service.DashboardService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DashboardService dashboardService;

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Admin gọi GET /api/v1/admin/dashboard/summary → HTTP 200 OK kèm đầy đủ chỉ số")
    void testGetSummary_AsAdmin_Success() throws Exception {
        DashboardSummaryResponse mockResponse = DashboardSummaryResponse.builder()
                .dateFrom(LocalDate.of(2026, 11, 1))
                .dateTo(LocalDate.of(2026, 11, 30))
                .roomRevenue(BigDecimal.valueOf(28500000))
                .netCashFlow(BigDecimal.valueOf(24200000))
                .expectedRevenue(BigDecimal.valueOf(35000000))
                .actualRevenue(BigDecimal.valueOf(24200000))
                .adr(BigDecimal.valueOf(950000))
                .revpar(BigDecimal.valueOf(380000))
                .occupancyRate(0.40)
                .soldRoomNights(30L)
                .totalAvailableRoomNights(75L)
                .roomCounts(Map.of("AVAILABLE", 5, "OCCUPIED", 3))
                .revenueSeries(Collections.emptyList())
                .build();

        when(dashboardService.getSummary(any(), any())).thenReturn(mockResponse);

        mockMvc.perform(get("/api/v1/admin/dashboard/summary")
                        .param("dateFrom", "2026-11-01")
                        .param("dateTo", "2026-11-30")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.roomRevenue").value(28500000))
                .andExpect(jsonPath("$.data.netCashFlow").value(24200000))
                .andExpect(jsonPath("$.data.adr").value(950000))
                .andExpect(jsonPath("$.data.revpar").value(380000))
                .andExpect(jsonPath("$.data.occupancyRate").value(0.40));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    @DisplayName("Customer gọi GET /api/v1/admin/dashboard/summary → HTTP 403 Forbidden")
    void testGetSummary_AsCustomer_Forbidden() throws Exception {
        mockMvc.perform(get("/api/v1/admin/dashboard/summary"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Chưa đăng nhập gọi GET /api/v1/admin/dashboard/summary → HTTP 401 Unauthorized")
    void testGetSummary_Unauthenticated_Denied() throws Exception {
        mockMvc.perform(get("/api/v1/admin/dashboard/summary"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Admin gọi GET /api/v1/admin/dashboard/monthly-revenue → HTTP 200 OK kèm mảng monthly 12 tháng")
    void testGetMonthlyRevenue_AsAdmin_Success() throws Exception {
        DashboardMonthlyRevenuePoint m1 = DashboardMonthlyRevenuePoint.builder()
                .month("Tháng 01/2026")
                .monthKey("2026-01")
                .monthIndex(1)
                .year(2026)
                .revenue(BigDecimal.valueOf(45000000))
                .roomRevenue(BigDecimal.valueOf(45000000))
                .netCashFlow(BigDecimal.valueOf(42000000))
                .soldRoomNights(45L)
                .availableRoomNights(90L)
                .adr(BigDecimal.valueOf(1000000))
                .revpar(BigDecimal.valueOf(500000))
                .occupancyRate(0.50)
                .build();

        DashboardRoomTypeRevenue rt1 = DashboardRoomTypeRevenue.builder()
                .roomTypeId(2L)
                .roomTypeName("Deluxe Double Room")
                .roomRevenue(BigDecimal.valueOf(410000000))
                .revenue(BigDecimal.valueOf(410000000))
                .percentage(46.51)
                .revenueShare(0.4651)
                .soldRoomNights(400L)
                .build();

        DashboardMonthlyAnalyticsResponse mockAnalytics = DashboardMonthlyAnalyticsResponse.builder()
                .year(2026)
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .totalRevenue(BigDecimal.valueOf(904000000))
                .totalRoomRevenue(BigDecimal.valueOf(904000000))
                .totalNetCashFlow(BigDecimal.valueOf(880000000))
                .averageAdr(BigDecimal.valueOf(950000))
                .averageRevpar(BigDecimal.valueOf(450000))
                .averageOccupancyRate(0.47)
                .monthly(java.util.List.of(m1))
                .roomTypes(java.util.List.of(rt1))
                .build();

        when(dashboardService.getMonthlyAnalytics(any(), any(), any())).thenReturn(mockAnalytics);

        mockMvc.perform(get("/api/v1/admin/dashboard/monthly-revenue")
                        .param("year", "2026")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.year").value(2026))
                .andExpect(jsonPath("$.data.monthly[0].month").value("Tháng 01/2026"))
                .andExpect(jsonPath("$.data.monthly[0].revenue").value(45000000))
                .andExpect(jsonPath("$.data.monthly[0].adr").value(1000000))
                .andExpect(jsonPath("$.data.monthly[0].revpar").value(500000))
                .andExpect(jsonPath("$.data.roomTypes[0].roomTypeName").value("Deluxe Double Room"))
                .andExpect(jsonPath("$.data.roomTypes[0].percentage").value(46.51));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    @DisplayName("Customer gọi GET /api/v1/admin/dashboard/monthly-revenue → HTTP 403 Forbidden")
    void testGetMonthlyRevenue_AsCustomer_Forbidden() throws Exception {
        mockMvc.perform(get("/api/v1/admin/dashboard/monthly-revenue"))
                .andExpect(status().isForbidden());
    }
}

