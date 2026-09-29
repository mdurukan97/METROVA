import { fetchOverpassJson } from './overpass-fetch.mjs';
import { writeFile } from 'node:fs/promises';

const boxes=[
  {id:'central',south:40.86,west:28.82,north:41.13,east:29.05},
  {id:'east',south:40.86,west:29.05,north:41.08,east:29.18},
  {id:'pendik',south:40.84,west:29.18,north:41.03,east:29.34}
];
const allowed=new Set(['motorway','motorway_link','trunk','trunk_link','primary','primary_link','secondary','secondary_link','tertiary','tertiary_link','residential','living_street']);

function pointLineDistance(p,a,b){
  const dx=b[0]-a[0],dy=b[1]-a[1];
  if(dx===0&&dy===0)return Math.hypot(p[0]-a[0],p[1]-a[1]);
  const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));
  return Math.hypot(p[0]-(a[0]+t*dx),p[1]-(a[1]+t*dy));
}
function simplify(points,tolerance){
  if(points.length<=2)return points;
  let max=0,index=0;
  for(let i=1;i<points.length-1;i++){
    const d=pointLineDistance(points[i],points[0],points[points.length-1]);
    if(d>max){max=d;index=i;}
  }
  if(max>tolerance){
    const left=simplify(points.slice(0,index+1),tolerance);
    const right=simplify(points.slice(index),tolerance);
    return left.slice(0,-1).concat(right);
  }
  return [points[0],points[points.length-1]];
}
function tier(highway){
  if(/motorway|trunk/.test(highway))return 0;
  if(/primary|secondary/.test(highway))return 1;
  if(/tertiary/.test(highway))return 2;
  return 3;
}

const roads=[];
const seen=new Set();
for(const box of boxes){
  const q=`[out:json][timeout:120];
way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|residential|living_street)$"](${box.south},${box.west},${box.north},${box.east});
out geom qt;`;
  const json=await fetchOverpassJson(q,'Road atlas '+box.id,'METROVA-night-atlas/0.5');
  for(const e of json.elements){
    const highway=e.tags?.highway;
    if(e.type!=='way'||!allowed.has(highway)||!Array.isArray(e.geometry)||e.geometry.length<2||seen.has(e.id))continue;
    seen.add(e.id);
    const t=tier(highway);
    const tolerance=t===0?0.000015:t===1?0.000025:t===2?0.00004:0.00007;
    const points=simplify(e.geometry.map(p=>[p.lon,p.lat]),tolerance);
    roads.push({id:e.id,highway,tier:t,name:e.tags?.name??'',points});
  }
}
roads.sort((a,b)=>a.tier-b.tier);
const bounds={west:28.82,east:29.34,south:40.84,north:41.13};
const quantization=100000;
// Mobile schema: [tier,[x0,y0,dx1,dy1,...]]. Names/highway tags are intentionally
// removed because the renderer never uses them. Geographic precision stays ~1.1 m.
const packed=roads.map(r=>{
  const coords=[];let px=0,py=0;
  for(let i=0;i<r.points.length;i++){
    const x=Math.round((r.points[i][0]-bounds.west)*quantization);
    const y=Math.round((r.points[i][1]-bounds.south)*quantization);
    if(i===0)coords.push(x,y);else coords.push(x-px,y-py);
    px=x;py=y;
  }
  return [r.tier,coords];
});
await writeFile('assets/data/istanbul-night-roads.json',JSON.stringify({
  schemaVersion:2,
  attribution:'© OpenStreetMap contributors · ODbL',
  bounds,
  quantization,
  roadCount:roads.length,
  roads:packed
}));
console.log(`Wrote ${roads.length} packed road ways for the Istanbul→Pendik night atlas.`);
