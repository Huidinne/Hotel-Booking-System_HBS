// =============================================================================
// HOTEL BOOKING SYSTEM - NATURAL SORT UTILITIES
// File: src/utils/sortUtils.js
// =============================================================================

/**
 * Natural Sort comparator for room numbers / names.
 * Supports numbers, letters, mixed alphanumeric strings (e.g. '301', '301A', 'P-102', 'Room 2', etc.)
 * Case-insensitive and handles undefined/null safely.
 *
 * @param {any} a - First room object or string
 * @param {any} b - Second room object or string
 * @returns {number} Negative if a < b, positive if a > b, 0 if equal
 */
export function compareRoomNatural(a, b) {
  const nameA = String(a?.roomNumber ?? a?.name ?? a ?? '').trim();
  const nameB = String(b?.roomNumber ?? b?.name ?? b ?? '').trim();

  return nameA.localeCompare(nameB, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/**
 * Natural Sort comparator for floor identifiers.
 * Supports numeric floors (1, 2, 10) and alphanumeric (e.g. 'G', 'B1', 'M', 'T1')
 *
 * @param {any} a - Floor identifier
 * @param {any} b - Floor identifier
 * @returns {number}
 */
export function compareFloorNatural(a, b) {
  const numA = Number(a);
  const numB = Number(b);
  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }
  return String(a ?? '').trim().localeCompare(String(b ?? '').trim(), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/**
 * Groups an array of rooms by floor, and sorts rooms in each floor
 * in ascending order by Room Number / Room Name using Natural Sort.
 * Floors are sorted independently.
 *
 * @param {Array} rooms - Array of room objects
 * @returns {Object} Object with floor keys and sorted room array values
 */
export function groupAndSortRoomsByFloor(rooms = []) {
  if (!Array.isArray(rooms)) return {};

  const grouped = rooms.reduce((acc, room) => {
    const floorKey = room.floor !== undefined && room.floor !== null ? room.floor : 'Unknown';
    if (!acc[floorKey]) {
      acc[floorKey] = [];
    }
    acc[floorKey].push(room);
    return acc;
  }, {});

  // Trong từng tầng, tự động sắp xếp tất cả phòng theo tên phòng tăng dần
  Object.keys(grouped).forEach((floor) => {
    grouped[floor].sort(compareRoomNatural);
  });

  return grouped;
}

/**
 * Sorts an array of rooms first by floor ascending, then by roomNumber/name ascending (Natural Sort).
 *
 * @param {Array} rooms - Array of room objects
 * @returns {Array} Sorted new array of rooms
 */
export function sortRoomsByFloorAndName(rooms = []) {
  if (!Array.isArray(rooms)) return [];

  return [...rooms].sort((a, b) => {
    const floorComparison = compareFloorNatural(a.floor, b.floor);
    if (floorComparison !== 0) return floorComparison;
    return compareRoomNatural(a, b);
  });
}
