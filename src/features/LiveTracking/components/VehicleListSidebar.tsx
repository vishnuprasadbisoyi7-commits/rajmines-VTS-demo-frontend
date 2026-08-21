import React, { useState, useMemo } from 'react';
import type { Vehicle } from '@/shared/types/vts.types';
import { Search, Compass, BatteryCharging, Zap } from 'lucide-react';

interface VehicleListSidebarProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  onSelectVehicle: (v: Vehicle) => void;
}

export const VehicleListSidebar: React.FC<VehicleListSidebarProps> = ({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [mineralFilter, setMineralFilter] = useState<string>('ALL');

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch =
        v.reg_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.imei.includes(searchTerm);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'SOS' && (v.status === 'SOS' || v.last_emergency)) ||
        v.status === statusFilter;

      const matchesMineral =
        mineralFilter === 'ALL' || v.mineral_type === mineralFilter;

      return matchesSearch && matchesStatus && matchesMineral;
    });
  }, [vehicles, searchTerm, statusFilter, mineralFilter]);

  const minerals = useMemo(() => {
    const set = new Set(vehicles.map((v) => v.mineral_type).filter(Boolean));
    return Array.from(set);
  }, [vehicles]);

  return (
    <div className="flex flex-col h-full bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header & Search */}
      <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-wide uppercase text-amber-400 flex items-center gap-2">
            <Compass className="w-4 h-4" /> Mining Fleet ({filteredVehicles.length})
          </h2>
          <span className="text-[11px] font-mono text-slate-400">AIS-140 GPS</span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search vehicle no, driver, IMEI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        {/* Status Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px]">
          {['ALL', 'MOVING', 'IDLE', 'STOPPED', 'SOS'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 rounded-md font-semibold transition whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Mineral Filter */}
        {minerals.length > 0 && (
          <select
            value={mineralFilter}
            onChange={(e) => setMineralFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Minerals (Sand, Marble, Limestone...)</option>
            {minerals.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Vehicle List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 p-2 space-y-1.5">
        {filteredVehicles.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No active vehicles matching filter criteria.
          </div>
        ) : (
          filteredVehicles.map((vehicle) => {
            const isSelected = selectedVehicle?.reg_no === vehicle.reg_no;
            const isSOS = vehicle.status === 'SOS' || vehicle.last_emergency;
            const isMoving = vehicle.status === 'MOVING';

            return (
              <div
                key={vehicle.reg_no}
                onClick={() => onSelectVehicle(vehicle)}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                    : isSOS
                    ? 'bg-rose-950/30 border-rose-600/50 hover:bg-rose-900/20'
                    : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-800/50 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isSOS
                          ? 'bg-rose-500 animate-ping'
                          : isMoving
                          ? 'bg-emerald-400'
                          : vehicle.status === 'IDLE'
                          ? 'bg-amber-400'
                          : 'bg-slate-500'
                      }`}
                    />
                    <span className="font-mono font-bold text-sm text-white tracking-tight">
                      {vehicle.reg_no}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      isSOS
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : isMoving
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : vehicle.status === 'IDLE'
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isSOS ? 'SOS ALERT' : vehicle.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400 mb-2">
                  <div>
                    Mineral:{' '}
                    <span className="text-slate-200 font-medium">{vehicle.mineral_type}</span>
                  </div>
                  <div className="text-right font-mono text-emerald-400 font-bold">
                    {Math.round(vehicle.last_speed)} km/h
                  </div>
                  <div>
                    Driver: <span className="text-slate-300">{vehicle.driver_name}</span>
                  </div>
                  <div className="text-right">
                    Cap: <span className="text-slate-300">{vehicle.capacity_tonnes}T</span>
                  </div>
                </div>

                {/* Telemetry Snapshot Row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 font-mono">
                  <div className="flex items-center gap-1">
                    <Zap className={`w-3 h-3 ${vehicle.last_ignition ? 'text-amber-400' : 'text-slate-600'}`} />
                    <span>{vehicle.last_ignition ? 'IGN ON' : 'IGN OFF'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BatteryCharging className="w-3 h-3 text-cyan-400" />
                    <span>{vehicle.last_internal_batt.toFixed(2)}V</span>
                  </div>
                  <div>Sat: {vehicle.last_satellites}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
