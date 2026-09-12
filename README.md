# ARMAPHRACT Save Workshop

A static, bilingual save editor for ARMAPHRACT 0.6.3. All save processing happens in your browser. No save uploads, analytics, backend, or account required.

## Features

- Crew: add, edit name/proficiencies/skills/healing, dismiss, return to barracks.
- Vehicles: 38 base types + 6 actual special presets, edit callsign/paint/damage/repair supply, clone, move to motor pool, remove and recover crew/modules.
- Module storage: 91 modules, add quantities, edit stock, remove.
- English / Chinese toggle, search, multiselect, undo (40 steps).
- Separate original-backup and edited-save downloads. The original disk file is never overwritten.
- No game launcher or executable-path selection.

Special presets: K-75BM Mod., S-92 Siegebreaker, K-75BM ROYAL, K-75A Flam., C3A7 Mod., K-115A1C. Templates were exported from the game's real objects and verified with the game's native save deserializer.

## Use

Open the website, choose or drop `savedata.json`, edit, download the original backup and edited save. Close the game, then replace the game's `savedata.json` with the edited download. Downloaded files may be renamed by your browser if a file with that name already exists.

Default save location: `%USERPROFILE%\AppData\LocalLow\aeoridev\armaphract\savedata.json`.

New vehicles have no crew. Assign crew in-game. Modules are added to storage; install them in compatible slots in-game. Storage capacity is not increased automatically. Special/test units and duplicate story characters may affect gameplay and story behavior; retain your original save. Unknown save fields are preserved; numbers outside JavaScript's safe integer range are rejected.

## Development

No build step or production dependencies. Serve this folder with `python -m http.server 8766`. Run model checks with `npm test` (Node 22+).

GitHub Pages serves these static files directly from the repository's `main` branch. `.nojekyll` disables Jekyll processing. Do not commit actual player save files.

## Privacy

Save files are read through the browser File API and remain in memory. Downloads use local Blob URLs. Only the UI language preference is stored in localStorage. GitHub Pages receives normal requests for the website and its bundled catalog, not your save contents.

Unofficial fan tool, not affiliated with the game's developer. Game names and data belong to their respective owners.
