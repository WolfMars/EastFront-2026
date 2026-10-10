## Project context

EastFront-2026 is an iterative hex wargame project simulating Operation Barbarossa.
All parts — map, units, terrain, rules — are in a preliminary state and will be
refined over time. Do not treat the current implementation as authoritative.

## Working style

### Before starting a lengthy task
1. Propose a brief plan and wait for approval before executing.
2. Flag explicit decision points: "Step N requires choosing X or Y — which do you prefer?"
3. When perfect accuracy is expensive, prefer a good-enough result and note the trade-off.
   Do not let perfect be the enemy of good.
4. Seriously - do not let perfect be the enemy of good. If you find yourself thinking "I could make this better", stop and ask me.

### During a task
- Stop at natural breakpoints rather than driving straight to a polished result.
- If an unexpected design decision arises mid-task, pause and ask rather than deciding unilaterally.

### After completing a task
- Always close with a short list of known inaccuracies or compromises in the implementation.

## River authoring rules

When creating or editing rivers in the map data:
- Hexsides connect only if they share a hex CORNER (a point where three hexes meet), never merely a hex.
- Generate and validate rivers with `node scripts/river_tool.mjs` (`path`, `validate`); do not reason about
  connectivity by reading coordinate strings.
- Each river is a continuous start-to-end chain of side-key segments, grouped under its own name in the river data file.
- Do not create orphan, branching, or disconnected segments.
- When editing several rivers, keep each river's segments together and do not mix them across river names.

For the corner model, worked example and workflow, see [docs/RIVER_CREATION_GUIDE.md](../docs/RIVER_CREATION_GUIDE.md).

## Handling questions

Questions may be about the code, or about game design, history, or wargame theory in general.
If it is unclear which type of question is being asked, ask before answering.
