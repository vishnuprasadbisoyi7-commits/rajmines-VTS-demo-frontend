import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import type {
  CheckpostFeature,
  GeofenceZone,
  GISLayerConfig,
  Vehicle,
} from '@/shared/types/vts.types';
import { vtsApi } from '@/shared/services/vtsApi';
import { useVtsWebSocket } from '@/shared/hooks/useVtsWebSocket';
import { RajdharaaMap, type RajdharaaMapHandle } from '@/shared/components/RajdharaaMap';
import { VehicleTelemetryDrawer } from '../components/VehicleTelemetryDrawer';
import {
  Search,
  FileText,
  ChevronDown,
  Truck,
  Battery,
  Zap,
  Key,
} from 'lucide-react';

export const LiveTrackingView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const mapRef = useRef<RajdharaaMapHandle | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [geofences, setGeofences] = useState<GeofenceZone[]>([]);
  const [checkposts, setCheckposts] = useState<CheckpostFeature[]>([]);
  const [gisLayers, setGisLayers] = useState<GISLayerConfig[]>([]);
  const [activeLayerId] = useState<string>('osm-standard');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showTelemetryDrawer, setShowTelemetryDrawer] = useState<boolean>(false);

  // Controls & Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('MOVING'); // Defaults to MOVING like screenshot
  const [showOnlyActiveERawanna, setShowOnlyActiveERawanna] = useState<boolean>(false);

  // Map Feature Toggles
  const [showGeofences] = useState(true);
  const [showCheckposts] = useState(true);
  const [showDistricts] = useState(true);
  const [showDivisionLabels] = useState(true);

  const { liveVehicles } = useVtsWebSocket();

  // Load initial data
  useEffect(() => {
    async function loadData() {
      const [vList, gfList, meta] = await Promise.all([
        vtsApi.getVehicles(),
        vtsApi.getGeofences(),
        vtsApi.getGISMetadata(),
      ]);

      setVehicles(vList);
      setGeofences(gfList);
      setGisLayers(meta.layers);
      setCheckposts(meta.checkposts);

      // Check if vehicle specified in URL query
      const targetRegNo = searchParams.get('vehicle');
      if (targetRegNo) {
        const found = vList.find((v) => v.reg_no === targetRegNo);
        if (found) {
          setSelectedVehicle(found);
          setStatusFilter('ALL');
        }
      }
    }
    loadData();
  }, [searchParams]);

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
        last_updated: live.timestamp || v.last_updated,
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

  // Filtered vehicles for sidebar card list
  const filteredVehicles = useMemo(() => {
    return mergedVehicles.filter((v) => {
      const matchesSearch =
        !searchTerm.trim() ||
        v.reg_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.imei.includes(searchTerm);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'SOS' && (v.status === 'SOS' || v.last_emergency)) ||
        v.status === statusFilter;

      const matchesERawanna =
        !showOnlyActiveERawanna ||
        (Boolean(v.active_e_ravanna) && v.active_e_ravanna !== 'N/A');

      return matchesSearch && matchesStatus && matchesERawanna;
    });
  }, [mergedVehicles, searchTerm, statusFilter, showOnlyActiveERawanna]);

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    if (mapRef.current) {
      mapRef.current.flyToLocation(
        vehicle.last_latitude,
        vehicle.last_longitude,
        14,
        {
          name: vehicle.reg_no,
          district: vehicle.active_geofence || 'Mining Zone',
          type: `${vehicle.status} (${vehicle.last_speed.toFixed(1)} km/h)`,
        }
      );
    }
  };

  return (
    <div className="bg-white dark:bg-[#0a192f] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden flex flex-col h-[calc(100vh-6.5rem)]">
      {/* Top Filter Bar */}
      <div className="p-3.5 md:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0a192f]">
        {/* Left Search Input */}
        <div className="relative flex-1 max-w-lg min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Vehicle No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-xl pl-9 pr-3.5 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-cyan-600 transition shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Right Controls: Active e-Rawanna, Status Dropdown, GIS Layer Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Show Active e-Rawanna Button */}
          <button
            onClick={() => setShowOnlyActiveERawanna((prev) => !prev)}
            className={`flex items-center gap-2 px-3.5 py-2 border text-xs font-medium rounded-xl transition shadow-2xs cursor-pointer ${
              showOnlyActiveERawanna
                ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-300 font-semibold'
                : 'bg-white dark:bg-[#0c1e38] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>Show Active e-Rawanna</span>
          </button>

          {/* Status Dropdown Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl pl-3.5 pr-8 py-2 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-cyan-600 transition shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="MOVING">Moving</option>
              <option value="IDLE">Idle</option>
              <option value="STOPPED">Stopped</option>
              <option value="SOS">SOS / Emergency</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Map Layer Switcher & Overlays Dropdown - Commented out for now */}
          {/*
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 border text-xs font-medium rounded-xl transition shadow-2xs cursor-pointer ${
                showLayerMenu
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white dark:bg-[#0c1e38] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title="Change Map Layers & Overlays"
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Layers</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 p-3 text-xs space-y-3">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Base Map Style
                  </div>
                  <div className="space-y-1">
                    {gisLayers.map((layer) => (
                      <button
                        key={layer.id}
                        onClick={() => {
                          setActiveLayerId(layer.id);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                          activeLayerId === layer.id
                            ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-300 font-semibold border border-cyan-200 dark:border-cyan-800'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span>{layer.name}</span>
                        {activeLayerId === layer.id && (
                          <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-700 pt-2 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    GIS Overlays
                  </div>

                  <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      Mining Leases
                    </span>
                    <input
                      type="checkbox"
                      checked={showGeofences}
                      onChange={(e) => setShowGeofences(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-0"
                    />
                  </label>

                  <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-50 cursor-pointer">
                    <span className="flex items-center gap-2 text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      Weighbridges / Checkposts
                    </span>
                    <input
                      type="checkbox"
                      checked={showCheckposts}
                      onChange={(e) => setShowCheckposts(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-0"
                    />
                  </label>

                  <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-50 cursor-pointer">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Compass className="w-3.5 h-3.5 text-blue-600" />
                      District Boundaries
                    </span>
                    <input
                      type="checkbox"
                      checked={showDistricts}
                      onChange={(e) => setShowDistricts(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-0"
                    />
                  </label>

                  <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-50 cursor-pointer">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Compass className="w-3.5 h-3.5 text-amber-600" />
                      Division Labels
                    </span>
                    <input
                      type="checkbox"
                      checked={showDivisionLabels}
                      onChange={(e) => setShowDivisionLabels(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-0"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
          */}
        </div>
      </div>

      {/* Main Map & Sidebar Content Split */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* Left: Scrollable Vehicle Cards List */}
        <div className="w-full md:w-[380px] lg:w-[400px] flex-shrink-0 flex flex-col gap-2.5 overflow-y-auto pr-1">
          {filteredVehicles.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-slate-200">
              No vehicles match current filter.
            </div>
          ) : (
            filteredVehicles.map((vehicle) => {
              const isSelected = selectedVehicle?.reg_no === vehicle.reg_no;
              const isMoving = vehicle.status === 'MOVING';

              return (
                <div
                  key={vehicle.reg_no}
                  onClick={() => handleSelectVehicle(vehicle)}
                  className={`bg-white dark:bg-[#0c1e38] rounded-xl p-4 border transition shadow-2xs hover:shadow-xs cursor-pointer ${
                    isSelected
                      ? 'border-cyan-600 ring-2 ring-cyan-500/20 bg-cyan-50/20 dark:bg-cyan-950/30'
                      : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Card Top Row: Truck Icon + Reg No + Status Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <Truck className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {vehicle.reg_no}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                        isMoving
                          ? 'bg-[#dcfce7] dark:bg-emerald-950/60 text-[#16a34a] dark:text-emerald-300'
                          : vehicle.status === 'IDLE'
                          ? 'bg-[#fef3c7] dark:bg-amber-950/60 text-[#b45309] dark:text-amber-300'
                          : vehicle.status === 'SOS'
                          ? 'bg-[#fee2e2] dark:bg-rose-950/60 text-[#dc2626] dark:text-rose-300'
                          : 'bg-[#f1f5f9] dark:bg-slate-800 text-[#64748b] dark:text-slate-400'
                      }`}
                    >
                      {vehicle.status}
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-xs text-slate-600 dark:text-slate-300 mb-3.5">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Speed</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {vehicle.last_speed.toFixed(1)} km/h
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Last Update</span>
                      <span className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                        {vehicle.last_updated || 'Just now'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Vendor & Manufacturer</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {vehicle.vendor || 'BULL'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[11px]">e-Rawanna Number</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {vehicle.active_e_ravanna || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Chips: Blue Voltage, Purple Batt, Green Ignition */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold">
                    {/* Blue Input Voltage Chip */}
                    <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#eff6ff] dark:bg-blue-950/60 text-[#2563eb] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                      <Battery className="w-3 h-3" />
                      <span>{vehicle.input_voltage ? `${vehicle.input_voltage}V` : '27V'}</span>
                    </div>

                    {/* Purple Internal Battery Chip */}
                    <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#faf5ff] dark:bg-purple-950/60 text-[#9333ea] dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
                      <Zap className="w-3 h-3" />
                      <span>{vehicle.last_internal_batt ? `${vehicle.last_internal_batt}V` : '4V'}</span>
                    </div>

                    {/* Green Ignition Status Chip */}
                    <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#f0fdf4] dark:bg-emerald-950/60 text-[#16a34a] dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                      <Key className="w-3 h-3" />
                      <span>{vehicle.last_ignition ? 'ON' : 'OFF'}</span>
                    </div>

                    <div className="ml-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVehicle(vehicle);
                          setShowTelemetryDrawer(true);
                        }}
                        className="text-[10px] text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-400 font-medium underline cursor-pointer"
                      >
                        Telemetry
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Leaflet Interactive Map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100">
          <RajdharaaMap
            ref={mapRef}
            vehicles={mergedVehicles}
            geofences={geofences}
            checkposts={checkposts}
            gisLayers={gisLayers}
            activeLayerId={activeLayerId}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={handleSelectVehicle}
            showGeofences={showGeofences}
            showCheckposts={showCheckposts}
            showDistricts={showDistricts}
            showDivisionLabels={showDivisionLabels}
            initialZoom={13}
            initialCenter={[27.0425, 74.7214]}
          />
        </div>
      </div>

      {/* Telemetry Drawer overlay */}
      {showTelemetryDrawer && selectedVehicle && (
        <VehicleTelemetryDrawer
          vehicle={selectedVehicle}
          onClose={() => setShowTelemetryDrawer(false)}
        />
      )}
    </div>
  );
};

export default LiveTrackingView;
