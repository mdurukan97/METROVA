import type {SkillBranch,SkillDefinition,VehicleDefinition,VehicleModDefinition} from './GarageSkillTypes';

export function validateGarageSkills(
  vehicles:VehicleDefinition[],mods:VehicleModDefinition[],skills:SkillDefinition[]
){
  const errors:string[]=[];
  const vehicleIds=new Set<string>();
  for(const vehicle of vehicles){
    if(vehicleIds.has(vehicle.id))errors.push(`Duplicate vehicle: ${vehicle.id}`);
    vehicleIds.add(vehicle.id);
    if(vehicle.access.priceCoin<0)errors.push(`${vehicle.id} has negative price`);
    if(vehicle.stats.capacity<=0)errors.push(`${vehicle.id} capacity must be positive`);
  }
  if(vehicles.length!==12)errors.push(`Vehicle catalog must contain 12 models, got ${vehicles.length}`);
  if(vehicles.filter(vehicle=>vehicle.vehicleClass==='urban').length!==10)errors.push('Vehicle catalog must contain 10 urban models');
  if(vehicles.filter(vehicle=>vehicle.vehicleClass==='intercity').length!==2)errors.push('Vehicle catalog must contain 2 intercity models');
  if(vehicles.filter(vehicle=>vehicle.access.type==='starter').length!==3)errors.push('Exactly three starter vehicles are required');
  if(mods.length!==4)errors.push('Exactly four vehicle mod branches are required');

  const skillIds=new Set(skills.map(skill=>skill.id));
  const branches=new Set<SkillBranch>();
  for(const skill of skills){
    branches.add(skill.branch);
    if(skill.rankCostsSp.length!==skill.maxRank)errors.push(`${skill.id} rank cost count must equal max rank`);
    if(skill.rankCostsSp.some(cost=>cost<=0))errors.push(`${skill.id} has a non-positive Skill Point cost`);
    for(const prerequisite of skill.prerequisites){
      if(!skillIds.has(prerequisite.skillId))errors.push(`${skill.id} has unknown prerequisite ${prerequisite.skillId}`);
      if(prerequisite.skillId===skill.id)errors.push(`${skill.id} cannot require itself`);
    }
  }
  if(branches.size!==5)errors.push(`Skill tree must contain 5 branches, got ${branches.size}`);
  for(const skill of skills){
    if(hasCycle(skill.id,skill.id,new Set(),new Map(skills.map(item=>[item.id,item]))))errors.push(`Skill prerequisite cycle at ${skill.id}`);
  }
  return [...new Set(errors)];
}

function hasCycle(root:string,current:string,visited:Set<string>,skills:Map<string,SkillDefinition>):boolean{
  const skill=skills.get(current);
  if(!skill)return false;
  for(const prerequisite of skill.prerequisites){
    if(prerequisite.skillId===root)return true;
    if(!visited.has(prerequisite.skillId)){
      visited.add(prerequisite.skillId);
      if(hasCycle(root,prerequisite.skillId,visited,skills))return true;
    }
  }
  return false;
}
