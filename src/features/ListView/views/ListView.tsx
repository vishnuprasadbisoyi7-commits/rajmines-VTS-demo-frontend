import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Download,
  ChevronDown,
  Search,
  Check,
} from 'lucide-react';
import type { Vehicle } from '@/shared/types/vts.types';
import { vtsApi } from '@/shared/services/vtsApi';
import { useVtsWebSocket } from '@/shared/hooks/useVtsWebSocket';
import { ROUTES } from '@/shared/constants/app.constants';

interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
}

export const ListView: React.FC = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showColumnsMenu, setShowColumnsMenu] = useState<boolean>(false);

  const { liveVehicles } = useVtsWebSocket();

  const [columns, setColumns] = useState<ColumnDef[]>([
    { key: 'reg_no', label: 'Registration No', visible: true },
    { key: 'imei', label: 'IMEI', visible: true },
    { key: 'e_rawanna', label: 'e-Rawanna No', visible: true },
    { key: 'status', label: 'Status', visible: true },
    { key: 'ign_status', label: 'IGN Status', visible: true },
    { key: 'speed', label: 'Speed', visible: true },
    { key: 'gps_fix', label: 'GPS Fix', visible: true },
    { key: 'altitude', label: 'Altitude', visible: true },
    { key: 'input_voltage', label: 'Input Voltage', visible: true },
    { key: 'internal_voltage', label: 'Internal Voltage', visible: true },
  ]);

  useEffect(() => {
    async function loadVehicles() {
      setLoading(true);
      const list = await vtsApi.getVehicles();
      setVehicles(list);
      setLoading(false);
    }
    loadVehicles();
  }, []);

  // Merge live WebSocket updates
  const mergedVehicles = useMemo(() => {
    if (liveVehicles.size === 0) return vehicles;

    return vehicles.map((v) => {
      const live = liveVehicles.get(v.reg_no);
      if (!live) return v;

      return {
        ...v,
        last_latitude: live.latitude,
        last_longitude: live.longitude,
        last_speed: live.speed,
        last_heading: live.heading,
        last_altitude: live.altitude,
        last_ignition: live.ignition,
        status: live.status,
        last_internal_batt: live.internal_batt,
      };
    });
  }, [vehicles, liveVehicles]);

  const filteredVehicles = useMemo(() => {
    return mergedVehicles.filter((v) => {
      const matchesSearch =
        !searchTerm.trim() ||
        v.reg_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.imei.includes(searchTerm);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'SOS' && (v.status === 'SOS' || v.last_emergency)) ||
        v.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [mergedVehicles, searchTerm, statusFilter]);

  const toggleColumn = (key: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );
  };

  const handleExportCSV = () => {
    const visibleCols = columns.filter((c) => c.visible);
    const headers = visibleCols.map((c) => c.label);

    const rows = filteredVehicles.map((v) => {
      return visibleCols.map((c) => {
        switch (c.key) {
          case 'reg_no':
            return v.reg_no;
          case 'imei':
            return v.imei;
          case 'e_rawanna':
            return v.active_e_ravanna || 'N/A';
          case 'status':
            return v.status;
          case 'ign_status':
            return v.last_ignition ? 'ON' : 'OFF';
          case 'speed':
            return `${v.last_speed.toFixed(1)} km/h`;
          case 'gps_fix':
            return v.gps_fix ?? 1;
          case 'altitude':
            return `${v.last_altitude.toFixed(1)} m`;
          case 'input_voltage':
            return `${v.input_voltage ?? 27} V`;
          case 'internal_voltage':
            return `${v.last_internal_batt.toFixed(1)} V`;
          default:
            return '';
        }
      });
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `rajmines_vehicles_list_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRowClick = (vehicle: Vehicle) => {
    navigate(`${ROUTES.MAP}?vehicle=${vehicle.reg_no}`);
  };

  const isColumnVisible = (key: string) => {
    return columns.find((c) => c.key === key)?.visible ?? true;
  };

  return (
    <div className="bg-white dark:bg-[#0a192f] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden flex flex-col min-h-[calc(100vh-6.5rem)]">
      {/* Top Filter & Action Bar */}
      <div className="p-4 md:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0a192f]">
        {/* Left: Status Filter & Search Input */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl pl-3.5 pr-8 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-cyan-600 transition shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="MOVING">Moving</option>
              <option value="IDLE">Idle</option>
              <option value="STOPPED">Stopped</option>
              <option value="SOS">SOS / Emergency</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Vehicle No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-xl pl-9 pr-8 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-cyan-600 transition shadow-2xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Right: Export CSV & Columns Dropdown */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition shadow-2xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>Export CSV</span>
          </button>

          {/* Columns Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowColumnsMenu((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition shadow-2xs cursor-pointer"
            >
              <span>Columns</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showColumnsMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2 text-xs">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                  Toggle Columns
                </div>
                <div className="py-1 max-h-56 overflow-y-auto space-y-1">
                  {columns.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => toggleColumn(c.key)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-left text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <span>{c.label}</span>
                      {c.visible && <Check className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0a192f] text-[13px] font-semibold text-slate-700 dark:text-slate-300">
              {isColumnVisible('reg_no') && <th className="py-3.5 px-4 font-semibold">Registration No</th>}
              {isColumnVisible('imei') && <th className="py-3.5 px-4 font-semibold">IMEI</th>}
              {isColumnVisible('e_rawanna') && <th className="py-3.5 px-4 font-semibold">e-Rawanna No</th>}
              {isColumnVisible('status') && <th className="py-3.5 px-4 font-semibold">Status</th>}
              {isColumnVisible('ign_status') && <th className="py-3.5 px-4 font-semibold">IGN Status</th>}
              {isColumnVisible('speed') && <th className="py-3.5 px-4 font-semibold">Speed</th>}
              {isColumnVisible('gps_fix') && <th className="py-3.5 px-4 font-semibold">GPS Fix</th>}
              {isColumnVisible('altitude') && <th className="py-3.5 px-4 font-semibold">Altitude</th>}
              {isColumnVisible('input_voltage') && <th className="py-3.5 px-4 font-semibold">Input Voltage</th>}
              {isColumnVisible('internal_voltage') && <th className="py-3.5 px-4 font-semibold">Internal Voltage</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-slate-400">
                  Loading vehicles telemetry...
                </td>
              </tr>
            ) : filteredVehicles.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-slate-400">
                  No vehicles matching current filter.
                </td>
              </tr>
            ) : (
              filteredVehicles.map((vehicle) => {
                const isIgnOn = vehicle.last_ignition;
                const status = vehicle.status;

                return (
                  <tr
                    key={vehicle.reg_no}
                    onClick={() => handleRowClick(vehicle)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition"
                  >
                    {/* Reg No */}
                    {isColumnVisible('reg_no') && (
                      <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {vehicle.reg_no}
                      </td>
                    )}

                    {/* IMEI */}
                    {isColumnVisible('imei') && (
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {vehicle.imei}
                      </td>
                    )}

                    {/* e-Rawanna No */}
                    {isColumnVisible('e_rawanna') && (
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {vehicle.active_e_ravanna || 'N/A'}
                      </td>
                    )}

                    {/* Status Pill */}
                    {isColumnVisible('status') && (
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide ${
                            status === 'MOVING'
                              ? 'bg-[#dcfce7] dark:bg-emerald-950/60 text-[#16a34a] dark:text-emerald-300'
                              : status === 'IDLE'
                              ? 'bg-[#fef3c7] dark:bg-amber-950/60 text-[#b45309] dark:text-amber-300'
                              : status === 'SOS'
                              ? 'bg-[#fee2e2] dark:bg-rose-950/60 text-[#dc2626] dark:text-rose-300'
                              : 'bg-[#f1f5f9] dark:bg-slate-800 text-[#64748b] dark:text-slate-400'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    )}

                    {/* IGN Status Pill */}
                    {isColumnVisible('ign_status') && (
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isIgnOn
                              ? 'bg-[#dcfce7] dark:bg-emerald-950/60 text-[#16a34a] dark:text-emerald-300'
                              : 'bg-[#f1f5f9] dark:bg-slate-800 text-[#94a3b8] dark:text-slate-400'
                          }`}
                        >
                          {isIgnOn ? 'ON' : 'OFF'}
                        </span>
                      </td>
                    )}

                    {/* Speed */}
                    {isColumnVisible('speed') && (
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {vehicle.last_speed.toFixed(1)} km/h
                      </td>
                    )}

                    {/* GPS Fix */}
                    {isColumnVisible('gps_fix') && (
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        {vehicle.gps_fix ?? 1}
                      </td>
                    )}

                    {/* Altitude */}
                    {isColumnVisible('altitude') && (
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        {vehicle.last_altitude.toFixed(1)} m
                      </td>
                    )}

                    {/* Input Voltage */}
                    {isColumnVisible('input_voltage') && (
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        {vehicle.input_voltage ? `${vehicle.input_voltage} V` : '27 V'}
                      </td>
                    )}

                    {/* Internal Voltage */}
                    {isColumnVisible('internal_voltage') && (
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        {vehicle.last_internal_batt ? `${vehicle.last_internal_batt} V` : '4 V'}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListView;
