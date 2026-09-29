import { _decorator, Component, Node, UITransform } from 'cc';
import { NightBaseLayer } from '../map/NightBaseLayer';
import { IstanbulDistrictLayer } from '../map/IstanbulDistrictLayer';
import { NightRoadLayer } from '../map/NightRoadLayer';
import { NightCityLightLayer } from '../map/NightCityLightLayer';
import { IstanbulDistrictLabels } from '../map/IstanbulDistrictLabels';
import { IstanbulAtlasMap } from '../map/IstanbulAtlasMap';
import { MapCameraController } from '../map/MapCameraController';
import { LineBuildController } from './LineBuildController';
import { StationDemandLayer } from './StationDemandLayer';
import { TrainVisualLayer } from './TrainVisualLayer';
const { ccclass } = _decorator;

@ccclass('NightGameplayBootstrap')
export class NightGameplayBootstrap extends Component {
  start(){
    const rootUi=this.getComponent(UITransform)??this.addComponent(UITransform);
    if(rootUi.contentSize.width<100)rootUi.setContentSize(1280,720);

    const map=new Node('IstanbulNightMap');
    const mapUi=map.addComponent(UITransform)!;
    mapUi.setContentSize(rootUi.contentSize.width,rootUi.contentSize.height);
    this.node.addChild(map);

    this.layer<NightBaseLayer>(map,'00-Water',NightBaseLayer);
    this.layer<IstanbulDistrictLayer>(map,'10-LandDistricts',IstanbulDistrictLayer);

    const roads=this.layer<NightRoadLayer>(map,'20-RoadGlow',NightRoadLayer);
    roads.mapContent=map;
    const lights=this.layer<NightCityLightLayer>(map,'25-CityLights',NightCityLightLayer);
    lights.mapContent=map;

    const districtLabels=this.layer<IstanbulDistrictLabels>(map,'30-DistrictLabels',IstanbulDistrictLabels);
    districtLabels.mapContent=map;

    const builder=this.layer<LineBuildController>(map,'40-PlayerNetwork',LineBuildController);
    builder.mapContent=map;

    this.layer<IstanbulAtlasMap>(map,'50-Stations',IstanbulAtlasMap);

    const demand=this.layer<StationDemandLayer>(map,'60-Demand',StationDemandLayer);
    demand.builder=builder;
    const trains=this.layer<TrainVisualLayer>(map,'70-Trains',TrainVisualLayer);
    trains.builder=builder;

    const camera=map.addComponent(MapCameraController)!;
    camera.minZoom=1;
    camera.maxZoom=4;
    camera.panLimitX=980;
    camera.panLimitY=540;
  }

  private layer<T extends Component>(parent:Node,name:string,type:new()=>T):T{
    const n=new Node(name);
    const ui=n.addComponent(UITransform)!;
    const parentUi=parent.getComponent(UITransform)!;
    ui.setContentSize(parentUi.contentSize.width,parentUi.contentSize.height);
    parent.addChild(n);
    return n.addComponent(type)!;
  }
}
