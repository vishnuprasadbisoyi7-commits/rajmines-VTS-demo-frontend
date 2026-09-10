import type { RawannaTransitDetails, Vehicle, TelemetryPoint } from '../types/vts.types';

// DUMMY DATA COMMENTED OUT: Pre-defined authentic transit route from Uncha 2 to Chhoti Sadri
/*
const UNCHA_CHHOTI_SADRI_ROUTE: [number, number][] = [
  [25.325, 74.640], // Point A: UNCHA 2
  [25.300, 74.638],
  [25.265, 74.635],
  [25.220, 74.630],
  [25.170, 74.625],
  [25.120, 74.622],
  [25.075, 74.620],
  [25.045, 74.615], // Point B: Weighbridge 07955
  [25.010, 74.618],
  [24.960, 74.625],
  [24.910, 74.630],
  [24.888, 74.633], // Chittorgarh
  [24.840, 74.645],
  [24.780, 74.660],
  [24.720, 74.670],
  [24.660, 74.678], // Nimbahera
  [24.580, 74.690],
  [24.500, 74.698],
  [24.440, 74.704],
  [24.381, 74.706], // Point C: Consignee MADHU, CHHOTI SADRI
];

// DUMMY DATA COMMENTED OUT: Route for Jaipur region
const JAIPUR_ROUTE: [number, number][] = [
  [26.912, 75.787], // Point A: Dhani Maliyan
  [26.890, 75.795],
  [26.865, 75.805],
  [26.830, 75.820], // Point B: Weighbridge
  [26.805, 75.835],
  [26.780, 75.850],
  [26.750, 75.870], // Point C: Consignee Ramavatar
];
*/

// Helper: Haversine distance in meters between two lat/lng coordinates
function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Distance from point P to line segment AB in meters
function distanceToSegmentMeters(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): number {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return haversineDistanceMeters(px, py, ax, ay);

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projLat = ax + t * dx;
  const projLng = ay + t * dy;
  return haversineDistanceMeters(px, py, projLat, projLng);
}

// Helper: Minimum distance from point to polyline in meters
function minDistanceToPolylineMeters(
  point: [number, number],
  polyline: [number, number][]
): number {
  if (polyline.length < 2) return 0;
  let minD = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = distanceToSegmentMeters(point, polyline[i], polyline[i + 1]);
    if (d < minD) minD = d;
  }
  return minD;
}

// Helper: Interpolate points between two coordinates
export function interpolateWaypoints(
  start: [number, number],
  end: [number, number],
  steps: number
): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 1; i < steps; i++) {
    const f = i / steps;
    points.push([start[0] + (end[0] - start[0]) * f, start[1] + (end[1] - start[1]) * f]);
  }
  return points;
}

/**
 * Extracts strictly the CURRENT active one-way trip (Point A -> Point B -> Point C).
 * Eliminates criss-crossing zig-zags caused by simulation loop resets (sudden jump > 1500m)
 * or historical points accumulated from previous simulation loops.
 */
function extractCurrentOneWayTrip(
  historyPoints: [number, number][],
  originCoords: [number, number]
): [number, number][] {
  if (!historyPoints || historyPoints.length === 0) return [];

  // Find the last simulation loop reset or teleportation jump
  let lastJumpIdx = 0;
  for (let i = 1; i < historyPoints.length; i++) {
    const prev = historyPoints[i - 1];
    const curr = historyPoints[i];
    const dist = haversineDistanceMeters(prev[0], prev[1], curr[0], curr[1]);
    // A sudden jump > 1500m in consecutive telemetry points indicates a simulation loop reset back to Point A
    if (dist > 1500) {
      lastJumpIdx = i;
    }
  }

  // Take only the contiguous telemetry points from the latest active one-way trip
  const tripPoints = historyPoints.slice(lastJumpIdx);

  // Filter out any anomalous telemetry points located outside the broader 180km regional boundary
  const filtered = tripPoints.filter(
    (pt) => haversineDistanceMeters(pt[0], pt[1], originCoords[0], originCoords[1]) < 180000
  );

  return filtered.length > 0 ? filtered : tripPoints;
}

