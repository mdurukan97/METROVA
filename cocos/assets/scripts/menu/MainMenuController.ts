import { _decorator, Button, Color, Component, Graphics, Label, Node, UITransform, UIOpacity, Vec3, tween } from 'cc';
import { MenuNetworkBackground } from './MenuNetworkBackground';
const { ccclass } = _decorator;

@ccclass('MainMenuController')
export class MainMenuController extends Component {
  private cards:Node[]=[];

  start(){
    const rootUi=this.getComponent(UITransform)??this.addComponent(UITransform);
    if(rootUi.contentSize.width<100)rootUi.setContentSize(1280,720);

    const bg=this.fullNode('AnimatedNetwork');
    bg.addComponent(MenuNetworkBackground);

    this.makeLabel('Studio',-535,310,420,26,'MHDRN STÜDYOSU',13,new Color('#7895AA'));
    this.makeLabel('Logo',-535,238,510,80,'METROVA',58,new Color('#F4F8FA'));
    this.makeLabel('Subtitle',-535,186,500,42,'ŞEHRİN NABZINI RAYLARLA YÖNET',16,new Color('#A7BBC8'));

    const continueButton=this.heroButton(-405,92,330,76,'DEVAM ET','İstanbul · IST-01');
    continueButton.node.on(Button.EventType.CLICK,()=>this.node.emit('metrova:continue'));

    this.makeLabel('Section',-535,-5,420,28,'KARİYER MERKEZİ',12,new Color('#708A9B'));
    this.cards.push(this.menuCard(-430,-105,205,145,'KARİYER','Şehirler ve bölümler','▰','metrova:career'));
    this.cards.push(this.menuCard(-205,-105,205,145,'GARAJ','Metro filonu yönet','▣','metrova:garage'));
    this.cards.push(this.menuCard(20,-105,205,145,'YETENEKLER','Kalıcı geliştirmeler','◆','metrova:skills'));
    this.cards.push(this.menuCard(245,-105,205,145,'MARKET','Araçlar ve kozmetik','●','metrova:market'));

    const daily=this.glassPanel(475,-112,250,132,18,new Color(5,18,29,232),new Color(41,77,101,205));
    const dailyButton=daily.addComponent(Button)!;dailyButton.transition=Button.Transition.SCALE;dailyButton.zoomScale=0.97;
    daily.on(Button.EventType.CLICK,()=>this.node.emit('metrova:daily'));
    this.makeChildLabel(daily,-105,38,210,20,'GÜNLÜK GÖREV',10,new Color('#7894A7'));
    this.makeChildLabel(daily,-105,6,210,28,'3 HAT KUR',18,new Color('#FFFFFF'));
    this.makeChildLabel(daily,-105,-25,210,22,'Ödül  +75 Metro Coin',12,new Color('#F4D47A'));
    this.progressBar(daily,0,-48,210,6,0.34);

    this.profilePill(495,300);
    this.iconButton(584,300,'⚙','metrova:settings');

    const city=this.glassPanel(392,78,360,184,18,new Color(5,19,31,224),new Color(43,88,119,180));
    this.makeChildLabel(city,-154,55,308,26,'AKTİF ŞEHİR',11,new Color('#7391A5'));
    this.makeChildLabel(city,-154,20,308,36,'İSTANBUL',25,new Color('#FFFFFF'));
    this.makeChildLabel(city,-154,-20,308,26,'IST-01 · İlk Hat',14,new Color('#A9C0CF'));
    this.makeChildLabel(city,-154,-53,308,24,'Hazır  •  32 M başlangıç bütçesi',12,new Color('#6ED4A2'));

    this.makeLabel('Version',-610,-334,280,22,'METROVA · PRE-ALPHA',10,new Color(90,113,128,180));
    this.enterAnimation(continueButton.node);
  }

  private heroButton(x:number,y:number,w:number,h:number,title:string,sub:string){
    const n=this.glassPanel(x,y,w,h,18,new Color(13,100,205,246),new Color(93,175,255,240));
    const b=n.addComponent(Button)!;b.transition=Button.Transition.SCALE;b.zoomScale=0.975;
    this.makeChildLabel(n,-w/2+24,13,w-48,28,title,21,new Color('#FFFFFF'));
    this.makeChildLabel(n,-w/2+24,-17,w-48,22,sub,12,new Color(204,228,255,235));
    return b;
  }

