# v0.1 Quality Gate

The vertical slice is accepted only when all of these are true on an Android phone:

- App installs from a generated APK without certificate errors.
- App opens in landscape and reaches the METROVA home screen.
- Continue opens Istanbul gameplay.
- Touch down on a station, drag, and release on another station creates a route.
- A train moves between connected stations.
- Five unique connected stations complete the objective.
- Pause and speed buttons change simulation state.
- Back/Home returns without a crash.
- No feature expansion happens before these checks pass.

## v0.7 gameplay gate

- Passengers have destinations, not just a global counter.
- Trains only board passengers whose destination exists on that train's route.
- Trains dwell at stations and visually communicate occupancy.
- Sustained station overflow creates a failure state with Retry/Home actions.
- The live alert panel identifies the worst station and its dominant destination.
- Istanbul landmarks, side labels and station demand feedback remain inside the map camera layer.
