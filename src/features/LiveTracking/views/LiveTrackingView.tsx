import React, { useEffect, useState, useMemo, useRef } from 'react';
import type {
  CheckpostFeature,
  FleetStats,
  GeofenceZone,
  GISLayerConfig,
  Vehicle,
} from '@/shared/types/vts.types';
import { vtsApi } from '@/shared/services/vtsApi';
import { useVtsWebSocket } from '@/shared/hooks/useVtsWebSocket';
import { RajdharaaMap, type RajdharaaMapHandle } from '@/shared/components/RajdharaaMap';
import {
  gisGeocodeService,
  type GeocodeSearchResult,
} from '@/shared/services/gisGeocodeService';
import { FleetMetricsBar } from '../components/FleetMetricsBar';
import { VehicleListSidebar } from '../components/VehicleListSidebar';
import { VehicleTelemetryDrawer } from '../components/VehicleTelemetryDrawer';
import {
  Layers,
  ShieldCheck,
  MapPin,
  Map as MapIcon,
  Type,
  Search,
  Compass,
  X,
  Loader2,
} from 'lucide-react';

export const LiveTrackingView: React.FC = () => {
  const mapRef = useRef<RajdharaaMapHandle | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [geofences, setGeofences] = useState<GeofenceZone[]>([]);
  const [checkposts, setCheckposts] = useState<CheckpostFeature[]>([]);
  const [gisLayers, setGisLayers] = useState<GISLayerConfig[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string>('rajdharaa-satellite-hybrid');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [stats, setStats] = useState<FleetStats>({
    total_vehicles: 6,
    moving: 4,
    idle: 1,
    stopped: 1,
    emergency_sos: 0,
    active_e_ravanna: 4,
    total_alerts_24h: 1,
    total_tonnage_today: 117.8,
  });

  const [showGeofences, setShowGeofences] = useState(true);
  const [showCheckposts, setShowCheckposts] = useState(true);
  const [showDistricts, setShowDistricts] = useState(true);
  const [showDivisionLabels, setShowDivisionLabels] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeSearchResult[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searching, setSearching] = useState(false);

  const { isConnected: wsConnected, liveVehicles, flashAlert } = useVtsWebSocket();

  // Load initial data
  useEffect(() => {
    async function loadData() {
      const [vList, gfList, meta, statData] = await Promise.all([
        vtsApi.getVehicles(),
        vtsApi.getGeofences(),
        vtsApi.getGISMetadata(),
        vtsApi.getFleetStats(),
      ]);

      setVehicles(vList);
      setGeofences(gfList);
      setGisLayers(meta.layers);
      setCheckposts(meta.checkposts);
      setStats(statData);
    }
    loadData();
  }, []);

  // Merge live WebSocket updates into vehicles list
  const mergedVehicles = useMemo(() => {
    if (liveVehicles.size === 0) return vehicles;

    return vehicles.map((v) => {
      const live = liveVehicles.get(v.reg_no);
      if (!live) return v;

      return {
        ...v,
        last_latitude: live.latitude,
        last_longitude: live.longitude,
        last_speed: live.speed,
        last_heading: live.heading,
        last_altitude: live.altitude,
        last_satellites: live.satellites,
        last_ignition: live.ignition,
        last_emergency: live.emergency_sos,
        last_internal_batt: live.internal_batt,
        status: live.status,
        active_geofence: live.active_geofence || v.active_geofence,
        last_updated: live.timestamp,
      };
    });
  }, [vehicles, liveVehicles]);

  // Keep selected vehicle fresh with live telemetry
  useEffect(() => {
    if (selectedVehicle) {
      const updated = mergedVehicles.find((v) => v.reg_no === selectedVehicle.reg_no);
      if (updated) {
        setSelectedVehicle(updated);
      }
    }
  }, [mergedVehicles, selectedVehicle]);

  // Compute live fleet stats
  const liveStats = useMemo(() => {
    let moving = 0;
    let idle = 0;
    let stopped = 0;
    let sos = 0;

    mergedVehicles.forEach((v) => {
      if (v.status === 'SOS' || v.last_emergency) sos++;
      else if (v.status === 'MOVING') moving++;
      else if (v.status === 'IDLE') idle++;
      else stopped++;
    });

    return {
      ...stats,
      total_vehicles: mergedVehicles.length,
      moving,
      idle,
      stopped,
      emergency_sos: sos,
    };
  }, [mergedVehicles, stats]);

  const handleTriggerEvent = async (regNo: string, eventType: string) => {
    await vtsApi.triggerSimulatorEvent(regNo, eventType);
  };

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
    if (mapRef.current) {
      mapRef.current.flyToLocation(res.latitude, res.longitude, 12, res);
    }
    setShowSearchDropdown(false);
    setSearchQuery(res.name);
  };

  const handleResetRajasthan = () => {
    if (mapRef.current) {
      mapRef.current.resetRajasthanView();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] p-4 space-y-3">
      {/* Top Fleet Metrics Bar */}
      <FleetMetricsBar stats={liveStats} wsConnected={wsConnected} />

      {/* Main Map & Fleet Area */}
      <div className="flex-1 flex gap-4 min-h-0 relative">
        {/* Left Sidebar: Vehicle List */}
        <div className="w-80 lg:w-96 flex-shrink-0 h-full">
          <VehicleListSidebar
            vehicles={mergedVehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={(v) => setSelectedVehicle(v)}
          />
        </div>

        {/* Center/Right: Rajdharaa GIS Map View */}
        <div className="flex-1 relative h-full rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          {/* Unified Non-Overlapping Header Toolbar */}
          <div className="absolute top-3 left-3 right-3 z-[900] flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
            {/* Left Controls: Base Layer & Overlays */}
            <div className="flex flex-wrap items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-md text-slate-800 pointer-events-auto">
              {/* Layer Selector */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <select
                  value={activeLayerId}
                  onChange={(e) => setActiveLayerId(e.target.value)}
                  className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
                >
                  {gisLayers.map((layer) => (
                    <option key={layer.id} value={layer.id} className="bg-white text-slate-900">
                      {layer.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Districts Boundaries Toggle */}
              <button
                onClick={() => setShowDistricts(!showDistricts)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  showDistricts
                    ? 'bg-sky-50 text-sky-800 border border-sky-300 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5 text-sky-600" />
                Districts (33)
              </button>

              {/* Division Labels Toggle */}
              <button
                onClick={() => setShowDivisionLabels(!showDivisionLabels)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  showDivisionLabels
                    ? 'bg-purple-50 text-purple-800 border border-purple-300 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <Type className="w-3.5 h-3.5 text-purple-600" />
                Labels
              </button>

              {/* Geofences Toggle */}
              <button
                onClick={() => setShowGeofences(!showGeofences)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  showGeofences
                    ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                Mining Leases
              </button>

              {/* Checkposts Toggle */}
              <button
                onClick={() => setShowCheckposts(!showCheckposts)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  showCheckposts
                    ? 'bg-cyan-50 text-cyan-800 border border-cyan-300 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
                DMG Checkposts
              </button>
            </div>

            {/* Right Controls: Place Search & Reset Rajasthan View */}
            <div className="flex items-center gap-2 pointer-events-auto flex-shrink-0">
              {/* Find Place in Rajasthan */}
              <div className="relative w-56 sm:w-64">
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

                {/* Search Results Dropdown */}
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

              {/* Reset to Rajasthan State Button */}
              <button
                onClick={handleResetRajasthan}
                title="Fit Rajasthan State View"
                className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-md hover:bg-white text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 shadow-md transition-all hover:scale-105"
              >
                <Compass className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Rajasthan</span>
              </button>
            </div>
          </div>

          {/* Flash Alert Banner if emergency SOS triggered */}
          {flashAlert && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] bg-rose-600/95 text-white px-4 py-2.5 rounded-xl border border-rose-400 shadow-2xl flex items-center gap-3 animate-bounce">
              <span className="w-3 h-3 rounded-full bg-white animate-ping"></span>
              <span className="font-bold text-xs uppercase tracking-wide">
                EMERGENCY ALERT: {flashAlert.reg_no} - {flashAlert.message}
              </span>
            </div>
          )}

          {/* Leaflet Map with Rajdharaa GIS Layers */}
          <RajdharaaMap
            ref={mapRef}
            vehicles={mergedVehicles}
            geofences={geofences}
            checkposts={checkposts}
            gisLayers={gisLayers}
            activeLayerId={activeLayerId}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={(v) => setSelectedVehicle(v)}
            showGeofences={showGeofences}
            showCheckposts={showCheckposts}
            showDistricts={showDistricts}
            showDivisionLabels={showDivisionLabels}
            hideEmbeddedSearch={true}
          />

          {/* Right Floating Telemetry Drawer */}
          <VehicleTelemetryDrawer
            vehicle={selectedVehicle}
            onClose={() => setSelectedVehicle(null)}
            onTriggerEvent={handleTriggerEvent}
          />
        </div>
      </div>
    </div>
  );
};

export default LiveTrackingView;
