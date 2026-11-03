import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
  Filter,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { roomService } from '../../services/roomService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import { TimelineGrid } from '../../components/booking/TimelineGrid';
import { BookingQuickViewModal } from '../../components/booking/BookingQuickViewModal';
import { QuickCreateBookingModal } from '../../components/booking/QuickCreateBookingModal';

// ─── Date helpers (no external deps) ────────────────────────────────────────

/** Return YYYY-MM-DD string in local time (avoids UTC shift) */
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Get the Monday of the week containing `date` */
function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
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

const MONTH_LABELS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

// ─── Main Page Component ────────────────────────────────────────────────────

export function RoomTimelinePage() {
  const { showToast } = useToast();

  // View mode: 'week' | 'month'
  const [viewMode, setViewMode] = useState('week');

  // Anchor: for week = Monday date; for month = 1st of month
  const [anchor, setAnchor] = useState(() => getMondayOf(new Date()));

  // Data states
  const [allRooms, setAllRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [segments, setSegments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states (Task 4)
  const [selectedFloor, setSelectedFloor] = useState('ALL');
  const [selectedRoomType, setSelectedRoomType] = useState('ALL');

  // Quick View Modal state (Task 2)
  const [selectedBookingForQuickView, setSelectedBookingForQuickView] = useState(null);
  const [isQuickViewModalOpen, setIsQuickViewModalOpen] = useState(false);

  // Quick Create Booking Modal state (Task 3)
  const [selectedRoomForCreate, setSelectedRoomForCreate] = useState(null);
  const [selectedDateForCreate, setSelectedDateForCreate] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // ── Compute visible days from anchor + viewMode ──────────────────────────
  const visibleDays = useMemo(() => {
    if (viewMode === 'week') {
      return buildDateRange(anchor, 7);
    } else {
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

  // ── Load Room Timeline Data from Backend (Task 1) ──────────────────────────
  const loadData = useCallback(async () => {
    if (!visibleDays.length) return;

    const startStr = toLocalDateStr(visibleDays[0]);
    const endStr = toLocalDateStr(visibleDays[visibleDays.length - 1]);

    setLoading(true);
    setError(null);

    try {
      // Call roomService.getRoomTimeline(startDate, endDate) + fetch active room types
      const [timelineData, fetchedRoomTypes] = await Promise.all([
        roomService.getRoomTimeline(startStr, endStr),
        roomService.getRoomTypes().catch(() => []),
      ]);

      if (Array.isArray(fetchedRoomTypes) && fetchedRoomTypes.length > 0) {
        setRoomTypes(fetchedRoomTypes);
      }

      // Map backend timeline items to physical rooms and daily segment map
      const mappedRooms = [];
      const segMap = {};

      timelineData.forEach((item) => {
        mappedRooms.push({
          id: item.roomId,
          roomNumber: item.roomNumber,
          floor: item.floor,
          roomTypeId: item.roomTypeId,
          roomTypeName: item.roomTypeName,
          status: item.currentPhysicalStatus,
        });

        segMap[item.roomId] = {};
        if (Array.isArray(item.dailyStatuses)) {
          item.dailyStatuses.forEach((ds) => {
            segMap[item.roomId][ds.date] = ds;
          });
        }
      });

      setAllRooms(mappedRooms);
      setSegments(segMap);
    } catch (err) {
      const msg = err?.message || 'Không thể tải dữ liệu timeline từ máy chủ';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [visibleDays, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Extract Floors and Room Types for Filtering (Task 4) ───────────────────
  const availableFloors = useMemo(() => {
    const floorSet = new Set();
    allRooms.forEach((r) => {
      if (r.floor !== undefined && r.floor !== null) {
        floorSet.add(r.floor);
      }
    });
    return Array.from(floorSet).sort((a, b) => a - b);
  }, [allRooms]);

  const availableRoomTypes = useMemo(() => {
    if (roomTypes.length > 0) {
      return roomTypes;
    }
    const typeMap = new Map();
    allRooms.forEach((r) => {
      if (r.roomTypeId && !typeMap.has(r.roomTypeId)) {
        typeMap.set(r.roomTypeId, {
          id: r.roomTypeId,
          name: r.roomTypeName || `Loại phòng #${r.roomTypeId}`,
        });
      }
    });
    return Array.from(typeMap.values());
  }, [roomTypes, allRooms]);

  // ── Filter Rooms by Floor & Room Type (Task 4) ────────────────────────────
  // Filter runs in frontend without re-fetching API to ensure fast response & preserve dates
  const filteredRooms = useMemo(() => {
    return allRooms.filter((r) => {
      const matchFloor =
        selectedFloor === 'ALL' || r.floor === Number(selectedFloor);
      const matchType =
        selectedRoomType === 'ALL' || r.roomTypeId === Number(selectedRoomType);
      return matchFloor && matchType;
    });
  }, [allRooms, selectedFloor, selectedRoomType]);

  const handleResetFilters = () => {
    setSelectedFloor('ALL');
    setSelectedRoomType('ALL');
  };

  const isFilterActive = selectedFloor !== 'ALL' || selectedRoomType !== 'ALL';

  // ── Interaction Handlers (Task 2 & Task 3) ─────────────────────────────────
  const handleBookingClick = useCallback((bookingData, room, dateStr) => {
    setSelectedBookingForQuickView({
      ...bookingData,
      roomNumber: room.roomNumber,
      roomTypeName: room.roomTypeName,
      floor: room.floor,
      clickedDate: dateStr,
    });
    setIsQuickViewModalOpen(true);
  }, []);

  const handleAvailableClick = useCallback((room, dateStr) => {
    setSelectedRoomForCreate(room);
    setSelectedDateForCreate(dateStr);
    setIsCreateModalOpen(true);
  }, []);

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
            Bảng tổng quan trạng thái phòng theo ngày · PMS Calendar Matrix View
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
              title="Làm mới dữ liệu từ máy chủ"
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? 'tl-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar (Minimalist Luxury) ── */}
      <div className="timeline-filter-toolbar">
        <div className="tl-filter-group">
          {/* Floor filter */}
          <div className="tl-filter-item">
            <Filter size={14} className="tl-filter-icon" />
            <span>Tầng:</span>
            <select
              className="tl-filter-select"
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              aria-label="Lọc theo tầng"
            >
              <option value="ALL">Tất cả tầng</option>
              {availableFloors.map((floor) => (
                <option key={floor} value={floor}>
                  Tầng {floor}
                </option>
              ))}
            </select>
          </div>

          {/* Room type filter */}
          <div className="tl-filter-item">
            <Layers size={14} className="tl-filter-icon" />
            <span>Loại phòng:</span>
            <select
              className="tl-filter-select"
              value={selectedRoomType}
              onChange={(e) => setSelectedRoomType(e.target.value)}
              aria-label="Lọc theo loại phòng"
            >
              <option value="ALL">Tất cả loại phòng</option>
              {availableRoomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters button */}
          {isFilterActive && (
            <button
              type="button"
              className="tl-filter-reset-btn"
              onClick={handleResetFilters}
              title="Đặt lại bộ lọc về tất cả phòng"
            >
              <RotateCcw size={13} />
              <span>Đặt lại</span>
            </button>
          )}
        </div>

        {/* Filter count summary */}
        <div className="tl-filter-summary">
          Hiển thị: <strong className="tl-summary-highlight">{filteredRooms.length}</strong> / {allRooms.length} phòng
        </div>
      </div>

      {/* ── Status Legend (Flat Minimalist Luxury) ── */}
      <div className="timeline-legend-bar">
        <span className="legend-title">Chú thích:</span>
        <div className="legend-badges-list">
          <LegendBadge dotColor="#94A3B8" bgColor="#FFFFFF" textColor="#475569" label="Trống (Click để đặt)" borderColor="#E2E8F0" />
          <LegendBadge dotColor="#10B981" bgColor="#ECFDF5" textColor="#047857" label="Đang lưu trú" borderColor="#A7F3D0" />
          <LegendBadge dotColor="#0284C7" bgColor="#F0F9FF" textColor="#0369A1" label="Đã xác nhận" borderColor="#BAE6FD" />
          <LegendBadge dotColor="#F59E0B" bgColor="#FEF3C7" textColor="#B45309" label="Chờ xác nhận" borderColor="#FDE68A" />
          <LegendBadge dotColor="#D97706" bgColor="#FFFBEB" textColor="#92400E" label="Dọn dẹp" borderColor="#FDE68A" />
          <LegendBadge dotColor="#EF4444" bgColor="#FEF2F2" textColor="#991B1B" label="Bảo trì" borderColor="#FECACA" />
          <LegendBadge dotColor="#64748B" bgColor="#F1F5F9" textColor="#475569" label="Đã trả phòng" borderColor="#E2E8F0" />
        </div>
      </div>

      {/* ── Grid Area ── */}
      {loading ? (
        <LoadingSpinner text="Đang tải lịch phòng timeline..." />
      ) : error ? (
        <div className="timeline-error-state">
          <span>⚠️</span>
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={loadData} style={{ marginTop: '1rem' }}>
            Thử lại
          </button>
        </div>
      ) : allRooms.length === 0 ? (
        <div className="timeline-empty-state">
          <span>🏨</span>
          <p>Chưa có dữ liệu phòng nào trong hệ thống.</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="timeline-empty-state">
          <span style={{ fontSize: '2.5rem' }}>🔍</span>
          <p style={{ fontWeight: 700, color: '#0F1E36' }}>
            Không tìm thấy phòng nào phù hợp với bộ lọc đã chọn.
          </p>
          <p style={{ fontSize: '0.82rem', color: '#64748B' }}>
            Vui lòng thử chọn tầng hoặc loại phòng khác, hoặc nhấn đặt lại bộ lọc.
          </p>
          <button
            type="button"
            className="btn-secondary-sm"
            onClick={handleResetFilters}
            style={{ marginTop: '0.5rem' }}
          >
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        <TimelineGrid
          rooms={filteredRooms}
          days={visibleDays}
          segments={segments}
          viewMode={viewMode}
          onBookingClick={handleBookingClick}
          onAvailableClick={handleAvailableClick}
        />
      )}

      {/* ── Quick View Booking Modal (Task 2) ── */}
      <BookingQuickViewModal
        isOpen={isQuickViewModalOpen}
        onClose={() => {
          setIsQuickViewModalOpen(false);
          setSelectedBookingForQuickView(null);
        }}
        booking={selectedBookingForQuickView}
      />

      {/* ── Quick Create Booking Modal (Task 3) ── */}
      <QuickCreateBookingModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedRoomForCreate(null);
        }}
        room={selectedRoomForCreate}
        initialDate={selectedDateForCreate}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}

// ── Flat Legend Badge sub-component (Minimalist Luxury) ──────────────────────
function LegendBadge({ dotColor, bgColor, textColor, label, borderColor }) {
  return (
    <div
      className="legend-badge"
      style={{
        backgroundColor: bgColor || '#FFFFFF',
        borderColor: borderColor || '#E8EAF0',
      }}
    >
      <span
        className="legend-dot"
        style={{
          backgroundColor: dotColor,
        }}
      />
      <span className="legend-label" style={{ color: textColor || '#475569' }}>
        {label}
      </span>
    </div>
  );
}
