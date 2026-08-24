import React from 'react';
import type { FleetStats } from '@/shared/types/vts.types';
import { Truck, Activity, AlertOctagon, ShieldAlert, FileText, Weight } from 'lucide-react';

interface FleetMetricsBarProps {
  stats: FleetStats;
  wsConnected: boolean;
}

export const FleetMetricsBar: React.FC<FleetMetricsBarProps> = ({ stats, wsConnected }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {/* 1. Total Fleet */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-3.5 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Fleet</div>
          <div className="text-xl font-bold text-slate-900">{stats.total_vehicles}</div>
        </div>
      </div>

      {/* 2. In Transit / Moving */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-3.5 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Moving</div>
          <div className="text-xl font-bold text-emerald-600">{stats.moving}</div>
        </div>
      </div>

      {/* 3. Idle / Stopped */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-3.5 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
          <AlertOctagon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Idle / Stop</div>
          <div className="text-xl font-bold text-amber-600">{stats.idle + stats.stopped}</div>
        </div>
      </div>

      {/* 4. SOS Emergency */}
      <div className={`bg-white border shadow-sm rounded-xl p-3.5 flex items-center gap-3 ${
        stats.emergency_sos > 0 ? 'border-rose-300 bg-rose-50/60 animate-pulse' : 'border-slate-200'
      }`}>
        <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">SOS Panic</div>
          <div className="text-xl font-bold text-rose-600">{stats.emergency_sos}</div>
        </div>
      </div>

      {/* 5. e-Ravanna Passes */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-3.5 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">e-Ravanna</div>
          <div className="text-xl font-bold text-indigo-600">{stats.active_e_ravanna}</div>
        </div>
      </div>

      {/* 6. Today's Mineral Tonnage & Live Link */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200">
            <Weight className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tonnage Today</div>
            <div className="text-xl font-bold text-cyan-800">{stats.total_tonnage_today} T</div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full ${
            wsConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`}></span>
            {wsConnected ? 'LIVE TELEMETRY' : 'OFFLINE'}
          </span>
        </div>
      </div>
    </div>
  );
};
