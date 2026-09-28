import { _decorator, Color, Component, EventTouch, Graphics, JsonAsset, Node, resources, UITransform, Vec2 } from 'cc';
import { GeoProjector } from '../map/GeoProjector';
import { GeoMath } from './GeoMath';
import { BosphorusRule } from './BosphorusRule';
import { NetworkModel } from './NetworkModel';
import { StationAnchor } from './TransitTypes';
const { ccclass, property } = _decorator;

@ccclass('LineBuildController')
export class LineBuildController extends Component {
  @property(Node) mapContent:Node|null=null;
  @property snapRadius=34;

  private graphics!:Graphics;
  private projector!:GeoProjector;
  private stations=new Map<string,StationAnchor>();
  private model!:NetworkModel;
  private dragFrom:StationAnchor|null=null;
  private pointer=new Vec2();
  private selectedLineId:string|undefined;
  private palette=['#D4513B','#2F6F9F','#2F8F6B','#E0A035','#7A5AA6','#3A8D8A'];

  start(){
    this.graphics=this.getComponent(Graphics) ?? this.addComponent(Graphics);
    resources.load('data/istanbul-atlas',JsonAsset,(err,asset)=>{
      if(err){console.error(err);return;}
      const atlas=asset.json as any;
      this.projector=new GeoProjector(atlas.map.bounds);
      for(const s of atlas.stations as StationAnchor[]) this.stations.set(s.id,s);
      this.model=new NetworkModel(this.stations);
      this.model.budgetM=64;
      this.redraw();
    });
    this.node.on(Node.EventType.TOUCH_START,this.onStart,this);
    this.node.on(Node.EventType.TOUCH_MOVE,this.onMove,this);
    this.node.on(Node.EventType.TOUCH_END,this.onEnd,this);
    this.node.on(Node.EventType.TOUCH_CANCEL,this.onEnd,this);
  }

  update(dt:number){
    if(!this.model)return;
    this.model.tick(dt);
    this.redraw();
  }

  private onStart(e:EventTouch){
    if(!this.model)return;
    const local=this.toLocal(e.getUILocation());
    const hit=this.nearest(local);
    if(hit && hit.distance<=this.snapRadius){
      this.dragFrom=hit.station;
      this.pointer=local;
    }
  }

  private onMove(e:EventTouch){
    if(!this.dragFrom)return;
    this.pointer=this.toLocal(e.getUILocation());
    this.redraw();
  }

  private onEnd(e:EventTouch){
    if(!this.dragFrom)return;
    const local=this.toLocal(e.getUILocation());
    const hit=this.nearest(local);
    if(hit && hit.distance<=this.snapRadius && hit.station.id!==this.dragFrom.id){
      try{
        const result=this.model.connect(this.dragFrom.id,hit.station.id,this.selectedLineId);
        this.selectedLineId=result.line.id;
      }catch(err){ console.warn('[METROVA]',err); }
    }
    this.dragFrom=null;
    this.redraw();
  }

  addTrain(){
    if(!this.selectedLineId)return;
    try{this.model.addTrain(this.selectedLineId);}catch(err){console.warn('[METROVA]',err);}
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
      const d=Vec2.distance(p,this.project(s,size));
      if(!best||d<best.distance)best={station:s,distance:d};
    }
    return best;
  }

  private project(s:StationAnchor,size:any){return this.projector.project(s.lat,s.lon,size);}
  private toLocal(ui:Vec2){return this.getComponent(UITransform)!.convertToNodeSpaceAR(new (require('cc').Vec3)(ui.x,ui.y,0)) as any as Vec2;}

  private dashed(g:Graphics,a:Vec2,b:Vec2,dash:number,gap:number){
    const d=Vec2.distance(a,b), dir=b.clone().subtract(a).normalize();
    for(let t=0;t<d;t+=dash+gap){
      const p1=a.clone().add(dir.clone().multiplyScalar(t));
      const p2=a.clone().add(dir.clone().multiplyScalar(Math.min(t+dash,d)));
      g.moveTo(p1.x,p1.y);g.lineTo(p2.x,p2.y);g.stroke();
    }
  }
}
