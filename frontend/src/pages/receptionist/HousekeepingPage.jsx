import React, { useState, useEffect } from 'react';
import { roomService } from '../../services/roomService';
import { RoomStatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';

export function HousekeepingPage() {
  const { showToast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatusTab, setActiveStatusTab] = useState('ALL');
  const [updatingId, setUpdatingId] = useState(null);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await roomService.getRooms({
        status: activeStatusTab === 'ALL' ? undefined : activeStatusTab,
      });
      setRooms(data);
    } catch (err) {
      showToast(err.message || 'Lỗi tải danh sách phòng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [activeStatusTab]);

  const handleUpdateStatus = async (roomId, newStatus, message) => {
    setUpdatingId(roomId);
    try {
      await roomService.updateRoomStatus(roomId, newStatus);
      showToast(message, 'success');
      loadRooms();
    } catch (err) {
      showToast(err.message || 'Cập nhật trạng thái thất bại', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Group rooms by floor
  const roomsByFloor = rooms.reduce((acc, r) => {
    acc[r.floor] = acc[r.floor] || [];
    acc[r.floor].push(r);
    return acc;
  }, {});

  const statusTabs = [
    { key: 'ALL', label: 'Tất cả phòng' },
    { key: 'AVAILABLE', label: 'Sẵn sàng đón khách' },
    { key: 'OCCUPIED', label: 'Đang có khách' },
    { key: 'CLEANING', label: 'Đang dọn dẹp (Cleaning)' },
    { key: 'MAINTENANCE', label: 'Đang bảo trì' },
  ];

  return (
    <div className="housekeeping-page-container">
      <div className="page-header-row">
        <div>
          <h1>Quản Lý Trạng Thái Buồng Phòng & Dọn Dẹp</h1>
          <p>Theo dõi sơ đồ phòng vật lý thời gian thực, xác nhận phòng đã dọn xong sau Check-out</p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="filter-tabs-bar">
        {statusTabs.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${activeStatusTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveStatusTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner text="Đang tải sơ đồ buồng phòng..." />
      ) : (
        <div className="floors-container">
          {Object.keys(roomsByFloor)
            .sort((a, b) => Number(a) - Number(b))
            .map((floor) => (
              <div key={floor} className="floor-section">
                <div className="floor-header">
                  <span className="floor-badge">🏢 TẦNG {floor}</span>
                  <span className="floor-count">{roomsByFloor[floor].length} phòng</span>
                </div>

                <div className="rooms-board-grid">
                  {roomsByFloor[floor].map((room) => {
                    const isUpdating = updatingId === room.id;

                    return (
                      <div key={room.id} className={`room-status-card status-${room.status.toLowerCase()}`}>
                        <div className="card-top">
                          <div className="room-number">Phòng {room.roomNumber}</div>
                          <RoomStatusBadge status={room.status} />
                        </div>

                        <div className="room-type-name">{room.roomTypeName}</div>

                        <div className="card-action-footer">
                          {/* Housekeeping completion action */}
                          {room.status === 'CLEANING' && (
                            <button
                              className="btn-cleaned-action"
                              disabled={isUpdating}
                              onClick={() =>
                                handleUpdateStatus(
                                  room.id,
                                  'AVAILABLE',
                                  `Phòng ${room.roomNumber} đã dọn xong và sẵn sàng đón khách mới!`
                                )
                              }
                            >
                              {isUpdating ? 'Đang cập nhật...' : '🧹 Đã dọn xong → Sẵn sàng'}
                            </button>
                          )}

                          {/* Set to maintenance */}
                          {room.status === 'AVAILABLE' && (
                            <button
                              className="btn-maintenance-action"
                              disabled={isUpdating}
                              onClick={() =>
                                handleUpdateStatus(
                                  room.id,
                                  'MAINTENANCE',
                                  `Đã chuyển phòng ${room.roomNumber} sang trạng thái bảo trì.`
                                )
                              }
                            >
                              🔧 Báo bảo trì
                            </button>
                          )}

                          {/* Restore from maintenance */}
                          {room.status === 'MAINTENANCE' && (
                            <button
                              className="btn-restore-action"
                              disabled={isUpdating}
                              onClick={() =>
                                handleUpdateStatus(
                                  room.id,
                                  'AVAILABLE',
                                  `Phòng ${room.roomNumber} đã hoàn tất bảo trì và sẵn sàng hoạt động!`
                                )
                              }
                            >
                              ✓ Kích hoạt lại
                            </button>
                          )}

                          {room.status === 'OCCUPIED' && (
                            <div className="guest-in-house-hint">
                              Khách đang lưu trú tại phòng
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
