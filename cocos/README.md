# METROVA — Cocos Creator 3.8.8 rewrite

Android-first, landscape, TypeScript.

## Istanbul atlas contract

METROVA's Istanbul campaign uses geographic anchors instead of hand-placed schematic coordinates.

- Official district geometry source: İBB Kültür Envanteri ArcGIS `IlceMahalle/MapServer/0`.
- District import must return exactly 39 districts or validation fails.
- Station names / rail ordering are tracked against current Metro İstanbul M2, M4 and M5 line pages.
- Station anchors are validated by point-in-polygon against the imported district geometry.
- District/coast geometry may be simplified for rendering performance, but station anchors are never shifted to fake geography.
- Label decluttering is screen-space only.
- Full-map view prioritizes Fatih, Beyoğlu, Şişli, Beşiktaş, Üsküdar and Kadıköy labels; all district labels appear after zoom threshold.

## Implemented in rewrite

- Geographic projection utility.
- Official 39-district importer.
- District polygon renderer.
- Zoom-aware district labels.
- 1.0x–2.5x pinch zoom and one-finger map pan.
- Geographic station renderer and station labels.
- Official M2/M4/M5 station-order catalog.
- IST-01–05 real-location tutorial anchors.
- CI checks for TypeScript, district count and station/district mismatches.

## Data commands

```bash
npm install
npm run atlas:fetch
npm run atlas:validate
npx tsc --noEmit
```

The old Godot implementation remains preserved on the `legacy-godot` branch.
