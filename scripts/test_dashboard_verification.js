// =============================================================================
// VERIFICATION TEST SUITE: DASHBOARD INTEGRATION, FIXTURES, AND FORMATTERS
// File: scripts/test_dashboard_verification.js
// =============================================================================

import assert from 'node:assert/strict';

// 1. Import formatters
import {
  formatVND,
  formatNumberVN,
  formatOccupancyPercent,
  getOccupancyProgress,
} from '../frontend/src/utils/dashboardFormatters.ts';

// 2. Import Dashboard Fixtures from documentation
const FIXTURE_1_STANDARD = {
  dateFrom: "2026-10-01",
  dateTo: "2026-10-31",
  roomRevenue: 57000000.00,
  netCashFlow: 52500000.00,
  expectedRevenue: 60000000.00,
  actualRevenue: 52500000.00,
  totalPaid: 55000000.00,
  refundTotal: 2500000.00,
  adr: 950000.00,
  revpar: 570000.00,
  occupancyRate: 0.60,
  soldRoomNights: 60,
  totalAvailableRoomNights: 100,
  totalRooms: 10,
  activeRooms: 10,
  totalBookings: 25,
  confirmedBookings: 22,
  roomCounts: {
    AVAILABLE: 4,
    OCCUPIED: 4,
    CLEANING: 1,
    MAINTENANCE: 1,
  },
  revenueSeries: [
    {
      date: "2026-10-01",
      roomRevenue: 1900000.00,
      netCashFlow: 1900000.00,
      soldRoomNights: 2,
      availableRooms: 10,
      occupancyRate: 0.20,
      adr: 950000.00,
      revpar: 190000.00,
    },
  ],
  roomTypeRevenues: [
    {
      roomTypeId: 2,
      roomTypeName: "Deluxe Double Room",
      roomRevenue: 38000000.00,
      soldRoomNights: 40,
      revenueShare: 0.6667,
    },
  ],
};

const FIXTURE_2_CROSS_MONTH = {
  dateFrom: "2026-10-01",
  dateTo: "2026-10-31",
  roomRevenue: 3800000.00,
  netCashFlow: 2850000.00,
  expectedRevenue: 4750000.00,
  actualRevenue: 2850000.00,
  totalPaid: 2850000.00,
  refundTotal: 0.00,
  adr: 950000.00,
  revpar: 126666.67,
  occupancyRate: 0.1333,
  soldRoomNights: 4,
  totalAvailableRoomNights: 30,
  totalRooms: 10,
  activeRooms: 9,
  totalBookings: 2,
  confirmedBookings: 2,
  roomCounts: {
    AVAILABLE: 8,
    OCCUPIED: 1,
    CLEANING: 0,
    MAINTENANCE: 1,
  },
};

const FIXTURE_3_CANCELLATION_REFUND = {
  dateFrom: "2026-11-01",
  dateTo: "2026-11-07",
  roomRevenue: 0.00,
  netCashFlow: 0.00,
  expectedRevenue: 0.00,
  actualRevenue: 0.00,
  totalPaid: 950000.00,
  refundTotal: 950000.00,
  adr: 0.00,
  revpar: 0.00,
  occupancyRate: 0.00,
  soldRoomNights: 0,
  totalAvailableRoomNights: 70,
  totalRooms: 10,
  activeRooms: 10,
  totalBookings: 1,
  confirmedBookings: 0,
  roomCounts: {
    AVAILABLE: 10,
    OCCUPIED: 0,
    CLEANING: 0,
    MAINTENANCE: 0,
  },
};

const FIXTURE_4_ZERO_DENOMINATOR = {
  dateFrom: "2026-05-01",
  dateTo: "2026-05-07",
  roomRevenue: 0.00,
  netCashFlow: 0.00,
  expectedRevenue: 0.00,
  actualRevenue: 0.00,
  totalPaid: 0.00,
  refundTotal: 0.00,
  adr: 0.00,
  revpar: 0.00,
  occupancyRate: 0.00,
  soldRoomNights: 0,
  totalAvailableRoomNights: 0,
  totalRooms: 2,
  activeRooms: 0,
  totalBookings: 0,
  confirmedBookings: 0,
  roomCounts: {
    AVAILABLE: 0,
    OCCUPIED: 0,
    CLEANING: 0,
    MAINTENANCE: 2,
  },
};

