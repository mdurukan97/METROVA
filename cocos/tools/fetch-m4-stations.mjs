import { writeFile } from 'node:fs/promises';

const expected=[
  ['Kadıköy',[]],['Ayrılık Çeşmesi',[]],['Acıbadem',[]],['Ünalan',[]],['Göztepe',[]],
  ['Yenisahra',[]],['Kozyatağı',[]],['Bostancı',[]],['Küçükyalı',[]],['Maltepe',[]],
  ['Huzurevi',[]],['Gülsuyu',[]],['Esenkent',[]],['Hastane-Adliye',['Hastane - Adliye']],
  ['Soğanlık',[]],['Kartal',[]],['Yakacık-Adnan Kahveci',['Yakacık - Adnan Kahveci']],
  ['Pendik',[]],['Tavşantepe',[]],['Fevzi Çakmak-Hastane',['Fevzi Çakmak - Hastane']],
  ['Yayalar-Şeyhli',['Yayalar - Şeyhli']],['Kurtköy',[]],['Sabiha Gökçen Havalimanı',['Sabiha Gökçen']]
];

const query=`[out:json][timeout:90];
(
  nwr["railway"="station"]["station"="subway"](40.84,28.96,41.03,29.36);
  nwr["railway"="halt"]["subway"="yes"](40.84,28.96,41.03,29.36);
);
out center tags;`;

const response=await fetch('https://overpass-api.de/api/interpreter',{
  method:'POST',
  headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','User-Agent':'METROVA-atlas-builder/0.3'},
  body:new URLSearchParams({data:query})
});
if(!response.ok)throw new Error(`Overpass request failed: ${response.status}`);
const json=await response.json();

const normalize=s=>String(s??'').toLocaleLowerCase('tr-TR').replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
const candidates=json.elements.map(e=>({
  osmType:e.type,osmId:e.id,name:e.tags?.name??'',
  lat:e.lat??e.center?.lat,lon:e.lon??e.center?.lon,
  tags:e.tags??{}
})).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lon));

const output=[];
const missing=[];
for(const [name,aliases] of expected){
  const names=[name,...aliases].map(normalize);
  const matches=candidates.filter(c=>names.includes(normalize(c.name)));
  if(matches.length!==1){missing.push({name,matches:matches.map(m=>m.name)});continue;}
  const m=matches[0];
  output.push({name,lat:m.lat,lon:m.lon,osmType:m.osmType,osmId:m.osmId,source:'OpenStreetMap'});
}
if(missing.length)throw new Error('M4 station verification incomplete: '+JSON.stringify(missing));

await writeFile('assets/data/m4-stations-verified.json',JSON.stringify({
  schemaVersion:1,
  line:'M4',
  officialOrderSource:'Metro İstanbul',
  coordinateSource:'OpenStreetMap',
  attribution:'© OpenStreetMap contributors · ODbL',
  stations:output
},null,2)+'\n');
console.log(`Verified ${output.length} M4 station coordinates through Pendik and Sabiha Gökçen.`);
