export type StationAnchor = {
  id:string; name:string; district:string; lat:number; lon:number; role:string;
  officialLines:string[];
};

export type BuiltSegment = {
  id:string;
  from:string;
  to:string;
  distanceKm:number;
  tunnel:boolean;
  costM:number;
};

export type BuiltLine = {
  id:string;
  colorIndex:number;
  stations:string[];
  segments:BuiltSegment[];
};

export type TrainState = {
  id:string;
  lineId:string;
  segmentIndex:number;
  progress:number;
  direction:1|-1;
  capacity:number;
  passengers:number;
  onboardTargets:string[];
};
