import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { TelemetryPoint, Vehicle, GISLayerConfig } from '@/shared/types/vts.types';
import { vtsApi } from '@/shared/services/vtsApi';
import { RajdharaaMap } from '@/shared/components/RajdharaaMap';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Repeat,
  Crosshair,
  Calendar,
  ChevronDown,
  RefreshCw,
  Map as MapIcon,
  Truck,
} from 'lucide-react';

export const RoutePlaybackView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedRegNo, setSelectedRegNo] = useState<string>(
    searchParams.get('reg_no') || ''
  );
  const [startTime, setStartTime] = useState<string>('04-09-2026 10:00');
  const [endTime, setEndTime] = useState<string>('04-09-2026 16:30');

  const [isReplayLoaded, setIsReplayLoaded] = useState<boolean>(false);
  const [loadingReplay, setLoadingReplay] = useState<boolean>(false);
  const [trail, setTrail] = useState<TelemetryPoint[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [followCamera, setFollowCamera] = useState<boolean>(false);
  const [gisLayers, setGisLayers] = useState<GISLayerConfig[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string>('esri-street');
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAutoLoadedRef = useRef<boolean>(false);

  // Load all vehicles (live transmitting + registered fleet) and GIS meta for replay
  useEffect(() => {
    async function loadData() {
      const [list, meta] = await Promise.all([
        vtsApi.getAllVehicles(),
        vtsApi.getGISMetadata(),
      ]);
      setVehicles(list);
      setGisLayers(meta.layers);

      const urlReg = searchParams.get('reg_no');
      if (urlReg) {
        setSelectedRegNo(urlReg);
        if (!hasAutoLoadedRef.current) {
          hasAutoLoadedRef.current = true;
          handleLoadReplayForRegNo(urlReg);
        }
      } else if (list.length > 0) {
        setSelectedRegNo(list[0].reg_no);
        if (!hasAutoLoadedRef.current) {
          hasAutoLoadedRef.current = true;
          handleLoadReplayForRegNo(list[0].reg_no);
        }
      }
    }
    loadData();
  }, [searchParams]);

  // Handle Load Replay for a specific vehicle registration number
  const handleLoadReplayForRegNo = async (regNoToLoad: string) => {
    if (!regNoToLoad) return;
    setLoadingReplay(true);
    setIsPlaying(false);
    setCurrentIndex(0);

    const points = await vtsApi.getVehicleTrail(regNoToLoad, 500);
    setTrail(points);
    if (points.length > 0) {
      if (points[0].timestamp) {
        const dStart = new Date(points[0].timestamp);
        if (!isNaN(dStart.getTime())) {
          setStartTime(
            dStart.toLocaleString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          );
        }
      }
      if (points[points.length - 1].timestamp) {
        const dEnd = new Date(points[points.length - 1].timestamp);
        if (!isNaN(dEnd.getTime())) {
          setEndTime(
            dEnd.toLocaleString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          );
        }
      }
      // Immediately initialize replay mode and auto-start video playback
      setIsReplayLoaded(true);
      setIsPlaying(true);
    }
    setLoadingReplay(false);
  };

  const handleLoadReplay = () => {
    handleLoadReplayForRegNo(selectedRegNo);
  };

  // Video playback timer loop with smooth cadence
  useEffect(() => {
    if (isPlaying && trail.length > 0) {
      // Smooth frame timing: scaled by playback multiplier
      const intervalMs = Math.max(30, Math.round(250 / playbackSpeed));
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= trail.length - 1) {
            if (isLooping) {
              return 0;
            }
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, trail.length, isLooping]);

  // Keyboard shortcut listener (Spacebar = Play/Pause, Arrows = Scrub)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isReplayLoaded || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - 5));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(trail.length - 1, prev + 5));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReplayLoaded, trail.length]);

  const currentPoint = trail[currentIndex] || null;
  const currentVehicleObj = vehicles.find((v) => v.reg_no === selectedRegNo) || null;

  // Virtual vehicle representation at current video timeline frame with authentic truck structure
  const playbackVehicle: Vehicle | null = useMemo(() => {
    if (!currentPoint && !currentVehicleObj) return null;

    const base = currentVehicleObj || {
      id: `VEH-${selectedRegNo}`,
      reg_no: selectedRegNo || 'RJ14AA7906',
      imei: '861819083751564',
      vehicle_type: 'Truck (Multi-Axle)',
      driver_name: 'Registered Driver',
      driver_phone: '+91 94140 XXXXX',
      capacity_tonnes: 32.0,
      mineral_type: 'Mining Mineral',
      status: 'MOVING' as const,
      last_latitude: currentPoint?.lat || 26.483,
      last_longitude: currentPoint?.lng || 74.954,
      last_speed: currentPoint?.speed || 0,
      last_heading: currentPoint?.heading || 0,
      last_altitude: 239.6,
      last_satellites: 24,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 4.1,
      last_updated: 'Just now',
      active_geofence: 'Active Corridor',
      active_e_ravanna: 'ERAW-2026',
      input_voltage: 27.8,
      gps_fix: 1,
      vendor: 'AIRTEL',
    };

    if (!currentPoint) {
      return base;
    }

    // Calculate heading along the road if current point heading is 0 or missing
    let heading = currentPoint.heading;
    if ((!heading || heading === 0) && trail.length > 1) {
      const pPrev = currentIndex > 0 ? trail[currentIndex - 1] : trail[0];
      const pNext = currentIndex < trail.length - 1 ? trail[currentIndex + 1] : trail[currentIndex];
      const dLat = pNext.lat - pPrev.lat;
      const dLng = pNext.lng - pPrev.lng;
      if (Math.abs(dLat) > 0.00001 || Math.abs(dLng) > 0.00001) {
        const rad = Math.atan2(dLng, dLat);
        heading = (rad * 180) / Math.PI;
        if (heading < 0) heading += 360;
      }
    }

    return {
      ...base,
      last_latitude: currentPoint.lat,
      last_longitude: currentPoint.lng,
      last_speed: currentPoint.speed,
      last_heading: heading || 0,
      last_ignition: currentPoint.ignition,
      status: currentPoint.speed > 5 ? ('MOVING' as const) : ('IDLE' as const),
    };
  }, [currentPoint, currentVehicleObj, selectedRegNo, currentIndex, trail]);

  // Total route polyline coordinates
  const polylineCoords: [number, number][] = useMemo(
    () => trail.map((p) => [p.lat, p.lng]),
    [trail]
  );

  // Traveled route progress polyline (Point A up to current frame)
  const traveledCoords: [number, number][] = useMemo(
    () => trail.slice(0, currentIndex + 1).map((p) => [p.lat, p.lng]),
    [trail, currentIndex]
  );

  // Cumulative distance calculations in kilometers
  const { currentDistanceKm, totalDistanceKm } = useMemo(() => {
    if (trail.length < 2) return { currentDistanceKm: '0.0', totalDistanceKm: '0.0' };
    let total = 0;
    let current = 0;
    for (let i = 1; i < trail.length; i++) {
      const dLat = (trail[i].lat - trail[i - 1].lat) * 111.32;
      const dLng =
        (trail[i].lng - trail[i - 1].lng) *
        111.32 *
        Math.cos((trail[i].lat * Math.PI) / 180);
      const segDist = Math.sqrt(dLat * dLat + dLng * dLng);
      total += segDist;
      if (i <= currentIndex) {
        current += segDist;
      }
    }
    return {
      currentDistanceKm: current.toFixed(1),
      totalDistanceKm: total.toFixed(1),
    };
  }, [trail, currentIndex]);

  const togglePlay = () => {
    if (currentIndex >= trail.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setCurrentIndex(val);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Control Card */}
      <div className="bg-white dark:bg-[#0a192f] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 md:p-5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            {/* Vehicle Select */}
            <div className="space-y-1.5 min-w-[200px] flex-1 max-w-xs">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Vehicle
              </label>
              <div className="relative">
                <select
                  value={selectedRegNo}
                  onChange={(e) => {
                    setSelectedRegNo(e.target.value);
                    setIsReplayLoaded(false);
                  }}
                  className="w-full appearance-none bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-medium rounded-xl pl-3.5 pr-8 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-cyan-600 transition shadow-2xs cursor-pointer"
                >
                  {vehicles.map((v) => (
                    <option key={v.reg_no} value={v.reg_no}>
                      {v.reg_no} ({v.mineral_type})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Start Time Input */}
            <div className="space-y-1.5 min-w-[190px] flex-1 max-w-xs">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Start Time
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="04-09-2026 10:00"
                  className="w-full bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-medium rounded-xl pl-3.5 pr-9 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-cyan-600 transition shadow-2xs"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* End Time Input */}
            <div className="space-y-1.5 min-w-[190px] flex-1 max-w-xs">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                End Time
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="04-09-2026 16:30"
                  className="w-full bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-medium rounded-xl pl-3.5 pr-9 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-cyan-600 transition shadow-2xs"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Action Button: Load Replay */}
          <div className="pt-5">
            <button
              onClick={handleLoadReplay}
              disabled={loadingReplay}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#087f94] hover:bg-[#066c7e] text-white text-xs font-semibold rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingReplay ? 'animate-spin' : ''}`} />
              <span>{loadingReplay ? 'Loading Packets...' : 'Load Replay'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Replay Video Viewport */}
      {!isReplayLoaded ? (
        /* Empty State */
        <div className="bg-white dark:bg-[#0a192f] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-12 md:p-24 shadow-2xs flex flex-col items-center justify-center text-center min-h-[460px]">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 shadow-2xs">
            <MapIcon className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
            Please select vehicle and load replay
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm">
            Click "Load Replay" to launch the video route playback and review past GPS movements
          </p>
        </div>
      ) : (
        /* Loaded Replay Map & Video Controls */
        <div className="bg-white dark:bg-[#0a192f] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden flex flex-col h-[calc(100vh-14rem)] min-h-[520px]">
          {/* Map Top Header */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-[#0c1e38]/70 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {selectedRegNo}
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                {trail.length} Telemetry Packets • Total Route: {totalDistanceKm} km
              </span>
            </div>

            <div className="relative">
              {/* <button
                onClick={() => setShowLayerMenu((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs text-xs font-medium cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Base Map</span>
              </button> */}

              {showLayerMenu && (
                <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2 space-y-1 text-xs">
                  {gisLayers.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => {
                        setActiveLayerId(l.id);
                        setShowLayerMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg transition cursor-pointer ${activeLayerId === l.id
                          ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-300 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Interactive Map with Video HUD overlays */}
          <div className="flex-1 relative overflow-hidden">
            <RajdharaaMap
              vehicles={playbackVehicle ? [playbackVehicle] : []}
              geofences={[]}
              checkposts={[]}
              gisLayers={gisLayers}
              activeLayerId={activeLayerId}
              selectedVehicle={playbackVehicle}
              onSelectVehicle={() => { }}
              showTrail={false}
              replayRoutePoints={polylineCoords}
              replayTraveledPoints={traveledCoords}
              isReplayMode={true}
              followVehicleCamera={followCamera}
              showGeofences={false}
              showCheckposts={false}
              showDistricts={true}
              initialZoom={13}
              initialCenter={polylineCoords[0] || [26.483, 74.954]}
            />

            {/* Top-Left: Video Cockpit HUD Overlay */}
            {currentPoint && (
              <div className="absolute top-3 left-3 z-[800] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 text-white shadow-xl min-w-[210px] font-sans">
                <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-xs text-cyan-300 font-mono tracking-wide">{selectedRegNo}</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {isPlaying ? 'Replaying' : 'Paused'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Speed</span>
                    <span className="text-base font-bold font-mono text-emerald-400">
                      {currentPoint.speed.toFixed(1)} <span className="text-[10px] font-normal text-slate-300">km/h</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Distance</span>
                    <span className="text-xs font-bold font-mono text-white">
                      {currentDistanceKm} <span className="text-[10px] font-normal text-slate-400">/ {totalDistanceKm} km</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Packet Time</span>
                    <span className="font-mono text-[10.5px] text-slate-200 block truncate">
                      {currentPoint.timestamp ? new Date(currentPoint.timestamp).toLocaleTimeString() : '--:--'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Ignition</span>
                    <span className={`text-[10.5px] font-bold ${currentPoint.ignition ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {currentPoint.ignition ? '● Engine ON' : '○ Engine OFF'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Top-Right: Route Endpoints (Point A & B Summary) */}
            <div className="absolute top-3 right-3 z-[800] hidden sm:flex flex-col gap-1.5 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-md text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">A</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Start (A):</span>
                <span className="font-mono text-slate-500">{trail[0]?.timestamp ? new Date(trail[0].timestamp).toLocaleTimeString() : 'Origin'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center text-[10px]">B</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">End (B):</span>
                <span className="font-mono text-slate-500">{trail[trail.length - 1]?.timestamp ? new Date(trail[trail.length - 1].timestamp).toLocaleTimeString() : 'Destination'}</span>
              </div>
            </div>
          </div>

          {/* Video Player Control Deck */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a192f] space-y-3">
            {/* Timeline Slider with Scrubber & Timecode */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-mono">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-cyan-700 dark:text-cyan-400">
                    {currentPoint?.timestamp ? new Date(currentPoint.timestamp).toLocaleString() : '--:--'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    (Frame {currentIndex + 1} of {trail.length})
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {((currentIndex / Math.max(1, trail.length - 1)) * 100).toFixed(0)}% Replayed
                </div>
              </div>

              <div className="relative flex items-center">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, trail.length - 1)}
                  value={currentIndex}
                  onChange={handleSeek}
                  className="w-full accent-cyan-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg transition"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                <span>Start: {trail[0]?.timestamp ? new Date(trail[0].timestamp).toLocaleTimeString() : '00:00'}</span>
                <span className="hidden md:inline text-slate-400">Press Spacebar to Play/Pause • Arrows to Step</span>
                <span>End: {trail[trail.length - 1]?.timestamp ? new Date(trail[trail.length - 1].timestamp).toLocaleTimeString() : '--:--'}</span>
              </div>
            </div>

            {/* Video Player Transport Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {/* Left Transport Buttons */}
              <div className="flex items-center gap-2">
                {/* Reset to Start */}
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentIndex(0);
                  }}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Restart from beginning (Point A)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Step Back 5 Packets */}
                <button
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 5))}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Step back 5 frames"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                {/* Main Play / Pause Button */}
                <button
                  onClick={togglePlay}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs transition shadow-md cursor-pointer"
                  title={isPlaying ? 'Pause (Spacebar)' : 'Play Replay (Spacebar)'}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Play Replay</span>
                    </>
                  )}
                </button>

                {/* Step Forward 5 Packets */}
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(trail.length - 1, prev + 5))}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Step forward 5 frames"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                {/* Loop Toggle */}
                <button
                  onClick={() => setIsLooping((prev) => !prev)}
                  className={`p-2.5 rounded-xl border transition cursor-pointer ${isLooping
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-700 dark:text-cyan-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  title={isLooping ? 'Auto-loop is enabled' : 'Click to enable auto-loop'}
                >
                  <Repeat className="w-4 h-4" />
                </button>

                {/* Camera Follow Toggle */}
                <button
                  onClick={() => setFollowCamera((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${followCamera
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-700 dark:text-cyan-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  title="Follow vehicle with camera"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Follow Camera</span>
                </button>
              </div>

              {/* Right Speed Multipliers */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Speed:</span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {[0.5, 1, 2, 5, 10].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${playbackSpeed === spd
                          ? 'bg-white dark:bg-[#0c1e38] text-cyan-800 dark:text-cyan-300 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutePlaybackView;
