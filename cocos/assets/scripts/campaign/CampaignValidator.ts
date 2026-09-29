import { CityDefinition,LevelDefinition } from './CampaignTypes';

export function validateCampaign(city:CityDefinition,levels:LevelDefinition[]){
  const errors:string[]=[];
  const ordered=[...levels].sort((a,b)=>a.order-b.order);
  if(city.acts.length!==5)errors.push('Istanbul campaign must contain 5 acts');
  if(city.specialOperationSlots.length!==5)errors.push('Campaign must contain 5 special-operation slots');
  if(ordered.length!==25)errors.push('Istanbul campaign must contain 25 levels');
  if(new Set(ordered.map(level=>level.id)).size!==ordered.length)errors.push('Level IDs must be unique');

  for(let index=0;index<ordered.length;index++){
    const level=ordered[index];
    const order=index+1;
    const expectedId=`IST-${String(order).padStart(2,'0')}`;
    const expectedAct=Math.ceil(order/5);
    if(level.id!==expectedId)errors.push(`Expected ${expectedId} at order ${order}`);
    if(level.order!==order)errors.push(`${level.id} has invalid order`);
    if(level.act!==expectedAct)errors.push(`${level.id} must be in ACT ${expectedAct}`);
    if(level.tutorial!==(order<=5))errors.push(`${level.id} tutorial flag is invalid`);
    if(level.bonusObjectives.length!==2)errors.push(`${level.id} must have exactly 2 bonus objectives`);
    if(level.loadout.maxVehicles<1||level.loadout.maxVehicles>3)errors.push(`${level.id} loadout exceeds max 3 vehicles`);
    if(level.baseRewardCoin<=0)errors.push(`${level.id} must have a base coin reward`);
    if(!level.stationUnlockKeys.length)errors.push(`${level.id} must expose at least one station unlock key`);
  }

  for(const act of city.acts){
    if(act.levelIds.length!==5)errors.push(`${act.id} must contain 5 levels`);
    if(act.levelIds[4]!==act.finalLevelId)errors.push(`${act.id} final must be its fifth level`);
    const final=levels.find(level=>level.id===act.finalLevelId);
    const slot=city.specialOperationSlots.find(item=>item.unlockedByLevelId===act.finalLevelId);
    if(!final?.specialOperationUnlock||final.specialOperationUnlock!==slot?.id){
      errors.push(`${act.id} final must unlock its special-operation slot`);
    }
  }

  const coinTotal=levels.reduce((total,level)=>total+level.baseRewardCoin,0);
  if(coinTotal!==4850)errors.push(`Istanbul base coin total must be 4850, got ${coinTotal}`);
  const skillPointTotal=levels.reduce((total,level)=>total+(level.rewardSkillPoint??0),0);
  if(skillPointTotal!==5)errors.push(`Istanbul campaign must award 5 Skill Points, got ${skillPointTotal}`);
  return errors;
}
