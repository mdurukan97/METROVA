# METROVA — Cocos Creator rewrite

Active implementation target: Cocos Creator + TypeScript, Android landscape.

## Istanbul atlas rule

The Istanbul campaign no longer uses arbitrary normalized station positions. Geographic station anchors live in `assets/data/istanbul-atlas.json` as latitude/longitude plus district ownership. The renderer projects those anchors into the atlas bounds.

The visual base must preserve Istanbul's recognizable coastline, Bosphorus, Golden Horn and district geography. Gameplay may declutter labels or slightly simplify polygon detail, but it must not move station geographic anchors to fake districts.

IST-01–05 are being revised around real Istanbul station/district relationships rather than the older Fatih/Taksim/Beşiktaş placeholder layout.

The old Godot implementation remains preserved on the `legacy-godot` branch.
