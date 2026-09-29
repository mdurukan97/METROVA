import { BosphorusRule } from './BosphorusRule';
import { GeoMath } from './GeoMath';
import { BuiltLine, BuiltSegment, StationAnchor, TrainState } from './TransitTypes';

export type NetworkSnapshot={
  budgetM:number;
  lines:BuiltLine[];
  trains:TrainState[];
  lineSeq:number;
  segmentSeq:number;
  trainSeq:number;
};

export class NetworkModel {
  readonly lines:BuiltLine[]=[];
  readonly trains:TrainState[]=[];
  budgetM=64;
  onTrainArrive:((train:TrainState,line:BuiltLine,stationId:string,nextStationId:string)=>void)|null=null;
  readonly trainLengthKm=0.12;
  readonly minimumSignalBlockKm=0.18;
  private lineSeq=1;
  private segmentSeq=1;
  private trainSeq=1;

  constructor(private readonly stations:Map<string,StationAnchor>){}

  snapshot():NetworkSnapshot{
    return {
      budgetM:this.budgetM,
      lines:this.clone(this.lines),
      trains:this.clone(this.trains),
      lineSeq:this.lineSeq,
      segmentSeq:this.segmentSeq,
      trainSeq:this.trainSeq
    };
  }

  restore(snapshot:NetworkSnapshot){
    this.budgetM=snapshot.budgetM;
    this.lines.splice(0,this.lines.length,...this.clone(snapshot.lines));
    this.trains.splice(0,this.trains.length,...this.clone(snapshot.trains));
    this.lineSeq=snapshot.lineSeq;
    this.segmentSeq=snapshot.segmentSeq;
    this.trainSeq=snapshot.trainSeq;
  }

  canExtend(lineId:string,stationId:string){
    const line=this.lines.find(l=>l.id===lineId);
    if(!line||!line.stations.length)return false;
    return line.stations[0]===stationId||line.stations[line.stations.length-1]===stationId;
  }

  connect(fromId:string,toId:string,lineId?:string){
    if(fromId===toId)throw new Error('Same-station segment is invalid');
    const from=this.requireStation(fromId),to=this.requireStation(toId);
    const distanceKm=GeoMath.distanceKm(from,to);
    const tunnel=BosphorusRule.requiresTunnel(from,to);
    const costM=GeoMath.segmentCostM(distanceKm,tunnel);
    if(costM>this.budgetM)throw new Error(`Budget insufficient: ${costM.toFixed(1)} M`);

    let line=lineId?this.lines.find(l=>l.id===lineId):undefined;
    if(line&&!this.canExtend(line.id,fromId))line=undefined;
    if(!line){
      line={id:`L${this.lineSeq++}`,colorIndex:(this.lineSeq-2)%6,stations:[fromId],segments:[]};
      this.lines.push(line);
    }

    const end=line.stations[line.stations.length-1],start=line.stations[0];
    const segment:BuiltSegment={id:`S${this.segmentSeq++}`,from:fromId,to:toId,distanceKm,tunnel,costM};
    if(end===fromId){
      line.stations.push(toId);
      line.segments.push(segment);
    }else if(start===fromId){
      line.stations.unshift(toId);
      line.segments.unshift({...segment,from:toId,to:fromId});
      for(const train of this.trains)if(train.lineId===line.id)train.segmentIndex++;
    }else throw new Error('Extension must start at a line terminal');

    this.budgetM=Math.round((this.budgetM-costM)*10)/10;
    return {line,segment};
  }

  addTrain(lineId:string){
    const line=this.lines.find(l=>l.id===lineId);
    if(!line||line.stations.length<2)throw new Error('Line is not train-ready');
    const price=4;
    if(this.budgetM<price)throw new Error('Budget insufficient for train');
    this.budgetM=Math.round((this.budgetM-price)*10)/10;
    const segmentIndex=line.segments.length-1;
    const terminalPosition=this.lineLengthKm(line);
    const unsafe=this.trains.some(train=>
      train.lineId===lineId&&!train.queuedAtTerminal&&
      Math.abs(this.positionOnLine(train,line)-terminalPosition)<this.safeHeadwayKm(1)
    );
    const train:TrainState={
      id:`T${this.trainSeq++}`,lineId,segmentIndex,progress:0,direction:-1,
      capacity:18,passengers:0,onboardTargets:[],queuedAtTerminal:unsafe||undefined
    };
    this.trains.push(train);
    return train;
  }

