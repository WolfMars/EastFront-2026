# EastFront 2026

A browser-based WWII hex strategy game focusing on the Eastern Front (Barbarossa campaign).

## Overview

EastFront 2026 is a turn-based operational-level strategy game featuring:
- **Hex-based tactical map** of Eastern Europe
- **Unit types**: Infantry, Armor, Headquarters
- **Two-player local gameplay**: Axis vs Soviet
- **Simple combat resolution** and movement mechanics
- **AI opponent** support (future)

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
git clone https://github.com/WolfMars/EastFront-2026.git
cd EastFront-2026
npm install
```

### Running Locally

```bash
npm run dev
```

The game will open at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

## Game Mechanics

### Turn Structure
1. **Select Phase** - Click a unit to select it
2. **Movement** - Click a highlighted hex to move
3. **Attack** - Adjacent enemies can be attacked (future)
4. **End Turn** - Click "End Turn" to switch players

### Unit Types
- **Infantry** - Medium strength, standard movement
- **Armor** - High strength, mobile
- **Headquarters** - Low strength, supports nearby units

### Map
- Terrain types: Plain, Forest, Mountain, Water, City
- Strategic objectives in Moscow, Leningrad, Kiev

## Project Structure

```
EastFront-2026/
├── index.html           # Page layout
├── styles.css           # UI styling
├── src/
│   ├── main.ts          # App bootstrap & render loop
│   ├── hex.ts           # Hex coordinate math
│   ├── map.ts           # Map generation & terrain
│   ├── game.ts          # Game state & rules
│   └── ai.ts            # AI opponent (placeholder)
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies
```

## Development Phases

- [x] Phase 1: Project setup
- [x] Phase 2: Hex map system
- [ ] Phase 3: Game state & rules
- [ ] Phase 4: User interaction
- [ ] Phase 5: Barbarossa scenario
- [ ] Phase 6: AI opponent
- [ ] Phase 7: Polish & iterate

## Future Features

- Combat system with odds-based resolution
- Supply line mechanics
- Historical unit rosters
- AI opponent
- Online multiplayer (WebSockets)
- Replay system
- Unit animations

## License

MIT

## Author

WolfMars
