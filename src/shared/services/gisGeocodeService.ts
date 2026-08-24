// ArcGIS World Geocoding & Reverse Geocoding Service for Rajdharaa GIS
import { RAJASTHAN_DISTRICT_CENTERS } from '../data/rajasthanGeoData';

export interface ArcGISAddress {
  Match_addr?: string;
  LongLabel?: string;
  ShortLabel?: string;
  Addr_type?: string;
  Type?: string;
  PlaceName?: string;
  District?: string;
  City?: string;
  MetroArea?: string;
  Subregion?: string;
  Region?: string;
  Territory?: string;
  Postal?: string;
  CountryCode?: string;
}

export interface ReverseGeocodeResult {
  matchAddress: string;
  district: string;
  city: string;
  placeName: string;
  locality: string;
  latitude: number;
  longitude: number;
  source: 'arcgis-online' | 'rajdharaa-fallback';
}

export interface GeocodeSearchResult {
  name: string;
  district?: string;
  latitude: number;
  longitude: number;
  type: string;
}

// In-memory cache to prevent repeat API calls
const reverseGeocodeCache = new Map<string, ReverseGeocodeResult>();

// Known key mining hubs & landmarks in Rajasthan for instant zero-latency search
const RAJASTHAN_KEY_PLACES: GeocodeSearchResult[] = [
  { name: 'Makrana Marble Belt', district: 'Nagaur', latitude: 27.0425, longitude: 74.7214, type: 'Mining Hub' },
  { name: 'Kishangarh Marble Market', district: 'Ajmer', latitude: 26.578, longitude: 74.862, type: 'Marble Hub' },
  { name: 'Bagru Industrial Zone', district: 'Jaipur', latitude: 26.812, longitude: 75.542, type: 'DMG Checkpost' },
  { name: 'Nimbahera Limestone Belt', district: 'Chittorgarh', latitude: 24.621, longitude: 74.685, type: 'Mining Lease' },
  { name: 'Pokhran Sandstone Quorum', district: 'Jaisalmer', latitude: 26.921, longitude: 71.918, type: 'DMG Naka' },
  { name: 'Mandore Sandstone Mines', district: 'Jodhpur', latitude: 26.342, longitude: 73.048, type: 'Sandstone Basin' },
  { name: 'Zawar Lead-Zinc Mines', district: 'Udaipur', latitude: 24.354, longitude: 73.712, type: 'HZL Mining Complex' },
  { name: 'Khetri Copper Complex', district: 'Jhunjhunu', latitude: 27.982, longitude: 75.789, type: 'Copper Belt' },
  { name: 'Rampura Agucha Zinc Mine', district: 'Bhilwara', latitude: 25.833, longitude: 74.742, type: 'Open Cast Mine' },
  { name: 'Banswara Manganese & Gold Basin', district: 'Banswara', latitude: 23.542, longitude: 74.453, type: 'Mineral Belt' },
  { name: 'Bikaner Lignite Mines', district: 'Bikaner', latitude: 28.018, longitude: 73.312, type: 'Energy Mineral' },
  { name: 'Barmer Lignite & Hydrocarbon Basin', district: 'Barmer', latitude: 25.753, longitude: 71.392, type: 'Petro/Mining Area' },
  { name: 'Jaipur DMG Headquarter', district: 'Jaipur', latitude: 26.9124, longitude: 75.7873, type: 'Govt Office' },
];

export const gisGeocodeService = {
  /**
   * Reverse Geocode coordinates using official ArcGIS endpoint configured in Rajdharaa GIS
   */
  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (reverseGeocodeCache.has(cacheKey)) {
      return reverseGeocodeCache.get(cacheKey)!;
    }

    try {
      const locationPayload = JSON.stringify({
        x: Number(lng.toFixed(6)),
        y: Number(lat.toFixed(6)),
        spatialReference: { wkid: 4326 },
      });

      const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${encodeURIComponent(
        locationPayload
      )}&distance=50000&f=json`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`ArcGIS reverse geocode failed with HTTP ${response.status}`);
      }

      const data = await response.json();
      const addr: ArcGISAddress = data.address || {};

      const result: ReverseGeocodeResult = {
        matchAddress: addr.Match_addr || addr.LongLabel || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        district: addr.District || addr.Subregion || findNearestDistrict(lat, lng),
        city: addr.City || addr.MetroArea || 'Rajasthan',
        placeName: addr.PlaceName || addr.ShortLabel || addr.Match_addr || 'Rajasthan Point',
        locality: addr.ShortLabel || addr.PlaceName || addr.City || 'Mining Sector',
        latitude: lat,
        longitude: lng,
        source: 'arcgis-online',
      };

      reverseGeocodeCache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.warn('Falling back to local Rajasthan spatial index for reverse geocode:', err);
      // Fallback nearest district calculation
      const nearestDistrict = findNearestDistrict(lat, lng);
      const fallbackResult: ReverseGeocodeResult = {
        matchAddress: `Near ${nearestDistrict}, Rajasthan, India`,
        district: nearestDistrict,
        city: nearestDistrict,
        placeName: `${nearestDistrict} Area`,
        locality: `${nearestDistrict} Mining Zone`,
        latitude: lat,
        longitude: lng,
        source: 'rajdharaa-fallback',
      };
      reverseGeocodeCache.set(cacheKey, fallbackResult);
      return fallbackResult;
    }
  },

  /**
   * Search places, districts, and mining zones across Rajasthan
   */
  async searchRajasthanPlaces(query: string): Promise<GeocodeSearchResult[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    // 1. Search local 33 districts
    const districtMatches: GeocodeSearchResult[] = RAJASTHAN_DISTRICT_CENTERS.filter((d) =>
      d.district.toLowerCase().includes(q)
    ).map((d) => ({
      name: `${d.district} District`,
      district: d.district,
      latitude: d.lat,
      longitude: d.lng,
      type: 'District Center',
    }));

    // 2. Search key mining hubs
    const placeMatches = RAJASTHAN_KEY_PLACES.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.district && p.district.toLowerCase().includes(q)) ||
        p.type.toLowerCase().includes(q)
    );

    const localCombined = [...districtMatches, ...placeMatches];

    // 3. If local matches exist, return them
    if (localCombined.length > 0) {
      return localCombined.slice(0, 8);
    }

    // 4. Query ArcGIS Candidate Geocoder with Rajasthan bias
    try {
      const singleLine = `${query}, Rajasthan, India`;
      const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(
        singleLine
      )}&f=json&maxLocations=6&countryCode=IND`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const candidates: Array<{ address: string; location: { x: number; y: number } }> = data.candidates || [];
        return candidates.map((c) => ({
          name: c.address,
          district: 'Rajasthan',
          latitude: c.location.y,
          longitude: c.location.x,
          type: 'Location Search',
        }));
      }
    } catch {
      // Ignore network search errors
    }

    return [];
  },
};

/**
 * Spatial helper: Find nearest district centroid in Rajasthan
 */
function findNearestDistrict(lat: number, lng: number): string {
  let nearest = 'Rajasthan';
  let minDistance = Infinity;

  for (const item of RAJASTHAN_DISTRICT_CENTERS) {
    const d = Math.hypot(lat - item.lat, lng - item.lng);
    if (d < minDistance) {
      minDistance = d;
      nearest = item.district;
    }
  }

  return nearest;
}