// 1. Authentic 18-point one-way Highway Corridors matching simulation Excel files:
export const jaipurCorridorPlanned: [number, number][] = [
  [26.78278, 76.07351], [26.78428, 76.06222], [26.78309, 76.05607], [26.77168, 76.05215],
  [26.76387, 76.04650], [26.76347, 76.03656], [26.76476, 76.02370], [26.75845, 76.00586],
  [26.73632, 75.99620], [26.72478, 75.99204], [26.71503, 75.98179], [26.72329, 75.96313],
  [26.72562, 75.94404], [26.72203, 75.92590], [26.70979, 75.90233], [26.70453, 75.89276],
  [26.70737, 75.88502], [26.70990, 75.88402]
];

export const abuRoadCorridorPlanned: [number, number][] = [
  [24.87505, 72.84423], [24.86930, 72.83808], [24.86578, 72.83403], [24.86002, 72.82727],
  [24.85589, 72.82137], [24.84986, 72.81492], [24.84346, 72.80992], [24.83613, 72.80487],
  [24.83269, 72.80038], [24.83122, 72.79461], [24.82838, 72.79112], [24.82286, 72.78719],
  [24.81433, 72.78100], [24.80615, 72.77418], [24.80217, 72.76986], [24.79823, 72.76403],
  [24.79530, 72.75582], [24.79705, 72.75560]
];

export const ajmerCorridorPlanned: [number, number][] = [
  [26.91236, 75.78727], [26.85508, 75.73398], [26.79823, 75.68010], [26.74324, 75.62442],
  [26.68817, 75.56865], [26.63818, 75.50916], [26.59969, 75.44102], [26.56114, 75.37279],
  [26.52265, 75.30464], [26.51227, 75.22745], [26.50404, 75.14960], [26.49575, 75.07171],
  [26.48746, 74.99387], [26.47918, 74.91596], [26.47093, 74.83814], [26.46264, 74.76020],
  [26.45438, 74.68236], [26.45026, 74.64344]
];

// Stable corridor cache so planned route and landmarks A, B, C remain permanently fixed during tracking
interface CorridorDef {
  pointA: [number, number];
  pointB: [number, number];
  pointC: [number, number];
  plannedRoute: [number, number][];
}

const vehicleCorridorCache = new Map<string, CorridorDef>();

