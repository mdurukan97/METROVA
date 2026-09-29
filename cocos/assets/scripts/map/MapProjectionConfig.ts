import { GeoBounds } from './GeoProjector';

// Shared render coordinate system for the playable Istanbul campaign.
// Every geographic layer MUST use this exact viewport, otherwise roads,
// districts, stations and trains drift apart.
export const ISTANBUL_GAMEPLAY_BOUNDS:GeoBounds={
  west:28.82,
  east:29.34,
  south:40.84,
  north:41.13
};
