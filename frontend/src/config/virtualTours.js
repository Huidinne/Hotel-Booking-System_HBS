// =============================================================================
// HOTEL BOOKING SYSTEM - VIRTUAL TOUR 360 CONFIGURATION
// File: src/config/virtualTours.js
// Mapping Room Type ID (verified against MySQL database seed) -> Tour Scenes & Hotspots
// Room Type ID #1: Standard Single Room
// Room Type ID #2: Deluxe Double Room
// Room Type ID #3: Executive Suite Luxury
// =============================================================================

export const STANDARD_SINGLE_ROOM_TYPE_ID = 1;
export const DELUXE_ROOM_TYPE_ID = 2;
export const EXECUTIVE_SUITE_ROOM_TYPE_ID = 3;

export const virtualTours = {
  // 1. STANDARD SINGLE ROOM (ID = 1) - Hiện đại, City View
  [STANDARD_SINGLE_ROOM_TYPE_ID]: {
    roomTypeId: STANDARD_SINGLE_ROOM_TYPE_ID,
    roomTypeName: 'Standard Single Room',
    initialScene: 'entrance',
    scenes: {
      entrance: {
        id: 'entrance',
        title: 'Cửa phòng & Hành lang',
        panorama: '/assets/virtual-tours/standard-single/entrance.jpg',
        yaw: -105, // Quay thẳng nhìn vào cửa phòng đang mở ở bên trái
        pitch: -3,
        hfov: 100,
        hotspots: [
          {
            target: 'bedside',
            yaw: -115, // Cánh cửa mở bước vào phòng ngủ bên trái
            pitch: -7,
            label: 'Bước vào phòng ngủ',
          },
        ],
      },
      bedside: {
        id: 'bedside',
        title: 'Khu vực Giường ngủ',
        panorama: '/assets/virtual-tours/standard-single/bedside.jpg',
        yaw: 0, // Nhìn chính diện giường ngủ
        pitch: -4,
        hfov: 100,
        hotspots: [
          {
            target: 'bathroom',
            yaw: -55, // Cửa phòng tắm nằm ở bên trái giường ngủ
            pitch: -7,
            label: 'Vào phòng tắm',
          },
          {
            target: 'entrance',
            yaw: 62, // Cửa ra vào hành lang nằm ở bên phải giường ngủ
            pitch: -7,
            label: 'Ra cửa phòng',
          },
        ],
      },
      bathroom: {
        id: 'bathroom',
        title: 'Phòng tắm tiện nghi',
        panorama: '/assets/virtual-tours/standard-single/bathroom.jpg',
        yaw: 0, // Nhìn thẳng ra cửa phòng ngủ
        pitch: -4,
        hfov: 95,
        hotspots: [
          {
            target: 'bedside',
            yaw: 0, // Cửa chính diện quay lại phòng ngủ
            pitch: -7,
            label: 'Quay lại phòng ngủ',
          },
        ],
      },
    },
  },

  // 2. DELUXE DOUBLE ROOM (ID = 2) - Cổ điển hoàng gia châu Âu
  [DELUXE_ROOM_TYPE_ID]: {
    roomTypeId: DELUXE_ROOM_TYPE_ID,
    roomTypeName: 'Deluxe Double Room',
    initialScene: 'entrance',
    scenes: {
      entrance: {
        id: 'entrance',
        title: 'Sảnh hành lang hoàng gia',
        panorama: '/assets/virtual-tours/deluxe/entrance.jpg',
        yaw: -115, // Hướng nhìn vào cửa phòng Deluxe đang mở bên trái
        pitch: -3,
        hfov: 100,
        hotspots: [
          {
            target: 'bedside',
            yaw: -115, // Bước qua cửa vào phòng Deluxe
            pitch: -7,
            label: 'Bước vào phòng Deluxe',
          },
        ],
      },
      bedside: {
        id: 'bedside',
        title: 'Phòng ngủ & Sofa Deluxe',
        panorama: '/assets/virtual-tours/deluxe/bedside.jpg',
        yaw: 0, // Nhìn giường ngủ và sofa
        pitch: -3,
        hfov: 100,
        hotspots: [
          {
            target: 'bathroom',
            yaw: 55, // Cửa phòng tắm lớn nằm ở bên phải giường ngủ
            pitch: -7,
            label: 'Vào phòng tắm cao cấp',
          },
          {
            target: 'entrance',
            yaw: 85, // Cửa gỗ ra hành lang nằm ở bên phải
            pitch: -7,
            label: 'Ra sảnh hành lang',
          },
        ],
      },
      bathroom: {
        id: 'bathroom',
        title: 'Phòng tắm đá cẩm thạch',
        panorama: '/assets/virtual-tours/deluxe/bathroom.jpg',
        yaw: 0, // Nhìn bồn tắm nằm sang trọng
        pitch: -4,
        hfov: 95,
        hotspots: [
          {
            target: 'bedside',
            yaw: 85, // Cửa mở nhìn sang phòng ngủ nằm bên phải
            pitch: -7,
            label: 'Quay lại phòng ngủ',
          },
        ],
      },
    },
  },

  // 3. EXECUTIVE SUITE LUXURY (ID = 3) - Biệt thự resort gỗ nhiệt đới
  [EXECUTIVE_SUITE_ROOM_TYPE_ID]: {
    roomTypeId: EXECUTIVE_SUITE_ROOM_TYPE_ID,
    roomTypeName: 'Executive Suite Luxury',
    initialScene: 'entrance',
    scenes: {
      entrance: {
        id: 'entrance',
        title: 'Sảnh hiên Resort đón khách',
        panorama: '/assets/virtual-tours/executive-suite/entrance.jpg',
        yaw: -105, // Nhìn vào cửa lớn của căn Suite bên trái
        pitch: -3,
        hfov: 100,
        hotspots: [
          {
            target: 'bedside',
            yaw: -105, // Bước vào phòng Suite qua cửa lớn
            pitch: -7,
            label: 'Vào phòng Suite',
          },
        ],
      },
      bedside: {
        id: 'bedside',
        title: 'Phòng ngủ Suite Resort',
        panorama: '/assets/virtual-tours/executive-suite/bedside.jpg',
        yaw: -45, // Góc nhìn rộng giường đôi và bàn trà
        pitch: -4,
        hfov: 100,
        hotspots: [
          {
            target: 'bathroom',
            yaw: 15, // Lối đi vào phòng tắm nằm ở khoảng giữa lệch phải
            pitch: -6,
            label: 'Đến phòng tắm lộ thiên',
          },
          {
            target: 'entrance',
            yaw: 135, // Cửa mở ra sảnh hiên đón khách
            pitch: -7,
            label: 'Ra sảnh hiên ngoài',
          },
        ],
      },
      bathroom: {
        id: 'bathroom',
        title: 'Phòng tắm đá lộ thiên Suite',
        panorama: '/assets/virtual-tours/executive-suite/bathroom.jpg',
        yaw: 0, // Nhìn bồn tắm đá và vườn nhiệt đới
        pitch: -3,
        hfov: 95,
        hotspots: [
          {
            target: 'bedside',
            yaw: -135, // Cửa quay lại phòng ngủ nằm ở bên trái
            pitch: -7,
            label: 'Quay lại phòng ngủ',
          },
        ],
      },
    },
  },
};