export function buildTransitDetailsWithLiveTelemetry(
  backendRawanna: RawannaTransitDetails,
  vehicle: Vehicle,
  historyPoints?: TelemetryPoint[]
): RawannaTransitDetails {
  const currPos: [number, number] = [
    Number(vehicle.last_latitude) || backendRawanna.pointA.coords[0],
    Number(vehicle.last_longitude) || backendRawanna.pointA.coords[1],
  ];

  const rawHistoryCoords: [number, number][] =
    historyPoints && historyPoints.length > 0
      ? historyPoints.map((p) => [p.lat, p.lng] as [number, number])
      : [];

  // Extract strictly the CURRENT active one-way trip (A -> B -> C)
  const historyCoords = extractCurrentOneWayTrip(rawHistoryCoords, backendRawanna.pointA.coords);

  if (historyCoords.length === 0) {
    historyCoords.push(currPos);
  } else {
    const last = historyCoords[historyCoords.length - 1];
    if (Math.abs(last[0] - currPos[0]) > 0.00001 || Math.abs(last[1] - currPos[1]) > 0.00001) {
      historyCoords.push(currPos);
    }
  }

  const traveledRoute: [number, number][] = [];
  if (
    historyCoords.length > 0 &&
    (Math.abs(historyCoords[0][0] - backendRawanna.pointA.coords[0]) > 0.001 ||
     Math.abs(historyCoords[0][1] - backendRawanna.pointA.coords[1]) > 0.001)
  ) {
    traveledRoute.push(backendRawanna.pointA.coords);
  }
  traveledRoute.push(...historyCoords);

  const planned = backendRawanna.planned_route || backendRawanna.route_coordinates;
  const distToPlanned = minDistanceToPolylineMeters(currPos, planned);
  const DEVIATION_BUFFER_METERS = 200;
  const isDeviated = distToPlanned > DEVIATION_BUFFER_METERS;

  const deviatedRoute: [number, number][] = [];
  if (isDeviated) {
    for (const pt of historyCoords) {
      if (minDistanceToPolylineMeters(pt, planned) > DEVIATION_BUFFER_METERS) {
        deviatedRoute.push(pt);
      }
    }
    if (deviatedRoute.length === 0) {
      deviatedRoute.push(currPos);
    }
  }

  const statusText = isDeviated
    ? 'Route Deviation Detected'
    : vehicle.status === 'MOVING'
    ? 'In Transit (On Route)'
    : 'Halted (On Route)';

  return {
    ...backendRawanna,
    vehicle_reg_no: vehicle.reg_no,
    route_coordinates: planned,
    planned_route: planned,
    traveled_route: traveledRoute,
    deviated_route: deviatedRoute,
    is_deviated: isDeviated,
    deviation_distance_meters: Math.round(distToPlanned),
    status: statusText,
    generated_at: backendRawanna.generated_at || vehicle.last_updated || new Date().toLocaleTimeString('en-GB'),
  };
}

