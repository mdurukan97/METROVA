import { _decorator, Color, Component, Graphics, JsonAsset, resources, UITransform } from 'cc';
import { GeoProjector } from '../map/GeoProjector';
import { LineBuildController } from './LineBuildController';
import { StationAnchor } from './TransitTypes';
import { ISTANBUL_GAMEPLAY_BOUNDS } from '../map/MapProjectionConfig';
const { ccclass, property } = _decorator;

@ccclass('StationDemandLayer')
export class StationDemandLayer extends Component {
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
    const sim=(this.builder as any).passengers;
    if(!sim)return;
    const size=this.getComponent(UITransform)!.contentSize;
    this.g.clear();
    for(const [id,q] of sim.queues){
      const s=this.stations.get(id);if(!s||q.passengers.length===0)continue;
      const p=this.projector.project(s.lat,s.lon,size);
      const n=q.passengers.length;
      const radius=16+Math.min(14,n*0.9);
      const c=n>=14?new Color(255,82,72,125):n>=8?new Color(255,180,55,105):new Color(80,210,155,90);
      this.g.strokeColor=c;this.g.lineWidth=4;
      this.g.circle(p.x,p.y,radius);this.g.stroke();
      // Passenger pips keep density readable without covering the station.
      this.g.fillColor=new Color(255,255,255,210);
      const dots=Math.min(8,n);
      for(let i=0;i<dots;i++){
        const a=(Math.PI*2*i/dots)-Math.PI/2;
        this.g.circle(p.x+Math.cos(a)*(radius+7),p.y+Math.sin(a)*(radius+7),2.3);this.g.fill();
      }
    }
  }
}
