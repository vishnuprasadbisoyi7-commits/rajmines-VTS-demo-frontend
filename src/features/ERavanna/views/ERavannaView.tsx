import React, { useEffect, useState } from 'react';
import type { ERavannaPass } from '@/shared/types/vts.types';
import { vtsApi } from '@/shared/services/vtsApi';
import {
  FileText,
  Download,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router';

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
    <div className="flex flex-col h-[calc(100vh-4.5rem)] p-4 space-y-3 bg-slate-50">
      {/* Breadcrumb / Top Title */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-wide">
              Trip Reports
            </h1>
            <p className="text-xs text-slate-500">
              Department of Mines & Geology Rajasthan • e-Ravanna Mineral Transit Log
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPasses}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800">
            Total {filteredPasses.length} Trips Logged
          </span>
        </div>
      </div>

      {/* Filter Row Form matching Screenshot 2 */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <h2 className="text-xs font-bold text-slate-800 mb-3 tracking-wide">Trip Report Filter</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          {/* Vehicle No */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Vehicle No
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search Vehicle No"
                value={vehicleNoSearch}
                onChange={(e) => setVehicleNoSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Erawana No */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Erawana No
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search Erawana No"
                value={erawanaNoSearch}
                onChange={(e) => setErawanaNoSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="COMPLETED">Completed</option>
              <option value="ROUTE_DEVIATED">Route Deviated</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Start Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              End Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Export Button */}
          <div>
            <button
              onClick={handleExportCSV}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Container matching Screenshot 2 */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            {/* Table Header */}
            <thead className="bg-slate-50/80 sticky top-0 z-10 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap w-12">#</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Erawana No</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Vehicle No</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Lease No</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Generation Time</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Trip Start</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Trip End</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Deviation</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Trip Status</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-center">Action</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {filteredPasses.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="p-16 text-center text-slate-400 text-xs font-medium"
                  >
                    No trips found for this date range.
                  </td>
                </tr>
              ) : (
                filteredPasses.map((pass, idx) => {
                  const isCompleted = pass.status === 'COMPLETED';
                  const isDeviated = pass.status === 'ROUTE_DEVIATED';

                  return (
                    <tr
                      key={pass.pass_no || idx}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* # */}
                      <td className="px-4 py-3 text-slate-400 font-mono font-semibold">
                        {idx + 1}
                      </td>

                      {/* Erawana No */}
                      <td className="px-4 py-3 font-mono font-bold text-amber-800 whitespace-nowrap">
                        {pass.pass_no}
                      </td>

                      {/* Vehicle No */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {pass.vehicle_reg_no}
                      </td>

                      {/* Lease No */}
                      <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                        {pass.lease_id}
                      </td>

                      {/* Generation Time */}
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-mono">
                        {pass.generation_time || new Date(pass.dispatch_time).toLocaleString()}
                      </td>

                      {/* Trip Start */}
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-mono">
                        {pass.trip_start || new Date(pass.dispatch_time).toLocaleTimeString()}
                      </td>

                      {/* Trip End */}
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-mono">
                        {pass.trip_end || (isCompleted ? new Date(pass.valid_upto).toLocaleTimeString() : 'In Progress')}
                      </td>

                      {/* Deviation */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isDeviated
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {pass.deviation || (isDeviated ? 'Route Breach' : 'No Deviation')}
                        </span>
                      </td>

                      {/* Trip Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            pass.status === 'IN_TRANSIT'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : pass.status === 'COMPLETED'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : pass.status === 'ROUTE_DEVIATED'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {pass.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <button
                          onClick={() => navigate(`/playback?reg_no=${pass.vehicle_reg_no}`)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition"
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

        {/* Footer info */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 font-medium">
          <div>
            Showing 1 to {filteredPasses.length} of {passes.length} trip entries
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            DMG e-Ravanna Verification Online
          </div>
        </div>
      </div>
    </div>
  );
};

export default ERavannaView;
