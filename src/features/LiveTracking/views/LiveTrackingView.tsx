import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import type {
  CheckpostFeature,
  GeofenceZone,
  GISLayerConfig,
  Vehicle,
  // RawannaTransitDetails,
} from '@/shared/types/vts.types';
import { vtsApi } from '@/shared/services/vtsApi';
import { useLiveTelemetry } from '@/shared/hooks/useLiveTelemetry';
import { RajdharaaMap, type RajdharaaMapHandle } from '@/shared/components/RajdharaaMap';
import { VehicleTelemetryDrawer } from '../components/VehicleTelemetryDrawer';
// import { calculateRoadHeading } from '@/shared/data/rawannaTransitData';
import {
  Search,
  FileText,
  ChevronDown,
  Truck,
  Battery,
  Zap,
  Key,
  Navigation,
  // X,
  // Play,
  // Pause,
  // RotateCcw,
  // Radio,
} from 'lucide-react';

export const LiveTrackingView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mapRef = useRef<RajdharaaMapHandle | null>(null);

  const {
    vehicles: liveVehiclesList,
    // lastSyncTime,
    // isLiveConnected,
    // getVehicleTrail,
  } = useLiveTelemetry(2000);

  const [geofences, setGeofences] = useState<GeofenceZone[]>([]);
  const [checkposts, setCheckposts] = useState<CheckpostFeature[]>([]);
  const [gisLayers, setGisLayers] = useState<GISLayerConfig[]>([]);
  const [activeLayerId] = useState<string>('esri-street');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  // EXCESS: Trail polyline commented out as requested:
  // const [selectedTrail, setSelectedTrail] = useState<[number, number][]>([]);
  const [showTelemetryDrawer, setShowTelemetryDrawer] = useState<boolean>(false);

  // UNREQUIRED SIMULATION STATES COMMENTED OUT:
  // const [activeTransitDetails, setActiveTransitDetails] = useState<RawannaTransitDetails | null>(null);
  // const [_simStepIndex, setSimStepIndex] = useState<number>(0);
  // const [isSimPaused, setIsSimPaused] = useState<boolean>(false);

  // Controls & Filters (Default to ALL so all active transmitting vehicles appear in list view)
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showOnlyActiveERawanna, setShowOnlyActiveERawanna] = useState<boolean>(false);

  // Map Feature Toggles (disabled to match clean production view, can be re-enabled anytime)
  const [showGeofences] = useState(false);
  const [showCheckposts] = useState(false);
  const [showDistricts] = useState(false);
  const [showDivisionLabels] = useState(false);

  // Load initial GIS data
  useEffect(() => {
    async function loadData() {
      const [gfList, meta] = await Promise.all([
        vtsApi.getGeofences(),
        vtsApi.getGISMetadata(),
      ]);

      setGeofences(gfList);
      setGisLayers(meta.layers);
      setCheckposts(meta.checkposts);
    }
    loadData();
  }, []);

  // Check URL query param for vehicle or default to first active live vehicle
  useEffect(() => {
    const targetRegNo = searchParams.get('vehicle');
    if (targetRegNo && liveVehiclesList.length > 0) {
      const found = liveVehiclesList.find((v) => v.reg_no === targetRegNo);
      if (found) {
        setSelectedVehicle(found);
        setStatusFilter('ALL');
        return;
      }
    }
    // Default to first active live vehicle transmitting packets from backend (e.g. RJ14AA7906)
    if (!selectedVehicle && liveVehiclesList.length > 0) {
      setSelectedVehicle(liveVehiclesList[0]);
    }
  }, [searchParams, liveVehiclesList, selectedVehicle]);

  // Keep selected vehicle fresh with live telemetry strictly from Go backend
  useEffect(() => {
    if (selectedVehicle && liveVehiclesList.length > 0) {
      const updated = liveVehiclesList.find((v) => v.reg_no === selectedVehicle.reg_no);
      if (updated) {
        setSelectedVehicle(updated);
      }
    }
  }, [liveVehiclesList, selectedVehicle]);

  // UNREQUIRED SIMULATION LOOP COMMENTED OUT:
  // Map strictly renders live vehicle coordinates received from PostgreSQL packets
  /*
  useEffect(() => {
    if (!activeTransitDetails || isSimPaused) return;

    const route = activeTransitDetails.route_coordinates;
    if (!route || route.length === 0) return;

    const timer = setInterval(() => {
      setSimStepIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % route.length;
        const currentCoord = route[nextIndex];
        const forwardCoord = route[(nextIndex + 1) % route.length];
        const heading = calculateRoadHeading(
          currentCoord[0],
          currentCoord[1],
          forwardCoord[0],
          forwardCoord[1]
        );

        const midIdx = Math.floor(route.length / 2);
        const isNearWeighbridge = Math.abs(nextIndex - midIdx) <= 1;
        const currentSpeed = isNearWeighbridge ? 20.0 : 45.0;

        setSelectedVehicle((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            last_latitude: currentCoord[0],
            last_longitude: currentCoord[1],
            last_heading: heading,
            last_speed: currentSpeed,
            status: 'MOVING',
            last_updated: new Date().toLocaleTimeString('en-GB'),
          };
        });

        return nextIndex;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [activeTransitDetails, isSimPaused]);
  */

  // Map strictly uses authentic live transmitting fleet
  const mapVehicles = liveVehiclesList;

  // Open individual vehicle tracking in dedicated new page/component (matching user screenshot)
  const handleTrackVehicle = (vehicle: Vehicle, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigate(`/track-vehicle/${vehicle.reg_no}`);
  };


  // Filtered vehicles for sidebar card list
  const filteredVehicles = useMemo(() => {
    return liveVehiclesList.filter((v) => {
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
  }, [liveVehiclesList, searchTerm, statusFilter, showOnlyActiveERawanna]);

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
        {/* Left Search Input - sized to match vehicle card column */}
        <div className="relative w-full max-w-[310px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Vehicle No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-xl pl-9 pr-8 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-cyan-600 transition shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Right Controls: Active e-Rawanna, Status Dropdown (Telemetry indicator commented out for production) */}
        <div className="flex items-center gap-2.5">
          {/* EXCESS: Live Telemetry Ping Indicator - Commented out to match production. Uncomment to restore:
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0c1e38] text-[11px]">
            <Radio className={`w-3.5 h-3.5 ${isLiveConnected ? 'text-emerald-500 animate-pulse' : 'text-amber-500'}`} />
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {isLiveConnected ? 'Live Telemetry' : 'Telemetry Sync'}
            </span>
            {lastSyncTime && (
              <span className="font-mono text-slate-400 dark:text-slate-400 text-[10px]">
                {lastSyncTime}
              </span>
            )}
          </div>
          */}
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
        </div>
      </div>

      {/* Main Map & Sidebar Content Split */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* Left: Scrollable Vehicle Cards List (Compact 310px width matching production) */}
        <div className="w-full md:w-[305px] lg:w-[310px] xl:w-[315px] flex-shrink-0 flex flex-col gap-2.5 overflow-y-auto pr-1">
          {filteredVehicles.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-slate-200">
              No vehicles match current filter.
            </div>
          ) : (
            filteredVehicles.map((vehicle) => {
              const isSelected = selectedVehicle?.reg_no === vehicle.reg_no;
              const isMoving = vehicle.status === 'MOVING';
              const hasActiveRawanna = Boolean(vehicle.active_e_ravanna) && vehicle.active_e_ravanna !== 'N/A';

              return (
                <div
                  key={vehicle.reg_no}
                  onClick={() => handleSelectVehicle(vehicle)}
                  className={`bg-white dark:bg-[#0c1e38] rounded-xl p-3.5 transition shadow-2xs cursor-pointer ${
                    isSelected
                      ? 'border-2 border-[#007b83] dark:border-cyan-500'
                      : 'border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Card Top Row: Truck Icon + Reg No + Status Badge */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
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
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-1.5 text-xs text-slate-600 dark:text-slate-300 mb-3">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10.5px]">Speed</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {vehicle.last_speed.toFixed(1)} km/h
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10.5px]">Last Update</span>
                      <span className="text-slate-800 dark:text-slate-200 font-mono text-[10.5px]">
                        {vehicle.last_updated || 'Just now'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10.5px]">Vendor & Manufacturer</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100 truncate block">
                        {vehicle.vendor || 'BULL'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10.5px]">e-Rawanna Number</span>
                      {hasActiveRawanna ? (
                        <span className="inline-block bg-[#2563eb] text-white px-2 py-0.5 rounded font-mono text-[11px] font-semibold">
                          {vehicle.active_e_ravanna}
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                          {vehicle.active_e_ravanna || 'N/A'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Chips: Blue Voltage, Purple Batt, Green Ignition */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10.5px] font-semibold">
                    {/* Blue Input Voltage Chip */}
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#eff6ff] dark:bg-blue-950/60 text-[#2563eb] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                      <Battery className="w-3 h-3" />
                      <span>{vehicle.input_voltage ? `${vehicle.input_voltage}V` : '27V'}</span>
                    </div>

                    {/* Purple Internal Battery Chip */}
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#faf5ff] dark:bg-purple-950/60 text-[#9333ea] dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
                      <Zap className="w-3 h-3" />
                      <span>{vehicle.last_internal_batt ? `${vehicle.last_internal_batt}V` : '4V'}</span>
                    </div>

                    {/* Green Ignition Status Chip */}
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#f0fdf4] dark:bg-emerald-950/60 text-[#16a34a] dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                      <Key className="w-3 h-3" />
                      <span>{vehicle.last_ignition ? 'ON' : 'OFF'}</span>
                    </div>
                  </div>

                  {/* Track Vehicle Button (Opens individual vehicle tracking in dedicated page/component) */}
                  <button
                    onClick={(e) => handleTrackVehicle(vehicle, e)}
                    className="w-full mt-2.5 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs bg-[#007b83] hover:bg-[#00636b] text-white"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Track Vehicle</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Leaflet Interactive Map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100">
          <RajdharaaMap
            ref={mapRef}
            vehicles={mapVehicles}
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
            showTrail={false}
            trailPoints={[]}
            initialZoom={13}
            initialCenter={liveVehiclesList.length > 0 ? [liveVehiclesList[0].last_latitude, liveVehiclesList[0].last_longitude] : [26.9124, 75.7873]}
            transitDetails={null}
            isTransitMode={false}
          />

          {/* UNREQUIRED DUMMY TRANSIT OVERLAY CARD COMMENTED OUT:
          Tracking an individual vehicle now opens in dedicated TrackVehicleView component */}
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
