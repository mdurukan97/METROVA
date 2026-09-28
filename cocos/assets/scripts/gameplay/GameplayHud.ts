import { _decorator, Component, Label, Node } from 'cc';
import { LineBuildController } from './LineBuildController';
const { ccclass, property } = _decorator;

@ccclass('GameplayHud')
export class GameplayHud extends Component {
  @property(LineBuildController) builder:LineBuildController|null=null;
  @property(Label) budgetLabel:Label|null=null;
  @property(Label) netLabel:Label|null=null;
  @property(Label) satisfactionLabel:Label|null=null;
  @property(Label) goalLabel:Label|null=null;
  @property(Node) contextBar:Node|null=null;

  private satisfaction=92;
  private delivered=38;
  private goal=80;

  update(dt:number){
    // Network metrics are wired progressively; HUD already owns the presentation contract.
    if(this.budgetLabel && this.builder){
      const model=(this.builder as any).model;
      if(model)this.budgetLabel.string=`${model.budgetM.toFixed(1)} M`;
    }
    if(this.netLabel)this.netLabel.string='+6.4 M';
    if(this.satisfactionLabel)this.satisfactionLabel.string=`%${Math.round(this.satisfaction)}`;
    if(this.goalLabel)this.goalLabel.string=`${this.delivered} / ${this.goal}`;
  }

  addTrain(){this.builder?.addTrain();}
}
