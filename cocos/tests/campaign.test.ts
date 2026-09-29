import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CampaignProgression } from '../assets/scripts/campaign/CampaignProgression';
import { validateCampaign } from '../assets/scripts/campaign/CampaignValidator';
import type { CityDefinition,LevelDefinition } from '../assets/scripts/campaign/CampaignTypes';

const loadJson=<T>(relativePath:string)=>JSON.parse(
  readFileSync(new URL(relativePath,import.meta.url),'utf8')
) as T;
const city=loadJson<CityDefinition>('../assets/data/istanbul-city.json');
const levels=loadJson<{levels:LevelDefinition[]}>('../assets/data/istanbul-levels.json').levels;

test('locked Istanbul campaign data has 25 valid levels and five ACT finals',()=>{
  assert.deepEqual(validateCampaign(city,levels),[]);
  assert.equal(levels.filter(level=>level.tutorial).length,5);
  assert.equal(levels.filter(level=>level.rewardSkillPoint===1).length,5);
  assert.equal(levels.reduce((sum,level)=>sum+level.baseRewardCoin,0),4850);
});

test('level chain unlocks one step at a time and never pays replay stars twice',()=>{
  const campaign=new CampaignProgression(city,levels);
  const progress=campaign.createProgress();
  assert.equal(campaign.isLevelUnlocked('IST-01',progress),true);
  assert.equal(campaign.isLevelUnlocked('IST-02',progress),false);

  const first=campaign.completeLevel('IST-01',1,progress);
  assert.equal(first.metroCoin,50);
  assert.equal(first.unlockedLevelId,'IST-02');
  assert.equal(campaign.isLevelUnlocked('IST-02',progress),true);

  const improved=campaign.completeLevel('IST-01',3,progress);
  assert.equal(improved.metroCoin,10);
  assert.equal(campaign.completeLevel('IST-01',3,progress).metroCoin,0);
  assert.equal(progress.metroCoin,660);
});

test('ACT final opens a pending special-operation slot until both cities exist',()=>{
  const campaign=new CampaignProgression(city,levels);
  const progress=campaign.createProgress();
  for(let index=1;index<=5;index++)campaign.completeLevel(`IST-0${index}`,1,progress);
  const slot=city.specialOperationSlots[0];
  assert.equal(campaign.specialOperationStatus(slot,progress,['istanbul']),'pending-cities');
  assert.equal(campaign.specialOperationStatus(slot,progress,['istanbul','bursa']),'playable');
  assert.equal(progress.skillPoints,1);
});

test('completionist Istanbul payout preserves the locked 970 coin star gap',()=>{
  const campaign=new CampaignProgression(city,levels);
  const casual=campaign.createProgress();
  const completionist=campaign.createProgress();
  for(const level of levels){
    campaign.completeLevel(level.id,1,casual);
    campaign.completeLevel(level.id,3,completionist);
  }
  assert.equal(casual.metroCoin,5450);
  assert.equal(completionist.metroCoin,6420);
  assert.equal(completionist.metroCoin-casual.metroCoin,970);
});
