import { _decorator, Color, Component, Graphics, JsonAsset, Node, resources, UITransform, Vec2 } from 'cc';
import { GeoProjector } from './GeoProjector';
import { ISTANBUL_GAMEPLAY_BOUNDS } from './MapProjectionConfig';
const { ccclass, property } = _decorator;

type Road={id:number;tier:number;points:[number,number][]};
type RoadAsset={bounds:{west:number;east:number;south:number;north:number};roads:Road[]};

@ccclass('NightCityLightLayer')
export class NightCityLightLayer extends Component {
  @property(Node) mapContent:Node|null=null;
  private g!:Graphics;
  private projector!:GeoProjector;
  private roads:Road[]=[];
  private lastLod=-1;

  start(){
    this.g=(this.getComponent(Graphics)??this.addComponent(Graphics))!;
    resources.load('data/istanbul-night-roads',JsonAsset,(err,asset)=>{
      if(err)return;
      const data=asset.json as RoadAsset;
      this.projector=new GeoProjector(ISTANBUL_GAMEPLAY_BOUNDS);
      this.roads=data.roads;
      this.redraw(true);
    });
  }

  update(){
    const z=this.mapContent?.scale.x??1;
    const lod=z>=2.1?2:z>=1.35?1:0;
    if(lod!==this.lastLod)this.redraw();
  }

  private redraw(force=false){
    if(!this.projector||!this.roads.length)return;
    const z=this.mapContent?.scale.x??1;
    const lod=z>=2.1?2:z>=1.35?1:0;
    if(!force&&lod===this.lastLod)return;
    this.lastLod=lod;
    const size=this.getComponent(UITransform)!.contentSize;
    const g=this.g;g.clear();

    for(const road of this.roads){
      if(road.tier>lod+1)continue;
      const step=road.tier<=1?2:road.tier===2?3:5;
      for(let i=0;i<road.points.length;i+=step){
        const raw=road.points[i];
        const p=this.projector.project(raw[1],raw[0],size);
        const h=this.hash(road.id,i);
        const r=road.tier<=1?1.7:1.05;
        const glow=road.tier<=1?5.0:3.0;
        g.fillColor=new Color(255,126+(h%50),45,24);
        g.circle(p.x,p.y,glow);g.fill();
        g.fillColor=new Color(255,183+(h%45),80,155);
        g.circle(p.x,p.y,r);g.fill();
      }
    }
  }

  private hash(a:number,b:number){
    let x=(a*73856093)^(b*19349663);
    x=(x^(x>>>13))*1274126177;
    return Math.abs(x)%256;
  }
}
