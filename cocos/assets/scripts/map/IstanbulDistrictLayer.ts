import { _decorator, Color, Component, Graphics, JsonAsset, resources, UITransform } from 'cc';
import { GeoProjector, GeoBounds } from './GeoProjector';
import { ISTANBUL_GAMEPLAY_BOUNDS } from './MapProjectionConfig';
const { ccclass, property } = _decorator;

type Polygon = number[][][];
type MultiPolygon = number[][][][];
type Feature = {
  properties: { AD?: string };
  geometry: { type:'Polygon'|'MultiPolygon'; coordinates: Polygon | MultiPolygon };
};
type FeatureCollection = { type:'FeatureCollection'; features:Feature[] };

@ccclass('IstanbulDistrictLayer')
export class IstanbulDistrictLayer extends Component {
  @property({ tooltip: 'Draw district names only at higher zoom in the label layer.' })
  drawBorders = true;

  private graphics!: Graphics;
  private projector = new GeoProjector(ISTANBUL_GAMEPLAY_BOUNDS);

  start() {
    this.graphics = (this.getComponent(Graphics) ?? this.addComponent(Graphics))!;
    resources.load('data/istanbul-district-geometry', JsonAsset, (err, asset) => {
      if (err) {
        console.error('[METROVA] Official Istanbul district geometry is missing. Run npm run atlas:fetch.', err);
        return;
      }
      this.draw(asset.json as FeatureCollection);
    });
  }

  private draw(collection:FeatureCollection) {
    const ui = this.getComponent(UITransform);
    if (!ui) throw new Error('IstanbulDistrictLayer requires UITransform');
    const viewport = ui.contentSize;
    const g = this.graphics;
    g.clear();
    g.fillColor = new Color('#101A1B');
    g.strokeColor = new Color(55,74,78,165);
    g.lineWidth = 0.9;

    for (const feature of collection.features) {
      const polygons:Polygon[] = feature.geometry.type === 'Polygon'
        ? [feature.geometry.coordinates as Polygon]
        : feature.geometry.coordinates as MultiPolygon;

      for (const polygon of polygons) {
        // Ring 0 is the outer district boundary. Holes are intentionally not filled
        // independently; coastline/water mask is rendered above the land layer.
        const ring = polygon[0];
        if (!ring || ring.length < 3) continue;
        const first = this.projector.projectCoordinate(ring[0] as [number,number], viewport);
        g.moveTo(first.x, first.y);
        for (let i=1; i<ring.length; i++) {
          const p = this.projector.projectCoordinate(ring[i] as [number,number], viewport);
          g.lineTo(p.x, p.y);
        }
        g.close();
        g.fill();
        if (this.drawBorders) g.stroke();
      }
    }
  }
}
