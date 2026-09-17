import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import type {
  Vehicle,
  RawannaTransitDetails,
  TelemetryPoint,
  GISLayerConfig,
  VehicleAssignedRouteOption,
} from '@/shared/types/vts.types';
import { vtsApi } from '@/shared/services/vtsApi';
import {
  buildTransitDetailsWithLiveTelemetry,
  getRawannaTransitForVehicle,
} from '@/shared/data/rawannaTransitData';
import { RajdharaaMap, type RajdharaaMapHandle } from '@/shared/components/RajdharaaMap';
import {
  ArrowLeft,
  Truck,
  FileText,
  User,
  Scale,
  MapPin,
  Calendar,
  Navigation,
  Loader2,
  AlertTriangle,
  ShieldAlert,
  Route,
  RefreshCw,
} from 'lucide-react';

export const TrackVehicleView: React.FC = () => {
  const { regNo } = useParams<{ regNo: string }>();
  const navigate = useNavigate();
  const mapRef = useRef<RajdharaaMapHandle | null>(null);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [backendRawanna, setBackendRawanna] = useState<RawannaTransitDetails | null>(null);
  const [transitDetails, setTransitDetails] = useState<RawannaTransitDetails | null>(null);
  const [gisLayers, setGisLayers] = useState<GISLayerConfig[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [followCamera, setFollowCamera] = useState<boolean>(false);

  // Multi-route trip state for vehicles with multiple assigned routes
  const [assignedRoutes, setAssignedRoutes] = useState<VehicleAssignedRouteOption[]>([]);
  const [selectedPassNo, setSelectedPassNo] = useState<string>('AUTO');
  const [isSwitchingTrip, setIsSwitchingTrip] = useState<boolean>(false);

  // 1. Initial Load: Fetch vehicle metadata, GPS history, GIS layers, active e-Rawanna, and assigned routes
  useEffect(() => {
    let isMounted = true;

    async function loadVehicleAndRoute() {
      if (!regNo) return;
      setIsLoading(true);

      try {
        /* [Legacy Single-Trip Initial Load - Commented out as requested]
        const [vehiclesList, meta, historyPoints, rawannaRes] = await Promise.all([
          vtsApi.getAllVehicles(),
          vtsApi.getGISMetadata(),
          vtsApi.getVehicleTrail(regNo, 300).catch(() => [] as TelemetryPoint[]),
          vtsApi.getActiveERawanna(regNo),
        ]);
        */

        const [vehiclesList, meta, historyPoints, rawannaRes, routesRes] = await Promise.all([
          vtsApi.getAllVehicles(),
          vtsApi.getGISMetadata(),
          vtsApi.getVehicleTrail(regNo, 300).catch(() => [] as TelemetryPoint[]),
          vtsApi.getActiveERawanna(regNo),
          vtsApi.getVehicleAssignedRoutes(regNo).catch(() => null),
        ]);

        if (!isMounted) return;

        setGisLayers(meta.layers);

        if (routesRes && routesRes.assigned_routes) {
          setAssignedRoutes(routesRes.assigned_routes);
        }

        // Find vehicle from fleet or create fallback
        const targetVehicle =
          vehiclesList.find((v) => v.reg_no.toUpperCase() === regNo.toUpperCase()) || {
            id: `VEH-${regNo}`,
            reg_no: regNo,
            imei: '861819083751564',
            vehicle_type: 'Heavy Mining Tipper',
            driver_name: rawannaRes.data?.driver_name || 'Registered Driver',
            driver_phone: rawannaRes.data?.driver_phone || '',
            capacity_tonnes: 16.0,
            mineral_type: rawannaRes.data?.mineral_name || 'Mining Mineral',
            status: 'MOVING' as const,
            last_latitude: historyPoints[0]?.lat || 26.7099,
            last_longitude: historyPoints[0]?.lng || 75.8840,
            last_speed: 30.0,
            last_heading: 180,
            last_altitude: 239.6,
            last_satellites: 24,
            last_ignition: true,
            last_emergency: false,
            last_internal_batt: 4.1,
            last_updated: new Date().toLocaleTimeString('en-GB'),
            active_geofence: 'Mining Zone',
            active_e_ravanna: rawannaRes.data?.pass_no || (regNo.endsWith('2023') || regNo.includes('2023') ? 'ERAW-2023-TRANSIT' : undefined),
            has_active_rawanna: rawannaRes.has_rawanna || (regNo.endsWith('2023') || regNo.includes('2023')),
            input_voltage: 27.8,
            gps_fix: 1,
            vendor: 'AIRTEL',
          };

        setVehicle(targetVehicle);

        const isVehicle2023 = targetVehicle.reg_no.endsWith('2023') || targetVehicle.reg_no.includes('2023');

        // If backend returned active e-Rawanna, use that authentic predefined route!
        if (rawannaRes.has_rawanna && rawannaRes.data) {
          setBackendRawanna(rawannaRes.data);
          const transit = buildTransitDetailsWithLiveTelemetry(rawannaRes.data, targetVehicle, historyPoints);
          setTransitDetails(transit);
        } else if (isVehicle2023 || targetVehicle.has_active_rawanna || (targetVehicle.active_e_ravanna && targetVehicle.active_e_ravanna !== 'N/A')) {
          const fallbackTransit = getRawannaTransitForVehicle(targetVehicle, historyPoints);
          setTransitDetails(fallbackTransit);
        } else {
          // No e-Rawanna generated for this vehicle
          setBackendRawanna(null);
          setTransitDetails(null);
        }
      } catch (err) {
        console.error('Failed to load tracking data for vehicle:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadVehicleAndRoute();

    return () => {
      isMounted = false;
    };
  }, [regNo]);

  // UNREQUIRED SIMULATION LOOP COMMENTED OUT:
  // Vehicle movement strictly reflects live telemetry from backend
  /*
  useEffect(() => {
    if (!transitDetails || isPaused || !transitDetails.route_coordinates.length) return;

    const route = transitDetails.route_coordinates;

    const timer = setInterval(() => {
      setStepIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % route.length;
        const currentCoord = route[nextIndex];
        const forwardCoord = route[(nextIndex + 1) % route.length];
        const heading = calculateRoadHeading(
          currentCoord[0],
          currentCoord[1],
          forwardCoord[0],
          forwardCoord[1]
        );

        // Dynamic realistic speed along transit corridor (e.g. 30 km/h matching screenshot)
        const midIdx = Math.floor(route.length / 2);
        const isNearWeighbridge = Math.abs(nextIndex - midIdx) <= 1;
        const currentSpeed = isNearWeighbridge ? 20.0 : 30.0;

        setVehicle((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            last_latitude: currentCoord[0],
            last_longitude: currentCoord[1],
            last_heading: heading || prev.last_heading,
            last_speed: currentSpeed,
            status: 'MOVING',
            last_updated: new Date().toLocaleTimeString('en-GB'),
          };
        });

        // Auto pan map camera to follow vehicle if enabled
        if (followCamera && mapRef.current) {
          mapRef.current.flyToLocation(currentCoord[0], currentCoord[1], 14);
        }

        return nextIndex;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [transitDetails, isPaused, followCamera]);
  */

  /* [Legacy Single-Trip Polling - Commented out as requested]
  useEffect(() => {
    if (!regNo) return;
    let isMounted = true;

    const pollLivePosition = async () => {
      try {
        const [updatedVehicle, trail] = await Promise.all([
          vtsApi.getVehicleDetail(regNo),
          vtsApi.getVehicleTrail(regNo, 300).catch(() => [] as TelemetryPoint[]),
        ]);

        if (!isMounted) return;

        if (updatedVehicle) {
          setVehicle(updatedVehicle);
          if (backendRawanna) {
            setTransitDetails(buildTransitDetailsWithLiveTelemetry(backendRawanna, updatedVehicle, trail));
          } else if (updatedVehicle.has_active_rawanna || (updatedVehicle.active_e_ravanna && updatedVehicle.active_e_ravanna !== 'N/A')) {
            setTransitDetails(getRawannaTransitForVehicle(updatedVehicle, trail));
          } else {
            setTransitDetails(null);
          }

          if (followCamera && mapRef.current && updatedVehicle.last_latitude && updatedVehicle.last_longitude) {
            mapRef.current.panToLocation(updatedVehicle.last_latitude, updatedVehicle.last_longitude);
          }
        }
      } catch (err) {
        console.warn('Track vehicle live poll error:', err);
      }
    };

    const interval = setInterval(pollLivePosition, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [regNo, followCamera, backendRawanna]);
  */

  // 2. Real-Time Live Telemetry & Multi-Route Trip Polling (every 2.5s) from Backend Go Server
  useEffect(() => {
    if (!regNo) return;
    let isMounted = true;

    const pollLivePosition = async () => {
      try {
        const queryPass = selectedPassNo === 'AUTO' ? undefined : selectedPassNo;
        const [updatedVehicle, trail, activeRawannaRes] = await Promise.all([
          vtsApi.getVehicleDetail(regNo),
          vtsApi.getVehicleTrail(regNo, 300).catch(() => [] as TelemetryPoint[]),
          vtsApi.getActiveERawanna(regNo, queryPass),
        ]);

        if (!isMounted) return;

        if (updatedVehicle) {
          setVehicle(updatedVehicle);

          const isVehicle2023 = updatedVehicle.reg_no.endsWith('2023') || updatedVehicle.reg_no.includes('2023');
          if (activeRawannaRes && activeRawannaRes.has_rawanna && activeRawannaRes.data) {
            setBackendRawanna(activeRawannaRes.data);
            setTransitDetails(buildTransitDetailsWithLiveTelemetry(activeRawannaRes.data, updatedVehicle, trail));
          } else if (backendRawanna) {
            setTransitDetails(buildTransitDetailsWithLiveTelemetry(backendRawanna, updatedVehicle, trail));
          } else if (isVehicle2023 || updatedVehicle.has_active_rawanna || (updatedVehicle.active_e_ravanna && updatedVehicle.active_e_ravanna !== 'N/A')) {
            setTransitDetails(getRawannaTransitForVehicle(updatedVehicle, trail));
          } else {
            setTransitDetails(null);
          }

          // Auto pan map camera to follow vehicle if enabled
          if (followCamera && mapRef.current && updatedVehicle.last_latitude && updatedVehicle.last_longitude) {
            mapRef.current.panToLocation(updatedVehicle.last_latitude, updatedVehicle.last_longitude);
          }
        }
      } catch (err) {
        console.warn('Track vehicle live poll error:', err);
      }
    };

    const interval = setInterval(pollLivePosition, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [regNo, followCamera, backendRawanna, selectedPassNo]);

  // Trip Switching Action: Operator inspects another assigned route pass
  const handleSelectTrip = async (passNo: string) => {
    setSelectedPassNo(passNo);
    if (!regNo) return;

    try {
      setIsLoading(true);
      const queryPass = passNo === 'AUTO' ? undefined : passNo;
      const [rawannaRes, trail] = await Promise.all([
        vtsApi.getActiveERawanna(regNo, queryPass),
        vtsApi.getVehicleTrail(regNo, 300).catch(() => [] as TelemetryPoint[]),
      ]);

      if (rawannaRes.has_rawanna && rawannaRes.data) {
        setBackendRawanna(rawannaRes.data);
        if (vehicle) {
          setTransitDetails(buildTransitDetailsWithLiveTelemetry(rawannaRes.data, vehicle, trail));
        }
      }
    } catch (err) {
      console.error('Failed to load selected trip corridor:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Switch Active Route in Backend Go Server
  const handleSetActiveTripOnBackend = async (passNo: string) => {
    if (!regNo || isSwitchingTrip) return;
    setIsSwitchingTrip(true);
    try {
      const ok = await vtsApi.switchVehicleActiveTrip(regNo, passNo);
      if (ok) {
        await handleSelectTrip(passNo);
      }
    } catch (err) {
      console.error('Failed to switch trip on backend:', err);
    } finally {
      setIsSwitchingTrip(false);
    }
  };

  if (isLoading || !vehicle) {
    return (
      <div className="bg-white dark:bg-[#0a192f] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs p-12 flex flex-col items-center justify-center h-[calc(100vh-6.5rem)]">
        <Loader2 className="w-8 h-8 text-cyan-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Loading live vehicle route & transit pass details...
        </p>
        <span className="text-xs text-slate-400 mt-1 font-mono">{regNo}</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#0a192f] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden flex flex-col h-[calc(100vh-6.5rem)]">
      {/* Top Breadcrumb & Navigation Bar matching screenshot */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#0a192f] z-10">
        <div className="flex items-center gap-3">
          {/* Back button to return to Map View */}
          <button
            onClick={() => navigate('/live-tracking')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0c1e38] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-2xs cursor-pointer"
            title="Back to Map View"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Back to Map View</span>
          </button>

          <span className="text-slate-300 dark:text-slate-700 font-light">|</span>

          {/* Breadcrumb Title */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Map View</span>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">
              Track Vehicle: {vehicle.reg_no}
            </span>
          </div>
        </div>

        {/* Multi-Route Trip Selector if vehicle has multiple assigned routes */}
        {assignedRoutes.length > 1 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0c1e38] text-xs shadow-2xs">
            <Route className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
            <span className="font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">Corridor:</span>
            <select
              value={selectedPassNo}
              onChange={(e) => handleSelectTrip(e.target.value)}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-100 text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="AUTO" className="text-slate-900 bg-white dark:bg-[#0a192f] dark:text-slate-100">
                ⚡ Auto: Live Trip {backendRawanna?.pass_no ? `(${backendRawanna.pass_no})` : ''}
              </option>
              {assignedRoutes.map((r, i) => (
                <option key={r.pass_no} value={r.pass_no} className="text-slate-900 bg-white dark:bg-[#0a192f] dark:text-slate-100">
                  Trip {i + 1}: {r.corridor || r.name} ({r.mineral_name})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Right Status Indicator & Follow Camera Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFollowCamera(!followCamera)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
              followCamera
                ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-300 font-semibold'
                : 'bg-white dark:bg-[#0c1e38] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>{followCamera ? 'Following Vehicle' : 'Free Camera'}</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0c1e38] text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Tracking Active</span>
          </div>
        </div>
      </div>

      {/* Main Full-Width Map Canvas */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <RajdharaaMap
          ref={mapRef}
          vehicles={[vehicle]}
          selectedVehicle={vehicle}
          geofences={[]}
          checkposts={[]}
          activeLayerId="esri-street"
          gisLayers={gisLayers}
          onSelectVehicle={() => {}}
          showGeofences={false}
          showCheckposts={false}
          showDistricts={false}
          showDivisionLabels={false}
          transitDetails={transitDetails}
          isTransitMode={Boolean(transitDetails)}
          initialCenter={vehicle ? [vehicle.last_latitude, vehicle.last_longitude] : (transitDetails?.route_coordinates[0] || [26.7099, 75.8840])}
          initialZoom={13}
          followVehicleCamera={followCamera}
        />

        {/* Floating Transit Pass Card on Top Right */}
        {transitDetails ? (
          <div className="absolute top-4 right-4 z-[1000] w-[340px] max-w-[calc(100vw-2.5rem)] bg-white/95 dark:bg-[#0c1e38]/95 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-700/80 p-4 text-slate-800 dark:text-slate-100 backdrop-blur-md transition-all">
            {/* Header: Truck Icon + Reg No + Status Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                  {transitDetails.vehicle_reg_no}
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                transitDetails.is_deviated
                  ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-800/60 animate-pulse'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
              }`}>
                {transitDetails.status || 'In Transit'}
              </span>
            </div>

            {/* Multi-Route Trips Selector inside Transit Pass Card */}
            {assignedRoutes.length > 1 && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Route className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Assigned Routes ({assignedRoutes.length} Trips)</span>
                  </div>
                  {selectedPassNo !== 'AUTO' && selectedPassNo !== backendRawanna?.pass_no && (
                    <button
                      onClick={() => handleSetActiveTripOnBackend(selectedPassNo)}
                      disabled={isSwitchingTrip}
                      className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center gap-1 cursor-pointer bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800"
                      title="Notify Go server to switch active transit trip"
                    >
                      {isSwitchingTrip ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                      <span>Set Active</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {assignedRoutes.map((r, idx) => {
                    const isLiveActive = backendRawanna?.pass_no === r.pass_no;
                    const isSelected = selectedPassNo === r.pass_no || (selectedPassNo === 'AUTO' && isLiveActive);
                    return (
                      <button
                        key={r.pass_no}
                        onClick={() => handleSelectTrip(r.pass_no)}
                        className={`p-1.5 rounded-lg text-left text-[11px] transition cursor-pointer border flex flex-col ${
                          isSelected
                            ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-400 dark:border-cyan-600 text-cyan-900 dark:text-cyan-200 font-semibold shadow-xs'
                            : 'bg-white dark:bg-[#0c1e38] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-[10.5px]">Trip {idx + 1}</span>
                          {isLiveActive ? (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Live
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400">Pass</span>
                          )}
                        </div>
                        <span className="text-[9.5px] text-slate-500 dark:text-slate-400 truncate w-full mt-0.5" title={r.name}>
                          {r.corridor || r.name}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                          {r.mineral_name} • {r.tonnage}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Off-Corridor Deviation Warning Banner */}
            {transitDetails.is_deviated && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 flex items-start gap-2 text-xs text-red-700 dark:text-red-300 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold block">Off-Corridor Deviation Detected!</span>
                  <span className="text-[11px] text-red-600 dark:text-red-400">
                    Truck is {transitDetails.deviation_distance_meters || 0}m outside authorized Point A &rarr; B &rarr; C corridor.
                  </span>
                </div>
              </div>
            )}

            {/* TP Number Row */}
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 mt-3 mb-2">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span>TP: {transitDetails.pass_no}</span>
            </div>

            {/* Driver Details Row */}
            <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200 mb-2">
              <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-slate-500 dark:text-slate-400">Driver: </span>
                <span className="font-bold uppercase">{transitDetails.driver_name}</span>
                <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px] mt-0.5">
                  {transitDetails.driver_phone} •
                </div>
              </div>
            </div>

            {/* Mineral & Weight & Weighbridge */}
            <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200 mb-2.5">
              <Scale className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="w-full">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-500 dark:text-slate-400">Mineral: </span>
                    <span className="font-bold">{transitDetails.mineral_name}</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">{transitDetails.tonnage}</span>
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 font-mono">
                  Weighbridge: {transitDetails.weighbridge_code}
                </div>
              </div>
            </div>

            {/* From: Starting Point (Green Pin) */}
            <div className="flex items-start gap-2 text-xs mb-2">
              <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10.5px] uppercase tracking-wider block">
                  From:
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {transitDetails.pointA.name}
                </span>
              </div>
            </div>

            {/* To: Destination Consignee (Red Pin) */}
            <div className="flex items-start gap-2 text-xs mb-3">
              <MapPin className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-rose-600 dark:text-rose-400 font-bold text-[10.5px] uppercase tracking-wider block">
                  To: {transitDetails.pointC.name}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                  {transitDetails.consignee_address || transitDetails.pointC.subtext}
                </span>
              </div>
            </div>

            {/* Generated & Expire At Timestamps */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Generated At: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{transitDetails.generated_at}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Expire At: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{transitDetails.expire_at}</span>
                </span>
              </div>
            </div>

            {/* Live Telemetry Status Bar */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Live Telemetry Active</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase">Speed</span>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  {Math.round(vehicle.last_speed)} km/h
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Transit Tracking Restricted Card for vehicles without e-Rawanna */
          <div className="absolute top-4 right-4 z-[1000] w-[340px] max-w-[calc(100vw-2.5rem)] bg-white/95 dark:bg-[#0c1e38]/95 rounded-2xl shadow-xl border border-amber-200/90 dark:border-amber-700/80 p-5 text-slate-800 dark:text-slate-100 backdrop-blur-md transition-all">
            <div className="flex items-center gap-2.5 pb-3 border-b border-amber-100 dark:border-amber-900/50">
              <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  Transit Corridor Restricted
                </span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  e-Rawanna Not Generated
                </span>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Authorized corridor route tracking is restricted for vehicle <strong className="font-mono text-slate-900 dark:text-white">{vehicle.reg_no}</strong> because no active e-Rawanna transit pass has been issued.
              </p>
              <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">GPS Telemetry:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Live (Routine Fleet)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Speed:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{Math.round(vehicle.last_speed)} km/h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Live Coordinates:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {vehicle.last_latitude.toFixed(4)}, {vehicle.last_longitude.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/live-tracking')}
              className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Fleet Map View</span>
            </button>
          </div>
        )}

        {/* Route Corridor Legend (Bottom-Left) - Only visible when an authorized transit route corridor is active */}
        {/* COMMENTED OUT AS REQUESTED: Route Corridor Legend overlay
        {transitDetails && (
          <div className="absolute bottom-6 left-6 z-[1000] bg-white/95 dark:bg-[#0c1e38]/95 backdrop-blur-md px-3.5 py-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-lg text-xs space-y-2 select-none pointer-events-auto">
            <div className="font-bold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
              <span>Route Corridor Legend</span>
              <span className="text-[10px] text-slate-400 font-normal">Buffer: 200m</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-1 border-t-2 border-dashed border-slate-500 block"></span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">Planned Corridor (A &rarr; B &rarr; C)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-1.5 bg-emerald-600 rounded-full block"></span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">Real-Time Traveled Route</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-1.5 bg-red-600 rounded-full block"></span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">Deviated Path (&gt; 200m off route)</span>
            </div>
            <div className="flex items-center gap-3 pt-1 text-[10.5px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 text-[8px] text-white flex items-center justify-center font-bold">A</span> Mine</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600 text-[8px] text-white flex items-center justify-center font-bold">B</span> WB</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 text-[8px] text-white flex items-center justify-center font-bold">C</span> Consignee</span>
            </div>
          </div>
        )}
        */}
      </div>
    </div>
  );
};

export default TrackVehicleView;
