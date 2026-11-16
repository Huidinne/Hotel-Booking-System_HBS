// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - ROOM INCIDENTS MOCK DATA (SPRINT 4)
// File: src/mock/incidentMock.ts
// =============================================================================

import { Incident } from '../types/incident';

export const INITIAL_INCIDENTS: Incident[] = [
  {
    id: 1,
    incidentCode: 'INC-20261116-01',
    roomId: 10,
    roomNumber: '303',
    bookingId: undefined,
    bookingCode: undefined,
    bookingRoomId: undefined,
    customerName: undefined,
    category: 'Hỏng điều hòa',
    title: 'Điều hòa chảy nước và phát tiếng kêu lớn',
    description: 'Điều hòa phòng 303 bị tắc ống thoát nước, chảy nước xuống thảm và quạt gió kêu to rung lắc. Đã ngắt điện và thông báo cho kỹ thuật kiểm tra cục lạnh.',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    blocksResale: true, // Chặn bán lại phòng vì phòng đang bảo trì
    reportedBy: 'Lễ tân - Nguyễn Thị Yến',
    assignedTo: 'Kỹ thuật - Trần Quốc Toản',
    createdAt: '2026-11-15T14:30:00+07:00',
    updatedAt: '2026-11-16T08:30:00+07:00',
    resolutionNote: 'Đang chờ linh kiện quạt gió thay thế từ nhà cung cấp Daikin.',
  },
  {
    id: 2,
    incidentCode: 'INC-20261116-02',
    roomId: 6,
    roomNumber: '203',
    bookingId: undefined,
    bookingCode: undefined,
    bookingRoomId: undefined,
    customerName: undefined,
    category: 'Điện nước / Rò rỉ',
    title: 'Vòi sen tắm rỉ nước nhẹ ở khớp nối',
    description: 'Vòi sen đứng trong nhà tắm rỉ nước nhẹ khi mở van nóng lạnh. Buồng phòng phát hiện trong lúc dọn dẹp (CLEANING).',
    priority: 'LOW',
    status: 'REPORTED',
    blocksResale: false, // Không chặn bán phòng vì rỉ nhẹ, sửa nhanh trong 15 phút
    reportedBy: 'Tổ buồng phòng - Lê Thị Mai',
    assignedTo: 'Kỹ thuật viên ca sáng',
    createdAt: '2026-11-16T09:15:00+07:00',
    updatedAt: '2026-11-16T09:15:00+07:00',
  },
  {
    id: 3,
    incidentCode: 'INC-20261116-03',
    roomId: 1,
    roomNumber: '101',
    bookingId: 1,
    bookingCode: 'BK-20261018-001',
    bookingRoomId: 'BR-101-01',
    customerName: 'Nguyễn Văn Khách',
    category: 'Thiết bị điện tử / TV',
    title: 'Remote TV hết pin / không nhận tín hiệu',
    description: 'Khách hàng phòng 101 báo điều khiển Smart TV trong phòng không bấm đổi kênh được.',
    priority: 'MEDIUM',
    status: 'RESOLVED',
    blocksResale: false, // Sự cố tiện ích nhỏ trong lúc khách lưu trú, không chặn bán phòng
    reportedBy: 'Lễ tân - Hoàng Nam',
    assignedTo: 'Lễ tân trực sảnh',
    createdAt: '2026-11-16T11:00:00+07:00',
    updatedAt: '2026-11-16T11:15:00+07:00',
    resolvedAt: '2026-11-16T11:15:00+07:00',
    resolutionNote: 'Đã thay 2 viên pin AAA Panasonic mới và kiểm tra các nút bấm hoạt động tốt.',
  },
  {
    id: 4,
    incidentCode: 'INC-20261116-04',
    roomId: 2,
    roomNumber: '102',
    bookingId: 1,
    bookingCode: 'BK-20261018-001',
    bookingRoomId: 'BR-102-01',
    customerName: 'Nguyễn Văn Khách (Khách đi cùng)',
    category: 'Khóa cửa / Thẻ từ',
    title: 'Đèn báo pin khóa từ chớp đỏ',
    description: 'Khóa cửa điện tử chớp đỏ cảnh báo pin yếu khi quẹt thẻ từ vào phòng. Khóa vẫn mở được nhưng cần thay pin sớm.',
    priority: 'MEDIUM',
    status: 'REPORTED',
    blocksResale: false,
    reportedBy: 'Lễ tân - Nguyễn Thị Yến',
    assignedTo: 'Kỹ thuật - Vũ Minh',
    createdAt: '2026-11-16T13:45:00+07:00',
    updatedAt: '2026-11-16T13:45:00+07:00',
  },
];

const INCIDENTS_STORAGE_KEY = 'hbs_mock_incidents';

export function getStoredIncidents(): Incident[] {
  if (typeof window === 'undefined') return INITIAL_INCIDENTS;
  const raw = localStorage.getItem(INCIDENTS_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(INITIAL_INCIDENTS));
    return INITIAL_INCIDENTS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_INCIDENTS;
  }
}

export function saveStoredIncidents(incidents: Incident[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(incidents));
}
