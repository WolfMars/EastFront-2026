# 22 June 1941 OOB and Placement Review

## Scope and Method

This document records the opening setup used by
`src/data/agc-barbarossa-setup.json`. Turn 1 is a strict 22 June 1941
opening snapshot at the game's corps/army counter scale.

- `commandHqName` is the immediate game-command HQ for a combat unit.
- Army group, front, and military-district relationships are shown as the
  organizational hierarchy. The current game engine does not apply command
  effects from an HQ to another HQ.
- Coordinates use the axial `(q, r)` board system. The board is a stylized,
  roughly 80 km-per-hex map, so a landmark is an identifying local area, not a
  claim that the unit occupied the geographic center of that hex.
- The listed landmarks are the nearest named town, river line, or geographic
  sector used to identify each counter during review.

Primary cross-check: [Operation Barbarossa order of battle](https://en.wikipedia.org/wiki/Operation_Barbarossa_order_of_battle), especially its dated German Army Group OOB references and its 22 June Soviet Front listings. The source page cites Leo Niehorster for the German army groups and Robert Kirchubel's campaign volumes for the Soviet Front summaries. The project-level consolidation is in [ORDER_OF_BATTLE.md](ORDER_OF_BATTLE.md).

## Date Rules Applied

- The Leningrad Military District is used instead of the Northern Front, which
  was created after the opening date.
- The Baltic, Western, and Kiev special districts are labeled by their
  operational Front names used for the opening campaign.
- The Odessa Military District and 9th Separate Army are retained; the later
  Southern Front is not placed.
- Stavka is not placed because it was established on 23 June.
- The Hungarian Carpathian Group and Mobile Corps are not placed. Hungary
  entered the war on 27 June and the Mobile Corps entered operations on 1 July.
- Reserve armies are not represented as free-standing HQ counters because this
  setup has no represented subordinate corps for them. They belong in a future
  reinforcement system, rather than receiving unrestricted supply on turn 1.

## Axis

Axis counters are placed on Axis-owned land hexes of
`src/data/1941-06-barbarossa.json`. Hexes that touch Soviet-owned land
(border hexes, marked **B**) are stacked to their limit (2 on clear terrain,
1 on forest, marsh or mountain) because this setup is an offensive opening.
Army and Panzer Group HQs sit on or next to a border hex where stacking
allows, and every corps is within 4 hexes (command range with supply) of its
command HQ. Landmarks are approximate, as the map is stylised at 80 km/hex.

### Army Group Centre (AGC)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| AGC HQ [C] | `(-17, 5)` | Warsaw approaches / Modlin |

#### 9th Army (organizational parent: AGC)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 9th Army HQ [9] | `(-16, 4)` | Ostrolenka-Lomza rear |
| V Corps | `(-15, 4)` **B** | Suwalki-Grodno frontier |
| VI Corps | `(-16, 3)` | Suwalki-Augustow rear |
| VIII Corps | `(-16, 4)` | Ostrolenka-Lomza rear |
| XX Corps | `(-17, 5)` | Modlin-Ostrow Mazowiecka |

#### 4th Army (organizational parent: AGC)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 4th Army HQ [4] | `(-16, 5)` | Warsaw city hex |
| VII Corps | `(-15, 5)` **B** | Bialystok approaches |
| IX Corps | `(-15, 5)` **B** | Bialystok approaches |
| XIII Corps | `(-16, 5)` | Warsaw city hex |
| XLIII Corps | `(-16, 6)` | Siedlce rear |

#### 3rd Panzer Group (organizational parent: AGC)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 3rd PzGrp HQ [P3] | `(-15, 4)` **B** | Suwalki-Grodno frontier |
| XXXIX Mot Corps | `(-15, 3)` **B** | Suwalki-Alytus axis |
| LVII Mot Corps | `(-15, 3)` **B** | Suwalki-Alytus axis |

#### 2nd Panzer Group (organizational parent: AGC)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 2nd PzGrp HQ [P2] | `(-16, 6)` | Siedlce rear |
| XII Corps | `(-16, 7)` **B** | Bug River, south of Brest |
| XXIV Mot Corps | `(-16, 7)` **B** | Bug River, south of Brest |
| XLVI Mot Corps | `(-15, 6)` **B** | Brest-Litovsk approaches |
| XLVII Mot Corps | `(-15, 6)` **B** | Brest-Litovsk approaches |

### Army Group North (AGN)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| AGN HQ [N] | `(-17, 4)` | Allenstein-Insterburg rear command area |

#### 18th Army (organizational parent: AGN)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 18th Army HQ [18] | `(-17, 2)` | Gdansk city hex |
| I Corps | `(-17, 2)` | Gdansk city hex |
| XXVI Corps | `(-18, 4)` | Elbing-Marienburg |
| XXXVIII Corps | `(-18, 3)` | Elbing-Marienburg |

#### 16th Army (organizational parent: AGN)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 16th Army HQ [16] | `(-17, 3)` | East Prussian rear |
| II Corps | `(-17, 3)` | East Prussian rear |
| X Corps | `(-17, 4)` | Allenstein |
| XXVIII Corps | `(-18, 3)` | Elbing-Marienburg |

#### 4th Panzer Group (organizational parent: AGN)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 4th PzGrp HQ [P4] | `(-16, 3)` | East Prussian rear, behind the Tilsit axis |
| XLI Mot Corps | `(-14, 2)` **B** | Tilsit-Kaunas axis |
| LVI Mot Corps | `(-14, 2)` **B** | Tilsit-Kaunas axis |

### Army Group South (AGS)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| AGS HQ [S] | `(-18, 10)` | Przemysl-Lublin district |

#### 6th Army (organizational parent: AGS)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 6th Army HQ [6] | `(-18, 8)` | Lublin-Lutsk axis |
| XVII Corps | `(-18, 8)` | Lublin-Lutsk axis |
| XXIX Corps | `(-18, 9)` | Hrubieszow-Lutsk axis |
| LV Corps | `(-18, 9)` | Hrubieszow-Lutsk axis |

#### 17th Army (organizational parent: AGS)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 17th Army HQ [17] | `(-18, 10)` | Przemysl sector |
| IV Corps | `(-17, 10)` **B** | Przemysl-Lviv axis (forest) |
| LII Corps | `(-17, 11)` **B** | Carpathian foothills (forest) |
| XLIX Mtn Corps | `(-17, 12)` **B** | Carpathian foothills (mountain) |

#### 1st Panzer Group (organizational parent: AGS)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 1st PzGrp HQ [P1] | `(-17, 9)` **B** | Vladimir-Volynskyi / Rava-Ruska axis |
| III Mot Corps | `(-17, 8)` **B** | Sokal-Lutsk axis |
| XIV Mot Corps | `(-17, 8)` **B** | Sokal-Lutsk axis |
| XLVIII Mot Corps | `(-17, 9)` **B** | Lviv approaches |

#### 11th Army (organizational parent: AGS / Army Group Antonescu sector)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 11th Army HQ [11] | `(-17, 14)` **B** | Northern Moldavia / Prut River sector |
| XI Corps | `(-16, 14)` **B** | Prut River sector (mountain hex) |
| XXX Corps | `(-18, 14)` | Northern Moldavia |

#### 3rd Romanian Army (organizational parent: Army Group Antonescu)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 3rd Ro Army HQ [R3] | `(-17, 14)` **B** | Northern Moldavia |
| Ro Mountain Corps | `(-17, 13)` **B** | Carpathian sector (mountain hex) |

#### 4th Romanian Army (organizational parent: Army Group Antonescu)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 4th Ro Army HQ [R4] | `(-17, 15)` | Central Moldavia |
| Ro Cavalry Corps | `(-16, 16)` **B** | Prut River crossing sector |
| XI Ro Corps | `(-16, 15)` **B** | Bessarabian frontier (mountain hex) |
| IV Ro Corps | `(-16, 16)` **B** | Lower Prut / Odessa approaches |

## Soviet Forces

### Leningrad Military District

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| Leningrad MD HQ [L] | `(-1, -6)` | Leningrad approaches |
| 7th Army HQ [7] | `(0, -5)` | Karelian Isthmus / Lake Ladoga |
| 14th Army HQ [14] | `(2, -7)` | Murmansk / Kola Peninsula axis |
| 23rd Army HQ [23] | `(-4, -6)` | Vyborg / Karelian Isthmus |

No subordinate counter is represented under these army HQs at the current scale.

### Northwestern Front

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| Northwestern Front HQ [NW] | `(-8, -2)` | Riga |

#### 8th Army (organizational parent: Northwestern Front)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 8th Army HQ [8] | `(-10, -1)` | Siauliai-Riga axis |
| X Rifle Corps | `(-10, 0)` | Siauliai line |
| XI Rifle Corps | `(-10, 1)` | Kaunas-Siauliai axis |
| XII Mechanised Corps | `(-9, 0)` | Siauliai-Raseiniai sector |

#### 11th Army (organizational parent: Northwestern Front)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 11th Army HQ [11] | `(-12, 1)` | Kaunas city hex (map-alignment adjustment) |
| XVI Rifle Corps | `(-11, 0)` | Kaunas western approaches |
| XXIX Rifle Corps | `(-14, 4)` | Bialystok city hex (map-alignment adjustment) |
| III Mechanised Corps | `(-10, 2)` | Vilnius area |

#### 27th Army (organizational parent: Northwestern Front)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 27th Army HQ [27] | `(-8, 1)` | Daugavpils second echelon |

No subordinate counter is represented under 27th Army at the current scale.

### Western Front

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| Western Front HQ [W] | `(-12, 3)` | Bialystok-Minsk axis |

#### 3rd Army (organizational parent: Western Front)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 3rd Army HQ [3] | `(-14, 4)` | Bialystok city hex (map-alignment adjustment) |
| IV Rifle Corps | `(-12, 1)` | Grodno frontier sector |
| XI Mechanised Corps | `(-11, 2)` | Grodno-Lida axis |

#### 4th Army (organizational parent: Western Front)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 4th Army HQ [4] | `(-13, 4)` | Brest-Litovsk approaches |
| XXVIII Rifle Corps | `(-13, 5)` | Brest-Litovsk fortress line |
| XIV Mechanised Corps | `(-12, 4)` | Kobryn-Brest sector |
| I Anti-Tank Brigade | `(-12, 5)` | Brest-Kobryn defensive belt |

#### 10th Army (organizational parent: Western Front)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 10th Army HQ [10] | `(-13, 3)` | Bialystok |
| I Rifle Corps | `(-13, 4)` | Bialystok salient western shoulder |
| V Rifle Corps | `(-12, 6)` | Brest-Baranovichi corridor |
| VI Mechanised Corps | `(-11, 3)` | Bialystok reserve area |
| XIII Mechanised Corps | `(-11, 4)` | Bialystok southern approaches |
| VI Cavalry Corps | `(-11, 5)` | Slonim-Baranovichi axis |

#### Front reserve (organizational parent: Western Front)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| XVII Mechanised Corps | `(-10, 3)` | Baranovichi approaches |
| XX Mechanised Corps | `(-10, 4)` | Minsk western approaches |

The later 13th Army HQ is deliberately not placed in the 22 June setup.

### Southwestern Front

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| Southwestern Front HQ [SW] | `(-12, 9)` | Zhitomir front command area |

#### 5th Army (organizational parent: Southwestern Front)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 5th Army HQ [5] | `(-15, 8)` | Kovel-Lutsk border belt |
| XV Rifle Corps | `(-15, 9)` | Kovel |
| XXVII Rifle Corps | `(-14, 9)` | Lutsk |
| XXII Mechanised Corps | `(-14, 8)` | Volodymyr-Volynskyi axis |

#### 6th Army (organizational parent: Southwestern Front)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 6th Army HQ [6] | `(-15, 10)` | Lviv border approaches |
| VI Rifle Corps | `(-14, 10)` | Rava-Ruska sector |
| XXXVII Rifle Corps | `(-15, 11)` | Lviv southern sector |
| IV Mechanised Corps | `(-14, 11)` | Lviv-Brody axis |

#### 12th Army (organizational parent: Southwestern Front)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 12th Army HQ [12] | `(-14, 12)` | Stanislav / Carpathian approaches |
| XIII Rifle Corps (12th Army) | `(-14, 13)` | Chernivtsi sector |
| XVII Rifle Corps (12th Army) | `(-13, 12)` | Stanislav area |
| XVI Mechanised Corps (12th Army) | `(-13, 13)` | Drohobych-Stryi axis |

#### 26th Army (organizational parent: Southwestern Front)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 26th Army HQ [26] | `(-10, 8)` | Przemysl-Lviv axis |
| VIII Rifle Corps | `(-9, 8)` | Sambir area |
| VIII Mechanised Corps | `(-8, 8)` | Drohobych area |
| II Cavalry Corps (26th Army) | `(-8, 9)` | Stryi sector |

#### Front reserve (organizational parent: Southwestern Front)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| IX Mechanised Corps | `(-13, 9)` | Novograd-Volynskyi reserve area |
| XV Mechanised Corps | `(-13, 10)` | Brody reserve area |
| XIX Mechanised Corps | `(-9, 9)` | Rivne reserve area |
| XXIV Mechanised Corps | `(-10, 11)` | Proskurov reserve area |

### Odessa Military District / 9th Separate Army

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| Odessa MD HQ [O] | `(-12, 14)` | Chisinau / Bessarabian frontier |

#### 9th Separate Army (organizational parent: Odessa Military District)

| Counter | Hex | Landmark / geographic reference |
| --- | --- | --- |
| 9th Separate Army HQ [9] | `(-13, 14)` | Balti sector |
| XIV Rifle Corps (9th Army) | `(-12, 15)` | Balti-Chisinau axis |
| XXXV Rifle Corps | `(-11, 15)` | Chisinau approaches |
| II Cavalry Corps (9th Army) | `(-11, 14)` | Balti sector |
| II Mechanised Corps | `(-10, 14)` | Tiraspol sector |
| XVIII Mechanised Corps | `(-9, 14)` | Odessa approaches |

## Review Checklist

1. Confirm whether the named local landmarks are suitable labels for the
   deliberately coarse board positions.
2. Confirm whether additional AGN corps (for example higher-fidelity infantry
  or security elements) should be added in a later reinforcement pass.
3. Decide the reinforcement date and arrival areas for the Soviet reserve
   armies, later 13th and 18th Armies, and Hungarian forces.