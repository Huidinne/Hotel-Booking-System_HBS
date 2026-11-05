import { compareRoomNatural, compareFloorNatural } from '../../utils/sortUtils';
import React, { useMemo } from 'react';

// ─── PMS Status → Minimalist Luxury Soft/Pastel mapping ────────────────────
export const BOOKING_STATUS_COLORS = {
  CONFIRMED: {
    bg: '#E0F2FE',
    border: '#BAE6FD',
    text: '#0369A1',
    label: 'Đã xác nhận',
    dot: '#0284C7',
  },
  CHECKED_IN: {
    bg: '#ECFDF5',
    border: '#A7F3D0',
    text: '#047857',
    label: 'Đang lưu trú',
    dot: '#10B981',
  },
  PENDING: {
    bg: '#FEF3C7',
    border: '#FDE68A',
    text: '#B45309',
    label: 'Chờ xác nhận',
    dot: '#F59E0B',
  },
  CHECKED_OUT: {
    bg: '#F1F5F9',
    border: '#E2E8F0',
    text: '#475569',
    label: 'Đã trả phòng',
    dot: '#64748B',
  },
  CANCELLED: {
    bg: '#FEE2E2',
    border: '#FECACA',
    text: '#B91C1C',
    label: 'Đã hủy',
    dot: '#EF4444',
  },
  NO_SHOW: {
    bg: '#F3F4F6',
    border: '#E5E7EB',
    text: '#6B7280',
    label: 'No-show',
    dot: '#9CA3AF',
  },
};

// Physical room statuses (for cells without a booking overlay)
export const ROOM_STATUS_COLORS = {
  AVAILABLE: {
    bg: '#FFFFFF',
    border: '#E2E8F0',
    text: '#64748B',
    label: 'Trống',
    dot: '#10B981',
  },
  OCCUPIED: {
    bg: '#EEF2FF',
    border: '#C7D2FE',
    text: '#4338CA',
    label: 'Đang ở',
    dot: '#6366F1',
  },
  CLEANING: {
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#92400E',
    label: 'Dọn dẹp',
    dot: '#F59E0B',
  },
  MAINTENANCE: {
    bg: '#FEF2F2',
    border: '#FECACA',
    text: '#991B1B',
    label: 'Bảo trì',
    dot: '#EF4444',
  },
};

// ─── Constants ────────────────────────────────────────────────────────────────
const ROOM_COL_WIDTH = 190; // px – left sticky column
const DAY_COL_WIDTH = 84;   // px – each day cell min-width

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

  let conf, label, tooltip;

  if (hasBooking) {
    conf = BOOKING_STATUS_COLORS[currentStatus] || {
      bg: '#E0F2FE',
      border: '#BAE6FD',
      text: '#0369A1',
      label: 'Đặt phòng',
    };
    label = segment.customerName
      ? segment.customerName
      : (segment.bookingCode ? segment.bookingCode.slice(-6) : `BK#${segment.bookingId}`);
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
    conf = ROOM_STATUS_COLORS[currentStatus] || {
      bg: '#FFFFFF',
      border: '#E2E8F0',
      text: '#64748B',
      label: currentStatus,
    };
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
      onClick={handleClick}
    >
      {hasBooking ? (
        <div
          className="tl-booking-pill"
          style={{
            backgroundColor: conf.bg,
            borderColor: conf.border,
            color: conf.text,
          }}
        >
          <span className="tl-booking-text">{label}</span>
        </div>
      ) : !isAvailable && conf.label !== 'Trống' ? (
        <div
          className="tl-status-pill"
          style={{
            backgroundColor: conf.bg,
            borderColor: conf.border,
            color: conf.text,
          }}
        >
          <span className="tl-status-text">{conf.label}</span>
        </div>
      ) : (
        <div className="tl-cell-empty-hint">
          <span className="tl-empty-plus">+</span>
        </div>
      )}
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
      const floorDiff = compareFloorNatural(a.floor, b.floor);
      if (floorDiff !== 0) return floorDiff;
      return compareRoomNatural(a, b);
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
                {/* Sticky room info cell (Minimalist: Không chấm màu tròn) */}
                <td className="tl-room-cell">
                  <div className="tl-room-inner">
                    <div className="tl-room-text">
                      <span className="tl-room-number">Phòng {room.roomNumber}</span>
                      <span className="tl-room-type">{room.roomTypeName || `Tầng ${room.floor}`}</span>
                    </div>
                    {room.floor !== undefined && room.floor !== null && (
                      <span className="tl-room-floor">T{room.floor}</span>
                    )}
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
