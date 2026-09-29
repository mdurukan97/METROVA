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
  onTrainArrive:((train:TrainState,line:BuiltLine,stationId:string)=>void)|null=null;
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
    const train:TrainState={id:`T${this.trainSeq++}`,lineId,segmentIndex:0,progress:0,direction:1,capacity:18,passengers:0,onboardTargets:[]};
    this.trains.push(train);
    return train;
  }

  tick(deltaSeconds:number,speed=1){
    for(const train of this.trains){
      const line=this.lines.find(l=>l.id===train.lineId);
      if(!line||!line.segments.length)continue;
      const segment=line.segments[train.segmentIndex];
      const seconds=Math.max(5,segment.distanceKm*4.5);
      train.progress+=deltaSeconds*speed/seconds;
      if(train.progress<1)continue;

      train.progress=0;
      const arrival=train.direction===1?segment.to:segment.from;
      this.onTrainArrive?.(train,line,arrival);

      if(train.direction===1){
        if(train.segmentIndex>=line.segments.length-1)train.direction=-1;
        else train.segmentIndex++;
      }else{
        if(train.segmentIndex<=0)train.direction=1;
        else train.segmentIndex--;
      }
    }
  }

  private clone<T>(value:T):T{return JSON.parse(JSON.stringify(value)) as T;}

  private requireStation(id:string){
    const s=this.stations.get(id);
    if(!s)throw new Error(`Unknown station: ${id}`);
    return s;
  }
}
