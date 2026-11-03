import React, { useMemo } from 'react';

// ─── PMS Status → Color mapping (single source of truth) ────────────────────
// Booking statuses projected onto timeline cells
export const BOOKING_STATUS_COLORS = {
  CONFIRMED:   { bg: '#3b82f6', text: '#ffffff', label: 'Đã xác nhận' },
  CHECKED_IN:  { bg: '#10b981', text: '#ffffff', label: 'Đang lưu trú' },
  PENDING:     { bg: '#f59e0b', text: '#ffffff', label: 'Chờ xác nhận' },
  CHECKED_OUT: { bg: '#94a3b8', text: '#ffffff', label: 'Đã trả phòng' },
  CANCELLED:   { bg: '#ef4444', text: '#ffffff', label: 'Đã hủy' },
  NO_SHOW:     { bg: '#64748b', text: '#ffffff', label: 'No-show' },
};

// Physical room statuses (for cells without a booking overlay)
export const ROOM_STATUS_COLORS = {
  AVAILABLE:   { bg: '#f8fafc', text: '#334155', label: 'Trống' },
  OCCUPIED:    { bg: '#64748b', text: '#ffffff', label: 'Đang ở' },
  CLEANING:    { bg: '#f59e0b', text: '#ffffff', label: 'Dọn dẹp' },
  MAINTENANCE: { bg: '#ef4444', text: '#ffffff', label: 'Bảo trì' },
};

