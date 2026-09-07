import React, { useEffect, useState, useMemo } from 'react';
import type { AlertRecord } from '@/shared/types/vts.types';
import { vtsApi } from '@/shared/services/vtsApi';
import { useVtsWebSocket } from '@/shared/hooks/useVtsWebSocket';
import { ChevronDown, Search } from 'lucide-react';

export const AlertsHubView: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const { recentAlerts } = useVtsWebSocket();

  useEffect(() => {
    async function loadAlerts() {
      setLoading(true);
      const list = await vtsApi.getAlerts();
      setAlerts(list);
      setLoading(false);
    }
    loadAlerts();
  }, []);

  // Merge websocket live alerts
  useEffect(() => {
    if (recentAlerts.length > 0) {
      setAlerts((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const newOnes = recentAlerts.filter((a) => !existingIds.has(a.id));
        return [...newOnes, ...prev];
      });
    }
  }, [recentAlerts]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesSearch =
        !searchTerm.trim() ||
        alert.reg_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSeverity =
        severityFilter === 'ALL' ||
        alert.severity.toUpperCase() === severityFilter.toUpperCase();

      return matchesSearch && matchesSeverity;
    });
  }, [alerts, searchTerm, severityFilter]);

  return (
    <div className="bg-white dark:bg-[#0a192f] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden flex flex-col min-h-[calc(100vh-6.5rem)]">
      {/* Top Filter Bar */}
      <div className="p-4 md:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 bg-white dark:bg-[#0a192f]">
        {/* Search vehicle */}
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-xl pl-3.5 pr-8 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-cyan-600 transition shadow-2xs"
          />
          {searchTerm ? (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ×
            </button>
          ) : (
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          )}
        </div>

        {/* Severity dropdown */}
        <div className="relative">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="appearance-none bg-white dark:bg-[#0c1e38] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl pl-3.5 pr-8 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-cyan-600 transition shadow-2xs cursor-pointer min-w-[130px]"
          >
            <option value="ALL">All Severity</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Main Alerts Table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0a192f] text-[13px] font-semibold text-slate-700 dark:text-slate-300">
              <th className="py-3.5 px-6 font-semibold">Vehicle</th>
              <th className="py-3.5 px-6 font-semibold">Alert</th>
              <th className="py-3.5 px-6 font-semibold">Severity</th>
              <th className="py-3.5 px-6 font-semibold">Event Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-400">
                  Loading alerts history...
                </td>
              </tr>
            ) : filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-400">
                  No alerts found matching current filter.
                </td>
              </tr>
            ) : (
              filteredAlerts.map((alert) => {
                const severity = alert.severity.toLowerCase();

                return (
                  <tr
                    key={alert.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition"
                  >
                    {/* Vehicle */}
                    <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-slate-100 font-mono">
                      {alert.reg_no}
                    </td>

                    {/* Alert Description */}
                    <td className="py-3.5 px-6 text-slate-700 dark:text-slate-300">
                      {alert.message || 'Vehicle Battery Disconnect'}
                    </td>

                    {/* Severity Badge */}
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-block px-3 py-0.5 rounded-full text-[11px] font-semibold lowercase tracking-wide text-white shadow-2xs ${
                          severity === 'high'
                            ? 'bg-[#ea580c]'
                            : severity === 'medium'
                            ? 'bg-[#eab308]'
                            : 'bg-[#0284c7]'
                        }`}
                      >
                        {severity}
                      </span>
                    </td>

                    {/* Event Time */}
                    <td className="py-3.5 px-6 font-mono text-slate-600 dark:text-slate-400">
                      {alert.timestamp || '2026-09-01 10:14:48'}
                    </td>
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

export default AlertsHubView;
