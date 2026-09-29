import { _decorator, Color, Component, Graphics, JsonAsset, resources, UITransform, Vec2 } from 'cc';
import { GeoProjector } from '../map/GeoProjector';
import { LineBuildController } from './LineBuildController';
import { StationAnchor } from './TransitTypes';
import { ISTANBUL_GAMEPLAY_BOUNDS } from '../map/MapProjectionConfig';
const { ccclass, property } = _decorator;

@ccclass('TrainVisualLayer')
export class TrainVisualLayer extends Component {
  @property(LineBuildController) builder:LineBuildController|null=null;
  private g!:Graphics;
  private projector!:GeoProjector;
  private stations=new Map<string,StationAnchor>();

  start(){
    this.g=this.getComponent(Graphics)??this.addComponent(Graphics);
    resources.load('data/istanbul-atlas',JsonAsset,(err,asset)=>{
      if(err)return;
      const atlas=asset.json as any;
      this.projector=new GeoProjector(ISTANBUL_GAMEPLAY_BOUNDS);
      for(const s of atlas.stations as StationAnchor[])this.stations.set(s.id,s);
    });
  }

  lateUpdate(){
    if(!this.builder||!this.projector)return;
    const model=(this.builder as any).model;
    if(!model)return;
    const size=this.getComponent(UITransform)!.contentSize;
    this.g.clear();
    for(const train of model.trains){
      const line=model.lines.find((l:any)=>l.id===train.lineId);
      if(!line||!line.segments.length)continue;
      const seg=line.segments[train.segmentIndex];
      const a=this.project(seg.from,size),b=this.project(seg.to,size);
      const t=train.direction===1?train.progress:1-train.progress;
      const p=a.clone().lerp(b,t);
      const tangent=b.clone().subtract(a).normalize();
      const normal=new Vec2(-tangent.y,tangent.x);
      const half=12,wide=6;
      const corners=[
        p.clone().add(tangent.clone().multiplyScalar(-half)).add(normal.clone().multiplyScalar(-wide)),
        p.clone().add(tangent.clone().multiplyScalar(half)).add(normal.clone().multiplyScalar(-wide)),
        p.clone().add(tangent.clone().multiplyScalar(half)).add(normal.clone().multiplyScalar(wide)),
        p.clone().add(tangent.clone().multiplyScalar(-half)).add(normal.clone().multiplyScalar(wide))
      ];
      this.g.fillColor=new Color(255,255,255,245);
      this.g.strokeColor=new Color('#07131B');this.g.lineWidth=2;
      this.g.moveTo(corners[0].x,corners[0].y);
      for(let i=1;i<corners.length;i++)this.g.lineTo(corners[i].x,corners[i].y);
      this.g.close();this.g.fill();this.g.stroke();
      this.g.fillColor=new Color('#6FD7FF');
      this.g.circle(p.x,p.y,2.5);this.g.fill();
    }
  }

  private project(id:string,size:any){
    const s=this.stations.get(id)!;
    return this.projector.project(s.lat,s.lon,size);
  }
}
