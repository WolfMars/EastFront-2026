# To-do

## Open items

- [ ] Revert the temporary debug start view in `src/main.ts` (`TEMP-DEBUG`: `HEX_SIZE = 11`, offsets 611 / 270). Restore `HEX_SIZE = DEFAULT_HEX_SIZE` and centred offsets. This also clears the unused `DEFAULT_HEX_SIZE` compile error.
- [ ] Map alignment with reality (see "Map alignment" below). Poland and the Baltic coast are the worst area.
- [ ] Resolve the hex scale conflict: `GAME_DESIGN.md` says ~50 km per hex, `1941-06-22-OOB-PLACEMENT.md` says ~80 km. 80 km fits the map.
- [ ] Upgrade Vite 5 to 8 to fix the `npm audit` findings (esbuild <= 0.24.2 dev-server request leak, vite). Dev toolchain only. Do not use `npm audit fix --force` blindly; check `vite.config.ts` and run `npm run build` afterwards.
- [ ] Optional: waypoint (`--via`) option for `node scripts/river_tool.mjs path`, for real river shapes and fewer equal-length ties.
- [ ] Optional: remove the unused parameters `applyRiverData(_hexMap)` in `src/map.ts` and `computeReachableCosts(_owner)` in `src/game.ts`, together with their call sites.
- [ ] Delete `tmp/ref_eastern_front_1941.png` when it is no longer needed.

## Map alignment

Reference map: [Eastern Front 1941-06 to 1941-12](https://commons.wikimedia.org/wiki/File:Eastern_Front_1941-06_to_1941-12.png) (Wikimedia Commons, User:Gdr, CC BY-SA 3.0).

### Geography discrepancies (visual comparison, low resolution)

1. Black Sea, Crimea and Sea of Azov almost missing (Sevastopol on land, Azov tiny).
2. Dnieper missing.
3. Other major rivers missing: Vistula, Neman, Pripet, Dniester, Volga, Oka, Donets (only Daugava, Bug, Lower Don are drawn).
4. No real lakes: Ladoga, Peipus, Ilmen, Onega.
5. Baltic coast is a straight diagonal; no Gulf of Riga, Gulf of Finland or Estonian islands.
6. Pripet Marshes undersized.
7. Carpathians and Crimean mountains barely represented.
8. Bug displaced: ends at Odessa (the Southern Bug mouth is near Mykolaiv, ~120 km east); north-west end stops near Lviv.
9. Poznan-Warsaw spacing too tight (least certain; confirmed by the distance analysis below).
10. Map edges cut real terrain: north at Leningrad (no Finland/Karelia); south at Bucharest/Sevastopol (no Romanian coast, Danube, delta).

### City-pair distance analysis

Method:
- City hex coordinates come from `BOARD_CITIES` in `src/map.ts` (28 cities); 40 pairs spanning regions and lengths.
- Map km = Euclidean distance between hex centres / sqrt(3) * 80. Axial (q, r) to plane: x = sqrt(3)(q + r/2), y = 1.5 r.
- Real km = great-circle (haversine) distance between city-centre lat/lon.
- Discrepancy = (map - real) / real, ranked by absolute value.
- Mean map/real is 1.05, so the 80 km scale is right and the errors are local. Hex rounding alone gives about 40 km error, so only discrepancies above ~25% are truly misplaced.

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

### Suggested plan (not started)

1. Settle the scale conflict in the docs (80 km per hex).
2. Store real lat/lon beside each city (`BOARD_CITIES` or a data file).
3. Add a small repo script that projects lat/lon to the nearest hex and reports per-city offset and all-pairs error. Keep the check independent of whatever generates the positions.
4. Move individual city markers (Gdansk, Königsberg, Poznan, Warsaw, Bialystok, Riga, Pskov, Bucharest, Novgorod) to the best-fit hex.
5. Then look at terrain and coast rows in `BOARD_ROWS` (Baltic coast shape, Gulf of Riga, Black Sea).
6. Re-run the pair analysis; target all pairs within ~25%.
7. Ask before moving cities that carry setup units or borders, since unit positions in `src/data/*.json` depend on those hexes.
