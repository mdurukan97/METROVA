# METROVA Architecture Contract

## Non-negotiables

1. Simulation code never creates GUI nodes.
2. City data does not contain GUI references.
3. UI screens may render simulation state but do not own core economy/network rules.
4. New cities are data packages, not forks of Istanbul code.
5. Android APK generation is kept green from the first milestone onward.
6. No market, ads, skill tree or election layer is merged until the core route-building slice is stable on a physical Android device.

## Runtime flow

`metrova.gui_script` -> active screen -> systems -> city data

- `home_screen`: presentation/navigation only.
- `game_screen`: visual controller and touch interaction.
- `network`: route graph ownership.
- `simulation`: clock, budget, passenger counters and speed state.
- `istanbul`: station coordinates and geographic visual hints.

## Planned split after v0.1

- Camera/pan/zoom controller
- Route editor supporting multi-stop polylines
- Train dispatch and capacity system
- Passenger OD demand model
- Save/profile service
- Level/career progression service
- Localisation service
- Audio/haptics service
