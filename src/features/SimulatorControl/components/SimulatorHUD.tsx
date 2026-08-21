import React, { useState } from 'react';
import { vtsApi } from '@/shared/services/vtsApi';
import {
  Sliders,
  AlertTriangle,
  Gauge,
  MapPin,
  BatteryWarning,
  Power,
  CheckCircle2,
  X,
} from 'lucide-react';

interface SimulatorHUDProps {
  activeVehicles?: string[];
}

export const SimulatorHUD: React.FC<SimulatorHUDProps> = ({
  activeVehicles = ['RJ14-GB-9821', 'RJ27-GA-4512', 'RJ19-UB-7734', 'RJ15-TA-2190'],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReg, setSelectedReg] = useState(activeVehicles[0]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleTrigger = async (eventType: string) => {
    try {
      await vtsApi.triggerSimulatorEvent(selectedReg, eventType);
      setFeedback(`Triggered ${eventType} on ${selectedReg}`);
      setTimeout(() => setFeedback(null), 4000);
    } catch {
      setFeedback(`Failed to trigger event`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1200]">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-2xl shadow-2xl transition hover:scale-105 border border-amber-300"
        >
          <Sliders className="w-5 h-5" />
          <span className="text-xs uppercase tracking-wider">Simulate Hardware Events</span>
        </button>
      ) : (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-4 shadow-2xl w-84 max-w-[calc(100vw-3rem)] text-xs space-y-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
              <Sliders className="w-4 h-4" /> AIS-140 Simulator Console
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Target Mineral Carrier:
            </label>
            <select
              value={selectedReg}
              onChange={(e) => setSelectedReg(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500"
            >
              {activeVehicles.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => handleTrigger('SOS')}
              className="p-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400" /> Panic SOS
            </button>

            <button
              onClick={() => handleTrigger('OVERSPEED')}
              className="p-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Gauge className="w-4 h-4 text-amber-400" /> Overspeed
            </button>

            <button
              onClick={() => handleTrigger('GEOFENCE_BREACH')}
              className="p-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <MapPin className="w-4 h-4 text-indigo-400" /> Lease Breach
            </button>

            <button
              onClick={() => handleTrigger('TAMPER')}
              className="p-2.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-300 font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <BatteryWarning className="w-4 h-4 text-orange-400" /> Wire Tamper
            </button>
          </div>

          <button
            onClick={() => handleTrigger('IGNITION_TOGGLE')}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700"
          >
            <Power className="w-4 h-4 text-emerald-400" /> Toggle Engine Ignition
          </button>

          {feedback && (
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-center font-semibold text-[11px] flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {feedback}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
