import React from 'react';
import type { Vehicle } from '@/shared/types/vts.types';
import {
  X,
  Gauge,
  Compass,
  Zap,
  BatteryCharging,
  Satellite,
  User,
  Phone,
  FileText,
  MapPin,
  AlertTriangle,
  PlayCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router';

interface VehicleTelemetryDrawerProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  onTriggerEvent?: (regNo: string, eventType: string) => void;
}

export const VehicleTelemetryDrawer: React.FC<VehicleTelemetryDrawerProps> = ({
  vehicle,
  onClose,
  onTriggerEvent,
}) => {
  const navigate = useNavigate();

  if (!vehicle) return null;

  const isSOS = vehicle.status === 'SOS' || vehicle.last_emergency;
  const isOverSpeed = vehicle.status === 'OVERSPEED';

  return (
    <div className="absolute top-4 right-4 z-[1000] w-96 max-w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-6rem)] animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className={`p-4 border-b ${isSOS ? 'bg-rose-950/80 border-rose-700' : 'bg-slate-900/80 border-slate-800'} flex items-start justify-between`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-extrabold text-white tracking-wide">
              {vehicle.reg_no}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                isSOS
                  ? 'bg-rose-500 text-white animate-pulse'
                  : isOverSpeed
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {isSOS ? 'SOS PANIC ACTIVE' : vehicle.status}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{vehicle.vehicle_type} • {vehicle.mineral_type}</div>
          <div className="text-[10px] font-mono text-slate-500">IMEI: {vehicle.imei}</div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Speed & Heading Gauge Card */}
        <div className="grid grid-cols-3 gap-2.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-semibold text-slate-400">
              <Gauge className="w-3.5 h-3.5 text-amber-400" /> Speed
            </div>
            <div className="text-xl font-mono font-bold text-white">
              {Math.round(vehicle.last_speed)}{' '}
              <span className="text-[10px] font-normal text-slate-400">km/h</span>
            </div>
          </div>

          <div className="space-y-1 border-x border-slate-800">
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-semibold text-slate-400">
              <Compass className="w-3.5 h-3.5 text-cyan-400" /> Heading
            </div>
            <div className="text-xl font-mono font-bold text-white">
              {Math.round(vehicle.last_heading)}°
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-semibold text-slate-400">
              <Satellite className="w-3.5 h-3.5 text-emerald-400" /> Satellites
            </div>
            <div className="text-xl font-mono font-bold text-emerald-400">
              {vehicle.last_satellites} <span className="text-[10px] text-slate-400">Fix</span>
            </div>
          </div>
        </div>

        {/* Telemetry Hardware Sensors */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2 text-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            AIS-140 Device Diagnostics
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-300">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Ignition
              </span>
              <span
                className={`font-semibold ${
                  vehicle.last_ignition ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {vehicle.last_ignition ? 'ON' : 'OFF'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-400">
                <BatteryCharging className="w-3.5 h-3.5 text-cyan-400" /> Battery
              </span>
              <span className="font-mono text-white font-semibold">
                {vehicle.last_internal_batt.toFixed(2)} V
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Coordinates:</span>
            <span className="font-mono text-slate-200">
              {vehicle.last_latitude.toFixed(5)}° N, {vehicle.last_longitude.toFixed(5)}° E
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Altitude:</span>
            <span className="font-mono text-slate-200">{Math.round(vehicle.last_altitude)} m</span>
          </div>
        </div>

        {/* Current Geofence & Checkpost */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" /> Spatial Boundary & Geofence
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium">
            {vehicle.active_geofence || 'Active Rajasthan Transit Corridor'}
          </div>
        </div>

        {/* e-Ravanna Transit Pass Info */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" /> e-Ravanna Transit Pass
            </span>
            <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 font-bold">
              VERIFIED
            </span>
          </div>

          <div className="space-y-1 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Pass No:</span>
              <span className="font-mono text-amber-300 font-bold">
                {vehicle.active_e_ravanna || 'ERAV-2026-MKR-0081'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payload Mineral:</span>
              <span className="text-white">{vehicle.mineral_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Max Permissible:</span>
              <span className="font-mono text-emerald-400 font-bold">{vehicle.capacity_tonnes} Tonnes</span>
            </div>
          </div>
        </div>

        {/* Driver Details */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2 text-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" /> Driver Credentials
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">{vehicle.driver_name}</div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-cyan-400" /> {vehicle.driver_phone}
              </div>
            </div>
            <a
              href={`tel:${vehicle.driver_phone}`}
              className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-medium transition flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => navigate(`/playback?reg_no=${vehicle.reg_no}`)}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 border border-slate-700 shadow-md"
          >
            <PlayCircle className="w-4 h-4 text-cyan-400" /> View Historic Route Playback
          </button>

          {onTriggerEvent && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onTriggerEvent(vehicle.reg_no, 'SOS')}
                className="py-2 px-3 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Trigger SOS
              </button>
              <button
                onClick={() => onTriggerEvent(vehicle.reg_no, 'OVERSPEED')}
                className="py-2 px-3 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Gauge className="w-3.5 h-3.5" /> Trigger Overspeed
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