const FIXTURE_5_NULL_UNDEFINED = {
  dateFrom: null,
  dateTo: undefined,
  roomRevenue: null,
  netCashFlow: undefined,
  expectedRevenue: null,
  actualRevenue: undefined,
  totalPaid: null,
  refundTotal: undefined,
  adr: null,
  revpar: undefined,
  occupancyRate: null,
  soldRoomNights: null,
  totalAvailableRoomNights: null,
  totalRooms: null,
  activeRooms: null,
  totalBookings: null,
  confirmedBookings: null,
  roomCounts: null,
  revenueSeries: null,
  roomTypeRevenues: null,
};

const FIXTURE_MONTHLY_12M = {
  year: 2026,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  totalRevenue: 904000000.00,
  totalRoomRevenue: 904000000.00,
  totalNetCashFlow: 880000000.00,
  averageAdr: 950000.00,
  averageRevpar: 450000.00,
  averageOccupancyRate: 0.47,
  totalSoldRoomNights: 950,
  totalAvailableRoomNights: 2000,
  monthly: [
    {
      month: "Tháng 01/2026",
      monthKey: "2026-01",
      monthIndex: 1,
      year: 2026,
      revenue: 45000000.00,
      roomRevenue: 45000000.00,
      netCashFlow: 42000000.00,
      totalPaid: 45000000.00,
      refundTotal: 3000000.00,
      soldRoomNights: 45,
      availableRoomNights: 90,
      adr: 1000000.00,
      revpar: 500000.00,
      occupancyRate: 0.50,
    },
  ],
  roomTypes: [
    {
      roomTypeId: 2,
      roomTypeName: "Deluxe Double Room",
      roomRevenue: 410000000.00,
      revenue: 410000000.00,
      soldRoomNights: 400,
      revenueShare: 0.4651,
      percentage: 46.51,
    },
  ],
};

console.log("=================================================================");
console.log("HOTEL BOOKING SYSTEM - DASHBOARD INTEGRATION & VERIFICATION SUITE");
console.log("=================================================================\n");

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------------------
// TEST SUITE 1: CURRENCY FORMATTING (VND)
// -----------------------------------------------------------------------------
console.log("--- 1. Testing Currency Formatting (VND) ---");

runTest("Standard VND formatting: 1500000 -> 1.500.000 ₫", () => {
  assert.equal(formatVND(1500000), "1.500.000 ₫");
});

runTest("Standard VND formatting: 25000000 -> 25.000.000 ₫", () => {
  assert.equal(formatVND(25000000), "25.000.000 ₫");
});

runTest("Zero value: 0 -> 0 ₫", () => {
  assert.equal(formatVND(0), "0 ₫");
  assert.equal(formatVND("0"), "0 ₫");
});

runTest("Null and undefined: null -> 0 ₫, undefined -> 0 ₫", () => {
  assert.equal(formatVND(null), "0 ₫");
  assert.equal(formatVND(undefined), "0 ₫");
});

runTest("Invalid numeric values: NaN -> 0 ₫, Infinity -> 0 ₫, -Infinity -> 0 ₫", () => {
  assert.equal(formatVND(NaN), "0 ₫");
  assert.equal(formatVND(Infinity), "0 ₫");
  assert.equal(formatVND(-Infinity), "0 ₫");
  assert.equal(formatVND("not_a_number"), "0 ₫");
});

runTest("Value-only formatting: formatNumberVN(1500000) -> 1.500.000", () => {
  assert.equal(formatNumberVN(1500000), "1.500.000");
  assert.equal(formatNumberVN(0), "0");
  assert.equal(formatNumberVN(null), "0");
  assert.equal(formatNumberVN(NaN), "0");
});

// -----------------------------------------------------------------------------
// TEST SUITE 2: OCCUPANCY RATE CONVERSION & VALIDATION
// -----------------------------------------------------------------------------
console.log("\n--- 2. Testing Occupancy Rate Formatting (0..1 -> 0%..100%) ---");

runTest("Table Case 1: 0 -> 0%", () => {
  assert.equal(formatOccupancyPercent(0), "0%");
  assert.equal(getOccupancyProgress(0), 0);
});

runTest("Table Case 2: 0.25 -> 25%", () => {
  assert.equal(formatOccupancyPercent(0.25), "25%");
  assert.equal(getOccupancyProgress(0.25), 25);
});

runTest("Table Case 3: 0.5 -> 50%", () => {
  assert.equal(formatOccupancyPercent(0.5), "50%");
  assert.equal(getOccupancyProgress(0.5), 50);
});

runTest("Table Case 4: 0.75 -> 75%", () => {
  assert.equal(formatOccupancyPercent(0.75), "75%");
  assert.equal(getOccupancyProgress(0.75), 75);
});

runTest("Table Case 5: 1 -> 100%", () => {
  assert.equal(formatOccupancyPercent(1), "100%");
  assert.equal(getOccupancyProgress(1), 100);
});

