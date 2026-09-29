import type {
  CareerMetaState,CareerWallet,SkillDefinition,UnlockContext,VehicleDefinition,
  VehicleModBranch,VehicleModDefinition
} from './GarageSkillTypes';

export class GarageSkillService {
  private readonly vehiclesById:Map<string,VehicleDefinition>;
  private readonly modsById:Map<VehicleModBranch,VehicleModDefinition>;
  private readonly skillsById:Map<string,SkillDefinition>;

  constructor(
    readonly vehicles:VehicleDefinition[],
    readonly mods:VehicleModDefinition[],
    readonly skills:SkillDefinition[]
  ){
    this.vehiclesById=new Map(vehicles.map(vehicle=>[vehicle.id,vehicle]));
    this.modsById=new Map(mods.map(mod=>[mod.id,mod]));
    this.skillsById=new Map(skills.map(skill=>[skill.id,skill]));
  }

  createState():CareerMetaState{
    const starters=this.vehicles.filter(vehicle=>vehicle.access.type==='starter').map(vehicle=>vehicle.id);
    return {schemaVersion:1,garage:{ownedVehicleIds:starters,loadoutVehicleIds:starters.slice(0,3),vehicleMods:{}},skills:{ranks:{}}};
  }

  isVehicleAvailable(vehicleId:string,context:UnlockContext){
    const vehicle=this.requireVehicle(vehicleId);
    if(vehicle.access.type==='starter')return true;
    return vehicle.access.key!==undefined&&new Set(context.unlockedKeys).has(vehicle.access.key);
  }

  purchaseVehicle(vehicleId:string,state:CareerMetaState,wallet:CareerWallet,context:UnlockContext){
    const vehicle=this.requireVehicle(vehicleId);
    if(state.garage.ownedVehicleIds.includes(vehicleId))throw new Error(`Vehicle already owned: ${vehicleId}`);
    if(!this.isVehicleAvailable(vehicleId,context))throw new Error(`Vehicle is not unlocked: ${vehicleId}`);
    if(wallet.metroCoin<vehicle.access.priceCoin)throw new Error(`Not enough Metro Coin for ${vehicleId}`);
    wallet.metroCoin-=vehicle.access.priceCoin;
    state.garage.ownedVehicleIds.push(vehicleId);
  }

  setCityLoadout(vehicleIds:string[],state:CareerMetaState,maxVehicles=3){
    if(vehicleIds.length<1||vehicleIds.length>Math.min(3,maxVehicles))throw new Error('City loadout must contain 1-3 vehicles');
    if(new Set(vehicleIds).size!==vehicleIds.length)throw new Error('Loadout vehicles must be unique');
    for(const id of vehicleIds){
      const vehicle=this.requireVehicle(id);
      if(vehicle.vehicleClass!=='urban')throw new Error(`Intercity vehicle cannot enter city loadout: ${id}`);
      if(!state.garage.ownedVehicleIds.includes(id))throw new Error(`Vehicle is not owned: ${id}`);
    }
    state.garage.loadoutVehicleIds=[...vehicleIds];
  }

  upgradeVehicleMod(vehicleId:string,branch:VehicleModBranch,state:CareerMetaState,wallet:CareerWallet){
    if(!state.garage.ownedVehicleIds.includes(vehicleId))throw new Error(`Vehicle is not owned: ${vehicleId}`);
    const mod=this.modsById.get(branch);
    if(!mod)throw new Error(`Unknown vehicle mod: ${branch}`);
    const current=state.garage.vehicleMods[vehicleId]??{};
    const tier=current[branch]??0;
    if(tier>=3)throw new Error(`${branch} is already Tier III`);
    if(tier===0&&Object.values(current).filter(value=>(value??0)>0).length>=2){
      throw new Error('A vehicle can use at most two mod branches');
    }
    const price=mod.tierCostsCoin[tier];
    if(wallet.metroCoin<price)throw new Error(`Not enough Metro Coin for ${branch} Tier ${tier+1}`);
    wallet.metroCoin-=price;
    state.garage.vehicleMods[vehicleId]={...current,[branch]:tier+1};
  }

  learnSkill(skillId:string,state:CareerMetaState,wallet:CareerWallet){
    const skill=this.skillsById.get(skillId);
    if(!skill)throw new Error(`Unknown skill: ${skillId}`);
    const current=state.skills.ranks[skillId]??0;
    if(current>=skill.maxRank)throw new Error(`Skill is already max rank: ${skillId}`);
    for(const prerequisite of skill.prerequisites){
      if((state.skills.ranks[prerequisite.skillId]??0)<prerequisite.minRank){
        throw new Error(`Missing prerequisite ${prerequisite.skillId} rank ${prerequisite.minRank}`);
      }
    }
    const cost=skill.rankCostsSp[current];
    if(wallet.skillPoints<cost)throw new Error(`Not enough Skill Points for ${skillId}`);
    wallet.skillPoints-=cost;
    state.skills.ranks[skillId]=current+1;
  }

  private requireVehicle(id:string){
    const vehicle=this.vehiclesById.get(id);
    if(!vehicle)throw new Error(`Unknown vehicle: ${id}`);
    return vehicle;
  }
}
