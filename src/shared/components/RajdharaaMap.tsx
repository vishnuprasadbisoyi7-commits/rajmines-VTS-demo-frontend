import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import L from 'leaflet';
import type {
  CheckpostFeature,
  GeofenceZone,
  GISLayerConfig,
  Vehicle,
  RawannaTransitDetails,
} from '../types/vts.types';
// EXCESS: Geo data & lucide icons commented out to match production (uncomment to restore):
import {
  // WORLD_OUTER_RING,
  // RAJASTHAN_OUTER_BOUNDARY,
  RAJASTHAN_BOUNDS,
  RAJASTHAN_STATE_CENTER,
  // RAJASTHAN_DIVISION_LABELS,
  // RAJASTHAN_DISTRICTS_GEOJSON,
} from '../data/rajasthanGeoData';
// import {
//   gisGeocodeService,
//   type ReverseGeocodeResult,
//   type GeocodeSearchResult,
// } from '../services/gisGeocodeService';
import type { ReverseGeocodeResult } from '../services/gisGeocodeService';
// import { Search, Compass, X, Loader2 } from 'lucide-react';

export interface RajdharaaMapHandle {
  resetRajasthanView: () => void;
  flyToLocation: (
    lat: number,
    lng: number,
    zoom?: number,
    labelInfo?: { name: string; district?: string; type?: string }
  ) => void;
  panToLocation: (lat: number, lng: number) => void;
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
  initialCenter?: [number, number];
  initialZoom?: number;
  transitDetails?: RawannaTransitDetails | null;
  isTransitMode?: boolean;
  replayRoutePoints?: [number, number][];
  replayTraveledPoints?: [number, number][];
  isReplayMode?: boolean;
  followVehicleCamera?: boolean;
}

