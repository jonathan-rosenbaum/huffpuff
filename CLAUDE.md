# Balloon Blowout - Project Context

## Overview
Casual mobile arcade game (portrait mode) where you blow out candles on a massive birthday cake using helium balloons. Think **bowling with flames** — dense candle fields require strategic gust patterns.

## Tech Stack
- **Engine**: Phaser.js or vanilla JS Canvas (for Replit compatibility)
- **Target**: Mobile web (iOS/Android), portrait orientation
- **Deployment**: GitHub → Replit auto-deploy

## Core Gameplay Loop
1. **Inflate** balloon from helium tank (hold) — meter: green→yellow→red (pop risk)
2. **Inhale** air from balloon (drag to mouth)
3. **Exhale/flick** toward cake — short flick = wide/weak gust, long flick = focused/strong
4. Clear all candles before timer expires
5. Pop balloon? Scully fetches a new one (2-3 sec delay)

## Visual Style Guide

### Art Direction
- **NOT retro 16-bit** — higher-res semi-realistic pixel art
- Smooth gradients, detailed shading
- Clean black outlines with soft interior rendering
- White/transparent backgrounds (game-ready sprites)
- 3/4 perspective for characters
- Warm, cheerful palette

### Color Palette
- Balloon: Lime green (#7ED321) → Yellow (#F5A623) → Red (#D0021B)
- Helium tank: Royal blue (#0066CC)
- Cake: Pink frosting (#FFB6C1), white cake, brown base
- Candles: Blue (#4A90D9)
- Flames: Orange/yellow gradient (#FF9500 → #FFCC00)
- Scully: White/brown patches

### Character Specs
- **Main Character**: Guy in grey cap + black sweater + jeans
- **Helium Tank**: 4-5 feet tall (character-scale, prominent prop)
- **Scully**: Parsons Russell Terrier (longer legs than Jack Russell, athletic build)

### Cake Design
- **7-10 tiers** (tall tower for portrait mode)
- Wedding-cake style, tiered/columnar
- **50-100+ candles per level** spread across X and Y axes
- Candles on tier surfaces AND edges (dense "candle field")
- Strategic depth — some candles overlap/hide behind others
- Clearing feels like bowling: satisfying multi-hits, full clears rare

## File Structure
```
balloon-blowout/
├── CLAUDE.md
├── README.md
├── package.json
├── replit.nix
├── index.html
├── src/
│   ├── main.js
│   ├── game/
│   │   ├── Game.js
│   │   ├── Balloon.js
│   │   ├── Cake.js
│   │   ├── Candle.js
│   │   ├── Gust.js
│   │   ├── Player.js
│   │   └── Scully.js
│   ├── ui/
│   │   ├── HUD.js
│   │   ├── Meter.js
│   │   └── Menu.js
│   └── utils/
│       ├── constants.js
│       └── physics.js
├── assets/
│   ├── sprites/
│   │   ├── player/
│   │   ├── scully/
│   │   ├── balloon/
│   │   ├── cake/
│   │   ├── candles/
│   │   └── effects/
│   ├── audio/
│   └── fonts/
└── docs/
    └── PRD.md
```

## Existing Assets
Located in `assets/sprites/`:
- `scully/` — 5-frame walk cycle with balloon (Parsons Russell)
- `cake/` — 3-tier reference (needs redesign to 7-10 tiers)
- `player/` — 3 poses (inflate, walk×2) with tank

## Assets Still Needed
| Asset | Frames | Priority |
|-------|--------|----------|
| Balloon inflate sequence | 6-8 | HIGH |
| Balloon pop burst | 4-6 | HIGH |
| Player inhale pose | 2-3 | HIGH |
| Player exhale/flick | 3-4 | HIGH |
| Gust/wind particles | 4-6 | HIGH |
| Candle flame idle | 2-3 | MEDIUM |
| Candle extinguish | 3-4 | HIGH |
| Candle relight | 2-3 | MEDIUM |
| Cake redesign (7-10 tier) | 1 | HIGH |
| Scully without balloon | 4-5 | LOW |

## Game Constants
```javascript
const CONFIG = {
  SCREEN: { WIDTH: 390, HEIGHT: 844 }, // iPhone 14 portrait
  BALLOON: {
    MAX_FILL: 100,
    GREEN_ZONE: [0, 60],
    YELLOW_ZONE: [61, 85],
    RED_ZONE: [86, 100],
    POP_CHANCE_RED: 0.8, // 80% per tick in red
  },
  GUST: {
    WIDE_ANGLE: 45, // degrees, short flick
    NARROW_ANGLE: 10, // degrees, long flick
    TRAVEL_TIME: 400, // ms
  },
  SCULLY_FETCH_TIME: 2500, // ms
  LEVEL_TIME: 60, // seconds base
  MAX_POPS: 3, // strikes before lose
};
```

## Controls (One-Thumb)
- **Hold on tank nozzle**: Inflate balloon
- **Drag down to mouth**: Inhale air from balloon
- **Flick right**: Exhale gust (distance = spread)
- No buttons — all contextual gestures

## Development Notes
- Keep file size <50MB
- Target 60 FPS on mid-range devices
- Use sprite sheets for animations
- Implement simple cone-based collision for gust → candle hits
