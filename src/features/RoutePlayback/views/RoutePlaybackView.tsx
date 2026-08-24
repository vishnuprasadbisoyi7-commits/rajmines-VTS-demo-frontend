import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router';
import type { TelemetryPoint, Vehicle, GISLayerConfig } from '@/shared/types/vts.types';
import { vtsApi } from '@/shared/services/vtsApi';
import { RajdharaaMap } from '@/shared/components/RajdharaaMap';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Clock,
  Navigation,
  Calendar,
  Layers,
} from 'lucide-react';

export const RoutePlaybackView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedRegNo, setSelectedRegNo] = useState<string>(
    searchParams.get('reg_no') || 'RJ14-GB-9821'
  );
  const [trail, setTrail] = useState<TelemetryPoint[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 5x, 10x
  const [gisLayers, setGisLayers] = useState<GISLayerConfig[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string>('rajdharaa-satellite-hybrid');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load vehicle list & GIS metadata
  useEffect(() => {
    async function loadInitialData() {
      const [list, meta] = await Promise.all([
        vtsApi.getVehicles(),
        vtsApi.getGISMetadata(),
      ]);
      setVehicles(list);
      setGisLayers(meta.layers);
      if (!selectedRegNo && list.length > 0) {
        setSelectedRegNo(list[0].reg_no);
      }
    }
    loadInitialData();
  }, []);

  // Fetch trail when vehicle changes
  useEffect(() => {
    async function loadTrail() {
      if (!selectedRegNo) return;
      setIsPlaying(false);
      setCurrentIndex(0);
      const points = await vtsApi.getVehicleTrail(selectedRegNo);
      setTrail(points);
    }
    loadTrail();
  }, [selectedRegNo]);

  // Playback timer loop
  useEffect(() => {
    if (isPlaying) {
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

  // Virtual vehicle representation at playback index
  const playbackVehicle: Vehicle | null = currentPoint && currentVehicleObj
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
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  // Calculate trip metrics
  const maxSpeed = trail.reduce((max, p) => (p.speed > max ? p.speed : max), 0);
  const avgSpeed =
    trail.length > 0
      ? Math.round(trail.reduce((sum, p) => sum + p.speed, 0) / trail.length)
      : 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] p-4 space-y-3">
      {/* Top Controls & Metrics Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Vehicle Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-amber-600" />
              <span className="text-xs font-bold uppercase text-slate-500">Select Vehicle:</span>
            </div>
            <select
              value={selectedRegNo}
              onChange={(e) => setSelectedRegNo(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
            >
              {vehicles.map((v) => (
                <option key={v.reg_no} value={v.reg_no}>
                  {v.reg_no} ({v.mineral_type})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-cyan-600" />
              <span>Today's Mining Transit Trail</span>
            </div>
          </div>

          {/* Trip Summary KPIs */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-500">Points: </span>
              <span className="font-bold text-slate-900">{trail.length} GPS Logs</span>
            </div>
            <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-500">Max Speed: </span>
              <span className="font-bold text-amber-700">{Math.round(maxSpeed)} km/h</span>
            </div>
            <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-500">Avg Speed: </span>
              <span className="font-bold text-emerald-700">{avgSpeed} km/h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map & Scrubber Section */}
      <div className="flex-1 relative rounded-xl overflow-hidden border border-slate-200 shadow-sm flex flex-col">
        {/* Playback Leaflet Map */}
        <div className="flex-1 relative w-full h-full">
          {/* Layer Selector in Playback */}
          <div className="absolute top-4 left-4 z-[900] flex items-center gap-1.5 px-2.5 py-1.5 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-lg text-xs">
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
            showDistricts={true}
            showDivisionLabels={true}
          />

          {/* Current Scrubber Point Floating Badge */}
          {currentPoint && (
            <div className="absolute bottom-20 right-4 z-[900] bg-white/95 backdrop-blur p-3 rounded-xl border border-slate-200 shadow-lg space-y-1.5 text-xs font-mono text-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-600" /> GPS Timestamp
              </div>
              <div className="text-slate-900 font-bold">
                {new Date(currentPoint.timestamp).toLocaleTimeString()}
              </div>
              <div className="flex justify-between gap-4 text-slate-600">
                <span>Speed: <strong className="text-emerald-700 font-bold">{Math.round(currentPoint.speed)} km/h</strong></span>
                <span>Heading: <strong className="text-cyan-700 font-bold">{Math.round(currentPoint.heading)}°</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Interactive Playback Scrubber Bar */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-3">
          {/* Progress Timeline Slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500 w-12 text-right">
              {currentIndex + 1}/{Math.max(1, trail.length)}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0, trail.length - 1)}
              value={currentIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentIndex(parseInt(e.target.value, 10));
              }}
              className="flex-1 accent-amber-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-mono text-amber-700 font-bold w-16">
              {trail.length > 0 ? `${Math.round(((currentIndex + 1) / trail.length) * 100)}%` : '0%'}
            </span>
          </div>

          {/* Controls: Play/Pause, Reset, Speed multipliers */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                disabled={trail.length === 0}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-xs"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                {isPlaying ? 'Pause Replay' : 'Start Playback'}
              </button>

              <button
                onClick={handleReset}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition border border-slate-200"
                title="Reset to beginning"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Speed Multipliers */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 uppercase font-semibold mr-1 flex items-center gap-1">
                <FastForward className="w-3.5 h-3.5" /> Replay Speed:
              </span>
              {[1, 2, 5, 10].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition ${
                    playbackSpeed === spd
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
  );
};

export default RoutePlaybackView;
