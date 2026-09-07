import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import type { Vehicle, RawannaTransitDetails, TelemetryPoint, GISLayerConfig } from '@/shared/types/vts.types';
import { vtsApi } from '@/shared/services/vtsApi';
import {
  getRawannaTransitForVehicle,
  calculateRoadHeading,
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
  Play,
  Pause,
  RotateCcw,
  Navigation,
  Loader2,
} from 'lucide-react';

export const TrackVehicleView: React.FC = () => {
  const { regNo } = useParams<{ regNo: string }>();
  const navigate = useNavigate();
  const mapRef = useRef<RajdharaaMapHandle | null>(null);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [transitDetails, setTransitDetails] = useState<RawannaTransitDetails | null>(null);
  const [gisLayers, setGisLayers] = useState<GISLayerConfig[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [_stepIndex, setStepIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [followCamera, setFollowCamera] = useState<boolean>(true);

  // 1. Initial Load: Fetch vehicle metadata, GPS history, and GIS layers
  useEffect(() => {
    let isMounted = true;

    async function loadVehicleAndRoute() {
      if (!regNo) return;
      setIsLoading(true);

      try {
        const [vehiclesList, meta, historyPoints] = await Promise.all([
          vtsApi.getAllVehicles(),
          vtsApi.getGISMetadata(),
          vtsApi.getVehicleTrail(regNo, 300).catch(() => [] as TelemetryPoint[]),
        ]);

        if (!isMounted) return;

        setGisLayers(meta.layers);

        // Find vehicle from fleet or create fallback
        const targetVehicle =
          vehiclesList.find((v) => v.reg_no.toUpperCase() === regNo.toUpperCase()) || {
            id: `VEH-${regNo}`,
            reg_no: regNo,
            imei: '861819083751564',
            vehicle_type: 'Heavy Mining Tipper',
            driver_name: 'BABU LAL RAYAKA',
            driver_phone: '9687262425',
            capacity_tonnes: 16.0,
            mineral_type: 'Bajri',
            status: 'MOVING' as const,
            last_latitude: historyPoints[0]?.lat || 25.045,
            last_longitude: historyPoints[0]?.lng || 74.615,
            last_speed: 30.0,
            last_heading: 180,
            last_altitude: 239.6,
            last_satellites: 24,
            last_ignition: true,
            last_emergency: false,
            last_internal_batt: 4.1,
            last_updated: new Date().toLocaleTimeString('en-GB'),
            active_geofence: 'Active Corridor',
            active_e_ravanna: 'HAJS1040770053',
            input_voltage: 27.8,
            gps_fix: 1,
            vendor: 'iTriangle',
          };

        // Construct transit details (Point A -> Point B -> Point C)
        const transit = getRawannaTransitForVehicle(targetVehicle, historyPoints);

        const startCoord = transit.route_coordinates[0] || [targetVehicle.last_latitude, targetVehicle.last_longitude];
        const nextCoord = transit.route_coordinates[1] || startCoord;
        const initialHeading = calculateRoadHeading(
          startCoord[0],
          startCoord[1],
          nextCoord[0],
          nextCoord[1]
        );

        const initializedVehicle: Vehicle = {
          ...targetVehicle,
          last_latitude: startCoord[0],
          last_longitude: startCoord[1],
          last_heading: initialHeading || targetVehicle.last_heading || 0,
          last_speed: 30.0,
          status: 'MOVING',
          last_updated: new Date().toLocaleTimeString('en-GB'),
        };

        setVehicle(initializedVehicle);
        setTransitDetails(transit);
        setStepIndex(0);
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

  // 2. Continuous Point A -> Point B -> Point C Transit Simulation Loop
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

  if (isLoading || !vehicle || !transitDetails) {
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
          isTransitMode={true}
          initialCenter={transitDetails.route_coordinates[0] || [25.045, 74.615]}
          initialZoom={13}
          followVehicleCamera={followCamera}
        />

        {/* Floating Transit Pass Card on Top Right (Exact match of Image media_1788757108282.png) */}
        <div className="absolute top-4 right-4 z-[1000] w-[340px] max-w-[calc(100vw-2.5rem)] bg-white/95 dark:bg-[#0c1e38]/95 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-700/80 p-4 text-slate-800 dark:text-slate-100 backdrop-blur-md transition-all">
          {/* Header: Truck Icon + Reg No + Status Badge */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Truck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                {transitDetails.vehicle_reg_no}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
              {transitDetails.status || 'Unconfirm'}
            </span>
          </div>

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

          {/* Simulation / Playback Controls Bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>

              <button
                onClick={() => {
                  setStepIndex(0);
                  setIsPaused(false);
                }}
                className="p-1 rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                title="Restart Route"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase">Speed</span>
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                {Math.round(vehicle.last_speed)} km/h
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackVehicleView;
