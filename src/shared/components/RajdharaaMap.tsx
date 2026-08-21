import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type {
  CheckpostFeature,
  GeofenceZone,
  GISLayerConfig,
  Vehicle,
} from '../types/vts.types';

interface RajdharaaMapProps {
  vehicles: Vehicle[];
  geofences: GeofenceZone[];
  checkposts: CheckpostFeature[];
  activeLayerId: string;
  gisLayers: GISLayerConfig[];
  selectedVehicle: Vehicle | null;
  onSelectVehicle: (v: Vehicle) => void;
  showGeofences?: boolean;
  showCheckposts?: boolean;
  showTrail?: boolean;
  trailPoints?: [number, number][];
}

export const RajdharaaMap: React.FC<RajdharaaMapProps> = ({
  vehicles,
  geofences,
  checkposts,
  activeLayerId,
  gisLayers,
  selectedVehicle,
  onSelectVehicle,
  showGeofences = true,
  showCheckposts = true,
  showTrail = false,
  trailPoints = [],
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const geofenceLayersRef = useRef<L.LayerGroup | null>(null);
  const checkpostLayersRef = useRef<L.LayerGroup | null>(null);
  const trailPolylineRef = useRef<L.Polyline | null>(null);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [26.578, 74.862], // Center of Rajasthan
      zoom: 7,
      minZoom: 5,
      maxZoom: 19,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    geofenceLayersRef.current = L.layerGroup().addTo(map);
    checkpostLayersRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Handle Tile Layer Switching
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const targetConfig = gisLayers.find((l) => l.id === activeLayerId) || gisLayers[0];
    if (!targetConfig) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newTileLayer = L.tileLayer(targetConfig.url, {
      attribution: targetConfig.attribution,
      maxZoom: targetConfig.max_zoom || 19,
      minZoom: targetConfig.min_zoom || 5,
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [activeLayerId, gisLayers]);

  // 3. Render Mining Lease Geofences
  useEffect(() => {
    if (!geofenceLayersRef.current) return;
    geofenceLayersRef.current.clearLayers();

    if (!showGeofences) return;

    geofences.forEach((gf) => {
      const latLngs: [number, number][] = gf.polygon.map((p) => [p.lat, p.lng]);
      const color =
        gf.zone_type === 'MINING_LEASE'
          ? '#f59e0b'
          : gf.zone_type === 'STOCKYARD'
          ? '#3b82f6'
          : '#10b981';

      const polygon = L.polygon(latLngs, {
        color: color,
        fillColor: color,
        fillOpacity: 0.18,
        weight: 2,
        dashArray: gf.zone_type === 'RESTRICTED' ? '4, 8' : undefined,
      });

      polygon.bindTooltip(
        `<div class="text-xs font-semibold p-1">
          <div class="text-amber-400 font-bold">${gf.name}</div>
          <div class="text-slate-300 text-[10px]">Type: ${gf.zone_type} | Mineral: ${gf.mineral_type}</div>
          <div class="text-slate-400 text-[10px]">Speed Limit: ${gf.speed_limit} km/h</div>
        </div>`,
        { sticky: true, className: 'leaflet-custom-tooltip' }
      );

      geofenceLayersRef.current?.addLayer(polygon);
    });
  }, [geofences, showGeofences]);

  // 4. Render Checkposts & Weighbridges
  useEffect(() => {
    if (!checkpostLayersRef.current) return;
    checkpostLayersRef.current.clearLayers();

    if (!showCheckposts) return;

    checkposts.forEach((cp) => {
      const isWeighbridge = cp.type === 'WEIGHBRIDGE';
      const iconHtml = `
        <div class="relative flex items-center justify-center w-8 h-8 rounded-lg ${
          isWeighbridge ? 'bg-indigo-900/90 border-indigo-400' : 'bg-cyan-900/90 border-cyan-400'
        } border shadow-lg text-white">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${
              isWeighbridge
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>'
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>'
            }
          </svg>
          ${
            cp.cctv_active
              ? '<span class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-slate-900 animate-ping"></span>'
              : ''
          }
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-checkpost-marker',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(cp.coordinates, { icon });
      marker.bindPopup(
        `<div class="p-1 space-y-1 text-xs">
          <div class="font-bold text-amber-400 text-sm">${cp.name}</div>
          <div class="text-slate-300">District: <span class="text-white">${cp.district}</span></div>
          <div class="text-slate-300">Facility Type: <span class="text-cyan-300 font-medium">${cp.type}</span></div>
          <div class="text-slate-300">ANPR / CCTV: <span class="${
            cp.anpr_active ? 'text-emerald-400' : 'text-slate-400'
          }">${cp.anpr_active ? 'Online Active' : 'Manual'}</span></div>
          <div class="text-slate-300">Daily Scanned Tonnage: <span class="text-white font-mono">${
            cp.daily_scans
          } Trucks</span></div>
        </div>`
      );

      checkpostLayersRef.current?.addLayer(marker);
    });
  }, [checkposts, showCheckposts]);

  // 5. Render Vehicle Markers with Heading Rotation
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const currentMarkers = vehicleMarkersRef.current;
    const activeRegNos = new Set(vehicles.map((v) => v.reg_no));

    // Remove old markers
    currentMarkers.forEach((marker, regNo) => {
      if (!activeRegNos.has(regNo)) {
        map.removeLayer(marker);
        currentMarkers.delete(regNo);
      }
    });

    // Add or update markers
    vehicles.forEach((vehicle) => {
      const isSelected = selectedVehicle?.reg_no === vehicle.reg_no;
      const isSOS = vehicle.status === 'SOS' || vehicle.last_emergency;
      const isOverSpeed = vehicle.status === 'OVERSPEED';
      const isMoving = vehicle.status === 'MOVING';

      const statusBg = isSOS
        ? 'bg-rose-600 border-rose-400 text-white marker-sos-pulse'
        : isOverSpeed
        ? 'bg-amber-500 border-amber-300 text-black'
        : isMoving
        ? 'bg-emerald-600 border-emerald-400 text-white marker-moving-pulse'
        : vehicle.status === 'IDLE'
        ? 'bg-yellow-600 border-yellow-400 text-white'
        : 'bg-slate-700 border-slate-500 text-slate-300';

      const iconHtml = `
        <div class="relative cursor-pointer transition-transform duration-300" style="transform: scale(${
          isSelected ? '1.25' : '1.0'
        });">
          <div class="flex items-center justify-center w-10 h-10 rounded-full ${statusBg} border-2 shadow-2xl backdrop-blur-md">
            <svg class="w-5 h-5 transition-transform duration-500" style="transform: rotate(${
              vehicle.last_heading
            }deg);" fill="currentColor" viewBox="0 0 24 24">
              <!-- Directional Navigation Arrow -->
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
            </svg>
          </div>
          <!-- Vehicle Plate Badge -->
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-slate-900/90 text-[9px] font-mono font-bold text-amber-300 rounded border border-slate-700 whitespace-nowrap shadow-md">
            ${vehicle.reg_no.slice(-7)}
          </div>
          <!-- Speed Indicator Pill -->
          ${
            isMoving
              ? `<div class="absolute -top-3 left-1/2 -translate-x-1/2 px-1 bg-slate-950/90 text-[8px] font-bold text-emerald-400 rounded-full border border-emerald-500/50">
                  ${Math.round(vehicle.last_speed)}k
                </div>`
              : ''
          }
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'vehicle-div-marker',
        html: iconHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const position: [number, number] = [vehicle.last_latitude, vehicle.last_longitude];

      if (currentMarkers.has(vehicle.reg_no)) {
        const marker = currentMarkers.get(vehicle.reg_no)!;
        marker.setLatLng(position);
        marker.setIcon(customIcon);
      } else {
        const marker = L.marker(position, { icon: customIcon }).addTo(map);
        marker.on('click', () => {
          onSelectVehicle(vehicle);
        });
        currentMarkers.set(vehicle.reg_no, marker);
      }
    });
  }, [vehicles, selectedVehicle, onSelectVehicle]);

  // 6. Historic Route Trail
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (trailPolylineRef.current) {
      map.removeLayer(trailPolylineRef.current);
      trailPolylineRef.current = null;
    }

    if (showTrail && trailPoints.length > 1) {
      const polyline = L.polyline(trailPoints, {
        color: '#38bdf8',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 6',
      }).addTo(map);

      trailPolylineRef.current = polyline;
      map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
    }
  }, [showTrail, trailPoints]);

  // Center on selected vehicle
  useEffect(() => {
    if (selectedVehicle && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(
        [selectedVehicle.last_latitude, selectedVehicle.last_longitude],
        { animate: true, duration: 0.8 }
      );
    }
  }, [selectedVehicle]);

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
