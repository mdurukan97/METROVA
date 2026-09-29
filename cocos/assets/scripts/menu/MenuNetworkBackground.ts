import { _decorator, Color, Component, Graphics, UITransform, Vec2 } from 'cc';
const { ccclass } = _decorator;

type Route={color:Color;points:Vec2[];speed:number;phase:number};

@ccclass('MenuNetworkBackground')
export class MenuNetworkBackground extends Component {
  private g!:Graphics;
  private t=0;
  private routes:Route[]=[];

  start(){
    this.g=this.getComponent(Graphics)??this.addComponent(Graphics);
    this.routes=[
      {color:new Color(225,77,62,205),speed:0.032,phase:0.06,points:[new Vec2(-700,-170),new Vec2(-430,-40),new Vec2(-210,20),new Vec2(30,10),new Vec2(280,125),new Vec2(690,180)]},
      {color:new Color(42,128,201,205),speed:0.026,phase:0.42,points:[new Vec2(-650,210),new Vec2(-410,135),new Vec2(-190,35),new Vec2(15,-45),new Vec2(250,-90),new Vec2(650,-225)]},
      {color:new Color(50,159,113,195),speed:0.029,phase:0.73,points:[new Vec2(-580,-300),new Vec2(-350,-180),new Vec2(-110,-65),new Vec2(95,35),new Vec2(320,65),new Vec2(680,-15)]},
      {color:new Color(232,168,52,190),speed:0.021,phase:0.18,points:[new Vec2(-260,-360),new Vec2(-205,-180),new Vec2(-120,-45),new Vec2(20,95),new Vec2(130,220),new Vec2(210,380)]}
    ];
    this.redraw();
  }

  update(dt:number){this.t+=dt;this.redraw();}

  private redraw(){
    const g=this.g; const ui=this.getComponent(UITransform)!; const size=ui.contentSize;
    g.clear();
    g.fillColor=new Color(3,11,20,255);g.rect(-size.width/2,-size.height/2,size.width,size.height);g.fill();

    // restrained city-light field: deterministic, no texture dependency
    for(let i=0;i<130;i++){
      const x=((i*197)%Math.max(1,size.width))-size.width/2;
      const y=((i*83)%Math.max(1,size.height))-size.height/2;
      const pulse=0.55+0.45*Math.sin(this.t*0.55+i*0.7);
      g.fillColor=new Color(255,178+(i%45),82,Math.round(18+24*pulse));
      g.circle(x,y,(i%7===0)?1.7:0.9);g.fill();
    }

    for(const route of this.routes){
      // soft outer rail glow
      g.strokeColor=new Color(route.color.r,route.color.g,route.color.b,34);g.lineWidth=15;
      this.path(g,route.points);
      g.strokeColor=route.color;g.lineWidth=3.2;
      this.path(g,route.points);

      for(let i=1;i<route.points.length-1;i++){
        const p=route.points[i];
        g.fillColor=new Color(4,14,24,255);g.circle(p.x,p.y,7.5);g.fill();
        g.strokeColor=new Color(224,236,242,210);g.lineWidth=2;g.circle(p.x,p.y,7.5);g.stroke();
      }

      const train=this.sample(route.points,(route.phase+this.t*route.speed)%1);
      g.fillColor=new Color(255,220,139,55);g.circle(train.x,train.y,13);g.fill();
      g.fillColor=new Color(255,244,204,245);g.circle(train.x,train.y,3.5);g.fill();
    }

    // dark readable veil behind menu content
    g.fillColor=new Color(2,9,16,102);g.rect(-size.width/2,-size.height/2,size.width,size.height);g.fill();
  }

  private path(g:Graphics,points:Vec2[]){
    if(!points.length)return;
    g.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);
    g.stroke();
  }

  private sample(points:Vec2[],t:number){
    const lengths:number[]=[];let total=0;
    for(let i=1;i<points.length;i++){const d=Vec2.distance(points[i-1],points[i]);lengths.push(d);total+=d;}
    let target=t*total;
    for(let i=0;i<lengths.length;i++){
      if(target<=lengths[i]){
        const r=target/lengths[i],a=points[i],b=points[i+1];
        return new Vec2(a.x+(b.x-a.x)*r,a.y+(b.y-a.y)*r);
      }
      target-=lengths[i];
    }
    return points[points.length-1].clone();
  }
}
