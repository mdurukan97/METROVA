# METROVA visual target — Night Istanbul

The approved target is a cinematic night-time Istanbul atlas with the density and glow of a living metropolis, while all gameplay anchors remain geographic.

## Non-negotiable

- Bosphorus, Golden Horn, Marmara shoreline and district placement follow geographic data.
- Stations use verified geographic coordinates.
- Player lines snap to those coordinates.
- Camera may pitch the map for a 2.5D look, but pitch must not alter simulation coordinates.
- The campaign can pan east through Kadıköy, Maltepe, Kartal and Pendik without switching to a fake map.
- Buildings/roads are a visual layer; the simulation graph remains independent.
- Night roads/buildings use warm amber light; water stays dark navy; player metro lines remain saturated and legible.
- Tunnels use a distinct dashed/glowing treatment.
- HUD remains compact so the city is the dominant visual.

## Data strategy

Do not ship screenshots or scraped OpenStreetMap tiles. Build an offline derived atlas from geographic source data and retain required attribution. OpenStreetMap-derived geometry is styled by METROVA, not by copying another map product's cartography.

The Istanbul campaign camera covers the historic peninsula through Pendik. Level-specific camera framing focuses on active stations and allows 1x–4x zoom/pan.
