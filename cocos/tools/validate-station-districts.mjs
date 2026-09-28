import { readFile } from 'node:fs/promises';

const atlas = JSON.parse(await readFile('assets/data/istanbul-atlas.json','utf8'));
const geo = JSON.parse(await readFile('assets/data/istanbul-district-geometry.json','utf8'));

function inRing(point, ring) {
  const [x,y] = point;
  let inside = false;
  for (let i=0,j=ring.length-1; i<ring.length; j=i++) {
    const [xi,yi]=ring[i], [xj,yj]=ring[j];
    const hit = ((yi>y)!==(yj>y)) && (x < (xj-xi)*(y-yi)/((yj-yi)||Number.EPSILON)+xi);
    if (hit) inside=!inside;
  }
  return inside;
}
function inPolygon(point, polygon) {
  if (!polygon?.length || !inRing(point, polygon[0])) return false;
  for (let i=1;i<polygon.length;i++) if (inRing(point,polygon[i])) return false;
  return true;
}
function contains(feature, point) {
  const g=feature.geometry;
  if (g.type==='Polygon') return inPolygon(point,g.coordinates);
  if (g.type==='MultiPolygon') return g.coordinates.some(p=>inPolygon(point,p));
  return false;
}

const failures=[];
for (const s of atlas.stations) {
  const feature=geo.features.find(f=>contains(f,[s.lon,s.lat]));
  const actual=String(feature?.properties?.AD ?? '').trim();
  if (!actual) failures.push(`${s.name}: no district polygon contains coordinate ${s.lat},${s.lon}`);
  else if (actual.toLocaleLowerCase('tr-TR') !== s.district.toLocaleLowerCase('tr-TR')) {
    failures.push(`${s.name}: atlas says ${s.district}, geometry says ${actual}`);
  }
}
if (failures.length) {
  console.error('Station/district validation failed:\n- '+failures.join('\n- '));
  process.exit(1);
}
console.log(`Validated ${atlas.stations.length} station anchors against official Istanbul district polygons.`);
