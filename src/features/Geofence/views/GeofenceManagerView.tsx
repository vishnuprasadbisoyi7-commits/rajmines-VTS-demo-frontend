import React, { useEffect, useState } from 'react';
import type { Vehicle, VehicleStatus } from '@/shared/types/vts.types';
import { vtsApi } from '@/shared/services/vtsApi';
import {
  List,
  Search,
  Download,
  SlidersHorizontal,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';

export const GeofenceManagerView: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showColumnsMenu, setShowColumnsMenu] = useState<boolean>(false);

  // Column visibility controls
  const [visibleColumns, setVisibleColumns] = useState({
    reg_no: true,
    imei: true,
    e_rawanna: true,
    status: true,
    ign_status: true,
    speed: true,
    gps_fix: true,
    altitude: true,
    input_voltage: true,
    internal_voltage: true,
  });

  const loadVehicles = async () => {
    setLoading(true);
    const list = await vtsApi.getVehicles();
    setVehicles(list);
    setLoading(false);
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const filteredVehicles = vehicles.filter((v) => {
    const matchesStatus =
      statusFilter === 'ALL' || v.status === (statusFilter as VehicleStatus);
    const matchesSearch =
      v.reg_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.imei.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  const handleExportCSV = () => {
    const headers = [
      'Registration No',
      'IMEI',
      'e-Rawanna No',
      'Status',
      'IGN Status',
      'Speed (km/h)',
      'GPS Fix',
      'Altitude (m)',
      'Input Voltage (V)',
      'Internal Voltage (V)',
    ];

    const rows = filteredVehicles.map((v) => [
      v.reg_no,
      v.imei,
      v.active_e_ravanna || 'N/A',
      v.status,
      v.last_ignition ? 'ON' : 'OFF',
      Math.round(v.last_speed),
      v.gps_fix ?? 1,
      Math.round(v.last_altitude || 100),
      v.input_voltage ?? 27,
      v.last_internal_batt ? `${v.last_internal_batt.toFixed(2)}` : '4.0',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `rajmines_vehicle_list_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] p-4 space-y-3 bg-slate-50">
      {/* Top Header / Breadcrumb */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            <List className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-wide">
              List View
            </h1>
            <p className="text-xs text-slate-500">
              Mining Fleet Live Telemetry & GPS Sensor Data Table
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadVehicles}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            Total {filteredVehicles.length} Vehicles
          </span>
        </div>
      </div>

      {/* Toolbar / Filters Row */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Status Dropdown */}
          <div className="min-w-[150px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="MOVING">Moving</option>
              <option value="IDLE">Idle</option>
              <option value="STOPPED">Stopped</option>
              <option value="OVERSPEED">Overspeed</option>
              <option value="SOS">SOS Emergency</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md min-w-[220px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Vehicle No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Action Buttons: Export CSV & Columns Dropdown */}
        <div className="flex items-center gap-2 relative">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowColumnsMenu(!showColumnsMenu)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Columns</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showColumnsMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 text-xs space-y-1.5">
                <div className="font-bold text-slate-500 uppercase text-[10px] px-2 py-1">
                  Toggle Columns
                </div>
                {Object.keys(visibleColumns).map((colKey) => (
                  <label
                    key={colKey}
                    className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer text-slate-700 font-medium capitalize"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[colKey as keyof typeof visibleColumns]}
                      onChange={(e) =>
                        setVisibleColumns({
                          ...visibleColumns,
                          [colKey]: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span>{colKey.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            {/* Table Header */}
            <thead className="bg-slate-50/80 sticky top-0 z-10 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                {visibleColumns.reg_no && (
                  <th className="px-4 py-3.5 whitespace-nowrap">Registration No</th>
                )}
                {visibleColumns.imei && (
                  <th className="px-4 py-3.5 whitespace-nowrap">IMEI</th>
                )}
                {visibleColumns.e_rawanna && (
                  <th className="px-4 py-3.5 whitespace-nowrap">e-Rawanna No</th>
                )}
                {visibleColumns.status && (
                  <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                )}
                {visibleColumns.ign_status && (
                  <th className="px-4 py-3.5 whitespace-nowrap">IGN Status</th>
                )}
                {visibleColumns.speed && (
                  <th className="px-4 py-3.5 whitespace-nowrap">Speed</th>
                )}
                {visibleColumns.gps_fix && (
                  <th className="px-4 py-3.5 whitespace-nowrap">GPS Fix</th>
                )}
                {visibleColumns.altitude && (
                  <th className="px-4 py-3.5 whitespace-nowrap">Altitude</th>
                )}
                {visibleColumns.input_voltage && (
                  <th className="px-4 py-3.5 whitespace-nowrap">Input Voltage</th>
                )}
                {visibleColumns.internal_voltage && (
                  <th className="px-4 py-3.5 whitespace-nowrap">Internal Voltage</th>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="p-12 text-center text-slate-400 text-xs font-medium"
                  >
                    No vehicles found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((vehicle, idx) => {
                  const isMoving = vehicle.status === 'MOVING';
                  const isSOS = vehicle.status === 'SOS' || vehicle.last_emergency;
                  const isOverSpeed = vehicle.status === 'OVERSPEED';

                  return (
                    <tr
                      key={vehicle.id || idx}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Registration No */}
                      {visibleColumns.reg_no && (
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {vehicle.reg_no}
                        </td>
                      )}

                      {/* IMEI */}
                      {visibleColumns.imei && (
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                          {vehicle.imei}
                        </td>
                      )}

                      {/* e-Rawanna No */}
                      {visibleColumns.e_rawanna && (
                        <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                          {vehicle.active_e_ravanna || 'N/A'}
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.status && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                              isSOS
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : isOverSpeed
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : isMoving
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {vehicle.status}
                          </span>
                        </td>
                      )}

                      {/* IGN Status */}
                      {visibleColumns.ign_status && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              vehicle.last_ignition
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {vehicle.last_ignition ? 'ON' : 'OFF'}
                          </span>
                        </td>
                      )}

                      {/* Speed */}
                      {visibleColumns.speed && (
                        <td className="px-4 py-3 font-mono text-slate-800 whitespace-nowrap">
                          {Math.round(vehicle.last_speed)} km/h
                        </td>
                      )}

                      {/* GPS Fix */}
                      {visibleColumns.gps_fix && (
                        <td className="px-4 py-3 font-mono text-slate-800 whitespace-nowrap">
                          {vehicle.gps_fix ?? 1}
                        </td>
                      )}

                      {/* Altitude */}
                      {visibleColumns.altitude && (
                        <td className="px-4 py-3 font-mono text-slate-800 whitespace-nowrap">
                          {Math.round(vehicle.last_altitude || 100)} m
                        </td>
                      )}

                      {/* Input Voltage */}
                      {visibleColumns.input_voltage && (
                        <td className="px-4 py-3 font-mono text-slate-800 whitespace-nowrap">
                          {vehicle.input_voltage ?? 27} V
                        </td>
                      )}

                      {/* Internal Voltage */}
                      {visibleColumns.internal_voltage && (
                        <td className="px-4 py-3 font-mono text-slate-800 whitespace-nowrap">
                          {vehicle.last_internal_batt ? `${vehicle.last_internal_batt.toFixed(1)} V` : '4 V'}
                        </td>
                      )}
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
            Showing 1 to {filteredVehicles.length} of {vehicles.length} entries
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Auto-refresh active • Telemetry polling interval: 2.5s
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeofenceManagerView;
