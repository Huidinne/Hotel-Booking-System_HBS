import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Car,
  Train,
  Footprints,
  X,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import {
  HOTEL_CONFIG,
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsEmbedUrl,
  navigateWithUserLocation,
} from '../../utils/mapUtils';

export function DirectionsModal({ isOpen, onClose }) {
  const [customOrigin, setCustomOrigin] = useState('');
  const [travelMode, setTravelMode] = useState('driving');
  const [isLocating, setIsLocating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(HOTEL_CONFIG.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCurrentLocation = async () => {
    setIsLocating(true);
    setStatusMsg('Đang lấy vị trí GPS từ thiết bị của bạn...');
    try {
      await navigateWithUserLocation(travelMode, (err) => {
        setStatusMsg(err);
      });
    } finally {
      setIsLocating(false);
      setTimeout(() => setStatusMsg(''), 4000);
    }
  };

  const handleOpenWithOrigin = (originText) => {
    const url = buildGoogleMapsDirectionsUrl({
      origin: originText,
      destination: HOTEL_CONFIG.address,
      travelMode,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customOrigin.trim()) {
      handleCurrentLocation();
      return;
    }
    handleOpenWithOrigin(customOrigin.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh]"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Navigation className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Chỉ Đường Đến Khách Sạn
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {HOTEL_CONFIG.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body content with scroll */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Destination Card */}
          <div className="rounded-xl p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold tracking-wider uppercase text-amber-700 dark:text-amber-400">
                    Điểm đến (Khách sạn)
                  </span>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {HOTEL_CONFIG.name}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                    {HOTEL_CONFIG.address}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyAddress}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Đã sao chép' : 'Sao chép'}
              </button>
            </div>
          </div>

          {/* Travel Mode Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Phương tiện di chuyển
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'driving', label: 'Ô tô / Taxi', icon: Car },
                { id: 'transit', label: 'Tàu điện / Bus', icon: Train },
                { id: 'walking', label: 'Đi bộ', icon: Footprints },
              ].map((mode) => {
                const IconComponent = mode.icon;
                const active = travelMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setTravelMode(mode.id)}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                      active
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1-Click Current Location GPS */}
          <div>
            <button
              type="button"
              onClick={handleCurrentLocation}
              disabled={isLocating}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-lg shadow-amber-500/25 transition-all transform active:scale-[0.99]"
            >
              <Navigation className={`h-4 w-4 ${isLocating ? 'animate-spin' : ''}`} />
              {isLocating ? 'Đang xác định GPS của bạn...' : '📍 Chỉ đường từ Vị trí hiện tại của tôi (GPS)'}
              <ExternalLink className="h-4 w-4 opacity-75" />
            </button>
            {statusMsg && (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-2 animate-fade-in">
                {statusMsg}
              </p>
            )}
          </div>

          {/* Quick Landmarks */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Hoặc chọn nhanh từ các điểm mốc phổ biến
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HOTEL_CONFIG.landmarks.map((landmark, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleOpenWithOrigin(landmark.query)}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all text-left group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {landmark.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Khoảng cách: {landmark.distance} • {landmark.estimateTime}
                    </p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Custom Origin Input */}
          <form onSubmit={handleCustomSubmit} className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Hoặc nhập địa chỉ xuất phát bất kỳ của bạn
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customOrigin}
                onChange={(e) => setCustomOrigin(e.target.value)}
                placeholder="Ví dụ: Cầu Giấy, Hoàn Kiếm, Sân bay..."
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-sm font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>Chỉ đường</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>

          {/* Embed Google Maps Preview */}
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-48 w-full relative">
            <iframe
              title="Google Maps Hotel Location"
              src={buildGoogleMapsEmbedUrl(HOTEL_CONFIG.address)}
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <span>Tự động mở Google Maps để dẫn đường trực tiếp</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
