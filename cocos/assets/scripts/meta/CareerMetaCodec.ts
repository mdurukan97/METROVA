import type {CareerMetaState,SkillDefinition,VehicleDefinition,VehicleModBranch} from './GarageSkillTypes';

const modBranches=new Set<VehicleModBranch>(['carriage','motor','eco','turnaround']);

export function serializeCareerMeta(state:CareerMetaState){
  return JSON.stringify(state);
}

export function parseCareerMeta(
  source:string,
  vehicles:VehicleDefinition[],
  skills:SkillDefinition[]
):CareerMetaState{
  const value:unknown=JSON.parse(source);
  if(!isRecord(value)||value.schemaVersion!==1||!isRecord(value.garage)||!isRecord(value.skills)){
    throw new Error('Unsupported or invalid career meta save');
  }
  const vehicleIds=new Set(vehicles.map(vehicle=>vehicle.id));
  const urbanIds=new Set(vehicles.filter(vehicle=>vehicle.vehicleClass==='urban').map(vehicle=>vehicle.id));
  const starterIds=vehicles.filter(vehicle=>vehicle.access.type==='starter').map(vehicle=>vehicle.id);
  const skillById=new Map(skills.map(skill=>[skill.id,skill]));
  const owned=stringArray(value.garage.ownedVehicleIds).filter(id=>vehicleIds.has(id));
  for(const starterId of starterIds)if(!owned.includes(starterId))owned.push(starterId);
  const ownedSet=new Set(owned);
  const loadout=stringArray(value.garage.loadoutVehicleIds)
    .filter((id,index,all)=>ownedSet.has(id)&&urbanIds.has(id)&&all.indexOf(id)===index)
    .slice(0,3);
  const rawMods=isRecord(value.garage.vehicleMods)?value.garage.vehicleMods:{};
  const vehicleMods:CareerMetaState['garage']['vehicleMods']={};
  for(const [vehicleId,branches] of Object.entries(rawMods)){
    if(!ownedSet.has(vehicleId)||!isRecord(branches))continue;
    const cleaned:Partial<Record<VehicleModBranch,number>>={};
    for(const [branch,tier] of Object.entries(branches)){
      if(modBranches.has(branch as VehicleModBranch)&&Number.isInteger(tier)&&Number(tier)>=1&&Number(tier)<=3){
        cleaned[branch as VehicleModBranch]=Number(tier);
      }
    }
    for(const branch of Object.keys(cleaned).slice(2))delete cleaned[branch as VehicleModBranch];
    vehicleMods[vehicleId]=cleaned;
  }
  const rawRanks=isRecord(value.skills.ranks)?value.skills.ranks:{};
  const ranks:Record<string,number>={};
  for(const [skillId,rank] of Object.entries(rawRanks)){
    const skill=skillById.get(skillId);
    if(skill&&Number.isInteger(rank)&&Number(rank)>=1)ranks[skillId]=Math.min(Number(rank),skill.maxRank);
  }
  let changed=true;
  while(changed){
    changed=false;
    for(const [skillId,rank] of Object.entries(ranks)){
      const skill=skillById.get(skillId)!;
      if(rank>0&&skill.prerequisites.some(required=>(ranks[required.skillId]??0)<required.minRank)){
        delete ranks[skillId];
        changed=true;
      }
    }
  }
  return {schemaVersion:1,garage:{ownedVehicleIds:owned,loadoutVehicleIds:loadout,vehicleMods},skills:{ranks}};
}

function isRecord(value:unknown):value is Record<string,unknown>{
  return typeof value==='object'&&value!==null&&!Array.isArray(value);
}

function stringArray(value:unknown){
  return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[];
}
