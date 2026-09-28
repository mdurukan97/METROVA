import { Size, Vec2 } from 'cc';

export type GeoBounds = { west:number; east:number; south:number; north:number };

export class GeoProjector {
  constructor(public readonly bounds: GeoBounds) {}

  project(lat:number, lon:number, viewport:Size):Vec2 {
    const x01 = (lon - this.bounds.west) / (this.bounds.east - this.bounds.west);
    const y01 = (lat - this.bounds.south) / (this.bounds.north - this.bounds.south);
    return new Vec2((x01 - 0.5) * viewport.width, (y01 - 0.5) * viewport.height);
  }

  projectCoordinate(coordinate:[number, number], viewport:Size):Vec2 {
    return this.project(coordinate[1], coordinate[0], viewport);
  }
}