  tick(deltaSeconds:number,speed=1){
    for(const line of this.lines){
      if(!line.segments.length)continue;
      const lineTrains=this.trains.filter(train=>train.lineId===line.id);
      this.activateQueuedTrains(line,lineTrains,speed);
      const active=lineTrains.filter(train=>!train.queuedAtTerminal);
      const positions=new Map(active.map(train=>[train.id,this.positionOnLine(train,line)]));
      active.sort((a,b)=>a.direction===b.direction
        ?a.direction===1?(positions.get(b.id)!-positions.get(a.id)!):(positions.get(a.id)!-positions.get(b.id)!)
        :a.direction-b.direction);
      for(const train of active){
      const segment=line.segments[train.segmentIndex];
      const seconds=Math.max(5,segment.distanceKm*4.5);
      let travelKm=segment.distanceKm*deltaSeconds*speed/seconds;
      const position=positions.get(train.id)!;
      const leaders=active.filter(other=>
        other.id!==train.id&&other.direction===train.direction&&
        (train.direction===1?positions.get(other.id)!>position:positions.get(other.id)!<position)
      );
      if(leaders.length){
        const leaderPosition=train.direction===1
          ?Math.min(...leaders.map(other=>positions.get(other.id)!))
          :Math.max(...leaders.map(other=>positions.get(other.id)!));
        const available=train.direction===1
          ?leaderPosition-position-this.safeHeadwayKm(speed)
          :position-leaderPosition-this.safeHeadwayKm(speed);
        travelKm=Math.max(0,Math.min(travelKm,available));
      }
      train.progress+=travelKm/Math.max(0.001,segment.distanceKm);
      positions.set(train.id,position+travelKm*train.direction);
      if(train.progress<1)continue;

      train.progress=0;
      const arrival=train.direction===1?segment.to:segment.from;
      if(train.direction===1){
        if(train.segmentIndex>=line.segments.length-1)train.direction=-1;
        else train.segmentIndex++;
      }else{
        if(train.segmentIndex<=0)train.direction=1;
        else train.segmentIndex--;
      }
      const nextSegment=line.segments[train.segmentIndex];
      const nextStationId=train.direction===1?nextSegment.to:nextSegment.from;
      this.onTrainArrive?.(train,line,arrival,nextStationId);
      positions.set(train.id,this.positionOnLine(train,line));
      }
    }
  }

  positionOnLine(train:TrainState,line?:BuiltLine){
    const route=line??this.lines.find(item=>item.id===train.lineId);
    if(!route)return 0;
    let position=0;
    for(let index=0;index<train.segmentIndex;index++)position+=route.segments[index]?.distanceKm??0;
    const segment=route.segments[train.segmentIndex];
    if(!segment)return position;
    return position+(train.direction===1?train.progress:1-train.progress)*segment.distanceKm;
  }

  safeHeadwayKm(speed:number){
    const speedMarginKm=Math.min(0.20,Math.max(0,speed-1)*0.05);
    return this.trainLengthKm+this.minimumSignalBlockKm+speedMarginKm;
  }

  private activateQueuedTrains(line:BuiltLine,trains:TrainState[],speed:number){
    const terminalPosition=this.lineLengthKm(line);
    for(const train of trains.filter(item=>item.queuedAtTerminal)){
      const nearest=trains
        .filter(other=>other.id!==train.id&&!other.queuedAtTerminal&&other.direction===-1)
        .map(other=>terminalPosition-this.positionOnLine(other,line))
        .filter(distance=>distance>=0)
        .sort((a,b)=>a-b)[0];
      if(nearest===undefined||nearest>=this.safeHeadwayKm(speed))train.queuedAtTerminal=false;
    }
  }

  private lineLengthKm(line:BuiltLine){
    return line.segments.reduce((total,segment)=>total+segment.distanceKm,0);
  }

  private clone<T>(value:T):T{return JSON.parse(JSON.stringify(value)) as T;}

  private requireStation(id:string){
    const s=this.stations.get(id);
    if(!s)throw new Error(`Unknown station: ${id}`);
    return s;
  }
}
