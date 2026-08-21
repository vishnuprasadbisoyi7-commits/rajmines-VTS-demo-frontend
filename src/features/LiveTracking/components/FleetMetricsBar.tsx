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
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Fleet</div>
          <div className="text-xl font-bold text-white">{stats.total_vehicles}</div>
        </div>
      </div>

      {/* 2. In Transit / Moving */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Moving</div>
          <div className="text-xl font-bold text-emerald-400">{stats.moving}</div>
        </div>
      </div>

      {/* 3. Idle / Stopped */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertOctagon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Idle / Stop</div>
          <div className="text-xl font-bold text-amber-300">{stats.idle + stats.stopped}</div>
        </div>
      </div>

      {/* 4. SOS Emergency */}
      <div className={`bg-slate-900/80 backdrop-blur border rounded-xl p-3.5 flex items-center gap-3 ${
        stats.emergency_sos > 0 ? 'border-rose-500/50 bg-rose-950/20 animate-pulse' : 'border-slate-800'
      }`}>
        <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">SOS Panic</div>
          <div className="text-xl font-bold text-rose-400">{stats.emergency_sos}</div>
        </div>
      </div>

      {/* 5. e-Ravanna Passes */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">e-Ravanna</div>
          <div className="text-xl font-bold text-indigo-300">{stats.active_e_ravanna}</div>
        </div>
      </div>

      {/* 6. Today's Mineral Tonnage & Live Link */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Weight className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Tonnage Today</div>
            <div className="text-xl font-bold text-cyan-300">{stats.total_tonnage_today} T</div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            wsConnected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`}></span>
            {wsConnected ? 'LIVE AIS-140' : 'OFFLINE'}
          </span>
        </div>
      </div>
    </div>
  );
};
