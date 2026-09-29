# METROVA — Istanbul Vertical Slice v0.1

This repository is the clean Defold reboot of METROVA. The first milestone is intentionally narrow: prove the visual direction, touch-first line construction, train movement and repeatable Android APK pipeline before expanding the economy/career systems.

## Current playable slice

- Home screen modeled after `docs/reference/metrova_target_reference.png`
- Istanbul night-map visual language (procedural city lights + Bosphorus / Golden Horn water bands)
- Touch/mouse: press a station, drag to another station, release to create a neon metro line
- A train is spawned and shuttles on each new route
- Connected-station objective updates toward 5 stations
- Pause and 1x/2x/3x simulation controls
- Simple passenger / date / budget simulation
- Return to home screen
- Android build scripts pinned to Defold 1.13.1 workflow

## Architecture

- `core/` — geometry, theme and cross-cutting primitives
- `data/` — Istanbul level data only
- `systems/` — simulation/network state, independent of rendering
- `ui/` — GUI factory + home/game screens + input bootstrap
- `docs/reference/` — visual target supplied for the project
- `tools/` — deterministic build entry points

The gameplay model is intentionally separate from rendering so later cities can be data-driven rather than copied scenes.

## Run in Defold

Open `game.project` in Defold 1.13.1 stable and build the project.

## Android APK

1. Use OpenJDK 25.
2. Put Defold 1.13.1 `bob.jar` at `tools/bob.jar`.
3. Windows: run `tools\build_android.bat`.
4. Linux/macOS: run `tools/build_android.sh`.

The build script targets ARM64 Android and writes bundles to `dist/android/`.

## v0.2 target

The next quality gate is not "more features". It is replacing the schematic Istanbul geometry with a geographically projected Istanbul map, then applying a polished art pass (coastline, districts, bridge silhouettes, route glow and responsive safe-area HUD).

## CI build

The `Defold Android APK` GitHub Actions workflow builds the `defold-reboot` branch on every push and uploads the debug APK as an artifact. This is the build path used as the regression gate before gameplay scope is expanded.
