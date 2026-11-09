/**
 * =============================================================================
 * HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
 * Task: [SP2-1109-TRUNG]
 * Suite 01: Authentication & Session Verification E2E
 * Endpoints:
 *   - POST /api/v1/auth/register
 *   - POST /api/v1/auth/login
 *   - GET  /api/v1/auth/me
 * =============================================================================
 */

import { ENDPOINTS } from '../config.js';
import { api, log, testState } from '../utils/api-client.js';
import testData from '../fixtures/test-data.json' with { type: 'json' };

export async function runAuthSuite() {
  log.suite('01 - Xác thực & Quản lý Phiên làm việc (Auth & Session Flow)');
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

  // 1. Đăng ký tài khoản Customer mới
  const timestamp = Date.now();
  const registerPayload = {
    email: `e2e_cust_${timestamp}@hotel.com`,
    password: 'Password@123',
    fullName: `E2E Test Customer ${timestamp.toString().slice(-4)}`,
    phone: `0987${timestamp.toString().slice(-6)}`
  };

  try {
    const regRes = await api.post(ENDPOINTS.REGISTER, registerPayload);
    const regSuccess = regRes.status === 201 && regRes.data?.data?.accessToken;
    assert(regSuccess, 'Đăng ký tài khoản Customer mới', `HTTP ${regRes.status}`);

    if (regSuccess) {
      testState.customerToken = regRes.data.data.accessToken;
      testState.customerEmail = registerPayload.email;
    }
  } catch (err) {
    assert(false, 'Đăng ký tài khoản Customer mới', err.message);
  }

  // 2. Đăng nhập tài khoản vừa tạo (hoặc tài khoản mẫu)
  const loginPayload = {
    email: testState.customerEmail || testData.users.customer.email,
    password: testData.users.customer.password
  };

  try {
    const loginRes = await api.post(ENDPOINTS.LOGIN, loginPayload);
    const loginSuccess = loginRes.status === 200 && loginRes.data?.data?.accessToken;
    assert(loginSuccess, 'Đăng nhập người dùng và cấp JWT Bearer Token', `HTTP ${loginRes.status}`);

    if (loginSuccess) {
      testState.customerToken = loginRes.data.data.accessToken;
    }
  } catch (err) {
    assert(false, 'Đăng nhập người dùng và cấp JWT Bearer Token', err.message);
  }

  // 3. Kiểm tra thông tin phiên làm việc GET /auth/me
  try {
    const meRes = await api.get(ENDPOINTS.ME, {
      'Authorization': `Bearer ${testState.customerToken}`
    });
    const meSuccess = meRes.status === 200 && meRes.data?.data?.email;
    assert(meSuccess, 'Xác thực phiên làm việc hợp lệ (GET /api/v1/auth/me)', `Email: ${meRes.data?.data?.email || 'N/A'}`);
  } catch (err) {
    assert(false, 'Xác thực phiên làm việc hợp lệ (GET /api/v1/auth/me)', err.message);
  }

  // 4. Đăng nhập tài khoản Quản trị viên (Admin) phục vụ kiểm tra Audit
  try {
    const adminRes = await api.post(ENDPOINTS.LOGIN, {
      email: testData.users.admin.email,
      password: testData.users.admin.password
    });
    const adminSuccess = adminRes.status === 200 && adminRes.data?.data?.accessToken;
    assert(adminSuccess, 'Đăng nhập tài khoản Quản trị viên (Admin Login)', `HTTP ${adminRes.status}`);

    if (adminSuccess) {
      testState.adminToken = adminRes.data.data.accessToken;
    }
  } catch (err) {
    assert(false, 'Đăng nhập tài khoản Quản trị viên (Admin Login)', err.message);
  }

  return results;
}

