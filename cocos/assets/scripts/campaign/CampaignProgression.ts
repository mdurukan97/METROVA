import {
  CampaignProgress,CityDefinition,LevelDefinition,SpecialOperationSlot,
  SpecialOperationStatus,StarCount
} from './CampaignTypes';

export type CompletionReward={
  previousStars:StarCount;
  bestStars:StarCount;
  metroCoin:number;
  skillPoints:number;
  unlockedLevelId?:string;
  unlockedSpecialOperationId?:string;
};

export class CampaignProgression {
  private readonly byId:Map<string,LevelDefinition>;
  private readonly ordered:LevelDefinition[];
  private readonly bonusCoinByLevel:Map<string,number>;

  constructor(readonly city:CityDefinition,levels:LevelDefinition[]){
    this.ordered=[...levels].sort((a,b)=>a.order-b.order);
    this.byId=new Map(this.ordered.map(level=>[level.id,level]));
    this.bonusCoinByLevel=this.allocateTenPercentBonus(this.ordered);
  }

  createProgress():CampaignProgress{
    return {bestStars:{},metroCoin:this.city.startingMetroCoin,skillPoints:0,completedSpecialOperations:[]};
  }

  isLevelUnlocked(levelId:string,progress:CampaignProgress){
    const level=this.byId.get(levelId);
    if(!level)return false;
    if(level.order===1)return true;
    const previous=this.ordered[level.order-2];
    return (progress.bestStars[previous.id]??0)>=1;
  }

  completeLevel(levelId:string,stars:StarCount,progress:CampaignProgress):CompletionReward{
    const level=this.byId.get(levelId);
    if(!level)throw new Error(`Unknown level: ${levelId}`);
    if(!this.isLevelUnlocked(levelId,progress))throw new Error(`Locked level: ${levelId}`);
    if(stars<1||stars>3)throw new Error('A completed level must award 1-3 stars');

    const previousStars=progress.bestStars[levelId]??0;
    const bestStars=Math.max(previousStars,stars) as StarCount;
    let metroCoin=0;
    for(let star=previousStars+1;star<=bestStars;star++){
      metroCoin+=star===1?level.baseRewardCoin:this.bonusCoinByLevel.get(level.id)!;
    }
    const skillPoints=previousStars===0?(level.rewardSkillPoint??0):0;
    progress.bestStars[levelId]=bestStars;
    progress.metroCoin+=metroCoin;
    progress.skillPoints+=skillPoints;

    const next=this.ordered[level.order];
    return {
      previousStars,bestStars,metroCoin,skillPoints,
      unlockedLevelId:previousStars===0?next?.id:undefined,
      unlockedSpecialOperationId:previousStars===0?level.specialOperationUnlock:undefined
    };
  }

  specialOperationStatus(
    slot:SpecialOperationSlot,
    progress:CampaignProgress,
    accessibleCityIds:Iterable<string>
  ):SpecialOperationStatus{
    if(progress.completedSpecialOperations.includes(slot.id))return 'completed';
    if((progress.bestStars[slot.unlockedByLevelId]??0)<1)return 'locked';
    const cities=new Set(accessibleCityIds);
    return slot.requiredCityIds.every(cityId=>cities.has(cityId))?'playable':'pending-cities';
  }

  totalStars(progress:CampaignProgress){
    return Object.values(progress.bestStars).reduce<number>((total,stars)=>total+stars,0);
  }

  private allocateTenPercentBonus(levels:LevelDefinition[]){
    const result=new Map<string,number>();
    const target=Math.round(levels.reduce((sum,level)=>sum+level.baseRewardCoin,0)*0.1);
    const ranked=levels.map(level=>{
      const raw=level.baseRewardCoin*0.1;
      const base=Math.floor(raw);
      result.set(level.id,base);
      return {level,remainder:raw-base};
    }).sort((a,b)=>b.remainder-a.remainder||a.level.order-b.level.order);
    let remaining=target-[...result.values()].reduce((sum,value)=>sum+value,0);
    for(let index=0;remaining>0;index++,remaining--){
      const id=ranked[index%ranked.length].level.id;
      result.set(id,result.get(id)!+1);
    }
    return result;
  }
}
