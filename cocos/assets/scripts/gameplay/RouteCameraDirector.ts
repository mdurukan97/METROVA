import { _decorator, Component, JsonAsset, Node, resources, UITransform, Vec2 } from 'cc';
import { GeoProjector } from '../map/GeoProjector';
import { ISTANBUL_GAMEPLAY_BOUNDS } from '../map/MapProjectionConfig';
import { MapCameraController } from '../map/MapCameraController';
const { ccclass, property } = _decorator;

type Station={id:string;lat:number;lon:number};

@ccclass('RouteCameraDirector')
export class RouteCameraDirector extends Component {
  @property(Node) mapContent:Node|null=null;
  private stations=new Map<string,Station>();
  private projector=new GeoProjector(ISTANBUL_GAMEPLAY_BOUNDS);

  start(){
    resources.load('data/istanbul-atlas',JsonAsset,(err,asset)=>{
      if(err)return;
      for(const s of (asset.json as any).stations as Station[])this.stations.set(s.id,s);
    });
  }

  focusStations(ids:string[],padding=0.72){
    if(!this.mapContent||!ids.length)return;
    const ui=this.mapContent.getComponent(UITransform);if(!ui)return;
    const pts=ids.map(id=>this.stations.get(id)).filter(Boolean).map(s=>this.projector.project(s!.lat,s!.lon,ui.contentSize));
    if(!pts.length)return;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const p of pts){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
    const center=new Vec2((minX+maxX)/2,(minY+maxY)/2);
    const spanX=Math.max(180,maxX-minX),spanY=Math.max(120,maxY-minY);
    const zoom=Math.min(4,Math.max(1,Math.min(ui.contentSize.width*padding/spanX,ui.contentSize.height*padding/spanY)));
    this.mapContent.getComponent(MapCameraController)?.focus(center,zoom);
  }

  focusPendikCorridor(){
    this.focusStations(['kadikoy','ayrilikcesmesi','kozyatagi','bostanci','kartal','pendik'],0.80);
  }

  focusBosphorusTutorial(){
    this.focusStations(['yenikapi','taksim','mecidiyekoy','uskudar','altunizade'],0.72);
  }
}
