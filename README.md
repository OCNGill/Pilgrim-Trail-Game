# Pilgrim Trail

**Version:** 1.0.0  
**Genre:** 8-bit Style Resource Management Survival Game  
**Platform:** Web Browser (HTML5 Canvas)

---

## Overview

Pilgrim Trail is a retro-styled survival game in the spirit of Oregon Trail, where you guide a party of pilgrims across 79 miles of treacherous wilderness on their journey to Plymouth. Manage your resources carefully, hunt for food, and decide when to travel or rest to ensure your party survives the journey.

## Quick Start

1. Open `index.html` in a modern web browser
2. Press **SPACE** to start traveling
3. Press **H** when stopped to hunt for food
4. Reach Mile 79 to complete the pilgrimage!

---

## File Structure

```
Pilgrim-Trail-Game/
├── index.html       # Entry point - minimal HTML structure and styling
├── game.js          # Core game logic and state management
├── renderer.js      # Canvas rendering system (8-bit aesthetic)
└── README.md        # This documentation file
```

### File Responsibilities

| File | Purpose |
|------|---------|
| `index.html` | HTML structure, CSS styling, script loading order |
| `game.js` | Game state, update logic, save/load, input handling, game loop |
| `renderer.js` | Canvas initialization, drawing functions, UI rendering |

---

## Game Mechanics

### Core Systems

#### Day Cycle
- Time advances automatically (1 day = 5 seconds real-time)
- Each day consumes **2 food per survivor**
- Game ends if food reaches 0 (starvation)

#### Distance System
- **Destination:** 79 miles
- **Travel Speed:** 3 miles per day (when traveling)
- **Victory Condition:** Reach Mile 79 with at least 1 survivor alive

#### Travel Mode
- Toggle with **SPACE** key
- **Traveling:** Advances 3 miles per day, cannot hunt
- **Stopped:** No distance progress, can hunt for food

#### Hunting
- Press **H** to hunt (only when stopped)
- **Success Rate:** 70%
- **Food Gained:** 5-15 (uniform random) on success
- **Cost:** Uses 1 full day (food consumed, day advances)
- Result displayed for 2 seconds

### Event System

Random events occur while traveling, referencing actual **Mayflower passengers** for historical immersion.

#### Event Triggering
- **Condition:** Only while traveling
- **Timing:** Checked every 2 days
- **Probability:** 20% chance per check
- **Display:** Current event shown for 3 seconds

#### Historical Events

| # | Event | Effect |
|---|-------|--------|
| 1 | "Priscilla Mullins found wild berries" | +8 Food |
| 2 | "William Bradford fell ill" | -1 mile/day for 3 days |
| 3 | "Fair winds aided progress" | +2 miles today |
| 4 | "Edward Winslow negotiated safe passage" | +5 miles today |
| 5 | "John Howland swept overboard but saved!" | No effect (tension) |
| 6 | "Myles Standish spotted potential threat" | Forced stop for 1 day |
| 7 | "Elizabeth Hopkins gave birth to Oceanus" | +1 survivor, -2 days |
| 8 | "Storm damaged supplies" | -5 Food |

#### Ship's Log
- Displays last 3 events
- Most recent event shown prominently
- Older events fade in the log

#### Active Modifiers
- **Speed Penalty:** Shows remaining days and reduction
- **Forced Stop:** "Halted!" status in red

### Resources

| Resource | Starting Amount | Consumption |
|----------|----------------|-------------|
| Food | 100 | 2 per survivor per day |
| Survivors | 4 | - |

### Win/Lose Conditions

| Condition | Outcome |
|-----------|---------|
| Reach Mile 79 | **Victory!** |
| Food reaches 0 | **Game Over** (Starvation) |
| All survivors die | **Game Over** |

---

## Control Scheme

### Gameplay Controls

| Key | Action | Condition |
|-----|--------|-----------|
| **SPACE** | Toggle Travel/Stop | Not in game over |
| **H** | Hunt for food | Stopped only |
| **Q** | Quit game | Not in game over |

### System Controls

| Key | Action | Condition |
|-----|--------|-----------|
| **S** | Save game | Always |
| **L** | Load game | Always |
| **R** | Restart game | Game over only |

---

## Architecture Notes

### State Management

The game uses a **pure functional state management** approach:

```javascript
// State is never mutated directly
const newState = updateFunction(oldState, parameters);
```

**Key Principles:**
- All state updates return new state objects
- Deep cloning via `JSON.parse(JSON.stringify())` prevents mutation
- Single source of truth in `GameLoop.state`

### Game State Structure

