import { BuiltLine, StationAnchor, TrainState } from './TransitTypes';
import { RoutePlan, RoutePlanner } from './RoutePlanner';

export type Passenger = {
  id:number;
  origin:string;
  target:string;
  waitSeconds:number;
  route?:RoutePlan;
  routeIndex?:number;
};
export type StationQueue = { stationId:string; passengers:Passenger[] };

export class PassengerSimulation {
  readonly queues=new Map<string,StationQueue>();
  delivered=0;
  transfersCompleted=0;
  satisfaction=100;
  averageWait=0;
  private seq=1;
  private spawnAccumulator=0;
  private readonly planner=new RoutePlanner();
  private readonly onboard=new Map<string,Passenger[]>();

  constructor(stations:Iterable<StationAnchor>){
    for(const s of stations)this.queues.set(s.id,{stationId:s.id,passengers:[]});
  }

  tick(dt:number,activeStationIds:string[],lines:BuiltLine[],trains:TrainState[]){
    if(activeStationIds.length<2)return;
    const activeTrains=new Set(trains.filter(train=>!train.queuedAtTerminal).map(train=>train.id));
    for(const trainId of this.onboard.keys())if(!activeTrains.has(trainId))this.onboard.delete(trainId);
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
    const serviceBonus=Math.min(8,trains.filter(train=>!train.queuedAtTerminal).length*2);
    this.satisfaction=Math.max(25,Math.min(100,100-Math.max(0,queued-8)*1.6-Math.max(0,this.averageWait-20)*0.35+serviceBonus));
  }

  canReach(origin:string,target:string,lines:BuiltLine[]){
    return this.planner.plan(origin,target,lines)!==null;
  }

  enqueuePassenger(origin:string,target:string,waitSeconds=0){
    if(origin===target)throw new Error('Passenger origin and target must differ');
    const queue=this.queues.get(origin);
    if(!queue||!this.queues.has(target))throw new Error('Unknown passenger station');
    const passenger:Passenger={id:this.seq++,origin,target,waitSeconds};
    queue.passengers.push(passenger);
    return passenger;
  }

  boardAt(
    stationId:string,
    line:BuiltLine,
    freeCapacity:number,
    lines:BuiltLine[]=[line],
    nextStationId?:string
  ){
    const q=this.queues.get(stationId); if(!q||freeCapacity<=0)return [] as Passenger[];
    const boarded:Passenger[]=[];
    for(let i=q.passengers.length-1;i>=0&&boarded.length<freeCapacity;i--){
      const p=q.passengers[i];
      const route=this.planner.plan(stationId,p.target,lines);
      if(!route||route.lineIds[0]!==line.id)continue;
      if(nextStationId&&route.stations[1]!==nextStationId)continue;
      p.route=route;
      p.routeIndex=0;
      boarded.push(p);
      q.passengers.splice(i,1);
    }
    return boarded;
  }

  handleTrainArrival(
    train:TrainState,
    line:BuiltLine,
    stationId:string,
    nextStationId:string,
    lines:BuiltLine[]
  ){
    const staying:Passenger[]=[];
    for(const passenger of this.onboard.get(train.id)??[]){
      const route=passenger.route;
      const nextIndex=route?.stations.indexOf(stationId,(passenger.routeIndex??0)+1)??-1;
      if(nextIndex>=0)passenger.routeIndex=nextIndex;
      if(passenger.target===stationId){this.delivered++;continue;}

      const nextLine=route?.lineIds[passenger.routeIndex??0];
      if(!route||nextLine!==line.id){
        if(route&&nextLine&&nextLine!==line.id)this.transfersCompleted++;
        passenger.route=undefined;
        passenger.routeIndex=0;
        this.queues.get(stationId)?.passengers.push(passenger);
      }else staying.push(passenger);
    }

    const boarded=this.boardAt(
      stationId,line,Math.max(0,train.capacity-staying.length),lines,nextStationId
    );
    const onboard=[...staying,...boarded];
    this.onboard.set(train.id,onboard);
    return onboard;
  }

  private spawn(active:string[]){
    const origin=active[Math.floor(Math.random()*active.length)];
    let target=origin;
    while(target===origin)target=active[Math.floor(Math.random()*active.length)];
    const q=this.queues.get(origin)!;
    if(q.passengers.length<20)this.enqueuePassenger(origin,target);
  }
}
