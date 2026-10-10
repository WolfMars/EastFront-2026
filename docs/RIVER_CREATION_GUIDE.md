# River creation guide

Rivers are stored in [data/rivers-sidekeys.json](../data/rivers-sidekeys.json), one named block per river.
Each river is a chain of hexsides. Use the tool [scripts/river_tool.mjs](../scripts/river_tool.mjs) to generate and
validate chains; do not reason about connectivity by reading coordinate strings.

## The model: hexsides connect at CORNERS

- A **hexside** is the edge shared by two adjacent hexes. It is drawn as a line between two **corners**.
- A **corner** is a point where three hexes meet.
- The side key `a|b` names the two hexes on either side of the edge. The two corners of that edge are each
  identified by one of the two hexes that touch both `a` and `b`.
- Two hexsides are connected **if and only if they share a corner**.
- Sharing a hex is NOT enough. Every hexside of a hex shares that hex with five other sides, but only the
  two neighbouring sides on that hex touch it at a corner.

### Worked example: start side `-13,15|-12,15`

The hexes touching both `-13,15` and `-12,15` are `-12,14` and `-13,16`, so the side has two corners:

| Corner (three hexes)       | Other hexsides meeting there        |
| -------------------------- | ----------------------------------- |
| `-13,15` `-12,15` `-12,14` | `-13,15\|-12,14` and `-12,14\|-12,15` |
| `-13,15` `-12,15` `-13,16` | `-13,15\|-13,16` and `-13,16\|-12,15` |

A river leaves this side through one corner, and the other corner stays open (or is where the previous side
joined). Going toward the Bug's end, the river leaves through the first corner, so the next side is either
`-13,15|-12,14` or `-12,14|-12,15`.

`-13,15|-14,15` is NOT connected: it shares only the hex `-13,15`. Its corners are
`-14,15 -13,15 -13,14` and `-14,15 -13,15 -14,16`, neither of which is a corner of the start side.

## Rules for a river

1. Each river is its own named block in `rivers`; never mix one river's rows into another's.
2. A river is one continuous chain: each side shares a corner with the next one.
3. At every corner at most two sides of the river meet (no branches). An interior side joins its predecessor
   at one corner and its successor at the other.
4. The chain has exactly two open corners, the start and the end. No orphan pieces, no duplicated sides.
5. Both hexes of every side must be on the map (q -21..7, r -8..18).
6. Write sides in chain order, start first and end last, so the ends are easy to find.
7. Write keys in canonical form: smaller `q` first, ties broken by smaller `r` (`-13,15|-12,15`, not
   `-12,15|-13,15`). The game canonicalises on load, but the tool warns about non-canonical rows.
8. `path` gives the shortest chain, which is only a starting point. Hand-edit extra curves where the real river
   requires them (as with Daugava); the result must still satisfy rules 2-4.

## Tool

```
node scripts/river_tool.mjs corners  "<side>"             both corners of a side and the sides meeting there
node scripts/river_tool.mjs path     "<start>" "<end>"    shortest chain (+ how many equally short chains exist)
node scripts/river_tool.mjs validate [RiverName]          check one or all rivers in the data file
node scripts/river_tool.mjs regen    RiverName            rebuild from first/last stored side and compare
node scripts/river_tool.mjs selftest                      check the corner model against the renderer's geometry
```

When several chains are equally short, `path` picks one deterministically (by first hex q, then r, then
E/SE/NE direction). The reported count tells you when to check the result against geography and, if
needed, adjust it by hand and re-run `validate`.

## Workflow for a new river

1. Pick the river name, the start side and the end side.
2. Run `path "<start>" "<end>"`.
3. If more than one equally short chain exists, compare with the real river and adjust by hand if needed.
4. Paste the segments into `data/rivers-sidekeys.json` as a new block named after the river.
5. Run `validate "<RiverName>"`; it must report `ok` with exactly two open ends equal to start and end.

## River file structure

```json
{
  "comment": "River side keys grouped by river name.",
  "rivers": [
    {
      "name": "Lower Don",
      "segments": [
        "-6,15|-5,14",
        "-5,14|-5,15",
        "-5,14|-4,14",
        "-4,13|-4,14",
        "-4,13|-3,13",
        "-3,12|-3,13",
        "-3,12|-2,12",
        "-2,11|-2,12",
        "-2,12|-1,11",
        "-1,11|-1,12",
        "-1,11|0,11"
      ]
    }
  ]
}
```

The real file contains several such blocks, one per river.

## Reference data

`Bug` (start `-13,15|-12,15`, end `-16,9|-15,9`, 19 sides) and `Lower Don` (start `-6,15|-5,14`, end
`-1,11|0,11`, 11 sides) in the data file are regression cases: `regen Bug` and `regen "Lower Don"` must
report an identical sequence. Run them, together with `selftest`, after any change to the tool.

