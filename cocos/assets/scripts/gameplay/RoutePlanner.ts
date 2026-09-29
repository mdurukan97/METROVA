import { BuiltLine } from './TransitTypes';

export type RoutePlan = {
  stations:string[];
  lineIds:string[];
  transferCount:number;
  cost:number;
};

type Edge={to:string;lineId:string;cost:number};
type Previous={key:string;station:string;lineId:string};

/**
 * Cached shortest-path planner for the mutable player-built rail network.
 * A line change is possible at any shared station, but carries a configurable
 * penalty so a sensible direct service wins over a marginally shorter transfer.
 */
export class RoutePlanner {
  private signature='';
  private graph=new Map<string,Edge[]>();
  private cache=new Map<string,RoutePlan|null>();

  constructor(private readonly transferPenalty=2.5){}

  plan(origin:string,target:string,lines:BuiltLine[]):RoutePlan|null{
    if(origin===target)return {stations:[origin],lineIds:[],transferCount:0,cost:0};
    this.refresh(lines);
    const cacheKey=`${origin}>${target}`;
    if(this.cache.has(cacheKey))return this.clone(this.cache.get(cacheKey)??null);

    const distance=new Map<string,number>();
    const previous=new Map<string,Previous>();
    const unvisited=new Set<string>();
    const startKey=this.key(origin,'');
    distance.set(startKey,0);
    unvisited.add(startKey);
    let destinationKey:string|null=null;

    while(unvisited.size){
      let currentKey:string|null=null;
      let currentDistance=Number.POSITIVE_INFINITY;
      for(const key of unvisited){
        const value=distance.get(key)??Number.POSITIVE_INFINITY;
        if(value<currentDistance){currentDistance=value;currentKey=key;}
      }
      if(!currentKey)break;
      unvisited.delete(currentKey);
      const {station,lineId}=this.parseKey(currentKey);
      if(station===target){destinationKey=currentKey;break;}

      for(const edge of this.graph.get(station)??[]){
        const transfer=lineId!==''&&lineId!==edge.lineId;
        const nextDistance=currentDistance+edge.cost+(transfer?this.transferPenalty:0);
        const nextKey=this.key(edge.to,edge.lineId);
        if(nextDistance>=(distance.get(nextKey)??Number.POSITIVE_INFINITY))continue;
        distance.set(nextKey,nextDistance);
        previous.set(nextKey,{key:currentKey,station, lineId:edge.lineId});
        unvisited.add(nextKey);
      }
    }

    if(!destinationKey){this.cache.set(cacheKey,null);return null;}
    const stations=[target];
    const lineIds:string[]=[];
    let cursor=destinationKey;
    while(cursor!==startKey){
      const step=previous.get(cursor);
      if(!step){this.cache.set(cacheKey,null);return null;}
      stations.push(step.station);
      lineIds.push(step.lineId);
      cursor=step.key;
    }
    stations.reverse();
    lineIds.reverse();
    const transferCount=lineIds.reduce((count,line,index)=>
      index>0&&line!==lineIds[index-1]?count+1:count,0);
    const result={stations,lineIds,transferCount,cost:distance.get(destinationKey)!};
    this.cache.set(cacheKey,result);
    return this.clone(result);
  }

  invalidate(){this.signature='';this.graph.clear();this.cache.clear();}

  private refresh(lines:BuiltLine[]){
    const signature=lines.map(line=>
      `${line.id}:${line.stations.join(',')}:${line.segments.map(s=>s.distanceKm.toFixed(3)).join(',')}`
    ).sort().join('|');
    if(signature===this.signature)return;
    this.signature=signature;
    this.graph.clear();
    this.cache.clear();
    for(const line of lines){
      for(let index=0;index<line.stations.length-1;index++){
        const from=line.stations[index],to=line.stations[index+1];
        const cost=Math.max(0.1,line.segments[index]?.distanceKm??1);
        this.addEdge(from,{to,lineId:line.id,cost});
        this.addEdge(to,{to:from,lineId:line.id,cost});
      }
    }
  }

  private addEdge(from:string,edge:Edge){
    const edges=this.graph.get(from)??[];
    edges.push(edge);
    this.graph.set(from,edges);
  }

  private key(station:string,lineId:string){return `${station}\u0000${lineId}`;}
  private parseKey(key:string){
    const [station,lineId]=key.split('\u0000');
    return {station,lineId};
  }
  private clone<T>(value:T):T{return value===null?value:JSON.parse(JSON.stringify(value)) as T;}
}
