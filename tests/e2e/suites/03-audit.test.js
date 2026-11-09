/**
 * =============================================================================
 * HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
 * Task: [SP2-1109-TRUNG]
 * Suite 03: Audit Trail & Admin Log Verification E2E
 * Endpoints:
 *   - GET /api/v1/admin/audit-logs
 *   - GET /api/v1/admin/audit-logs/actions
 * =============================================================================
 */

import { ENDPOINTS } from '../config.js';
import { api, log, testState } from '../utils/api-client.js';

export async function runAuditSuite() {
  log.suite('03 - Kiểm toán & Giám sát Nhật ký Thao tác (Audit Trail Flow)');
  const results = { passed: 0, failed: 0 };

  const assert = (condition, name, detail = '') => {
    if (condition) {
      log.pass(name, detail);
      results.passed++;
    } else {
      log.fail(name, detail);
      results.failed++;
    }
  };

  // 1. Kiểm tra bảo vệ phân quyền: Khách hàng thường truy cập Audit bị chặn 403 Forbidden
  try {
    const forbiddenRes = await api.get(ENDPOINTS.AUDIT_LOGS, {
      'Authorization': `Bearer ${testState.customerToken}`
    });
    assert(forbiddenRes.status === 403, 'Bảo mật endpoint Audit: Chặn quyền Customer (HTTP 403 Forbidden)', `HTTP ${forbiddenRes.status}`);
  } catch (err) {
    assert(false, 'Bảo mật endpoint Audit: Chặn quyền Customer', err.message);
  }

  // 2. Tra cứu danh mục hành động kiểm toán (Audit Actions dropdown)
  try {
    const actionsRes = await api.get(ENDPOINTS.AUDIT_ACTIONS, {
      'Authorization': `Bearer ${testState.adminToken}`
    });
    const hasActions = actionsRes.status === 200 && Array.isArray(actionsRes.data?.data);
    assert(hasActions, 'Tra cứu danh mục hành động kiểm toán (GET /actions)', `Số danh mục: ${actionsRes.data?.data?.length || 0}`);
  } catch (err) {
    assert(false, 'Tra cứu danh mục hành động kiểm toán', err.message);
  }

  // 3. Tra cứu danh sách nhật ký thao tác với quyền Admin
  try {
    const auditRes = await api.get(`${ENDPOINTS.AUDIT_LOGS}?page=0&size=20`, {
      'Authorization': `Bearer ${testState.adminToken}`
    });

    const isAuditValid = auditRes.status === 200 && Array.isArray(auditRes.data?.data?.content || auditRes.data?.data);
    const logs = auditRes.data?.data?.content || auditRes.data?.data || [];
    assert(isAuditValid, 'Quản trị viên tra cứu danh sách Audit Log thành công (GET /audit-logs)', `Tìm thấy ${logs.length} bản ghi`);

    // 4. Xác minh sự tồn tại của log hành động CREATE_BOOKING
    const hasBookingAudit = logs.some(l => 
      l.action === 'CREATE_BOOKING' || 
      l.targetType === 'BOOKING' ||
      (l.description && l.description.includes('đặt phòng'))
    );
    assert(hasBookingAudit, 'Xác minh vết kiểm toán (Audit Trail) cho thao tác đặt phòng', `Có log CREATE_BOOKING: ${hasBookingAudit}`);
  } catch (err) {
    assert(false, 'Quản trị viên tra cứu danh sách Audit Log', err.message);
  }

  return results;
}

