/**
 * Centralized API Endpoints Configuration
 * 
 * Single source of truth for all backend services:
 * - VTS Spring Boot Microservice (Telemetry, Live Fleet, e-Rawanna, Alerts, Trip Reports)
 * - Go Ingestion & GIS Server (Geofences, Alerts, Stats, Raw Packets, Simulator)
 * - Authentication & SSO Endpoints
 * - External GIS / ArcGIS & Tile Map Services
 */

// Base Hosts & Prefixes
export const VTS_SPRING_HOST =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_VTS_API_HOST) || 'http://localhost:8082';

export const GO_BACKEND_HOST =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GO_API_HOST) || 'http://localhost:8080';

export const VTS_PROXY_BASE = '/vts/api';
export const GO_API_BASE = `${GO_BACKEND_HOST}/api/v1`;

// Telemetry View Bases
export const SPRING_TELEMETRY_API_BASE = `${VTS_SPRING_HOST}/vts/api/telemetry-view`;
export const PROXY_TELEMETRY_API_BASE = `${VTS_PROXY_BASE}/telemetry-view`;
export const API_BASE = GO_API_BASE;

// Individual Auth Endpoints for backward compatibility
export const loginUrl = `${VTS_PROXY_BASE}/auth/login`;
export const changePassword = `${VTS_PROXY_BASE}/auth/changePassword`;
export const changeuserpassword = `${VTS_PROXY_BASE}/auth/changeUserPassword`;
export const mobileApiloginforweb = `${VTS_PROXY_BASE}/auth/mobileLogin`;
export const checkDeviceFitmentStatus = `${VTS_PROXY_BASE}/checkDeviceFitmentStatus`;

/**
 * Structured API Configuration
 */
