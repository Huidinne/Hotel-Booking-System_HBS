/**
 * =============================================================================
 * HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
 * Task: [SP2-1109-TRUNG]
 * File: tests/e2e/utils/api-client.js
 * Purpose: HTTP Client & Test Assertion Helper phục vụ kiểm thử E2E không phụ thuộc
 * =============================================================================
 */

import { TIMEOUT_MS } from '../config.js';

// Shared state chia sẻ giữa các test suite
export const testState = {
  customerToken: null,
  customerEmail: null,
  adminToken: null,
  createdBookingId: null,
  createdBookingCode: null,
  sessionId: `e2e-session-${Date.now()}`
};

export class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async request(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const headers = {
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const status = response.status;
      const contentType = response.headers.get('content-type') || '';
      let data = null;

      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          data = null;
        }
      } else {
        data = await response.text();
      }

      return { status, data, headers: response.headers, ok: response.ok };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  get(url, headers = {}) {
    return this.request(url, { method: 'GET', headers });
  }

  post(url, body, headers = {}) {
    return this.request(url, { method: 'POST', body, headers });
  }

  put(url, body, headers = {}) {
    return this.request(url, { method: 'PUT', body, headers });
  }

  delete(url, headers = {}) {
    return this.request(url, { method: 'DELETE', headers });
  }
}

export const api = new ApiClient();

// Logger định dạng màu terminal
export const log = {
  header: (msg) => console.log(`\n\x1b[1m\x1b[36m=== ${msg} ===\x1b[0m`),
  suite: (msg) => console.log(`\x1b[1m\x1b[34m[SUITE] ${msg}\x1b[0m`),
  pass: (name, detail = '') => console.log(`  \x1b[32m✔ PASS\x1b[0m: ${name} ${detail ? `\x1b[90m(${detail})\x1b[0m` : ''}`),
  fail: (name, reason = '') => console.log(`  \x1b[31m✖ FAIL\x1b[0m: ${name} \x1b[33m${reason}\x1b[0m`),
  info: (msg) => console.log(`  \x1b[90mℹ ${msg}\x1b[0m`),
};

