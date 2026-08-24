import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import L from 'leaflet';
import type {
  CheckpostFeature,
  GeofenceZone,
  GISLayerConfig,
  Vehicle,
} from '../types/vts.types';
import {
  WORLD_OUTER_RING,
  RAJASTHAN_OUTER_BOUNDARY,
  RAJASTHAN_BOUNDS,
  RAJASTHAN_STATE_CENTER,
  RAJASTHAN_DIVISION_LABELS,
  RAJASTHAN_DISTRICTS_GEOJSON,
} from '../data/rajasthanGeoData';
import {
  gisGeocodeService,
  type ReverseGeocodeResult,
  type GeocodeSearchResult,
} from '../services/gisGeocodeService';
import { Search, Compass, X, Loader2 } from 'lucide-react';

export interface RajdharaaMapHandle {
  resetRajasthanView: () => void;
  flyToLocation: (
    lat: number,
    lng: number,
    zoom?: number,
    labelInfo?: { name: string; district?: string; type?: string }
  ) => void;
}

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
  showDistricts?: boolean;
  showDivisionLabels?: boolean;
  showTrail?: boolean;
  trailPoints?: [number, number][];
  enableClickGeocode?: boolean;
  onGeocodeResult?: (result: ReverseGeocodeResult) => void;
  hideEmbeddedSearch?: boolean;
}

