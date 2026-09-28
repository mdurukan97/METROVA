import { BosphorusRule } from './BosphorusRule';
import { GeoMath } from './GeoMath';
import { BuiltLine, BuiltSegment, StationAnchor, TrainState } from './TransitTypes';

export class NetworkModel {
  readonly lines:BuiltLine[]=[];
  readonly trains:TrainState[]=[];
  budgetM=64;
  private lineSeq=1;
  private segmentSeq=1;
  private trainSeq=1;

  constructor(private readonly stations:Map<string,StationAnchor>){}

  connect(fromId:string,toId:string,lineId?:string){
    if(fromId===toId) throw new Error('Same-station segment is invalid');
    const from=this.requireStation(fromId), to=this.requireStation(toId);
    const distanceKm=GeoMath.distanceKm(from,to);
    const tunnel=BosphorusRule.requiresTunnel(from,to);
    const costM=GeoMath.segmentCostM(distanceKm,tunnel);
    if(costM>this.budgetM) throw new Error(`Budget insufficient: ${costM.toFixed(1)} M`);

    let line=lineId?this.lines.find(l=>l.id===lineId):undefined;
    if(!line){
      line={id:`L${this.lineSeq++}`,colorIndex:(this.lineSeq-2)%6,stations:[fromId],segments:[]};
      this.lines.push(line);
    }
    const end=line.stations[line.stations.length-1];
    const start=line.stations[0];
    if(end===fromId) line.stations.push(toId);
    else if(start===fromId) line.stations.unshift(toId);
    else throw new Error('Extension must start at a line terminal');

    const segment:BuiltSegment={id:`S${this.segmentSeq++}`,from:fromId,to:toId,distanceKm,tunnel,costM};
    line.segments.push(segment);
    this.budgetM=Math.round((this.budgetM-costM)*10)/10;
    return {line,segment};
  }

  addTrain(lineId:string){
    const line=this.lines.find(l=>l.id===lineId);
    if(!line || line.stations.length<2) throw new Error('Line is not train-ready');
    const price=4;
    if(this.budgetM<price) throw new Error('Budget insufficient for train');
    this.budgetM-=price;
    const train:TrainState={id:`T${this.trainSeq++}`,lineId,segmentIndex:0,progress:0,direction:1,capacity:18,passengers:0};
    this.trains.push(train);
    return train;
  }

  tick(deltaSeconds:number,speed=1){
    for(const train of this.trains){
      const line=this.lines.find(l=>l.id===train.lineId)!;
      if(!line.segments.length) continue;
      const segment=line.segments[train.segmentIndex];
      const seconds=Math.max(5,segment.distanceKm*4.5);
      train.progress+=deltaSeconds*speed/seconds;
      if(train.progress<1) continue;
      train.progress=0;
      if(train.direction===1 && train.segmentIndex>=line.segments.length-1) train.direction=-1;
      else if(train.direction===-1 && train.segmentIndex<=0) train.direction=1;
      else train.segmentIndex+=train.direction;
    }
  }

  private requireStation(id:string){
    const s=this.stations.get(id);
    if(!s) throw new Error(`Unknown station: ${id}`);
    return s;
  }
}
