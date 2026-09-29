import { readFile, writeFile } from 'node:fs/promises';

const atlas=JSON.parse(await readFile('assets/data/istanbul-atlas.json','utf8'));
const m4=JSON.parse(await readFile('assets/data/m4-stations-verified.json','utf8'));
const districts=JSON.parse(await readFile('assets/data/istanbul-district-geometry.json','utf8'));

function inRing(point,ring){
  const [x,y]=point; let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [xi,yi]=ring[i],[xj,yj]=ring[j];
    const hit=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||Number.EPSILON)+xi);
    if(hit)inside=!inside;
  }
  return inside;
}
function inPolygon(point,p){
  if(!p?.length||!inRing(point,p[0]))return false;
  for(let i=1;i<p.length;i++)if(inRing(point,p[i]))return false;
  return true;
}
function contains(f,p){
  const g=f.geometry;
  return g.type==='Polygon'?inPolygon(p,g.coordinates):g.type==='MultiPolygon'&&g.coordinates.some(x=>inPolygon(p,x));
}
function slug(name){
  return name.toLocaleLowerCase('tr-TR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ş/g,'s').replace(/ç/g,'c').replace(/ö/g,'o').replace(/ü/g,'u')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

const byName=new Map(atlas.stations.map(s=>[s.name.toLocaleLowerCase('tr-TR'),s]));
const output=[];
for(const [index,s] of m4.stations.entries()){
  const feature=districts.features.find(f=>contains(f,[s.lon,s.lat]));
  if(!feature)throw new Error('No Istanbul district found for '+s.name);
  const district=String(feature.properties.AD??'').trim();
  const existing=byName.get(s.name.toLocaleLowerCase('tr-TR'));
  output.push({
    id:existing?.id??('m4-'+slug(s.name)),
    name:s.name,
    district,
    lat:s.lat,
    lon:s.lon,
    role:['Kadıköy','Ayrılık Çeşmesi','Kozyatağı','Bostancı','Kartal','Pendik','Sabiha Gökçen Havalimanı'].includes(s.name)?'hub':'station',
    officialLines:Array.from(new Set([...(existing?.officialLines??[]),'M4'])),
    coordinateStatus:'verified',
    officialOrder:index+1,
    osmType:s.osmType,
    osmId:s.osmId
  });
}

const nonM4=atlas.stations.filter(s=>!s.officialLines?.includes('M4'));
atlas.stations=[...nonM4,...output];
atlas.generated={m4VerifiedAt:new Date().toISOString(),m4StationCount:output.length,coordinateSource:'OpenStreetMap',attribution:'© OpenStreetMap contributors · ODbL'};
await writeFile('assets/data/istanbul-atlas.json',JSON.stringify(atlas,null,2)+'\n');
console.log('Merged '+output.length+' verified M4 stations into the playable Istanbul atlas.');
