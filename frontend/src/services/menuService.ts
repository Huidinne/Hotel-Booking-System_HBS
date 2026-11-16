// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - MENU SERVICE (SPRINT 4)
// File: src/services/menuService.ts
// Real API Integration with Spring Boot Backend (/api/v1/admin/service-items & /api/v1/receptionist/service-items)
// =============================================================================

import { apiClient } from './apiClient';
import {
  CreateMenuItemRequest,
  MenuItem,
  MenuItemStatus,
  ServiceItemCategory,
  UpdateMenuItemRequest,
} from '../types/roomService';

export interface MenuFilterParams {
  category?: string;
  status?: MenuItemStatus | 'ALL';
  search?: string;
  page?: number;
  size?: number;
}

export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  isFirst: boolean;
  isLast: boolean;
}

function normalizeServiceItem(raw: any): MenuItem {
  if (!raw) return {} as MenuItem;
  const isActive = raw.isActive !== undefined ? Boolean(raw.isActive) : true;
  return {
    id: Number(raw.id),
    itemCode: `SI-${raw.id}`,
    name: raw.name || '',
    category: raw.category || 'FOOD',
    unit: raw.unit || 'Phần',
    price: Number(raw.price || 0),
    status: isActive ? 'AVAILABLE' : 'UNAVAILABLE',
    isActive,
    imageUrl: raw.imageUrl || '',
    version: Number(raw.version ?? 0),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    description: raw.description,
  };
}

export const menuService = {
  /**
   * Lấy danh sách toàn bộ món ăn cho Admin
   * API: GET /api/v1/admin/service-items
   */
  async getAllMenuItems(filters?: MenuFilterParams): Promise<MenuItem[]> {
    const params = new URLSearchParams();
    if (filters?.page !== undefined) params.append('page', String(filters.page));
    else params.append('page', '0');

    if (filters?.size !== undefined) params.append('size', String(filters.size));
    else params.append('size', '100'); // Lấy đủ danh mục hiển thị

    if (filters?.search && filters.search.trim()) {
      params.append('keyword', filters.search.trim());
    }

    if (filters?.category && filters.category !== 'ALL') {
      params.append('category', filters.category);
    }

    if (filters?.status && filters.status !== 'ALL') {
      params.append('isActive', filters.status === 'AVAILABLE' ? 'true' : 'false');
    }

    const res = await apiClient.get<any>(`/admin/service-items?${params.toString()}`);
    const items = Array.isArray(res) ? res : res?.content || [];
    return items.map(normalizeServiceItem);
  },

  /**
   * Lấy chi tiết món ăn theo ID
   * API: GET /api/v1/admin/service-items/{id}
   */
  async getMenuItemById(id: number): Promise<MenuItem | null> {
    try {
      const res = await apiClient.get<any>(`/admin/service-items/${id}`);
      return normalizeServiceItem(res);
    } catch (err: any) {
      if (err?.status === 404) return null;
      throw err;
    }
  },

  /**
   * Lấy danh sách món đang kinh doanh phục vụ Room Service (cho Lễ tân/Khách)
   * API: GET /api/v1/receptionist/service-items
   */
  async getActiveMenuItems(filters?: { category?: string; search?: string }): Promise<MenuItem[]> {
    const params = new URLSearchParams();
    params.append('page', '0');
    params.append('size', '100');

    if (filters?.search && filters.search.trim()) {
      params.append('keyword', filters.search.trim());
    }
    if (filters?.category && filters.category !== 'ALL') {
      params.append('category', filters.category);
    }

    const res = await apiClient.get<any>(`/receptionist/service-items?${params.toString()}`);
    const items = Array.isArray(res) ? res : res?.content || [];
    return items.map(normalizeServiceItem);
  },

  /**
   * Tạo món ăn mới
   * API: POST /api/v1/admin/service-items
   */
  async createMenuItem(data: CreateMenuItemRequest): Promise<MenuItem> {
    if (!data.name || !data.name.trim()) {
      throw new Error('Tên món ăn không được để trống');
    }
    if (data.price === undefined || data.price === null || Number(data.price) < 0) {
      throw new Error('Đơn giá phải là số không âm (>= 0)');
    }

    const categoryKey: ServiceItemCategory =
      ['FOOD', 'BEVERAGE', 'SNACK', 'MINIBAR', 'OTHER'].includes(data.category as any)
        ? (data.category as ServiceItemCategory)
        : 'FOOD';

    const payload = {
      name: data.name.trim(),
      category: categoryKey,
      unit: (data.unit || 'Phần').trim(),
      price: Number(data.price),
      imageUrl: data.imageUrl || null,
      isActive: data.isActive !== undefined ? data.isActive : data.status !== 'UNAVAILABLE',
    };

    const res = await apiClient.post<any>('/admin/service-items', payload);
    return normalizeServiceItem(res);
  },

  /**
   * Cập nhật món ăn
   * API: PUT /api/v1/admin/service-items/{id}
   */
  async updateMenuItem(id: number, data: UpdateMenuItemRequest): Promise<MenuItem> {
    if (!data.name || !data.name.trim()) {
      throw new Error('Tên món ăn không được để trống');
    }
    if (data.price === undefined || data.price === null || Number(data.price) < 0) {
      throw new Error('Đơn giá phải là số không âm (>= 0)');
    }

    const categoryKey: ServiceItemCategory =
      ['FOOD', 'BEVERAGE', 'SNACK', 'MINIBAR', 'OTHER'].includes(data.category as any)
        ? (data.category as ServiceItemCategory)
        : 'FOOD';

    const payload = {
      name: data.name.trim(),
      category: categoryKey,
      unit: (data.unit || 'Phần').trim(),
      price: Number(data.price),
      imageUrl: data.imageUrl || null,
      isActive: data.isActive !== undefined ? data.isActive : data.status !== 'UNAVAILABLE',
      version: data.version ?? 0,
    };

    const res = await apiClient.put<any>(`/admin/service-items/${id}`, payload);
    return normalizeServiceItem(res);
  },

  /**
   * Đổi trạng thái kinh doanh của món ăn
   * Sử dụng PUT /api/v1/admin/service-items/{id}
   */
  async toggleStatus(id: number, targetStatus: MenuItemStatus, currentItem?: MenuItem): Promise<MenuItem> {
    let item = currentItem;
    if (!item) {
      const fetched = await this.getMenuItemById(id);
      if (!fetched) throw new Error('Không tìm thấy món ăn');
      item = fetched;
    }

    const isActive = targetStatus === 'AVAILABLE';
    const payload = {
      name: item.name,
      category: item.category,
      unit: item.unit,
      price: item.price,
      imageUrl: item.imageUrl || null,
      isActive,
      version: item.version,
    };

    const res = await apiClient.put<any>(`/admin/service-items/${id}`, payload);
    return normalizeServiceItem(res);
  },
};
