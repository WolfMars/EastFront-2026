# To-do

## Open items

- [ ] The temporary debug start view in `src/main.ts` (`TEMP-DEBUG`: `HEX_SIZE = 11`, offsets 611 / 270) is committed on purpose while debug work continues. Revisit later: restore `HEX_SIZE = DEFAULT_HEX_SIZE` and centred offsets. This also clears the unused `DEFAULT_HEX_SIZE` compile error. It fits the current 31-row map on the 1200x800 canvas.
- [ ] Map alignment with reality (see "Map alignment" below). Poland and the Baltic coast are the worst area.
- [ ] Upgrade Vite 5 to 8 to fix the `npm audit` findings (esbuild <= 0.24.2 dev-server request leak, vite). Dev toolchain only. Do not use `npm audit fix --force` blindly; check `vite.config.ts` and run `npm run build` afterwards.
- [ ] Terrain from the board photos: the northern area (Gdansk - Minsk - Smolensk - Leningrad - Tallinn) was adjusted from `docs/81434784118*.jpeg`: 12 hexes changed (mostly over-forested hexes in Lithuania and around Pskov/Ostrov turned clear, two marsh hexes near Luga/Narva). Method: fit the photo to the cities' real lat/lon (homography, ~0.4 hex mean error), sample the average colour around each hex centre and classify it (dark = forest, blue-grey = marsh, light olive = clear), changing a hex only when the photo is clearly different. City hexes, unit start hexes (both setup files), water and mountain hexes were left alone. The same method could be applied to the rest of the map; the throwaway scripts were not kept in the repo.
- [ ] Optional: waypoint (`--via`) option for `node scripts/river_tool.mjs path`, for real river shapes and fewer equal-length ties. The batch 1-5 rivers were traced with a throwaway script (lat/lon waypoints fitted to the city markers, then shortest corner path); that script could become this option.
- [ ] Rivers: review the least reliable ones against the board photos (`docs/81434*.jpeg`). They were placed from remembered real waypoints, not read off the photos, so they are approximate:
  - Kuma and Terek: very short and approximate; the Kuma used to wind across mountain hexes (the row-18 mountains at q=-3..1 are now clear).
  - Velikaya, Narva and Luga: very short at 80 km/hex; the Luga and Narva mouths touch.
  - Medveditsa, Upper Don and Lower Don all meet at one corner (Stalingrad area); the Southern Bug start touches the Dniester.
  - Tsna, Khoper, Sheksna, Donets (upper reach) and the Daugava source end are rough.
  - Daugava runs along Riga's east/north-east edge (a hex side cannot pass through the hex centre).
  - River mouths just reach the coast: no Dnieper/Danube-style deltas or limans.
- [ ] Rivers not drawn: the Svir and Lake Onega (north of the r=-8 edge), the middle Volga (Kazan-Syzran, east of the q=7 edge, so Upper and Lower Volga are not connected), Sozh/Berezina. Ilmen, Ladoga and Onega are still not water hexes, so the Lovat and Volkhov end at land hexes.
- [ ] Optional: remove the unused parameters `applyRiverData(_hexMap)` in `src/map.ts` and `computeReachableCosts(_owner)` in `src/game.ts`, together with their call sites.

## Map alignment