export function getRawannaTransitForVehicle(
  vehicle: Vehicle,
  historyPoints?: TelemetryPoint[],
  backendRawanna?: RawannaTransitDetails | null
): RawannaTransitDetails | null {
  // 1. If backend provided authentic e-Rawanna, build dynamically using the backend's planned route
  if (backendRawanna) {
    return buildTransitDetailsWithLiveTelemetry(backendRawanna, vehicle, historyPoints);
  }

  // 2. Strict policy: If vehicle has no active e-Rawanna generated, return null
  if (!vehicle.has_active_rawanna && (!vehicle.active_e_ravanna || vehicle.active_e_ravanna === 'N/A')) {
    return null;
  }

  const regKey = (vehicle.reg_no || '').toUpperCase().trim();
  const currPos: [number, number] = [
    Number(vehicle.last_latitude) || 26.5081,
    Number(vehicle.last_longitude) || 75.1885,
  ];

  // 3. Known active e-Rawanna corridors matching authentic simulation routes
  let corridor = vehicleCorridorCache.get(regKey);
  if (!corridor) {
    if (
      regKey.includes('2009') ||
      regKey.includes('GL2009') ||
      regKey.includes('2003') ||
      regKey.includes('GL2003') ||
      regKey.includes('2006') ||
      regKey.includes('GL2006')
    ) {
      // Jaipur Southwest Transit Corridor: Bassi Mining Lease (A) -> NH 21 Weighbridge (B) -> Jaipur Hub (C)
      corridor = {
        pointA: jaipurCorridorPlanned[0],
        pointB: jaipurCorridorPlanned[11],
        pointC: jaipurCorridorPlanned[jaipurCorridorPlanned.length - 1],
        plannedRoute: jaipurCorridorPlanned,
      };
      vehicleCorridorCache.set(regKey, corridor);
    } else if (
      regKey.includes('2010') ||
      regKey.includes('AA2010') ||
      regKey.includes('2004') ||
      regKey.includes('AA2004') ||
      regKey.includes('2007') ||
      regKey.includes('AA2007')
    ) {
      // Abu Road / Sirohi Corridor: Pindwara Mining Lease (A) -> NH 27 Weighbridge (B) -> Abu Road Hub (C)
      corridor = {
        pointA: abuRoadCorridorPlanned[0],
        pointB: abuRoadCorridorPlanned[8],
        pointC: abuRoadCorridorPlanned[abuRoadCorridorPlanned.length - 1],
        plannedRoute: abuRoadCorridorPlanned,
      };
      vehicleCorridorCache.set(regKey, corridor);
    } else if (
      regKey.includes('2011') ||
      regKey.includes('AA2011') ||
      regKey.includes('2008') ||
      regKey.includes('AA2008')
    ) {
      // Jaipur-Ajmer Highway Corridor: Jaipur Mining Zone (A) -> NH 48 Bagru (B) -> Ajmer Hub (C)
      corridor = {
        pointA: ajmerCorridorPlanned[0],
        pointB: ajmerCorridorPlanned[4],
        pointC: ajmerCorridorPlanned[ajmerCorridorPlanned.length - 1],
        plannedRoute: ajmerCorridorPlanned,
      };
      vehicleCorridorCache.set(regKey, corridor);
    } else if (vehicle.active_e_ravanna && vehicle.active_e_ravanna !== 'N/A') {
      // Regional automatic fallback for any other fleet vehicle
      if (currPos[0] < 25.5 && currPos[1] < 73.5) {
        corridor = {
          pointA: abuRoadCorridorPlanned[0],
          pointB: abuRoadCorridorPlanned[8],
          pointC: abuRoadCorridorPlanned[abuRoadCorridorPlanned.length - 1],
          plannedRoute: abuRoadCorridorPlanned,
        };
      } else if (currPos[0] >= 26.4 && currPos[0] <= 27.2 && currPos[1] >= 74.5 && currPos[1] <= 75.8) {
        corridor = {
          pointA: ajmerCorridorPlanned[0],
          pointB: ajmerCorridorPlanned[4],
          pointC: ajmerCorridorPlanned[ajmerCorridorPlanned.length - 1],
          plannedRoute: ajmerCorridorPlanned,
        };
      } else {
        corridor = {
          pointA: jaipurCorridorPlanned[0],
          pointB: jaipurCorridorPlanned[11],
          pointC: jaipurCorridorPlanned[jaipurCorridorPlanned.length - 1],
          plannedRoute: jaipurCorridorPlanned,
        };
      }
      vehicleCorridorCache.set(regKey, corridor);
    } else {
      // No active e-Rawanna registered for this vehicle -> Transit tracking not permitted
      return null;
    }
  }

  const rawHistoryCoords: [number, number][] =
    historyPoints && historyPoints.length > 0
      ? historyPoints.map((p) => [p.lat, p.lng] as [number, number])
      : [];

  const historyCoords = extractCurrentOneWayTrip(rawHistoryCoords, corridor.pointA);

  if (historyCoords.length === 0) {
    historyCoords.push(currPos);
  } else {
    const last = historyCoords[historyCoords.length - 1];
    if (Math.abs(last[0] - currPos[0]) > 0.00001 || Math.abs(last[1] - currPos[1]) > 0.00001) {
      historyCoords.push(currPos);
    }
  }

  const traveledRoute: [number, number][] = [];
  if (
    historyCoords.length > 0 &&
    (Math.abs(historyCoords[0][0] - corridor.pointA[0]) > 0.001 ||
     Math.abs(historyCoords[0][1] - corridor.pointA[1]) > 0.001)
  ) {
    traveledRoute.push(corridor.pointA);
  }
  traveledRoute.push(...historyCoords);

  const distToPlanned = minDistanceToPolylineMeters(currPos, corridor.plannedRoute);
  const DEVIATION_BUFFER_METERS = 200;
  const isDeviated = distToPlanned > DEVIATION_BUFFER_METERS;

  const deviatedRoute: [number, number][] = [];
  if (isDeviated) {
    for (const pt of historyCoords) {
      if (minDistanceToPolylineMeters(pt, corridor.plannedRoute) > DEVIATION_BUFFER_METERS) {
        deviatedRoute.push(pt);
      }
    }
    if (deviatedRoute.length === 0) {
      deviatedRoute.push(currPos);
    }
  }

  const passNo = vehicle.active_e_ravanna || `ERAW-${vehicle.reg_no.slice(-4)}-2026`;
  const statusText = isDeviated
    ? 'Route Deviation Detected'
    : vehicle.status === 'MOVING'
    ? 'In Transit (On Route)'
    : 'Halted (On Route)';

  return {
    pass_no: passNo,
    vehicle_reg_no: vehicle.reg_no,
    driver_name: vehicle.driver_name || 'Babu Lal Rayaka',
    driver_phone: vehicle.driver_phone || '+91 98290 12345',
    mineral_name: vehicle.mineral_type || 'Bajri',
    tonnage: `${vehicle.capacity_tonnes || 16.0} MT`,
    weighbridge_code: `WB-${vehicle.reg_no.slice(-4)}`,
    pointA: {
      label: 'A',
      name: `${vehicle.reg_no} Mining Lease`,
      subtext: 'Origin / Loading Point A',
      coords: corridor.pointA,
      type: 'ORIGIN',
    },
    pointB: {
      label: 'B',
      name: `Weighbridge WB-${vehicle.reg_no.slice(-4)}`,
      subtext: 'Transit Verification Point',
      coords: corridor.pointB,
      type: 'WEIGHBRIDGE',
    },
    pointC: {
      label: 'C',
      name: `${vehicle.reg_no} Consignee Hub`,
      subtext: 'Final Destination Consignee',
      coords: corridor.pointC,
      type: 'CONSIGNEE',
    },
    route_coordinates: corridor.plannedRoute,
    planned_route: corridor.plannedRoute,
    traveled_route: traveledRoute,
    deviated_route: deviatedRoute,
    is_deviated: isDeviated,
    deviation_distance_meters: Math.round(distToPlanned),
    generated_at: vehicle.last_updated || new Date().toLocaleTimeString('en-GB'),
    expire_at: 'Valid In Transit',
    status: statusText,
    lessee_name: 'Mining Lease Holder',
    consignee_name: `${vehicle.reg_no} Consignee Facility`,
    consignee_address: vehicle.active_geofence || 'Rajasthan Mining Corridor',
  };

  /* DUMMY HARDCODED VEHICLE PROFILES COMMENTED OUT:
  const regNo = vehicle.reg_no.toUpperCase().trim();

  // Match Image 2 & 3: RJ27GD1041
  if (regNo === 'RJ27GD1041' || regNo.includes('27GD') || regNo.includes('1041')) {
    return {
      pass_no: vehicle.active_e_ravanna || 'HAJS1040770053',
      vehicle_reg_no: vehicle.reg_no,
      driver_name: 'BABU LAL RAYAKA',
      driver_phone: '9687262425',
      mineral_name: 'Bajri',
      tonnage: '16.00 MT',
      weighbridge_code: '07955',
      pointA: {
        label: 'A',
        name: 'UNCHA 2',
        subtext: 'Starting point (Dealer / Mine)',
        coords: UNCHA_CHHOTI_SADRI_ROUTE[0],
        type: 'ORIGIN',
      },
      pointB: {
        label: 'B',
        name: 'Weighbridge 07955',
        subtext: 'Highway 48 Verification',
        coords: UNCHA_CHHOTI_SADRI_ROUTE[7],
        type: 'WEIGHBRIDGE',
      },
      pointC: {
        label: 'C',
        name: 'MADHU',
        subtext: 'CHHOTI SADRI, Chittorgarh, Rajasthan',
        coords: UNCHA_CHHOTI_SADRI_ROUTE[UNCHA_CHHOTI_SADRI_ROUTE.length - 1],
        type: 'CONSIGNEE',
      },
      route_coordinates: UNCHA_CHHOTI_SADRI_ROUTE,
      generated_at: '06/09/2026, 14:53:27',
      expire_at: '07/09/2026, 14:53:27',
      status: 'Unconfirm',
      lessee_name: 'UNCHA MINING LEASE',
      consignee_name: 'MADHU',
      consignee_address: 'CHHOTI SADRI, Chittorgarh, Rajasthan,',
    };
  }

  // Match Image 1: RJ14GK0267 (or Jaipur vehicles)
  if (regNo === 'RJ14GK0267' || regNo.includes('14GK')) {
    return {
      pass_no: vehicle.active_e_ravanna || 'PMPT1040769947',
      vehicle_reg_no: vehicle.reg_no,
      driver_name: 'RAMESH KUMAR',
      driver_phone: '9829104821',
      mineral_name: 'Masonry Stone',
      tonnage: '28.00 MT',
      weighbridge_code: '03102',
      pointA: {
        label: 'A',
        name: 'Dhani Maliyan',
        subtext: 'Lessee starting point',
        coords: JAIPUR_ROUTE[0],
        type: 'ORIGIN',
      },
      pointB: {
        label: 'B',
        name: 'Weighbridge 03102',
        subtext: 'Jaipur NH48 Verification Point',
        coords: JAIPUR_ROUTE[3],
        type: 'WEIGHBRIDGE',
      },
      pointC: {
        label: 'C',
        name: 'Ramavatar',
        subtext: 'Jaipur , Jaipur, Rajasthan,',
        coords: JAIPUR_ROUTE[JAIPUR_ROUTE.length - 1],
        type: 'CONSIGNEE',
      },
      route_coordinates: JAIPUR_ROUTE,
      generated_at: '06/09/2026, 10:23:53',
      expire_at: '07/09/2026, 4:40:14 PM',
      status: 'In Transit',
      lessee_name: 'Dhani Maliyan',
      consignee_name: 'Ramavatar',
      consignee_address: 'Jaipur , Jaipur, Rajasthan,',
    };
  }

  // Fallback for other vehicles with active rawanna
  const vLat = vehicle.last_latitude || 25.045;
  const vLng = vehicle.last_longitude || 74.615;

  const dynamicRoute: [number, number][] = [
    [vLat + 0.12, vLng - 0.08],
    [vLat + 0.08, vLng - 0.05],
    [vLat + 0.04, vLng - 0.02],
    [vLat + 0.015, vLng - 0.005],
    [vLat, vLng],
    [vLat - 0.04, vLng + 0.02],
    [vLat - 0.08, vLng + 0.04],
    [vLat - 0.14, vLng + 0.07],
  ];

  return {
    pass_no: vehicle.active_e_ravanna || 'ERAV1040882190',
    vehicle_reg_no: vehicle.reg_no,
    driver_name: 'BABU LAL RAYAKA',
    driver_phone: '9687262425',
    mineral_name: vehicle.mineral_type || 'Bajri',
    tonnage: '16.00 MT',
    weighbridge_code: '07955',
    pointA: {
      label: 'A',
      name: 'UNCHA 2',
      subtext: 'Starting point (Dealer / Mine)',
      coords: dynamicRoute[0],
      type: 'ORIGIN',
    },
    pointB: {
      label: 'B',
      name: 'Weighbridge 07955',
      subtext: 'Highway 48 Verification Point',
      coords: dynamicRoute[3],
      type: 'WEIGHBRIDGE',
    },
    pointC: {
      label: 'C',
      name: 'MADHU',
      subtext: 'CHHOTI SADRI, Chittorgarh, Rajasthan',
      coords: dynamicRoute[dynamicRoute.length - 1],
      type: 'CONSIGNEE',
    },
    route_coordinates: dynamicRoute,
    generated_at: '06/09/2026, 14:53:27',
    expire_at: '07/09/2026, 14:53:27',
    status: 'Unconfirm',
    lessee_name: 'UNCHA 2',
    consignee_name: 'MADHU',
    consignee_address: 'CHHOTI SADRI, Chittorgarh, Rajasthan,',
  };
  */
}

export function calculateRoadHeading(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const y = Math.sin(dLng) * Math.cos(lat2 * (Math.PI / 180));
  const x =
    Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
    Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}
