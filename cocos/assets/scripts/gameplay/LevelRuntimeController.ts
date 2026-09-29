import { _decorator, Component, JsonAsset, resources } from 'cc';
import { LineBuildController } from './LineBuildController';
import { LevelObjectiveController, LevelResult } from './LevelObjectiveController';
const { ccclass, property } = _decorator;

type LevelDef={
  id:string;name:string;stations:string[];budgetM:number;primary:any;bonus?:any;
  rewardCoin:number;rewardSkillPoint?:number;
};
type LevelFile={levels:LevelDef[]};

@ccclass('LevelRuntimeController')
export class LevelRuntimeController extends Component {
  @property(LineBuildController) builder:LineBuildController|null=null;
  @property levelId='IST-01';

  level:LevelDef|null=null;
  result:LevelResult|null=null;
  private objective:LevelObjectiveController|null=null;
  private loaded=false;
  private finished=false;

  start(){
    resources.load('data/tutorial-levels',JsonAsset,(err,asset)=>{
      if(err){console.error('[METROVA] tutorial levels missing',err);return;}
      const file=asset.json as LevelFile;
      this.level=file.levels.find(x=>x.id===this.levelId)??null;
      if(!this.level)console.error('[METROVA] Unknown level',this.levelId);
    });
  }

  update(){
    if(!this.level||!this.builder)return;
    if(!this.loaded){
      const network=this.builder.getNetworkModel();
      if(!network||!this.builder.passengers)return;
      this.builder.setActiveStations(this.level.stations);
      this.builder.setBudget(this.level.budgetM);
      this.objective=new LevelObjectiveController(this.level,network,this.builder.passengers);
      this.loaded=true;
    }
    if(!this.objective)return;
    this.result=this.objective.evaluate();
    if(this.result.completed&&!this.finished){
      this.finished=true;
      console.log(`[METROVA] ${this.level.id} completed: ${this.result.stars} star(s)`);
    }
  }

  getStatus(){
    return {
      level:this.level,
      result:this.result,
      finished:this.finished
    };
  }

  restart(){
    // Scene-level restart will be wired to Save/Flow; keep state transition explicit.
    this.finished=false;
  }
}