Reference maps are kept in `docs/`: the photographed EastFront board (`*.jpeg`), `ref_eastern_front_1941.png` and `map_crop.png`. Web reference: [Eastern Front 1941-06 to 1941-12](https://commons.wikimedia.org/wiki/File:Eastern_Front_1941-06_to_1941-12.png) (Wikimedia Commons, User:Gdr, CC BY-SA 3.0).

### Geography discrepancies (visual comparison, low resolution)

1. Black Sea, Crimea and Sea of Azov reworked by hand: Crimea is a land peninsula joined at Perekop, the Karkinit gulf and Sea of Azov are water, and the Kerch strait stays a river hexside. The board was extended to r=22 (Turkish coast beyond r=22 is still cut off; only Sinop shows).
2. Dnieper missing.
3. Rivers: all rivers visible on the board photos and inside the map are drawn. Missing only because they lie off the map or are hard to place: the Svir and Lake Onega (north of the r=-8 edge), the middle Volga (Kazan-Syzran, east of the edge), Sozh/Berezina, and the Ladoga/Ilmen/Onega lakes themselves. Drawn: Daugava, Dniester, Lower Don, Upper Don, Prut, Danube, Dnieper, Desna, Pripet, Vistula, San, Western Bug, Narew, Niemen, Velikaya, Narva, Southern Bug, Donets, Manych, Kuban, Kuma, Terek, Upper Volga, Lower Volga, Oka, Moscow River, Tsna, Khoper, Medveditsa, Volkhov, Luga, Lovat, Sheksna, plus the Kerch strait hexside. The Dnieper and later rivers were placed by tracing real waypoints (lat/lon, fitted to the city markers) onto hexsides; the board photos (`docs/81434*.jpeg`) were used as a sanity check only, since the photographed board uses a different hex orientation. The Prut and Danube were traced from the board photos (`docs/81434775858__*.jpeg`) and placed by geography. The Prut ends at corner `(-16,16)(-16,17)(-15,16)`, where it joins the Danube at Galati; the Danube runs from the Iron Gates along the Bulgaria-Romania border, north at Silistra, then wraps the north and east side of the delta marsh hex `(-15,17)` to the sea. Distributaries of the delta and the Danube west of the map edge are not drawn.
4. No real lakes: Ladoga, Peipus, Ilmen, Onega.
5. Baltic coast reworked by hand from the photos (rows r=-8..-1): Gulf of Riga now two connected water hexes `(-10,-3)` and `(-9,-4)`, Courland tip (Ventspils `(-11,-3)`) and Liepaja `(-12,-1)` are land, Estonian coast (Haapsalu, Parnu) and SW Finland (Turku) are land. Estonian islands (Saaremaa, Hiiumaa) are deliberately left as sea. The Gulf of Finland is a single water row (r=-7), wider than the real ~70 km gulf. Open: `(-14,1)` is sea in reality but stays land because XXXIX and XLI Mot Corps are placed there.
6. Pripet Marshes undersized.
7. Carpathians and Crimean mountains barely represented.
8. Bug displaced (resolved): the former `Bug` block was actually the Dniester course and is renamed `Dniester`; the Western Bug and Southern Bug (ends near Nikolaev) are separate rivers.
9. Poznan-Warsaw spacing was too tight in the original placement; after the marker shifts, their current separation is 320 km versus about 278 km real.
10. Map edges still cut real terrain: north at Leningrad (no Finland/Karelia). The south edge is now r=22, which cuts the Turkish coast, Transcaucasia and the southern Caspian.

### Initial sampled city-pair baseline (before city-marker shifts)

Method:
- City hex coordinates come from `BOARD_CITIES` in `src/map.ts` (28 cities); this initial check sampled 40 pairs spanning regions and lengths.
- Map km = Euclidean distance between hex centres / sqrt(3) * 80. Axial (q, r) to plane: x = sqrt(3)(q + r/2), y = 1.5 r.
- Real km = great-circle (haversine) distance between city-centre lat/lon.
- Discrepancy = (map - real) / real, ranked by absolute value.
- Mean map/real is 1.05, so the 80 km scale is right and the errors are local. Hex rounding alone gives about 40 km error, so only discrepancies above ~25% are truly misplaced.

### Independent alignment script

Run `node scripts/map_alignment.mjs`. It reads city records from `BOARD_CITIES` and independently calculates the geographic projection and hex rounding; it does not call the game map generator. It anchors Moscow at `(0, 0)`, uses a north-up grid at the fixed 80 km center-to-center spacing, reports each city's current and nearest projected hex plus residual distance, and compares current-map distances with great-circle distances for all 378 city pairs. The fixed anchor avoids recalibrating the projection from the city positions being checked.

Initial run before city-marker shifts: mean absolute all-pairs distance error was 9.9% (mean signed error +0.6%); 345/378 pairs were within 25%. That initial run used an unconstrained fit and its figures are retained only as a historical baseline.

Current run after the approved shifts and the Bucharest reassessment: mean absolute all-pairs distance error is 5.3% (mean signed error +1.1%); 372/378 pairs are within 25%. Under the fixed Moscow anchor, 12/28 current city hexes still differ from their nearest geographic projection; these are follow-up diagnostics, not approved moves. Königsberg was intentionally left unchanged: its earlier unconstrained suggestion landed on water.

Pairs with |discrepancy| above 9% (26 of 40):

| # | Pair              | Hex steps | Map km | Real km | Discrepancy |
|---|---|---|---|---|---|
| 1 | Königsberg-Gdansk | 4 | 288 | 127 | +128% |
| 2 | Bialystok-Warsaw  | 5 | 367 | 177 | +108% |
| 3 | Novgorod-Leningrad | 3 | 240 | 166 | +45% |
| 4 | Poznan-Warsaw     | 2 | 160 | 278 | -43% |
| 5 | Pskov-Riga        | 2 | 160 | 271 | -41% |
| 6 | Vilnius-Riga      | 5 | 349 | 262 | +33% |
| 7 | Odessa-Bucharest  | 4 | 288 | 427 | -32% |
| 8 | Königsberg-Kaunas | 4 | 288 | 219 | +32% |
| 9 | Warsaw-Brest      | 3 | 240 | 183 | +31% |
| 10 | Poznan-Lviv      | 6 | 416 | 572 | -27% |
| 11 | Riga-Kaunas      | 4 | 288 | 228 | +26% |
| 12 | Tallinn-Riga     | 3 | 212 | 279 | -24% |
| 13 | Gdansk-Warsaw    | 5 | 349 | 284 | +23% |
| 14 | Pskov-Leningrad  | 4 | 320 | 262 | +22% |
| 15 | Vilnius-Minsk    | 2 | 139 | 172 | -20% |
| 16 | Tver-Novgorod    | 4 | 277 | 332 | -16% |
| 17 | Lviv-Warsaw      | 4 | 288 | 339 | -15% |
| 18 | Leningrad-Riga   | 6 | 423 | 491 | -14% |
| 19 | Minsk-Smolensk   | 5 | 349 | 306 | +14% |
| 20 | Kaunas-Vilnius   | 1 | 80 | 91 | -12% |
| 21 | Brest-Minsk      | 4 | 288 | 328 | -12% |
| 22 | Rostov-Stalingrad | 5 | 349 | 393 | -11% |
| 23 | Kharkov-Rostov   | 6 | 445 | 401 | +11% |
| 24 | Kiev-Odessa      | 7 | 487 | 441 | +10% |
| 25 | Kiev-Kharkov     | 5 | 367 | 409 | -10% |
| 26 | Vitebsk-Smolensk | 2 | 139 | 126 | +10% |

Within 9% (14 pairs): Kharkov-Stalingrad (-6%), Lviv-Bucharest (+5%), Bryansk-Moscow (+5%), Moscow-Kiev (-3%), Warsaw-Minsk (+2%), Leningrad-Tallinn, Minsk-Kiev, Lviv-Kiev, Bryansk-Kharkov, Odessa-Sevastopol, Moscow-Stalingrad, Zhitomir-Kiev, Moscow-Tver, Smolensk-Moscow.

Problem area: Poland and the Baltic coast (Gdansk, Königsberg, Poznan, Warsaw, Bialystok, Riga, Kaunas, Pskov). Secondary: Odessa-Bucharest too close, Novgorod-Leningrad too far. The east and centre are within about 4%.

Findings from the second 10 pairs: Vilnius-Riga (+33%) and Gdansk-Warsaw (+23%) confirm the Baltic/Poland problem area; Poznan-Lviv (-27%) confirms Poznan is too close to Warsaw. Leningrad-Riga (-14%) and the earlier Pskov-Riga (-41%) are too short, while Vilnius-Riga and Riga-Kaunas are too long, so Riga sits too far north-east. The long east and centre pairs (Moscow-Kiev, Kharkov-Stalingrad, Lviv-Bucharest, Warsaw-Minsk, Bryansk-Moscow) are within 6%.

### Suggested plan

1. [x] Settle the scale conflict in the docs (80 km per hex).
2. [x] Store approximate present-day city-center lat/lon beside each city in `BOARD_CITIES`.
3. [x] Add an independent repo script that projects lat/lon to the nearest hex and reports per-city offset and all-pairs error.
4. [x] Move 15 city markers to their projected hexes and coordinate the approved Gdansk, Kaunas, and Bialystok counter placements. Königsberg is deferred by request; its earlier unconstrained projection landed on water, so revisit after terrain/coast work.
5. [x] Baltic coast reworked (see discrepancy 5). Königsberg reassessed and kept at `(-15, 2)`: alternatives `(-14,2)`, `(-15,1)` and `(-14,1)` all give a higher mean distance error (11.9% vs 13.1-17.7%).
   - Black Sea reworked (see discrepancy 1) and the board extended to r=22. Neutral ownership for Bulgaria, Turkey and open sea in the new rows; Romania Axis; Caucasus Soviet. Bucharest moved to `(-18, 18)`, its exact projected hex (empty, still Axis). Sevastopol `(-12,18)` and Odessa `(-13,15)` reassessed and kept: already on their projected coastal hexes.
   - Follow-up (resolved): the Caspian was reworked from a rough real-world outline (lat/lon polygon projected onto the grid): the western shore runs continuously from the Volga delta `(1,15)` past Kizlyar `(-2,19)` to Derbent `(-3,22)`, the north shore is at r=14-15, and the east side is now land (steppe/desert, no desert terrain type) instead of sea. The Volga, Kuma and Terek ends were re-routed to the new shore. The Caspian is only 2-4 hexes wide and its outline is approximate (the polygon was not checked against the photos).
   - Follow-up: Kuban/Caucasus foothill mountains at r=17-18 (q=-8..-4) predate the new Caucasus rows and were not revisited (the q=-3..1 ones were cleared).
   - Follow-up (resolved): the Bug river ends at Odessa. It is now the `Dniester`; the Southern Bug is a separate river ending near Nikolaev.
   - The debug start view fits the taller map (checked: rows span y≈138–633 of 800, columns stay under x≈960 of 1200).
   - Follow-up (resolved): the Daugava was re-routed through Vitebsk `(-6,1)` and Riga `(-10,-2)`, ending at Riga's Gulf of Riga corner.
   - Follow-up: move the two Mot Corps off `(-14,1)` so it can become sea; needs a unit-placement decision.
6. Re-run the pair analysis; target all pairs within ~25%.
7. [x] Confirm setup-counter changes before moving cities with units on their current or destination hexes.
8. Add rivers, using manual start-end hex sides, or using the reference maps.
