import { BuiltLine, StationAnchor, TrainState } from './TransitTypes';

export type Passenger = { id:number; origin:string; target:string; waitSeconds:number };
export type StationQueue = { stationId:string; passengers:Passenger[] };

export class PassengerSimulation {
  readonly queues=new Map<string,StationQueue>();
  delivered=0;
  satisfaction=100;
  averageWait=0;
  private seq=1;
  private spawnAccumulator=0;

  constructor(stations:Iterable<StationAnchor>){
    for(const s of stations)this.queues.set(s.id,{stationId:s.id,passengers:[]});
  }

  tick(dt:number,activeStationIds:string[],lines:BuiltLine[],trains:TrainState[]){
    if(activeStationIds.length<2)return;
    this.spawnAccumulator+=dt;
    while(this.spawnAccumulator>=1.25){
      this.spawnAccumulator-=1.25;
      this.spawn(activeStationIds);
    }
    let waitTotal=0,count=0,queued=0;
    for(const q of this.queues.values()){
      for(const p of q.passengers){p.waitSeconds+=dt;waitTotal+=p.waitSeconds;count++;}
      queued+=q.passengers.length;
    }
    this.averageWait=count?waitTotal/count:0;
    const serviceBonus=Math.min(8,trains.length*2);
    this.satisfaction=Math.max(25,Math.min(100,100-Math.max(0,queued-8)*1.6-Math.max(0,this.averageWait-20)*0.35+serviceBonus));
  }

  canReach(origin:string,target:string,lines:BuiltLine[]){
    return lines.some(l=>l.stations.includes(origin)&&l.stations.includes(target));
  }

  boardAt(stationId:string,line:BuiltLine,freeCapacity:number){
    const q=this.queues.get(stationId); if(!q||freeCapacity<=0)return [] as Passenger[];
    const boarded:Passenger[]=[];
    for(let i=q.passengers.length-1;i>=0&&boarded.length<freeCapacity;i--){
      const p=q.passengers[i];
      if(line.stations.includes(p.target)){boarded.push(p);q.passengers.splice(i,1);}
    }
    return boarded;
  }

  deliver(passengers:Passenger[],stationId:string){
    const remaining:Passenger[]=[];
    for(const p of passengers){if(p.target===stationId)this.delivered++;else remaining.push(p);}
    return remaining;
  }

  private spawn(active:string[]){
    const origin=active[Math.floor(Math.random()*active.length)];
    let target=origin;
    while(target===origin)target=active[Math.floor(Math.random()*active.length)];
    const q=this.queues.get(origin)!;
    if(q.passengers.length<20)q.passengers.push({id:this.seq++,origin,target,waitSeconds:0});
  }
}