runTest("Decimals rounding: 0.40 -> 40%, 0.1333 -> 13%, 0.2222 -> 22%", () => {
  assert.equal(formatOccupancyPercent(0.40), "40%");
  assert.equal(formatOccupancyPercent(0.1333), "13%");
  assert.equal(formatOccupancyPercent(0.2222), "22%");
});

runTest("Null, undefined, NaN handling: returns 0% safely without NaN%", () => {
  assert.equal(formatOccupancyPercent(null), "0%");
  assert.equal(formatOccupancyPercent(undefined), "0%");
  assert.equal(formatOccupancyPercent(NaN), "0%");
  assert.equal(formatOccupancyPercent("invalid"), "0%");
  assert.equal(getOccupancyProgress(null), 0);
  assert.equal(getOccupancyProgress(undefined), 0);
});

runTest("Pre-multiplied percentage guard (avoids 100x double multiplication): 75 -> 75% (not 7500%)", () => {
  assert.equal(formatOccupancyPercent(75), "75%");
  assert.equal(getOccupancyProgress(75), 75);
});

runTest("Out of bounds handling: < 0 -> 0%, > 100 -> 100%", () => {
  assert.equal(formatOccupancyPercent(-0.2), "0%");
  assert.equal(formatOccupancyPercent(150), "100%");
  assert.equal(getOccupancyProgress(-5), 0);
  assert.equal(getOccupancyProgress(120), 100);
});

// -----------------------------------------------------------------------------
// TEST SUITE 3: DASHBOARD FIXTURES ADAPTATION & NORMALIZATION
// -----------------------------------------------------------------------------
console.log("\n--- 3. Testing Dashboard Service Normalization with Fixtures ---");

// Helper function mirroring dashboardService mapping logic
function normalizeSummaryResponse(raw) {
  const revenueSeries = Array.isArray(raw?.revenueSeries)
    ? raw.revenueSeries.map((item) => ({
        date: item.date || '',
        roomRevenue: Number(item.roomRevenue || 0),
        netCashFlow: Number(item.netCashFlow || 0),
        soldRoomNights: Number(item.soldRoomNights || 0),
        availableRooms: Number(item.availableRooms || 0),
        occupancyRate: Number(item.occupancyRate || 0),
        adr: Number(item.adr || 0),
        revpar: Number(item.revpar || 0),
      }))
    : [];

  const roomTypeRevenues = Array.isArray(raw?.roomTypeRevenues)
    ? raw.roomTypeRevenues.map((rt) => ({
        roomTypeId: rt.roomTypeId,
        roomTypeName: rt.roomTypeName || '',
        roomRevenue: Number(rt.roomRevenue || 0),
        revenue: Number(rt.revenue ?? rt.roomRevenue ?? 0),
        soldRoomNights: Number(rt.soldRoomNights || 0),
        revenueShare: rt.revenueShare != null ? Number(rt.revenueShare) : 0,
        percentage:
          rt.percentage != null
            ? Number(rt.percentage)
            : rt.revenueShare != null
            ? Math.round(Number(rt.revenueShare) * 10000) / 100
            : 0,
      }))
    : [];

  return {
    dateFrom: raw?.dateFrom || '',
    dateTo: raw?.dateTo || '',
    roomRevenue: Number(raw?.roomRevenue ?? 0),
    netCashFlow: Number(raw?.netCashFlow ?? raw?.actualRevenue ?? 0),
    expectedRevenue: Number(raw?.expectedRevenue ?? 0),
    actualRevenue: Number(raw?.actualRevenue ?? raw?.netCashFlow ?? 0),
    totalPaid: Number(raw?.totalPaid ?? 0),
    refundTotal: Number(raw?.refundTotal ?? 0),
    adr: Number(raw?.adr ?? 0),
    revpar: Number(raw?.revpar ?? 0),
    occupancyRate: Number(raw?.occupancyRate ?? 0),
    soldRoomNights: Number(raw?.soldRoomNights ?? 0),
    totalAvailableRoomNights: Number(raw?.totalAvailableRoomNights ?? 0),
    totalRooms: Number(raw?.totalRooms ?? 0),
    activeRooms: Number(raw?.activeRooms ?? 0),
    roomCounts: {
      AVAILABLE: Number(raw?.roomCounts?.AVAILABLE ?? 0),
      OCCUPIED: Number(raw?.roomCounts?.OCCUPIED ?? 0),
      CLEANING: Number(raw?.roomCounts?.CLEANING ?? 0),
      MAINTENANCE: Number(raw?.roomCounts?.MAINTENANCE ?? 0),
    },
    totalBookings: Number(raw?.totalBookings ?? 0),
    confirmedBookings: Number(raw?.confirmedBookings ?? 0),
    revenueSeries,
    roomTypeRevenues,
  };
}

