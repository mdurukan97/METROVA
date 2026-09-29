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
  @property(Label) waitLabel:Label|null=null;
  @property(Node) contextBar:Node|null=null;
  @property goalPassengers=80;

  update(){
    const m=this.builder?.getMetrics();
    if(!m)return;
    if(this.budgetLabel)this.budgetLabel.string=`${m.budgetM.toFixed(1)} M`;
    if(this.netLabel)this.netLabel.string=`${m.projectedAnnualNetM>=0?'+':''}${m.projectedAnnualNetM.toFixed(1)} M / yıl`;
    if(this.satisfactionLabel)this.satisfactionLabel.string=`%${Math.round(m.satisfaction)}`;
    if(this.goalLabel)this.goalLabel.string=`${m.delivered} / ${this.goalPassengers}`;
    if(this.waitLabel)this.waitLabel.string=`${Math.round(m.averageWait)} sn`;
  }

  addTrain(){this.builder?.addTrain();}
}
