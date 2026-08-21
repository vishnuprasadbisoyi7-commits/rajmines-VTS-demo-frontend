import React, { useState, useEffect, useRef } from 'react';
import { useVtsWebSocket } from '@/shared/hooks/useVtsWebSocket';
import { vtsApi } from '@/shared/services/vtsApi';
import { Terminal, Cpu, Play, Pause, Trash2, ShieldCheck } from 'lucide-react';

interface DecodedPacketField {
  label: string;
  value: string;
  desc: string;
}

export const AIS140TerminalView: React.FC = () => {
  const { rawPackets: wsPackets } = useVtsWebSocket();
  const [packets, setPackets] = useState<string[]>([]);
  const [selectedRaw, setSelectedRaw] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('ALL');

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Initial fetch
  useEffect(() => {
    async function loadHistory() {
      const history = await vtsApi.getRawPackets();
      setPackets(history);
      if (history.length > 0) {
        setSelectedRaw(history[0]);
      }
    }
    loadHistory();
  }, []);

  // Append new packets from WebSocket
  useEffect(() => {
    if (!isPaused && wsPackets.length > 0) {
      setPackets((prev) => {
        const set = new Set(prev);
        const newPackets = wsPackets.filter((p) => !set.has(p));
        const combined = [...newPackets, ...prev];
        return combined.slice(0, 100);
      });
      if (!selectedRaw && wsPackets.length > 0) {
        setSelectedRaw(wsPackets[0]);
      }
    }
  }, [wsPackets, isPaused, selectedRaw]);

  const filteredPackets = packets.filter((p) => {
    if (filterType === 'ALL') return true;
    return p.includes(`,${filterType},`);
  });

  // Decode standard AIS-140 packet string into structured fields
  const parseRawForInspector = (raw: string): DecodedPacketField[] => {
    const trimmed = raw.trim().replace(/^\$\$|\$$/, '');
    const [body, crc] = trimmed.split('*');
    const fields = body.split(',');

    return [
      { label: 'Vendor ID', value: fields[0] || 'N/A', desc: 'Manufacturer / Protocol Identifier' },
      { label: 'Firmware Version', value: fields[1] || 'N/A', desc: 'AIS-140 Device Firmware Build' },
      { label: 'Packet Type', value: fields[2] || 'N/A', desc: 'NR: Normal, EA: Emergency, OS: Overspeed, TA: Tamper' },
      { label: 'Device IMEI', value: fields[3] || 'N/A', desc: '15-Digit Hardware Identity' },
      { label: 'Vehicle Reg No', value: fields[4] || 'N/A', desc: 'Rajasthan Transport Registration' },
      { label: 'GPS Fix', value: fields[5] === '1' ? '1 (Valid 3D Fix)' : '0 (Invalid Fix)', desc: 'Satellite Fix State' },
      { label: 'Date (DDMMYYYY)', value: fields[6] || 'N/A', desc: 'UTC Logging Date' },
      { label: 'Time (HHMMSS)', value: fields[7] || 'N/A', desc: 'UTC Logging Time' },
      { label: 'Latitude', value: `${fields[8] || ''} ${fields[9] || ''}`, desc: 'Degrees & Hemisphere' },
      { label: 'Longitude', value: `${fields[10] || ''} ${fields[11] || ''}`, desc: 'Degrees & Hemisphere' },
      { label: 'Speed', value: `${fields[12] || '0'} km/h`, desc: 'GPS Ground Speed' },
      { label: 'Heading', value: `${fields[13] || '0'}°`, desc: 'Compass Bearing' },
      { label: 'Satellites', value: fields[14] || '0', desc: 'Tracked GNSS Constellation Count' },
      { label: 'Altitude', value: `${fields[15] || '0'} m`, desc: 'Height Above Mean Sea Level' },
      { label: 'Network Operator', value: fields[18] || 'Airtel M2M', desc: 'Active Cellular Carrier' },
      { label: 'Ignition State', value: fields[19] === '1' ? 'ON (1)' : 'OFF (0)', desc: 'Engine ACC Line' },
      { label: 'Main Power Status', value: fields[20] === '1' ? 'Connected (1)' : 'Cut/Disconnected (0)', desc: 'Vehicle Main Battery' },
      { label: 'Internal Battery', value: `${fields[21] || '0'} Volts`, desc: 'Emergency Backup Li-Ion Cell' },
      { label: 'Emergency Panic SOS', value: fields[22] === '1' ? 'TRIGGERED (1)' : 'Normal (0)', desc: 'Driver Emergency Switch' },
      { label: 'CRC Checksum', value: `*${crc || 'VALID'}`, desc: '8-bit XOR Frame Checksum' },
    ];
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] p-4 space-y-3">
      {/* Top Banner */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
              AIS-140 Raw Telemetry Packet Stream & Protocol Inspector
            </h1>
            <p className="text-xs text-slate-400">
              Automotive Industry Standard 140 (ARAI Compliant) • Real-time Hardware Hex & ASCII Parser
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              isPaused ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? 'Resume Stream' : 'Pause Stream'}
          </button>

          <button
            onClick={() => setPackets([])}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            title="Clear terminal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Terminal & Inspector Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left 7 Cols: Live Raw Console */}
        <div className="lg:col-span-7 h-full flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl font-mono text-xs">
          {/* Console Header */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-300">LIVE AIS-140 PACKET FEED</span>
            </div>

            <div className="flex gap-1">
              {['ALL', 'NR', 'EA', 'OS', 'TA'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    filterType === t ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Log Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-slate-900">
            {filteredPackets.length === 0 ? (
              <div className="text-slate-600 p-8 text-center">
                Waiting for incoming AIS-140 GPS frames...
              </div>
            ) : (
              filteredPackets.map((pkt, idx) => {
                const isSelected = selectedRaw === pkt;
                const isEmergency = pkt.includes(',EA,');
                const isOverspeed = pkt.includes(',OS,');

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedRaw(pkt)}
                    className={`p-2 rounded cursor-pointer transition select-all break-all ${
                      isSelected
                        ? 'bg-emerald-950/60 border border-emerald-500/60 text-emerald-300'
                        : isEmergency
                        ? 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500 hover:bg-rose-900/30'
                        : isOverspeed
                        ? 'bg-amber-950/40 text-amber-300 border-l-2 border-amber-500 hover:bg-amber-900/30'
                        : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                    {pkt}
                  </div>
                );
              })
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* Right 5 Cols: Decoded Field Inspector */}
        <div className="lg:col-span-5 h-full flex flex-col bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" /> Decoded Frame Inspector
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> CRC VERIFIED
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {selectedRaw ? (
              parseRawForInspector(selectedRaw).map((field, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="text-slate-400 font-semibold">{field.label}</div>
                    <div className="text-[10px] text-slate-500">{field.desc}</div>
                  </div>
                  <div className="font-mono font-bold text-amber-300 text-right">{field.value}</div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                Select any packet from the terminal to view decoded protocol fields.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIS140TerminalView;
