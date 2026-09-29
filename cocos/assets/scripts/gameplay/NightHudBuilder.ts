import { _decorator, Button, Color, Component, Graphics, Label, Node, UITransform } from 'cc';
import { LineBuildController } from './LineBuildController';
import { LevelRuntimeController } from './LevelRuntimeController';
const { ccclass } = _decorator;

@ccclass('NightHudBuilder')
export class NightHudBuilder extends Component {
  builder:LineBuildController|null=null;
  levelRuntime:LevelRuntimeController|null=null;
  private budget!:Label; private net!:Label; private satisfaction!:Label; private goal!:Label; private mission!:Label;
  private context!:Node; private contextTitle!:Label; private contextDetail!:Label;
  private preview!:Node; private previewLabel!:Label; private pauseLabel!:Label;
  private undoNode!:Node; private undoLabel!:Label;
  private resultPanel!:Node; private resultTitle!:Label; private resultDetail!:Label;

  start(){
    const ui=((this.getComponent(UITransform) ?? this.addComponent(UITransform))!)!;
    if(ui.contentSize.width<100)ui.setContentSize(1280,720);
    this.panel('Brand',-535,326,210,62,'METROVA\nİSTANBUL',22);
    const missionPanel=this.panel('Mission',-330,326,185,62,'',16);
    this.mission=this.label(missionPanel,'MissionText',-78,0,156,48,'IST-01',14,new Color('#FFFFFF'));
    this.budget=this.metric('Budget',72,326,150,62,'BÜTÇE');
    this.net=this.metric('Net',220,326,140,62,'YILLIK NET');
    this.satisfaction=this.metric('Sat',357,326,130,62,'MEMNUNİYET');
    this.goal=this.metric('Goal',480,326,110,62,'YOLCU');

    const controls=this.panel('Controls',574,326,120,62,'',12);
    const pause=this.button(controls,'Pause',-36,0,38,38,'Ⅱ');
    this.pauseLabel=pause.node.getChildByName('Label')!.getComponent(Label)!;
    pause.node.on(Button.EventType.CLICK,()=>this.builder?.togglePause());
    ([1,2,3] as const).forEach((s,i)=>{
      const b=this.button(controls,'Speed'+s,-2+i*30,0,26,38,s+'×');
      b.node.on(Button.EventType.CLICK,()=>this.builder?.setSpeed(s));
    });

    this.undoNode=this.panel('Undo',-565,245,128,46,'',12);
    const undoButton=this.button(this.undoNode,'UndoButton',0,0,116,36,'GERİ AL');
    this.undoLabel=undoButton.node.getChildByName('Label')!.getComponent(Label)!;
    undoButton.node.on(Button.EventType.CLICK,()=>this.builder?.undo());
    this.undoNode.active=false;

    this.preview=this.panel('BuildPreview',-475,-285,260,58,'',12);
    this.previewLabel=this.label(this.preview,'PreviewText',-118,0,236,44,'',14,new Color('#FFFFFF'));
    this.preview.active=false;

    this.context=new Node('ContextLineCard'); this.context.setPosition(245,-302);
    const ct=this.context.addComponent(UITransform)!; ct.setContentSize(700,82);
    const cg=this.context.addComponent(Graphics)!;
    cg.fillColor=new Color(5,17,28,238); cg.strokeColor=new Color(61,111,151,210); cg.lineWidth=1.5;
    this.roundRect(cg,-350,-41,700,82,18); cg.fill(); cg.stroke(); this.node.addChild(this.context);
    this.contextTitle=this.label(this.context,'Hat',-315,14,220,28,'HAT',18,new Color('#FFFFFF'));
    this.contextDetail=this.label(this.context,'Detail',-315,-18,440,24,'',13,new Color('#AFC4D4'));
    const train=this.button(this.context,'Train',260,0,150,54,'TREN EKLE');
    train.node.on(Button.EventType.CLICK,()=>this.builder?.addTrain()); this.context.active=false;

    this.resultPanel=this.panel('Result',0,0,430,230,'',18);
    this.resultTitle=this.label(this.resultPanel,'ResultTitle',-185,58,370,48,'BÖLÜM TAMAMLANDI',26,new Color('#FFFFFF'));
    this.resultDetail=this.label(this.resultPanel,'ResultDetail',-185,-5,370,72,'',17,new Color('#B9D0DF'));
    this.resultPanel.active=false;
  }

