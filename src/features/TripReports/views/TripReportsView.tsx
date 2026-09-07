import React, { useEffect, useState, useMemo } from 'react';
import type { TripReportRecord } from '@/shared/types/vts.types';
import { vtsApi } from '@/shared/services/vtsApi';
import { TripRouteMapModal } from '../components/TripRouteMapModal';
import {
  Download,
  Calendar,
  ChevronDown,
  Map as MapIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

export const TripReportsView: React.FC = () => {
  const [trips, setTrips] = useState<TripReportRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters matching Image 1 & 2
  const [vehicleNoFilter, setVehicleNoFilter] = useState<string>('');
  const [erawanaNoFilter, setErawanaNoFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All Status');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  // Pagination & Route Modal
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;
  const [selectedRouteTrip, setSelectedRouteTrip] = useState<TripReportRecord | null>(null);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState<boolean>(false);

  // Fetch trips from backend
  const loadTripReports = async () => {
    setLoading(true);
    try {
      const data = await vtsApi.getTripReports({
        vehicle_no: vehicleNoFilter,
        erawana_no: erawanaNoFilter,
        status: statusFilter,
        start_date: startDateFilter,
        end_date: endDateFilter,
      });
      setTrips(data);
    } catch (err) {
      console.error('Failed to load trip reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTripReports();
  }, []);

  // Filter trips in memory for responsive searching
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      // Vehicle search
      if (
        vehicleNoFilter.trim() &&
        !trip.vehicle_no.toLowerCase().includes(vehicleNoFilter.trim().toLowerCase())
      ) {
        return false;
      }
      // Erawana search
      if (
        erawanaNoFilter.trim() &&
        !trip.erawana_no.toLowerCase().includes(erawanaNoFilter.trim().toLowerCase())
      ) {
        return false;
      }
      // Status filter
      if (
        statusFilter !== 'All Status' &&
        statusFilter !== 'ALL' &&
        trip.trip_status !== statusFilter
      ) {
        return false;
      }
      // Start date filter
      if (startDateFilter) {
        const tripDate = new Date(trip.generation_time);
        const sDate = new Date(startDateFilter);
        if (!isNaN(sDate.getTime()) && !isNaN(tripDate.getTime())) {
          sDate.setHours(0, 0, 0, 0);
          if (tripDate < sDate) return false;
        }
      }
      // End date filter
      if (endDateFilter) {
        const tripDate = new Date(trip.generation_time);
        const eDate = new Date(endDateFilter);
        if (!isNaN(eDate.getTime()) && !isNaN(tripDate.getTime())) {
          eDate.setHours(23, 59, 59, 999);
          if (tripDate > eDate) return false;
        }
      }
      return true;
    });
  }, [trips, vehicleNoFilter, erawanaNoFilter, statusFilter, startDateFilter, endDateFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / pageSize));
  const paginatedTrips = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTrips.slice(start, start + pageSize);
  }, [filteredTrips, currentPage, pageSize]);

  // Export to CSV
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

    const rows = filteredTrips.map((t, idx) => [
      idx + 1,
      t.erawana_no,
      t.vehicle_no,
      t.lease_no,
      t.generation_time,
      t.trip_start,
      t.trip_end,
      t.deviation,
      t.trip_status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');

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

  const openRouteModal = (trip: TripReportRecord) => {
    setSelectedRouteTrip(trip);
    setIsRouteModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Page Title & Filter Bar Container matching Image 1 & 2 */}
      <div className="bg-white dark:bg-[#0a192f] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-2xs">
        {/* Title */}
        <h1 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
          Trip Report
        </h1>

        {/* Filter Controls Row matching Image 1 & 2 */}
        <div className="flex flex-wrap items-end gap-3.5">
          {/* 1. Vehicle No */}
          <div className="flex-1 min-w-[150px] max-w-[210px] space-y-1.5">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Vehicle No
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search Vehicle No"
                value={vehicleNoFilter}
                onChange={(e) => {
                  setVehicleNoFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-xl px-3.5 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-cyan-600 transition shadow-2xs font-mono font-medium"
              />
              {vehicleNoFilter && (
                <button
                  onClick={() => setVehicleNoFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Erawana No */}
          <div className="flex-1 min-w-[150px] max-w-[210px] space-y-1.5">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Erawana No
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search Erawana No"
                value={erawanaNoFilter}
                onChange={(e) => {
                  setErawanaNoFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-xl px-3.5 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-cyan-600 transition shadow-2xs font-mono font-medium"
              />
              {erawanaNoFilter && (
                <button
                  onClick={() => setErawanaNoFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* 3. Status Dropdown */}
          <div className="flex-1 min-w-[140px] max-w-[190px] space-y-1.5">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Status
            </label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl pl-3.5 pr-8 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-cyan-600 transition shadow-2xs cursor-pointer font-medium"
              >
                <option value="All Status">All Status</option>
                <option value="Trip_yet_to_start">Trip_yet_to_start</option>
                <option value="In_Transit">In_Transit</option>
                <option value="Completed">Completed</option>
                <option value="Route_Deviated">Route_Deviated</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 4. Start Date */}
          <div className="flex-1 min-w-[140px] max-w-[180px] space-y-1.5">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Start Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => {
                  setStartDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl pl-8 pr-2.5 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-cyan-600 transition shadow-2xs font-sans"
              />
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 5. End Date */}
          <div className="flex-1 min-w-[140px] max-w-[180px] space-y-1.5">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              End Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => {
                  setEndDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl pl-8 pr-2.5 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-cyan-600 transition shadow-2xs font-sans"
              />
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 6. Export Button */}
          <div className="pb-0.5">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl transition shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Viewport matching Image 1 & 2 */}
      <div className="bg-white dark:bg-[#0a192f] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0a192f] text-[12.5px] font-semibold text-slate-600 dark:text-slate-300">
                <th className="py-3.5 px-4 whitespace-nowrap w-12 text-center">#</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Erawana No</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Vehicle No</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Lease No</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Generation Time</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center">Trip Start</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center">Trip End</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center">Deviation</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center">Trip Status</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-slate-400">
                    Loading trip reports...
                  </td>
                </tr>
              ) : filteredTrips.length === 0 ? (
                /* Empty State matching Image 1 */
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-20 text-slate-500 dark:text-slate-400 text-sm font-medium"
                  >
                    No trips found for this date range.
                  </td>
                </tr>
              ) : (
                /* Trip rows matching Image 2 */
                paginatedTrips.map((trip, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr
                      key={trip.id || trip.erawana_no}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* # */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400 font-medium">
                        {globalIdx}
                      </td>

                      {/* Erawana No - Cyan Link Text */}
                      <td className="py-3.5 px-4 font-mono font-medium whitespace-nowrap">
                        <button
                          onClick={() => openRouteModal(trip)}
                          className="text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 hover:underline cursor-pointer"
                        >
                          {trip.erawana_no}
                        </button>
                      </td>

                      {/* Vehicle No - Bold text */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {trip.vehicle_no}
                      </td>

                      {/* Lease No */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {trip.lease_no}
                      </td>

                      {/* Generation Time */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {trip.generation_time}
                      </td>

                      {/* Trip Start */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {trip.trip_start}
                      </td>

                      {/* Trip End */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {trip.trip_end}
                      </td>

                      {/* Deviation */}
                      <td className="py-3.5 px-4 text-center font-sans whitespace-nowrap">
                        {trip.deviation === 'Yes' ? (
                          <span className="font-semibold text-rose-600 dark:text-rose-400">Yes</span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400 font-medium">No</span>
                        )}
                      </td>

                      {/* Trip Status - Pill badge matching Image 2 */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {trip.trip_status === 'Trip_yet_to_start' ? (
                          <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-semibold bg-[#ffe4e6] dark:bg-rose-950/60 text-[#e11d48] dark:text-rose-300 border border-rose-200 dark:border-rose-800/80">
                            Trip_yet_to_start
                          </span>
                        ) : trip.trip_status === 'In_Transit' ? (
                          <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            In_Transit
                          </span>
                        ) : trip.trip_status === 'Completed' ? (
                          <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Route_Deviated
                          </span>
                        )}
                      </td>

                      {/* Action - Route Button matching Image 2 */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => openRouteModal(trip)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg transition shadow-2xs cursor-pointer"
                        >
                          <MapIcon className="w-3.5 h-3.5 text-slate-500" />
                          <span>Route</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination matching Image 2 */}
        {filteredTrips.length > 0 && (
          <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-[#0a192f] px-5">
            <div>
              Total: {filteredTrips.length} trips
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Route Map Modal Dialog matching Image 3 */}
      <TripRouteMapModal
        isOpen={isRouteModalOpen}
        trip={selectedRouteTrip}
        onClose={() => setIsRouteModalOpen(false)}
      />
    </div>
  );
};

export default TripReportsView;
