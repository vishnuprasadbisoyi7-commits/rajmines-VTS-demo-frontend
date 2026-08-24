import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const districts = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/shared/data/rajasthan_districts.json'), 'utf8'));
const boundary = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/shared/data/rajasthan_boundary_clean.json'), 'utf8'));
const centers = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/shared/data/district_centers.json'), 'utf8'));

const outerRing = boundary.geometry.coordinates[0][0].map(pt => [Number(pt[1].toFixed(5)), Number(pt[0].toFixed(5))]);

const simplifiedDistricts = {
  type: 'FeatureCollection',
  features: districts.features.map(f => ({
    type: 'Feature',
    properties: {
      district: f.properties.district,
      dt_code: f.properties.dt_code,
      st_nm: f.properties.st_nm
    },
    geometry: f.geometry
  }))
};

const divisionLabels = [
  { name: 'RAJASTHAN', lat: 26.65, lng: 74.1, isState: true },
  { name: 'Bikaner', lat: 28.01, lng: 73.31, isState: false },
  { name: 'Jodhpur', lat: 26.28, lng: 73.02, isState: false },
  { name: 'Jaipur', lat: 26.92, lng: 75.82, isState: false },
  { name: 'Ajmer', lat: 26.45, lng: 74.64, isState: false },
  { name: 'Kota', lat: 25.18, lng: 75.84, isState: false },
  { name: 'Udaipur', lat: 24.58, lng: 73.68, isState: false },
  { name: 'Bharatpur', lat: 27.22, lng: 77.49, isState: false },
];

let out = '// Auto-generated Rajasthan GeoJSON Data and Administrative Boundaries\n';
out += 'import type { FeatureCollection } from "geojson";\n\n';
out += 'export const WORLD_OUTER_RING: [number, number][] = [\n  [85, -180],\n  [85, 180],\n  [-85, 180],\n  [-85, -180],\n];\n\n';
out += 'export const RAJASTHAN_STATE_CENTER: [number, number] = [26.578, 74.862];\n\n';
out += 'export const RAJASTHAN_BOUNDS: [[number, number], [number, number]] = [\n  [23.0, 69.0],\n  [30.4, 78.5],\n];\n\n';
out += 'export const RAJASTHAN_OUTER_BOUNDARY: [number, number][] = ' + JSON.stringify(outerRing) + ';\n\n';
out += 'export const RAJASTHAN_DIVISION_LABELS = ' + JSON.stringify(divisionLabels, null, 2) + ';\n\n';
out += 'export const RAJASTHAN_DISTRICT_CENTERS = ' + JSON.stringify(centers, null, 2) + ';\n\n';
out += 'export const RAJASTHAN_DISTRICTS_GEOJSON: FeatureCollection = ' + JSON.stringify(simplifiedDistricts) + ';\n';

const target = path.join(rootDir, 'src/shared/data/rajasthanGeoData.ts');
fs.writeFileSync(target, out, 'utf8');
console.log('Successfully wrote rajasthanGeoData.ts, size:', fs.statSync(target).size);
