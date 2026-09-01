import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router';
import type { TelemetryPoint, Vehicle, GISLayerConfig } from '@/shared/types/vts.types';
import { vtsApi } from '@/shared/services/vtsApi';
import { RajdharaaMap } from '@/shared/components/RajdharaaMap';
import {
  Play,
  Pause,
  RotateCcw,
  Calendar,
  Layers,
  ChevronDown,
  RefreshCw,
  Map as MapIcon,
} from 'lucide-react';

export const RoutePlaybackView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedRegNo, setSelectedRegNo] = useState<string>(
    searchParams.get('reg_no') || 'RJ04GC1587'
  );
  const [startTime, setStartTime] = useState<string>('01-09-2026 07:52');
  const [endTime, setEndTime] = useState<string>('01-09-2026 10:52');

  const [isReplayLoaded, setIsReplayLoaded] = useState<boolean>(false);
  const [loadingReplay, setLoadingReplay] = useState<boolean>(false);
  const [trail, setTrail] = useState<TelemetryPoint[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [gisLayers, setGisLayers] = useState<GISLayerConfig[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string>('osm-standard');
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load initial vehicles and GIS meta
  useEffect(() => {
    async function loadData() {
      const [list, meta] = await Promise.all([
        vtsApi.getVehicles(),
        vtsApi.getGISMetadata(),
      ]);
      setVehicles(list);
      setGisLayers(meta.layers);

      const urlReg = searchParams.get('reg_no');
      if (urlReg) {
        setSelectedRegNo(urlReg);
      } else if (list.length > 0) {
        setSelectedRegNo('RJ04GC1587');
      }
    }
    loadData();
  }, [searchParams]);

  // Handle Load Replay
  const handleLoadReplay = async () => {
    if (!selectedRegNo) return;
    setLoadingReplay(true);
    setIsPlaying(false);
    setCurrentIndex(0);

    const points = await vtsApi.getVehicleTrail(selectedRegNo);
    setTrail(points);
    setIsReplayLoaded(true);
    setLoadingReplay(false);
  };

  // Playback timer loop
  useEffect(() => {
    if (isPlaying && trail.length > 0) {
      const intervalMs = Math.max(100, 1000 / playbackSpeed);
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= trail.length - 1) {
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
  }, [isPlaying, playbackSpeed, trail.length]);

  const currentPoint = trail[currentIndex] || null;
  const currentVehicleObj = vehicles.find((v) => v.reg_no === selectedRegNo) || null;

  // Virtual vehicle representation at current timeline point
  const playbackVehicle: Vehicle | null =
    currentPoint && currentVehicleObj
      ? {
          ...currentVehicleObj,
          last_latitude: currentPoint.lat,
          last_longitude: currentPoint.lng,
          last_speed: currentPoint.speed,
          last_heading: currentPoint.heading,
          last_ignition: currentPoint.ignition,
          status: currentPoint.speed > 5 ? 'MOVING' : 'IDLE',
        }
      : null;

  const polylineCoords: [number, number][] = trail.map((p) => [p.lat, p.lng]);

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
                  placeholder="01-09-2026 07:52"
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
                  placeholder="01-09-2026 10:52"
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
              <span>Load Replay</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Viewport */}
      {!isReplayLoaded ? (
        /* Empty State matching Screenshot 5 */
        <div className="bg-white dark:bg-[#0a192f] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-12 md:p-24 shadow-2xs flex flex-col items-center justify-center text-center min-h-[460px]">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 shadow-2xs">
            <MapIcon className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
            Please select vehicle and time range
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm">
            Select a vehicle and time range to view the replay
          </p>
        </div>
      ) : (
        /* Loaded Replay Map & Controls */
        <div className="bg-white dark:bg-[#0a192f] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden flex flex-col h-[calc(100vh-14rem)] min-h-[500px]">
          {/* Map Header with Layer Switcher */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-[#0c1e38]/70 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-900 dark:text-white">{selectedRegNo}</span>
              <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                {trail.length} GPS Points Recorded
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowLayerMenu((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs text-xs font-medium cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Base Map</span>
              </button>

              {showLayerMenu && (
                <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2 space-y-1 text-xs">
                  {gisLayers.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => {
                        setActiveLayerId(l.id);
                        setShowLayerMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                        activeLayerId === l.id
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

          {/* Interactive Map */}
          <div className="flex-1 relative">
            <RajdharaaMap
              vehicles={playbackVehicle ? [playbackVehicle] : []}
              geofences={[]}
              checkposts={[]}
              gisLayers={gisLayers}
              activeLayerId={activeLayerId}
              selectedVehicle={playbackVehicle}
              onSelectVehicle={() => {}}
              showTrail={true}
              trailPoints={polylineCoords}
              showGeofences={true}
              showCheckposts={false}
              showDistricts={true}
              initialZoom={13}
              initialCenter={[27.0425, 74.7214]}
            />
          </div>

          {/* Timeline & Playback Bar */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a192f] space-y-3">
            {/* Timeline slider */}
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={Math.max(0, trail.length - 1)}
                value={currentIndex}
                onChange={handleSeek}
                className="w-full accent-cyan-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                <span>{trail[0]?.timestamp ? new Date(trail[0].timestamp).toLocaleTimeString() : 'Start'}</span>
                <span>{currentPoint?.timestamp ? new Date(currentPoint.timestamp).toLocaleTimeString() : '--:--'}</span>
                <span>{trail[trail.length - 1]?.timestamp ? new Date(trail[trail.length - 1].timestamp).toLocaleTimeString() : 'End'}</span>
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between">
              {/* Left Play/Pause & Reset */}
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white transition shadow-sm cursor-pointer"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentIndex(0);
                  }}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Reset to start"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Current Speed & Telemetry Readout */}
              {currentPoint && (
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 mr-1.5 text-[11px]">Speed:</span>
                    <strong className="text-slate-900 dark:text-slate-100 font-mono">
                      {currentPoint.speed.toFixed(1)} km/h
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 mr-1.5 text-[11px]">Ignition:</span>
                    <strong
                      className={`font-semibold ${
                        currentPoint.ignition ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {currentPoint.ignition ? 'ON' : 'OFF'}
                    </strong>
                  </div>
                </div>
              )}

              {/* Speed Multipliers */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {[1, 2, 5, 10].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      playbackSpeed === spd
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
      )}
    </div>
  );
};

export default RoutePlaybackView;