export const RajdharaaMap = forwardRef<RajdharaaMapHandle, RajdharaaMapProps>(
  (
    {
      vehicles,
      geofences,
      checkposts,
      activeLayerId,
      gisLayers,
      selectedVehicle,
      onSelectVehicle,
      showGeofences = true,
      showCheckposts = true,
      showDistricts = true,
      showDivisionLabels = true,
      showTrail = false,
      trailPoints = [],
      enableClickGeocode = true,
      onGeocodeResult,
      hideEmbeddedSearch = false,
    },
    ref
  ) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const maskLayerRef = useRef<L.Polygon | null>(null);
    const borderLayerGroupRef = useRef<L.LayerGroup | null>(null);
    const districtsLayerRef = useRef<L.GeoJSON | null>(null);
    const divisionLabelsRef = useRef<L.LayerGroup | null>(null);
    const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map());
    const geofenceLayersRef = useRef<L.LayerGroup | null>(null);
    const checkpostLayersRef = useRef<L.LayerGroup | null>(null);
    const trailPolylineRef = useRef<L.Polyline | null>(null);
    const geocodeMarkerRef = useRef<L.Marker | null>(null);

    const [geocoding, setGeocoding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<GeocodeSearchResult[]>([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [searching, setSearching] = useState(false);

    const isDarkLayer = activeLayerId === 'rajdharaa-dark-night';

    // Handler: Reset Map to Rajasthan State View
    const handleResetRajasthanView = useCallback(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView(RAJASTHAN_STATE_CENTER, 7, { animate: true });
      }
    }, []);

    // Handler: Fly to a location with pin
    const handleFlyToLocation = useCallback(
      (
        lat: number,
        lng: number,
        zoom = 12,
        labelInfo?: { name: string; district?: string; type?: string }
      ) => {
        if (!mapInstanceRef.current) return;
        const map = mapInstanceRef.current;
        map.flyTo([lat, lng], zoom, { duration: 1.2 });

        if (geocodeMarkerRef.current) {
          map.removeLayer(geocodeMarkerRef.current);
        }

        const pinIcon = L.divIcon({
          className: 'custom-geocode-pin',
          html: `
            <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full">
              <div class="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-2xl border-2 border-white animate-bounce">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                </svg>
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
        if (labelInfo) {
          marker
            .bindPopup(
              `
              <div class="p-2 space-y-1 text-xs">
                <div class="font-bold text-slate-900 text-sm">${labelInfo.name}</div>
                <div class="text-slate-600">${labelInfo.district || 'Rajasthan'}</div>
                <div class="text-[10px] text-amber-700 font-bold uppercase">${labelInfo.type || 'Location'}</div>
              </div>
              `
            )
            .openPopup();
        }

        geocodeMarkerRef.current = marker;
      },
      []
    );

    // Expose methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        resetRajasthanView: handleResetRajasthanView,
        flyToLocation: handleFlyToLocation,
      }),
      [handleResetRajasthanView, handleFlyToLocation]
    );

    // 1. Initialize Map Strictly Constrained to Rajasthan
    useEffect(() => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: RAJASTHAN_STATE_CENTER,
        zoom: 7,
        minZoom: 6,
        maxZoom: 19,
        maxBounds: RAJASTHAN_BOUNDS,
        maxBoundsViscosity: 1.0,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Initialize layer groups in order
      borderLayerGroupRef.current = L.layerGroup().addTo(map);
      divisionLabelsRef.current = L.layerGroup().addTo(map);
      geofenceLayersRef.current = L.layerGroup().addTo(map);
      checkpostLayersRef.current = L.layerGroup().addTo(map);

      // Handle map click for ArcGIS Reverse Geocoding
      map.on('click', async (e: L.LeafletMouseEvent) => {
        if (!enableClickGeocode) return;
        const { lat, lng } = e.latlng;
        if (
          lat < RAJASTHAN_BOUNDS[0][0] ||
          lat > RAJASTHAN_BOUNDS[1][0] ||
          lng < RAJASTHAN_BOUNDS[0][1] ||
          lng > RAJASTHAN_BOUNDS[1][1]
        ) {
          return;
        }

        setGeocoding(true);
        try {
          const result = await gisGeocodeService.reverseGeocode(lat, lng);
          onGeocodeResult?.(result);

          if (geocodeMarkerRef.current) {
            map.removeLayer(geocodeMarkerRef.current);
          }

          const markerIcon = L.divIcon({
            className: 'custom-geocode-pin',
            html: `
              <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full">
                <div class="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-2xl border-2 border-white animate-bounce">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          });

          const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
          marker
            .bindPopup(
              `
              <div class="p-3 space-y-2 min-w-[240px] text-xs font-sans">
                <div class="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    ArcGIS / Rajdharaa GIS
                  </span>
                  <span class="font-mono text-[10px] text-slate-500">${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
                </div>
                <div>
                  <div class="font-bold text-slate-900 text-sm leading-tight">${result.placeName || result.district}</div>
                  <div class="text-slate-600 mt-1">${result.matchAddress}</div>
                </div>
                <div class="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>District: <strong class="text-slate-800">${result.district}</strong></span>
                  <span class="text-emerald-700 font-semibold">Verified Locality</span>
                </div>
              </div>
              `,
              { className: 'rajasthan-geocode-popup' }
            )
            .openPopup();

          geocodeMarkerRef.current = marker;
        } catch (err) {
          console.error('Reverse geocode click error:', err);
        } finally {
          setGeocoding(false);
        }
      });

      mapInstanceRef.current = map;

      return () => {
        map.remove();
        mapInstanceRef.current = null;
      };
    }, [enableClickGeocode, onGeocodeResult]);

    // 2. Handle Tile Layer Switching & Dynamic Inverse Mask
    useEffect(() => {
      if (!mapInstanceRef.current) return;
      const map = mapInstanceRef.current;

      const targetConfig = gisLayers.find((l) => l.id === activeLayerId) || gisLayers[0];
      if (!targetConfig) return;

      // 2.1 Switch Base Tile Layer
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }

      const newTileLayer = L.tileLayer(targetConfig.url, {
        attribution: targetConfig.attribution,
        maxZoom: targetConfig.max_zoom || 19,
        minZoom: targetConfig.min_zoom || 6,
      }).addTo(map);

      tileLayerRef.current = newTileLayer;

      // 2.2 Rebuild Inverse Mask to match layer lighting
      if (maskLayerRef.current) {
        map.removeLayer(maskLayerRef.current);
      }

      const maskColor = isDarkLayer ? '#080c14' : '#f8fafc';
      const maskOpacity = isDarkLayer ? 0.96 : 0.95;

      const maskPolygon = L.polygon([WORLD_OUTER_RING, RAJASTHAN_OUTER_BOUNDARY], {
        fillColor: maskColor,
        fillOpacity: maskOpacity,
        stroke: false,
        interactive: false,
        pane: 'overlayPane',
      }).addTo(map);

      maskLayerRef.current = maskPolygon;

      // 2.3 Rebuild Stylized Rajasthan State Border
      if (borderLayerGroupRef.current) {
        borderLayerGroupRef.current.clearLayers();

        const outerBorder = L.polygon(RAJASTHAN_OUTER_BOUNDARY, {
          color: isDarkLayer ? '#38bdf8' : '#1e293b',
          weight: 3.0,
          fill: false,
          opacity: 0.9,
          interactive: false,
        });

        const accentBorder = L.polygon(RAJASTHAN_OUTER_BOUNDARY, {
          color: isDarkLayer ? '#f59e0b' : '#d97706',
          weight: 1.5,
          fill: false,
          opacity: 0.75,
          dashArray: '8, 6',
          interactive: false,
        });

        borderLayerGroupRef.current.addLayer(outerBorder);
        borderLayerGroupRef.current.addLayer(accentBorder);
      }
    }, [activeLayerId, gisLayers, isDarkLayer]);

    // 3. Render Rajasthan 33 District Boundaries
    useEffect(() => {
      if (!mapInstanceRef.current) return;
      const map = mapInstanceRef.current;

      if (districtsLayerRef.current) {
        map.removeLayer(districtsLayerRef.current);
        districtsLayerRef.current = null;
      }

      if (!showDistricts) return;

      const districtLayer = L.geoJSON(RAJASTHAN_DISTRICTS_GEOJSON, {
        style: {
          color: isDarkLayer ? '#475569' : '#64748b',
          weight: 1.2,
          opacity: 0.65,
          fillColor: '#38bdf8',
          fillOpacity: 0.02,
          dashArray: '3, 4',
        },
        onEachFeature: (feature, layer) => {
          const districtName = feature.properties?.district || 'District';
          layer.bindTooltip(
            `<div class="font-semibold text-xs py-0.5 px-1">${districtName} District</div>`,
            { sticky: true, className: 'leaflet-custom-tooltip' }
          );

          layer.on({
            mouseover: (e) => {
              const target = e.target;
              target.setStyle({
                weight: 2.2,
                color: '#f59e0b',
                fillOpacity: 0.08,
              });
            },
            mouseout: (e) => {
              const target = e.target;
              target.setStyle({
                weight: 1.2,
                color: isDarkLayer ? '#475569' : '#64748b',
                fillOpacity: 0.02,
              });
            },
          });
        },
      }).addTo(map);

      districtsLayerRef.current = districtLayer;
    }, [showDistricts, isDarkLayer]);

    // 4. Render Division Labels & Watermark Typography
    useEffect(() => {
      if (!divisionLabelsRef.current) return;
      divisionLabelsRef.current.clearLayers();

      if (!showDivisionLabels) return;

      RAJASTHAN_DIVISION_LABELS.forEach((div) => {
        const isStateLabel = div.isState;
        const html = isStateLabel
          ? `<div class="rajasthan-state-title ${isDarkLayer ? 'text-amber-400' : ''}">${div.name}</div>`
          : `<div class="rajasthan-division-badge ${isDarkLayer ? 'dark' : ''}">${div.name}</div>`;

        const icon = L.divIcon({
          className: 'custom-division-marker',
          html: html,
          iconSize: undefined,
          iconAnchor: isStateLabel ? [70, 12] : [28, 10],
        });

        const marker = L.marker([div.lat, div.lng], { icon, interactive: false });
        divisionLabelsRef.current?.addLayer(marker);
      });
    }, [showDivisionLabels, isDarkLayer]);

    // 5. Render Mining Lease Geofences
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
          fillOpacity: 0.22,
          weight: 2,
          dashArray: gf.zone_type === 'RESTRICTED' ? '4, 8' : undefined,
        });

        polygon.bindTooltip(
          `<div class="text-xs font-semibold p-1">
            <div class="text-amber-800 font-bold">${gf.name}</div>
            <div class="text-slate-700 text-[10px]">Type: ${gf.zone_type} | Mineral: ${gf.mineral_type}</div>
            <div class="text-slate-500 text-[10px]">Speed Limit: ${gf.speed_limit} km/h</div>
          </div>`,
          { sticky: true, className: 'leaflet-custom-tooltip' }
        );

        geofenceLayersRef.current?.addLayer(polygon);
      });
    }, [geofences, showGeofences]);

    // 6. Render Checkposts & Weighbridges
    useEffect(() => {
      if (!checkpostLayersRef.current) return;
      checkpostLayersRef.current.clearLayers();

      if (!showCheckposts) return;

      checkposts.forEach((cp) => {
        const isWeighbridge = cp.type === 'WEIGHBRIDGE';
        const iconHtml = `
          <div class="relative flex items-center justify-center w-8 h-8 rounded-lg ${
            isWeighbridge ? 'bg-indigo-700 border-indigo-300' : 'bg-cyan-700 border-cyan-300'
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
                ? '<span class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-white animate-ping"></span>'
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
            <div class="font-bold text-slate-900 text-sm">${cp.name}</div>
            <div class="text-slate-600">District: <span class="text-slate-900 font-semibold">${cp.district}</span></div>
            <div class="text-slate-600">Facility Type: <span class="text-cyan-700 font-semibold">${cp.type}</span></div>
            <div class="text-slate-600">ANPR / CCTV: <span class="${
              cp.anpr_active ? 'text-emerald-700 font-semibold' : 'text-slate-400'
            }">${cp.anpr_active ? 'Online Active' : 'Manual'}</span></div>
            <div class="text-slate-600">Daily Scanned Tonnage: <span class="text-slate-900 font-mono font-semibold">${
              cp.daily_scans
            } Trucks</span></div>
          </div>`
        );

        checkpostLayersRef.current?.addLayer(marker);
      });
    }, [checkposts, showCheckposts]);

    // 7. Render Vehicle Markers with Heading Rotation
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
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
              </svg>
            </div>
            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-white text-[9px] font-mono font-bold text-slate-900 rounded border border-slate-300 whitespace-nowrap shadow-md">
              ${vehicle.reg_no.slice(-7)}
            </div>
            ${
              isMoving
                ? `<div class="absolute -top-3 left-1/2 -translate-x-1/2 px-1 bg-white text-[8px] font-bold text-emerald-700 rounded-full border border-emerald-300 shadow-xs">
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

    // 8. Historic Route Trail
    useEffect(() => {
      if (!mapInstanceRef.current) return;
      const map = mapInstanceRef.current;

      if (trailPolylineRef.current) {
        map.removeLayer(trailPolylineRef.current);
        trailPolylineRef.current = null;
      }

      if (showTrail && trailPoints.length > 1) {
        const polyline = L.polyline(trailPoints, {
          color: '#0284c7',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 6',
        }).addTo(map);

        trailPolylineRef.current = polyline;
        map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
      }
    }, [showTrail, trailPoints]);

    // 9. Center on Selected Vehicle
    useEffect(() => {
      if (selectedVehicle && mapInstanceRef.current) {
        mapInstanceRef.current.panTo(
          [selectedVehicle.last_latitude, selectedVehicle.last_longitude],
          { animate: true, duration: 0.8 }
        );
      }
    }, [selectedVehicle]);

    const handleSearchPlaces = async (val: string) => {
      setSearchQuery(val);
      if (!val.trim()) {
        setSearchResults([]);
        setShowSearchDropdown(false);
        return;
      }

      setSearching(true);
      try {
        const results = await gisGeocodeService.searchRajasthanPlaces(val);
        setSearchResults(results);
        setShowSearchDropdown(results.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const handleSelectSearchResult = (res: GeocodeSearchResult) => {
      handleFlyToLocation(res.latitude, res.longitude, 12, res);
      setShowSearchDropdown(false);
      setSearchQuery(res.name);
    };

    return (
      <div className="relative w-full h-full min-h-[500px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-inner">
        {/* Fallback embedded search bar if not provided by parent */}
        {!hideEmbeddedSearch && (
          <div className="absolute top-3.5 right-3.5 z-[900] flex items-center gap-2">
            <div className="relative w-56 md:w-64">
              <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-md">
                <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Find place in Rajasthan..."
                  value={searchQuery}
                  onChange={(e) => handleSearchPlaces(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                  className="bg-transparent text-xs text-slate-800 focus:outline-none w-full placeholder:text-slate-400"
                />
                {searching ? (
                  <Loader2 className="w-3 h-3 text-amber-600 animate-spin flex-shrink-0" />
                ) : searchQuery ? (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setShowSearchDropdown(false);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : (
                  <span className="text-[9px] uppercase font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 flex-shrink-0">
                    RJ
                  </span>
                )}
              </div>

              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute top-full mt-1.5 left-0 right-0 bg-white/98 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl overflow-hidden text-xs max-h-56 overflow-y-auto z-50">
                  <div className="px-3 py-1 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Rajasthan Locations & Mines
                  </div>
                  {searchResults.map((res, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectSearchResult(res)}
                      className="w-full text-left px-3 py-1.5 hover:bg-amber-50/80 flex items-center justify-between border-b border-slate-50 transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{res.name}</div>
                        <div className="text-[10px] text-slate-500">{res.district || 'Rajasthan'}</div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">
                        {res.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleResetRajasthanView}
              title="Fit Rajasthan State View"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-md hover:bg-white text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 shadow-md transition-all hover:scale-105"
            >
              <Compass className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Rajasthan</span>
            </button>
          </div>
        )}

        {/* Geocoding Loading Indicator Pill */}
        {geocoding && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[900] flex items-center gap-2 bg-slate-900/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-2xl text-xs font-mono border border-slate-700 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>ArcGIS Reverse Geocoding Point...</span>
          </div>
        )}

        {/* Main Leaflet Map Container */}
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>
    );
  }
);

RajdharaaMap.displayName = 'RajdharaaMap';
