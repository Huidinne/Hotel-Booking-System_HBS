import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { RoomStatusBadge } from '../../components/common/Badge';

export function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const summary = await dashboardService.getDashboardSummary();
      setData(summary);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Đang tải dữ liệu báo cáo thống kê..." />;
  }

  if (!data) return null;

  const totalRooms = Object.values(data.roomCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="admin-dashboard-container">
      <div className="page-header-row">
        <div>
          <h1>Dashboard Báo Cáo & Thống Kê Quản Trị</h1>
          <p>Kỳ báo cáo: Từ {data.dateFrom} đến {data.dateTo}</p>
        </div>
        <button className="btn-secondary" onClick={loadDashboard}>
          🔄 Làm mới số liệu
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-cards-grid">
        {/* Expected Revenue */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Doanh thu dự kiến</span>
            <span className="kpi-icon blue">📈</span>
          </div>
          <div className="kpi-value">
            {data.expectedRevenue.toLocaleString('vi-VN')} VNĐ
          </div>
          <div className="kpi-hint">
            Tổng giá trị các đơn <code>CONFIRMED</code> và <code>CHECKED_IN</code>
          </div>
        </div>

        {/* Actual Net Revenue */}
        <div className="kpi-card highlight-card">
          <div className="kpi-header">
            <span className="kpi-title">Doanh thu thực thu</span>
            <span className="kpi-icon green">💰</span>
          </div>
          <div className="kpi-value green-text">
            {data.actualRevenue.toLocaleString('vi-VN')} VNĐ
          </div>
          <div className="kpi-hint">
            Đã khấu trừ toàn bộ tiền cọc hoàn trả ({data.refundTotal.toLocaleString('vi-VN')} đ)
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Tỷ lệ lấp đầy phòng</span>
            <span className="kpi-icon purple">📊</span>
          </div>
          <div className="kpi-value purple-text">
            {Math.round(data.occupancyRate * 100)}%
          </div>
          <div className="kpi-hint">
            Dựa trên số phòng khai thác (loại trừ phòng bảo trì)
          </div>
        </div>

        {/* Total Bookings */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Tổng số đơn lưu trú</span>
            <span className="kpi-icon amber">🏨</span>
          </div>
          <div className="kpi-value">
            {data.totalBookings} đơn
          </div>
          <div className="kpi-hint">
            Gồm {data.confirmedBookings} đơn đã xác nhận cọc
          </div>
        </div>
      </div>

      {/* Room Structure & Distribution */}
      <div className="dashboard-charts-layout" style={{ marginTop: '2rem' }}>
        <div className="chart-card">
          <h3>Cơ cấu buồng phòng hiện tại ({totalRooms} phòng vật lý)</h3>
          <p className="chart-desc">Phân bổ trạng thái buồng phòng thời gian thực trong toàn khách sạn</p>

          <div className="room-distribution-bars">
            {/* AVAILABLE */}
            <div className="dist-row">
              <div className="dist-info">
                <RoomStatusBadge status="AVAILABLE" />
                <span className="dist-count">{data.roomCounts.AVAILABLE} phòng</span>
              </div>
              <div className="dist-bar-track">
                <div
                  className="dist-bar-fill green-fill"
                  style={{ width: `${(data.roomCounts.AVAILABLE / totalRooms) * 100}%` }}
                />
              </div>
            </div>

            {/* OCCUPIED */}
            <div className="dist-row">
              <div className="dist-info">
                <RoomStatusBadge status="OCCUPIED" />
                <span className="dist-count">{data.roomCounts.OCCUPIED} phòng</span>
              </div>
              <div className="dist-bar-track">
                <div
                  className="dist-bar-fill blue-fill"
                  style={{ width: `${(data.roomCounts.OCCUPIED / totalRooms) * 100}%` }}
                />
              </div>
            </div>

            {/* CLEANING */}
            <div className="dist-row">
              <div className="dist-info">
                <RoomStatusBadge status="CLEANING" />
                <span className="dist-count">{data.roomCounts.CLEANING} phòng</span>
              </div>
              <div className="dist-bar-track">
                <div
                  className="dist-bar-fill amber-fill"
                  style={{ width: `${(data.roomCounts.CLEANING / totalRooms) * 100}%` }}
                />
              </div>
            </div>

            {/* MAINTENANCE */}
            <div className="dist-row">
              <div className="dist-info">
                <RoomStatusBadge status="MAINTENANCE" />
                <span className="dist-count">{data.roomCounts.MAINTENANCE} phòng</span>
              </div>
              <div className="dist-bar-track">
                <div
                  className="dist-bar-fill red-fill"
                  style={{ width: `${(data.roomCounts.MAINTENANCE / totalRooms) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* System Architecture & Engine Card */}
        <div className="chart-card">
          <h3>Nguyên tắc Vận hành & Thiết kế Kỹ thuật</h3>
          <div className="tech-principles-list">
            <div className="principle-item">
              <strong>🔒 Chống Overbooking (Pessimistic Lock):</strong>
              <p>Khóa ghi mức dòng trên bản ghi Loại phòng bảo vệ quota khi nhiều khách đặt cùng lúc.</p>
            </div>
            <div className="principle-item">
              <strong>⏱ Giữ quota 15 phút (VNPay):</strong>
              <p>Hệ thống tự động hủy đơn và giải phóng quota nếu khách không thanh toán cọc trong 15 phút.</p>
            </div>
            <div className="principle-item">
              <strong>🛡️ Bảo mật Tài chính (NFR-06):</strong>
              <p>Số tài khoản ngân hàng của khách luôn được che khi hiển thị cho nhân viên vận hành.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
