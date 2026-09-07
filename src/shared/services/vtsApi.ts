import type {
  AlertRecord,
  ERavannaPass,
  FleetStats,
  GeofenceZone,
  GISMetaResponse,
  TelemetryPoint,
  Vehicle,
  VehicleTelemetryViewDto,
  LiveVehicleApiResponse,
  LiveVehicleApiItem,
  VehicleAlertsApiResponse,
  TripReportRecord,
  TripReportFilterParams,
  TripReportApiResponse,
} from '../types/vts.types';

const SPRING_TELEMETRY_API_BASE = 'http://localhost:8082/vts/api/telemetry-view';
const PROXY_TELEMETRY_API_BASE = '/vts/api/telemetry-view';
const API_BASE = 'http://localhost:8080/api/v1';

async function fetchTelemetry<T>(endpoint: string): Promise<T | null> {
  // Try direct backend first
  try {
    const res = await fetch(`${SPRING_TELEMETRY_API_BASE}${endpoint}`);
    if (res.ok) {
      if (res.status === 204) return null;
      return (await res.json()) as T;
    }
  } catch {
    // Try Vite proxy fallback
    try {
      const res = await fetch(`${PROXY_TELEMETRY_API_BASE}${endpoint}`);
      if (res.ok) {
        if (res.status === 204) return null;
        return (await res.json()) as T;
      }
    } catch {}
  }
  return null;
}

