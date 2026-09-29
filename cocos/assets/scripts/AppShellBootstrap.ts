import { _decorator, Component, Node, UITransform } from 'cc';
import { MainMenuController } from './menu/MainMenuController';
import { NightGameplayBootstrap } from './gameplay/NightGameplayBootstrap';
const { ccclass, property } = _decorator;

@ccclass('AppShellBootstrap')
export class AppShellBootstrap extends Component {
  @property startInGameplay=false;
  private menuRoot!:Node;
  private gameplayRoot!:Node;

  start(){
    const ui=this.getComponent(UITransform)??this.addComponent(UITransform);
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
    this.menuRoot.active=false;
    this.gameplayRoot.active=true;
  }

  enterMenu(){
    this.gameplayRoot.active=false;
    this.menuRoot.active=true;
  }

  private fullNode(name:string){
    const n=new Node(name);const childUi=n.addComponent(UITransform)!;
    const root=this.getComponent(UITransform)!;childUi.setContentSize(root.contentSize.width,root.contentSize.height);
    this.node.addChild(n);return n;
  }
}
