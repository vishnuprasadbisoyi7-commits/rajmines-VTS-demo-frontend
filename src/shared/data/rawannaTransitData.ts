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
function interpolateWaypoints(
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

// Stable corridor cache so planned route and landmarks A, B, C remain permanently fixed during tracking
interface CorridorDef {
  pointA: [number, number];
  pointB: [number, number];
  pointC: [number, number];
  plannedRoute: [number, number][];
}

const vehicleCorridorCache = new Map<string, CorridorDef>();

export function getRawannaTransitForVehicle(
  vehicle: Vehicle,
  historyPoints?: TelemetryPoint[]
): RawannaTransitDetails {
  const regKey = (vehicle.reg_no || '').toUpperCase().trim();
  const currPos: [number, number] = [
    Number(vehicle.last_latitude) || 26.5081,
    Number(vehicle.last_longitude) || 75.1885,
  ];

  // 1. Gather historical GPS telemetry points in chronological ascending order
  const historyCoords: [number, number][] =
    historyPoints && historyPoints.length > 0
      ? historyPoints.map((p) => [p.lat, p.lng] as [number, number])
      : [];

  // Ensure current live position is the head of the traveled trail
  if (historyCoords.length === 0) {
    historyCoords.push(currPos);
  } else {
    const last = historyCoords[historyCoords.length - 1];
    if (Math.abs(last[0] - currPos[0]) > 0.00001 || Math.abs(last[1] - currPos[1]) > 0.00001) {
      historyCoords.push(currPos);
    }
  }

  // 2. Establish FIXED STATIC PLANNED ROUTE (Point A -> Point B -> Point C)
  let corridor = vehicleCorridorCache.get(regKey);
  if (!corridor) {
    if (regKey.includes('2003') || regKey.includes('GL2003')) {
      // Jaipur Southwest Transit Corridor: Bassi Mining Lease (A) -> NH 21 Weighbridge (B) -> Jaipur Hub (C)
      const pA: [number, number] = [26.76523, 76.02098];
      const pB: [number, number] = [26.72464, 75.96091];
      const pC: [number, number] = [26.69988, 75.88402];
      const planned: [number, number][] = [
        pA,
        [26.76094, 76.00729],
        [26.74281, 75.99837],
        [26.73241, 75.99394],
        [26.72478, 75.99204],
        [26.71286, 75.98692],
        [26.71843, 75.97298],
        pB,
        [26.72508, 75.94668],
        [26.72380, 75.93672],
        [26.71870, 75.91854],
        [26.70929, 75.90106],
        [26.70821, 75.89480],
        pC,
      ];
      corridor = { pointA: pA, pointB: pB, pointC: pC, plannedRoute: planned };
    } else if (regKey.includes('2004') || regKey.includes('AA2004')) {
      // Abu Road / Sirohi Corridor: Pindwara Mining Lease (A) -> NH 27 Weighbridge (B) -> Abu Road Hub (C)
      const pA: [number, number] = [24.86859, 72.83726];
      const pB: [number, number] = [24.83266, 72.79998];
      const pC: [number, number] = [24.79705, 72.75560];
      const planned: [number, number][] = [
        pA,
        [24.86009, 72.82741],
        [24.85082, 72.81586],
        [24.83960, 72.80727],
        pB,
        [24.82905, 72.79189],
        [24.81930, 72.78451],
        [24.80441, 72.77293],
        [24.79794, 72.76340],
        pC,
      ];
      corridor = { pointA: pA, pointB: pB, pointC: pC, plannedRoute: planned };
    } else if (regKey.includes('2005') || regKey.includes('AA2005')) {
      // Jaipur to Ajmer Corridor: Jaipur Lease (A) -> Dudu Weighbridge (B) -> Ajmer Hub (C)
      const pA: [number, number] = [26.84204, 75.72185];
      const pB: [number, number] = [26.58394, 75.41312];
      const pC: [number, number] = [26.45026, 74.64344];
      const planned: [number, number][] = [
        pA,
        [26.74572, 75.62688],
        [26.65068, 75.53073],
        pB,
        [26.51943, 75.29472],
        [26.50517, 75.16019],
        [26.49084, 75.02572],
        [26.47663, 74.89120],
        [26.46233, 74.75675],
        pC,
      ];
      corridor = { pointA: pA, pointB: pB, pointC: pC, plannedRoute: planned };
    } else {
      // Dynamic fallback corridor for any new vehicle
      const pA: [number, number] = historyCoords[0] || [currPos[0] - 0.04, currPos[1] - 0.04];
      const headingRad = ((vehicle.last_heading || 270) * Math.PI) / 180;
      const fwdLat = Math.cos(headingRad) * 0.06;
      const fwdLng = Math.sin(headingRad) * 0.06;
      const pC: [number, number] = [currPos[0] + (fwdLat || -0.05), currPos[1] + (fwdLng || -0.05)];
      const pB: [number, number] = [(pA[0] + pC[0]) / 2, (pA[1] + pC[1]) / 2];

      const planned: [number, number][] = [
        pA,
        ...interpolateWaypoints(pA, pB, 4),
        pB,
        ...interpolateWaypoints(pB, pC, 4),
        pC,
      ];
      corridor = { pointA: pA, pointB: pB, pointC: pC, plannedRoute: planned };
    }
    vehicleCorridorCache.set(regKey, corridor);
  }

  // 3. Traveled Path: Starts at Point A and connects GPS history up to the current vehicle location
  const traveledRoute: [number, number][] = [];
  if (
    Math.abs(historyCoords[0][0] - corridor.pointA[0]) > 0.002 ||
    Math.abs(historyCoords[0][1] - corridor.pointA[1]) > 0.002
  ) {
    traveledRoute.push(corridor.pointA);
  }
  traveledRoute.push(...historyCoords);

  // 4. Route Deviation Check: Check if current vehicle position is within 200m corridor tolerance
  const distToPlanned = minDistanceToPolylineMeters(currPos, corridor.plannedRoute);
  const DEVIATION_BUFFER_METERS = 200; // 200 meters buffer
  const isDeviated = distToPlanned > DEVIATION_BUFFER_METERS;

  // Identify deviated trail points (GPS breadcrumbs further than buffer from planned corridor)
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

  const passNo =
    vehicle.active_e_ravanna && vehicle.active_e_ravanna !== 'N/A'
      ? vehicle.active_e_ravanna
      : `ERAW-${vehicle.reg_no.slice(-4)}-2026`;

  const statusText = isDeviated
    ? 'Route Deviation Detected'
    : vehicle.status === 'MOVING'
    ? 'In Transit (On Route)'
    : 'Halted (On Route)';

  return {
    pass_no: passNo,
    vehicle_reg_no: vehicle.reg_no,
    driver_name: vehicle.driver_name || 'Babu Lal Rayaka',
    driver_phone: vehicle.driver_phone || '9829000000',
    mineral_name: vehicle.mineral_type || 'Bajri',
    tonnage: `${vehicle.capacity_tonnes || 16.0} MT`,
    weighbridge_code: `07${vehicle.reg_no.slice(-3)}`,
    pointA: {
      label: 'A',
      name: `${vehicle.reg_no} Mining Lease`,
      subtext: 'Origin / Loading Point A',
      coords: corridor.pointA,
      type: 'ORIGIN',
    },
    pointB: {
      label: 'B',
      name: `Weighbridge 07${vehicle.reg_no.slice(-3)}`,
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
    route_coordinates: corridor.plannedRoute, // Planned route corridor
    planned_route: corridor.plannedRoute,
    traveled_route: traveledRoute,
    deviated_route: deviatedRoute,
    is_deviated: isDeviated,
    deviation_distance_meters: Math.round(distToPlanned),
    generated_at: vehicle.last_updated || new Date().toLocaleTimeString('en-GB'),
    expire_at: 'Valid In Transit',
    status: statusText,
    lessee_name: `${vehicle.mineral_type || 'Mining'} Lessee`,
    consignee_name: `${vehicle.reg_no} Consignee Hub`,
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
