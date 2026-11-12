/**
 * =============================================================================
 * HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
 * Task: [SP3-1112-TRUNG]
 * Suite 09: Luồng Quản Trị & Truy Vết (Admin Dashboard KPI & Full Audit Trail)
 * =============================================================================
 */

import { CHECK_KNOWN_BUGS, ENDPOINTS } from '../config.js';
import { api, createSuiteTracker, dateOffsetISO, log, testState } from '../utils/api-client.js';

export async function runDashboardAuditSuite() {
  log.suite('09 - Quản Trị & Truy Vết: Dashboard KPI Consistency & Full Audit Trail');
  const { results, assert } = createSuiteTracker();

  const adminHeaders = { Authorization: `Bearer ${testState.adminToken}` };
  const custHeaders = { Authorization: `Bearer ${testState.customerToken}` };

  const now = new Date();
  const year = now.getFullYear();
  const monthStart = new Date(year, now.getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = new Date(year, now.getMonth() + 1, 0).toISOString().split('T')[0];
  const today = dateOffsetISO(0);

  // 1. Bảo mật RBAC trên Dashboard Summary: Customer bị chặn 403
  try {
    const rbacRes = await api.get(
      `${ENDPOINTS.ADMIN_DASHBOARD_SUMMARY}?dateFrom=${monthStart}&dateTo=${monthEnd}`,
      custHeaders
    );
    assert(
      rbacRes.status === 403,
      'Bảo mật endpoint Dashboard Admin: Chặn quyền Customer (HTTP 403 Forbidden)',
      `HTTP ${rbacRes.status}`
    );
  } catch (err) {
    assert(false, 'Bảo mật endpoint Dashboard Admin: Chặn quyền Customer', err.message);
  }

  // 2. Xác minh KPI Dashboard Summary khớp với dòng tiền & trạng thái buồng phòng thực tế
  try {
    const sumRes = await api.get(
      `${ENDPOINTS.ADMIN_DASHBOARD_SUMMARY}?dateFrom=${monthStart}&dateTo=${monthEnd}`,
      adminHeaders
    );
    const summary = sumRes.data?.data || {};

    const totalPaid = Number(summary.totalPaid || 0);
    const refundTotal = Number(summary.refundTotal || 0);
    const netCashFlow = Number(summary.netCashFlow || 0);
    const maintenanceCount = Number(summary.roomCounts?.MAINTENANCE || 0);
    const series = summary.revenueSeries || [];
    const seriesNetSum = series.reduce((acc, p) => acc + Number(p.netCashFlow || 0), 0);

    if (Math.abs(seriesNetSum - netCashFlow) > 1) {
      testState.knownBugFindings.push({
        bugId: 'BUG-SP3-02',
        detail: `Dashboard revenueSeries sum(netCashFlow)=${seriesNetSum} không khớp summary.netCashFlow=${netCashFlow} do dayInflow không loại trừ REFUND transaction trong DashboardService.java:259-263`,
        todayPoint: series.find((p) => p.date === today) || null,
      });
      if (CHECK_KNOWN_BUGS) {
        log.warn('BUG-SP3-02 reproduced', `seriesNetSum=${seriesNetSum} != summary.netCashFlow=${netCashFlow}`);
      }
    }

    assert(
      sumRes.status === 200 &&
        Number(summary.totalRooms) >= Number(summary.activeRooms) &&
        Number(summary.activeRooms) > 0 &&
        totalPaid > 0 &&
        refundTotal > 0 &&
        Math.abs(netCashFlow - (totalPaid - refundTotal)) < 0.01 &&
        maintenanceCount >= 1 &&
        series.length > 0,
      'Xác minh KPI Admin Dashboard Summary khớp dòng tiền (totalPaid - refundTotal = netCashFlow) & cơ cấu phòng',
      `totalPaid=${totalPaid}, refundTotal=${refundTotal}, netCashFlow=${netCashFlow}, rooms=${summary.activeRooms}/${summary.totalRooms}, seriesPoints=${series.length}`
    );
  } catch (err) {
    assert(false, 'Xác minh KPI Admin Dashboard Summary', err.message);
  }

  // 3. Xác minh API Doanh thu 12 tháng & phân bổ theo loại phòng
  try {
    const monthlyRes = await api.get(`${ENDPOINTS.ADMIN_DASHBOARD_MONTHLY}?year=${year}`, adminHeaders);
    const mData = monthlyRes.data?.data || {};
    assert(
      monthlyRes.status === 200 &&
        Array.isArray(mData.monthly) &&
        mData.monthly.length === 12 &&
        Array.isArray(mData.roomTypes),
      'Tra cứu biểu đồ doanh thu 12 tháng & cơ cấu loại phòng (GET /monthly-revenue)',
      `year=${year}, months=${mData.monthly?.length || 0}, roomTypes=${mData.roomTypes?.length || 0}`
    );
  } catch (err) {
    assert(false, 'Tra cứu biểu đồ doanh thu 12 tháng', err.message);
  }

  // 4. Xác minh Audit Trail ghi nhận ĐẦY ĐỦ chuỗi hành động nghiệp vụ Sprint 2 + Sprint 3
  try {
    const auditRes = await api.get(`${ENDPOINTS.AUDIT_LOGS}?page=0&size=100`, adminHeaders);
    const logs = auditRes.data?.data?.content || auditRes.data?.data || [];
    const observedActions = new Set(logs.map((item) => item.action));

    const requiredActions = [
      'CREATE_BOOKING',
      'CONFIRM_BOOKING',
      'CHECK_IN_ASSIGN_ROOM',
      'CHECK_OUT_SETTLEMENT',
      'CHANGE_ROOM_STATUS',
      'CANCEL_BOOKING',
      'CONFIRM_REFUND',
    ];
    const missingActions = requiredActions.filter((act) => !observedActions.has(act));

    assert(
      auditRes.status === 200 && missingActions.length === 0,
      'Xác minh chuỗi Audit Trail ghi nhận đầy đủ 7 loại sự kiện nghiệp vụ toàn trình',
      missingActions.length === 0
        ? `Đã xác minh đủ ${requiredActions.length}/7 actions (${logs.length} logs)`
        : `Thiếu actions: ${missingActions.join(', ')}`
    );
  } catch (err) {
    assert(false, 'Xác minh chuỗi Audit Trail đầy đủ', err.message);
  }

  return results;
}
