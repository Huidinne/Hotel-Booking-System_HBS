/**
 * =============================================================================
 * HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
 * Task: [SP2-1109-TRUNG], [SP2-1110-TRUNG], [SP3-1112-TRUNG]
 * File: tests/e2e/runner.js
 * Purpose: CLI Master Test Runner cho toàn bộ bộ kiểm thử E2E (Sprint 2 + Sprint 3)
 * =============================================================================
 */

import {
  API_BASE,
  BASE_URL,
  CHECK_KNOWN_BUGS,
  RUN_SANDBOX_MANUAL,
  USE_MOCK_PROVIDERS,
} from './config.js';
import { testState } from './utils/api-client.js';
import { runAuthSuite } from './suites/01-auth.test.js';
import { runBookingSuite } from './suites/02-booking.test.js';
import { runAuditSuite } from './suites/03-audit.test.js';
import { runChatSuite } from './suites/04-chat.test.js';
import { runBookingFullE2eSuite } from './suites/05-booking-full-e2e.test.js';
import { runTimelineCheckInSuite } from './suites/06-timeline-checkin.test.js';
import { runCheckOutCleaningSuite } from './suites/07-checkout-cleaning.test.js';
import { runRefundLedgerSuite } from './suites/08-refund-ledger.test.js';
import { runDashboardAuditSuite } from './suites/09-dashboard-audit.test.js';

const ALL_SUITES = [
  { id: '01', name: '01-auth', fn: runAuthSuite },
  { id: '02', name: '02-booking', fn: runBookingSuite },
  { id: '03', name: '03-audit', fn: runAuditSuite },
  { id: '04', name: '04-chat', fn: runChatSuite },
  { id: '05', name: '05-booking-full-e2e', fn: runBookingFullE2eSuite },
  { id: '06', name: '06-timeline-checkin', fn: runTimelineCheckInSuite },
  { id: '07', name: '07-checkout-cleaning', fn: runCheckOutCleaningSuite },
  { id: '08', name: '08-refund-ledger', fn: runRefundLedgerSuite },
  { id: '09', name: '09-dashboard-audit', fn: runDashboardAuditSuite },
];

