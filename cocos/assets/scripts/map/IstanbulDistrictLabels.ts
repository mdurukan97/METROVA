import { _decorator, Color, Component, JsonAsset, Label, Node, resources, UITransform } from 'cc';
import { GeoProjector } from './GeoProjector';
const { ccclass, property } = _decorator;

type Ring=number[][];
type Polygon=Ring[];
type Feature={
  properties:{AD?:string};
  geometry:{type:'Polygon'|'MultiPolygon';coordinates:Polygon|Polygon[]}
};
type FC={features:Feature[]};

@ccclass('IstanbulDistrictLabels')
export class IstanbulDistrictLabels extends Component {
  @property(Node) mapContent:Node|null=null;
  @property detailZoom=1.35;

  private labels:{node:Node;priority:boolean}[]=[];
  private projector=new GeoProjector({west:27.95,east:30.02,south:40.74,north:41.62});
  private priority=new Set(['Fatih','Beyoğlu','Şişli','Beşiktaş','Üsküdar','Kadıköy']);

  start(){
    resources.load('data/istanbul-district-geometry',JsonAsset,(err,asset)=>{
      if(err){console.error('[METROVA] district labels need official geometry',err);return;}
      this.createLabels(asset.json as FC);
    });
  }

  update(){
    const zoom=this.mapContent?.scale.x ?? 1;
    for(const item of this.labels) item.node.active=item.priority || zoom>=this.detailZoom;
  }

  private createLabels(fc:FC){
    const ui=this.getComponent(UITransform);
    if(!ui) throw new Error('IstanbulDistrictLabels requires UITransform');

    for(const f of fc.features){
      const name=String(f.properties.AD??'').trim();
      if(!name) continue;
      const ring=this.largestRing(f);
      if(!ring) continue;
      const [lon,lat]=this.centroid(ring);
      const p=this.projector.project(lat,lon,ui.contentSize);

      const n=new Node(`District-${name}`);
      n.setPosition(p.x,p.y);
      const tr=n.addComponent(UITransform);
      tr.setContentSize(150,28);
      const label=n.addComponent(Label);
      label.string=name.toLocaleUpperCase('tr-TR');
      label.fontSize=12;
      label.lineHeight=14;
      label.color=new Color(65,72,72,125);
      label.overflow=Label.Overflow.SHRINK;
      this.node.addChild(n);
      this.labels.push({node:n,priority:this.priority.has(name)});
    }
  }

  private largestRing(f:Feature):Ring|null{
    const polygons:Polygon[]=f.geometry.type==='Polygon'
      ? [f.geometry.coordinates as Polygon]
      : f.geometry.coordinates as Polygon[];
    let best:Ring|null=null,bestArea=-1;
    for(const p of polygons){
      const ring=p[0];
      const area=Math.abs(this.signedArea(ring));
      if(area>bestArea){bestArea=area;best=ring;}
    }
    return best;
  }

  private signedArea(ring:Ring){
    let a=0;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      a+=ring[j][0]*ring[i][1]-ring[i][0]*ring[j][1];
    }
    return a/2;
  }

  private centroid(ring:Ring):[number,number]{
    let area=0,cx=0,cy=0;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const cross=ring[j][0]*ring[i][1]-ring[i][0]*ring[j][1];
      area+=cross; cx+=(ring[j][0]+ring[i][0])*cross; cy+=(ring[j][1]+ring[i][1])*cross;
    }
    area*=0.5;
    if(Math.abs(area)<1e-12) return [ring[0][0],ring[0][1]];
    return [cx/(6*area),cy/(6*area)];
  }
}