export function dtoToVehicle(dto: VehicleTelemetryViewDto): Vehicle {
  const speed = Number(dto.speed) || 0;
  const isMoving = speed > 2;

  let formattedTime = 'Just now';
  if (dto.createdAt) {
    try {
      const d = new Date(dto.createdAt);
      if (!isNaN(d.getTime())) {
        formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    } catch {}
  } else if (dto.packetDate && dto.packetTime && dto.packetDate.length === 8 && dto.packetTime.length === 6) {
    const hh = dto.packetTime.slice(0, 2);
    const mm = dto.packetTime.slice(2, 4);
    const ss = dto.packetTime.slice(4, 6);
    formattedTime = `${hh}:${mm}:${ss}`;
  }

  return {
    id: `VEH-${dto.id || dto.vehicleNo}`,
    reg_no: dto.vehicleNo || 'RJ14AA7906',
    imei: dto.imei || '861819083751561',
    vehicle_type: 'Heavy Mining Tipper',
    driver_name: 'Registered Driver',
    driver_phone: '+91 94140 XXXXX',
    capacity_tonnes: 32.0,
    mineral_type: 'White Marble',
    status: isMoving ? 'MOVING' : 'IDLE',
    last_latitude: Number(dto.latitude) || 24.8696,
    last_longitude: Number(dto.longitude) || 72.8384,
    last_speed: speed,
    last_heading: Number(dto.heading) || 0,
    last_altitude: Number(dto.altitude) || 239.6,
    last_satellites: Number(dto.satellites) || 24,
    last_ignition: speed > 0 || true,
    last_emergency: false,
    last_internal_batt: 4.1,
    last_updated: formattedTime,
    active_geofence: 'Active Mining Corridor',
    active_e_ravanna: `ERAW-${(dto.vehicleNo || '').slice(-4)}-26`,
    input_voltage: 27.8,
    gps_fix: dto.satellites && dto.satellites > 3 ? 1 : 0,
    vendor: dto.operator ? dto.operator.toUpperCase() : 'AIRTEL',
  };
}

export function apiLiveVehicleToVehicle(item: LiveVehicleApiItem): Vehicle {
  const speed = Number(item.speed) || 0;
  const isMoving = speed > 2;

  let formattedTime = 'Just now';
  if (item.updated_at) {
    try {
      const d = new Date(item.updated_at);
      if (!isNaN(d.getTime())) {
        formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    } catch {}
  } else if (item.packet_date && item.packet_time && item.packet_date.length === 8 && item.packet_time.length === 6) {
    const hh = item.packet_time.slice(0, 2);
    const mm = item.packet_time.slice(2, 4);
    const ss = item.packet_time.slice(4, 6);
    formattedTime = `${hh}:${mm}:${ss}`;
  }

  const mineralMap: Record<string, string> = {
    RJ14AA7906: 'Bajri (River Sand)',
    RJ14GL6794: 'Masonry Stone',
    RJ14AA7905: 'Granite',
    RJ14AA7903: 'Marble',
    RJ14AA7902: 'Sandstone',
    RJ14GL6791: 'Limestone',
    RJ14GL6798: 'Bajri (River Sand)',
    RJ14AA7909: 'Granite',
    RJ27GD1041: 'Bajri',
    RJ14GK0267: 'Masonry Stone',
  };

  return {
    id: `VEH-${item.vehicle_no}`,
    reg_no: item.vehicle_no,
    imei: item.imei || '861819083751564',
    vehicle_type: 'Heavy Mining Tipper',
    driver_name: 'Registered Driver',
    driver_phone: '+91 94140 XXXXX',
    capacity_tonnes: 32.0,
    mineral_type: mineralMap[item.vehicle_no] || 'Mining Mineral',
    status: item.emergency === 1 ? 'SOS' : isMoving ? 'MOVING' : 'IDLE',
    last_latitude: Number(item.latitude) || 26.5081,
    last_longitude: Number(item.longitude) || 75.1885,
    last_speed: speed,
    last_heading: Number(item.heading) || 0,
    last_altitude: Number(item.altitude) || 239.6,
    last_satellites: Number(item.satellites) || 24,
    last_ignition: item.ignition === 1 || speed > 0,
    last_emergency: item.emergency === 1,
    last_internal_batt: 4.1,
    last_updated: formattedTime,
    active_geofence: 'Active Corridor',
    active_e_ravanna:
      item.vehicle_no === 'RJ14AA7906'
        ? 'ERAW-7906-2026'
        : item.vehicle_no === 'RJ14GL6794'
        ? 'ERAW-6794-2026'
        : item.vehicle_no === 'RJ14AA7905'
        ? 'ERAW-7905-2026'
        : 'N/A',
    input_voltage: 27.8,
    gps_fix: item.satellites && item.satellites > 3 ? 1 : 0,
    vendor: item.operator ? item.operator.toUpperCase() : 'AIRTEL',
  };
}

export function dtoToTelemetryPoint(dto: VehicleTelemetryViewDto): TelemetryPoint {
  let ts = dto.createdAt;
  if (!ts && dto.packetDate && dto.packetTime) {
    ts = `${dto.packetDate} ${dto.packetTime}`;
  }
  return {
    lat: Number(dto.latitude) || 0,
    lng: Number(dto.longitude) || 0,
    speed: Number(dto.speed) || 0,
    heading: Number(dto.heading) || 0,
    ignition: (Number(dto.speed) || 0) > 0,
    timestamp: ts || new Date().toISOString(),
  };
}

export const vtsApi = {
  // 1. Live Marker Position for single vehicle
  async getLatestTelemetry(vehicleNo: string = 'RJ14AA7906'): Promise<VehicleTelemetryViewDto | null> {
    return await fetchTelemetry<VehicleTelemetryViewDto>(`/latest?vehicleNo=${encodeURIComponent(vehicleNo)}`);
  },

  // 2. Polyline Path History for vehicle from Go server
  async getRouteHistory(vehicleNo: string = 'RJ14AA7906', limit: number = 500): Promise<VehicleTelemetryViewDto[]> {
    const data = await fetchTelemetry<VehicleTelemetryViewDto[]>(
      `/history?vehicleNo=${encodeURIComponent(vehicleNo)}&limit=${limit}`
    );
    return data || [];
  },

  // 3. View Recent Telemetry Records Across All Vehicles (Old API - preserved)
  async getRecentAllTelemetry(limit: number = 100): Promise<VehicleTelemetryViewDto[]> {
    const data = await fetchTelemetry<VehicleTelemetryViewDto[]>(`/recent-all?limit=${limit}`);
    return data || [];
  },

  // 4. Live Vehicles API: GET http://localhost:8082/vts/api/vehicle/live
  async getLiveVehicles(): Promise<LiveVehicleApiResponse | null> {
    try {
      const res = await fetch('http://localhost:8082/vts/api/vehicle/live');
      if (res.ok) {
        return (await res.json()) as LiveVehicleApiResponse;
      }
    } catch {
      try {
        const res = await fetch('/vts/api/vehicle/live');
        if (res.ok) {
          return (await res.json()) as LiveVehicleApiResponse;
        }
      } catch {}
    }
    return null;
  },

  async getVehicles(): Promise<Vehicle[]> {
    try {
      // 1. Primary: Fetch ONLY live vehicles actively transmitting packets from Go server
      const liveApiRes = await this.getLiveVehicles();
      if (liveApiRes && Array.isArray(liveApiRes.data) && liveApiRes.data.length > 0) {
        return liveApiRes.data.map(apiLiveVehicleToVehicle);
      }

      // 2. Secondary fallback: recent telemetry records
      const recentList = await this.getRecentAllTelemetry(100);
      if (recentList && recentList.length > 0) {
        const latestByVehicle = new Map<string, VehicleTelemetryViewDto>();
        for (const record of recentList) {
          if (!record.vehicleNo) continue;
          if (!latestByVehicle.has(record.vehicleNo)) {
            latestByVehicle.set(record.vehicleNo, record);
          }
        }

        const liveVehicles = Array.from(latestByVehicle.values()).map(dtoToVehicle);
        if (liveVehicles.length > 0) {
          return liveVehicles;
        }
      }
    } catch (e) {
      console.warn('Could not fetch live telemetry list, falling back to local dataset', e);
    }
    return getFallbackVehicles();
  },

  // Used by Vehicle Replay to allow selecting from all vehicles
  async getAllVehicles(): Promise<Vehicle[]> {
    try {
      const liveApiRes = await this.getLiveVehicles();
      const liveList =
        liveApiRes && Array.isArray(liveApiRes.data)
          ? liveApiRes.data.map(apiLiveVehicleToVehicle)
          : [];

      const fallbackList = getFallbackVehicles();
      const additional = fallbackList.filter(
        (fb) => !liveList.some((lv) => lv.reg_no === fb.reg_no)
      );
      return [...liveList, ...additional];
    } catch {
      return getFallbackVehicles();
    }
  },

  async getVehicleDetail(regNo: string): Promise<Vehicle | null> {
    try {
      const latest = await this.getLatestTelemetry(regNo);
      if (latest) {
        return dtoToVehicle(latest);
      }
    } catch {}
    const list = await this.getVehicles();
    return list.find((v) => v.reg_no === regNo) || null;
  },

  async getVehicleTrail(regNo: string, limit: number = 500): Promise<TelemetryPoint[]> {
    try {
      const history = await this.getRouteHistory(regNo, limit);
      if (history && history.length > 0) {
        const points = history
          .map(dtoToTelemetryPoint)
          .filter((p) => p.lat !== 0 && p.lng !== 0);
        if (points.length > 0) {
          // Sort chronologically ascending
          points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          return points;
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch route history for ${regNo}:`, e);
    }
    return getFallbackTrail(regNo);
  },

  async getGeofences(): Promise<GeofenceZone[]> {
    try {
      const res = await fetch(`${API_BASE}/geofences`);
      if (!res.ok) throw new Error('Failed to fetch geofences');
      const data = await res.json();
      return data.data || [];
    } catch {
      return getFallbackGeofences();
    }
  },

  async getERavannaPasses(): Promise<ERavannaPass[]> {
    try {
      const res = await fetch(`${API_BASE}/eravanna`);
      if (!res.ok) throw new Error('Failed to fetch e-ravanna');
      const data = await res.json();
      return data.data || [];
    } catch {
      return getFallbackERavanna();
    }
  },

  // OLD API: Commented out as requested
  /*
  async getAlerts(): Promise<AlertRecord[]> {
    try {
      const res = await fetch(`${API_BASE}/alerts`);
      if (!res.ok) throw new Error('Failed to fetch alerts');
      const data = await res.json();
      return data.data || [];
    } catch {
      return getFallbackAlerts();
    }
  },
  */

  // NEW API: GET http://localhost:8082/vts/api/vehicle/alerts?limit=50
  async getVehicleAlerts(limit: number = 50): Promise<VehicleAlertsApiResponse | null> {
    try {
      const res = await fetch(`http://localhost:8082/vts/api/vehicle/alerts?limit=${limit}`);
      if (res.ok) {
        return (await res.json()) as VehicleAlertsApiResponse;
      }
    } catch {
      try {
        const res = await fetch(`/vts/api/vehicle/alerts?limit=${limit}`);
        if (res.ok) {
          return (await res.json()) as VehicleAlertsApiResponse;
        }
      } catch {}
    }
    return null;
  },

  async getAlerts(): Promise<AlertRecord[]> {
    const res = await this.getVehicleAlerts(50);
    if (res && res.alerts && res.alerts.length > 0) {
      return res.alerts.map((a) => ({
        id: String(a.id),
        vehicle_id: a.vehicle_no,
        reg_no: a.vehicle_no,
        imei: a.imei,
        alert_type: a.alert_type as any,
        severity:
          a.alert_type === 'EMERGENCY'
            ? 'CRITICAL'
            : a.alert_type === 'OVERSPEED' || a.alert_type === 'POWER_CUT'
            ? 'HIGH'
            : 'MEDIUM',
        message: a.alert_message,
        latitude: a.latitude,
        longitude: a.longitude,
        speed: a.speed,
        timestamp: a.created_at,
        is_resolved: false,
      }));
    }
    return getFallbackAlerts();
  },

  async resolveAlert(alertId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/alerts/${alertId}/resolve`, {
        method: 'POST',
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getFleetStats(): Promise<FleetStats> {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      return data.data;
    } catch {
      return {
        total_vehicles: 6,
        moving: 4,
        idle: 1,
        stopped: 1,
        emergency_sos: 0,
        active_e_ravanna: 4,
        total_alerts_24h: 1,
        total_tonnage_today: 117.8,
      };
    }
  },

  async getGISMetadata(): Promise<GISMetaResponse> {
    try {
      const res = await fetch(`${API_BASE}/gis/layers`);
      if (!res.ok) throw new Error('Failed to fetch GIS layers');
      return await res.json();
    } catch {
      return getFallbackGISMeta();
    }
  },

  async getRawPackets(): Promise<string[]> {
    try {
      const res = await fetch(`${API_BASE}/packets/raw`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.packets || [];
    } catch {
      return [];
    }
  },

  async triggerSimulatorEvent(vehicleRegNo: string, eventType: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE}/simulator/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle_reg_no: vehicleRegNo, event_type: eventType }),
    });
    return await res.json();
  },

  // 12. Trip Reports API for e-Rawanna transit auditing and route visualizer (Image 1, 2 & 3)
  async getTripReports(filters?: TripReportFilterParams): Promise<TripReportRecord[]> {
    const params = new URLSearchParams();
    if (filters?.vehicle_no) params.append('vehicleNo', filters.vehicle_no);
    if (filters?.erawana_no) params.append('erawanaNo', filters.erawana_no);
    if (filters?.status && filters.status !== 'ALL' && filters.status !== 'All Status') {
      params.append('status', filters.status);
    }
    if (filters?.start_date) params.append('startDate', filters.start_date);
    if (filters?.end_date) params.append('endDate', filters.end_date);

    const qs = params.toString() ? `?${params.toString()}` : '';

    // 1. Try Go backend directly
    try {
      const res = await fetch(`http://localhost:8082/vts/api/vehicle/trip-reports${qs}`);
      if (res.ok) {
        const json = (await res.json()) as TripReportApiResponse;
        if (json && Array.isArray(json.trips)) {
          return json.trips;
        }
      }
    } catch {}

    // 2. Try Vite proxy fallback
    try {
      const res = await fetch(`/vts/api/vehicle/trip-reports${qs}`);
      if (res.ok) {
        const json = (await res.json()) as TripReportApiResponse;
        if (json && Array.isArray(json.trips)) {
          return json.trips;
        }
      }
    } catch {}

    // 3. Resilient dataset fallback matching Production Screenshots
    return getFallbackTripReports(filters);
  },
};

function getFallbackTripReports(filters?: TripReportFilterParams): TripReportRecord[] {
  const masterTrips: TripReportRecord[] = [
    {
      id: 1,
      erawana_no: 'HAJS1040772235',
      vehicle_no: 'RJ09GC7273',
      lease_no: '12608',
      generation_time: '2026-09-06T17:47:50.944Z',
      trip_start: '--',
      trip_end: '--',
      deviation: 'No',
      trip_status: 'Trip_yet_to_start',
      total_gps_points: 2722,
      planned_route: [
        [24.8887, 74.6269], [24.9020, 74.6240], [24.9180, 74.6180], [24.9350, 74.6050],
        [24.9520, 74.5820], [24.9680, 74.5550], [24.9850, 74.5250], [25.0020, 74.4850],
        [25.0180, 74.4450], [25.0350, 74.4050], [25.0480, 74.3720], [25.0612, 74.3524],
      ],
      actual_route: [
        [24.8887, 74.6269], [24.8780, 74.6220], [24.8650, 74.6050], [24.8590, 74.5780],
        [24.8680, 74.5500], [24.8950, 74.5480], [24.9250, 74.5620], [24.9550, 74.5250],
        [24.9820, 74.4750], [25.0120, 74.4250], [25.0380, 74.3820], [25.0612, 74.3524],
      ],
      deviated_route: [
        [24.8887, 74.6269], [24.8760, 74.6240], [24.8620, 74.6110], [24.8560, 74.5760],
        [24.8660, 74.5490], [24.8960, 74.5460], [24.9270, 74.5640], [24.9560, 74.5260],
        [24.9840, 74.4730], [25.0130, 74.4230], [25.0390, 74.3790], [25.0612, 74.3524],
      ],
      point_a: {
        coords: [24.8887, 74.6269],
        name: 'Lease 12608 - Chittorgarh Quarry',
        subtext: 'Chittorgarh Mining Division',
      },
      point_b: {
        coords: [25.0612, 74.3524],
        name: 'Rashmi Weighbridge',
        subtext: 'Destination Weighbridge Point B',
      },
    },
    {
      id: 2,
      erawana_no: 'HAJS1040772236',
      vehicle_no: 'RJ14AA7906',
      lease_no: '11804',
      generation_time: '2026-09-06T14:20:10.000Z',
      trip_start: '02:30:00 PM',
      trip_end: '--',
      deviation: 'No',
      trip_status: 'In_Transit',
      total_gps_points: 1850,
      planned_route: [
        [26.8500, 75.8200], [26.8200, 75.8500], [26.7800, 75.8900], [26.7400, 75.9200],
      ],
      actual_route: [
        [26.8500, 75.8200], [26.8200, 75.8500], [26.7800, 75.8900],
      ],
      deviated_route: [],
      point_a: {
        coords: [26.8500, 75.8200],
        name: 'Jaipur Stone Quarry',
        subtext: 'Lessee Mine Origin',
      },
      point_b: {
        coords: [26.7400, 75.9200],
        name: 'Jaipur Weighbridge',
        subtext: 'Weighbridge Destination',
      },
    },
    {
      id: 3,
      erawana_no: 'HAJS1040772237',
      vehicle_no: 'RJ14GL6798',
      lease_no: '10925',
      generation_time: '2026-09-06T11:15:22.000Z',
      trip_start: '11:30:00 AM',
      trip_end: '04:45:10 PM',
      deviation: 'No',
      trip_status: 'Completed',
      total_gps_points: 1240,
      planned_route: [
        [26.9000, 75.7500], [26.8600, 75.7200], [26.8100, 75.6900],
      ],
      actual_route: [
        [26.9000, 75.7500], [26.8600, 75.7200], [26.8100, 75.6900],
      ],
      deviated_route: [],
      point_a: {
        coords: [26.9000, 75.7500],
        name: 'Kishangarh Marble Yard',
        subtext: 'Lessee Yard Origin',
      },
      point_b: {
        coords: [26.8100, 75.6900],
        name: 'Ajmer Processing Unit',
        subtext: 'Consignee Destination',
      },
    },
    {
      id: 4,
      erawana_no: 'HAJS1040772238',
      vehicle_no: 'RJ14AA7909',
      lease_no: '13411',
      generation_time: '2026-09-07T08:30:00.000Z',
      trip_start: '--',
      trip_end: '--',
      deviation: 'No',
      trip_status: 'Trip_yet_to_start',
      total_gps_points: 1520,
      planned_route: [
        [26.7800, 76.0700], [26.8100, 76.0400], [26.8400, 76.0100],
      ],
      actual_route: [
        [26.7800, 76.0700],
      ],
      deviated_route: [],
      point_a: {
        coords: [26.7800, 76.0700],
        name: 'Dausa Granite Pit',
        subtext: 'Lessee Mine',
      },
      point_b: {
        coords: [26.8400, 76.0100],
        name: 'Dausa Bypass Weighbridge',
        subtext: 'Destination',
      },
    },
    {
      id: 5,
      erawana_no: 'HAJS1040772239',
      vehicle_no: 'RJ14GL6794',
      lease_no: '12240',
      generation_time: '2026-09-07T09:45:00.000Z',
      trip_start: '10:00:00 AM',
      trip_end: '--',
      deviation: 'Yes',
      trip_status: 'Route_Deviated',
      total_gps_points: 2100,
      planned_route: [
        [26.8700, 75.7500], [26.8400, 75.7200], [26.8000, 75.7000],
      ],
      actual_route: [
        [26.8700, 75.7500], [26.8900, 75.7800], [26.8600, 75.8200],
      ],
      deviated_route: [
        [26.8700, 75.7500], [26.8900, 75.7800], [26.8600, 75.8200],
      ],
      point_a: {
        coords: [26.8700, 75.7500],
        name: 'Sanganer Quarry',
        subtext: 'Point A Origin',
      },
      point_b: {
        coords: [26.8000, 75.7000],
        name: 'Sitapura Weighbridge',
        subtext: 'Point B Destination',
      },
    },
  ];

  return masterTrips.filter((t) => {
    if (filters?.vehicle_no && !t.vehicle_no.toLowerCase().includes(filters.vehicle_no.toLowerCase())) {
      return false;
    }
    if (filters?.erawana_no && !t.erawana_no.toLowerCase().includes(filters.erawana_no.toLowerCase())) {
      return false;
    }
    if (filters?.status && filters.status !== 'ALL' && filters.status !== 'All Status' && t.trip_status !== filters.status) {
      return false;
    }
    if (filters?.start_date && filters.start_date.trim() !== '') {
      const tripDate = new Date(t.generation_time);
      const sDate = new Date(filters.start_date);
      if (!isNaN(sDate.getTime()) && !isNaN(tripDate.getTime())) {
        sDate.setHours(0, 0, 0, 0);
        if (tripDate < sDate) return false;
      }
    }
    if (filters?.end_date && filters.end_date.trim() !== '') {
      const tripDate = new Date(t.generation_time);
      const eDate = new Date(filters.end_date);
      if (!isNaN(eDate.getTime()) && !isNaN(tripDate.getTime())) {
        eDate.setHours(23, 59, 59, 999);
        if (tripDate > eDate) return false;
      }
    }
    return true;
  });
}


function getFallbackVehicles(): Vehicle[] {
  return [
    {
      id: 'VEH-PROD-RAWANNA-01',
      reg_no: 'RJ14GK0267',
      imei: '861819083751564',
      vehicle_type: 'Multi-Axle Tipper',
      driver_name: 'RAMESH KUMAR',
      driver_phone: '+91 98291 04821',
      capacity_tonnes: 32.0,
      mineral_type: 'Masonry Stone',
      status: 'MOVING',
      last_latitude: 26.830,
      last_longitude: 75.820,
      last_speed: 52.7,
      last_heading: 75.0,
      last_altitude: 242.0,
      last_satellites: 18,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 4.1,
      last_updated: '07/09/2026, 10:23:53',
      active_geofence: 'Jaipur Mining Cluster',
      active_e_ravanna: 'PMPT1040769947',
      input_voltage: 28.6,
      gps_fix: 1,
      vendor: 'TNOWTN',
    },
    {
      id: 'VEH-PROD-RAWANNA-02',
      reg_no: 'RJ27GD1041',
      imei: '861819083751561',
      vehicle_type: 'Heavy Tipper',
      driver_name: 'BABU LAL RAYAKA',
      driver_phone: '+91 96872 62425',
      capacity_tonnes: 30.0,
      mineral_type: 'Bajri',
      status: 'MOVING',
      last_latitude: 25.010,
      last_longitude: 74.618,
      last_speed: 30.0,
      last_heading: 180.0,
      last_altitude: 215.0,
      last_satellites: 17,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 4.1,
      last_updated: '07/09/2026, 10:23:53',
      active_geofence: 'Bhilwara-Chittorgarh Corridor',
      active_e_ravanna: 'HAJS1040770053',
      input_voltage: 28.2,
      gps_fix: 1,
      vendor: 'BULL',
    },
    {
      id: 'VEH-PROD-RAWANNA-03',
      reg_no: 'RJ47GC7088',
      imei: '861819083751562',
      vehicle_type: 'Dumper',
      driver_name: 'Madan Lal',
      driver_phone: '+91 94140 12345',
      capacity_tonnes: 25.0,
      mineral_type: 'Sandstone',
      status: 'MOVING',
      last_latitude: 25.875,
      last_longitude: 72.801,
      last_speed: 6.6,
      last_heading: 120.0,
      last_altitude: 180.0,
      last_satellites: 14,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 4.1,
      last_updated: '07/09/2026, 10:23:53',
      active_geofence: 'Luni Mining Zone',
      active_e_ravanna: 'N/A',
      input_voltage: 27.5,
      gps_fix: 1,
      vendor: 'BULL',
    },
    {
      id: 'VEH-PROD-01',
      reg_no: 'RJ19GH6551',
      imei: '358250331998811',
      vehicle_type: 'Heavy Tipper',
      driver_name: 'Driver 1',
      driver_phone: '+91 98290 00001',
      capacity_tonnes: 32.0,
      mineral_type: 'Sandstone',
      status: 'MOVING',
      last_latitude: 25.882,
      last_longitude: 72.81,
      last_speed: 56.0,
      last_heading: 320.0,
      last_altitude: 180.0,
      last_satellites: 16,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 4.0,
      last_updated: '04/09/2026, 14:54:39',
      active_geofence: 'Luni Mineral Zone',
      active_e_ravanna: 'N/A',
      input_voltage: 27.0,
      gps_fix: 1,
      vendor: 'iTriangle',
    },
    {
      id: 'VEH-PROD-02',
      reg_no: 'RJ19GG5048',
      imei: '358250331418425',
      vehicle_type: 'Heavy Tipper',
      driver_name: 'Driver 2',
      driver_phone: '+91 98290 00002',
      capacity_tonnes: 30.0,
      mineral_type: 'Sandstone',
      status: 'MOVING',
      last_latitude: 25.877221,
      last_longitude: 72.803453,
      last_speed: 14.0,
      last_heading: 335.0,
      last_altitude: 175.0,
      last_satellites: 15,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 4.0,
      last_updated: '04/09/2026, 14:54:40',
      active_geofence: 'Luni River Corridor',
      active_e_ravanna: 'N/A',
      input_voltage: 27.0,
      gps_fix: 1,
      vendor: 'iTriangle',
    },
    {
      id: 'VEH-PROD-03',
      reg_no: 'RJ09GB3503',
      imei: '358250331776655',
      vehicle_type: 'Heavy Tipper',
      driver_name: 'Driver 3',
      driver_phone: '+91 98290 00003',
      capacity_tonnes: 32.0,
      mineral_type: 'Marble',
      status: 'MOVING',
      last_latitude: 25.87,
      last_longitude: 72.795,
      last_speed: 48.0,
      last_heading: 140.0,
      last_altitude: 170.0,
      last_satellites: 14,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 4.0,
      last_updated: '04/09/2026, 14:54:35',
      active_geofence: 'Luni Mineral Zone',
      active_e_ravanna: 'N/A',
      input_voltage: 27.0,
      gps_fix: 1,
      vendor: 'iTriangle',
    },
    {
      id: 'VEH-01',
      reg_no: 'RJ06GB7122',
      imei: '353201353161596',
      vehicle_type: '14-Wheel Heavy Tipper',
      driver_name: 'Suresh Meena',
      driver_phone: '+91 98290 11223',
      capacity_tonnes: 32.0,
      mineral_type: 'White Marble',
      status: 'MOVING',
      last_latitude: 26.9124,
      last_longitude: 75.7873,
      last_speed: 35.4,
      last_heading: 142.0,
      last_altitude: 234.6,
      last_satellites: 14,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 3.9,
      last_updated: '31/08/2026, 18:21:32',
      active_geofence: 'Makrana Marble Mining Cluster',
      active_e_ravanna: 'N/A',
      input_voltage: 13.0,
      gps_fix: 1,
      vendor: 'BULL',
    },
    {
      id: 'VEH-02',
      reg_no: 'RJ04GC1587',
      imei: '358250331418425',
      vehicle_type: '10-Wheel Dump Truck',
      driver_name: 'Vikram Singh',
      driver_phone: '+91 94140 22334',
      capacity_tonnes: 25.0,
      mineral_type: 'Sandstone',
      status: 'MOVING',
      last_latitude: 26.298,
      last_longitude: 73.018,
      last_speed: 22.0,
      last_heading: 210.0,
      last_altitude: 171.0,
      last_satellites: 12,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 4.0,
      last_updated: '01/09/2026, 10:51:30',
      active_geofence: 'Jodhpur Sandstone Basin',
      active_e_ravanna: 'N/A',
      input_voltage: 27.0,
      gps_fix: 1,
      vendor: 'iTriangle',
    },
    {
      id: 'VEH-03',
      reg_no: 'RJ04GA5970',
      imei: '358250331443621',
      vehicle_type: '14-Wheel Tipper',
      driver_name: 'Ramesh Kumar',
      driver_phone: '+91 98290 33445',
      capacity_tonnes: 32.0,
      mineral_type: 'White Marble',
      status: 'MOVING',
      last_latitude: 27.0425,
      last_longitude: 74.7214,
      last_speed: 42.0,
      last_heading: 110.0,
      last_altitude: 95.0,
      last_satellites: 15,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 4.0,
      last_updated: '01/09/2026, 10:45:12',
      active_geofence: 'Makrana Marble Block IV',
      active_e_ravanna: 'N/A',
      input_voltage: 27.0,
      gps_fix: 1,
      vendor: 'BULL',
    },
    {
      id: 'VEH-04',
      reg_no: 'RJ09GC1675',
      imei: '358250331525229',
      vehicle_type: 'Multi-Axle Tipper',
      driver_name: 'Mohan Lal Sharma',
      driver_phone: '+91 94140 44556',
      capacity_tonnes: 35.0,
      mineral_type: 'Soapstone & Feldspar',
      status: 'MOVING',
      last_latitude: 25.348,
      last_longitude: 74.638,
      last_speed: 20.0,
      last_heading: 85.0,
      last_altitude: 321.0,
      last_satellites: 11,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 4.0,
      last_updated: '01/09/2026, 10:38:00',
      active_geofence: 'Bhilwara Soapstone Area',
      active_e_ravanna: 'N/A',
      input_voltage: 27.0,
      gps_fix: 1,
      vendor: 'iTriangle',
    },
    {
      id: 'VEH-05',
      reg_no: 'RJ27GD4130',
      imei: '358250331536077',
      vehicle_type: 'Heavy Mineral Dumper',
      driver_name: 'Dinesh Gurjar',
      driver_phone: '+91 97841 66778',
      capacity_tonnes: 30.0,
      mineral_type: 'Marble & Granite',
      status: 'MOVING',
      last_latitude: 24.585,
      last_longitude: 73.712,
      last_speed: 48.0,
      last_heading: 195.0,
      last_altitude: 24.0,
      last_satellites: 16,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 4.0,
      last_updated: '01/09/2026, 10:30:25',
      active_geofence: 'Udaipur Mineral Corridor',
      active_e_ravanna: 'N/A',
      input_voltage: 27.0,
      gps_fix: 1,
      vendor: 'BULL',
    },
    {
      id: 'VEH-06',
      reg_no: 'RJ06GD0209',
      imei: '358250331597939',
      vehicle_type: '14-Wheel Tipper',
      driver_name: 'Bhawani Singh',
      driver_phone: '+91 94142 88990',
      capacity_tonnes: 34.0,
      mineral_type: 'Soapstone & Feldspar',
      status: 'MOVING',
      last_latitude: 25.352,
      last_longitude: 74.645,
      last_speed: 37.0,
      last_heading: 270.0,
      last_altitude: 629.0,
      last_satellites: 14,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 4.0,
      last_updated: '01/09/2026, 10:22:15',
      active_geofence: 'Bhilwara Mining Zone B',
      active_e_ravanna: 'N/A',
      input_voltage: 27.0,
      gps_fix: 1,
      vendor: 'iTriangle',
    },
    {
      id: 'VEH-07',
      reg_no: 'RJ04GB2835',
      imei: '358250331634633',
      vehicle_type: '10-Wheel Dump Truck',
      driver_name: 'Kailash Choudhary',
      driver_phone: '+91 96023 55667',
      capacity_tonnes: 28.0,
      mineral_type: 'Yellow Limestone',
      status: 'MOVING',
      last_latitude: 26.915,
      last_longitude: 70.908,
      last_speed: 14.0,
      last_heading: 45.0,
      last_altitude: 400.0,
      last_satellites: 13,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 4.0,
      last_updated: '01/09/2026, 10:15:40',
      active_geofence: 'Jaisalmer Limestone Block',
      active_e_ravanna: 'N/A',
      input_voltage: 27.0,
      gps_fix: 1,
      vendor: 'BULL',
    },
    {
      id: 'VEH-08',
      reg_no: 'RJ19GF3208',
      imei: '359926590002419',
      vehicle_type: 'Heavy Tipper',
      driver_name: 'Govind Ram',
      driver_phone: '+91 98288 77889',
      capacity_tonnes: 32.0,
      mineral_type: 'Sandstone',
      status: 'MOVING',
      last_latitude: 26.295,
      last_longitude: 73.025,
      last_speed: 53.5,
      last_heading: 160.0,
      last_altitude: 216.9,
      last_satellites: 15,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 4.1,
      last_updated: '01/09/2026, 10:10:05',
      active_geofence: 'Jodhpur Sandstone Basin',
      active_e_ravanna: 'N/A',
      input_voltage: 26.6,
      gps_fix: 1,
      vendor: 'iTriangle',
    },
    {
      id: 'VEH-09',
      reg_no: 'RJ21GE5747',
      imei: '359926590014687',
      vehicle_type: '14-Wheel Tipper',
      driver_name: 'Mahesh Verma',
      driver_phone: '+91 94145 99001',
      capacity_tonnes: 35.0,
      mineral_type: 'White Marble',
      status: 'MOVING',
      last_latitude: 27.048,
      last_longitude: 74.728,
      last_speed: 51.0,
      last_heading: 120.0,
      last_altitude: 211.5,
      last_satellites: 14,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 4.1,
      last_updated: '01/09/2026, 10:05:30',
      active_geofence: 'Makrana Marble Block IV',
      active_e_ravanna: 'N/A',
      input_voltage: 28.2,
      gps_fix: 1,
      vendor: 'BULL',
    },
    {
      id: 'VEH-10',
      reg_no: 'RJ07GD1217',
      imei: '359926590045228',
      vehicle_type: '10-Wheel Dump Truck',
      driver_name: 'Prem Chand',
      driver_phone: '+91 96028 11234',
      capacity_tonnes: 26.0,
      mineral_type: 'Gypsum',
      status: 'MOVING',
      last_latitude: 28.0229,
      last_longitude: 73.3119,
      last_speed: 6.7,
      last_heading: 330.0,
      last_altitude: 407.0,
      last_satellites: 12,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 4.1,
      last_updated: '01/09/2026, 09:58:14',
      active_geofence: 'Bikaner Gypsum Quarry',
      active_e_ravanna: 'N/A',
      input_voltage: 28.6,
      gps_fix: 1,
      vendor: 'iTriangle',
    },
  ];
}

function getFallbackGeofences(): GeofenceZone[] {
  return [
    {
      id: 'GF-RAJ-001',
      name: 'Makrana Marble Mining Cluster - Zone A',
      zone_type: 'MINING_LEASE',
      mineral_type: 'White Marble',
      speed_limit: 35,
      center_lat: 27.0425,
      center_lng: 74.7214,
      buffer_meters: 50,
      polygon: [
        { lat: 27.05, lng: 74.71 },
        { lat: 27.052, lng: 74.735 },
        { lat: 27.035, lng: 74.74 },
        { lat: 27.032, lng: 74.715 },
        { lat: 27.05, lng: 74.71 },
      ],
    },
    {
      id: 'GF-RAJ-002',
      name: 'Kishangarh Marble Processing & Stockyard',
      zone_type: 'STOCKYARD',
      mineral_type: 'Marble & Granite',
      speed_limit: 30,
      center_lat: 26.578,
      center_lng: 74.862,
      buffer_meters: 50,
      polygon: [
        { lat: 26.585, lng: 74.85 },
        { lat: 26.587, lng: 74.875 },
        { lat: 26.57, lng: 74.878 },
        { lat: 26.568, lng: 74.852 },
        { lat: 26.585, lng: 74.85 },
      ],
    },
  ];
}

function getFallbackERavanna(): ERavannaPass[] {
  return [
    {
      pass_no: 'ERAV-2026-MKR-0081',
      vehicle_reg_no: 'RJ04GA5970',
      lease_id: 'DMG-MKR-2024-L09',
      lease_name: 'Makrana Marble Block IV',
      mineral_name: 'White Calcite Marble',
      tare_weight_tonnes: 11.2,
      gross_weight_tonnes: 42.6,
      net_weight_tonnes: 31.4,
      permissible_max_tonnes: 32.0,
      dispatch_time: new Date(Date.now() - 7200000).toISOString(),
      valid_upto: new Date(Date.now() + 21600000).toISOString(),
      destination: 'Kishangarh Marble Mandi, Ajmer',
      origin_coords: [27.0425, 74.7214],
      dest_coords: [26.578, 74.862],
      status: 'IN_TRANSIT',
      generation_time: '2026-08-21 09:30 AM',
      trip_start: '2026-08-21 09:45 AM',
      trip_end: 'In Progress',
      deviation: 'No Deviation',
    },
    {
      pass_no: 'ERAV-2026-JDH-0391',
      vehicle_reg_no: 'RJ19GG5048',
      lease_id: 'DMG-JDH-2024-L12',
      lease_name: 'Jodhpur Sandstone Lease #3',
      mineral_name: 'Red & Brown Sandstone',
      tare_weight_tonnes: 10.5,
      gross_weight_tonnes: 38.0,
      net_weight_tonnes: 27.5,
      permissible_max_tonnes: 28.0,
      dispatch_time: new Date(Date.now() - 14400000).toISOString(),
      valid_upto: new Date(Date.now() + 14400000).toISOString(),
      destination: 'Jodhpur Industrial Area Phase 2',
      origin_coords: [26.298, 73.018],
      dest_coords: [26.25, 73.08],
      status: 'IN_TRANSIT',
      generation_time: '2026-08-21 07:15 AM',
      trip_start: '2026-08-21 07:30 AM',
      trip_end: 'In Progress',
      deviation: 'No Deviation',
    },
    {
      pass_no: 'ERAV-2026-BHL-0144',
      vehicle_reg_no: 'RJ42GA5237',
      lease_id: 'DMG-BHL-2024-L04',
      lease_name: 'Bhilwara Soapstone Mines',
      mineral_name: 'Industrial Grade Soapstone',
      tare_weight_tonnes: 9.8,
      gross_weight_tonnes: 34.2,
      net_weight_tonnes: 24.4,
      permissible_max_tonnes: 25.0,
      dispatch_time: new Date(Date.now() - 28800000).toISOString(),
      valid_upto: new Date(Date.now() - 7200000).toISOString(),
      destination: 'Chanderiya Processing Unit, Chittorgarh',
      origin_coords: [25.348, 74.638],
      dest_coords: [24.833, 74.633],
      status: 'COMPLETED',
      generation_time: '2026-08-20 02:00 PM',
      trip_start: '2026-08-20 02:15 PM',
      trip_end: '2026-08-20 08:30 PM',
      deviation: 'No Deviation',
    },
  ];
}

function getFallbackAlerts(): AlertRecord[] {
  return [
    {
      id: 'ALT-1001',
      vehicle_id: 'VEH-01',
      reg_no: 'RJ32GE1805',
      imei: '864920047382910',
      alert_type: 'BATTERY_TAMPER',
      severity: 'HIGH',
      message: 'Vehicle Battery Disconnect',
      latitude: 27.0425,
      longitude: 74.7214,
      speed: 0,
      timestamp: '31/12/2255, 05:34:18',
      is_resolved: false,
    },
    {
      id: 'ALT-1002',
      vehicle_id: 'VEH-02',
      reg_no: 'RJ32GE1805',
      imei: '864920047382910',
      alert_type: 'BATTERY_TAMPER',
      severity: 'HIGH',
      message: 'Vehicle Battery Disconnect',
      latitude: 27.0425,
      longitude: 74.7214,
      speed: 0,
      timestamp: '31/12/2255, 05:34:18',
      is_resolved: false,
    },
    {
      id: 'ALT-1003',
      vehicle_id: 'VEH-03',
      reg_no: 'RJ01AC0000',
      imei: '864920047382911',
      alert_type: 'BATTERY_TAMPER',
      severity: 'HIGH',
      message: 'Vehicle Battery Disconnect',
      latitude: 26.298,
      longitude: 73.018,
      speed: 0,
      timestamp: '23/08/2092, 00:54:37',
      is_resolved: false,
    },
    {
      id: 'ALT-1004',
      vehicle_id: 'VEH-04',
      reg_no: 'RJ01AC0000',
      imei: '864920047382911',
      alert_type: 'BATTERY_TAMPER',
      severity: 'HIGH',
      message: 'Vehicle Battery Disconnect',
      latitude: 26.298,
      longitude: 73.018,
      speed: 0,
      timestamp: '16/08/2083, 14:04:21',
      is_resolved: false,
    },
    {
      id: 'ALT-1005',
      vehicle_id: 'VEH-05',
      reg_no: 'RJ01AC0000',
      imei: '864920047382911',
      alert_type: 'BATTERY_TAMPER',
      severity: 'HIGH',
      message: 'Vehicle Battery Disconnect',
      latitude: 26.298,
      longitude: 73.018,
      speed: 0,
      timestamp: '11/08/2082, 13:52:00',
      is_resolved: false,
    },
    {
      id: 'ALT-1006',
      vehicle_id: 'VEH-06',
      reg_no: 'XXXXXXXXXX',
      imei: '864920047382912',
      alert_type: 'BATTERY_TAMPER',
      severity: 'HIGH',
      message: 'Vehicle Battery Disconnect',
      latitude: 25.348,
      longitude: 74.638,
      speed: 0,
      timestamp: '12/01/2080, 16:18:49',
      is_resolved: false,
    },
    {
      id: 'ALT-1007',
      vehicle_id: 'VEH-07',
      reg_no: 'XXXXXXXXXX',
      imei: '864920047382912',
      alert_type: 'BATTERY_TAMPER',
      severity: 'HIGH',
      message: 'Vehicle Battery Disconnect',
      latitude: 25.348,
      longitude: 74.638,
      speed: 0,
      timestamp: '12/01/2080, 15:12:26',
      is_resolved: false,
    },
    {
      id: 'ALT-1008',
      vehicle_id: 'VEH-08',
      reg_no: 'XXXXXXXXXX',
      imei: '864920047382912',
      alert_type: 'BATTERY_TAMPER',
      severity: 'HIGH',
      message: 'Vehicle Battery Disconnect',
      latitude: 25.348,
      longitude: 74.638,
      speed: 0,
      timestamp: '12/01/2080, 14:45:04',
      is_resolved: false,
    },
    {
      id: 'ALT-1009',
      vehicle_id: 'VEH-09',
      reg_no: 'XXXXXXXXXX',
      imei: '864920047382912',
      alert_type: 'BATTERY_TAMPER',
      severity: 'HIGH',
      message: 'Vehicle Battery Disconnect',
      latitude: 25.348,
      longitude: 74.638,
      speed: 0,
      timestamp: '12/01/2080, 12:52:27',
      is_resolved: false,
    },
    {
      id: 'ALT-1010',
      vehicle_id: 'VEH-10',
      reg_no: 'XXXXXXXXXX',
      imei: '864920047382912',
      alert_type: 'BATTERY_TAMPER',
      severity: 'HIGH',
      message: 'Vehicle Battery Disconnect',
      latitude: 25.348,
      longitude: 74.638,
      speed: 0,
      timestamp: '12/01/2080, 12:21:03',
      is_resolved: false,
    },
  ];
}

function getFallbackGISMeta(): GISMetaResponse {
  return {
    provider: 'Rajdharaa - Department of Information Technology & Communication (DoIT&C)',
    portal_url: 'https://gis.rajasthan.gov.in/',
    state_center: [26.578, 74.862],
    default_zoom: 7,
    layers: [
      {
        id: 'esri-street',
        name: 'Esri World Street Map',
        type: 'tile',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Esri | TomTom | Garmin | METI/NASA | USGS',
        is_default: true,
        max_zoom: 19,
        min_zoom: 5,
      },
      {
        id: 'osm-standard',
        name: 'OpenStreetMap Standard',
        type: 'tile',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors',
        is_default: false,
        max_zoom: 19,
        min_zoom: 5,
      },
      {
        id: 'rajdharaa-satellite-hybrid',
        name: 'Rajdharaa Satellite Hybrid (GIS Rajasthan)',
        type: 'tile',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '© Rajdharaa GIS / DoIT&C Govt. of Rajasthan © Esri World Imagery',
        is_default: false,
        max_zoom: 19,
        min_zoom: 5,
      },
      {
        id: 'rajdharaa-base-carto',
        name: 'Rajdharaa Topographic / Carto Base',
        type: 'tile',
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        attribution: '© Rajdharaa State Spatial Data Infrastructure © CARTO',
        is_default: false,
        max_zoom: 19,
        min_zoom: 5,
      },
      {
        id: 'rajdharaa-dark-night',
        name: 'Rajdharaa Night Surveillance Map',
        type: 'tile',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '© Rajdharaa Mining Surveillance Network © CARTO Dark',
        is_default: false,
        max_zoom: 19,
        min_zoom: 5,
      },
    ],
    checkposts: [
      {
        id: 'NAKA-01',
        name: 'Bagru Mining Vigilance Naka & Weighbridge',
        district: 'Jaipur',
        type: 'WEIGHBRIDGE',
        coordinates: [26.812, 75.542],
        cctv_active: true,
        anpr_active: true,
        daily_scans: 412,
      },
      {
        id: 'NAKA-02',
        name: 'Kishangarh Marble Toll Plaza & Verification Point',
        district: 'Ajmer',
        type: 'CHECKPOST',
        coordinates: [26.578, 74.862],
        cctv_active: true,
        anpr_active: true,
        daily_scans: 680,
      },
    ],
  };
}

function getFallbackTrail(regNo?: string): TelemetryPoint[] {
  const normalized = (regNo || '').toUpperCase().trim();

  // 1. RJ27GD1041: Uncha to Chhoti Sadri authentic route
  if (normalized === 'RJ27GD1041' || normalized.includes('27GD') || normalized.includes('1041')) {
    const unchaRoute: [number, number][] = [
      [25.325, 74.640],
      [25.300, 74.638],
      [25.265, 74.635],
      [25.220, 74.630],
      [25.170, 74.625],
      [25.120, 74.622],
      [25.075, 74.620],
      [25.045, 74.615], // Weighbridge 07955
      [25.010, 74.618],
      [24.960, 74.625],
      [24.910, 74.630],
      [24.888, 74.633],
      [24.840, 74.645],
      [24.780, 74.660],
      [24.720, 74.670],
      [24.660, 74.678],
      [24.580, 74.690],
      [24.500, 74.698],
      [24.440, 74.704],
      [24.381, 74.706], // Destination Madhu, Chhoti Sadri
    ];
    const now = Date.now();
    return unchaRoute.map((coords, i) => ({
      lat: coords[0],
      lng: coords[1],
      speed: i === 7 ? 20 : 30 + (i % 8),
      heading: 180 + (i % 10),
      ignition: true,
      timestamp: new Date(now - (unchaRoute.length - i) * 60000).toISOString(),
    }));
  }

  // 2. RJ14GK0267: Jaipur corridor authentic route
  if (normalized === 'RJ14GK0267' || normalized.includes('14GK')) {
    const jaipurRoute: [number, number][] = [
      [26.912, 75.787],
      [26.890, 75.795],
      [26.865, 75.805],
      [26.830, 75.820],
      [26.805, 75.835],
      [26.780, 75.850],
      [26.750, 75.870],
    ];
    const now = Date.now();
    return jaipurRoute.map((coords, i) => ({
      lat: coords[0],
      lng: coords[1],
      speed: 52.7,
      heading: 155,
      ignition: true,
      timestamp: new Date(now - (jaipurRoute.length - i) * 60000).toISOString(),
    }));
  }

  // 3. Match vehicle's individual base position
  const fallbackList = getFallbackVehicles();
  const match = fallbackList.find((v) => v.reg_no.toUpperCase() === normalized);
  const baseLat = match ? match.last_latitude : 25.877;
  const baseLng = match ? match.last_longitude : 72.803;
  const baseHeading = match ? match.last_heading : 140;

  const now = Date.now();
  const count = 30;
  return Array.from({ length: count }, (_, i) => {
    const progress = (i - count / 2) * 0.003;
    const latOffset = Math.sin((baseHeading * Math.PI) / 180) * progress;
    const lngOffset = Math.cos((baseHeading * Math.PI) / 180) * progress;
    return {
      lat: Number((baseLat + latOffset).toFixed(6)),
      lng: Number((baseLng + lngOffset).toFixed(6)),
      speed: Math.max(10, (match?.last_speed || 35) + (i % 10) - 5),
      heading: (baseHeading + (i % 6) * 2) % 360,
      ignition: true,
      timestamp: new Date(now - (count - i) * 60000).toISOString(),
    };
  });
}

