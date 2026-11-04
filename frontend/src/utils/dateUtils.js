/**
 * Date utility functions for hotel booking system.
 * Formats dates according to local time zone (YYYY-MM-DD)
 * and enforces non-past booking constraints.
 */

export const formatDateToISO = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayString = () => formatDateToISO(new Date());

export const getTomorrowString = (daysAhead = 1) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return formatDateToISO(d);
};

export const addDays = (dateString, days = 1) => {
  if (!dateString) return getTomorrowString(days);
  const [year, month, day] = dateString.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  return formatDateToISO(d);
};

export const isPastDate = (dateString) => {
  if (!dateString) return false;
  return dateString < getTodayString();
};

export const getValidCheckInDate = (paramDate) => {
  const today = getTodayString();
  if (!paramDate || paramDate < today) {
    return today;
  }
  return paramDate;
};

export const getValidCheckOutDate = (paramCheckOut, validCheckIn) => {
  const safeCheckIn = getValidCheckInDate(validCheckIn);
  const minCheckOut = addDays(safeCheckIn, 1);
  if (!paramCheckOut || paramCheckOut <= safeCheckIn) {
    return minCheckOut;
  }
  return paramCheckOut;
};

export const calculateNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 1;
  const inTime = new Date(checkIn).getTime();
  const outTime = new Date(checkOut).getTime();
  if (isNaN(inTime) || isNaN(outTime)) return 1;
  const diff = Math.round((outTime - inTime) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
};
