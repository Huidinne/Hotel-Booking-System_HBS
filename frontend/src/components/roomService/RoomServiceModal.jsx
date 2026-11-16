import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Utensils,
  Plus,
  Minus,
  Trash2,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Hash,
  Sparkles,
  Layers,
  History,
  ShoppingCart,
  ShieldAlert,
  Send,
  Loader2,
  X,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { roomServiceOrderService } from '../../services/roomServiceOrderService';
import { RoomServiceStatusBadge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { useToast } from '../../context/ToastContext';

function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '0 ₫';
  return `${Number(amount).toLocaleString('vi-VN')} ₫`;
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

export function RoomServiceModal({
  isOpen,
  onClose,
  roomId,
  roomNumber,
  onReportIncident, // Callback mở modal tạo sự cố
}) {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('ORDER'); // 'ORDER' | 'HISTORY'
  const [activeStay, setActiveStay] = useState(null);
  const [loadingStay, setLoadingStay] = useState(true);

  // Menu items
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [searchDish, setSearchDish] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Cart: Map<menuItemId, { menuItem, quantity, note }>
  const [cart, setCart] = useState([]);
  const [generalNote, setGeneralNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // History
  const [orderHistory, setOrderHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Conflict 409 notification state
  const [conflictError, setConflictError] = useState(null);

  // Load Active Stay & Menu when opening
  useEffect(() => {
    if (!isOpen || !roomId) {
      setCart([]);
      setGeneralNote('');
      setConflictError(null);
      return;
    }

    let isMounted = true;
    setLoadingStay(true);
    setLoadingMenu(true);
    setConflictError(null);

    Promise.all([
      roomServiceOrderService.getActiveBookingRoom(roomId),
      roomServiceOrderService.getMenuItems(false), // lấy tất cả để hiển thị cả món ngừng bán (disabled)
    ])
      .then(([stay, dishes]) => {
        if (!isMounted) return;
        setActiveStay(stay);
        setMenuItems(dishes);
      })
      .catch((err) => {
        if (isMounted) showToast(err.message || 'Lỗi tải dữ liệu phòng', 'error');
      })
      .finally(() => {
        if (isMounted) {
          setLoadingStay(false);
          setLoadingMenu(false);
        }
      });
  }, [isOpen, roomId, showToast]);

  // Load Order History when clicking History tab or after placing an order
  const loadHistory = useCallback(async () => {
    if (!activeStay?.bookingRoomId) return;
    setLoadingHistory(true);
    try {
      const history = await roomServiceOrderService.getRoomServiceHistory(activeStay.bookingRoomId);
      setOrderHistory(history);
    } catch (err) {
      showToast(err.message || 'Lỗi tải lịch sử gọi món', 'error');
    } finally {
      setLoadingHistory(false);
    }
  }, [activeStay, showToast]);

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(menuItems.map((m) => m.category));
    return ['ALL', ...Array.from(set)];
  }, [menuItems]);

  // Filtered menu
  const filteredMenu = useMemo(() => {
    return menuItems.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      if (searchDish.trim()) {
        const q = searchDish.trim().toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.itemCode.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [menuItems, selectedCategory, searchDish]);

  // Cart operations
  const handleAddToCart = (dish) => {
    if (dish.status !== 'AVAILABLE') return;
    setCart((prev) => {
      const existing = prev.find((item) => item.menuItemId === dish.id);
      if (existing) {
        return prev.map((item) =>
          item.menuItemId === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          menuItemId: dish.id,
          name: dish.name,
          itemCode: dish.itemCode,
          unit: dish.unit,
          price: dish.price,
          quantity: 1,
          note: '',
        },
      ];
    });
  };

  const handleUpdateQuantity = (menuItemId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.menuItemId === menuItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const handleRemoveFromCart = (menuItemId) => {
    setCart((prev) => prev.filter((item) => item.menuItemId !== menuItemId));
  };

  const handleUpdateItemNote = (menuItemId, note) => {
    setCart((prev) =>
      prev.map((item) => (item.menuItemId === menuItemId ? { ...item, note } : item))
    );
  };

  // Cart total estimated amount
  const totalEstimatedAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  // Submit Order (24/7 - NO TIME RESTRICTIONS)
  const handleSubmitOrder = async (simulateConflict = false) => {
    if (!activeStay) {
      showToast('Phòng không có lượt lưu trú hợp lệ để gọi món.', 'error');
      return;
    }
    if (cart.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 món ăn vào đơn hàng.', 'warning');
      return;
    }

    setSubmitting(true);
    setConflictError(null);

    try {
      const order = await roomServiceOrderService.createRoomServiceOrder(
        {
          roomId: activeStay.roomId,
          roomNumber: activeStay.roomNumber,
          bookingId: activeStay.bookingId,
          bookingCode: activeStay.bookingCode,
          bookingRoomId: activeStay.bookingRoomId,
          customerName: activeStay.customerName,
          customerPhone: activeStay.customerPhone,
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            quantity: c.quantity,
            note: c.note,
          })),
          generalNote,
        },
        { simulateConflict409: simulateConflict }
      );

      showToast(`Đã gửi đơn dịch vụ phòng ${order.orderCode} thành công!`, 'success');
      setCart([]);
      setGeneralNote('');
      setActiveTab('HISTORY');
      loadHistory();
    } catch (err) {
      if (err.status === 409) {
        // Section IX.5: Xử lý xung đột HTTP 409
        setConflictError(err.message || 'Xung đột dữ liệu (HTTP 409). Vui lòng thử lại.');
      } else {
        showToast(err.message || 'Không thể gửi đơn dịch vụ phòng', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Dịch Vụ Phòng 24/7 · Phòng ${roomNumber || activeStay?.roomNumber || ''}`}
      maxWidth="920px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '-0.5rem' }}>
        {/* Banner 24/7 Service Status */}
        <div
          style={{
            background: 'linear-gradient(90deg, #0F172A 0%, #1E293B 100%)',
            color: '#F8FAFC',
            borderRadius: '12px',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            border: '1px solid #334155',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #C5A880 0%, #A68454 100%)',
                color: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
              }}
            >
              <Utensils size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Phục vụ ẩm thực tận phòng 24/7
                <span
                  style={{
                    fontSize: '0.72rem',
                    background: '#15803D',
                    color: '#DCFCE7',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    fontWeight: 700,
                  }}
                >
                  SẴN SÀNG 24/24
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#CBD5E1', marginTop: '0.15rem' }}>
                Không giới hạn khung giờ · Bất kỳ thời điểm nào trong ngày đêm (02:00, 06:30, 12:00, 23:59...)
              </div>
            </div>
          </div>

          {/* Quick link: Báo cáo sự cố phòng */}
          {onReportIncident && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onReportIncident({
                  roomId: activeStay?.roomId || roomId,
                  roomNumber: activeStay?.roomNumber || roomNumber,
                  bookingId: activeStay?.bookingId,
                  bookingCode: activeStay?.bookingCode,
                  bookingRoomId: activeStay?.bookingRoomId,
                  customerName: activeStay?.customerName,
                });
              }}
              style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <ShieldAlert size={14} /> Báo sự cố phòng
            </button>
          )}
        </div>

        {/* Khu vực A: Thông tin phòng & Lượt lưu trú BookingRoom */}
        {loadingStay ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: '#64748B' }}>
            <Loader2 size={16} className="spin" /> Đang kiểm tra lượt lưu trú phòng...
          </div>
        ) : !activeStay ? (
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '10px',
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              color: '#92400E',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertCircle size={16} /> Phòng hiện tại chưa có lượt lưu trú hợp lệ
            </div>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.84rem', color: '#78350F' }}>
              Chức năng dịch vụ phòng chỉ áp dụng cho phòng đang có khách lưu trú (CHECKED_IN). Vui lòng kiểm tra lại sơ đồ phòng.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.75rem',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>PHÒNG VẬT LÝ</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F1E36' }}>
                Phòng {activeStay.roomNumber} ({activeStay.roomTypeName})
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>KHÁCH HÀNG ĐANG Ở</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F1E36' }}>
                {activeStay.customerName} {activeStay.customerPhone ? `(${activeStay.customerPhone})` : ''}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>MÃ BOOKING / STAY ID</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', color: '#B45309' }}>
                {activeStay.bookingCode} · {activeStay.bookingRoomId}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>THỜI HẠN LƯU TRÚ</div>
              <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                {activeStay.checkIn} → {activeStay.checkOut}
              </div>
            </div>
          </div>
        )}

        {/* Tab Selector: Gọi món mới vs Lịch sử gọi món */}
        {activeStay && (
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #E2E8F0', paddingBottom: '0.25rem' }}>
            <button
              type="button"
              onClick={() => setActiveTab('ORDER')}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.5rem 1rem',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: 'pointer',
                color: activeTab === 'ORDER' ? '#B45309' : '#64748B',
                borderBottom: activeTab === 'ORDER' ? '2px solid #B45309' : '2px solid transparent',
                marginBottom: '-0.35rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <ShoppingCart size={16} /> Gọi món mới (24/7)
              {cart.length > 0 && (
                <span
                  style={{
                    background: '#B45309',
                    color: '#FFFFFF',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    padding: '0.1rem 0.45rem',
                    fontWeight: 800,
                  }}
                >
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.5rem 1rem',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: 'pointer',
                color: activeTab === 'HISTORY' ? '#B45309' : '#64748B',
                borderBottom: activeTab === 'HISTORY' ? '2px solid #B45309' : '2px solid transparent',
                marginBottom: '-0.35rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <History size={16} /> Lịch sử gọi món ({activeStay.bookingRoomId})
            </button>
          </div>
        )}

        {/* TAB 1: GỌI MÓN MỚI */}
        {activeStay && activeTab === 'ORDER' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: '1rem',
              minHeight: '380px',
            }}
          >
            {/* Khu vực B: Danh sách món ăn */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
                  <input
                    type="text"
                    value={searchDish}
                    onChange={(e) => setSearchDish(e.target.value)}
                    placeholder="Tìm món ăn, đồ uống 24/7..."
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem 0.5rem 2.1rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                    background: '#FFFFFF',
                    maxWidth: '140px',
                  }}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c === 'ALL' ? 'Tất cả nhóm' : c}</option>
                  ))}
                </select>
              </div>

              {/* Menu list scrollable */}
              <div
                style={{
                  maxHeight: '340px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  paddingRight: '0.25rem',
                }}
              >
                {loadingMenu ? (
                  <LoadingSpinner message="Đang tải thực đơn..." />
                ) : filteredMenu.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                    Không có món ăn nào phù hợp với bộ lọc.
                  </div>
                ) : (
                  filteredMenu.map((dish) => {
                    const isAvailable = dish.status === 'AVAILABLE';
                    return (
                      <div
                        key={dish.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          background: isAvailable ? '#FFFFFF' : '#F8FAFC',
                          border: `1px solid ${isAvailable ? '#E2E8F0' : '#CBD5E1'}`,
                          opacity: isAvailable ? 1 : 0.65,
                          gap: '0.75rem',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: isAvailable ? '#0F1E36' : '#64748B' }}>
                              {dish.name}
                            </span>
                            {!isAvailable && (
                              <span style={{ fontSize: '0.7rem', color: '#991B1B', background: '#FEE2E2', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                                Tạm ngừng bán
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
                            <span style={{ color: '#B45309', fontWeight: 800 }}>{formatCurrency(dish.price)}</span> / {dish.unit} · {dish.category}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => handleAddToCart(dish)}
                          style={{
                            background: isAvailable ? '#FDF8F3' : '#F1F5F9',
                            border: `1px solid ${isAvailable ? '#D8CCA8' : '#E2E8F0'}`,
                            color: isAvailable ? '#8C6D2D' : '#94A3B8',
                            borderRadius: '6px',
                            padding: '0.35rem 0.75rem',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: isAvailable ? 'pointer' : 'not-allowed',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            flexShrink: 0,
                          }}
                        >
                          <Plus size={14} /> Chọn
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Khu vực C: Giỏ hàng & Thông tin đơn đặt món */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F1E36', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShoppingCart size={16} /> Món đã chọn ({cart.length})
                  </div>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCart([])}
                      style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Xóa tất cả
                    </button>
                  )}
                </div>

                {/* Conflict 409 alert */}
                {conflictError && (
                  <div
                    style={{
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: '#991B1B',
                      fontSize: '0.8rem',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.4rem',
                    }}
                  >
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>Xung đột dữ liệu (HTTP 409):</strong>
                      <div>{conflictError}</div>
                      <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', color: '#B91C1C' }}>
                        Nội dung đơn hàng của bạn vẫn được giữ nguyên. Vui lòng xác nhận trước khi gửi lại.
                      </div>
                    </div>
                  </div>
                )}

                {/* Cart items list */}
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingRight: '0.2rem' }}>
                  {cart.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem' }}>
                      Chưa có món nào được chọn. Hãy chọn món từ thực đơn bên trái.
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.menuItemId}
                        style={{
                          background: '#F8FAFC',
                          borderRadius: '8px',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0F1E36' }}>
                            {item.name}
                          </span>
                          <span style={{ fontWeight: 800, fontSize: '0.84rem', color: '#B45309' }}>
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                            {formatCurrency(item.price)} / {item.unit}
                          </span>

                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.menuItemId, -1)}
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '4px',
                                border: '1px solid #CBD5E1',
                                background: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <Minus size={12} />
                            </button>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', minWidth: '18px', textAlign: 'center' }}>
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.menuItemId, 1)}
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '4px',
                                border: '1px solid #CBD5E1',
                                background: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <Plus size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(item.menuItemId)}
                              style={{
                                border: 'none',
                                background: 'none',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                padding: '2px',
                                marginLeft: '4px',
                              }}
                              title="Xóa món"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Ghi chú riêng từng món */}
                        <input
                          type="text"
                          value={item.note || ''}
                          onChange={(e) => handleUpdateItemNote(item.menuItemId, e.target.value)}
                          placeholder="Ghi chú món: ít cay, không hành..."
                          style={{
                            width: '100%',
                            marginTop: '0.35rem',
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            border: '1px dashed #CBD5E1',
                            background: '#FFFFFF',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    ))
                  )}
                </div>

                {/* Ghi chú chung cho toàn bộ đơn */}
                {cart.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                      Ghi chú chung cho đơn hàng:
                    </label>
                    <input
                      type="text"
                      value={generalNote}
                      onChange={(e) => setGeneralNote(e.target.value)}
                      placeholder="Ví dụ: Khách dặn mang thêm 2 ly đá, giao trước 15 phút..."
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.8rem',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Khu vực D: Tổng tiền tham khảo & Thao tác gửi */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Tạm tính dự kiến:</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#B45309' }}>
                    {formatCurrency(totalEstimatedAmount)}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.75rem' }}>
                  * Giá tạm tính mang tính tham khảo khi kết nối Backend. Không tự động xuất hóa đơn.
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {/* Nút mô phỏng 409 conflict test (cho dev/tester) */}
                  <button
                    type="button"
                    onClick={() => handleSubmitOrder(true)}
                    disabled={submitting || cart.length === 0}
                    title="Mô phỏng trường hợp Backend trả về HTTP 409 Conflict theo SRS"
                    style={{
                      flex: 1,
                      background: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      color: '#B45309',
                      padding: '0.55rem 0.65rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: submitting || cart.length === 0 ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Test 409 Conflict
                  </button>

                  {/* Nút gửi chính thức */}
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={submitting || cart.length === 0}
                    onClick={() => handleSubmitOrder(false)}
                    style={{
                      flex: 2,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.65rem 1rem',
                      fontSize: '0.9rem',
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="spin" /> Đang gửi đơn...
                      </>
                    ) : (
                      <>
                        <Send size={16} /> Gửi yêu cầu (24/7)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LỊCH SỬ GỌI MÓN THEO BOOKINGROOM */}
        {activeStay && activeTab === 'HISTORY' && (
          <div style={{ minHeight: '340px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
                Lịch sử gọi món gắn liền với lượt lưu trú <strong>{activeStay.bookingRoomId}</strong> của phòng {activeStay.roomNumber}.
              </span>
              <button
                type="button"
                onClick={loadHistory}
                disabled={loadingHistory}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#B45309',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {loadingHistory ? 'Đang làm mới...' : '↻ Làm mới lịch sử'}
              </button>
            </div>

            {loadingHistory ? (
              <LoadingSpinner message="Đang tải lịch sử gọi món..." />
            ) : orderHistory.length === 0 ? (
              <EmptyState
                title="Chưa có đơn gọi món nào trong lượt lưu trú này"
                description={`Lượt lưu trú ${activeStay.bookingRoomId} của khách ${activeStay.customerName} chưa có yêu cầu dịch vụ phòng nào.`}
                actionText="Gọi món ngay (24/7)"
                onAction={() => setActiveTab('ORDER')}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto' }}>
                {orderHistory.map((order) => (
                  <div
                    key={order.id}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0F1E36', fontSize: '0.9rem' }}>
                          {order.orderCode}
                        </span>
                        <RoomServiceStatusBadge status={order.status} />
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={13} /> Thời gian gọi: <strong>{formatDateTime(order.createdAt)}</strong>
                      </div>
                    </div>

                    {/* Danh sách món trong đơn */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.5rem' }}>
                      {order.items.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                          <span style={{ color: '#334155' }}>
                            <strong>{it.quantity}x</strong> {it.name} ({it.unit})
                            {it.note && <span style={{ color: '#64748B', fontStyle: 'italic' }}> — "{it.note}"</span>}
                          </span>
                          <span style={{ color: '#0F1E36', fontWeight: 600 }}>
                            {formatCurrency(it.price * it.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Ghi chú chung */}
                    {order.generalNote && (
                      <div style={{ fontSize: '0.78rem', color: '#B45309', background: '#FEF3C7', padding: '0.35rem 0.6rem', borderRadius: '6px', marginBottom: '0.5rem' }}>
                        Ghi chú: {order.generalNote}
                      </div>
                    )}

                    {/* Footer đơn */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.35rem', borderTop: '1px dashed #E2E8F0', fontSize: '0.85rem' }}>
                      <span style={{ color: '#64748B', fontSize: '0.78rem' }}>
                        Người phụ trách: {order.handledBy || 'Lễ tân tiếp nhận'}
                      </span>
                      <div>
                        Tổng tiền: <strong style={{ color: '#B45309', fontSize: '0.95rem' }}>{formatCurrency(order.totalEstimatedAmount)}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default RoomServiceModal;
