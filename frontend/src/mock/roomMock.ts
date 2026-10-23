// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - ROOM TYPES & PHYSICAL ROOMS MOCK DATA
// File: src/mock/roomMock.ts
// =============================================================================

import { Room, RoomType } from '../types/room';

export const MOCK_ROOM_TYPES: RoomType[] = [
  {
    id: 1,
    name: 'Standard Single Room',
    capacity: 1,
    basePrice: 500000,
    description: 'Phòng tiêu chuẩn 1 giường đơn (1.2m x 2m), trang bị điều hòa 2 chiều Inverter, bàn làm việc gọn gàng, TV LED 43 inch truyền hình cáp, tủ lạnh mini, wifi tốc độ cao 100Mbps và phòng tắm đứng nước nóng lạnh tiện nghi. Lựa chọn hoàn hảo cho khách đi công tác hoặc du lịch cá nhân.',
    isActive: true,
    images: [
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: ['Wifi tốc độ cao', 'Điều hòa 2 chiều', 'TV LED 43 inch', 'Nước nóng lạnh', 'Bàn làm việc', 'Tủ lạnh mini', 'Máy sấy tóc'],
  },
  {
    id: 2,
    name: 'Deluxe Double Room',
    capacity: 2,
    basePrice: 950000,
    description: 'Phòng Deluxe 1 giường đôi cỡ lớn King-size (1.8m x 2m) với nệm cao su non êm ái, ban công riêng ngắm toàn cảnh phố lung linh về đêm. Trang bị Smart TV 55 inch, minibar miễn phí trà & cafe hàng ngày, két sắt an toàn và phòng tắm lát đá marble sang trọng.',
    isActive: true,
    images: [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: ['Ban công hướng phố', 'Giường King-size', 'Smart TV 55 inch', 'Két sắt an toàn', 'Bàn làm việc cao cấp', 'Minibar & Trà cafe', 'Áo choàng & Dép'],
  },
  {
    id: 3,
    name: 'Executive Suite Luxury',
    capacity: 4,
    basePrice: 1800000,
    description: 'Căn hộ Suite hoàng gia đẳng cấp gồm phòng khách riêng biệt và 2 phòng ngủ sang trọng. Bồn tắm nằm thủy lực jacuzzi nhìn ra sông, quầy bar mini, máy pha cafe Nespresso, hệ thống âm thanh vòm cao cấp. Phù hợp cho kỳ nghỉ dưỡng thượng lưu của gia đình hoặc đối tác quan trọng.',
    isActive: true,
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: ['Bồn tắm Jacuzzi', '2 Phòng ngủ riêng', 'Phòng khách sang trọng', 'Máy pha cafe Nespresso', 'Tầm nhìn Panorama', 'Dịch vụ Butler 24/7', 'Bữa sáng Buffet miễn phí'],
  },
];

export const MOCK_ROOMS: Room[] = [
  { id: 1, roomNumber: '101', roomTypeId: 1, roomTypeName: 'Standard Single Room', floor: 1, status: 'OCCUPIED' },
  { id: 2, roomNumber: '102', roomTypeId: 1, roomTypeName: 'Standard Single Room', floor: 1, status: 'OCCUPIED' },
  { id: 3, roomNumber: '103', roomTypeId: 1, roomTypeName: 'Standard Single Room', floor: 1, status: 'AVAILABLE' },
  { id: 4, roomNumber: '201', roomTypeId: 2, roomTypeName: 'Deluxe Double Room', floor: 2, status: 'AVAILABLE' },
  { id: 5, roomNumber: '202', roomTypeId: 2, roomTypeName: 'Deluxe Double Room', floor: 2, status: 'AVAILABLE' },
  { id: 6, roomNumber: '203', roomTypeId: 2, roomTypeName: 'Deluxe Double Room', floor: 2, status: 'CLEANING' },
  { id: 7, roomNumber: '204', roomTypeId: 2, roomTypeName: 'Deluxe Double Room', floor: 2, status: 'AVAILABLE' },
  { id: 8, roomNumber: '301', roomTypeId: 3, roomTypeName: 'Executive Suite Luxury', floor: 3, status: 'AVAILABLE' },
  { id: 9, roomNumber: '302', roomTypeId: 3, roomTypeName: 'Executive Suite Luxury', floor: 3, status: 'AVAILABLE' },
  { id: 10, roomNumber: '303', roomTypeId: 3, roomTypeName: 'Executive Suite Luxury', floor: 3, status: 'MAINTENANCE' },
];
