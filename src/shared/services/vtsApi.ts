import type {
  AlertRecord,
  ERavannaPass,
  FleetStats,
  GeofenceZone,
  GISMetaResponse,
  TelemetryPoint,
  Vehicle,
} from '../types/vts.types';

const API_BASE = 'http://localhost:8080/api/v1';

export const vtsApi = {
  async getVehicles(): Promise<Vehicle[]> {
    try {
      const res = await fetch(`${API_BASE}/vehicles`);
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      const data = await res.json();
      return data.data || [];
    } catch {
      return getFallbackVehicles();
    }
  },

  async getVehicleDetail(regNo: string): Promise<Vehicle | null> {
    try {
      const res = await fetch(`${API_BASE}/vehicles/${regNo}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  },

  async getVehicleTrail(regNo: string): Promise<TelemetryPoint[]> {
    try {
      const res = await fetch(`${API_BASE}/vehicles/${regNo}/trail`);
      if (!res.ok) throw new Error('Failed to fetch trail');
      const data = await res.json();
      return data.trail || [];
    } catch {
      return getFallbackTrail(regNo);
    }
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

  async triggerSimulatorEvent(vehicleRegNo: string, eventType: string): Promise<any> {
    const res = await fetch(`${API_BASE}/simulator/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle_reg_no: vehicleRegNo, event_type: eventType }),
    });
    return await res.json();
  },
};

// Fallback data for ultra-robust offline rendering
function getFallbackVehicles(): Vehicle[] {
  return [
    {
      id: 'VEH-RAJ-01',
      reg_no: 'RJ14-GB-9821',
      imei: '864920047382910',
      vehicle_type: '14-Wheel Heavy Tipper',
      driver_name: 'Mohan Lal Sharma',
      driver_phone: '+91 98290 12345',
      capacity_tonnes: 32.0,
      mineral_type: 'White Marble',
      status: 'MOVING',
      last_latitude: 27.0425,
      last_longitude: 74.7214,
      last_speed: 44.5,
      last_heading: 142.0,
      last_altitude: 410.0,
      last_satellites: 14,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 4.15,
      last_updated: new Date().toISOString(),
      active_geofence: 'Makrana Marble Mining Cluster',
      active_e_ravanna: 'ERAV-2026-MKR-0081',
    },
    {
      id: 'VEH-RAJ-02',
      reg_no: 'RJ27-GA-4512',
      imei: '864920047382921',
      vehicle_type: '10-Wheel Dump Truck',
      driver_name: 'Suresh Meena',
      driver_phone: '+91 94140 56789',
      capacity_tonnes: 25.0,
      mineral_type: 'Soapstone & Feldspar',
      status: 'MOVING',
      last_latitude: 25.348,
      last_longitude: 74.638,
      last_speed: 38.0,
      last_heading: 85.0,
      last_altitude: 425.0,
      last_satellites: 12,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 4.08,
      last_updated: new Date().toISOString(),
      active_geofence: 'Bhilwara Soapstone Area',
      active_e_ravanna: 'ERAV-2026-BHL-0144',
    },
    {
      id: 'VEH-RAJ-03',
      reg_no: 'RJ19-UB-7734',
      imei: '864920047382932',
      vehicle_type: 'Heavy Mineral Dumper',
      driver_name: 'Kailash Choudhary',
      driver_phone: '+91 96023 44556',
      capacity_tonnes: 28.0,
      mineral_type: 'Sandstone',
      status: 'MOVING',
      last_latitude: 26.298,
      last_longitude: 73.018,
      last_speed: 52.0,
      last_heading: 210.0,
      last_altitude: 260.0,
      last_satellites: 15,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 4.2,
      last_updated: new Date().toISOString(),
      active_geofence: 'Jodhpur Sandstone Basin',
      active_e_ravanna: 'ERAV-2026-JDH-0391',
    },
    {
      id: 'VEH-RAJ-04',
      reg_no: 'RJ15-TA-2190',
      imei: '864920047382943',
      vehicle_type: 'Multi-Axle Trailer',
      driver_name: 'Rajender Singh',
      driver_phone: '+91 97841 22334',
      capacity_tonnes: 35.0,
      mineral_type: 'Yellow Limestone',
      status: 'MOVING',
      last_latitude: 26.915,
      last_longitude: 70.908,
      last_speed: 48.0,
      last_heading: 45.0,
      last_altitude: 220.0,
      last_satellites: 11,
      last_ignition: true,
      last_emergency: false,
      last_internal_batt: 3.98,
      last_updated: new Date().toISOString(),
      active_geofence: 'Jaisalmer Limestone Block',
      active_e_ravanna: 'ERAV-2026-JSL-0092',
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
      vehicle_reg_no: 'RJ14-GB-9821',
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
    },
  ];
}

function getFallbackAlerts(): AlertRecord[] {
  return [
    {
      id: 'ALT-1001',
      vehicle_id: 'VEH-RAJ-01',
      reg_no: 'RJ14-GB-9821',
      imei: '864920047382910',
      alert_type: 'OVERSPEED',
      severity: 'HIGH',
      message: 'Vehicle exceeded mining zone speed limit (Logged: 62.4 km/h, Limit: 35 km/h)',
      latitude: 27.0425,
      longitude: 74.7214,
      speed: 62.4,
      timestamp: new Date(Date.now() - 1500000).toISOString(),
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
        id: 'rajdharaa-satellite-hybrid',
        name: 'Rajdharaa Satellite Hybrid (GIS Rajasthan)',
        type: 'tile',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '© Rajdharaa GIS / DoIT&C Govt. of Rajasthan',
        is_default: true,
        max_zoom: 19,
        min_zoom: 5,
      },
      {
        id: 'rajdharaa-base-carto',
        name: 'Rajdharaa Topographic Base',
        type: 'tile',
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        attribution: '© Rajdharaa Spatial Data Infrastructure',
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

function getFallbackTrail(_regNo: string): TelemetryPoint[] {
  const now = Date.now();
  return Array.from({ length: 25 }, (_, i) => ({
    lat: 27.0425 - i * 0.008,
    lng: 74.7214 + i * 0.006,
    speed: 35 + (i % 15),
    heading: 140 + (i % 20),
    ignition: true,
    timestamp: new Date(now - (25 - i) * 60000).toISOString(),
  }));
}
