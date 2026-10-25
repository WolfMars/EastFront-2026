# To-do

## Open items

- [ ] The temporary debug start view in `src/main.ts` (`TEMP-DEBUG`: `HEX_SIZE = 11`, offsets 611 / 270) is committed on purpose while debug work continues. Revisit later: restore `HEX_SIZE = DEFAULT_HEX_SIZE` and centred offsets. This also clears the unused `DEFAULT_HEX_SIZE` compile error. It fits the current 31-row map on the 1200x800 canvas.
- [ ] Map alignment with reality (see "Map alignment" below). Poland and the Baltic coast are the worst area.
- [ ] Upgrade Vite 5 to 8 to fix the `npm audit` findings (esbuild <= 0.24.2 dev-server request leak, vite). Dev toolchain only. Do not use `npm audit fix --force` blindly; check `vite.config.ts` and run `npm run build` afterwards.
- [ ] Optional: waypoint (`--via`) option for `node scripts/river_tool.mjs path`, for real river shapes and fewer equal-length ties.
- [ ] Optional: remove the unused parameters `applyRiverData(_hexMap)` in `src/map.ts` and `computeReachableCosts(_owner)` in `src/game.ts`, together with their call sites.

## Map alignment

Reference maps are kept in `docs/`: the photographed EastFront board (`*.jpeg`), `ref_eastern_front_1941.png` and `map_crop.png`. Web reference: [Eastern Front 1941-06 to 1941-12](https://commons.wikimedia.org/wiki/File:Eastern_Front_1941-06_to_1941-12.png) (Wikimedia Commons, User:Gdr, CC BY-SA 3.0).

### Geography discrepancies (visual comparison, low resolution)

1. Black Sea, Crimea and Sea of Azov reworked by hand: Crimea is a land peninsula joined at Perekop, the Karkinit gulf and Sea of Azov are water, and the Kerch strait stays a river hexside. The board was extended to r=22 (Turkish coast beyond r=22 is still cut off; only Sinop shows).
2. Dnieper missing.
3. Other major rivers missing: Vistula, Neman, Pripet, Dniester, Volga, Oka, Donets (only Daugava, Bug, Lower Don are drawn).
4. No real lakes: Ladoga, Peipus, Ilmen, Onega.
5. Baltic coast reworked by hand from the photos (rows r=-8..-1): Gulf of Riga now two connected water hexes `(-10,-3)` and `(-9,-4)`, Courland tip (Ventspils `(-11,-3)`) and Liepaja `(-12,-1)` are land, Estonian coast (Haapsalu, Parnu) and SW Finland (Turku) are land. Estonian islands (Saaremaa, Hiiumaa) are deliberately left as sea. The Gulf of Finland is a single water row (r=-7), wider than the real ~70 km gulf. Open: `(-14,1)` is sea in reality but stays land because XXXIX and XLI Mot Corps are placed there.
6. Pripet Marshes undersized.
7. Carpathians and Crimean mountains barely represented.
8. Bug displaced: ends at Odessa (the Southern Bug mouth is near Mykolaiv, ~120 km east); north-west end stops near Lviv.
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
   - Follow-up: the Caspian coast is displaced. Rows 13-18 put it at q>=3..6, while the new rows 19-22 use the real position (q>=-1..-2), so there is a visible notch at the r=18/19 boundary. Rework the Caspian next.
   - Follow-up: Kuban/Caucasus foothill mountains at r=17-18 (q=-8..1) predate the new Caucasus rows and were not revisited.
   - Follow-up: the Bug river still ends at Odessa, not Nikolaev (discrepancy 8).
   - The debug start view fits the taller map (checked: rows span y≈138–633 of 800, columns stay under x≈960 of 1200).
   - Follow-up: the Daugava river segments still end at the old Riga position `(-8,-3)`; Riga now sits at `(-10,-2)`. Re-route the mouth with `scripts/river_tool.mjs`.
   - Follow-up: move the two Mot Corps off `(-14,1)` so it can become sea; needs a unit-placement decision.
6. Re-run the pair analysis; target all pairs within ~25%.
7. [x] Confirm setup-counter changes before moving cities with units on their current or destination hexes.
