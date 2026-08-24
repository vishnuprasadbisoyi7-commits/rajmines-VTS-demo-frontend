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
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-2xl w-84 max-w-[calc(100vw-3rem)] text-xs space-y-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 font-bold text-amber-700 text-sm">
              <Sliders className="w-4 h-4 text-amber-600" /> Simulator Console
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
              Target Mineral Carrier:
            </label>
            <select
              value={selectedReg}
              onChange={(e) => setSelectedReg(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
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
              className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600" /> Panic SOS
            </button>

            <button
              onClick={() => handleTrigger('OVERSPEED')}
              className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Gauge className="w-4 h-4 text-amber-600" /> Overspeed
            </button>

            <button
              onClick={() => handleTrigger('GEOFENCE_BREACH')}
              className="p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <MapPin className="w-4 h-4 text-indigo-600" /> Lease Breach
            </button>

            <button
              onClick={() => handleTrigger('TAMPER')}
              className="p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <BatteryWarning className="w-4 h-4 text-orange-600" /> Wire Tamper
            </button>
          </div>

          <button
            onClick={() => handleTrigger('IGNITION_TOGGLE')}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition border border-slate-200"
          >
            <Power className="w-4 h-4 text-emerald-600" /> Toggle Engine Ignition
          </button>

          {feedback && (
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-center font-semibold text-[11px] flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {feedback}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
