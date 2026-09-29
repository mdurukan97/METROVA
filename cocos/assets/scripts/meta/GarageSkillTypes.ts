export type VehicleClass='urban'|'intercity';
export type VehicleAccessType='starter'|'level'|'special-operation';
export type VehicleModBranch='carriage'|'motor'|'eco'|'turnaround';
export type SkillBranch='vehicle-technology'|'operations'|'finance'|'infrastructure'|'passenger';

export type CareerWallet={metroCoin:number;skillPoints:number};

export type VehicleDefinition={
  id:string;
  displayName:string;
  vehicleClass:VehicleClass;
  access:{type:VehicleAccessType;key?:string;priceCoin:number};
  stats:{capacity:number;speed:number;acceleration:number;dwell:number;maintenance:number};
  role:string;
};

export type VehicleModDefinition={
  id:VehicleModBranch;
  displayName:string;
  tierCostsCoin:[number,number,number];
  tierThreeEffects:Record<string,number>;
};

export type SkillPrerequisite={skillId:string;minRank:number};

export type SkillDefinition={
  id:string;
  displayName:string;
  branch:SkillBranch;
  unlockPhase:1|2|3;
  maxRank:number;
  rankCostsSp:number[];
  effect:{stat:string;mode:'add'|'multiply'|'unlock';perRank?:number;atMaxRank?:number};
  prerequisites:SkillPrerequisite[];
};

export type GarageState={
  ownedVehicleIds:string[];
  loadoutVehicleIds:string[];
  vehicleMods:Record<string,Partial<Record<VehicleModBranch,number>>>;
};

export type SkillTreeState={ranks:Record<string,number>};

export type CareerMetaState={
  schemaVersion:1;
  garage:GarageState;
  skills:SkillTreeState;
};

export type UnlockContext={unlockedKeys:Iterable<string>};