function parseSuiteFilter() {
  const arg = process.argv.find((a) => a.startsWith('--suite='));
  if (!arg) return null;
  return new Set(
    arg
      .replace('--suite=', '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

async function main() {
  const startTime = Date.now();
  const suiteFilter = parseSuiteFilter();
  const suitesToRun = suiteFilter
    ? ALL_SUITES.filter((s) => suiteFilter.has(s.id) || suiteFilter.has(s.name))
    : ALL_SUITES;

  console.log('\x1b[1m\x1b[36m================================================================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m  HBS - BỘ KIỂM THỬ KHÉP KÍN TOÀN TRÌNH E2E (SPRINT 2 + SPRINT 3)\x1b[0m');
  console.log('\x1b[1m\x1b[36m================================================================================\x1b[0m');
  console.log(`  - Máy chủ mục tiêu (BASE_URL) : \x1b[1m\x1b[33m${BASE_URL}\x1b[0m`);
  console.log(`  - API Base Endpoint           : ${API_BASE}`);
  console.log(`  - Mock Providers Mode         : ${USE_MOCK_PROVIDERS ? 'ENABLED (CI / Offline Safe)' : 'DISABLED (Real Providers)'}`);
  console.log(`  - Sandbox Manual Tag          : ${RUN_SANDBOX_MANUAL && !USE_MOCK_PROVIDERS ? 'ENABLED (@sandbox-manual active)' : 'SKIPPED (@sandbox-manual skipped)'}`);
  console.log(`  - Số Suite thực thi           : ${suitesToRun.length}/${ALL_SUITES.length}`);
  console.log(`  - Thời gian khởi chạy         : ${new Date().toISOString()}`);
  console.log('\x1b[1m\x1b[36m================================================================================\x1b[0m\n');

  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let mandatoryPassed = 0;
  let mandatoryFailed = 0;
  let optionalPassed = 0;
  let optionalFailed = 0;
  let optionalSkipped = 0;

  try {
    for (const suite of suitesToRun) {
      const res = await suite.fn();
      totalPassed += res.passed || 0;
      totalFailed += res.failed || 0;
      totalSkipped += res.skipped || 0;
      mandatoryPassed += res.mandatoryPassed !== undefined ? res.mandatoryPassed : (res.passed || 0);
      mandatoryFailed += res.mandatoryFailed !== undefined ? res.mandatoryFailed : (res.failed || 0);
      optionalPassed += res.optionalPassed || 0;
      optionalFailed += res.optionalFailed || 0;
      optionalSkipped += res.optionalSkipped !== undefined ? res.optionalSkipped : (res.skipped || 0);
      console.log('');
    }
  } catch (fatalError) {
    console.error('\x1b[1m\x1b[31m[FATAL ERROR] Lỗi không xử lý được trong quá trình chạy E2E:\x1b[0m', fatalError);
    totalFailed++;
    mandatoryFailed++;
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalCases = totalPassed + totalFailed + totalSkipped;
  const totalMandatory = mandatoryPassed + mandatoryFailed;
  const totalOptional = optionalPassed + optionalFailed + optionalSkipped;
  const isReleaseBlocked = mandatoryFailed > 0;

  console.log('\x1b[1m\x1b[36m================================================================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m  TỔNG KẾT KẾT QUẢ KIỂM THỬ E2E (E2E TEST SUMMARY)\x1b[0m');
  console.log('\x1b[1m\x1b[36m================================================================================\x1b[0m');
  console.log(`  - Tổng số test case khai báo  : \x1b[1m${totalCases}\x1b[0m`);
  console.log(`  - Nhóm BẮT BUỘC (MANDATORY)   : \x1b[1m${totalMandatory}\x1b[0m ca (\x1b[32m${mandatoryPassed} PASS\x1b[0m, \x1b[${mandatoryFailed > 0 ? '31' : '32'}m${mandatoryFailed} FAIL\x1b[0m)`);
  console.log(`  - Nhóm TÙY CHỌN (OPTIONAL)    : \x1b[1m${totalOptional}\x1b[0m ca (\x1b[32m${optionalPassed} PASS\x1b[0m, \x1b[33m${optionalSkipped} SKIPPED\x1b[0m)`);
  console.log(`  - Tỷ lệ Đạt tổng thể          : \x1b[1m${((totalPassed / (totalCases || 1)) * 100).toFixed(1)}%\x1b[0m (${totalPassed}/${totalCases})`);
  console.log(`  - Tỷ lệ Đạt nhóm Bắt buộc     : \x1b[1m${((mandatoryPassed / (totalMandatory || 1)) * 100).toFixed(1)}%\x1b[0m (${mandatoryPassed}/${totalMandatory})`);
  if (CHECK_KNOWN_BUGS || testState.knownBugFindings.length > 0) {
    console.log(`  - Lỗi hệ thống ghi nhận (BUG) : \x1b[1m\x1b[35m${testState.knownBugFindings.length}\x1b[0m`);
    for (const b of testState.knownBugFindings) {
      console.log(`      * [${b.bugId}] ${b.detail}`);
    }
  }
  console.log(`  - Thời gian hoàn thành        : ${durationSec}s`);

  if (!isReleaseBlocked && totalPassed > 0) {
    console.log('\n  \x1b[1m\x1b[42m\x1b[30m [RELEASE GATE: PASSED] 🟢 100% CA BẮT BUỘC ĐẠT CHUẨN - SẴN SÀNG PHÁT HÀNH! \x1b[0m\n');
  } else if (totalPassed === 0 && totalFailed === 0) {
    console.log('\n  \x1b[1m\x1b[43m\x1b[30m STATUS: NO TESTS EXECUTED \x1b[0m\n');
  } else {
    console.log(`\n  \x1b[1m\x1b[41m\x1b[37m [RELEASE GATE: BLOCKED] ⛔ CÓ ${mandatoryFailed} CA BẮT BUỘC THẤT BẠI - CHẶN PHÁT HÀNH! \x1b[0m\n`);
  }
  console.log('\x1b[1m\x1b[36m================================================================================\x1b[0m');

  process.exit(isReleaseBlocked ? 1 : 0);
}

main();
