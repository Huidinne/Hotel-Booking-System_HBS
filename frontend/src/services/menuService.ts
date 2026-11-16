// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - MENU SERVICE (SPRINT 4)
// File: src/services/menuService.ts
// Handles Menu Items for Admin and Room Service.
// Currently uses Mock Service with LocalStorage persistence, structured for easy
// seamless switch to real Spring Boot backend API when official DTOs are ready.
// =============================================================================

import {
  CreateMenuItemRequest,
  MenuItem,
  MenuItemStatus,
  UpdateMenuItemRequest,
} from '../types/roomService';
import {
  INITIAL_MENU_ITEMS,
  getStoredMenuItems,
  saveStoredMenuItems,
} from '../mock/menuMock';

const SIMULATE_LATENCY_MS = 250;

export interface MenuFilterParams {
  category?: string;
  status?: MenuItemStatus | 'ALL';
  search?: string;
}

export const menuService = {
  /**
   * Lấy danh sách toàn bộ món ăn (kèm lọc và tìm kiếm)
   * Target Backend Endpoint: GET /api/v1/admin/menu-items
   */
  async getAllMenuItems(filters?: MenuFilterParams): Promise<MenuItem[]> {
    await new Promise((res) => setTimeout(res, SIMULATE_LATENCY_MS));
    let items = getStoredMenuItems();

    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      items = items.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          it.itemCode.toLowerCase().includes(q) ||
          (it.description && it.description.toLowerCase().includes(q))
      );
    }

    if (filters?.category && filters.category !== 'ALL') {
      items = items.filter((it) => it.category === filters.category);
    }

    if (filters?.status && filters.status !== 'ALL') {
      items = items.filter((it) => it.status === filters.status);
    }

    // Sắp xếp: Món mới cập nhật lên đầu
    return [...items].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  /**
   * Lấy chi tiết món ăn theo ID
   * Target Backend Endpoint: GET /api/v1/admin/menu-items/{id}
   */
  async getMenuItemById(id: number): Promise<MenuItem | null> {
    await new Promise((res) => setTimeout(res, 150));
    const items = getStoredMenuItems();
    return items.find((it) => it.id === id) || null;
  },

  /**
   * Tạo món ăn mới
   * Target Backend Endpoint: POST /api/v1/admin/menu-items
   */
  async createMenuItem(data: CreateMenuItemRequest): Promise<MenuItem> {
    await new Promise((res) => setTimeout(res, SIMULATE_LATENCY_MS));

    if (!data.name || !data.name.trim()) {
      throw new Error('Tên món ăn không được để trống');
    }
    if (!data.category) {
      throw new Error('Vui lòng chọn nhóm món ăn');
    }
    if (!data.unit || !data.unit.trim()) {
      throw new Error('Đơn vị tính không được để trống');
    }
    if (data.price === undefined || data.price === null || Number(data.price) < 0) {
      throw new Error('Giá bán phải là số hợp lệ và không được âm');
    }

    const items = getStoredMenuItems();
    const newId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;

    // Sinh mã món dựa trên nhóm
    const prefixMap: Record<string, string> = {
      'Khai vị': 'KV',
      'Món chính': 'MC',
      'Ăn nhẹ 24/7': 'AN',
      'Tráng miệng': 'TM',
      'Đồ uống': 'DU',
    };
    const prefix = prefixMap[data.category] || 'MA';
    const itemCode = `${prefix}-${String(newId).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const newItem: MenuItem = {
      id: newId,
      itemCode,
      name: data.name.trim(),
      category: data.category,
      unit: data.unit.trim(),
      price: Number(data.price),
      status: data.status || 'AVAILABLE',
      description: data.description?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    items.unshift(newItem);
    saveStoredMenuItems(items);
    return newItem;
  },

  /**
   * Chỉnh sửa món ăn
   * Target Backend Endpoint: PUT /api/v1/admin/menu-items/{id}
   */
  async updateMenuItem(id: number, data: UpdateMenuItemRequest): Promise<MenuItem> {
    await new Promise((res) => setTimeout(res, SIMULATE_LATENCY_MS));

    if (!data.name || !data.name.trim()) {
      throw new Error('Tên món ăn không được để trống');
    }
    if (!data.category) {
      throw new Error('Vui lòng chọn nhóm món ăn');
    }
    if (!data.unit || !data.unit.trim()) {
      throw new Error('Đơn vị tính không được để trống');
    }
    if (data.price === undefined || data.price === null || Number(data.price) < 0) {
      throw new Error('Giá bán phải là số hợp lệ và không được âm');
    }

    const items = getStoredMenuItems();
    const index = items.findIndex((it) => it.id === id);
    if (index === -1) {
      throw new Error(`Không tìm thấy món ăn với ID #${id}`);
    }

    const updated: MenuItem = {
      ...items[index],
      name: data.name.trim(),
      category: data.category,
      unit: data.unit.trim(),
      price: Number(data.price),
      status: data.status,
      description: data.description !== undefined ? data.description.trim() : items[index].description,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updated;
    saveStoredMenuItems(items);
    return updated;
  },

  /**
   * Đổi nhanh trạng thái bán món ăn (AVAILABLE <-> UNAVAILABLE)
   * Target Backend Endpoint: PATCH /api/v1/admin/menu-items/{id}/status
   */
  async updateMenuItemStatus(id: number, status: MenuItemStatus): Promise<MenuItem> {
    await new Promise((res) => setTimeout(res, 200));
    const items = getStoredMenuItems();
    const item = items.find((it) => it.id === id);
    if (!item) {
      throw new Error(`Không tìm thấy món ăn với ID #${id}`);
    }
    item.status = status;
    item.updatedAt = new Date().toISOString();
    saveStoredMenuItems(items);
    return item;
  },

  /**
   * Khôi phục danh mục mẫu ban đầu
   */
  async resetToDefault(): Promise<MenuItem[]> {
    saveStoredMenuItems(INITIAL_MENU_ITEMS);
    return INITIAL_MENU_ITEMS;
  },
};