export const API_CONFIG = {
  // Base URLs
  HOSTS: {
    vtsSpring: VTS_SPRING_HOST,
    goBackend: GO_BACKEND_HOST,
    vtsProxy: VTS_PROXY_BASE,
    goApi: GO_API_BASE,
  },

  // Authentication & Profile Services
  AUTH: {
    login: `${VTS_PROXY_BASE}/auth/login`,
    loginDirect: `${VTS_SPRING_HOST}/vts/api/auth/login`,
    changePassword: `${VTS_PROXY_BASE}/auth/changePassword`,
    changeUserPassword: `${VTS_PROXY_BASE}/auth/changeUserPassword`,
    mobileLogin: `${VTS_PROXY_BASE}/auth/mobileLogin`,
    checkFitmentStatus: `${VTS_PROXY_BASE}/checkDeviceFitmentStatus`,
    ssoPortal: 'https://sso.rajasthan.gov.in/',
  },

  // Telemetry View Endpoints
  TELEMETRY: {
    springBase: SPRING_TELEMETRY_API_BASE,
    proxyBase: PROXY_TELEMETRY_API_BASE,
    latest: (vehicleNo: string) => `/latest?vehicleNo=${encodeURIComponent(vehicleNo)}`,
    recent: (vehicleNo: string, limit: number = 100) =>
      `/recent?vehicleNo=${encodeURIComponent(vehicleNo)}&limit=${limit}`,
    recentAll: (limit: number = 100) => `/recent-all?limit=${limit}`,
  },

  // Vehicle Fleet Endpoints
  VEHICLE: {
    liveDirect: (activeOnly: boolean = true) =>
      `${VTS_SPRING_HOST}/vts/api/vehicle/live${activeOnly ? '?activeOnly=true' : ''}`,
    liveProxy: (activeOnly: boolean = true) =>
      `${VTS_PROXY_BASE}/vehicle/live${activeOnly ? '?activeOnly=true' : ''}`,
    deviceLiveData: (imei: string) =>
      `${VTS_PROXY_BASE}/device/live-data?imei=${encodeURIComponent(imei)}`,
  },

  // e-Rawanna Transit & Corridor Endpoints
  ERAWANNA: {
    activeCandidates: (vehicleNo: string, passNo?: string) => {
      const query = passNo
        ? `vehicleNo=${encodeURIComponent(vehicleNo)}&passNo=${encodeURIComponent(passNo)}`
        : `vehicleNo=${encodeURIComponent(vehicleNo)}`;
      return [
        `${VTS_SPRING_HOST}/vts/api/vehicle/erawanna/active?${query}`,
        `${VTS_PROXY_BASE}/vehicle/erawanna/active?${query}`,
        `${VTS_SPRING_HOST}/vts/api/erawanna/active?${query}`,
      ];
    },
    routesCandidates: (vehicleNo: string) => [
      `${VTS_SPRING_HOST}/vts/api/vehicle/erawanna/routes?vehicleNo=${encodeURIComponent(vehicleNo)}`,
      `${VTS_PROXY_BASE}/vehicle/erawanna/routes?vehicleNo=${encodeURIComponent(vehicleNo)}`,
      `${VTS_SPRING_HOST}/vts/api/erawanna/routes?vehicleNo=${encodeURIComponent(vehicleNo)}`,
    ],
    switchTripCandidates: () => [
      `${VTS_SPRING_HOST}/vts/api/vehicle/erawanna/switch-trip`,
      `${VTS_PROXY_BASE}/vehicle/erawanna/switch-trip`,
      `${VTS_SPRING_HOST}/vts/api/erawanna/switch-trip`,
    ],
    passes: `${GO_API_BASE}/erawanna`,
    commonSlip: (referenceNo: string) => `${VTS_PROXY_BASE}/erawanna/slip/${encodeURIComponent(referenceNo)}`,
  },

  // Alerts & Incident Management Endpoints
  ALERTS: {
    direct: (limit: number = 50) => `${VTS_SPRING_HOST}/vts/api/vehicle/alerts?limit=${limit}`,
    proxy: (limit: number = 50) => `${VTS_PROXY_BASE}/vehicle/alerts?limit=${limit}`,
    goAlerts: `${GO_API_BASE}/alerts`,
    resolve: (alertId: string) => `${GO_API_BASE}/alerts/${encodeURIComponent(alertId)}/resolve`,
  },

  // Trip Reports Endpoints
  TRIP_REPORTS: {
    direct: (qs: string = '') => `${VTS_SPRING_HOST}/vts/api/vehicle/trip-reports${qs}`,
    proxy: (qs: string = '') => `${VTS_PROXY_BASE}/vehicle/trip-reports${qs}`,
  },

  // Geofences & Lease Boundaries Endpoints
  GEOFENCES: {
    list: `${GO_API_BASE}/geofences`,
  },

  // Fleet Statistics
  STATS: {
    fleet: `${GO_API_BASE}/stats`,
  },

  // GIS Layers & Basemaps
  GIS: {
    layers: `${GO_API_BASE}/gis/layers`,
    portalUrl: 'https://gis.rajasthan.gov.in/',
    arcgisReverseGeocode:
      'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode',
    arcgisFindAddress:
      'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates',
    tileServers: {
      arcgisStreet:
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      arcgisSatellite:
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      cartoVoyager:
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      cartoDark:
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    },
  },

  // Raw AIS-140 Packet Feed
  PACKETS: {
    raw: `${GO_API_BASE}/packets/raw`,
  },

  // Fleet Simulator
  SIMULATOR: {
    trigger: `${GO_API_BASE}/simulator/trigger`,
  },

  // Contact Details & External Links
  CONTACT: {
    directorateOffice: 'Directorate, Mines and Geology Udaipur.(Raj)',
    directorateTel: '0294- 2415091 (Ext.-201)',
    directorateEmail: 'director.uda.mg@rajasthan.gov.in',
  },

  // Backward compatibility alias keys
  loginUrl,
  changePassword,
  changeuserpassword,
  mobileApiloginforweb,
  checkDeviceFitmentStatus,
};
