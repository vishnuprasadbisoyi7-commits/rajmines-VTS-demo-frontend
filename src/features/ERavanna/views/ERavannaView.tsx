import React, { useEffect, useState } from 'react';
import type { ERavannaPass } from '@/shared/types/vts.types';
import { vtsApi } from '@/shared/services/vtsApi';
import {
  Download,
  ExternalLink,
  RefreshCw,
  Search,
  ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/shared/constants/app.constants';

export const ERavannaView: React.FC = () => {
  const [passes, setPasses] = useState<ERavannaPass[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [vehicleNoSearch, setVehicleNoSearch] = useState<string>('');
  const [erawanaNoSearch, setErawanaNoSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const navigate = useNavigate();

  const loadPasses = async () => {
    setLoading(true);
    const list = await vtsApi.getERavannaPasses();
    setPasses(list);
    setLoading(false);
  };

  useEffect(() => {
    loadPasses();
  }, []);

  const filteredPasses = passes.filter((p) => {
    const matchesVehicle =
      !vehicleNoSearch ||
      p.vehicle_reg_no.toLowerCase().includes(vehicleNoSearch.toLowerCase());
    const matchesErawana =
      !erawanaNoSearch ||
      p.pass_no.toLowerCase().includes(erawanaNoSearch.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' || p.status === statusFilter;

    return matchesVehicle && matchesErawana && matchesStatus;
  });

  const handleExportCSV = () => {
    const headers = [
      '#',
      'Erawana No',
      'Vehicle No',
      'Lease No',
      'Generation Time',
      'Trip Start',
      'Trip End',
      'Deviation',
      'Trip Status',
    ];

    const rows = filteredPasses.map((p, idx) => [
      idx + 1,
      p.pass_no,
      p.vehicle_reg_no,
      p.lease_id,
      p.generation_time || new Date(p.dispatch_time).toLocaleString(),
      p.trip_start || new Date(p.dispatch_time).toLocaleTimeString(),
      p.trip_end || (p.status === 'COMPLETED' ? new Date(p.valid_upto).toLocaleTimeString() : 'In Progress'),
      p.deviation || 'No Deviation',
      p.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `rajmines_trip_report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-[#0a192f] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden flex flex-col min-h-[calc(100vh-6.5rem)]">
      {/* Top Filter Bar */}
      <div className="p-4 md:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0a192f]">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl pl-3.5 pr-8 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-cyan-600 transition shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="COMPLETED">Completed</option>
              <option value="ROUTE_DEVIATED">Route Deviated</option>
              <option value="EXPIRED">Expired</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Vehicle No Search */}
          <div className="relative w-44">
            <input
              type="text"
              placeholder="Search Vehicle No"
              value={vehicleNoSearch}
              onChange={(e) => setVehicleNoSearch(e.target.value)}
              className="w-full bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-xl pl-3 pr-7 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-cyan-600 transition shadow-2xs"
            />
            {vehicleNoSearch ? (
              <button
                onClick={() => setVehicleNoSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ×
              </button>
            ) : (
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>

          {/* Erawana No Search */}
          <div className="relative w-44">
            <input
              type="text"
              placeholder="Search Erawana No"
              value={erawanaNoSearch}
              onChange={(e) => setErawanaNoSearch(e.target.value)}
              className="w-full bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-xl pl-3 pr-7 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-cyan-600 transition shadow-2xs"
            />
            {erawanaNoSearch ? (
              <button
                onClick={() => setErawanaNoSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ×
              </button>
            ) : (
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-cyan-600 shadow-2xs"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-cyan-600 shadow-2xs"
            />
          </div>
        </div>

        {/* Right buttons: Refresh & Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadPasses}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0a192f] text-[13px] font-semibold text-slate-700 dark:text-slate-300">
              <th className="py-3.5 px-4 whitespace-nowrap w-12">#</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Erawana No</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Vehicle No</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Lease No</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Generation Time</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Trip Start</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Trip End</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Deviation</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Trip Status</th>
              <th className="py-3.5 px-4 whitespace-nowrap text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-slate-400">
                  Loading trip reports...
                </td>
              </tr>
            ) : filteredPasses.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-slate-400">
                  No trips found matching filter criteria.
                </td>
              </tr>
            ) : (
              filteredPasses.map((pass, idx) => {
                const isCompleted = pass.status === 'COMPLETED';
                const isDeviated = pass.status === 'ROUTE_DEVIATED';

                return (
                  <tr key={pass.pass_no || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3.5 px-4 text-slate-400 font-mono font-semibold">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-800 dark:text-amber-400 whitespace-nowrap">
                      {pass.pass_no}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {pass.vehicle_reg_no}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {pass.lease_id}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                      {pass.generation_time || new Date(pass.dispatch_time).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                      {pass.trip_start || new Date(pass.dispatch_time).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                      {pass.trip_end || (isCompleted ? new Date(pass.valid_upto).toLocaleTimeString() : 'In Progress')}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isDeviated
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {pass.deviation || (isDeviated ? 'Route Breach' : 'No Deviation')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                          pass.status === 'IN_TRANSIT'
                            ? 'bg-[#dcfce7] dark:bg-emerald-900/50 text-[#16a34a] dark:text-emerald-300'
                            : pass.status === 'COMPLETED'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            : pass.status === 'ROUTE_DEVIATED'
                            ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {pass.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => navigate(`${ROUTES.PLAYBACK}?reg_no=${pass.vehicle_reg_no}`)}
                        className="px-2.5 py-1 bg-cyan-50 dark:bg-cyan-900/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition"
                      >
                        <span>Replay</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0c1e38] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium px-4">
        <div>
          Showing {filteredPasses.length} of {passes.length} trip records
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          DMG e-Ravanna Portal Log
        </div>
      </div>
    </div>
  );
};

export default ERavannaView;