```javascript
{
    day: 1,                    // Current day counter
    dayProgress: 0,            // 0-1 progress toward next day
    resources: {
        food: 100,
        water: 100,
        medicine: 20
    },
    party: {
        survivors: 4,
        morale: 100,
        health: 100
    },
    settings: {
        dayDuration: 5000,     // ms per day
        foodPerSurvivor: 2,    // consumption rate
        milesPerDay: 3,        // travel speed
        destinationMiles: 79   // goal distance
    },
    miles: 0,                  // current distance traveled
    traveling: false,          // travel mode toggle
    huntResult: null,          // last hunt outcome
    huntResultTimer: 0,        // display timer for hunt result
    // Event System
    eventLog: [],              // Array of last 3 events
    eventCounter: 0,           // Days since last event check
    currentEvent: null,        // Active event with timer
    modifiers: {
        speedPenalty: 0,       // Miles/day reduction
        speedPenaltyDays: 0,   // Days remaining
        forcedStop: false,     // Must stop traveling
        forcedStopDays: 0      // Days remaining
    },
    gameOver: false,
    gameOverReason: '',
    victory: false,
    exited: false
}
```

### Game Loop Design

Uses a **fixed timestep** architecture for deterministic updates:

```
┌─────────────────────────────────────────────────┐
│              requestAnimationFrame               │
│                      │                           │
│                      ▼                           │
│  ┌─────────────────────────────────────────┐    │
│  │         Calculate Delta Time             │    │
│  └─────────────────────────────────────────┘    │
│                      │                           │
│                      ▼                           │
│  ┌─────────────────────────────────────────┐    │
│  │    Fixed Logic Updates (10Hz / 100ms)    │    │
│  │    - Day progression                     │    │
│  │    - Resource consumption                │    │
│  │    - Distance tracking                   │    │
│  │    - Victory/defeat checks               │    │
│  └─────────────────────────────────────────┘    │
│                      │                           │
│                      ▼                           │
│  ┌─────────────────────────────────────────┐    │
│  │   Render (Display refresh rate)          │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

**Benefits:**
- Consistent gameplay regardless of frame rate
- Prevents physics/timing glitches
- Separates logic from rendering

### Renderer Architecture

The renderer is completely **decoupled from game logic**:

```javascript
// Game logic knows nothing about rendering
Renderer.render(state, notification);
```

**8-bit Color Palette:**
- 16 colors inspired by CGA/EGA era
- Consistent theming throughout UI
- Color-coded status indicators

---

## How to Extend

### Adding New Resources

1. **Update State** (`game.js` line ~14):
```javascript
resources: {
    food: 100,
    water: 100,
    medicine: 20,
    newResource: 50  // Add here
}
```

2. **Add Consumption Logic** (`applyDailyConsumption`):
```javascript
state.resources.newResource -= consumptionRate;
```

3. **Update Renderer** (`renderStatus` in `renderer.js`):
```javascript
this.drawTextShadow(`Resource: ${state.resources.newResource}`, x, y, color);
```

### Adding New Actions

1. **Create Action Function** (`game.js`):
```javascript
function newAction(state) {
    if (state.gameOver || state.exited) return state;
    
    const newState = JSON.parse(JSON.stringify(state));
    // Modify newState
    return newState;
}
```

2. **Add Key Binding** (`setupInput` in `game.js`):
```javascript
} else if (key === 'X' && !this.state.gameOver) {
    this.state = newAction(this.state);
    this.showNotification('Action performed!');
}
```

3. **Update Controls Display** (`renderControls` in `renderer.js`)

### Adding New Events

1. **Create Event Check Function** (`game.js`):
```javascript
function checkForEvent(state) {
    if (Math.random() < 0.1) { // 10% chance per day
        // Apply event effects
    }
    return state;
}
```

2. **Call from Day Progression** (`updateTime` function):
```javascript
while (newState.dayProgress >= 1) {
    // ... existing code ...
    newState = checkForEvent(newState);
}
```

### Adding Visual Effects

1. **Add to Renderer Object** (`renderer.js`):
```javascript
renderNewEffect(state) {
    // Use existing drawing methods:
    // this.drawRect(), this.drawText(), this.drawTextShadow()
}
```

2. **Call from Main Render**:
```javascript
render(state, notification) {
    // ... existing code ...
    this.renderNewEffect(state);
}
```

---

## Save System

- **Storage:** Browser localStorage
- **Key:** `pilgrim_trail_save`
- **Format:** JSON-serialized game state

### Save/Load Functions

```javascript
saveGame(state)   // Returns { success: bool, message: string }
loadGame()        // Returns { success: bool, state: object, message: string }
deleteSave()      // Removes save data
hasSaveData()     // Returns boolean
```

---

## Technical Specifications

| Spec | Value |
|------|-------|
| Canvas Resolution | 640 × 480 (logical) |
| Rendering | HTML5 Canvas 2D |
| Logic Update Rate | 10 Hz (100ms fixed step) |
| Render Rate | Display refresh rate |
| Font | Monospace system font |
| Image Smoothing | Disabled (crisp pixels) |

---

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

---

## License

Proprietary - GillSystems

---

## Development Notes

Built following the **7D Agile SDLC** methodology:
- **DEFINE** → Requirements captured
- **DESIGN** → Architecture planned
- **DEVELOP** → Iterative implementation
- **DEBUG** → Testing and validation
- **DOCUMENT** → This README
- **DELIVER** → Packaged for distribution
- **DEPLOY** → Ready for deployment
