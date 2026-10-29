import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, RefreshCw } from 'lucide-react';
import { roomService } from '../../services/roomService';
import { bookingService } from '../../services/bookingService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import { TimelineGrid } from '../../components/booking/TimelineGrid';

// ─── Date helpers (no external deps) ────────────────────────────────────────

/** Return YYYY-MM-DD string in local time (avoids UTC shift) */
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse a YYYY-MM-DD string to a midnight local Date */
function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Get the Monday of the week containing `date` */
function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Build an array of `n` consecutive Date objects starting from `start` */
function buildDateRange(start, n) {
  const days = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

/** Days in a given month */
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

const WEEK_DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTH_LABELS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

// ─── Mock timeline data for when API has no timeline endpoint ────────────────
// This sits at the service layer – easy to swap for a real API call later.
function buildMockTimelineData(rooms, bookings, days) {
  // Map: roomId → array of booking segments overlapping visible days
  const dayStrings = days.map(toLocalDateStr);
  const segments = {}; // roomId → { dateStr: segmentInfo }

  rooms.forEach((room) => {
    segments[room.id] = {};
  });

  // For each booking that has assignedRooms, project its status onto those rooms
  bookings.forEach((booking) => {
    if (!booking.assignedRooms || booking.assignedRooms.length === 0) return;
    const checkIn = booking.checkIn;   // YYYY-MM-DD
    const checkOut = booking.checkOut; // YYYY-MM-DD (exclusive checkout night)

    booking.assignedRooms.forEach((ar) => {
      const roomId = ar.id;
      if (!segments[roomId]) return;

      dayStrings.forEach((dayStr) => {
        if (dayStr >= checkIn && dayStr < checkOut) {
          segments[roomId][dayStr] = {
            bookingCode: booking.bookingCode,
            customerName: booking.customerName,
            bookingStatus: booking.bookingStatus,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
          };
        }
      });
    });
  });

  return segments;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function RoomTimelinePage() {
  const { showToast } = useToast();

  // View mode: 'week' | 'month'
  const [viewMode, setViewMode] = useState('week');

  // Anchor: for week = Monday date; for month = 1st of month
  const [anchor, setAnchor] = useState(() => {
    const mon = getMondayOf(new Date());
    return mon;
  });

  // Data
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Compute visible days from anchor + viewMode ──────────────────────────
  const visibleDays = useMemo(() => {
    if (viewMode === 'week') {
      return buildDateRange(anchor, 7);
    } else {
      // month view
      const year = anchor.getFullYear();
      const month = anchor.getMonth();
      const firstDay = new Date(year, month, 1);
      const count = daysInMonth(year, month);
      return buildDateRange(firstDay, count);
    }
  }, [anchor, viewMode]);

  // ── Human-readable period label ───────────────────────────────────────────
  const periodLabel = useMemo(() => {
    if (viewMode === 'week') {
      const end = visibleDays[6];
      const startStr = `${visibleDays[0].getDate()}/${visibleDays[0].getMonth() + 1}`;
      const endStr = `${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
      return `${startStr} – ${endStr}`;
    } else {
      return `${MONTH_LABELS[anchor.getMonth()]} ${anchor.getFullYear()}`;
    }
  }, [viewMode, anchor, visibleDays]);

  // ── Navigation handlers ───────────────────────────────────────────────────
  const goToday = useCallback(() => {
    if (viewMode === 'week') {
      setAnchor(getMondayOf(new Date()));
    } else {
      const now = new Date();
      setAnchor(new Date(now.getFullYear(), now.getMonth(), 1));
    }
  }, [viewMode]);

  const goPrev = useCallback(() => {
    setAnchor((prev) => {
      const d = new Date(prev);
      if (viewMode === 'week') {
        d.setDate(d.getDate() - 7);
      } else {
        d.setMonth(d.getMonth() - 1);
      }
      return d;
    });
  }, [viewMode]);

  const goNext = useCallback(() => {
    setAnchor((prev) => {
      const d = new Date(prev);
      if (viewMode === 'week') {
        d.setDate(d.getDate() + 7);
      } else {
        d.setMonth(d.getMonth() + 1);
      }
      return d;
    });
  }, [viewMode]);

  const switchViewMode = useCallback((mode) => {
    setViewMode(mode);
    if (mode === 'week') {
      setAnchor(getMondayOf(new Date()));
    } else {
      const now = new Date();
      setAnchor(new Date(now.getFullYear(), now.getMonth(), 1));
    }
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roomsData, bookingsData] = await Promise.all([
        roomService.getRooms(),
        bookingService.getReceptionistBookings({ size: 200 }),
      ]);
      setRooms(roomsData);
      setBookings(bookingsData);
    } catch (err) {
      const msg = err?.message || 'Không thể tải dữ liệu timeline';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Build timeline segments (memoized) ───────────────────────────────────
  const timelineSegments = useMemo(() => {
    if (!rooms.length) return {};
    return buildMockTimelineData(rooms, bookings, visibleDays);
  }, [rooms, bookings, visibleDays]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="timeline-page-wrapper">
      {/* ── Page Header ── */}
      <div className="timeline-page-header">
        <div className="timeline-header-title-group">
          <h1 className="timeline-page-title">
            <Calendar size={22} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
            Room Timeline
          </h1>
          <p className="timeline-page-subtitle">
            Bảng tổng quan trạng thái phòng theo ngày · PMS Calendar View
          </p>
        </div>

        {/* Controls row */}
        <div className="timeline-controls-row">
          {/* View mode toggle */}
          <div className="tl-view-toggle">
            <button
              type="button"
              className={`tl-view-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => switchViewMode('week')}
            >
              Tuần
            </button>
            <button
              type="button"
              className={`tl-view-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => switchViewMode('month')}
            >
              Tháng
            </button>
          </div>

          {/* Period navigation */}
          <div className="tl-nav-group">
            <button type="button" className="tl-nav-btn" onClick={goPrev} title="Kỳ trước">
              <ChevronLeft size={17} />
            </button>
            <span className="tl-period-label">{periodLabel}</span>
            <button type="button" className="tl-nav-btn" onClick={goNext} title="Kỳ sau">
              <ChevronRight size={17} />
            </button>
          </div>

          {/* Today + Refresh */}
          <div className="tl-action-group">
            <button type="button" className="tl-today-btn" onClick={goToday}>
              Hôm nay
            </button>
            <button
              type="button"
              className="tl-refresh-btn"
              onClick={loadData}
              title="Làm mới dữ liệu"
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? 'tl-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Status Legend ── */}
      <div className="timeline-legend-bar">
        <span className="legend-title">Trạng thái:</span>
        <LegendItem color="#f8fafc" label="Trống" bordered />
        <LegendItem color="#3b82f6" label="Đã xác nhận" textColor="#fff" />
        <LegendItem color="#10b981" label="Đang lưu trú" textColor="#fff" />
        <LegendItem color="#f59e0b" label="Dọn dẹp" textColor="#fff" />
        <LegendItem color="#ef4444" label="Bảo trì" textColor="#fff" />
        <LegendItem color="#64748b" label="Đang ở (Occupied)" textColor="#fff" />
      </div>

      {/* ── Grid Area ── */}
      {loading ? (
        <LoadingSpinner text="Đang tải timeline phòng..." />
      ) : error ? (
        <div className="timeline-error-state">
          <span>⚠️</span>
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={loadData} style={{ marginTop: '1rem' }}>
            Thử lại
          </button>
        </div>
      ) : rooms.length === 0 ? (
        <div className="timeline-empty-state">
          <span>🏨</span>
          <p>Chưa có phòng nào trong hệ thống.</p>
        </div>
      ) : (
        <TimelineGrid
          rooms={rooms}
          days={visibleDays}
          segments={timelineSegments}
          viewMode={viewMode}
        />
      )}
    </div>
  );
}

// ── Legend item sub-component ────────────────────────────────────────────────
function LegendItem({ color, label, textColor = '#1e293b', bordered = false }) {
  return (
    <div className="legend-item">
      <span
        className="legend-swatch"
        style={{
          backgroundColor: color,
          border: bordered ? '1px solid #cbd5e1' : `1px solid ${color}`,
        }}
      />
      <span className="legend-label" style={{ color: '#334155' }}>{label}</span>
    </div>
  );
}
