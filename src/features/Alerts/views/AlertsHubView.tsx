import React, { useEffect, useState } from 'react';
import type { AlertRecord } from '@/shared/types/vts.types';
import { vtsApi } from '@/shared/services/vtsApi';
import { useVtsWebSocket } from '@/shared/hooks/useVtsWebSocket';
import {
  ShieldAlert,
  AlertTriangle,
  Gauge,
  MapPin,
  BatteryWarning,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const AlertsHubView: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const { recentAlerts } = useVtsWebSocket();

  useEffect(() => {
    async function loadAlerts() {
      const list = await vtsApi.getAlerts();
      setAlerts(list);
    }
    loadAlerts();
  }, []);

  // Merge websocket alerts
  useEffect(() => {
    if (recentAlerts.length > 0) {
      setAlerts((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const newOnes = recentAlerts.filter((a) => !existingIds.has(a.id));
        return [...newOnes, ...prev];
      });
    }
  }, [recentAlerts]);

  const handleResolve = async (id: string) => {
    const ok = await vtsApi.resolveAlert(id);
    if (ok) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_resolved: true } : a))
      );
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'SOS_EMERGENCY':
        return <ShieldAlert className="w-5 h-5 text-rose-400" />;
      case 'OVERSPEED':
        return <Gauge className="w-5 h-5 text-amber-400" />;
      case 'GEOFENCE_BREACH':
        return <MapPin className="w-5 h-5 text-indigo-400" />;
      case 'BATTERY_TAMPER':
        return <BatteryWarning className="w-5 h-5 text-orange-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] p-4 space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-wide">
              Mining Fleet Alerts & AIS-140 Security Incident Hub
            </h1>
            <p className="text-xs text-slate-400">
              Department of Mines & Geology Rajasthan • Central Vigilance Alert Monitoring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono font-bold">
            {alerts.filter((a) => !a.is_resolved).length} Unresolved Incidents
          </span>
        </div>
      </div>

      {/* Alert List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {alerts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
            No alerts logged currently. Fleet is operating normally.
          </div>
        ) : (
          alerts.map((alert) => {
            const isSOS = alert.alert_type === 'SOS_EMERGENCY';

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition backdrop-blur shadow-lg ${
                  alert.is_resolved
                    ? 'bg-slate-900/40 border-slate-800/80 opacity-75'
                    : isSOS
                    ? 'bg-rose-950/30 border-rose-600/60 shadow-rose-950/50'
                    : 'bg-slate-900/90 border-slate-700/80'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      {getAlertIcon(alert.alert_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-white">{alert.reg_no}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            alert.severity === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">IMEI: {alert.imei}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>

                    {!alert.is_resolved ? (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                      </button>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-medium">
                        Resolved
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed">{alert.message}</div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 font-mono">
                  <span>
                    Location: {alert.latitude.toFixed(4)}° N, {alert.longitude.toFixed(4)}° E
                  </span>
                  <span>Speed: {Math.round(alert.speed)} km/h</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AlertsHubView;