export const RajdharaaMap = forwardRef<RajdharaaMapHandle, RajdharaaMapProps>(
  (
    {
      vehicles,
      geofences: _geofences,
      checkposts: _checkposts,
      activeLayerId,
      gisLayers,
      selectedVehicle,
      onSelectVehicle,
      showGeofences: _showGeofences = true,
      showCheckposts: _showCheckposts = true,
      showDistricts: _showDistricts = true,
      showDivisionLabels: _showDivisionLabels = true,
      showTrail = false,
      trailPoints = [],
      enableClickGeocode: _enableClickGeocode = true,
      onGeocodeResult: _onGeocodeResult,
      hideEmbeddedSearch: _hideEmbeddedSearch = false,
      initialCenter,
      initialZoom = 13,
      transitDetails,
      isTransitMode = false,
      replayRoutePoints = [],
      replayTraveledPoints = [],
      isReplayMode = false,
      followVehicleCamera = false,
    },
    ref
  ) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    // const maskLayerRef = useRef<L.Polygon | null>(null);
    const borderLayerGroupRef = useRef<L.LayerGroup | null>(null);
    // const districtsLayerRef = useRef<L.GeoJSON | null>(null);
    const divisionLabelsRef = useRef<L.LayerGroup | null>(null);
    const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map());
    const geofenceLayersRef = useRef<L.LayerGroup | null>(null);
    const checkpostLayersRef = useRef<L.LayerGroup | null>(null);
    const trailPolylineRef = useRef<L.Polyline | null>(null);
    const geocodeMarkerRef = useRef<L.Marker | null>(null);
    const prevSelectedRegNoRef = useRef<string | null>(null);
    const transitPlannedRouteLayerRef = useRef<L.Polyline | null>(null);
    const transitBufferLayerRef = useRef<L.Polyline | null>(null);
    const transitTraveledLayerRef = useRef<L.Polyline | null>(null);
    const transitDeviatedLayerRef = useRef<L.Polyline | null>(null);
    const transitMarkersGroupRef = useRef<L.LayerGroup | null>(null);
    const lastFittedTransitVehicleRef = useRef<string | null>(null);
    const replayRouteLayerRef = useRef<L.Polyline | null>(null);
    const replayTraveledLayerRef = useRef<L.Polyline | null>(null);
    const replayMarkersGroupRef = useRef<L.LayerGroup | null>(null);
    const replayVehicleMarkerRef = useRef<L.Marker | null>(null);

    // EXCESS: Search & geocode states - Commented out for production (uncomment to restore):
    /*
    const [geocoding, setGeocoding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<GeocodeSearchResult[]>([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [searching, setSearching] = useState(false);
    */

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
        panToLocation: (lat: number, lng: number) => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo([lat, lng], { animate: true, duration: 0.5 });
          }
        },
      }),
      [handleResetRajasthanView, handleFlyToLocation]
    );

    // 1. Initialize Map Strictly Constrained to Rajasthan
    useEffect(() => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const defaultCenter: [number, number] =
        initialCenter ||
        (vehicles.length > 0 && vehicles[0].last_latitude
          ? [vehicles[0].last_latitude, vehicles[0].last_longitude]
          : [27.0425, 74.7214]);

      const defaultZoom = initialZoom ?? 13;

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: defaultZoom,
        minZoom: 5,
        maxZoom: 19,
        maxBounds: RAJASTHAN_BOUNDS,
        maxBoundsViscosity: 0.8,
        zoomControl: false,
        attributionControl: false,
      });

      // EXCESS: Zoom control - Commented out to match production. Uncomment to restore:
      // L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Initialize layer groups in order
      borderLayerGroupRef.current = L.layerGroup().addTo(map);
      divisionLabelsRef.current = L.layerGroup().addTo(map);
      geofenceLayersRef.current = L.layerGroup().addTo(map);
      checkpostLayersRef.current = L.layerGroup().addTo(map);

      // EXCESS: Reverse Geocoding Map Click - Commented out to match production. Uncomment to restore:
      /*
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
      */

      mapInstanceRef.current = map;

      return () => {
        map.remove();
        mapInstanceRef.current = null;
        replayVehicleMarkerRef.current = null;
        replayMarkersGroupRef.current = null;
        replayRouteLayerRef.current = null;
        transitPlannedRouteLayerRef.current = null;
        transitBufferLayerRef.current = null;
        transitTraveledLayerRef.current = null;
        transitDeviatedLayerRef.current = null;
        transitMarkersGroupRef.current = null;
        trailPolylineRef.current = null;
        borderLayerGroupRef.current = null;
        divisionLabelsRef.current = null;
        geofenceLayersRef.current = null;
        checkpostLayersRef.current = null;
        geocodeMarkerRef.current = null;
        vehicleMarkersRef.current.clear();
      };
    }, [_enableClickGeocode, _onGeocodeResult]);

    // 2. Handle Tile Layer Switching & Dynamic Inverse Mask
    useEffect(() => {
      if (!mapInstanceRef.current) return;
      const map = mapInstanceRef.current;

      const targetConfig = gisLayers.find((l) => l.id === activeLayerId) || gisLayers[0];
      if (!targetConfig) return;

      // 2.1 Switch Base Tile Layer (Defaulting to Esri World Street Map matching production)
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }

      const defaultEsriUrl =
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
      const tileUrl =
        targetConfig?.id === 'esri-street' || !targetConfig
          ? defaultEsriUrl
          : targetConfig.url;

      const newTileLayer = L.tileLayer(tileUrl, {
        attribution: 'Esri | TomTom | Garmin | METI/NASA | USGS',
        maxZoom: targetConfig?.max_zoom || 19,
        minZoom: targetConfig?.min_zoom || 5,
      }).addTo(map);

      tileLayerRef.current = newTileLayer;

      // EXCESS: Dynamic Inverse Mask - Commented out to match clean production view. Uncomment to restore:
      /*
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
      */

      // EXCESS: Stylized Rajasthan State Border - Commented out to match production. Uncomment to restore:
      /*
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
      */
    }, [activeLayerId, gisLayers, isDarkLayer]);

    // EXCESS: 3. Render Rajasthan 33 District Boundaries - Commented out for production (uncomment to restore):
    /*
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
        },
      }).addTo(map);

      districtsLayerRef.current = districtLayer;
    }, [showDistricts, isDarkLayer]);
    */

    // EXCESS: 4. Render Division Labels - Commented out for production (uncomment to restore):
    /*
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
    */

    // EXCESS: 5. Render Mining Lease Geofences - Commented out for production (uncomment to restore):
    /*
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
        geofenceLayersRef.current?.addLayer(polygon);
      });
    }, [geofences, showGeofences]);
    */

    // EXCESS: 6. Render Checkposts & Weighbridges - Commented out for production (uncomment to restore):
    /*
    useEffect(() => {
      if (!checkpostLayersRef.current) return;
      checkpostLayersRef.current.clearLayers();
      if (!showCheckposts) return;

      checkposts.forEach((cp) => {
        const isWeighbridge = cp.type === 'WEIGHBRIDGE';
        const icon = L.divIcon({
          className: 'custom-checkpost-marker',
          html: `<div class="w-8 h-8 bg-cyan-700 text-white rounded"></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        const marker = L.marker(cp.coordinates, { icon });
        checkpostLayersRef.current?.addLayer(marker);
      });
    }, [checkposts, showCheckposts]);
    */

    // 7. Render Production-Matching Vehicle Markers (Red rectangular truck icon) & Info Popup
    useEffect(() => {
      if (!mapInstanceRef.current) return;
      // In replay mode, the replay vehicle marker is handled by dedicated Section 8.7
      if (isReplayMode) return;

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
        const heading = vehicle.last_heading || 0;

        /* EXCESS: Previous circular marker - Commented out for future reference:
        const oldIconHtml = `
          <div class="relative cursor-pointer transition-transform duration-300" style="transform: scale(${isSelected ? '1.25' : '1.0'});">
            <div class="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-600 border-2 shadow-2xl">
              <svg class="w-5 h-5" style="transform: rotate(${heading}deg);" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
            </div>
          </div>
        `;
        */

        // Speed tag above red truck-like vehicle marker matching Image 2 & 3 & Replay Mode
        const showSpeedTag = isTransitMode || isReplayMode || (selectedVehicle?.reg_no === vehicle.reg_no) || vehicle.last_speed > 0;
        const iconHtml = `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; user-select: none;">
            ${
              showSpeedTag
                ? `<div style="font-weight: 800; font-size: 11px; text-align: center; color: #000000; margin-bottom: 2px; text-shadow: 0 1px 2px #fff, 0 -1px 2px #fff, 1px 0 2px #fff, -1px 0 2px #fff; line-height: 1; white-space: nowrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    ${Math.round(vehicle.last_speed)} km/h
                  </div>`
                : ''
            }
            <div style="transform: rotate(${heading}deg); transform-origin: center center; width: 18px; height: 36px; display: flex; align-items: center; justify-content: center;">
              <!-- Authentic Truck Structure (Cab + Coupling Neck + Cargo/Trailer Bed) -->
              <div style="width: 14px; height: 35px; display: flex; flex-direction: column; align-items: center; position: relative;">
                <!-- Front Cab with side mirrors and black windshield stripe -->
                <div style="width: 14px; height: 10px; background: #dc2626; border: 1px solid #991b1b; border-radius: 3px 3px 1px 1px; box-shadow: 0 1px 3px rgba(0,0,0,0.35); position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; z-index: 2;">
                  <!-- Black curved windshield bar -->
                  <div style="width: 10px; height: 3px; background: #000000; border-radius: 1px; margin-top: 1.5px;"></div>
                  <!-- Side mirrors -->
                  <div style="position: absolute; top: 1px; left: -2px; width: 2px; height: 3px; background: #991b1b; border-radius: 1px 0 0 1px;"></div>
                  <div style="position: absolute; top: 1px; right: -2px; width: 2px; height: 3px; background: #991b1b; border-radius: 0 1px 1px 0;"></div>
                </div>
                <!-- Coupling Neck Gap -->
                <div style="width: 6px; height: 2px; background: #7f1d1d; margin: 0 auto; z-index: 1;"></div>
                <!-- Rear Cargo / Trailer Bed -->
                <div style="width: 14px; height: 22px; background: #dc2626; border: 1px solid #991b1b; border-radius: 1px 1px 2px 2px; box-shadow: 0 2px 5px rgba(0,0,0,0.35); position: relative; overflow: hidden; z-index: 2;">
                  <!-- Subtle inner cargo bed ridge line -->
                  <div style="width: 10px; height: 1px; background: #b91c1c; margin: 3px auto 0 auto;"></div>
                  <!-- Rear Bumper / Tail Lights -->
                  <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: #7f1d1d; border-top: 1px solid #991b1b;"></div>
                </div>
              </div>
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          className: `prod-vehicle-marker ${isReplayMode ? 'replay-marker' : ''}`,
          html: iconHtml,
          iconSize: [44, showSpeedTag ? 54 : 36],
          iconAnchor: [22, showSpeedTag ? 35 : 18],
        });

        // Popup content: Shows Lessee & Consignee pass card if transitDetails active (Image 1), else standard
        let popupHtml = '';
        if (transitDetails && (transitDetails.vehicle_reg_no === vehicle.reg_no || isTransitMode)) {
          popupHtml = `
            <div style="padding: 12px 14px; min-width: 220px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <div style="display: flex; align-items: center; gap: 6px; color: #475569; font-weight: 700; font-size: 11px; text-transform: uppercase;">
                <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #2563eb;"></span>
                LESSEE
              </div>
              <div style="font-weight: 700; color: #0f172a; font-size: 13.5px; margin-bottom: 8px;">
                ${transitDetails.pointA.name}
              </div>
              <div style="display: flex; align-items: center; gap: 6px; color: #475569; font-weight: 700; font-size: 11px; text-transform: uppercase;">
                <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #dc2626;"></span>
                CONSIGNEE
              </div>
              <div style="font-weight: 700; color: #0f172a; font-size: 13.5px;">
                ${transitDetails.pointC.name}
              </div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 10px;">
                ${transitDetails.consignee_address || transitDetails.pointC.subtext || 'Jaipur , Jaipur, Rajasthan,'}
              </div>
              <div style="border-top: 1px solid #f1f5f9; padding-top: 8px; display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #64748b;">
                <span>📅 ${transitDetails.generated_at.split(' ')[0]}</span>
                <span>Exp: ${transitDetails.expire_at}</span>
              </div>
            </div>
          `;
        } else {
          const rawannaText =
            vehicle.active_e_ravanna && vehicle.active_e_ravanna !== 'N/A'
              ? `e-Rawanna: ${vehicle.active_e_ravanna}`
              : 'No active e-Rawanna.';

          popupHtml = `
            <div style="padding: 12px 14px; min-width: 220px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                <span style="font-weight: 700; color: #0c4a6e; font-size: 14px; letter-spacing: -0.01em;">${vehicle.reg_no}</span>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 11px; font-weight: 500; color: #475569; background: #f1f5f9; padding: 2px 8px; border-radius: 9999px;">${vehicle.last_speed.toFixed(0)} km/h</span>
                  <button id="close-popup-${vehicle.reg_no}" style="background: none; border: none; font-size: 15px; color: #94a3b8; cursor: pointer; padding: 0 2px; line-height: 1;" title="Close">✕</button>
                </div>
              </div>
              <div style="padding-top: 10px; padding-bottom: 2px; text-align: center; font-size: 12px; color: #64748b;">
                ${rawannaText}
              </div>
            </div>
          `;
        }

        const position: [number, number] = [vehicle.last_latitude, vehicle.last_longitude];

        let marker: L.Marker;
        if (currentMarkers.has(vehicle.reg_no)) {
          marker = currentMarkers.get(vehicle.reg_no)!;
          if (!map.hasLayer(marker)) {
            marker.addTo(map);
          }
          marker.setLatLng(position);
          marker.setIcon(customIcon);
          marker.setPopupContent(popupHtml);
        } else {
          marker = L.marker(position, { icon: customIcon }).addTo(map);
          marker.bindPopup(popupHtml, {
            className: 'production-vehicle-leaflet-popup',
            offset: [0, -18],
            closeButton: false,
            autoPan: false,
          });

          marker.on('popupopen', () => {
            const btn = document.getElementById(`close-popup-${vehicle.reg_no}`);
            if (btn) {
              btn.onclick = (e) => {
                e.stopPropagation();
                marker.closePopup();
              };
            }
          });

          marker.on('click', () => {
            onSelectVehicle(vehicle);
            marker.openPopup();
          });
          currentMarkers.set(vehicle.reg_no, marker);
        }

        marker.setZIndexOffset(2000);

        // Auto-open popup if selected vehicle (skip in replay mode to keep video view clear)
        if (isSelected && !isReplayMode) {
          setTimeout(() => {
            if (!marker.isPopupOpen()) {
              marker.openPopup();
            }
          }, 50);
        }
      });
    }, [vehicles, selectedVehicle, onSelectVehicle, isTransitMode, isReplayMode, transitDetails]);

    // 8. Historic Route Trail
    useEffect(() => {
      if (!mapInstanceRef.current) return;
      const map = mapInstanceRef.current;

      if (trailPolylineRef.current) {
        map.removeLayer(trailPolylineRef.current);
        trailPolylineRef.current = null;
      }

      // EXCESS: Hyphen blue lines behind vehicle commented out as requested:
      /*
      if (showTrail && trailPoints.length > 1) {
        const polyline = L.polyline(trailPoints, {
          color: '#0284c7',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 6',
        }).addTo(map);

        trailPolylineRef.current = polyline;
      }
      */
    }, [showTrail, trailPoints]);

    // 8.5. 2-Layer Transit Corridor Architecture:
    // Layer 1 (Bottom): Static Authorized Planned Corridor (A -> B -> C) with corridor boundary buffer
    // Layer 2 (Top): Actual GPS Traveled Trail advancing in real-time above the planned line
    // Layer 3 (Alert): Red highlighted off-corridor segment if vehicle deviates
    useEffect(() => {
      if (!mapInstanceRef.current) return;
      const map = mapInstanceRef.current;

      const clearAllTransitLayers = () => {
        if (transitBufferLayerRef.current) {
          map.removeLayer(transitBufferLayerRef.current);
          transitBufferLayerRef.current = null;
        }
        if (transitPlannedRouteLayerRef.current) {
          map.removeLayer(transitPlannedRouteLayerRef.current);
          transitPlannedRouteLayerRef.current = null;
        }
        if (transitTraveledLayerRef.current) {
          map.removeLayer(transitTraveledLayerRef.current);
          transitTraveledLayerRef.current = null;
        }
        if (transitDeviatedLayerRef.current) {
          map.removeLayer(transitDeviatedLayerRef.current);
          transitDeviatedLayerRef.current = null;
        }
        if (transitMarkersGroupRef.current) {
          transitMarkersGroupRef.current.clearLayers();
        }
        lastFittedTransitVehicleRef.current = null;
      };

      if (!transitDetails || (!transitDetails.planned_route?.length && !transitDetails.route_coordinates?.length)) {
        clearAllTransitLayers();
        return;
      }

      const plannedCoords = transitDetails.planned_route?.length
        ? transitDetails.planned_route
        : transitDetails.route_coordinates;
      const traveledCoords = transitDetails.traveled_route || [];
      const deviatedCoords = transitDetails.deviated_route || [];
      const isDeviated = Boolean(transitDetails.is_deviated);

      const isSameVehicle = lastFittedTransitVehicleRef.current === transitDetails.vehicle_reg_no;

      // If already initialized for this vehicle, smoothly update real-time traveled & deviation layers without moving the map camera
      if (isSameVehicle && transitPlannedRouteLayerRef.current) {
        if (transitTraveledLayerRef.current && traveledCoords.length > 0) {
          transitTraveledLayerRef.current.setLatLngs(traveledCoords);
        }
        if (transitDeviatedLayerRef.current) {
          if (isDeviated && deviatedCoords.length > 0) {
            transitDeviatedLayerRef.current.setLatLngs(deviatedCoords);
          } else {
            transitDeviatedLayerRef.current.setLatLngs([]);
          }
        }
        return;
      }

      // Initial route setup for a newly opened vehicle:
      clearAllTransitLayers();

      if (!transitMarkersGroupRef.current || !map.hasLayer(transitMarkersGroupRef.current)) {
        transitMarkersGroupRef.current = L.layerGroup().addTo(map);
      }

      // 1. Base Layer 1: Semi-transparent Safety Corridor Buffer (18px width)
      const bufferLine = L.polyline(plannedCoords, {
        color: '#3b82f6',
        weight: 18,
        opacity: 0.12,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      transitBufferLayerRef.current = bufferLine;

      // 2. Base Layer 2: Static Planned Highway Corridor A -> B -> C (Dashed Slate-Blue Line)
      const plannedLine = L.polyline(plannedCoords, {
        color: '#475569',
        weight: 5.5,
        opacity: 0.7,
        dashArray: '8, 6',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      transitPlannedRouteLayerRef.current = plannedLine;

      // 3. Top Layer: Real-Time Actual Traveled Path (Solid Vibrant Emerald Green directly on top of planned route)
      const traveledLine = L.polyline(traveledCoords, {
        color: '#16a34a',
        weight: 5.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      transitTraveledLayerRef.current = traveledLine;

      // 4. Alert Layer: Deviated off-corridor path in Red if vehicle goes outside the authorized corridor
      const deviatedLine = L.polyline(isDeviated && deviatedCoords.length > 0 ? deviatedCoords : [], {
        color: '#dc2626',
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      transitDeviatedLayerRef.current = deviatedLine;

      // Point A: Starting point / Mining Lease (Blue circle badge with "A")
      const iconA = L.divIcon({
        className: 'transit-marker-a',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: #2563eb; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">A</div>
            <div style="background: rgba(15,23,42,0.88); color: #fff; font-size: 9.5px; font-weight: 700; padding: 1px 5px; border-radius: 4px; margin-top: 2px; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">${transitDetails.pointA.name}</div>
          </div>
        `,
        iconSize: [60, 42],
        iconAnchor: [30, 12],
      });
      const markerA = L.marker(transitDetails.pointA.coords, { icon: iconA });
      markerA.bindPopup(`
        <div style="padding: 8px 10px; font-size: 12px; font-family: sans-serif;">
          <div style="color: #2563eb; font-weight: bold; font-size: 11px;">POINT A (STARTING POINT)</div>
          <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${transitDetails.pointA.name}</div>
          <div style="color: #64748b; font-size: 11px;">${transitDetails.pointA.subtext || 'Lessee / Dealer Mine'}</div>
        </div>
      `);
      transitMarkersGroupRef.current.addLayer(markerA);

      // Point B: Weighbridge (Green circle badge with "B")
      const iconB = L.divIcon({
        className: 'transit-marker-b',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="width: 26px; height: 26px; border-radius: 50%; background: #16a34a; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">B</div>
            <div style="background: rgba(15,23,42,0.88); color: #fff; font-size: 9.5px; font-weight: 700; padding: 1px 5px; border-radius: 4px; margin-top: 2px; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">Weighbridge</div>
          </div>
        `,
        iconSize: [60, 42],
        iconAnchor: [30, 13],
      });
      const markerB = L.marker(transitDetails.pointB.coords, { icon: iconB });
      markerB.bindPopup(`
        <div style="padding: 8px 10px; font-size: 12px; font-family: sans-serif;">
          <div style="color: #16a34a; font-weight: bold; font-size: 11px;">POINT B (WEIGHBRIDGE)</div>
          <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${transitDetails.pointB.name}</div>
          <div style="color: #64748b; font-size: 11px;">Code: ${transitDetails.weighbridge_code} • Verified Gross Weight</div>
        </div>
      `);
      transitMarkersGroupRef.current.addLayer(markerB);

      // Point C: Consignee (Red circle badge with "C")
      const iconC = L.divIcon({
        className: 'transit-marker-c',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="width: 26px; height: 26px; border-radius: 50%; background: #dc2626; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">C</div>
            <div style="background: rgba(15,23,42,0.88); color: #fff; font-size: 9.5px; font-weight: 700; padding: 1px 5px; border-radius: 4px; margin-top: 2px; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">${transitDetails.pointC.name}</div>
          </div>
        `,
        iconSize: [60, 42],
        iconAnchor: [30, 13],
      });
      const markerC = L.marker(transitDetails.pointC.coords, { icon: iconC });
      markerC.bindPopup(`
        <div style="padding: 8px 10px; font-size: 12px; font-family: sans-serif;">
          <div style="color: #dc2626; font-weight: bold; font-size: 11px;">POINT C (CONSIGNEE)</div>
          <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${transitDetails.pointC.name}</div>
          <div style="color: #64748b; font-size: 11px;">${transitDetails.pointC.subtext || 'Destination Consignee'}</div>
        </div>
      `);
      transitMarkersGroupRef.current.addLayer(markerC);

      // Fit map bounds to show full planned corridor A -> B -> C strictly ONCE on initial load
      map.fitBounds(plannedLine.getBounds(), { padding: [55, 55], maxZoom: 14 });
      lastFittedTransitVehicleRef.current = transitDetails.vehicle_reg_no;
    }, [transitDetails]);

    // 8.6. Vehicle Replay Full Route, Dynamic Traveled Layer & Start / End Markers
    useEffect(() => {
      if (!mapInstanceRef.current) return;
      const map = mapInstanceRef.current;

      if (replayRouteLayerRef.current) {
        map.removeLayer(replayRouteLayerRef.current);
        replayRouteLayerRef.current = null;
      }
      if (replayTraveledLayerRef.current) {
        map.removeLayer(replayTraveledLayerRef.current);
        replayTraveledLayerRef.current = null;
      }

      if (!replayMarkersGroupRef.current || !map.hasLayer(replayMarkersGroupRef.current)) {
        replayMarkersGroupRef.current = L.layerGroup().addTo(map);
      } else {
        replayMarkersGroupRef.current.clearLayers();
      }

      if (isReplayMode && replayRoutePoints && replayRoutePoints.length > 1) {
        // Base route path (planned highway corridor ahead in light gray/slate)
        const routeLine = L.polyline(replayRoutePoints, {
          color: '#94a3b8',
          weight: 4.5,
          opacity: 0.65,
          lineJoin: 'round',
        }).addTo(map);

        replayRouteLayerRef.current = routeLine;

        // Vivid traveled route progress path (dynamically extends as vehicle plays)
        const traveledLine = L.polyline([], {
          color: '#0891b2',
          weight: 5.5,
          opacity: 0.95,
          lineJoin: 'round',
        }).addTo(map);

        replayTraveledLayerRef.current = traveledLine;

        const startPt = replayRoutePoints[0];
        const endPt = replayRoutePoints[replayRoutePoints.length - 1];

        // Start Marker (Point A)
        const iconStart = L.divIcon({
          className: 'replay-start-marker',
          html: `
            <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
              <div style="width: 26px; height: 26px; border-radius: 50%; background: #16a34a; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">A</div>
              <div style="background: rgba(15,23,42,0.85); color: #fff; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; margin-top: 2px; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">Start</div>
            </div>
          `,
          iconSize: [50, 42],
          iconAnchor: [25, 13],
        });
        const markerStart = L.marker(startPt, { icon: iconStart });
        markerStart.bindPopup(`
          <div style="padding: 6px 8px; font-size: 12px; font-family: sans-serif;">
            <strong style="color: #16a34a;">START (Point A)</strong>
            <div>Lat: ${startPt[0].toFixed(5)}, Lng: ${startPt[1].toFixed(5)}</div>
          </div>
        `);
        replayMarkersGroupRef.current.addLayer(markerStart);

        // End Marker (Point B)
        const iconEnd = L.divIcon({
          className: 'replay-end-marker',
          html: `
            <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
              <div style="width: 26px; height: 26px; border-radius: 50%; background: #dc2626; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">B</div>
              <div style="background: rgba(15,23,42,0.85); color: #fff; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; margin-top: 2px; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">End</div>
            </div>
          `,
          iconSize: [50, 42],
          iconAnchor: [25, 13],
        });
        const markerEnd = L.marker(endPt, { icon: iconEnd });
        markerEnd.bindPopup(`
          <div style="padding: 6px 8px; font-size: 12px; font-family: sans-serif;">
            <strong style="color: #dc2626;">DESTINATION (Point B)</strong>
            <div>Lat: ${endPt[0].toFixed(5)}, Lng: ${endPt[1].toFixed(5)}</div>
          </div>
        `);
        replayMarkersGroupRef.current.addLayer(markerEnd);

        // Fit map bounds to show full route from Start to End
        map.fitBounds(routeLine.getBounds(), { padding: [55, 55], maxZoom: 15 });
      }
    }, [isReplayMode, replayRoutePoints]);

    // 8.7. Update Traveled Path & Vehicle Truck Marker on Route during Replay Video Playback
    useEffect(() => {
      if (!mapInstanceRef.current) return;
      const map = mapInstanceRef.current;

      if (!isReplayMode) {
        if (replayVehicleMarkerRef.current) {
          map.removeLayer(replayVehicleMarkerRef.current);
          replayVehicleMarkerRef.current = null;
        }
        return;
      }

      // Update traveled polyline progress
      if (replayTraveledLayerRef.current && replayTraveledPoints) {
        replayTraveledLayerRef.current.setLatLngs(replayTraveledPoints);
      }

      // Position replay truck marker at the current playback position
      let currentCoords: [number, number] | null = null;
      if (replayTraveledPoints && replayTraveledPoints.length > 0) {
        currentCoords = replayTraveledPoints[replayTraveledPoints.length - 1];
      } else if (replayRoutePoints && replayRoutePoints.length > 0) {
        currentCoords = replayRoutePoints[0];
      } else if (selectedVehicle) {
        currentCoords = [selectedVehicle.last_latitude, selectedVehicle.last_longitude];
      }

      if (!currentCoords) return;

      // Determine vehicle rotation angle along the road corridor
      let heading = selectedVehicle?.last_heading || 0;
      if (replayTraveledPoints && replayTraveledPoints.length >= 2) {
        const prevPt = replayTraveledPoints[replayTraveledPoints.length - 2];
        const dLat = currentCoords[0] - prevPt[0];
        const dLng = currentCoords[1] - prevPt[1];
        if (Math.abs(dLat) > 0.000001 || Math.abs(dLng) > 0.000001) {
          const rad = Math.atan2(dLng, dLat);
          heading = (rad * 180) / Math.PI;
          if (heading < 0) heading += 360;
        }
      }

      const currentSpeed = selectedVehicle?.last_speed ?? 40;

      const iconHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; user-select: none;">
          <div style="font-weight: 800; font-size: 11px; text-align: center; color: #000000; margin-bottom: 2px; text-shadow: 0 1px 2px #fff, 0 -1px 2px #fff, 1px 0 2px #fff, -1px 0 2px #fff; line-height: 1; white-space: nowrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${Math.round(currentSpeed)} km/h
          </div>
          <div style="transform: rotate(${heading}deg); transform-origin: center center; width: 18px; height: 36px; display: flex; align-items: center; justify-content: center;">
            <!-- Authentic Truck Structure (Cab + Coupling Neck + Cargo/Trailer Bed) -->
            <div style="width: 14px; height: 35px; display: flex; flex-direction: column; align-items: center; position: relative;">
              <!-- Front Cab with side mirrors and black windshield stripe -->
              <div style="width: 14px; height: 10px; background: #dc2626; border: 1px solid #991b1b; border-radius: 3px 3px 1px 1px; box-shadow: 0 1px 3px rgba(0,0,0,0.35); position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; z-index: 2;">
                <!-- Black curved windshield bar -->
                <div style="width: 10px; height: 3px; background: #000000; border-radius: 1px; margin-top: 1.5px;"></div>
                <!-- Side mirrors -->
                <div style="position: absolute; top: 1px; left: -2px; width: 2px; height: 3px; background: #991b1b; border-radius: 1px 0 0 1px;"></div>
                <div style="position: absolute; top: 1px; right: -2px; width: 2px; height: 3px; background: #991b1b; border-radius: 0 1px 1px 0;"></div>
              </div>
              <!-- Coupling Neck Gap -->
              <div style="width: 6px; height: 2px; background: #7f1d1d; margin: 0 auto; z-index: 1;"></div>
              <!-- Rear Cargo / Trailer Bed -->
              <div style="width: 14px; height: 22px; background: #dc2626; border: 1px solid #991b1b; border-radius: 1px 1px 2px 2px; box-shadow: 0 2px 5px rgba(0,0,0,0.35); position: relative; overflow: hidden; z-index: 2;">
                <!-- Subtle inner cargo bed ridge line -->
                <div style="width: 10px; height: 1px; background: #b91c1c; margin: 3px auto 0 auto;"></div>
                <!-- Rear Bumper / Tail Lights -->
                <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: #7f1d1d; border-top: 1px solid #991b1b;"></div>
              </div>
            </div>
          </div>
        </div>
      `;

      const replayTruckIcon = L.divIcon({
        className: 'prod-vehicle-marker replay-marker',
        html: iconHtml,
        iconSize: [44, 54],
        iconAnchor: [22, 35],
      });

      if (!replayVehicleMarkerRef.current) {
        replayVehicleMarkerRef.current = L.marker(currentCoords, {
          icon: replayTruckIcon,
          zIndexOffset: 10000,
        }).addTo(map);
      } else {
        if (!map.hasLayer(replayVehicleMarkerRef.current)) {
          replayVehicleMarkerRef.current.addTo(map);
        }
        replayVehicleMarkerRef.current.setLatLng(currentCoords);
        replayVehicleMarkerRef.current.setIcon(replayTruckIcon);
        replayVehicleMarkerRef.current.setZIndexOffset(10000);
      }
    }, [isReplayMode, replayTraveledPoints, replayRoutePoints, selectedVehicle]);

    // 8.8. Camera Follow Vehicle (smooth real-time tracking for live vehicle and replay mode)
    useEffect(() => {
      if (!followVehicleCamera || !mapInstanceRef.current) return;
      if (isReplayMode && replayTraveledPoints && replayTraveledPoints.length > 0) {
        const lastPt = replayTraveledPoints[replayTraveledPoints.length - 1];
        mapInstanceRef.current.panTo(lastPt, { animate: true, duration: 0.25 });
      } else if (!isReplayMode && selectedVehicle && selectedVehicle.last_latitude && selectedVehicle.last_longitude) {
        mapInstanceRef.current.panTo([selectedVehicle.last_latitude, selectedVehicle.last_longitude], { animate: true, duration: 0.5 });
      }
    }, [followVehicleCamera, isReplayMode, replayTraveledPoints, selectedVehicle]);

    // 9. Center on Selected Vehicle (ONLY when user selects a different vehicle, keeping map static while the vehicle moves)
    useEffect(() => {
      if (!selectedVehicle) {
        prevSelectedRegNoRef.current = null;
        return;
      }
      if (!mapInstanceRef.current) return;

      // Only flyTo/center when a DIFFERENT vehicle is selected, keeping the map static as live coordinates update
      if (prevSelectedRegNoRef.current !== selectedVehicle.reg_no) {
        prevSelectedRegNoRef.current = selectedVehicle.reg_no;
        const currentZoom = mapInstanceRef.current.getZoom();
        const targetZoom = Math.max(currentZoom, 14);
        mapInstanceRef.current.flyTo(
          [selectedVehicle.last_latitude, selectedVehicle.last_longitude],
          targetZoom,
          { animate: true, duration: 0.8 }
        );
      }
    }, [selectedVehicle]);

    // EXCESS: Place search handlers - Commented out for production (uncomment to restore):
    /*
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
    */

    return (
      <div className="relative w-full h-full min-h-[500px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-inner">
        {/* EXCESS: Embedded search & Rajasthan reset button - Commented out to match production (uncomment to restore):
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
              </div>
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
        */}

        {/* EXCESS: Geocoding Loading Indicator Pill - Commented out to match production (uncomment to restore):
        {geocoding && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[900] flex items-center gap-2 bg-slate-900/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-2xl text-xs font-mono border border-slate-700 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>ArcGIS Reverse Geocoding Point...</span>
          </div>
        )}
        */}

        {/* Main Leaflet Map Container */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Production-matching attribution footer bar */}
        <div className="absolute bottom-0 left-0 right-0 z-[800] pointer-events-none flex items-center justify-between px-3 py-1 bg-white/90 backdrop-blur-xs text-[11px] text-slate-700 font-sans border-t border-slate-200/70">
          <div className="font-normal">Esri | TomTom | Garmin | METI/NASA | USGS</div>
          <div className="font-normal">Powered by Esri</div>
        </div>
      </div>
    );
  }
);

RajdharaaMap.displayName = 'RajdharaaMap';
