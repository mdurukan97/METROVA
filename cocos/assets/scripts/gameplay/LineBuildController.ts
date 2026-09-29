import { _decorator, Color, Component, EventTouch, Graphics, JsonAsset, Node, resources, UITransform, Vec2, Vec3 } from 'cc';
import { GeoProjector } from '../map/GeoProjector';
import { GeoMath } from './GeoMath';
import { BosphorusRule } from './BosphorusRule';
import { NetworkModel, NetworkSnapshot } from './NetworkModel';
import { BuiltLine, StationAnchor, TrainState } from './TransitTypes';
import { PassengerSimulation } from './PassengerSimulation';
import { NetworkMetrics } from './NetworkMetrics';
import { ISTANBUL_GAMEPLAY_BOUNDS } from '../map/MapProjectionConfig';
import { GameClock } from './GameClock';
import { UndoStack } from './UndoStack';
const { ccclass, property } = _decorator;

@ccclass('LineBuildController')
export class LineBuildController extends Component {
  @property(Node) mapContent:Node|null=null;
  @property snapRadius=34;

  private graphics!:Graphics;
  private projector!:GeoProjector;
  private stations=new Map<string,StationAnchor>();
  private model!:NetworkModel;
  public passengers!:PassengerSimulation;
  public metrics!:NetworkMetrics;
  private activeStationIds:string[]=[];
  private dragFrom:StationAnchor|null=null;
  private pointer=new Vec2();
  private selectedLineId:string|undefined;
  public readonly clock=new GameClock();
  private undoStack=new UndoStack<NetworkSnapshot>(6000);
  private buildPreview:{from:string;to:string;distanceKm:number;costM:number;tunnel:boolean}|null=null;
  private planned:{from:string;to:string;lineId?:string}|null=null;
  private palette=['#D4513B','#2F6F9F','#2F8F6B','#E0A035','#7A5AA6','#3A8D8A'];

  start(){
    this.graphics=this.getComponent(Graphics) ?? this.addComponent(Graphics);
    resources.load('data/istanbul-atlas',JsonAsset,(err,asset)=>{
      if(err){console.error(err);return;}
      const atlas=asset.json as any;
      this.projector=new GeoProjector(ISTANBUL_GAMEPLAY_BOUNDS);
      for(const s of atlas.stations as StationAnchor[]) this.stations.set(s.id,s);
      this.model=new NetworkModel(this.stations);
      this.model.budgetM=64;
      this.passengers=new PassengerSimulation(this.stations.values());
      this.metrics=new NetworkMetrics(this.model,this.passengers);
      this.activeStationIds=['yenikapi','taksim','mecidiyekoy','gayrettepe','uskudar','altunizade'];
      this.model.onTrainArrive=(train,line,stationId)=>this.onTrainArrive(train,line,stationId);
      this.redraw();
    });
    this.node.on(Node.EventType.TOUCH_START,this.onStart,this);
    this.node.on(Node.EventType.TOUCH_MOVE,this.onMove,this);
    this.node.on(Node.EventType.TOUCH_END,this.onEnd,this);
    this.node.on(Node.EventType.TOUCH_CANCEL,this.onEnd,this);
  }

  update(dt:number){
    if(!this.model)return;
    const scaled=this.clock.scaledDelta(dt);
    if(scaled>0){
      this.model.tick(scaled);
      this.passengers?.tick(scaled,this.activeStationIds,this.model.lines,this.model.trains);
    }
    this.redraw();
  }

  private onStart(e:EventTouch){
    if(!this.model)return;
    const local=this.toLocal(e.getUILocation());
    const hit=this.nearest(local);
    if(hit && hit.distance<=this.snapRadius && this.activeStationIds.includes(hit.station.id)){
      this.dragFrom=hit.station;
      this.pointer=local;
    }
  }

  private onMove(e:EventTouch){
    if(!this.dragFrom)return;
    this.pointer=this.toLocal(e.getUILocation());
    this.refreshBuildPreview();
    this.redraw();
  }

  private onEnd(e:EventTouch){
    if(!this.dragFrom)return;
    const local=this.toLocal(e.getUILocation());
    const hit=this.nearest(local);
    if(hit && hit.distance<=this.snapRadius && hit.station.id!==this.dragFrom.id && this.activeStationIds.includes(hit.station.id)){
      const extend=this.selectedLineId&&this.model.canExtend(this.selectedLineId,this.dragFrom.id)?this.selectedLineId:undefined;
      if(this.clock.paused){
        this.planned={from:this.dragFrom.id,to:hit.station.id,lineId:extend};
      }else{
        this.commitConnection(this.dragFrom.id,hit.station.id,extend);
      }
    }
    this.dragFrom=null;
    this.buildPreview=null;
    this.redraw();
  }

  addTrain(){
    if(!this.selectedLineId||this.clock.paused)return;
    try{
      this.undoStack.push(this.model.snapshot());
      this.model.addTrain(this.selectedLineId);
    }catch(err){console.warn('[METROVA]',err);}
  }

  togglePause(){
    if(this.clock.paused){
      this.clock.resume();
      this.commitPlan();
    }else this.clock.pause();
  }

  setSpeed(speed:1|2|3){
    const wasPaused=this.clock.paused;
    this.clock.setSpeed(speed);
    if(wasPaused)this.commitPlan();
  }

  undo(){
    const state=this.undoStack.pop();
    if(!state)return false;
    this.model.restore(state);
    if(this.selectedLineId&&!this.model.lines.some(l=>l.id===this.selectedLineId))this.selectedLineId=undefined;
    this.redraw();
    return true;
  }

  getUndoSeconds(){return this.undoStack.secondsLeft();}

  getBuildPreview(){return this.buildPreview;}

  getPlannedBuild(){return this.planned;}