// ─── Constants ────────────────────────────────────────────────────────────────
const ROOM_COL_WIDTH = 200; // px – left sticky column
const DAY_COL_WIDTH  = 80;  // px – each day cell min-width

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function isToday(date) {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

// ─── Cell component ───────────────────────────────────────────────────────────
function TimelineCell({
  room,
  dateStr,
  segment,
  isWeekend,
  isTodayCol,
  onBookingClick,
  onAvailableClick,
}) {
  const currentStatus = segment?.status || segment?.bookingStatus || room.status || 'AVAILABLE';
  const hasBooking = Boolean(
    segment &&
    (segment.bookingId || segment.bookingCode || currentStatus === 'CONFIRMED' || currentStatus === 'CHECKED_IN')
  );
  const isAvailable = currentStatus === 'AVAILABLE';

  let bg, textColor, label, tooltip;

  if (hasBooking) {
    const conf = BOOKING_STATUS_COLORS[currentStatus] || { bg: '#3b82f6', text: '#ffffff', label: 'Đặt phòng' };
    bg = conf.bg;
    textColor = conf.text;
    label = segment.bookingCode ? segment.bookingCode.slice(-6) : `BK#${segment.bookingId}`;
    const checkIn = segment.checkInDate || segment.checkIn || '';
    const checkOut = segment.checkOutDate || segment.checkOut || '';
    tooltip = [
      `Phòng ${room.roomNumber} (${conf.label})`,
      `Mã: ${segment.bookingCode || segment.bookingId || '—'}`,
      `Khách: ${segment.customerName || '—'}`,
      checkIn && checkOut ? `${checkIn} → ${checkOut}` : '',
      'Click để xem nhanh thông tin đặt phòng',
    ].filter(Boolean).join('\n');
  } else {
    // Physical room status or default available
    const conf = ROOM_STATUS_COLORS[currentStatus] || { bg: '#f8fafc', text: '#334155', label: currentStatus };
    bg = conf.bg;
    textColor = conf.text;
    label = '';
    tooltip = isAvailable
      ? `Phòng ${room.roomNumber} · Trống\nClick để tạo booking mới`
      : `Phòng ${room.roomNumber} · ${conf.label}`;
  }

  const handleClick = () => {
    if (hasBooking) {
      if (typeof onBookingClick === 'function') {
        onBookingClick(
          {
            ...segment,
            roomId: room.id,
            roomNumber: room.roomNumber,
            roomTypeName: room.roomTypeName,
            floor: room.floor,
          },
          room,
          dateStr
        );
      }
    } else if (isAvailable) {
      if (typeof onAvailableClick === 'function') {
        onAvailableClick(room, dateStr);
      }
    }
  };

  const clickableClass = hasBooking || isAvailable ? ' tl-cell--clickable' : '';
  const availableClass = isAvailable ? ' tl-cell--available' : '';
  const bookingClass = hasBooking ? ' tl-cell--booking' : '';

  return (
    <td
      className={`tl-cell${isTodayCol ? ' tl-cell--today' : ''}${isWeekend ? ' tl-cell--weekend' : ''}${clickableClass}${availableClass}${bookingClass}`}
      title={tooltip}
      style={{ backgroundColor: bg, color: textColor }}
      onClick={handleClick}
    >
      {label && <span className="tl-cell-label">{label}</span>}
    </td>
  );
}

// ─── TimelineGrid ─────────────────────────────────────────────────────────────
export function TimelineGrid({
  rooms,
  days,
  segments,
  viewMode,
  onBookingClick,
  onAvailableClick,
}) {
  // Pre-compute date strings once (memoized)
  const dayStrings = useMemo(() => days.map(toLocalDateStr), [days]);

  // Sort rooms: by floor asc, then roomNumber asc
  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      if (a.floor !== b.floor) return a.floor - b.floor;
      return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
    });
  }, [rooms]);

  return (
    <div className="tl-scroll-container">
      <table
        className="tl-table"
        style={{ '--room-col-width': `${ROOM_COL_WIDTH}px`, '--day-col-width': `${DAY_COL_WIDTH}px` }}
      >
        {/* ── Colgroup for fixed widths ── */}
        <colgroup>
          <col style={{ width: ROOM_COL_WIDTH, minWidth: ROOM_COL_WIDTH }} />
          {days.map((_, i) => (
            <col key={i} style={{ width: DAY_COL_WIDTH, minWidth: DAY_COL_WIDTH }} />
          ))}
        </colgroup>

        {/* ── Sticky Header ── */}
        <thead>
          <tr className="tl-header-row">
            {/* Corner cell – highest z-index */}
            <th className="tl-corner-cell">
              <div className="tl-corner-inner">
                <span className="tl-corner-text">Phòng</span>
                <span className="tl-corner-count">{sortedRooms.length} phòng</span>
              </div>
            </th>

            {days.map((day, i) => {
              const isWknd = day.getDay() === 0 || day.getDay() === 6;
              const isTdy = isToday(day);
              return (
                <th
                  key={dayStrings[i]}
                  className={`tl-date-cell${isWknd ? ' tl-date-cell--weekend' : ''}${isTdy ? ' tl-date-cell--today' : ''}`}
                >
                  <div className="tl-date-inner">
                    <span className="tl-date-day">{DAY_NAMES[day.getDay()]}</span>
                    <span className="tl-date-num">{day.getDate()}</span>
                    {viewMode === 'month' && (
                      <span className="tl-date-mon">{day.getMonth() + 1}</span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* ── Body ── */}
        <tbody>
          {sortedRooms.map((room) => {
            const roomSegs = segments[room.id] || {};
            return (
              <tr key={room.id} className="tl-body-row">
                {/* Sticky room info cell */}
                <td className="tl-room-cell">
                  <div className="tl-room-inner">
                    <RoomStatusDot status={room.status} />
                    <div className="tl-room-text">
                      <span className="tl-room-number">Phòng {room.roomNumber}</span>
                      <span className="tl-room-type">{room.roomTypeName || `Tầng ${room.floor}`}</span>
                    </div>
                    <span className="tl-room-floor">T{room.floor}</span>
                  </div>
                </td>

                {days.map((day, i) => {
                  const dateStr = dayStrings[i];
                  const seg = roomSegs[dateStr];
                  const isWknd = day.getDay() === 0 || day.getDay() === 6;
                  const isTdy = isToday(day);
                  return (
                    <TimelineCell
                      key={dateStr}
                      room={room}
                      dateStr={dateStr}
                      segment={seg}
                      isWeekend={isWknd}
                      isTodayCol={isTdy}
                      onBookingClick={onBookingClick}
                      onAvailableClick={onAvailableClick}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Room status dot ───────────────────────────────────────────────────────────
function RoomStatusDot({ status }) {
  const colorMap = {
    AVAILABLE:   '#10b981',
    OCCUPIED:    '#3b82f6',
    CLEANING:    '#f59e0b',
    MAINTENANCE: '#ef4444',
  };
  const color = colorMap[status] || '#94a3b8';
  return (
    <span
      className="tl-room-dot"
      style={{ backgroundColor: color }}
      title={status}
    />
  );
}