/**
 * Kiểm tra xem loại phòng có Virtual Tour hay không
 * @param {number|string} roomTypeId
 * @returns {boolean}
 */
export function hasVirtualTour(roomTypeId) {
  if (!roomTypeId) return false;
  const numericId = Number(roomTypeId);
  return Boolean(virtualTours[numericId]);
}

/**
 * Lấy cấu hình Virtual Tour đã validate cho một loại phòng
 * @param {number|string} roomTypeId
 * @returns {object|null}
 */
export function getVirtualTourConfig(roomTypeId) {
  if (!roomTypeId) return null;
  const numericId = Number(roomTypeId);
  const tour = virtualTours[numericId];
  if (!tour || !tour.scenes || !tour.initialScene) return null;

  // Validate đảm bảo tất cả target của hotspots đều trỏ đến scene có thật
  const sceneKeys = Object.keys(tour.scenes);
  if (!sceneKeys.includes(tour.initialScene)) return null;

  for (const sceneKey of sceneKeys) {
    const scene = tour.scenes[sceneKey];
    if (!scene.panorama) return null;
    if (Array.isArray(scene.hotspots)) {
      for (const hs of scene.hotspots) {
        if (!hs.target || !sceneKeys.includes(hs.target)) {
          console.warn(`[VirtualTour] Hotspot target "${hs.target}" không tồn tại trong scene list của tour #${numericId}!`);
          return null;
        }
      }
    }
  }

  return tour;
}
