import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X } from 'lucide-react';
import type { TripReportRecord } from '@/shared/types/vts.types';

interface TripRouteMapModalProps {
  trip: TripReportRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TripRouteMapModal: React.FC<TripRouteMapModalProps> = ({
  trip,
  isOpen,
  onClose,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Initialize and update Leaflet Route Map matching Image 3
  useEffect(() => {
    if (!isOpen || !trip || !mapContainerRef.current) return;

    // Destroy existing instance if container re-attached
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const defaultCenter: [number, number] = trip.point_b?.coords ||
      trip.actual_route?.[0] || [25.0612, 74.3524];

    // Initialize Map with top-left zoom controls matching production Image 3
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 11,
      zoomControl: true,
      attributionControl: true,
    });

    // Move zoom control to top-left if not default
    map.zoomControl.setPosition('topleft');

    // Esri World Street Map Tile Layer matching Image 3
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Esri, TomTom, Garmin, FAO, METI/NASA, USGS | Powered by Esri',
        maxZoom: 18,
      }
    ).addTo(map);

    const bounds = L.latLngBounds([]);

    // 1. Planned Route Polyline (Blue)
    if (trip.planned_route && trip.planned_route.length > 1) {
      const plannedLine = L.polyline(trip.planned_route, {
        color: '#2563eb',
        weight: 4.5,
        opacity: 0.85,
        lineJoin: 'round',
      }).addTo(map);
      bounds.extend(plannedLine.getBounds());
    }

    // 2. Actual Route Polyline (Orange)
    if (trip.actual_route && trip.actual_route.length > 1) {
      const actualLine = L.polyline(trip.actual_route, {
        color: '#ea580c',
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round',
      }).addTo(map);
      bounds.extend(actualLine.getBounds());
    }

    // 3. Deviated Route Polyline (Red - highlighted corridor matching Image 3)
    if (trip.deviated_route && trip.deviated_route.length > 1) {
      const deviatedLine = L.polyline(trip.deviated_route, {
        color: '#dc2626',
        weight: 6,
        opacity: 0.95,
        lineJoin: 'round',
      }).addTo(map);
      bounds.extend(deviatedLine.getBounds());
    }

    // Point A Marker (Blue circle 'A' at trip origin)
    if (trip.point_a && trip.point_a.coords) {
      const iconA = L.divIcon({
        className: 'transit-marker-a',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="width: 26px; height: 26px; border-radius: 50%; background: #2563eb; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">A</div>
            <div style="background: rgba(15,23,42,0.88); color: #fff; font-size: 9.5px; font-weight: 700; padding: 1px 5px; border-radius: 4px; margin-top: 2px; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">${trip.point_a.name}</div>
          </div>
        `,
        iconSize: [60, 42],
        iconAnchor: [30, 13],
      });
      const markerA = L.marker(trip.point_a.coords, { icon: iconA }).addTo(map);
      markerA.bindPopup(`
        <div style="padding: 8px 10px; font-size: 12px; font-family: sans-serif;">
          <div style="color: #2563eb; font-weight: bold; font-size: 11px;">POINT A (STARTING POINT)</div>
          <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${trip.point_a.name}</div>
          <div style="color: #64748b; font-size: 11px;">${trip.point_a.subtext || 'Mining Lease'}</div>
        </div>
      `);
      bounds.extend(trip.point_a.coords);
    }

    // Point B Marker (Green circle 'B' matching Image 3)
    if (trip.point_b && trip.point_b.coords) {
      const iconB = L.divIcon({
        className: 'transit-marker-b',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="width: 26px; height: 26px; border-radius: 50%; background: #16a34a; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">B</div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const markerB = L.marker(trip.point_b.coords, { icon: iconB }).addTo(map);
      markerB.bindPopup(`
        <div style="padding: 8px 10px; font-size: 12px; font-family: sans-serif;">
          <div style="color: #16a34a; font-weight: bold; font-size: 11px;">POINT B (DESTINATION)</div>
          <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${trip.point_b.name}</div>
          <div style="color: #64748b; font-size: 11px;">${trip.point_b.subtext || 'Weighbridge'}</div>
        </div>
      `);
      bounds.extend(trip.point_b.coords);
    }

    // Fit map bounds to show complete trip route with padding
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 13 });
    }

    // Ensure map tiles properly layout after modal transition
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isOpen, trip]);

  if (!isOpen || !trip) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0a192f] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header matching Image 3 */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0a192f]">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              Route Map
            </h2>
            <div className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              {trip.vehicle_no} • {trip.erawana_no}
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Legend matching Image 3 */}
            <div className="flex items-center gap-3 text-xs font-medium text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-2.5 rounded-[2px] bg-[#2563eb] inline-block shadow-2xs" />
                <span className="text-[11.5px]">Planned Route</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-2.5 rounded-[2px] bg-[#ea580c] inline-block shadow-2xs" />
                <span className="text-[11.5px]">Actual Route</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-2.5 rounded-[2px] bg-[#dc2626] inline-block shadow-2xs" />
                <span className="text-[11.5px]">Deviated Route</span>
              </div>
              <span className="text-slate-400 dark:text-slate-500 text-[11px] font-mono">
                ({trip.total_gps_points} GPS points)
              </span>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Map Viewport matching Image 3 */}
        <div className="relative w-full h-[520px] md:h-[580px] bg-slate-100 dark:bg-slate-900">
          <div ref={mapContainerRef} className="w-full h-full z-10" />
        </div>
      </div>
    </div>
  );
};

export default TripRouteMapModal;
