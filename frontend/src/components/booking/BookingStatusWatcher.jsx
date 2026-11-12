import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { bookingService } from '../../services/bookingService';

const POLL_INTERVAL_MS = 10000;

/**
 * Polls customer bookings periodically to detect real backend status changes
 * (e.g. Receptionist approving or rejecting a PENDING booking) and notifies
 * the customer in real time without requiring logout/login.
 */
export function BookingStatusWatcher() {
  const { currentUser, isCustomer } = useAuth();
  const { showToast } = useToast();
  const isCheckingRef = useRef(false);

  useEffect(() => {
    if (!currentUser || !isCustomer) return;

    const storageKey = `hbs_booking_statuses_${currentUser.id}`;

    const checkStatuses = async () => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;
      try {
        const list = await bookingService.getMyBookings(currentUser.id);
        if (!Array.isArray(list)) return;

        let prevMap = null;
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) prevMap = JSON.parse(raw);
        } catch {
          prevMap = null;
        }

        const nextMap = {};
        let selfCancelled = [];
        try {
          selfCancelled = JSON.parse(localStorage.getItem('hbs_self_cancelled_codes') || '[]');
        } catch {
          selfCancelled = [];
        }

        let hasChange = false;
        list.forEach((b) => {
          nextMap[b.bookingCode] = b.bookingStatus;
          if (prevMap && prevMap[b.bookingCode]) {
            const oldStatus = prevMap[b.bookingCode];
            const newStatus = b.bookingStatus;
            if (oldStatus !== newStatus) {
              hasChange = true;
              if (oldStatus === 'PENDING' && newStatus === 'CONFIRMED') {
                showToast('Đặt phòng của bạn đã được lễ tân phê duyệt thành công.', 'success');
              } else if (
                (oldStatus === 'PENDING' || oldStatus === 'CONFIRMED') &&
                newStatus === 'CANCELLED' &&
                !selfCancelled.includes(b.bookingCode)
              ) {
                showToast('Đơn đặt phòng của bạn không được phê duyệt.', 'error');
              }
            }
          }
        });

        localStorage.setItem(storageKey, JSON.stringify(nextMap));
        if (hasChange) {
          window.dispatchEvent(new Event('hbs_bookings_updated'));
        }
      } catch {
        // Silent fail during background polling
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Initial snapshot + periodic polling
    checkStatuses();
    const timer = setInterval(checkStatuses, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [currentUser, isCustomer, showToast]);

  return null;
}
