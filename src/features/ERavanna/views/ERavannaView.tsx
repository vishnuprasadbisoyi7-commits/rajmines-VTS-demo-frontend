import React, { useEffect, useState } from 'react';
import type { ERavannaPass } from '@/shared/types/vts.types';
import { vtsApi } from '@/shared/services/vtsApi';
import {
  FileText,
  Search,
  Clock,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router';

export const ERavannaView: React.FC = () => {
  const [passes, setPasses] = useState<ERavannaPass[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      const list = await vtsApi.getERavannaPasses();
      setPasses(list);
    }
    loadData();
  }, []);

  const filteredPasses = passes.filter((p) => {
    const matchesSearch =
      p.pass_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.vehicle_reg_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.lease_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mineral_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] p-4 space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
              Rajasthan DMG e-Ravanna (Electronic Transit Pass) Surveillance
            </h1>
            <p className="text-xs text-slate-400">
              Mandatory Mineral Transit Pass Verification • Department of Mines & Geology, Rajasthan
            </p>
          </div>
        </div>

        {/* Action Counters */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
            {passes.filter((p) => p.status === 'IN_TRANSIT').length} In-Transit
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono font-bold">
            Total {passes.length} Issued
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search e-Ravanna pass no, truck plate, lease name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex gap-1.5 text-xs">
          {['ALL', 'IN_TRANSIT', 'COMPLETED', 'ROUTE_DEVIATED', 'EXPIRED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* e-Ravanna Table Cards */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {filteredPasses.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
            No e-Ravanna passes found matching filter.
          </div>
        ) : (
          filteredPasses.map((pass) => {
            const isOverloaded = pass.net_weight_tonnes > pass.permissible_max_tonnes;

            return (
              <div
                key={pass.pass_no}
                className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-4 shadow-lg hover:border-slate-700 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-amber-400 px-2.5 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      {pass.pass_no}
                    </span>
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        {pass.vehicle_reg_no}
                        <button
                          onClick={() => navigate(`/live-tracking`)}
                          className="text-[11px] text-cyan-400 hover:underline flex items-center gap-0.5 font-normal"
                        >
                          Track on Map <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-xs text-slate-400">{pass.mineral_name}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full uppercase flex items-center gap-1.5 ${
                        pass.status === 'IN_TRANSIT'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : pass.status === 'ROUTE_DEVIATED'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                      {pass.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Origin & Destination */}
                  <div className="space-y-1 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <div className="text-slate-500 font-semibold uppercase text-[10px]">
                      Origin Mine Lease:
                    </div>
                    <div className="font-semibold text-slate-200">{pass.lease_name}</div>
                    <div className="text-slate-500 font-semibold uppercase text-[10px] pt-1">
                      Destination Mandi / Plant:
                    </div>
                    <div className="text-white font-medium">{pass.destination}</div>
                  </div>

                  {/* Weight Breakdown */}
                  <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Tare Weight:</span>
                      <span className="font-mono text-slate-300">{pass.tare_weight_tonnes} T</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Gross Weight:</span>
                      <span className="font-mono text-slate-300">{pass.gross_weight_tonnes} T</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-800 font-bold">
                      <span className="text-white">Net Mineral Tonnage:</span>
                      <span
                        className={`font-mono ${
                          isOverloaded ? 'text-rose-400 font-black' : 'text-emerald-400'
                        }`}
                      >
                        {pass.net_weight_tonnes} T / Max {pass.permissible_max_tonnes} T
                      </span>
                    </div>
                  </div>

                  {/* Validity & Security Checks */}
                  <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="text-slate-500 font-semibold uppercase text-[10px]">
                        Validity Period:
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px] mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Until {new Date(pass.valid_upto).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">DMG Security Barcode:</span>
                      <span className="text-emerald-400 font-mono flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> SECURE HASH
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ERavannaView;
