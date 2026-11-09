/**
 * =============================================================================
 * HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
 * Task: [SP2-1109-TRUNG]
 * File: tests/e2e/runner.js
 * Purpose: CLI Master Test Runner cho bộ kiểm thử E2E (Auth, Booking, Audit, Chat)
 * =============================================================================
 */

import { BASE_URL, API_BASE } from './config.js';
import { log } from './utils/api-client.js';
import { runAuthSuite } from './suites/01-auth.test.js';
import { runBookingSuite } from './suites/02-booking.test.js';
import { runAuditSuite } from './suites/03-audit.test.js';
import { runChatSuite } from './suites/04-chat.test.js';

async function main() {
  const startTime = Date.now();
  console.log('\x1b[1m\x1b[36m================================================================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m  HBS - BỘ KIỂM THỬ KHÉP KÍN TOÀN TRÌNH E2E (END-TO-END SMOKE TEST SUITE)\x1b[0m');
  console.log('\x1b[1m\x1b[36m================================================================================\x1b[0m');
  console.log(`  - Máy chủ mục tiêu (BASE_URL) : \x1b[1m\x1b[33m${BASE_URL}\x1b[0m`);
  console.log(`  - API Base Endpoint           : ${API_BASE}`);
  console.log(`  - Thời gian khởi chạy         : ${new Date().toISOString()}`);
  console.log('\x1b[1m\x1b[36m================================================================================\x1b[0m\n');

  let totalPassed = 0;
  let totalFailed = 0;

  try {
    // 1. Suite Auth
    const authResults = await runAuthSuite();
    totalPassed += authResults.passed;
    totalFailed += authResults.failed;
    console.log('');

    // 2. Suite Booking
    const bookingResults = await runBookingSuite();
    totalPassed += bookingResults.passed;
    totalFailed += bookingResults.failed;
    console.log('');

    // 3. Suite Audit
    const auditResults = await runAuditSuite();
    totalPassed += auditResults.passed;
    totalFailed += auditResults.failed;
    console.log('');

    // 4. Suite Chat
    const chatResults = await runChatSuite();
    totalPassed += chatResults.passed;
    totalFailed += chatResults.failed;
    console.log('');
  } catch (fatalError) {
    console.error('\x1b[1m\x1b[31m[FATAL ERROR] Lỗi không xử lý được trong quá trình chạy E2E:\x1b[0m', fatalError);
    totalFailed++;
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalTests = totalPassed + totalFailed;

  console.log('\x1b[1m\x1b[36m================================================================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m  TỔNG KẾT KẾT QUẢ KIỂM THỬ E2E (E2E TEST SUMMARY)\x1b[0m');
  console.log('\x1b[1m\x1b[36m================================================================================\x1b[0m');
  console.log(`  - Tổng số test case thực thi : \x1b[1m${totalTests}\x1b[0m`);
  console.log(`  - Số ca kiểm thử ĐẠT (PASS)   : \x1b[1m\x1b[32m${totalPassed}\x1b[0m`);
  console.log(`  - Số ca kiểm thử HỎNG (FAIL)  : \x1b[1m\x1b[${totalFailed > 0 ? '31' : '32'}m${totalFailed}\x1b[0m`);
  console.log(`  - Thời gian hoàn thành        : ${durationSec}s`);

  if (totalFailed === 0 && totalPassed > 0) {
    console.log('\n  \x1b[1m\x1b[42m\x1b[30m STATUS: 100% PASSED - TOÀN BỘ 4 LUỒNG SMOKE FLOW ĐẠT YÊU CẦU! \x1b[0m\n');
  } else if (totalPassed === 0 && totalFailed === 0) {
    console.log('\n  \x1b[1m\x1b[43m\x1b[30m STATUS: NO TESTS EXECUTED \x1b[0m\n');
  } else {
    console.log(`\n  \x1b[1m\x1b[41m\x1b[37m STATUS: FAILED - CÓ ${totalFailed} CA KIỂM THỬ THẤT BẠI! \x1b[0m\n`);
  }
  console.log('\x1b[1m\x1b[36m================================================================================\x1b[0m');

  process.exit(totalFailed > 0 ? 1 : 0);
}

main();

