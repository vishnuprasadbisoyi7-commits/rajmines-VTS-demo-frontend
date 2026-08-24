import { useEffect, useRef, useState, useCallback } from 'react';
import type { TelemetryUpdate, AlertRecord } from '../types/vts.types';

type WebSocketMessage =
  | { type: 'TELEMETRY_UPDATE'; data: TelemetryUpdate; timestamp: string }
  | { type: 'RAW_PACKET'; data: string; timestamp: string }
  | { type: 'ALERT'; data: AlertRecord; timestamp: string }
  | { type: 'VEHICLE_UPDATE'; data: Record<string, unknown>; timestamp: string };

export function useVtsWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [liveVehicles, setLiveVehicles] = useState<Map<string, TelemetryUpdate>>(new Map());
  const [recentAlerts, setRecentAlerts] = useState<AlertRecord[]>([]);
  const [rawPackets, setRawPackets] = useState<string[]>([]);
  const [lastMessageTime, setLastMessageTime] = useState<string>('');
  const [flashAlert, setFlashAlert] = useState<AlertRecord | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    try {
      const wsUrl = 'ws://localhost:8080/ws';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('[VTS WS] Connected to RajMines VTS WebSocket Hub.');
      };

      ws.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data);
          setLastMessageTime(new Date().toLocaleTimeString());

          if (msg.type === 'TELEMETRY_UPDATE') {
            const update: TelemetryUpdate = msg.data;
            setLiveVehicles((prev) => {
              const updated = new Map(prev);
              updated.set(update.vehicle_reg_no, update);
              return updated;
            });
          } else if (msg.type === 'RAW_PACKET') {
            const raw: string = msg.data;
            setRawPackets((prev) => [raw, ...prev.slice(0, 49)]);
          } else if (msg.type === 'ALERT') {
            const alert: AlertRecord = msg.data;
            setRecentAlerts((prev) => [alert, ...prev.slice(0, 29)]);
            setFlashAlert(alert);
            setTimeout(() => setFlashAlert(null), 5000);
          }
        } catch (e) {
          console.error('[VTS WS] Message parse error:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('[VTS WS] Disconnected. Reconnecting in 3 seconds...');
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.warn('[VTS WS] WebSocket error:', err);
        ws.close();
      };
    } catch (e) {
      console.error('[VTS WS] Connection failed:', e);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return {
    isConnected,
    liveVehicles,
    recentAlerts,
    rawPackets,
    lastMessageTime,
    flashAlert,
  };
}
