import { _decorator, Component, Graphics, Color, UITransform, Vec2, JsonAsset, resources } from 'cc';
const { ccclass } = _decorator;

type Station = { id:string; name:string; district:string; lat:number; lon:number; role:string };
type Atlas = {
  map:{bounds:{west:number;east:number;south:number;north:number}};
  stations:Station[];
  tutorialUnlocks:Record<string,string[]>;
};

@ccclass('IstanbulAtlasMap')
export class IstanbulAtlasMap extends Component {
  private atlas: Atlas | null = null;
  private graphics!: Graphics;
  private activeLevel = 'IST-01';

  start() {
    this.graphics = this.getComponent(Graphics) ?? this.addComponent(Graphics);
    resources.load('data/istanbul-atlas', JsonAsset, (err, asset) => {
      if (err) { console.error(err); return; }
      this.atlas = asset.json as Atlas;
      this.redraw();
    });
  }

  setLevel(levelId:string) {
    this.activeLevel = levelId;
    this.redraw();
  }

  private project(lat:number, lon:number):Vec2 {
    if (!this.atlas) return new Vec2();
    const b = this.atlas.map.bounds;
    const ui = this.getComponent(UITransform)!;
    const w = ui.contentSize.width;
    const h = ui.contentSize.height;
    const x = ((lon - b.west) / (b.east - b.west) - 0.5) * w;
    const y = ((lat - b.south) / (b.north - b.south) - 0.5) * h;
    return new Vec2(x, y);
  }

  redraw() {
    if (!this.atlas || !this.graphics) return;
    const g = this.graphics;
    g.clear();

    // Atlas renderer keeps geographic anchors fixed. Coast/district polygon assets
    // are drawn beneath this layer; only labels may be decluttered in screen-space.
    const unlocked = new Set(this.atlas.tutorialUnlocks[this.activeLevel] ?? []);
    for (const s of this.atlas.stations) {
      if (!unlocked.has(s.id)) continue;
      const p = this.project(s.lat, s.lon);
      g.fillColor = new Color('#F4EEDF');
      g.strokeColor = new Color('#263238');
      g.lineWidth = s.role === 'hub' ? 4 : 3;
      g.circle(p.x, p.y, s.role === 'hub' ? 13 : 10);
      g.fill();
      g.stroke();
    }
  }
}
