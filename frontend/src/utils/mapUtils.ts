/**
 * Tiện ích bản đồ & chỉ đường Google Maps cho Grand Aurora Hotel
 * Địa chỉ: Số 10 Trần Phú, Hà Đông, Hà Nội
 */

export interface HotelLocationConfig {
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  phone: string;
  landmarks: Array<{
    name: string;
    distance: string;
    estimateTime: string;
    query: string;
  }>;
}

export const HOTEL_CONFIG: HotelLocationConfig = {
  name: 'Grand Aurora Luxury Hotel & Suites',
  address: 'Số 10 Trần Phú, Quận Hà Đông, TP. Hà Nội',
  coordinates: {
    lat: 20.9808,
    lng: 105.7877,
  },
  phone: '1900 888 888',
  landmarks: [
    {
      name: 'Ga tàu điện Cát Linh - Hà Đông (Ga Phùng Khoang)',
      distance: '200m',
      estimateTime: '2 phút đi bộ',
      query: 'Ga Phùng Khoang, Hà Đông, Hà Nội',
    },
    {
      name: 'Trung tâm Hội nghị Quốc gia / Mỹ Đình',
      distance: '4.5 km',
      estimateTime: '10 - 12 phút',
      query: 'Trung tâm Hội nghị Quốc gia Việt Nam, Hà Nội',
    },
    {
      name: 'Ga Hà Nội (Đường Lê Duẩn)',
      distance: '9.0 km',
      estimateTime: '22 - 25 phút',
      query: 'Ga Hà Nội, Lê Duẩn, Văn Miếu, Đống Đa, Hà Nội',
    },
    {
      name: 'Sân bay Quốc tế Nội Bài',
      distance: '32 km',
      estimateTime: '40 - 45 phút',
      query: 'Sân bay Quốc tế Nội Bài, Hà Nội',
    },
    {
      name: 'Hồ Hoàn Kiếm / Phố Cổ Hà Nội',
      distance: '10.5 km',
      estimateTime: '25 - 30 phút',
      query: 'Hồ Hoàn Kiếm, Tràng Tiền, Hoàn Kiếm, Hà Nội',
    },
  ],
};

/**
 * Tạo URL Google Maps Directions
 */
export function buildGoogleMapsDirectionsUrl(options: {
  origin?: string;
  destination?: string;
  travelMode?: 'driving' | 'transit' | 'walking' | 'bicycling';
}): string {
  const dest = encodeURIComponent(options.destination || HOTEL_CONFIG.address);
  const mode = options.travelMode || 'driving';

  if (!options.origin || options.origin.trim() === '') {
    // Không có điểm xuất phát: Google Maps sẽ tự động hỏi vị trí của người dùng
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=${mode}`;
  }

  const orig = encodeURIComponent(options.origin.trim());
  return `https://www.google.com/maps/dir/?api=1&origin=${orig}&destination=${dest}&travelmode=${mode}`;
}

/**
 * Tạo URL Embed iframe Google Maps để nhúng hiển thị trực tiếp trên web
 */
export function buildGoogleMapsEmbedUrl(query: string = HOTEL_CONFIG.address): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}

/**
 * Mở Google Maps chỉ đường bằng định vị GPS của khách hàng (1-chạm)
 */
export function navigateWithUserLocation(
  travelMode: 'driving' | 'transit' | 'walking' | 'bicycling' = 'driving',
  onError?: (errorMsg: string) => void
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    if (!navigator.geolocation) {
      if (onError) onError('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      // Fallback: Mở Google Maps với điểm đến, Google Maps sẽ tự lấy vị trí của user
      const fallbackUrl = buildGoogleMapsDirectionsUrl({ travelMode });
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      resolve();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const originCoord = `${latitude},${longitude}`;
        const url = buildGoogleMapsDirectionsUrl({
          origin: originCoord,
          travelMode,
        });
        window.open(url, '_blank', 'noopener,noreferrer');
        resolve();
      },
      (geoError) => {
        console.warn('Geolocation error:', geoError);
        if (onError) {
          onError('Không thể lấy vị trí hiện tại. Đang mở Google Maps để bạn chọn điểm xuất phát.');
        }
        // Khi người dùng bấm từ chối cấp quyền, mở URL fallback
        const fallbackUrl = buildGoogleMapsDirectionsUrl({ travelMode });
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
        resolve();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}
