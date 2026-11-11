/**
 * HOTEL BOOKING SYSTEM - DASHBOARD FORMATTING UTILITIES
 * File: src/utils/dashboardFormatters.ts
 *
 * Implements currency (VNĐ) and occupancy rate formatting according to
 * API Contract [SP2-1109-THANH] and SRS FR-14.
 */

/**
 * Format currency to Vietnamese Dong (VNĐ) with thousands separator.
 * Examples:
 *   1500000  -> "1.500.000 ₫"
 *   25000000 -> "25.000.000 ₫"
 *   0        -> "0 ₫"
 *   null     -> "0 ₫"
 *   NaN      -> "0 ₫"
 */
export function formatVND(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0 ₫';
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return '0 ₫';
  return `${num.toLocaleString('vi-VN')} ₫`;
}

/**
 * Format number with thousands separator without currency symbol.
 * Useful when unit is displayed as a separate element (e.g., KpiCard).
 * Examples:
 *   1500000  -> "1.500.000"
 *   0        -> "0"
 *   null     -> "0"
 */
export function formatNumberVN(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0';
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return '0';
  return num.toLocaleString('vi-VN');
}

/**
 * Convert backend Occupancy Rate (0..1) to percentage string (0%..100%).
 * Formula: Occupancy (%) = Occupancy API × 100
 * Examples:
 *   0    -> "0%"
 *   0.25 -> "25%"
 *   0.5  -> "50%"
 *   0.75 -> "75%"
 *   1    -> "100%"
 *
 * Safety validation:
 * - null / undefined / NaN / !isFinite -> "0%"
 * - value < 0 -> "0%" (clamped)
 * - value > 1 && value <= 100 -> treated as already multiplied percentage to prevent double-multiplication
 * - value > 100 -> "100%" (clamped)
 */
export function formatOccupancyPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0%';
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return '0%';

  if (num < 0) {
    return '0%';
  }

  // Guard against double multiplication (e.g. if API or component passes 75 instead of 0.75)
  if (num > 1) {
    if (num <= 100) {
      return `${Math.round(num)}%`;
    }
    return '100%';
  }

  // Normal 0..1 range
  const pct = num * 100;
  return `${Math.round(pct)}%`;
}

/**
 * Get occupancy percentage as an integer (0..100) for progress bars.
 */
export function getOccupancyProgress(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return 0;

  if (num < 0) return 0;
  if (num > 1) {
    if (num <= 100) return Math.round(num);
    return 100;
  }

  return Math.min(100, Math.max(0, Math.round(num * 100)));
}
