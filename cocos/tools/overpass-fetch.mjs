const endpoints=[
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter'
];

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export async function fetchOverpassJson(query,label,userAgent){
  const errors=[];
  for(let round=0;round<2;round++){
    for(const endpoint of endpoints){
      try{
        const controller=new AbortController();
        const timer=setTimeout(()=>controller.abort(),150000);
        const response=await fetch(endpoint,{
          method:'POST',
          headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','User-Agent':userAgent},
          body:new URLSearchParams({data:query}),
          signal:controller.signal
        });
        clearTimeout(timer);
        if(!response.ok)throw new Error('HTTP '+response.status);
        const json=await response.json();
        if(!Array.isArray(json?.elements))throw new Error('invalid Overpass JSON');
        console.log(label+': '+endpoint+' returned '+json.elements.length+' elements');
        return json;
      }catch(error){
        const message=error instanceof Error?error.message:String(error);
        errors.push(endpoint+' '+message);
        console.warn(label+' failed via '+endpoint+': '+message);
      }
    }
    await sleep(1500*(round+1));
  }
  throw new Error(label+' failed on all Overpass mirrors: '+errors.join(' | '));
}
