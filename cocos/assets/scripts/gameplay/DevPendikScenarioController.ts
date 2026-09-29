import { _decorator, Component, JsonAsset, resources } from 'cc';
import { LineBuildController } from './LineBuildController';
import { RouteCameraDirector } from './RouteCameraDirector';
const { ccclass, property } = _decorator;

type Sandbox={id:string;debugOnly:boolean;budgetM:number;stations:string[];objective:{type:string;from:string;to:string}};

@ccclass('DevPendikScenarioController')
export class DevPendikScenarioController extends Component {
  @property enabledOnStart=false;
  builder:LineBuildController|null=null;
  cameraDirector:RouteCameraDirector|null=null;
  active=false;
  private data:Sandbox|null=null;

  start(){
    if(this.enabledOnStart)this.activate();
  }

  activate(){
    resources.load('data/pendik-sandbox',JsonAsset,(err,asset)=>{
      if(err){console.warn('[METROVA] Pendik sandbox requires npm run atlas:night',err);return;}
      this.data=asset.json as Sandbox;
      if(!this.data.debugOnly)throw new Error('Pendik sandbox must never become campaign progression implicitly');
      if(!this.builder)return;
      this.builder.setActiveStations(this.data.stations);
      this.builder.setBudget(this.data.budgetM);
      this.cameraDirector?.focusPendikCorridor();
      this.active=true;
      console.log('[METROVA] DEV-PENDIK active: '+this.data.stations.length+' verified M4 anchors');
    });
  }

  deactivate(){this.active=false;}

  getStatus(){
    if(!this.active||!this.data||!this.builder)return null;
    const network=this.builder.getNetworkModel();
    const done=network?.lines.some(l=>l.stations.includes(this.data!.objective.from)&&l.stations.includes(this.data!.objective.to))??false;
    return {id:this.data.id,done,stationCount:this.data.stations.length};
  }
}