  private menuCard(x:number,y:number,w:number,h:number,title:string,sub:string,icon:string,event:string){
    const n=this.glassPanel(x,y,w,h,18,new Color(5,18,29,232),new Color(41,77,101,205));
    const b=n.addComponent(Button)!;b.transition=Button.Transition.SCALE;b.zoomScale=0.965;
    n.on(Button.EventType.CLICK,()=>this.node.emit(event));
    const badge=this.glassPanel(0,35,46,46,13,new Color(12,48,72,245),new Color(62,117,151,200),n);
    this.makeChildLabel(badge,-23,0,46,34,icon,20,new Color('#7FC7F5'),Label.HorizontalAlign.CENTER);
    this.makeChildLabel(n,-w/2+18,-8,w-36,26,title,16,new Color('#FFFFFF'));
    this.makeChildLabel(n,-w/2+18,-37,w-36,24,sub,11,new Color('#839CAA'));
    return n;
  }

  private progressBar(parent:Node,x:number,y:number,w:number,h:number,value:number){
    const bg=new Node('ProgressBg');bg.setPosition(x,y);const ui=bg.addComponent(UITransform)!;ui.setContentSize(w,h);
    const g=bg.addComponent(Graphics)!;g.fillColor=new Color(30,54,68,235);g.roundRect(-w/2,-h/2,w,h,h/2);g.fill();parent.addChild(bg);
    const fill=new Node('ProgressFill');fill.setPosition(-w*(1-value)/2,0);const fui=fill.addComponent(UITransform)!;fui.setContentSize(w*value,h);
    const fg=fill.addComponent(Graphics)!;fg.fillColor=new Color('#2B8ED6');fg.roundRect(-w*value/2,-h/2,w*value,h,h/2);fg.fill();bg.addChild(fill);
  }

  private profilePill(x:number,y:number){
    const n=this.glassPanel(x,y,150,48,15,new Color(5,18,29,235),new Color(41,77,101,205));
    this.makeChildLabel(n,-62,8,124,20,'PROFİL',10,new Color('#7894A7'));
    this.makeChildLabel(n,-62,-11,124,22,'◉  0 MC',13,new Color('#F4D47A'));
  }

  private iconButton(x:number,y:number,text:string,event:string){
    const n=this.glassPanel(x,y,48,48,15,new Color(5,18,29,235),new Color(41,77,101,205));
    const b=n.addComponent(Button)!;b.transition=Button.Transition.SCALE;b.zoomScale=0.92;
    this.makeChildLabel(n,-24,0,48,32,text,19,new Color('#DCE9F0'),Label.HorizontalAlign.CENTER);
    n.on(Button.EventType.CLICK,()=>this.node.emit(event));
  }

  private enterAnimation(hero:Node){
    const opacity=this.node.getComponent(UIOpacity)??this.node.addComponent(UIOpacity);
    opacity.opacity=0;tween(opacity).to(0.42,{opacity:255}).start();
    hero.setScale(new Vec3(0.96,0.96,1));
    tween(hero).to(0.38,{scale:new Vec3(1,1,1)},{easing:'backOut'}).start();
    this.cards.forEach((card,i)=>{
      card.setPosition(card.position.x,card.position.y-14,card.position.z);
      tween(card).delay(0.06*i).by(0.34,{position:new Vec3(0,14,0)},{easing:'quadOut'}).start();
    });
  }

  private fullNode(name:string){
    const n=new Node(name);const ui=n.addComponent(UITransform)!;
    const root=this.getComponent(UITransform)!;ui.setContentSize(root.contentSize.width,root.contentSize.height);
    this.node.addChild(n);return n;
  }

  private glassPanel(x:number,y:number,w:number,h:number,r:number,fill:Color,stroke:Color,parent:Node=this.node){
    const n=new Node('Panel');n.setPosition(x,y);const ui=n.addComponent(UITransform)!;ui.setContentSize(w,h);
    const g=n.addComponent(Graphics)!;g.fillColor=fill;g.strokeColor=stroke;g.lineWidth=1.2;g.roundRect(-w/2,-h/2,w,h,r);g.fill();g.stroke();
    parent.addChild(n);return n;
  }

  private makeLabel(name:string,x:number,y:number,w:number,h:number,text:string,size:number,color:Color){
    const n=new Node(name);n.setPosition(x+w/2,y);const ui=n.addComponent(UITransform)!;ui.setContentSize(w,h);
    const l=n.addComponent(Label)!;l.string=text;l.fontSize=size;l.lineHeight=size+5;l.color=color;l.horizontalAlign=Label.HorizontalAlign.LEFT;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;
    this.node.addChild(n);return l;
  }

  private makeChildLabel(parent:Node,x:number,y:number,w:number,h:number,text:string,size:number,color:Color,align=Label.HorizontalAlign.LEFT){
    const n=new Node('Label');n.setPosition(x+w/2,y);const ui=n.addComponent(UITransform)!;ui.setContentSize(w,h);
    const l=n.addComponent(Label)!;l.string=text;l.fontSize=size;l.lineHeight=size+5;l.color=color;l.horizontalAlign=align;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;
    parent.addChild(n);return l;
  }
}
