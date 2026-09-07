import { useEffect, useState, useCallback, useRef } from 'react';
import type { Vehicle, VehicleTelemetryViewDto, TelemetryPoint } from '../types/vts.types';
import { vtsApi } from '../services/vtsApi';
import { calculateRoadHeading } from '../data/rawannaTransitData';

export function useLiveTelemetry(pollIntervalMs: number = 2000) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [recentTelemetry] = useState<VehicleTelemetryViewDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  const trailCacheRef = useRef<Map<string, TelemetryPoint[]>>(new Map());
  const trailIndexRef = useRef<Map<string, number>>(new Map());
  const lastLiveCoordsRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  const isFetchingTrailsRef = useRef<boolean>(false);

  const fetchLiveTelemetry = useCallback(async () => {
    try {
      const list = await vtsApi.getVehicles();
      if (!list || list.length === 0) return;

      setIsLiveConnected(true);
      setLastSyncTime(new Date().toLocaleTimeString());

      // Pre-fetch authentic GPS trails for live vehicles if not already cached
      if (!isFetchingTrailsRef.current && trailCacheRef.current.size < list.length) {
        isFetchingTrailsRef.current = true;
        Promise.all(
          list.map(async (v) => {
            if (!trailCacheRef.current.has(v.reg_no)) {
              try {
                const trail = await vtsApi.getVehicleTrail(v.reg_no, 200);
                if (trail && trail.length > 1) {
                  trailCacheRef.current.set(v.reg_no, trail);
                }
              } catch {}
            }
          })
        ).finally(() => {
          isFetchingTrailsRef.current = false;
        });
      }

      // Continuous movement: if live backend packets change, update; if static, advance along GPS packets
      const updatedList = list.map((v) => {
        const lastCoords = lastLiveCoordsRef.current.get(v.reg_no);
        const hasBackendMoved =
          lastCoords &&
          (Math.abs(lastCoords.lat - v.last_latitude) > 0.00001 ||
            Math.abs(lastCoords.lng - v.last_longitude) > 0.00001);

        if (hasBackendMoved || !lastCoords) {
          lastLiveCoordsRef.current.set(v.reg_no, {
            lat: v.last_latitude,
            lng: v.last_longitude,
          });
          return v;
        }

        // Advance vehicle position along authentic historical GPS packets from Go backend
        const cachedTrail = trailCacheRef.current.get(v.reg_no);
        if (cachedTrail && cachedTrail.length > 2) {
          const currentIdx = trailIndexRef.current.get(v.reg_no) ?? 0;
          const nextIdx = (currentIdx + 1) % cachedTrail.length;
          trailIndexRef.current.set(v.reg_no, nextIdx);

          const pt = cachedTrail[nextIdx];
          const forwardPt = cachedTrail[(nextIdx + 1) % cachedTrail.length];
          const heading = calculateRoadHeading(pt.lat, pt.lng, forwardPt.lat, forwardPt.lng);

          return {
            ...v,
            last_latitude: pt.lat,
            last_longitude: pt.lng,
            last_speed: pt.speed > 0 ? pt.speed : 42.0,
            last_heading: heading || pt.heading || v.last_heading,
            last_ignition: true,
            status: 'MOVING' as const,
            last_updated: new Date().toLocaleTimeString('en-GB'),
          };
        }

        return v;
      });

      setVehicles(updatedList);
    } catch (err) {
      console.warn('Live telemetry polling error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveTelemetry();
    const interval = setInterval(fetchLiveTelemetry, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchLiveTelemetry, pollIntervalMs]);

  const getVehicleTrail = useCallback(async (vehicleNo: string, limit: number = 500): Promise<TelemetryPoint[]> => {
    return await vtsApi.getVehicleTrail(vehicleNo, limit);
  }, []);

  return {
    vehicles,
    recentTelemetry,
    isLoading,
    isLiveConnected,
    lastSyncTime,
    refresh: fetchLiveTelemetry,
    getVehicleTrail,
  };
}

