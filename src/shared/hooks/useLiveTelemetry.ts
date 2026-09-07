import { useEffect, useState, useRef, useCallback } from 'react';
import type { Vehicle, VehicleTelemetryViewDto, TelemetryPoint } from '../types/vts.types';
import { vtsApi, dtoToVehicle, dtoToTelemetryPoint } from '../services/vtsApi';

export function useLiveTelemetry(pollIntervalMs: number = 2000) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [recentTelemetry, setRecentTelemetry] = useState<VehicleTelemetryViewDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const trailCacheRef = useRef<Map<string, TelemetryPoint[]>>(new Map());

  const fetchLiveTelemetry = useCallback(async () => {
    try {
      const recent = await vtsApi.getRecentAllTelemetry(100);
      if (recent && recent.length > 0) {
        setRecentTelemetry(recent);
        setIsLiveConnected(true);
        setLastSyncTime(new Date().toLocaleTimeString());

        // Group by vehicleNo and pick latest record per vehicle
        const latestByVehicle = new Map<string, VehicleTelemetryViewDto>();
        for (const record of recent) {
          if (!record.vehicleNo) continue;
          if (!latestByVehicle.has(record.vehicleNo)) {
            latestByVehicle.set(record.vehicleNo, record);
          }
        }

        const liveList = Array.from(latestByVehicle.values()).map(dtoToVehicle);
        if (liveList.length > 0) {
          setVehicles(liveList);
        }

        // Cache recent points as historical breadcrumbs
        for (const record of recent) {
          if (!record.vehicleNo) continue;
          const pt = dtoToTelemetryPoint(record);
          const currentTrail = trailCacheRef.current.get(record.vehicleNo) || [];
          const lastPt = currentTrail[currentTrail.length - 1];
          if (!lastPt || lastPt.lat !== pt.lat || lastPt.lng !== pt.lng) {
            trailCacheRef.current.set(record.vehicleNo, [...currentTrail, pt].slice(-300));
          }
        }
      } else {
        // If API returns empty or offline, fallback to base list
        if (vehicles.length === 0) {
          const fallback = await vtsApi.getVehicles();
          setVehicles(fallback);
        }
      }
    } catch (err) {
      console.warn('Live telemetry polling error:', err);
      if (vehicles.length === 0) {
        const fallback = await vtsApi.getVehicles();
        setVehicles(fallback);
      }
    } finally {
      setIsLoading(false);
    }
  }, [vehicles.length]);

  useEffect(() => {
    fetchLiveTelemetry();
    const interval = setInterval(fetchLiveTelemetry, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchLiveTelemetry, pollIntervalMs]);

  const getVehicleTrail = useCallback(async (vehicleNo: string, limit: number = 200): Promise<TelemetryPoint[]> => {
    try {
      const history = await vtsApi.getRouteHistory(vehicleNo, limit);
      if (history && history.length > 0) {
        return history.map(dtoToTelemetryPoint);
      }
    } catch {}
    return trailCacheRef.current.get(vehicleNo) || [];
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
