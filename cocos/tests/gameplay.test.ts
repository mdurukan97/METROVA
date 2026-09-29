import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { NetworkModel } from '../assets/scripts/gameplay/NetworkModel';
import { PassengerSimulation } from '../assets/scripts/gameplay/PassengerSimulation';
import { LevelObjectiveController } from '../assets/scripts/gameplay/LevelObjectiveController';
import { RoutePlanner } from '../assets/scripts/gameplay/RoutePlanner';
import type { BuiltLine, StationAnchor, TrainState } from '../assets/scripts/gameplay/TransitTypes';

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

test('new trains spawn at the selected line end terminal and wait for safe headway',()=>{
  const network=new NetworkModel(new Map(stations.map(s=>[s.id,s]))); network.budgetM=100;
  const built=network.connect('yenikapi','taksim');
  const first=network.addTrain(built.line.id);
  const second=network.addTrain(built.line.id);
  assert.equal(first.segmentIndex,built.line.segments.length-1);
  assert.equal(first.direction,-1);
  assert.equal(network.positionOnLine(first,built.line),built.line.segments[0].distanceKm);
  assert.equal(second.queuedAtTerminal,true);

  for(let tick=0;tick<30&&second.queuedAtTerminal;tick++)network.tick(1);
  assert.equal(second.queuedAtTerminal,false);
  assert.ok(network.positionOnLine(second,built.line)-network.positionOnLine(first,built.line)>=network.safeHeadwayKm(1)-0.001);
});

test('same-direction trains never close below the dynamic safe headway',()=>{
  const network=new NetworkModel(new Map(stations.map(s=>[s.id,s]))); network.budgetM=100;
  const built=network.connect('yenikapi','taksim');
  const leader=network.addTrain(built.line.id);
  leader.direction=1;leader.progress=0.60;leader.queuedAtTerminal=false;
  const follower=network.addTrain(built.line.id);
  follower.direction=1;follower.progress=0.20;follower.queuedAtTerminal=false;
  for(let tick=0;tick<8;tick++){
    network.tick(0.5,3);
    const gap=network.positionOnLine(leader,built.line)-network.positionOnLine(follower,built.line);
    if(leader.direction===follower.direction&&leader.direction===1)assert.ok(gap>=network.safeHeadwayKm(3)-0.001);
  }
});

const transferLines:BuiltLine[]=[
  {
    id:'L1',colorIndex:0,stations:['yenikapi','taksim'],
    segments:[{id:'S1',from:'yenikapi',to:'taksim',distanceKm:2,tunnel:false,costM:1}]
  },
  {
    id:'L2',colorIndex:1,stations:['taksim','uskudar'],
    segments:[{id:'S2',from:'taksim',to:'uskudar',distanceKm:3,tunnel:true,costM:1}]
  }
];

test('route planner finds a cached transfer route with transfer cost',()=>{
  const planner=new RoutePlanner(2.5);
  const route=planner.plan('yenikapi','uskudar',transferLines);
  assert.deepEqual(route?.stations,['yenikapi','taksim','uskudar']);
  assert.deepEqual(route?.lineIds,['L1','L2']);
  assert.equal(route?.transferCount,1);
  assert.equal(route?.cost,7.5);
  assert.notEqual(planner.plan('yenikapi','uskudar',transferLines),route);
});

test('passenger alights, transfers and reaches destination on a second line',()=>{
  const simulation=new PassengerSimulation(stations);
  simulation.enqueuePassenger('yenikapi','uskudar');
  assert.equal(simulation.canReach('yenikapi','uskudar',transferLines),true);

  const firstTrain:TrainState={
    id:'T1',lineId:'L1',segmentIndex:0,progress:0,direction:1,
    capacity:18,passengers:0,onboardTargets:[]
  };
  let onboard=simulation.handleTrainArrival(
    firstTrain,transferLines[0],'yenikapi','taksim',transferLines
  );
  assert.equal(onboard.length,1);
  onboard=simulation.handleTrainArrival(
    firstTrain,transferLines[0],'taksim','yenikapi',transferLines
  );
  assert.equal(onboard.length,0);
  assert.equal(simulation.queues.get('taksim')?.passengers.length,1);

  const secondTrain:TrainState={...firstTrain,id:'T2',lineId:'L2'};
  onboard=simulation.handleTrainArrival(
    secondTrain,transferLines[1],'taksim','uskudar',transferLines
  );
  assert.equal(onboard.length,1);
  simulation.handleTrainArrival(
    secondTrain,transferLines[1],'uskudar','taksim',transferLines
  );
  assert.equal(simulation.delivered,1);
  assert.equal(simulation.transfersCompleted,1);
});
