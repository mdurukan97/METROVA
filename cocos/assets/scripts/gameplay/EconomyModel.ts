import { BuiltLine } from './TransitTypes';

export class EconomyModel {
  municipalGrantM=7.5;
  farePerPassengerM=0.018;

  projectedAnnualNetM(delivered:number,lines:BuiltLine[],trainCount:number,transferCount:number){
    const revenue=this.municipalGrantM+delivered*this.farePerPassengerM;
    const segmentMaintenance=lines.reduce((sum,l)=>sum+l.segments.reduce((s,x)=>s+x.distanceKm*(x.tunnel?0.22:0.11),0),0);
    const trainMaintenance=trainCount*0.85;
    const transferMaintenance=transferCount*0.65;
    return Math.round((revenue-segmentMaintenance-trainMaintenance-transferMaintenance)*10)/10;
  }
}
