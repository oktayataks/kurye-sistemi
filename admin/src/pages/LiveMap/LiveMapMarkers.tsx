import L from 'leaflet';

/**
 * Pin tarzı marker — alt ucu sivri, üstü daire.
 * SVG bazlı, transform için DivIcon kullanıyoruz (CSS animasyonları için ideal).
 */
function makePinIcon(color: string, emoji: string, pulse = false) {
  const pulseStyle = pulse
    ? `
      <span style="
        position: absolute; top: 50%; left: 50%;
        width: 36px; height: 36px;
        margin-left: -18px; margin-top: -18px;
        border-radius: 50%;
        background: ${color}40;
        animation: livemap-pulse 2s ease-out infinite;
      "></span>
    `
    : '';

  return L.divIcon({
    className: 'livemap-marker',
    html: `
      <div style="position: relative; width: 36px; height: 36px;">
        ${pulseStyle}
        <div style="
          position: absolute; inset: 0;
          background: ${color};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 10px ${color}80, 0 0 0 3px white;
          border: 2px solid white;
        "></div>
        <div style="
          position: absolute; top: 7px; left: 50%;
          transform: translateX(-50%);
          font-size: 16px; line-height: 1;
          pointer-events: none;
        ">${emoji}</div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

// ─── İkonlar ─────────────────────────────────────────────────────────────────

export const RESTAURANT_ICON = makePinIcon('#ef4444', '🏪'); // kırmızı
export const COURIER_ICON = makePinIcon('#3b82f6', '🛵'); // mavi
export const COURIER_BUSY_ICON = makePinIcon('#3b82f6', '🛵', true); // pulse
export const DELIVERY_ICON = makePinIcon('#10b981', '🏠'); // yeşil
export const DELIVERY_PULSE_ICON = makePinIcon('#10b981', '🏠', true); // pending için pulse

// ─── Renk sabitleri (legend / sidebar için) ─────────────────────────────────

export const MARKER_COLORS = {
  restaurant: '#ef4444',
  courier: '#3b82f6',
  delivery: '#10b981',
} as const;
