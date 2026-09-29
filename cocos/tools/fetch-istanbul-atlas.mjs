import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const expected=JSON.parse(await readFile('assets/data/istanbul-districts.json','utf8')).districts;
const expectedNorm=new Map(expected.map(name=>[norm(name),name]));
const aliases=new Map([['eyup','Eyüpsultan']]);

function norm(value){
  return String(value??'').trim().toLocaleLowerCase('tr-TR').normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ş/g,'s')
    .replace(/ç/g,'c').replace(/ö/g,'o').replace(/ü/g,'u').replace(/[^a-z0-9]/g,'');
}
function canonical(value){
  const n=norm(value);
  return expectedNorm.get(n)??aliases.get(n)??String(value??'').trim();
}
function validate(geojson,label){
  if(geojson?.type!=='FeatureCollection'||!Array.isArray(geojson.features))throw new Error(label+': unexpected geometry response');
  for(const feature of geojson.features){
    feature.properties=feature.properties??{};
    feature.properties.AD=canonical(feature.properties.AD);
  }
  const names=new Set(geojson.features.map(f=>String(f?.properties?.AD??'').trim()).filter(Boolean));
  if(names.size!==39)throw new Error(label+': expected 39 Istanbul districts, received '+names.size);
  return geojson;
}
async function fetchJson(url){
  const response=await fetch(url,{headers:{'User-Agent':'METROVA-atlas-importer/0.3'}});
  if(!response.ok)throw new Error('HTTP '+response.status+' '+url);
  return response.json();
}
async function primary(){
  const endpoint='https://kulturenvanteri.ibb.gov.tr/server/rest/services/IlceMahalle/MapServer/0/query';
  const params=new URLSearchParams({where:'1=1',outFields:'AD',returnGeometry:'true',outSR:'4326',f:'geojson'});
  return validate(await fetchJson(endpoint+'?'+params),'IBB Culture Inventory');
}
function esriToGeoJson(data){
  if(!Array.isArray(data?.features))throw new Error('ArcGIS fallback: features missing');
  const converted=data.features.map((feature,index)=>{
    const attrs=feature.attributes??{};
    const candidate=Object.values(attrs).map(canonical).find(v=>expected.includes(v));
    if(!candidate)throw new Error('ArcGIS fallback: district name not detected at feature '+index);
    const rings=feature.geometry?.rings;
    if(!Array.isArray(rings)||!rings.length)throw new Error('ArcGIS fallback: rings missing for '+candidate);
    // District data can contain islands. Treat each ArcGIS ring as a GeoJSON polygon shell;
    // internal water holes are visually negligible for this gameplay layer.
    const geometry=rings.length===1
      ?{type:'Polygon',coordinates:[rings[0]]}
      :{type:'MultiPolygon',coordinates:rings.map(r=>[r])};
    return {type:'Feature',properties:{AD:candidate},geometry};
  });
  return {type:'FeatureCollection',features:converted};
}
async function fallback(){
  const endpoint='https://services6.arcgis.com/eIKAfiKO5wlLvzXR/ArcGIS/rest/services/istanbul_ilce_polygon/FeatureServer/0/query';
  const params=new URLSearchParams({where:'1=1',outFields:'*',returnGeometry:'true',outSR:'4326',f:'json'});
  return validate(esriToGeoJson(await fetchJson(endpoint+'?'+params)),'ArcGIS Istanbul district fallback');
}

let geojson;
try{
  geojson=await primary();
  console.log('District source: IBB Culture Inventory');
}catch(error){
  console.warn('Primary district source unavailable:',error instanceof Error?error.message:error);
  geojson=await fallback();
  console.log('District source: ArcGIS Istanbul district fallback');
}

const out=path.resolve('assets/data/istanbul-district-geometry.json');
await mkdir(path.dirname(out),{recursive:true});
await writeFile(out,JSON.stringify(geojson));
console.log('Wrote '+geojson.features.length+' Istanbul district polygons to '+out);
