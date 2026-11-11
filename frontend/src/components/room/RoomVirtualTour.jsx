import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Maximize2, Minimize2, X, Compass, CalendarCheck } from 'lucide-react';
import { getVirtualTourConfig } from '../../config/virtualTours';
import './RoomVirtualTour.css';

/**
 * RoomVirtualTour Component
 * Tích hợp Multi-scene 360° Panorama Viewer cho phòng khách sạn qua Pannellum.
 *
 * @param {boolean} isOpen - Trạng thái hiển thị modal
 * @param {function} onClose - Callback đóng modal
 * @param {object} roomType - Thông tin loại phòng hiện tại
 * @param {function} onProceedToBooking - Callback chuyển sang luồng Booking hiện có
 * @param {boolean} bookingDisabled - Trạng thái disable nút đặt phòng (nếu hết phòng)
 */
export function RoomVirtualTour({
  isOpen,
  onClose,
  roomType,
  onProceedToBooking,
  bookingDisabled = false,
}) {
  const viewerContainerRef = useRef(null);
  const modalRef = useRef(null);
  const viewerInstanceRef = useRef(null);

  const [tourConfig, setTourConfig] = useState(null);
  const [currentScene, setCurrentScene] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Kiểm tra và lấy cấu hình tour theo roomType.id
  useEffect(() => {
    if (!isOpen || !roomType) return;
    const config = getVirtualTourConfig(roomType.id);
    if (!config) {
      setErrorMessage(`Loại phòng #${roomType.id} chưa có dữ liệu Virtual Tour 360°.`);
      setTourConfig(null);
      setLoading(false);
      return;
    }
    setTourConfig(config);
    setCurrentScene(config.initialScene);
    setErrorMessage(null);
  }, [isOpen, roomType]);

  // 2. Cleanup viewer helper
  const destroyViewer = useCallback(() => {
    if (viewerInstanceRef.current) {
      try {
        viewerInstanceRef.current.destroy();
      } catch (err) {
        console.warn('[RoomVirtualTour] Viewer destroy warning:', err);
      }
      viewerInstanceRef.current = null;
    }
    if (viewerContainerRef.current) {
      viewerContainerRef.current.innerHTML = '';
    }
  }, []);

  // 3. Khởi tạo Pannellum viewer (Lazy-load package)
  const initViewer = useCallback(async () => {
    if (!tourConfig || !viewerContainerRef.current) return;

    setLoading(true);
    setErrorMessage(null);
    destroyViewer();

    try {
      // Lazy load pannellum styles & script
      await import('pannellum/build/pannellum.css');
      await import('pannellum/build/pannellum.js');

      if (!window.pannellum || !viewerContainerRef.current) {
        throw new Error('Thư viện Pannellum không thể khởi tạo.');
      }

      // Chuẩn hóa danh sách scenes cho Pannellum
      const pannellumScenes = {};
      Object.entries(tourConfig.scenes).forEach(([sceneKey, scene]) => {
        pannellumScenes[sceneKey] = {
          title: scene.title,
          hfov: scene.hfov || 100,
          pitch: scene.pitch || 0,
          yaw: scene.yaw || 0,
          type: 'equirectangular',
          panorama: scene.panorama,
          hotSpots: (scene.hotspots || []).map((hs) => ({
            pitch: hs.pitch,
            yaw: hs.yaw,
            type: 'scene',
            text: hs.label,
            sceneId: hs.target,
            clickHandlerFunc: () => {
              if (viewerInstanceRef.current) {
                try {
                  viewerInstanceRef.current.loadScene(hs.target);
                } catch (e) {
                  console.warn('[RoomVirtualTour] Chuyển scene thất bại:', e);
                }
              }
            },
          })),
        };
      });

      const pConfig = {
        default: {
          firstScene: tourConfig.initialScene,
          author: 'Grand Aurora Resort',
          sceneFadeDuration: 600,
          autoLoad: true,
          compass: false,
          showControls: true,
          showFullscreenCtrl: false, // Dùng nút fullscreen tùy chỉnh đồng bộ với modal
          showZoomCtrl: true,
          mouseZoom: true,
          touchPan: true,
          draggable: true,
          autoRotate: 0,
          strings: {
            loadButtonLabel: 'Nhấn để tải toàn cảnh',
            loadingLabel: 'Đang tải toàn cảnh...',
            genericWebGLError: 'Thiết bị hoặc trình duyệt của bạn không hỗ trợ WebGL.',
          },
        },
        scenes: pannellumScenes,
      };

      const viewer = window.pannellum.viewer(viewerContainerRef.current, pConfig);
      viewerInstanceRef.current = viewer;

      viewer.on('load', () => {
        setLoading(false);
        setErrorMessage(null);
      });

      viewer.on('scenechange', (newSceneId) => {
        setCurrentScene(newSceneId);
        setLoading(true);
      });

      viewer.on('error', (err) => {
        console.error('[RoomVirtualTour] Pannellum load error:', err);
        setErrorMessage('Không thể tải ảnh không gian 360°. Vui lòng thử lại sau.');
        setLoading(false);
      });
    } catch (err) {
      console.error('[RoomVirtualTour] Khởi tạo thất bại:', err);
      setErrorMessage(err.message || 'Lỗi khi khởi chạy trình xem Virtual Tour 360°.');
      setLoading(false);
    }
  }, [tourConfig, destroyViewer]);

  // Khởi tạo viewer khi tourConfig và DOM đã sẵn sàng
  useEffect(() => {
    if (isOpen && tourConfig) {
      // Đợi render chu kỳ tiếp theo để DOM container sẵn sàng kích thước
      const timer = setTimeout(() => {
        initViewer();
      }, 50);
      return () => {
        clearTimeout(timer);
        destroyViewer();
      };
    }
    return () => {
      destroyViewer();
    };
  }, [isOpen, tourConfig, initViewer, destroyViewer]);

  // 4. Xử lý ESC key và lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isFullscreen]);

  // 5. Đồng bộ sự kiện fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (viewerInstanceRef.current) {
        setTimeout(() => {
          viewerInstanceRef.current?.resize();
        }, 150);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!modalRef.current) return;
    if (!document.fullscreenElement) {
      modalRef.current.requestFullscreen?.().catch((err) => {
        console.warn('Không thể bật toàn màn hình:', err);
      });
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // 6. Chuyển scene trực tiếp từ tab navigation
  const handleSceneSelect = (sceneKey) => {
    if (!viewerInstanceRef.current || sceneKey === currentScene) return;
    try {
      viewerInstanceRef.current.loadScene(sceneKey);
    } catch (e) {
      console.warn('[RoomVirtualTour] Chuyển scene thất bại:', e);
    }
  };

  // 7. Xử lý khi nhấn nút Đặt phòng
  const handleBookingClick = () => {
    onClose();
    if (typeof onProceedToBooking === 'function') {
      onProceedToBooking();
    }
  };

  if (!isOpen) return null;

  const scenesList = tourConfig ? Object.entries(tourConfig.scenes) : [];
  const currentSceneTitle =
    tourConfig?.scenes?.[currentScene]?.title || 'Không gian phòng';

  return (
    <div className="virtual-tour-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className={`virtual-tour-modal ${isFullscreen ? 'is-fullscreen' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="360 Virtual Tour"
      >
        {/* Top Header */}
        <div className="virtual-tour-header">
          <div className="virtual-tour-header-left">
            <h3 className="virtual-tour-title">
              <Compass size={20} className="gold-accent" />
              <span>
                360° Tour: <span className="gold-accent">{roomType?.name}</span>
              </span>
            </h3>
            <span className="virtual-tour-demo-tag">
              Ảnh minh họa 360°, không đại diện phòng thực tế
            </span>
          </div>

          <div className="virtual-tour-header-actions">
            <button
              className="virtual-tour-btn-icon"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              className="virtual-tour-btn-close"
              onClick={onClose}
              title="Đóng tour 360° (Esc)"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Viewer Canvas Body */}
        <div className="virtual-tour-body">
          <div
            ref={viewerContainerRef}
            className="virtual-tour-canvas-container"
          />

          {/* Floating Hint */}
          {!loading && !errorMessage && (
            <div className="virtual-tour-floating-hint">
              <span>🖱️ Kéo để xoay 360° • Cuộn chuột để zoom • Nhấp hotspot để di chuyển</span>
            </div>
          )}

          {/* Loading Overlay */}
          {loading && !errorMessage && (
            <div className="virtual-tour-loading-overlay">
              <div className="virtual-tour-spinner" />
              <p>Đang tải không gian 360° ({currentSceneTitle})...</p>
            </div>
          )}

          {/* Error Fallback */}
          {errorMessage && (
            <div className="virtual-tour-error-overlay">
              <div className="virtual-tour-error-icon">⚠️</div>
              <div className="virtual-tour-error-title">
                Không thể tải chuyến tham quan 360°
              </div>
              <div className="virtual-tour-error-desc">{errorMessage}</div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="virtual-tour-btn-retry"
                  onClick={initViewer}
                >
                  Thử lại
                </button>
                <button
                  className="virtual-tour-btn-retry"
                  style={{ background: '#334155', color: '#f8fafc' }}
                  onClick={onClose}
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation & Booking Bar */}
        <div className="virtual-tour-footer">
          <div className="virtual-tour-scenes-list">
            {scenesList.map(([key, sc]) => (
              <button
                key={key}
                className={`virtual-tour-scene-pill ${key === currentScene ? 'active' : ''}`}
                onClick={() => handleSceneSelect(key)}
              >
                <span>📍 {sc.title}</span>
              </button>
            ))}
          </div>

          <div className="virtual-tour-footer-right">
            <button
              className="virtual-tour-btn-book"
              disabled={bookingDisabled}
              onClick={handleBookingClick}
              title="Đặt phòng loại này với thời gian đã chọn"
            >
              <CalendarCheck size={18} />
              <span>Đặt phòng này</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default RoomVirtualTour;
