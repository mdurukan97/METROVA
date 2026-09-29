import { _decorator, Button, Color, Component, Graphics, Label, Node, UITransform } from 'cc';
import { LineBuildController } from './LineBuildController';
const { ccclass } = _decorator;

@ccclass('NightHudBuilder')
export class NightHudBuilder extends Component {
  builder:LineBuildController|null=null;
  private budget!:Label;
  private net!:Label;
  private satisfaction!:Label;
  private goal!:Label;
  private context!:Node;
  private contextTitle!:Label;
  private contextDetail!:Label;

  start(){
    const ui=this.getComponent(UITransform)??this.addComponent(UITransform);
    if(ui.contentSize.width<100)ui.setContentSize(1280,720);

    this.panel('Brand',-535,326,210,62,'METROVA\nİSTANBUL',22);
    this.panel('Mission',-330,326,185,62,'IST-03  ·  İLK SEFER',16);

    this.budget=this.metric('Budget',120,326,190,62,'BÜTÇE');
    this.net=this.metric('Net',305,326,170,62,'YILLIK NET');
    this.satisfaction=this.metric('Sat',465,326,145,62,'MEMNUNİYET');
    this.goal=this.metric('Goal',585,326,125,62,'YOLCU');

    this.context=new Node('ContextLineCard');
    this.context.setPosition(245,-302);
    const ct=this.context.addComponent(UITransform)!;ct.setContentSize(700,82);
    const cg=this.context.addComponent(Graphics)!;
    cg.fillColor=new Color(5,17,28,238);cg.strokeColor=new Color(61,111,151,210);cg.lineWidth=1.5;
    this.roundRect(cg,-350,-41,700,82,18);cg.fill();cg.stroke();
    this.node.addChild(this.context);

    this.contextTitle=this.label(this.context,'Hat',-315,14,210,28,'HAT',18,new Color('#FFFFFF'));
    this.contextDetail=this.label(this.context,'Detail',-315,-18,430,24,'',13,new Color('#AFC4D4'));

    const train=this.button(this.context,'Train',260,0,150,54,'TREN EKLE');
    train.node.on(Button.EventType.CLICK,()=>this.builder?.addTrain());
    this.context.active=false;
  }

  update(){
    if(!this.builder)return;
    const m=this.builder.getMetrics();
    if(m){
      this.budget.string=`${m.budgetM.toFixed(1)} M`;
      this.net.string=`${m.projectedAnnualNetM>=0?'+':''}${m.projectedAnnualNetM.toFixed(1)} M`;
      this.satisfaction.string=`%${Math.round(m.satisfaction)}`;
      this.goal.string=`${m.delivered} / 80`;
    }
    const line=this.builder.getSelectedLineSummary();
    this.context.active=!!line;
    if(line){
      this.contextTitle.string=`${line.id}  ·  ${line.stationNames[0]} ↔ ${line.stationNames[line.stationNames.length-1]}`;
      this.contextDetail.string=`${line.distanceKm.toFixed(1)} km   ·   tünel ${line.tunnelKm.toFixed(1)} km   ·   ${line.buildCostM.toFixed(1)} M   ·   ${line.trainCount} tren`;
    }
  }

  private metric(name:string,x:number,y:number,w:number,h:number,title:string){
    const n=this.panel(name,x,y,w,h,'',16);
    this.label(n,'Title',-w/2+12,13,w-24,18,title,10,new Color('#7891A3'));
    return this.label(n,'Value',-w/2+12,-12,w-24,25,'--',17,new Color('#FFFFFF'));
  }

  private panel(name:string,x:number,y:number,w:number,h:number,text:string,fontSize:number){
    const n=new Node(name);n.setPosition(x,y);
    const ui=n.addComponent(UITransform)!;ui.setContentSize(w,h);
    const g=n.addComponent(Graphics)!;
    g.fillColor=new Color(4,15,26,228);g.strokeColor=new Color(42,80,110,205);g.lineWidth=1.2;
    this.roundRect(g,-w/2,-h/2,w,h,14);g.fill();g.stroke();
    this.node.addChild(n);
    if(text)this.label(n,'Text',-w/2+14,0,w-28,h-8,text,fontSize,new Color('#FFFFFF'));
    return n;
  }

  private button(parent:Node,name:string,x:number,y:number,w:number,h:number,text:string){
    const n=new Node(name);n.setPosition(x,y);
    const ui=n.addComponent(UITransform)!;ui.setContentSize(w,h);
    const g=n.addComponent(Graphics)!;g.fillColor=new Color('#0B5FC6');
    this.roundRect(g,-w/2,-h/2,w,h,12);g.fill();
    const b=n.addComponent(Button)!;b.transition=Button.Transition.SCALE;b.zoomScale=0.96;
    this.label(n,'Label',-w/2,0,w,h,text,14,new Color('#FFFFFF'));
    parent.addChild(n);return b;
  }

  private label(parent:Node,name:string,x:number,y:number,w:number,h:number,text:string,size:number,color:Color){
    const n=new Node(name);n.setPosition(x+w/2,y);
    const ui=n.addComponent(UITransform)!;ui.setContentSize(w,h);
    const l=n.addComponent(Label)!;l.string=text;l.fontSize=size;l.lineHeight=Math.max(size+3,18);l.color=color;
    l.horizontalAlign=Label.HorizontalAlign.LEFT;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;
    parent.addChild(n);return l;
  }

  private roundRect(g:Graphics,x:number,y:number,w:number,h:number,r:number){
    g.roundRect(x,y,w,h,r);
  }
}
