import React, { useEffect, useState, useMemo } from 'react';
import type {
  CheckpostFeature,
  FleetStats,
  GeofenceZone,
  GISLayerConfig,
  Vehicle,
} from '@/shared/types/vts.types';
import { vtsApi } from '@/shared/services/vtsApi';
import { useVtsWebSocket } from '@/shared/hooks/useVtsWebSocket';
import { RajdharaaMap } from '@/shared/components/RajdharaaMap';
import { FleetMetricsBar } from '../components/FleetMetricsBar';
import { VehicleListSidebar } from '../components/VehicleListSidebar';
import { VehicleTelemetryDrawer } from '../components/VehicleTelemetryDrawer';
import { Layers, ShieldCheck, MapPin, Radio } from 'lucide-react';

export const LiveTrackingView: React.FC = () => {
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
  }, [mergedVehicles]);

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
        <div className="flex-1 relative h-full rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
          {/* Map Layer & Overlays Floating Bar */}
          <div className="absolute top-4 left-4 z-[900] flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-700/80 shadow-xl">
            {/* Layer Selector */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <select
                value={activeLayerId}
                onChange={(e) => setActiveLayerId(e.target.value)}
                className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                {gisLayers.map((layer) => (
                  <option key={layer.id} value={layer.id} className="bg-slate-900 text-white">
                    {layer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Geofences Toggle */}
            <button
              onClick={() => setShowGeofences(!showGeofences)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                showGeofences
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              Mining Leases
            </button>

            {/* Checkposts Toggle */}
            <button
              onClick={() => setShowCheckposts(!showCheckposts)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                showCheckposts
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              DMG Checkposts
            </button>

            {/* Live GPS Telemetry Status */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-400">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>AIS-140 Pings/2.5s</span>
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
            vehicles={mergedVehicles}
            geofences={geofences}
            checkposts={checkposts}
            gisLayers={gisLayers}
            activeLayerId={activeLayerId}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={(v) => setSelectedVehicle(v)}
            showGeofences={showGeofences}
            showCheckposts={showCheckposts}
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
