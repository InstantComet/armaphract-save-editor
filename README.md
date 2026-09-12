# ARMAPHRACT Save Workshop

A static, bilingual save editor for ARMAPHRACT 0.6.3. All save processing happens in your browser. No save uploads, analytics, backend, or account required.

## Features

- Crew: add, edit name/proficiencies/skills/healing, dismiss, return to barracks.
- Vehicles: 38 base types + 6 actual special presets, edit callsign/paint/damage/repair supply, clone, move to motor pool, remove and recover crew/modules.
- Vehicle loadouts: real slot sizes, facings, fixed mounts and weapon/engine limits; install from the catalog, uninstall to storage, and opt into incompatible/over-capacity/fixed-slot editing.
- Equipment overview: base and built-in armor by facing, separate module armor ratings, optics, infrared/thermal capabilities, sensors and mass.
- Module storage: 91 modules, add quantities, edit stock, remove.
- English / Chinese toggle, search, multiselect, undo (40 steps).
- Separate original-backup and edited-save downloads. The original disk file is never overwritten.
- No game launcher or executable-path selection.

Special presets: K-75BM Mod., S-92 Siegebreaker, K-75BM ROYAL, K-75A Flam., C3A7 Mod., K-115A1C. Templates were exported from the game's real objects and verified with the game's native save deserializer.

## Use

Open the website, choose or drop `savedata.json`, edit, download the original backup and edited save. Close the game, then replace the game's `savedata.json` with the edited download. Downloaded files may be renamed by your browser if a file with that name already exists.

Default save location: `%USERPROFILE%\AppData\LocalLow\aeoridev\armaphract\savedata.json`.

New vehicles have no crew. Assign crew in-game. The Modules tab adds warehouse stock. Open **Loadout & stats** on a vehicle to install new modules directly or return installed modules to storage. Apply commits the whole dialog; Cancel discards it. Storage capacity is not increased automatically. Special/test units and duplicate story characters may affect gameplay and story behavior; retain your original save. Unknown save fields are preserved; numbers outside JavaScript's safe integer range are rejected.

## Development

No build step or production dependencies. Serve this folder with `python -m http.server 8766`. Run model checks with `npm test` (Node 22+).

GitHub Pages serves these static files directly from the repository's `main` branch. `.nojekyll` disables Jekyll processing. Do not commit actual player save files.

## Privacy

Save files are read through the browser File API and remain in memory. Downloads use local Blob URLs. Only the UI language preference is stored in localStorage. GitHub Pages receives normal requests for the website and its bundled catalog, not your save contents.

Unofficial fan tool, not affiliated with the game's developer. Game names and data belong to their respective owners.

## Equipment data and limits

`equipment.json` was exported from the local 0.6.3 game through its runtime classes. Slot compatibility comes from native `ModuleSlot.CheckAddModule`. Reference tests compare every module/slot combination on all 38 base loadouts with the native result; vision and mass are checked against native `UnitInstance` calculations. Special presets use their base chassis slots.

Stats describe nominal equipment, excluding crew skills, damage, weather and battlefield modifiers. Armor values are game ratings, not millimeters; reactive armor is listed separately because effectiveness depends on the projectile. Sensor modules are listed individually. Unknown installed modules are preserved and marked as unavailable in calculations.

Force installation bypasses fit, capacity and fixed-slot restrictions. Incompatible additions receive an encoded extra mount ID while retaining the selected facing; native 0.6.3 reinitialization otherwise removes incompatible or over-capacity modules from real slots. The editor groups these extra mounts with their chosen slot after reloading. The in-game armory may not display extra mounts, so use this editor to remove them. This is a save-level workaround, not a change to the game rules. Adding weapons does not replenish their ammunition; configure ammunition in-game.