  setActiveStations(ids:string[]){
    this.activeStationIds=ids.filter(id=>this.stations.has(id));
  }

  private commitConnection(from:string,to:string,lineId?:string){
    try{
      this.undoStack.push(this.model.snapshot());
      const result=this.model.connect(from,to,lineId);
      this.selectedLineId=result.line.id;
    }catch(err){console.warn('[METROVA]',err);}
  }

  private commitPlan(){
    if(!this.planned)return;
    const p=this.planned;
    this.planned=null;
    this.commitConnection(p.from,p.to,p.lineId);
  }

  private refreshBuildPreview(){
    if(!this.dragFrom){this.buildPreview=null;return;}
    const target=this.nearest(this.pointer);
    if(!target||target.distance>this.snapRadius||target.station.id===this.dragFrom.id||!this.activeStationIds.includes(target.station.id)){
      this.buildPreview=null;return;
    }
    const tunnel=BosphorusRule.requiresTunnel(this.dragFrom,target.station);
    const distanceKm=GeoMath.distanceKm(this.dragFrom,target.station);
    this.buildPreview={from:this.dragFrom.id,to:target.station.id,distanceKm,costM:GeoMath.segmentCostM(distanceKm,tunnel),tunnel};
  }

  isBuildingLine(){return this.dragFrom!==null;}

  getSelectedLineSummary(){
    if(!this.selectedLineId)return null;
    const line=this.model?.lines.find(l=>l.id===this.selectedLineId);
    if(!line)return null;
    const distanceKm=line.segments.reduce((s,x)=>s+x.distanceKm,0);
    const tunnelKm=line.segments.filter(x=>x.tunnel).reduce((s,x)=>s+x.distanceKm,0);
    const buildCostM=line.segments.reduce((s,x)=>s+x.costM,0);
    return {
      id:line.id,
      stationNames:line.stations.map(id=>this.stations.get(id)?.name??id),
      distanceKm,
      tunnelKm,
      buildCostM,
      trainCount:this.model.trains.filter(t=>t.lineId===line.id).length
    };
  }

  getNetworkModel(){return this.model;}

  setBudget(value:number){if(this.model)this.model.budgetM=value;}

  getMetrics(){
    return this.metrics?.snapshot() ?? null;
  }

  private onTrainArrive(train:TrainState,line:BuiltLine,stationId:string){
    if(!this.passengers)return;
    const remaining=this.passengers.deliver(
      train.onboardTargets.map((target,index)=>({id:index,origin:'',target,waitSeconds:0})),
      stationId
    );
    train.onboardTargets=remaining.map(p=>p.target);
    const boarded=this.passengers.boardAt(stationId,line,train.capacity-train.onboardTargets.length);
    train.onboardTargets.push(...boarded.map(p=>p.target));
    train.passengers=train.onboardTargets.length;
  }

  private redraw(){
    if(!this.model || !this.projector)return;
    const g=this.graphics; g.clear();
    const size=this.getComponent(UITransform)!.contentSize;
    for(const line of this.model.lines){
      g.strokeColor=new Color(this.palette[line.colorIndex]);
      g.lineWidth=9;
      for(const seg of line.segments){
        const a=this.project(this.stations.get(seg.from)!,size);
        const b=this.project(this.stations.get(seg.to)!,size);
        if(seg.tunnel) this.dashed(g,a,b,12,8); else {g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}
      }
    }
    if(this.planned){
      const a=this.project(this.stations.get(this.planned.from)!,size);
      const b=this.project(this.stations.get(this.planned.to)!,size);
      g.strokeColor=new Color(116,196,255,205);g.lineWidth=7;
      this.dashed(g,a,b,14,8);
    }
    if(this.dragFrom){
      const a=this.project(this.dragFrom,size);
      const target=this.nearest(this.pointer);
      const b=target&&target.distance<=this.snapRadius?this.project(target.station,size):this.pointer;
      const tunnel=target?BosphorusRule.requiresTunnel(this.dragFrom,target.station):false;
      g.strokeColor=new Color(tunnel?'#D49A37':'#D4513B');
      g.lineWidth=6; this.dashed(g,a,b,10,7);
      if(target&&target.station.id!==this.dragFrom.id){
        const km=GeoMath.distanceKm(this.dragFrom,target.station);
        const cost=GeoMath.segmentCostM(km,tunnel);
        // HUD reads this model next; console output remains useful during Creator preview.
        console.debug(`[METROVA] ${km.toFixed(1)} km · ${cost.toFixed(1)} M${tunnel?' · TÜNEL':''}`);
      }
    }
  }

  private nearest(p:Vec2){
    const size=this.getComponent(UITransform)!.contentSize;
    let best:{station:StationAnchor;distance:number}|null=null;
    for(const s of this.stations.values()){
      if(!this.activeStationIds.includes(s.id))continue;
      const d=Vec2.distance(p,this.project(s,size));
      if(!best||d<best.distance)best={station:s,distance:d};
    }
    return best;
  }

  private project(s:StationAnchor,size:any){return this.projector.project(s.lat,s.lon,size);}
  private toLocal(ui:Vec2){const p=this.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(ui.x,ui.y,0)); return new Vec2(p.x,p.y);}

  private dashed(g:Graphics,a:Vec2,b:Vec2,dash:number,gap:number){
    const d=Vec2.distance(a,b), dir=b.clone().subtract(a).normalize();
    for(let t=0;t<d;t+=dash+gap){
      const p1=a.clone().add(dir.clone().multiplyScalar(t));
      const p2=a.clone().add(dir.clone().multiplyScalar(Math.min(t+dash,d)));
      g.moveTo(p1.x,p1.y);g.lineTo(p2.x,p2.y);g.stroke();
    }
  }
}
