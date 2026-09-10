export type VehicleStatus = 'MOVING' | 'IDLE' | 'STOPPED' | 'SOS' | 'OVERSPEED';

export type MineralType =
  | 'White Marble'
  | 'Soapstone & Feldspar'
  | 'Sandstone'
  | 'Yellow Limestone'
  | 'Marble & Granite'
  | 'Bajri (River Sand)'
  | 'Gypsum'
  | 'Lignite';

export interface Vehicle {
  id: string;
  reg_no: string;
  imei: string;
  vehicle_type: string;
  driver_name: string;
  driver_phone: string;
  capacity_tonnes: number;
  mineral_type: MineralType | string;
  status: VehicleStatus;
  last_latitude: number;
  last_longitude: number;
  last_speed: number;
  last_heading: number;
  last_altitude: number;
  last_satellites: number;
  last_ignition: boolean;
  last_emergency: boolean;
  last_internal_batt: number;
  last_updated: string;
  active_geofence?: string;
  active_e_ravanna?: string;
  has_active_rawanna?: boolean;
  input_voltage?: number;
  gps_fix?: number;
  vendor?: string;
}

export interface ActiveERawannaResponse {
  has_rawanna: boolean;
  vehicle_no?: string;
  data?: RawannaTransitDetails;
  message?: string;
}

export interface VehicleTelemetryViewDto {
  id?: number;
  imei: string;
  vehicleNo: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  packetDate?: string;
  packetTime?: string;
  satellites?: number;
  altitude?: number;
  operator?: string;
  createdAt?: string;
}

export interface LiveVehicleApiItem {
  vehicle_no: string;
  imei: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  packet_date: string;
  packet_time: string;
  satellites: number;
  altitude: number;
  operator: string;
  ignition: number;
  emergency: number;
  updated_at: string;
}

export interface LiveVehicleApiResponse {
  count: number;
  data: LiveVehicleApiItem[];
}

export interface TelemetryPoint {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  ignition: boolean;
  timestamp: string;
}

export interface TelemetryUpdate {
  vehicle_id: string;
  vehicle_reg_no: string;
  imei: string;
  packet_type: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  altitude: number;
  satellites: number;
  ignition: boolean;
  main_power: boolean;
  internal_batt: number;
  emergency_sos: boolean;
  tamper_alert: boolean;
  status: VehicleStatus;
  timestamp: string;
  active_geofence?: string;
  e_ravanna_pass_no?: string;
  mineral_type?: string;
}

export interface GeofencePoint {
  lat: number;
  lng: number;
}

export interface GeofenceZone {
  id: string;
  name: string;
  zone_type: 'MINING_LEASE' | 'STOCKYARD' | 'CHECKPOST' | 'WEIGHBRIDGE' | 'RESTRICTED';
  mineral_type: string;
  speed_limit: number;
  polygon: GeofencePoint[];
  buffer_meters: number;
  center_lat: number;
  center_lng: number;
}

export interface ERavannaPass {
  pass_no: string;
  vehicle_reg_no: string;
  lease_id: string;
  lease_name: string;
  mineral_name: string;
  tare_weight_tonnes: number;
  gross_weight_tonnes: number;
  net_weight_tonnes: number;
  permissible_max_tonnes: number;
  dispatch_time: string;
  valid_upto: string;
  destination: string;
  origin_coords: [number, number];
  dest_coords: [number, number];
  status: 'IN_TRANSIT' | 'COMPLETED' | 'EXPIRED' | 'ROUTE_DEVIATED' | 'OVERLOADED';
  generation_time?: string;
  trip_start?: string;
  trip_end?: string;
  deviation?: string;
}

export interface AlertRecord {
  id: string;
  vehicle_id: string;
  reg_no: string;
  imei: string;
  alert_type:
    | 'SOS_EMERGENCY'
    | 'OVERSPEED'
    | 'GEOFENCE_BREACH'
    | 'BATTERY_TAMPER'
    | 'ROUTE_DEVIATION'
    | 'IGNITION_ON'
    | 'IGNITION_OFF';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
  is_resolved: boolean;
  resolved_at?: string;
}

