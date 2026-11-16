// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - MENU ITEMS MOCK DATA (SPRINT 4)
// File: src/mock/menuMock.ts
// =============================================================================

import { MenuItem } from '../types/roomService';

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  // Khai vị
  {
    id: 1,
    itemCode: 'KV-001',
    name: 'Súp Hải Sản Hoàng Gia Grand Aurora',
    category: 'Khai vị',
    unit: 'Tô',
    price: 185000,
    status: 'AVAILABLE',
    description: 'Súp bào ngư, tôm tươi, sò điệp và nấm đông cô ninh nước dùng thanh ngọt.',
    imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-11-01T08:00:00+07:00',
    updatedAt: '2026-11-15T10:30:00+07:00',
  },
  {
    id: 2,
    itemCode: 'KV-002',
    name: 'Salad Cá Hồi Na Uy Xông Khói',
    category: 'Khai vị',
    unit: 'Dĩa',
    price: 165000,
    status: 'AVAILABLE',
    description: 'Rau rocket Đà Lạt, cá hồi xông khói Na Uy, quả bơ sáp và sốt chanh leo chua ngọt.',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-11-01T08:15:00+07:00',
    updatedAt: '2026-11-12T14:20:00+07:00',
  },
  {
    id: 3,
    itemCode: 'KV-003',
    name: 'Gỏi Ngó Sen Tôm Thịt Cung Đình',
    category: 'Khai vị',
    unit: 'Dĩa',
    price: 145000,
    status: 'AVAILABLE',
    description: 'Ngó sen tươi giòn kèm tôm sú bóc vỏ, thịt ba chỉ luộc, đậu phộng rang giòn và nước mắm chua ngọt.',
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-11-02T09:00:00+07:00',
    updatedAt: '2026-11-10T11:00:00+07:00',
  },

  // Món chính
  {
    id: 4,
    itemCode: 'MC-001',
    name: 'Bò Wagyu A5 Áp Chảo Sốt Tiêu Đen Phú Quốc',
    category: 'Món chính',
    unit: 'Phần',
    price: 680000,
    status: 'AVAILABLE',
    description: 'Bò Wagyu vân mỡ cẩm thạch mềm tan, dùng kèm măng tây áp chảo và khoai tây nghiền bơ Pháp.',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-11-01T09:30:00+07:00',
    updatedAt: '2026-11-14T16:45:00+07:00',
  },
  {
    id: 5,
    itemCode: 'MC-002',
    name: 'Phở Bò Thượng Hạng Thố Đá Grand Aurora',
    category: 'Món chính',
    unit: 'Tô',
    price: 220000,
    status: 'AVAILABLE',
    description: 'Bánh phở tươi, nước dùng xương bò hầm 24 tiếng trong thố đá giữ nóng, nạm gầu giòn và bò tái tươi.',
    imageUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-11-01T10:00:00+07:00',
    updatedAt: '2026-11-13T08:30:00+07:00',
  },
  {
    id: 6,
    itemCode: 'MC-003',
    name: 'Cá Hồi Na Uy Nướng Sốt Bơ Tỏi Chanh Vàng',
    category: 'Món chính',
    unit: 'Phần',
    price: 340000,
    status: 'AVAILABLE',
    description: 'Filet cá hồi tươi nướng vừa chín tới, sốt bơ chanh vàng kiểu Pháp, phục vụ kèm rau củ hấp bơ tỏi.',
    imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-11-02T11:00:00+07:00',
    updatedAt: '2026-11-15T09:15:00+07:00',
  },
  {
    id: 7,
    itemCode: 'MC-004',
    name: 'Cơm Chiên Hải Sản Hoàng Bào Trứng Muối',
    category: 'Món chính',
    unit: 'Dĩa',
    price: 195000,
    status: 'AVAILABLE',
    description: 'Hạt cơm dẻo vàng óng phủ sốt trứng muối bùi béo, tôm sú tươi, mực lá và chả lụa thượng hạng.',
    imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-11-03T10:30:00+07:00',
    updatedAt: '2026-11-12T15:00:00+07:00',
  },
  {
    id: 8,
    itemCode: 'MC-005',
    name: 'Mì Ý Tôm Hùm Baby Sốt Cà Chua Húng Quế',
    category: 'Món chính',
    unit: 'Dĩa',
    price: 450000,
    status: 'UNAVAILABLE', // Ví dụ món đang tạm ngừng bán
    description: 'Mì dẹt Ý xào nửa con tôm hùm baby tươi, sốt marinara cà chua tươi và phô mai Parmesan bào mịn.',
    imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-11-03T11:30:00+07:00',
    updatedAt: '2026-11-16T08:00:00+07:00',
  },

  // Ăn nhẹ 24/7 (Phục vụ mọi thời điểm ngày và đêm)
  {
    id: 9,
    itemCode: 'AN-001',
    name: 'Club Sandwich 3 Tầng Gà Hun Khói & Trứng Ốp La (24/7)',
    category: 'Ăn nhẹ 24/7',
    unit: 'Phần',
    price: 155000,
    status: 'AVAILABLE',
    description: 'Bánh mì nướng giòn 3 lớp, ức gà xông khói, phô mai Cheddar, thịt xông khói, trứng ốp la kèm khoai tây chiên giòn.',
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-11-01T00:00:00+07:00',
    updatedAt: '2026-11-16T00:00:00+07:00',
  },
  {
    id: 10,
    itemCode: 'AN-002',
    name: 'Mì Gói Bò Mỹ Thượng Hạng Đêm Khuya 24/7',
    category: 'Ăn nhẹ 24/7',
    unit: 'Tô',
    price: 135000,
    status: 'AVAILABLE',
    description: 'Mì nước nóng hổi phục vụ 24/7 kèm thăn bò Mỹ thái lát, trứng gà lòng đào, rau cải thìa và sốt sa tế tôm cay nồng.',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-11-01T01:00:00+07:00',
    updatedAt: '2026-11-15T23:30:00+07:00',
  },
  {
    id: 11,
    itemCode: 'AN-003',
    name: 'Cháo Gà Hạt Sen Bổ Dưỡng 24/7',
    category: 'Ăn nhẹ 24/7',
    unit: 'Tô',
    price: 125000,
    status: 'AVAILABLE',
    description: 'Cháo hoa ninh nhừ từ nước hầm gà ta, thịt ức gà xé phay, hạt sen Huế bùi bở, hành phi và tiêu Phú Quốc.',
    imageUrl: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-11-01T02:00:00+07:00',
    updatedAt: '2026-11-14T22:00:00+07:00',
  },
  {
    id: 12,
    itemCode: 'AN-004',
    name: 'Khoai Tây Chiên Giòn Truffle Sốt Phô Mai',
    category: 'Ăn nhẹ 24/7',
    unit: 'Phần',
    price: 115000,
    status: 'AVAILABLE',
    description: 'Khoai tây sợi vàng ruộm lắc dầu nấm truffle thơm lừng, chấm sốt phô mai cheddar ấm nóng.',
    imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-11-02T14:00:00+07:00',
    updatedAt: '2026-11-11T16:00:00+07:00',
  },

  // Tráng miệng
  {
    id: 13,
    itemCode: 'TM-001',
    name: 'Bánh Tiramisu Truyền Thống Ý',
    category: 'Tráng miệng',
    unit: 'Phần',
    price: 95000,
    status: 'AVAILABLE',
    description: 'Bánh quy Savoiardi thấm đượm espresso, phô mai Mascarpone mềm mượt và lớp bột ca cao đắng nguyên chất.',
    imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-11-01T15:00:00+07:00',
    updatedAt: '2026-11-10T14:00:00+07:00',
  },
  {
    id: 14,
    itemCode: 'TM-002',
    name: 'Đĩa Trái Cây Nhiệt Đới Tứ Thời Grand Aurora',
    category: 'Tráng miệng',
    unit: 'Dĩa',
    price: 120000,
    status: 'AVAILABLE',
    description: 'Dưa hấu, thanh long ruột đỏ, dưa lưới, xoài cát Hòa Lộc và dâu tây Đà Lạt cắt tỉa nghệ thuật.',
    imageUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-11-02T16:00:00+07:00',
    updatedAt: '2026-11-13T10:00:00+07:00',
  },

  // Đồ uống
  {
    id: 15,
    itemCode: 'DU-001',
    name: 'Nước Ép Cam Tươi Sành Mọng',
    category: 'Đồ uống',
    unit: 'Ly',
    price: 65000,
    status: 'AVAILABLE',
    description: '100% cam tươi vắt nguyên chất, không pha đường hóa học, dồi dào Vitamin C.',
    imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-11-01T07:00:00+07:00',
    updatedAt: '2026-11-15T08:00:00+07:00',
  },
  {
    id: 16,
    itemCode: 'DU-002',
    name: 'Cà Phê Sữa Đá Sài Gòn Thượng Hạng',
    category: 'Đồ uống',
    unit: 'Ly',
    price: 55000,
    status: 'AVAILABLE',
    description: 'Hạt Arabica & Robusta Cầu Đất rang mộc pha phin truyền thống hòa quyện cùng sữa đặc béo ngậy.',
    imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-11-01T06:30:00+07:00',
    updatedAt: '2026-11-16T07:00:00+07:00',
  },
  {
    id: 17,
    itemCode: 'DU-003',
    name: 'Trà Hoa Cúc Mật Ong Rừng Ấm Nóng (Đêm)',
    category: 'Đồ uống',
    unit: 'Ấm',
    price: 75000,
    status: 'AVAILABLE',
    description: 'Hoa cúc vàng sấy lạnh ủ mật ong hoa rừng nguyên chất, xoa dịu thần kinh giúp giấc ngủ sâu lắng.',
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-11-02T19:00:00+07:00',
    updatedAt: '2026-11-15T21:00:00+07:00',
  },
  {
    id: 18,
    itemCode: 'DU-004',
    name: 'Nước Khoáng Tinh Khiết Có Ga Perrier (330ml)',
    category: 'Đồ uống',
    unit: 'Chai',
    price: 65000,
    status: 'AVAILABLE',
    description: 'Nước khoáng thiên nhiên có ga nhập khẩu từ Pháp, ướp lạnh sẵn sàng phục vụ.',
    imageUrl: 'https://images.unsplash.com/photo-1560512823-829485b8bf24?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-11-03T14:00:00+07:00',
    updatedAt: '2026-11-12T11:00:00+07:00',
  },
];

const MENU_STORAGE_KEY = 'hbs_mock_menu_items';

export function getStoredMenuItems(): MenuItem[] {
  if (typeof window === 'undefined') return INITIAL_MENU_ITEMS;
  const raw = localStorage.getItem(MENU_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(INITIAL_MENU_ITEMS));
    return INITIAL_MENU_ITEMS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_MENU_ITEMS;
  }
}

export function saveStoredMenuItems(items: MenuItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(items));
}
