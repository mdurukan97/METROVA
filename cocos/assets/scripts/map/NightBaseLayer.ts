import { _decorator, Color, Component, Graphics, UITransform } from 'cc';
const { ccclass } = _decorator;

@ccclass('NightBaseLayer')
export class NightBaseLayer extends Component {
  start(){
    const g=this.getComponent(Graphics)??this.addComponent(Graphics);
    const size=this.getComponent(UITransform)!.contentSize;
    g.fillColor=new Color('#07131B');
    g.rect(-size.width/2,-size.height/2,size.width,size.height);
    g.fill();
  }
}