export interface FleetStats {
  total_vehicles: number;
  moving: number;
  idle: number;
  stopped: number;
  emergency_sos: number;
  active_e_ravanna: number;
  total_alerts_24h: number;
  total_tonnage_today: number;
}

export interface GISLayerConfig {
  id: string;
  name: string;
  type: string;
  url: string;
  attribution: string;
  is_default: boolean;
  max_zoom: number;
  min_zoom: number;
}

export interface CheckpostFeature {
  id: string;
  name: string;
  district: string;
  type: 'WEIGHBRIDGE' | 'CHECKPOST' | 'TOLL_GATE';
  coordinates: [number, number];
  cctv_active: boolean;
  anpr_active: boolean;
  daily_scans: number;
}

export interface GISMetaResponse {
  provider: string;
  portal_url: string;
  layers: GISLayerConfig[];
  checkposts: CheckpostFeature[];
  state_center: [number, number];
  default_zoom: number;
}

// Alerts API: GET http://localhost:8082/vts/api/vehicle/alerts?limit=50
export interface VehicleAlertApiItem {
  id: number;
  vehicle_no: string;
  imei: string;
  alert_type: string;
  alert_message: string;
  latitude: number;
  longitude: number;
  speed: number;
  packet_date: string;
  packet_time: string;
  created_at: string;
}

export interface VehicleAlertsApiResponse {
  alerts: VehicleAlertApiItem[];
  count: number;
}

// Active e-Rawanna Transit Simulation Types (Point A -> B -> C)
export interface RawannaTransitPoint {
  label: string; // 'A' | 'B' | 'C'
  name: string;
  subtext?: string;
  coords: [number, number];
  type: 'ORIGIN' | 'WEIGHBRIDGE' | 'CONSIGNEE';
}

export interface RawannaTransitDetails {
  pass_no: string;
  vehicle_reg_no: string;
  driver_name: string;
  driver_phone: string;
  mineral_name: string;
  tonnage: string;
  weighbridge_code: string;
  pointA: RawannaTransitPoint;
  pointB: RawannaTransitPoint;
  pointC: RawannaTransitPoint;
  route_coordinates: [number, number][]; // Full route corridor (for backward compatibility)
  planned_route: [number, number][]; // Static authorized baseline corridor Point A -> B -> C
  traveled_route: [number, number][]; // Actual GPS path traversed by the vehicle so far
  deviated_route?: [number, number][]; // Deviated GPS points outside authorized buffer
  is_deviated?: boolean; // Whether vehicle is currently deviated from planned corridor
  deviation_distance_meters?: number; // Current distance from planned corridor
  generated_at: string;
  expire_at: string;
  status: string;
  lessee_name?: string;
  consignee_name?: string;
  consignee_address?: string;
}

// Trip Reports Model matching Production Interface (Image 1, 2 & 3)
export interface TripEndpoint {
  coords: [number, number];
  name: string;
  subtext?: string;
}

export interface TripReportRecord {
  id: number;
  erawana_no: string;
  vehicle_no: string;
  lease_no: string;
  generation_time: string;
  trip_start: string;
  trip_end: string;
  deviation: 'No' | 'Yes';
  trip_status: 'Trip_yet_to_start' | 'In_Transit' | 'Completed' | 'Route_Deviated';
  total_gps_points: number;
  planned_route: [number, number][];
  actual_route: [number, number][];
  deviated_route: [number, number][];
  point_a: TripEndpoint;
  point_b: TripEndpoint;
}

export interface TripReportFilterParams {
  vehicle_no?: string;
  erawana_no?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export interface TripReportApiResponse {
  count: number;
  trips: TripReportRecord[];
}