  update(){
    if(!this.builder)return;
    const m=this.builder.getMetrics();
    const levelState=this.levelRuntime?.getStatus(); const level=levelState?.level;
    if(level)this.mission.string=level.id+'  ·  '+level.name.toLocaleUpperCase('tr-TR');
    if(m){
      this.budget.string=m.budgetM.toFixed(1)+' M';
      this.net.string=(m.projectedAnnualNetM>=0?'+':'')+m.projectedAnnualNetM.toFixed(1)+' M';
      this.satisfaction.string='%'+Math.round(m.satisfaction);
      const target=level?.primary?.passengers??(level?.primary?.type==='connect'?1:80);
      this.goal.string=level?.primary?.type==='connect'?(levelState?.result?.primaryDone?'1 / 1':'0 / 1'):(m.delivered+' / '+target);
    }
    this.pauseLabel.string=this.builder.clock.paused?'▶':'Ⅱ';
    const undo=this.builder.getUndoSeconds(); this.undoNode.active=undo>0;
    if(undo>0)this.undoLabel.string='↶  '+undo.toFixed(1)+' sn';

    const preview=this.builder.getBuildPreview(); const planned=this.builder.getPlannedBuild();
    this.preview.active=!!preview||!!planned;
    if(preview)this.previewLabel.string=preview.distanceKm.toFixed(1)+' km  ·  '+preview.costM.toFixed(1)+' M'+(preview.tunnel?'  ·  TÜNEL':'');
    else if(planned)this.previewLabel.string='PLANLANDI · Devam ettirince uygulanacak';

    const line=this.builder.getSelectedLineSummary();
    this.context.active=!!line&&!this.resultPanel.active;
    if(line){
      this.contextTitle.string=line.id+'  ·  '+line.stationNames[0]+' ↔ '+line.stationNames[line.stationNames.length-1];
      this.contextDetail.string=line.distanceKm.toFixed(1)+' km   ·   tünel '+line.tunnelKm.toFixed(1)+' km   ·   '+line.buildCostM.toFixed(1)+' M   ·   '+line.trainCount+' tren';
    }

    const result=levelState?.result; this.resultPanel.active=!!result?.completed;
    if(result?.completed){
      this.resultTitle.string='★'.repeat(result.stars)+'☆'.repeat(3-result.stars)+'  '+(level?.id??'')+' TAMAMLANDI';
      this.resultDetail.string=result.reason+'\nÖdül: '+(level?.rewardCoin??0)+' Metro Coin'+(level?.rewardSkillPoint?' + '+level.rewardSkillPoint+' Skill Point':'');
    }
  }

  private metric(name:string,x:number,y:number,w:number,h:number,title:string){
    const n=this.panel(name,x,y,w,h,'',16);
    this.label(n,'Title',-w/2+12,13,w-24,18,title,10,new Color('#7891A3'));
    return this.label(n,'Value',-w/2+12,-12,w-24,25,'--',17,new Color('#FFFFFF'));
  }
  private panel(name:string,x:number,y:number,w:number,h:number,text:string,fontSize:number){
    const n=new Node(name); n.setPosition(x,y); const ui=n.addComponent(UITransform)!; ui.setContentSize(w,h);
    const g=n.addComponent(Graphics)!; g.fillColor=new Color(4,15,26,228); g.strokeColor=new Color(42,80,110,205); g.lineWidth=1.2;
    this.roundRect(g,-w/2,-h/2,w,h,14); g.fill(); g.stroke(); this.node.addChild(n);
    if(text)this.label(n,'Text',-w/2+14,0,w-28,h-8,text,fontSize,new Color('#FFFFFF')); return n;
  }
  private button(parent:Node,name:string,x:number,y:number,w:number,h:number,text:string){
    const n=new Node(name); n.setPosition(x,y); const ui=n.addComponent(UITransform)!; ui.setContentSize(w,h);
    const g=n.addComponent(Graphics)!; g.fillColor=new Color('#0B5FC6'); this.roundRect(g,-w/2,-h/2,w,h,10); g.fill();
    const b=n.addComponent(Button)!; b.transition=Button.Transition.SCALE; b.zoomScale=0.96;
    const label=this.label(n,'Label',-w/2,0,w,h,text,Math.min(14,h*0.36),new Color('#FFFFFF')); label.horizontalAlign=Label.HorizontalAlign.CENTER;
    parent.addChild(n); return b;
  }
  private label(parent:Node,name:string,x:number,y:number,w:number,h:number,text:string,size:number,color:Color){
    const n=new Node(name); n.setPosition(x+w/2,y); const ui=n.addComponent(UITransform)!; ui.setContentSize(w,h);
    const l=n.addComponent(Label)!; l.string=text; l.fontSize=size; l.lineHeight=Math.max(size+3,18); l.color=color;
    l.horizontalAlign=Label.HorizontalAlign.LEFT; l.verticalAlign=Label.VerticalAlign.CENTER; l.overflow=Label.Overflow.SHRINK;
    parent.addChild(n); return l;
  }
  private roundRect(g:Graphics,x:number,y:number,w:number,h:number,r:number){g.roundRect(x,y,w,h,r);}
}
