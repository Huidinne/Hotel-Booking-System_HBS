/**
 * =============================================================================
 * HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
 * Task: [SP2-1109-TRUNG], [SP3-1112-TRUNG]
 * File: tests/e2e/utils/api-client.js
 * Purpose: HTTP client wrapper (JSON + PDF binary), state store & test reporter
 * =============================================================================
 */

import { TIMEOUT_MS } from '../config.js';

export const testState = {
  customerToken: null,
  customerEmail: null,
  seededCustomerToken: null,
  adminToken: null,
  receptionistToken: null,
  createdBookingCode: null,
  createdBookingId: null,
  fullFlowBookingCode: null,
  fullFlowBookingId: null,
  fullFlowPaymentUrl: null,
  checkInBookingId: null,
  checkInBookingCode: null,
  checkInRoomIds: [],
  refundBookingId: null,
  refundBookingCode: null,
  sessionId: `e2e-session-${Date.now()}`,
  knownBugFindings: [],
};

export const log = {
  info: (msg) => console.log(`[INFO]  ${msg}`),
  pass: (testName, detail = '') => console.log(`  \x1b[32mPASS\x1b[0m  ${testName}${detail ? ` (${detail})` : ''}`),
  fail: (testName, detail = '') => console.error(`  \x1b[31mFAIL\x1b[0m  ${testName}${detail ? ` -> ${detail}` : ''}`),
  skip: (testName, detail = '') => console.log(`  \x1b[33mSKIP\x1b[0m  ${testName}${detail ? ` (${detail})` : ''}`),
  warn: (testName, detail = '') => console.warn(`  \x1b[35mWARN\x1b[0m  ${testName}${detail ? ` -> ${detail}` : ''}`),
  suite: (suiteName) => console.log(`\n\x1b[36m=== [SUITE] ${suiteName} ===\x1b[0m`),
};

export function createSuiteTracker() {
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    mandatoryPassed: 0,
    mandatoryFailed: 0,
    optionalPassed: 0,
    optionalFailed: 0,
    optionalSkipped: 0,
    cases: [],
  };

  const assert = (condition, name, detail = '', meta = {}) => {
    const isMandatory =
      meta.mandatory !== undefined
        ? Boolean(meta.mandatory)
        : meta.tag !== '@sandbox-manual' && !meta.optional;
    const ok = Boolean(condition);
    if (ok) {
      log.pass(name, detail);
      results.passed++;
      if (isMandatory) {
        results.mandatoryPassed++;
      } else {
        results.optionalPassed++;
      }
      results.cases.push({ name, status: 'PASS', detail, mandatory: isMandatory, ...meta });
    } else {
      log.fail(name, detail);
      results.failed++;
      if (isMandatory) {
        results.mandatoryFailed++;
      } else {
        results.optionalFailed++;
      }
      results.cases.push({ name, status: 'FAIL', detail, mandatory: isMandatory, ...meta });
    }
    return ok;
  };

  const skip = (name, reason = 'Skipped in current execution mode', meta = {}) => {
    const isMandatory = meta.mandatory === true;
    log.skip(name, reason);
    results.skipped++;
    if (isMandatory) {
      results.mandatoryFailed++;
    } else {
      results.optionalSkipped++;
    }
    results.cases.push({ name, status: 'SKIPPED', detail: reason, mandatory: isMandatory, ...meta });
  };

  return { results, assert, skip };
}

export function dateOffsetISO(daysFromToday = 0) {
  const d = new Date(Date.now() + daysFromToday * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

export class ApiClient {
  async request(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const headers = {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      const contentType = response.headers.get('content-type') || '';
      let data = null;
      let rawText = null;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else if (options.binary) {
        const arrayBuf = await response.arrayBuffer();
        data = Buffer.from(arrayBuf);
      } else {
        rawText = await response.text();
        try {
          data = JSON.parse(rawText);
        } catch {
          data = rawText;
        }
      }

      return {
        status: response.status,
        ok: response.ok,
        headers: response.headers,
        contentType,
        data,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout (${TIMEOUT_MS}ms) at ${url}`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  get(url, headers = {}) {
    return this.request(url, { method: 'GET', headers });
  }

  getBuffer(url, headers = {}) {
    return this.request(url, { method: 'GET', headers, binary: true });
  }

  post(url, body = null, headers = {}) {
    return this.request(url, {
      method: 'POST',
      headers,
      body: body !== null ? JSON.stringify(body) : undefined,
    });
  }

  put(url, body = null, headers = {}) {
    return this.request(url, {
      method: 'PUT',
      headers,
      body: body !== null ? JSON.stringify(body) : undefined,
    });
  }

  patch(url, body = null, headers = {}) {
    return this.request(url, {
      method: 'PATCH',
      headers,
      body: body !== null ? JSON.stringify(body) : undefined,
    });
  }

  delete(url, headers = {}) {
    return this.request(url, { method: 'DELETE', headers });
  }
}

export const api = new ApiClient();
