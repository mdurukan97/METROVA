import {test} from 'node:test';
import * as assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GarageSkillService} from '../assets/scripts/meta/GarageSkillService';
import {parseCareerMeta,serializeCareerMeta} from '../assets/scripts/meta/CareerMetaCodec';
import {validateGarageSkills} from '../assets/scripts/meta/GarageSkillValidator';
import {CampaignProgression} from '../assets/scripts/campaign/CampaignProgression';
import type {
  CareerWallet,SkillDefinition,VehicleDefinition,VehicleModDefinition
} from '../assets/scripts/meta/GarageSkillTypes';
import type {CityDefinition,LevelDefinition} from '../assets/scripts/campaign/CampaignTypes';

const loadJson=<T>(relativePath:string)=>JSON.parse(readFileSync(new URL(relativePath,import.meta.url),'utf8')) as T;
const vehicles=loadJson<{vehicles:VehicleDefinition[]}>('../assets/data/vehicle-definitions.json').vehicles;
const mods=loadJson<{mods:VehicleModDefinition[]}>('../assets/data/vehicle-mod-definitions.json').mods;
const skills=loadJson<{skills:SkillDefinition[]}>('../assets/data/skill-definitions.json').skills;
const city=loadJson<CityDefinition>('../assets/data/istanbul-city.json');
const levels=loadJson<{levels:LevelDefinition[]}>('../assets/data/istanbul-levels.json').levels;
const service=new GarageSkillService(vehicles,mods,skills);

test('locked garage catalog has 12 trade-off models and five valid skill branches',()=>{
  assert.deepEqual(validateGarageSkills(vehicles,mods,skills),[]);
  assert.equal(vehicles.filter(vehicle=>vehicle.vehicleClass==='urban').length,10);
  assert.equal(vehicles.filter(vehicle=>vehicle.vehicleClass==='intercity').length,2);
  assert.deepEqual(vehicles.slice(0,3).map(vehicle=>vehicle.id),['M-100','M-110','M-120']);
});

test('campaign wallet purchases unlocked vehicles and enforces a unique max-three city loadout',()=>{
  const state=service.createState();
  const campaign=new CampaignProgression(city,levels);
  const wallet=campaign.createProgress();
  assert.throws(()=>service.purchaseVehicle('M-130',state,wallet,{unlockedKeys:[]}));
  for(let order=1;order<=5;order++)campaign.completeLevel(`IST-0${order}`,1,wallet);
  service.purchaseVehicle('M-130',state,wallet,{unlockedKeys:['IST-05']});
  assert.equal(wallet.metroCoin,270);
  service.learnSkill('vehicle-capacity',state,wallet);
  assert.equal(wallet.skillPoints,0);
  service.setCityLoadout(['M-110','M-120','M-130'],state);
  assert.deepEqual(state.garage.loadoutVehicleIds,['M-110','M-120','M-130']);
  assert.throws(()=>service.setCityLoadout(['M-100','M-110','M-120','M-130'],state));
  state.garage.ownedVehicleIds.push('C-200');
  assert.throws(()=>service.setCityLoadout(['M-100','C-200'],state));
});

test('vehicle upgrades charge each tier and reject a third active mod branch',()=>{
  const state=service.createState();
  const wallet:CareerWallet={metroCoin:2000,skillPoints:0};
  service.upgradeVehicleMod('M-100','carriage',state,wallet);
  service.upgradeVehicleMod('M-100','carriage',state,wallet);
  service.upgradeVehicleMod('M-100','motor',state,wallet);
  assert.equal(wallet.metroCoin,1100);
  assert.deepEqual(state.garage.vehicleMods['M-100'],{carriage:2,motor:1});
  assert.throws(()=>service.upgradeVehicleMod('M-100','eco',state,wallet));
});

test('skill tree spends Skill Points only after prerequisites are met',()=>{
  const state=service.createState();
  const wallet:CareerWallet={metroCoin:0,skillPoints:10};
  assert.throws(()=>service.learnSkill('vehicle-fleet',state,wallet));
  service.learnSkill('vehicle-capacity',state,wallet);
  service.learnSkill('vehicle-capacity',state,wallet);
  service.learnSkill('vehicle-fleet',state,wallet);
  assert.equal(wallet.skillPoints,6);
  assert.deepEqual(state.skills.ranks,{'vehicle-capacity':2,'vehicle-fleet':1});
});

test('career meta persistence drops unknown content and restores a safe max-three loadout',()=>{
  const state=service.createState();
  state.garage.ownedVehicleIds.push('M-130','REMOVED-MODEL');
  state.garage.loadoutVehicleIds=['M-100','M-110','M-120','M-130','REMOVED-MODEL'];
  state.garage.vehicleMods['M-100']={carriage:3,motor:2,eco:1};
  state.skills.ranks={'vehicle-capacity':99,'removed-skill':2};
  const restored=parseCareerMeta(serializeCareerMeta(state),vehicles,skills);
  assert.deepEqual(restored.garage.ownedVehicleIds,['M-100','M-110','M-120','M-130']);
  assert.deepEqual(restored.garage.loadoutVehicleIds,['M-100','M-110','M-120']);
  assert.deepEqual(restored.garage.vehicleMods['M-100'],{carriage:3,motor:2});
  assert.deepEqual(restored.skills.ranks,{'vehicle-capacity':5});
});
