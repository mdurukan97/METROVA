export type StarCount=0|1|2|3;

export type MetricCondition={
  metric:string;
  operator:'>='|'<='|'=='|'notUsed';
  value?:number;
};

export type ObjectiveDefinition={
  id:string;
  label:string;
  conditions:MetricCondition[];
};

export type LevelDefinition={
  id:string;
  order:number;
  act:number;
  tutorial:boolean;
  name:string;
  focusArea:string;
  stationUnlockKeys:string[];
  newMechanic:string;
  budgetM:number;
  loadout:{maxVehicles:number};
  primaryObjective:ObjectiveDefinition;
  bonusObjectives:[ObjectiveDefinition,ObjectiveDefinition];
  baseRewardCoin:number;
  rewardSkillPoint?:number;
  specialOperationUnlock?:string;
};

export type CampaignActDefinition={
  id:string;
  order:number;
  levelIds:string[];
  finalLevelId:string;
};

export type SpecialOperationSlot={
  id:string;
  unlockedByLevelId:string;
  requiredCityIds:string[];
};

export type CityDefinition={
  schemaVersion:number;
  id:string;
  displayName:string;
  levelDataAsset:string;
  startingMetroCoin:number;
  minimumStarsForNextCity:number;
  acts:CampaignActDefinition[];
  specialOperationSlots:SpecialOperationSlot[];
};

export type CampaignProgress={
  bestStars:Record<string,StarCount>;
  metroCoin:number;
  skillPoints:number;
  completedSpecialOperations:string[];
};

export type SpecialOperationStatus='locked'|'pending-cities'|'playable'|'completed';
