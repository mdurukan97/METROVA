export class UndoStack<T> {
  private item:{state:T;expiresAt:number}|null=null;
  constructor(private ttlMs=6000){}

  push(state:T,now=Date.now()){this.item={state,expiresAt:now+this.ttlMs};}

  canUndo(now=Date.now()){return !!this.item&&now<=this.item.expiresAt;}

  pop(now=Date.now()){
    if(!this.item||now>this.item.expiresAt){this.item=null;return null;}
    const state=this.item.state;
    this.item=null;
    return state;
  }

  secondsLeft(now=Date.now()){
    if(!this.item)return 0;
    return Math.max(0,(this.item.expiresAt-now)/1000);
  }

  clear(){this.item=null;}
}
