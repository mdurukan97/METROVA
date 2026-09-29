import { _decorator, Component, Node, UITransform, UIOpacity, tween, view, ResolutionPolicy } from 'cc';
import { MainMenuController } from './menu/MainMenuController';
import { NightGameplayBootstrap } from './gameplay/NightGameplayBootstrap';
const { ccclass, property } = _decorator;

@ccclass('AppShellBootstrap')
export class AppShellBootstrap extends Component {
  @property startInGameplay=false;
  private menuRoot!:Node;
  private gameplayRoot!:Node;

  start(){
    // Landscape-first: keep vertical scale stable and reveal extra map width on wide phones.
    view.setDesignResolutionSize(1280,720,ResolutionPolicy.FIXED_HEIGHT);
    const ui=((this.getComponent(UITransform) ?? this.addComponent(UITransform))!)!;
    if(ui.contentSize.width<100)ui.setContentSize(1280,720);

    this.gameplayRoot=this.fullNode('GameplayRoot');
    this.gameplayRoot.active=false;
    this.gameplayRoot.addComponent(NightGameplayBootstrap);

    this.menuRoot=this.fullNode('MainMenuRoot');
    this.menuRoot.addComponent(MainMenuController);
    this.menuRoot.on('metrova:continue',this.enterGameplay,this);

    if(this.startInGameplay)this.enterGameplay();
  }

  enterGameplay(){
    if(!this.menuRoot.active){this.gameplayRoot.active=true;return;}
    const menuOpacity=this.menuRoot.getComponent(UIOpacity)??this.menuRoot.addComponent(UIOpacity);
    tween(menuOpacity).to(0.22,{opacity:0}).call(()=>{
      this.menuRoot.active=false;
      menuOpacity.opacity=255;
      this.gameplayRoot.active=true;
      const gameOpacity=this.gameplayRoot.getComponent(UIOpacity)??this.gameplayRoot.addComponent(UIOpacity);
      gameOpacity.opacity=0;
      tween(gameOpacity).to(0.32,{opacity:255}).start();
    }).start();
  }

  enterMenu(){
    const gameOpacity=this.gameplayRoot.getComponent(UIOpacity)??this.gameplayRoot.addComponent(UIOpacity);
    tween(gameOpacity).to(0.20,{opacity:0}).call(()=>{
      this.gameplayRoot.active=false;
      gameOpacity.opacity=255;
      this.menuRoot.active=true;
      const menuOpacity=this.menuRoot.getComponent(UIOpacity)??this.menuRoot.addComponent(UIOpacity);
      menuOpacity.opacity=0;
      tween(menuOpacity).to(0.28,{opacity:255}).start();
    }).start();
  }

  private fullNode(name:string){
    const n=new Node(name);const childUi=n.addComponent(UITransform)!;
    const root=this.getComponent(UITransform)!;childUi.setContentSize(root.contentSize.width,root.contentSize.height);
    this.node.addChild(n);return n;
  }
}
