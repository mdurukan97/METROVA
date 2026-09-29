import { NetworkModel } from './NetworkModel';
import { PassengerSimulation } from './PassengerSimulation';

export type LevelResult={
  completed:boolean;
  stars:0|1|2|3;
  primaryDone:boolean;
  bonuses:boolean[];
  reason:string;
};

type LevelDef={
  id:string;
  name:string;
  stations:string[];
  budgetM:number;
  primary:any;
  bonus?:any;
  rewardCoin:number;
  rewardSkillPoint?:number;
};

export class LevelObjectiveController {
  constructor(
    readonly level:LevelDef,
    private network:NetworkModel,
    private passengers:PassengerSimulation
  ){}

  evaluate():LevelResult{
    const p=this.level.primary;
    let primaryDone=false;
    let reason='Hedef devam ediyor';

    if(p.type==='connect'){
      primaryDone=this.hasConnection(p.from,p.to);
      reason=primaryDone?'Hat bağlantısı tamamlandı':'İki hedef istasyonu aynı hatta bağla';
    }else if(p.type==='singleLineStops'){
      primaryDone=this.network.lines.some(l=>l.stations.length>=p.value);
      reason=primaryDone?'Hat uzatma tamamlandı':`Tek hattı ${p.value} durağa ulaştır`;
    }else if(p.type==='deliveredAndTrain'){
      primaryDone=this.passengers.delivered>=p.passengers&&this.network.trains.length>=p.trains;
      reason=primaryDone?'Yolcu hedefi tamamlandı':`${p.passengers} yolcu taşı ve tren işlet`;
    }else if(p.type==='connectContinents'){
      primaryDone=this.network.lines.some(l=>l.segments.some(s=>s.tunnel));
      reason=primaryDone?'Kıtalar bağlandı':'Avrupa ve Anadolu arasında bir hat kur';
    }else if(p.type==='transferAndDelivered'){
      primaryDone=this.hasTransfer()&&this.passengers.delivered>=p.passengers;
      reason=primaryDone?'Aktarma hedefi tamamlandı':`Aktarma oluştur ve ${p.passengers} yolcu taşı`;
    }

    const bonuses:boolean[]=[];
    if(this.level.bonus?.satisfactionMin!==undefined)bonuses.push(this.passengers.satisfaction>=this.level.bonus.satisfactionMin);
    if(this.level.bonus?.maxTunnel!==undefined){
      const tunnels=this.network.lines.flatMap(l=>l.segments).filter(s=>s.tunnel).length;
      bonuses.push(tunnels<=this.level.bonus.maxTunnel);
    }

    const stars=(primaryDone?Math.min(3,1+bonuses.filter(Boolean).length):0) as 0|1|2|3;
    return {completed:primaryDone,stars,primaryDone,bonuses,reason};
  }

  private hasConnection(a:string,b:string){return this.network.lines.some(l=>l.stations.includes(a)&&l.stations.includes(b));}

  private hasTransfer(){
    const count=new Map<string,number>();
    for(const line of this.network.lines)for(const id of new Set(line.stations))count.set(id,(count.get(id)??0)+1);
    return [...count.values()].some(v=>v>=2);
  }
}
