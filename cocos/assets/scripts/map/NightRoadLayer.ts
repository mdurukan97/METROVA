import { _decorator, Color, Component, Graphics, JsonAsset, Node, resources, UITransform } from 'cc';
import { GeoProjector } from './GeoProjector';
import { ISTANBUL_GAMEPLAY_BOUNDS } from './MapProjectionConfig';
const { ccclass, property } = _decorator;

type PackedRoad=[number,number[]];
type RoadAsset={
  schemaVersion:number;
  bounds:{west:number;east:number;south:number;north:number};
  quantization:number;
  roadCount?:number;
  roads:PackedRoad[];
};

@ccclass('NightRoadLayer')
export class NightRoadLayer extends Component {
  @property(Node) mapContent:Node|null=null;
  private roads:PackedRoad[]=[];
  private sourceBounds:RoadAsset['bounds']|null=null;
  private quantization=100000;
  private graphics!:Graphics;
  private projector!:GeoProjector;
  private lastLod=-1;

  start(){
    this.graphics=(this.getComponent(Graphics)??this.addComponent(Graphics))!;
    resources.load('data/istanbul-night-roads',JsonAsset,(err,asset)=>{
      if(err){console.error('[METROVA] night road atlas missing. Run npm run atlas:roads.',err);return;}
      const data=asset.json as RoadAsset;
      if(data.schemaVersion!==2||!Array.isArray(data.roads)||!data.bounds)throw new Error('Unsupported night road atlas schema');
      this.roads=data.roads;
      this.sourceBounds=data.bounds;
      this.quantization=data.quantization||100000;
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
    if(!this.roads.length||!this.projector||!this.sourceBounds)return;
    const z=this.mapContent?.scale.x??1;
    const lod=z>=2.25?3:z>=1.55?2:z>=1.15?1:0;
    if(!force&&lod===this.lastLod)return;
    this.lastLod=lod;
    const size=this.getComponent(UITransform)!.contentSize;
    const g=this.graphics;g.clear();

    for(const r of this.roads){
      if(r[0]>lod)continue;
      g.strokeColor=r[0]===0?new Color(255,137,41,88):new Color(232,120,38,44);
      g.lineWidth=[8,6,4,2][r[0]];
      this.path(g,r,size);
    }
    for(const r of this.roads){
      if(r[0]>lod)continue;
      g.strokeColor=r[0]<=1?new Color('#FFB14B'):r[0]===2?new Color('#D88A38'):new Color('#8E5D32');
      g.lineWidth=[2.7,2.1,1.45,0.8][r[0]];
      this.path(g,r,size);
    }
  }

  private path(g:Graphics,r:PackedRoad,size:any){
    if(!this.sourceBounds)return;
    const c=r[1];if(c.length<4)return;
    let x=c[0],y=c[1];
    let p=this.projector.project(this.sourceBounds.south+y/this.quantization,this.sourceBounds.west+x/this.quantization,size);
    g.moveTo(p.x,p.y);
    for(let i=2;i<c.length;i+=2){
      x+=c[i];y+=c[i+1];
      p=this.projector.project(this.sourceBounds.south+y/this.quantization,this.sourceBounds.west+x/this.quantization,size);
      g.lineTo(p.x,p.y);
    }
    g.stroke();
  }
}
