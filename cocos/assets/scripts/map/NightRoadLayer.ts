import { _decorator, Color, Component, Graphics, JsonAsset, Node, resources, UITransform } from 'cc';
import { GeoProjector } from './GeoProjector';
import { ISTANBUL_GAMEPLAY_BOUNDS } from './MapProjectionConfig';
const { ccclass, property } = _decorator;

type Road={tier:number;highway:string;name:string;points:[number,number][]};
type RoadAsset={bounds:{west:number;east:number;south:number;north:number};roads:Road[]};

@ccclass('NightRoadLayer')
export class NightRoadLayer extends Component {
  @property(Node) mapContent:Node|null=null;
  private roads:Road[]=[];
  private graphics!:Graphics;
  private projector!:GeoProjector;
  private lastLod=-1;

  start(){
    this.graphics=this.getComponent(Graphics)??this.addComponent(Graphics);
    resources.load('data/istanbul-night-roads',JsonAsset,(err,asset)=>{
      if(err){console.error('[METROVA] night road atlas missing. Run npm run atlas:roads.',err);return;}
      const data=asset.json as RoadAsset;
      this.roads=data.roads;
      this.projector=new GeoProjector(ISTANBUL_GAMEPLAY_BOUNDS);
      this.redraw(true);
    });
  }

  update(){
    if(!this.roads.length)return;
    const z=this.mapContent?.scale.x??1;
    const lod=z>=2.25?3:z>=1.55?2:z>=1.15?1:0;
    if(lod!==this.lastLod)this.redraw();
  }

  private redraw(force=false){
    if(!this.roads.length||!this.projector)return;
    const z=this.mapContent?.scale.x??1;
    const lod=z>=2.25?3:z>=1.55?2:z>=1.15?1:0;
    if(!force&&lod===this.lastLod)return;
    this.lastLod=lod;
    const size=this.getComponent(UITransform)!.contentSize;
    const g=this.graphics;g.clear();

    // Glow pass: wide translucent amber strokes.
    for(const r of this.roads){
      if(r.tier>lod)continue;
      g.strokeColor=r.tier===0?new Color(255,137,41,88):new Color(232,120,38,44);
      g.lineWidth=[8,6,4,2][r.tier];
      this.path(g,r,size);
    }
    // Core pass: bright road center.
    for(const r of this.roads){
      if(r.tier>lod)continue;
      g.strokeColor=r.tier<=1?new Color('#FFB14B'):r.tier===2?new Color('#D88A38'):new Color('#8E5D32');
      g.lineWidth=[2.7,2.1,1.45,0.8][r.tier];
      this.path(g,r,size);
    }
  }

  private path(g:Graphics,r:Road,size:any){
    if(r.points.length<2)return;
    const p0=this.projector.project(r.points[0][1],r.points[0][0],size);
    g.moveTo(p0.x,p0.y);
    for(let i=1;i<r.points.length;i++){
      const p=this.projector.project(r.points[i][1],r.points[i][0],size);
      g.lineTo(p.x,p.y);
    }
    g.stroke();
  }
}