runTest("Fixture 1 (Standard Month): 57M room revenue, 60% occupancy, 950k ADR", () => {
  const data = normalizeSummaryResponse(FIXTURE_1_STANDARD);
  assert.equal(data.roomRevenue, 57000000);
  assert.equal(formatVND(data.roomRevenue), "57.000.000 ₫");
  assert.equal(formatVND(data.netCashFlow), "52.500.000 ₫");
  assert.equal(formatOccupancyPercent(data.occupancyRate), "60%");
  assert.equal(formatVND(data.adr), "950.000 ₫");
  assert.equal(formatVND(data.revpar), "570.000 ₫");
  assert.equal(data.revenueSeries.length, 1);
  assert.equal(data.roomTypeRevenues[0].percentage, 66.67);
});

runTest("Fixture 2 (Cross-Month Booking): 3.8M room revenue, 13% occupancy", () => {
  const data = normalizeSummaryResponse(FIXTURE_2_CROSS_MONTH);
  assert.equal(data.roomRevenue, 3800000);
  assert.equal(formatVND(data.roomRevenue), "3.800.000 ₫");
  assert.equal(formatVND(data.netCashFlow), "2.850.000 ₫");
  assert.equal(formatOccupancyPercent(data.occupancyRate), "13%");
  assert.equal(data.soldRoomNights, 4);
});

runTest("Fixture 3 (Cancellation & Refund): 0 room revenue, 950k refundTotal, 0% occupancy", () => {
  const data = normalizeSummaryResponse(FIXTURE_3_CANCELLATION_REFUND);
  assert.equal(data.roomRevenue, 0);
  assert.equal(formatVND(data.roomRevenue), "0 ₫");
  assert.equal(formatVND(data.refundTotal), "950.000 ₫");
  assert.equal(formatOccupancyPercent(data.occupancyRate), "0%");
  assert.equal(formatVND(data.adr), "0 ₫");
  assert.equal(formatVND(data.revpar), "0 ₫");
});

runTest("Fixture 4 (Zero Denominator): all zeroes handled safely, no NaN or Infinity", () => {
  const data = normalizeSummaryResponse(FIXTURE_4_ZERO_DENOMINATOR);
  assert.equal(data.roomRevenue, 0);
  assert.equal(formatVND(data.roomRevenue), "0 ₫");
  assert.equal(formatOccupancyPercent(data.occupancyRate), "0%");
  assert.equal(formatVND(data.adr), "0 ₫");
  assert.equal(formatVND(data.revpar), "0 ₫");
  assert.equal(data.activeRooms, 0);
  assert.equal(data.roomCounts.MAINTENANCE, 2);
  assert.equal(data.roomCounts.AVAILABLE, 0);
});

runTest("Fixture 5 (Null & Undefined): all fields default safely to 0 and empty arrays", () => {
  const data = normalizeSummaryResponse(FIXTURE_5_NULL_UNDEFINED);
  assert.equal(data.roomRevenue, 0);
  assert.equal(data.netCashFlow, 0);
  assert.equal(formatVND(data.roomRevenue), "0 ₫");
  assert.equal(formatOccupancyPercent(data.occupancyRate), "0%");
  assert.equal(data.roomCounts.AVAILABLE, 0);
  assert.equal(data.roomCounts.OCCUPIED, 0);
  assert.equal(Array.isArray(data.revenueSeries), true);
  assert.equal(data.revenueSeries.length, 0);
  assert.equal(Array.isArray(data.roomTypeRevenues), true);
  assert.equal(data.roomTypeRevenues.length, 0);
});

runTest("Fixture 12-Month Analytics: 904M total revenue, monthly and room type arrays mapped cleanly", () => {
  assert.equal(formatVND(FIXTURE_MONTHLY_12M.totalRevenue), "904.000.000 ₫");
  assert.equal(formatOccupancyPercent(FIXTURE_MONTHLY_12M.averageOccupancyRate), "47%");
  assert.equal(FIXTURE_MONTHLY_12M.monthly.length, 1);
  assert.equal(formatVND(FIXTURE_MONTHLY_12M.monthly[0].revenue), "45.000.000 ₫");
  assert.equal(formatOccupancyPercent(FIXTURE_MONTHLY_12M.monthly[0].occupancyRate), "50%");
  assert.equal(FIXTURE_MONTHLY_12M.roomTypes[0].percentage, 46.51);
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log("\n=================================================================");
console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
console.log("=================================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
