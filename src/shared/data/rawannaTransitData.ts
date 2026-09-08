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

// Stable destination cache so Point A, Point B, and Point C remain fixed geographic landmarks during live tracking
const vehicleCorridorCache = new Map<
  string,
  { pointA: [number, number]; pointB: [number, number]; pointC: [number, number] }
>();

export function getRawannaTransitForVehicle(
  vehicle: Vehicle,
  historyPoints?: TelemetryPoint[]
): RawannaTransitDetails {
  const regKey = (vehicle.reg_no || '').toUpperCase().trim();
  const currPos: [number, number] = [
    Number(vehicle.last_latitude) || 26.5081,
    Number(vehicle.last_longitude) || 75.1885,
  ];

  // 1. Gather historical GPS telemetry points in chronological order
  const historyCoords: [number, number][] =
    historyPoints && historyPoints.length > 0
      ? historyPoints.map((p) => [p.lat, p.lng] as [number, number])
      : [];

  // Ensure current position is at the end of the traveled trail
  if (historyCoords.length === 0) {
    historyCoords.push(currPos);
  } else {
    const last = historyCoords[historyCoords.length - 1];
    if (Math.abs(last[0] - currPos[0]) > 0.00001 || Math.abs(last[1] - currPos[1]) > 0.00001) {
      historyCoords.push(currPos);
    }
  }

  // 2. Establish FIXED landmarks (Point A: Origin, Point B: Weighbridge, Point C: Consignee Destination)
  let endpoints = vehicleCorridorCache.get(regKey);
  if (!endpoints) {
    if (regKey.includes('2003') || regKey.includes('GL2003')) {
      // Jaipur Southwest Transit Corridor
      endpoints = {
        pointA: [26.78445, 76.06812],
        pointB: [26.75200, 76.02100],
        pointC: [26.65000, 75.87000],
      };
    } else if (regKey.includes('2004') || regKey.includes('AA2004')) {
      // Abu Road / Sirohi Transit Corridor
      endpoints = {
        pointA: [24.75500, 72.74200],
        pointB: [24.78500, 72.75200],
        pointC: [24.89500, 72.78500],
      };
    } else if (regKey.includes('2005') || regKey.includes('AA2005')) {
      // Ajmer / Kishangarh Mineral Corridor
      endpoints = {
        pointA: [26.48500, 74.72000],
        pointB: [26.46500, 74.68000],
        pointC: [26.39500, 74.55000],
      };
    } else {
      // Generic dynamically calculated fixed landmarks for any other vehicle
      const startPt: [number, number] = historyCoords[0] || [currPos[0] - 0.04, currPos[1] - 0.04];
      const headingRad = ((vehicle.last_heading || 270) * Math.PI) / 180;
      const fwdLat = Math.cos(headingRad) * 0.06;
      const fwdLng = Math.sin(headingRad) * 0.06;
      const endPt: [number, number] = [currPos[0] + (fwdLat || -0.05), currPos[1] + (fwdLng || -0.05)];
      const midPt: [number, number] = [(startPt[0] + currPos[0]) / 2, (startPt[1] + currPos[1]) / 2];
      endpoints = { pointA: startPt, pointB: midPt, pointC: endPt };
    }
    vehicleCorridorCache.set(regKey, endpoints);
  }

  // 3. Construct continuous route corridor from Origin -> Traveled Trail -> Current Position -> Planned Path -> Consignee
  // Generate smooth road path ahead of the vehicle towards Point C
  const forwardSteps = 6;
  const forwardCoords: [number, number][] = [];
  for (let i = 1; i <= forwardSteps; i++) {
    const fraction = i / forwardSteps;
    const lat = currPos[0] + (endpoints.pointC[0] - currPos[0]) * fraction;
    const lng = currPos[1] + (endpoints.pointC[1] - currPos[1]) * fraction;
    forwardCoords.push([lat, lng]);
  }

  // Prepend Point A if history started after Point A
  const fullRoute: [number, number][] = [];
  if (
    Math.abs(historyCoords[0][0] - endpoints.pointA[0]) > 0.002 ||
    Math.abs(historyCoords[0][1] - endpoints.pointA[1]) > 0.002
  ) {
    fullRoute.push(endpoints.pointA);
  }
  fullRoute.push(...historyCoords);
  fullRoute.push(...forwardCoords);

  const passNo =
    vehicle.active_e_ravanna && vehicle.active_e_ravanna !== 'N/A'
      ? vehicle.active_e_ravanna
      : `ERAW-${vehicle.reg_no.slice(-4)}-2026`;

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
      coords: endpoints.pointA,
      type: 'ORIGIN',
    },
    pointB: {
      label: 'B',
      name: `Weighbridge 07${vehicle.reg_no.slice(-3)}`,
      subtext: 'Transit Verification Point',
      coords: endpoints.pointB,
      type: 'WEIGHBRIDGE',
    },
    pointC: {
      label: 'C',
      name: `${vehicle.reg_no} Consignee Hub`,
      subtext: 'Final Destination Consignee',
      coords: endpoints.pointC,
      type: 'CONSIGNEE',
    },
    route_coordinates: fullRoute,
    generated_at: vehicle.last_updated || new Date().toLocaleTimeString('en-GB'),
    expire_at: 'Valid In Transit',
    status: vehicle.status === 'MOVING' ? 'In Transit' : 'Halted',
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
