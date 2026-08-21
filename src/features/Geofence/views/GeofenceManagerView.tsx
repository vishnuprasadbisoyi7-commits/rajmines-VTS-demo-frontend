import React, { useEffect, useState } from 'react';
import type { GeofenceZone } from '@/shared/types/vts.types';
import { vtsApi } from '@/shared/services/vtsApi';
import { RajdharaaMap } from '@/shared/components/RajdharaaMap';
import { MapPin, Info } from 'lucide-react';

export const GeofenceManagerView: React.FC = () => {
  const [geofences, setGeofences] = useState<GeofenceZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<GeofenceZone | null>(null);

  useEffect(() => {
    async function loadGeofences() {
      const list = await vtsApi.getGeofences();
      setGeofences(list);
      if (list.length > 0) {
        setSelectedZone(list[0]);
      }
    }
    loadGeofences();
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] p-4 space-y-3">
      {/* Top Header */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-wide">
              Rajasthan Mining Lease & Geofence Boundary Manager
            </h1>
            <p className="text-xs text-slate-400">
              Department of Mines & Geology (DMG) • Rajdharaa Cadastral Spatial Boundaries
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-400">
            {geofences.length} Active Spatial Zones
          </span>
        </div>
      </div>

      {/* Main Grid: Zone List + Interactive Map */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left 5 Cols: Zone List Table */}
        <div className="lg:col-span-5 h-full flex flex-col bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/50">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Enrolled Mining Leases & Checkposts
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-2">
            {geofences.map((gf) => {
              const isSelected = selectedZone?.id === gf.id;
              const isLease = gf.zone_type === 'MINING_LEASE';

              return (
                <div
                  key={gf.id}
                  onClick={() => setSelectedZone(gf)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-lg ring-1 ring-amber-500/30'
                      : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <div className="font-bold text-sm text-white">{gf.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{gf.id}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isLease
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : gf.zone_type === 'STOCKYARD'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {gf.zone_type}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mt-2">
                    <div>
                      Mineral: <span className="text-slate-200 font-medium">{gf.mineral_type}</span>
                    </div>
                    <div className="text-right">
                      Speed Limit: <span className="font-mono text-amber-400 font-bold">{gf.speed_limit} km/h</span>
                    </div>
                    <div>
                      Polygon Vertices: <span className="font-mono text-slate-300">{gf.polygon.length} pts</span>
                    </div>
                    <div className="text-right">
                      Buffer: <span className="font-mono text-slate-300">{gf.buffer_meters}m</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 7 Cols: Map View */}
        <div className="lg:col-span-7 h-full relative rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
          <RajdharaaMap
            vehicles={[]}
            geofences={geofences}
            checkposts={[]}
            gisLayers={[
              {
                id: 'satellite',
                name: 'Rajdharaa Satellite Hybrid',
                type: 'tile',
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                attribution: '© Rajdharaa GIS / DoIT&C Govt. of Rajasthan',
                is_default: true,
                max_zoom: 19,
                min_zoom: 5,
              },
            ]}
            activeLayerId="satellite"
            selectedVehicle={null}
            onSelectVehicle={() => {}}
            showGeofences={true}
          />

          {/* Selected Zone Quick Info Float */}
          {selectedZone && (
            <div className="absolute top-4 right-4 z-[900] bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-700/80 shadow-2xl w-80 text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                <Info className="w-4 h-4" /> {selectedZone.name}
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Zone Type:</span>
                  <span className="font-semibold text-white">{selectedZone.zone_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Permitted Mineral:</span>
                  <span className="text-white">{selectedZone.mineral_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Centroid Coords:</span>
                  <span className="font-mono text-slate-200">
                    {selectedZone.center_lat.toFixed(4)}° N, {selectedZone.center_lng.toFixed(4)}° E
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Permissible Speed:</span>
                  <span className="font-mono text-amber-400 font-bold">{selectedZone.speed_limit} km/h</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeofenceManagerView;
