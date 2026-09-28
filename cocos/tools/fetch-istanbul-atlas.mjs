import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const endpoint = 'https://kulturenvanteri.ibb.gov.tr/server/rest/services/IlceMahalle/MapServer/0/query';
const params = new URLSearchParams({
  where: '1=1',
  outFields: 'AD',
  returnGeometry: 'true',
  outSR: '4326',
  f: 'geojson'
});

const response = await fetch(`${endpoint}?${params}`, {
  headers: { 'User-Agent': 'METROVA-atlas-importer/0.2' }
});
if (!response.ok) throw new Error(`IBB district request failed: ${response.status}`);

const geojson = await response.json();
if (geojson?.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
  throw new Error('Unexpected district geometry response');
}

const names = new Set(geojson.features.map(f => String(f?.properties?.AD ?? '').trim()).filter(Boolean));
if (names.size !== 39) {
  throw new Error(`Expected 39 Istanbul districts, received ${names.size}. Refusing silent map corruption.`);
}

const out = path.resolve('assets/data/istanbul-districts.geojson');
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(geojson));
console.log(`Wrote ${geojson.features.length} official district polygons to ${out}`);
