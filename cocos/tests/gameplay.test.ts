import test from 'node:test';
import assert from 'node:assert/strict';
import { NetworkModel } from '../assets/scripts/gameplay/NetworkModel';
import { PassengerSimulation } from '../assets/scripts/gameplay/PassengerSimulation';
import { LevelObjectiveController } from '../assets/scripts/gameplay/LevelObjectiveController';
import type { StationAnchor } from '../assets/scripts/gameplay/TransitTypes';

const stations:StationAnchor[]=[
  {id:'yenikapi',name:'Yenikapı',district:'Fatih',lat:41.0054,lon:28.9521,role:'hub',officialLines:['M2']},
  {id:'taksim',name:'Taksim',district:'Beyoğlu',lat:41.0369,lon:28.9850,role:'hub',officialLines:['M2']},
  {id:'uskudar',name:'Üsküdar',district:'Üsküdar',lat:41.0265,lon:29.0151,role:'hub',officialLines:['M5']}
];

test('IST-01 connection can complete through the real network model',()=>{
  const map=new Map(stations.map(s=>[s.id,s]));
  const network=new NetworkModel(map); network.budgetM=32;
  const passengers=new PassengerSimulation(stations);
  const objective=new LevelObjectiveController({
    id:'IST-01',name:'İlk Hat',stations:['yenikapi','taksim'],budgetM:32,
    primary:{type:'connect',from:'yenikapi',to:'taksim'},rewardCoin:50
  },network,passengers);
  assert.equal(objective.evaluate().completed,false);
  const built=network.connect('yenikapi','taksim');
  assert.equal(built.segment.tunnel,false);
  assert.equal(objective.evaluate().completed,true);
});

test('Europe to Asia segment is priced as tunnel infrastructure',()=>{
  const network=new NetworkModel(new Map(stations.map(s=>[s.id,s]))); network.budgetM=100;
  const built=network.connect('taksim','uskudar');
  assert.equal(built.segment.tunnel,true);
  assert.ok(built.segment.costM>0);
});

test('network snapshot restores budget lines and trains',()=>{
  const network=new NetworkModel(new Map(stations.map(s=>[s.id,s]))); network.budgetM=100;
  const snapshot=network.snapshot();
  const built=network.connect('yenikapi','taksim');
  network.addTrain(built.line.id);
  assert.equal(network.lines.length,1); assert.equal(network.trains.length,1);
  network.restore(snapshot);
  assert.equal(network.lines.length,0); assert.equal(network.trains.length,0); assert.equal(network.budgetM,100);
});
