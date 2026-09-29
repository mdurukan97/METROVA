export type GameSpeed=0|1|2|3;

export class GameClock {
  speed:GameSpeed=1;
  private beforePause:GameSpeed=1;

  get paused(){return this.speed===0;}

  pause(){
    if(this.speed!==0)this.beforePause=this.speed;
    this.speed=0;
  }

  resume(){
    this.speed=this.beforePause===0?1:this.beforePause;
  }

  togglePause(){this.paused?this.resume():this.pause();}

  setSpeed(value:1|2|3){
    this.speed=value;
    this.beforePause=value;
  }

  scaledDelta(dt:number){return this.paused?0:dt*this.speed;}
}
