import { _decorator, Color, Component, Graphics, JsonAsset, Label, Node, resources, UITransform, Vec2 } from 'cc';
import { GeoProjector } from './GeoProjector';
import { ISTANBUL_GAMEPLAY_BOUNDS } from './MapProjectionConfig';
const { ccclass } = _decorator;

type Station = {
  id:string; name:string; district:string; lat:number; lon:number; role:string;
  officialLines:string[]; coordinateStatus:'seed'|'verified';
};
type Atlas = {
  map:{bounds:{west:number;east:number;south:number;north:number}};
  stations:Station[];
  tutorialUnlocks:Record<string,string[]>;
};

@ccclass('IstanbulAtlasMap')
export class IstanbulAtlasMap extends Component {
  private atlas:Atlas|null = null;
  private graphics!:Graphics;
  private activeLevel='IST-01';
  private labels!:Node;

  start() {
    this.graphics=this.getComponent(Graphics) ?? this.addComponent(Graphics);
    this.labels=new Node('StationLabels');
    this.node.addChild(this.labels);
    resources.load('data/istanbul-atlas', JsonAsset, (err,asset)=>{
      if(err){ console.error('[METROVA] atlas load failed',err); return; }
      this.atlas=asset.json as Atlas;
      this.redraw();
    });
  }

  setLevel(levelId:string) {
    this.activeLevel=levelId;
    this.redraw();
  }

  private project(lat:number,lon:number):Vec2 {
    if(!this.atlas) return new Vec2();
    const ui=this.getComponent(UITransform);
    if(!ui) throw new Error('IstanbulAtlasMap requires UITransform');
    return new GeoProjector(ISTANBUL_GAMEPLAY_BOUNDS).project(lat,lon,ui.contentSize);
  }

  redraw() {
    if(!this.atlas || !this.graphics) return;
    const g=this.graphics;
    g.clear();
    this.labels.removeAllChildren();

    const unlocked=new Set(this.atlas.tutorialUnlocks[this.activeLevel] ?? []);
    for(const s of this.atlas.stations) {
      if(!unlocked.has(s.id)) continue;
      const p=this.project(s.lat,s.lon);

      g.fillColor=new Color('#F4EEDF');
      g.strokeColor=new Color('#263238');
      g.lineWidth=s.role==='hub'?4:3;
      g.circle(p.x,p.y,s.role==='hub'?13:10);
      g.fill();
      g.stroke();

      const node=new Node(`Label-${s.id}`);
      node.setPosition(p.x+18,p.y+17);
      const transform=node.addComponent(UITransform);
      transform.setContentSize(190,34);
      const label=node.addComponent(Label);
      label.string=s.name;
      label.fontSize=16;
      label.lineHeight=20;
      label.color=new Color('#263238');
      label.overflow=Label.Overflow.SHRINK;
      label.horizontalAlign=Label.HorizontalAlign.LEFT;
      label.verticalAlign=Label.VerticalAlign.CENTER;
      this.labels.addChild(node);
    }
  }
}
