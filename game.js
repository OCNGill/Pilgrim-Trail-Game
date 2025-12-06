/**
 * Pilgrim Trail - Core Game Logic
 * Pure state management with no side effects
 */

// ============================================
// GAME STATE STRUCTURE
// ============================================

const INITIAL_STATE = {
    day: 1,
    dayProgress: 0,          // 0-1 progress toward next day
    resources: {
        food: 300,           // 12 survivors x 2 food/day = 24/day, ~12 days supply
        water: 100,
        medicine: 20
    },
    party: {
        survivors: 12,       // Derived from roster alive count
        morale: 100,
        health: 100
    },
    settings: {
        dayDuration: 10000,  // 10 seconds per day in milliseconds (slower pace)
        foodPerSurvivor: 2,  // Food consumed per survivor per day
        milesPerDay: 3,      // Miles traveled per day when moving
        destinationMiles: 79 // Total distance to destination
    },
    // Historical Mayflower passenger roster
    // priority: lower = dies first, higher = saved for dramatic moments
    roster: [
        { name: 'William Bradford', alive: true, ill: false, tag: null, priority: 10, causeOfDeath: null },
        { name: 'Myles Standish', alive: true, ill: false, tag: null, priority: 9, causeOfDeath: null },
        { name: 'Stephen Hopkins', alive: true, ill: false, tag: null, priority: 5, causeOfDeath: null },
        { name: 'Priscilla Mullins', alive: true, ill: false, tag: null, priority: 6, causeOfDeath: null },
        { name: 'Edward Winslow', alive: true, ill: false, tag: null, priority: 7, causeOfDeath: null },
        { name: 'John Alden', alive: true, ill: false, tag: null, priority: 4, causeOfDeath: null },
        { name: 'John Howland', alive: true, ill: false, tag: null, priority: 3, causeOfDeath: null },
        { name: 'Elizabeth Hopkins', alive: true, ill: false, tag: null, priority: 8, causeOfDeath: null },
        { name: 'William Brewster', alive: true, ill: false, tag: null, priority: 5, causeOfDeath: null },
        { name: 'Richard Warren', alive: true, ill: false, tag: null, priority: 2, causeOfDeath: null },
        { name: 'Francis Cooke', alive: true, ill: false, tag: null, priority: 1, causeOfDeath: null },
        { name: 'John Carver', alive: true, ill: false, tag: null, priority: 1, causeOfDeath: null }
    ],
    // Journey statistics
    stats: {
        huntAttempts: 0,
        huntSuccesses: 0,
        daysTraveled: 0,
        consecutiveHuntFailures: 0  // Track hunt failure streak
    },
    // Distance tracking
    miles: 0,
    traveling: false,        // true = moving, false = stopped
    // Hunt result display
    huntResult: null,        // { success: bool, amount: number, message: string, animPhase: number } or null
    huntResultTimer: 0,      // Countdown timer for result display
    huntAnimTimer: 0,        // Animation timer for hunt result effects
    // Warning flash timer
    warningFlashTimer: 0,    // Cycles 0-2000ms for flashing warnings
    // Event system
    eventLog: [],            // Array of last 3 events: { text, day, effect }
    eventCounter: 0,         // Count days while traveling for event timing
    currentEvent: null,      // Current active event: { text, effect, timer }
    // Death log
    deathLog: [],            // Array of death events: { name, cause, day }
    modifiers: {
        speedPenalty: 0,     // Reduce miles/day (e.g., illness)
        speedPenaltyDays: 0, // Days remaining for speed penalty
        forcedStop: false,   // Force party to stop
        forcedStopDays: 0    // Days remaining for forced stop
    },
    // Game state
    gameOver: false,
    gameOverReason: '',
    victory: false,
    exited: false
};

// Deep clone to prevent mutation
function createInitialState() {
    return JSON.parse(JSON.stringify(INITIAL_STATE));
}

// ============================================
// SURVIVOR & DEATH MECHANICS
// ============================================

/**
 * Get count of living survivors from roster
 */
function getSurvivorCount(state) {
    return state.roster.filter(p => p.alive).length;
}

/**
 * Update survivor count based on roster
 */
function updateSurvivorCount(state) {
    state.party.survivors = getSurvivorCount(state);
}

/**
 * Get next victim based on priority (lowest priority dies first)
 * Returns the passenger object or null if all dead
 */
function getNextVictim(state) {
    const alivePassengers = state.roster
        .filter(p => p.alive)
        .sort((a, b) => a.priority - b.priority); // Lowest priority first

    return alivePassengers.length > 0 ? alivePassengers[0] : null;
}

/**
 * Kill a passenger with specified cause
 * Updates roster and death log
 */
function killPassenger(state, passenger, cause) {
    if (!passenger || !passenger.alive) return;

    passenger.alive = false;
    passenger.causeOfDeath = cause;

    // Add to death log
    state.deathLog.push({
        name: passenger.name,
        cause: cause,
        day: state.day
    });

    // Update survivor count
    updateSurvivorCount(state);

    // Check for game over
    if (state.party.survivors <= 0) {
        state.gameOver = true;
        state.gameOverReason = 'All party members have perished. The trail claims another group.';
    }
}

// ============================================
// HISTORICAL EVENTS - Mayflower Passengers
// ============================================

const HISTORICAL_EVENTS = [
    // === POSITIVE EVENTS ===
    {
        id: 1,
        text: "Priscilla Mullins found wild berries",
        effect: 'food',
        value: 15
    },
    {
        id: 2,
        text: "John Alden caught a large deer",
        effect: 'food',
        value: 25
    },
    {
        id: 3,
        text: "Fair winds aided progress",
        effect: 'bonusMiles',
        value: 3
    },
    {
        id: 4,
        text: "Edward Winslow negotiated safe passage",
        effect: 'bonusMiles',
        value: 5
    },
    {
        id: 5,
        text: "Found an abandoned camp with supplies",
        effect: 'food',
        value: 20
    },
    {
        id: 6,
        text: "Clear skies and easy terrain",
        effect: 'bonusMiles',
        value: 4
    },
    {
        id: 7,
        text: "William Brewster led uplifting sermon",
        effect: 'morale',
        value: 10
    },
    {
        id: 8,
        text: "Fresh water spring discovered",
        effect: 'food',
        value: 10
    },
    {
        id: 9,
        text: "Friendly natives shared provisions",
        effect: 'food',
        value: 30
    },
    {
        id: 10,
        text: "Elizabeth Hopkins gave birth to Oceanus",
        effect: 'birth',
        value: 1,
        dayCost: 2
    },

    // === NEUTRAL/TENSION EVENTS ===
    {
        id: 11,
        text: "John Howland swept overboard but saved!",
        effect: 'none',
        value: 0
    },
    {
        id: 12,
        text: "Strange sounds in the night... nothing found",
        effect: 'none',
        value: 0
    },
    {
        id: 13,
        text: "Myles Standish scouted ahead - all clear",
        effect: 'none',
        value: 0
    },

    // === NEGATIVE EVENTS ===
    {
        id: 14,
        text: "William Bradford fell ill",
        effect: 'speedPenalty',
        value: 1,
        duration: 3
    },
    {
        id: 15,
        text: "Storm damaged supplies",
        effect: 'food',
        value: -15
    },
    {
        id: 16,
        text: "Wolves scattered provisions",
        effect: 'food',
        value: -20
    },
    {
        id: 17,
        text: "Myles Standish spotted potential threat",
        effect: 'forcedStop',
        value: 1
    },
    {
        id: 18,
        text: "Heavy rains slowed progress",
        effect: 'speedPenalty',
        value: 1,
        duration: 2
    },
    {
        id: 19,
        text: "Wagon wheel broke - repairs needed",
        effect: 'forcedStop',
        value: 1
    },
    {
        id: 20,
        text: "Disease claimed",
        effect: 'disease',
        value: -1
    },
    {
        id: 21,
        text: "Food spoiled in the heat",
        effect: 'food',
        value: -25
    },
    {
        id: 22,
        text: "River crossing delayed the party",
        effect: 'forcedStop',
        value: 1
    },
    {
        id: 23,
        text: "Supplies lost crossing a stream",
        effect: 'food',
        value: -10
    },
    {
        id: 24,
        text: "Richard Warren injured his leg",
        effect: 'speedPenalty',
        value: 1,
        duration: 2
    }
];

/**
 * Select a random event from the pool
 */
function selectRandomEvent() {
    const index = Math.floor(Math.random() * HISTORICAL_EVENTS.length);
    return HISTORICAL_EVENTS[index];
}

/**
 * Apply event effects to state
 * Returns new state with event applied
 */
function applyEventEffect(state, event) {
    const newState = JSON.parse(JSON.stringify(state));

    // Create a copy of event to potentially modify text
    let eventTextOverride = null;

    switch (event.effect) {
        case 'food':
            newState.resources.food = Math.max(0, newState.resources.food + event.value);
            break;

        case 'bonusMiles':
            newState.miles = Math.min(
                newState.settings.destinationMiles,
                newState.miles + event.value
            );
            // Check for victory after bonus miles
            if (newState.miles >= newState.settings.destinationMiles) {
                newState.gameOver = true;
                newState.victory = true;
                newState.gameOverReason = 'You have reached your destination! The pilgrimage is complete!';
            }
            break;

        case 'speedPenalty':
            newState.modifiers.speedPenalty = event.value;
            newState.modifiers.speedPenaltyDays = event.duration;
            // Mark Bradford as ill in roster
            const bradford = newState.roster.find(p => p.name === 'William Bradford');
            if (bradford) {
                bradford.ill = true;
            }
            break;

        case 'forcedStop':
            newState.modifiers.forcedStop = true;
            newState.modifiers.forcedStopDays = event.value;
            newState.traveling = false; // Force stop immediately
            break;

        case 'birth':
            newState.party.survivors += event.value;
            // Mark Elizabeth Hopkins with Oceanus tag permanently
            const elizabeth = newState.roster.find(p => p.name === 'Elizabeth Hopkins');
            if (elizabeth) {
                elizabeth.tag = '+Oceanus';
            }
            // Birth takes time - advance days
            for (let i = 0; i < event.dayCost; i++) {
                newState.day += 1;
                applyDailyConsumption(newState);
            }
            break;

        case 'disease':
            // Kill a passenger with disease
            const victim = getNextVictim(newState);
            if (victim) {
                killPassenger(newState, victim, 'Disease');
                eventTextOverride = `Disease claimed ${victim.name}`;
            }
            break;

        case 'morale':
            // Boost party morale
            newState.party.morale = Math.min(100, newState.party.morale + event.value);
            break;

        case 'none':
            // No mechanical effect - narrative only
            break;
    }

    // Store text override for event display
    newState._eventTextOverride = eventTextOverride;

    return newState;
}

/**
 * Trigger an event and add it to the log
 */
function triggerEvent(state) {
    const event = selectRandomEvent();
    let newState = applyEventEffect(state, event);

    // Use text override if set (e.g., for disease events with victim name)
    const displayText = newState._eventTextOverride || event.text;
    delete newState._eventTextOverride; // Clean up temporary property

    // Create event log entry
    const logEntry = {
        text: displayText,
        day: newState.day,
        effect: event.effect,
        value: event.value
    };

    // Set current event for display (3 seconds)
    newState.currentEvent = {
        text: displayText,
        effect: event.effect,
        value: event.value,
        timer: 3000
    };

    // Add to event log (keep last 3)
    newState.eventLog = [logEntry, ...newState.eventLog].slice(0, 3);

    return newState;
}

/**
 * Update modifiers at end of day
 * Decrements duration counters and clears expired modifiers
 */
function updateModifiers(state) {
    // Speed penalty countdown
    if (state.modifiers.speedPenaltyDays > 0) {
        state.modifiers.speedPenaltyDays -= 1;
        if (state.modifiers.speedPenaltyDays <= 0) {
            state.modifiers.speedPenalty = 0;
            // Clear illness from Bradford when he recovers
            const bradford = state.roster.find(p => p.name === 'William Bradford');
            if (bradford) {
                bradford.ill = false;
            }
        }
    }

    // Forced stop countdown
    if (state.modifiers.forcedStopDays > 0) {
        state.modifiers.forcedStopDays -= 1;
        if (state.modifiers.forcedStopDays <= 0) {
            state.modifiers.forcedStop = false;
        }
    }
}

// ============================================
// PURE STATE UPDATE FUNCTIONS
// ============================================

/**
 * Advance time by delta milliseconds
 * Returns new state (does not mutate input)
 */
function updateTime(state, deltaMs) {
    if (state.gameOver || state.exited) return state;

    let newState = JSON.parse(JSON.stringify(state));
    const dayProgressIncrement = deltaMs / newState.settings.dayDuration;
    newState.dayProgress += dayProgressIncrement;

    // Update warning flash timer (cycles 0-2000ms)
    newState.warningFlashTimer = (newState.warningFlashTimer + deltaMs) % 2000;

    // Update hunt result timer
    if (newState.huntResultTimer > 0) {
        newState.huntResultTimer -= deltaMs;
        if (newState.huntResultTimer <= 0) {
            newState.huntResult = null;
            newState.huntResultTimer = 0;
            newState.huntAnimTimer = 0;
        }
    }

    // Update hunt animation timer
    if (newState.huntAnimTimer > 0) {
        newState.huntAnimTimer -= deltaMs;
        if (newState.huntAnimTimer <= 0) {
            newState.huntAnimTimer = 0;
        }
    }

    // Update current event timer
    if (newState.currentEvent && newState.currentEvent.timer > 0) {
        newState.currentEvent.timer -= deltaMs;
        if (newState.currentEvent.timer <= 0) {
            newState.currentEvent = null;
        }
    }

    // Check if a new day has started
    while (newState.dayProgress >= 1) {
        newState.dayProgress -= 1;
        newState.day += 1;

        // Check if forced to stop
        if (newState.modifiers.forcedStop) {
            newState.traveling = false;
        }

        // If traveling, add miles (with modifier)
        if (newState.traveling && !newState.modifiers.forcedStop) {
            const effectiveSpeed = Math.max(1, newState.settings.milesPerDay - newState.modifiers.speedPenalty);
            newState.miles += effectiveSpeed;

            // Track days traveled for stats
            newState.stats.daysTraveled += 1;

            // Increment event counter
            newState.eventCounter += 1;

            // Check for random event every day while traveling (40% chance)
            if (newState.eventCounter >= 1) {
                newState.eventCounter = 0;
                if (Math.random() < 0.4) {
                    newState = triggerEvent(newState);
                }
            }

            // Check for victory
            if (newState.miles >= newState.settings.destinationMiles) {
                newState.miles = newState.settings.destinationMiles;
                newState.gameOver = true;
                newState.victory = true;
                newState.gameOverReason = 'You have reached your destination! The pilgrimage is complete!';
            }
        }

        // Update modifiers (decrement counters)
        updateModifiers(newState);

        applyDailyConsumption(newState);
    }

    return newState;
}

/**
 * Apply daily resource consumption (called internally)
 * Mutates the passed state object
 */
function applyDailyConsumption(state) {
    // Update survivor count from roster first
    updateSurvivorCount(state);

    const foodNeeded = state.party.survivors * state.settings.foodPerSurvivor;

    // If not enough food, someone may starve
    if (state.resources.food < foodNeeded && state.resources.food <= foodNeeded / 2) {
        // Critical food shortage - someone dies of starvation
        const victim = getNextVictim(state);
        if (victim) {
            killPassenger(state, victim, 'Starvation');

            // Create starvation event
            state.currentEvent = {
                text: `Starvation took ${victim.name}`,
                effect: 'death',
                value: -1,
                timer: 3000
            };
        }
    }

    const foodConsumed = Math.min(state.resources.food, foodNeeded);
    state.resources.food = Math.max(0, state.resources.food - foodConsumed);

    // Check for total party wipe
    if (state.party.survivors <= 0 && !state.gameOver) {
        state.gameOver = true;
        state.gameOverReason = 'All party members have perished. The trail claims another group.';
    }
}

/**
 * Add resources to state
 */
function addResources(state, resourceType, amount) {
    if (state.gameOver) return state;

    const newState = JSON.parse(JSON.stringify(state));
    if (newState.resources.hasOwnProperty(resourceType)) {
        newState.resources[resourceType] += amount;
    }
    return newState;
}

/**
 * Modify party stats
 */
function modifyParty(state, statType, amount) {
    if (state.gameOver) return state;

    const newState = JSON.parse(JSON.stringify(state));
    if (newState.party.hasOwnProperty(statType)) {
        newState.party[statType] = Math.max(0, newState.party[statType] + amount);

        // Check survivor death
        if (statType === 'survivors' && newState.party.survivors <= 0) {
            newState.gameOver = true;
            newState.gameOverReason = 'All party members have perished.';
        }
    }
    return newState;
}

/**
 * Reset game to initial state
 */
function resetGame() {
    return createInitialState();
}

/**
 * Toggle traveling state
 * Returns new state (does not mutate input)
 */
function toggleTravel(state) {
    if (state.gameOver || state.exited) return state;

    const newState = JSON.parse(JSON.stringify(state));
    newState.traveling = !newState.traveling;
    return newState;
}

/**
 * Attempt to hunt for food
 * Can only hunt when stopped (not traveling)
 * 70% success rate, gains 5-15 food on success
 * Costs 1 day (advances day counter and triggers consumption)
 * Returns new state (does not mutate input)
 */
function hunt(state) {
    if (state.gameOver || state.exited) return state;
    if (state.traveling) return state; // Can't hunt while traveling

    const newState = JSON.parse(JSON.stringify(state));

    // Track hunt attempt
    newState.stats.huntAttempts += 1;

    // Advance day immediately (hunting takes a full day)
    newState.day += 1;
    newState.dayProgress = 0;

    // 70% success rate
    const success = Math.random() < 0.7;

    if (success) {
        // Gain 25-45 food (avg 35, net +11 after 24 consumed = sustainable)
        const foodGained = Math.floor(Math.random() * 21) + 25; // 25 to 45 inclusive
        newState.resources.food += foodGained;
        newState.stats.huntSuccesses += 1;
        newState.stats.consecutiveHuntFailures = 0; // Reset failure streak
        newState.huntResult = {
            success: true,
            amount: foodGained,
            message: 'FEAST! Praise the Lord!',
            animationType: 'grow' // Grow animation for success
        };
    } else {
        // Increment failure streak
        newState.stats.consecutiveHuntFailures += 1;
        const streak = newState.stats.consecutiveHuntFailures;

        // Different messages based on streak
        let failMessage;
        if (streak === 1) {
            failMessage = 'You suck at hunting...hunger prevails!';
        } else if (streak === 2) {
            failMessage = 'You REALLY suck at hunting...maybe collect berries, noob!';
        } else {
            failMessage = "You might want to consider getting back on the boat, and heading back to ol' England there chap!";
        }

        newState.huntResult = {
            success: false,
            amount: 0,
            message: failMessage,
            animationType: 'shake', // Shake animation for failure
            shakeIntensity: Math.min(streak, 3) // Shake harder with more failures
        };
    }

    // Set timer to show hunt result for 2.5 seconds (longer for animation)
    newState.huntResultTimer = 2500;
    newState.huntAnimTimer = 500; // Animation lasts 0.5 seconds

    // Apply daily consumption after hunting
    applyDailyConsumption(newState);

    return newState;
}

/**
 * Exit the game
 * Clears localStorage and sets exited state
 * Only works when not in game over state
 */
function exitGame(state) {
    if (state.gameOver) return state;

    deleteSave();

    const newState = JSON.parse(JSON.stringify(state));
    newState.exited = true;
    return newState;
}

// ============================================
// SAVE / LOAD SYSTEM
// ============================================

const SAVE_KEY = 'pilgrim_trail_save';

function saveGame(state) {
    try {
        const saveData = JSON.stringify(state);
        localStorage.setItem(SAVE_KEY, saveData);
        return { success: true, message: 'Game saved!' };
    } catch (e) {
        return { success: false, message: 'Failed to save game.' };
    }
}

function loadGame() {
    try {
        const saveData = localStorage.getItem(SAVE_KEY);
        if (saveData) {
            const loadedState = JSON.parse(saveData);
            // Reset day progress to avoid time glitches
            loadedState.dayProgress = 0;
            return { success: true, state: loadedState, message: 'Game loaded!' };
        }
        return { success: false, state: null, message: 'No save found.' };
    } catch (e) {
        return { success: false, state: null, message: 'Failed to load game.' };
    }
}

function hasSaveData() {
    return localStorage.getItem(SAVE_KEY) !== null;
}

function deleteSave() {
    localStorage.removeItem(SAVE_KEY);
}

// ============================================
// GAME LOOP CONTROLLER
// ============================================

const GameLoop = {
    state: null,
    isRunning: false,
    lastTime: 0,
    logicAccumulator: 0,

    // Fixed timestep for logic (10Hz = 100ms per tick)
    LOGIC_STEP: 100,

    // Notification system for UI feedback
    notification: null,
    notificationTimer: 0,

    init() {
        this.state = createInitialState();
        this.lastTime = performance.now();
        this.logicAccumulator = 0;
        this.isRunning = true;
        this.notification = null;
        this.notificationTimer = 0;

        // Setup keyboard input
        this.setupInput();

        // Start the loop
        requestAnimationFrame((time) => this.loop(time));
    },

    setupInput() {
        document.addEventListener('keydown', (e) => {
            const key = e.key.toUpperCase();

            // Don't process inputs if game was exited
            if (this.state.exited) return;

            if (key === 'S') {
                const result = saveGame(this.state);
                this.showNotification(result.message);
            } else if (key === 'L') {
                const result = loadGame();
                if (result.success) {
                    this.state = result.state;
                }
                this.showNotification(result.message);
            } else if (key === 'R' && this.state.gameOver) {
                this.state = resetGame();
                this.showNotification('Game restarted!');
            } else if (key === 'H' && !this.state.gameOver) {
                // Hunt action - only when stopped
                if (this.state.traveling) {
                    this.showNotification('Cannot hunt while traveling!');
                } else {
                    this.state = hunt(this.state);
                }
            } else if (key === ' ' && !this.state.gameOver) {
                // Toggle travel mode
                e.preventDefault(); // Prevent page scrolling
                this.state = toggleTravel(this.state);
                const status = this.state.traveling ? 'Now traveling...' : 'Stopped.';
                this.showNotification(status);
            } else if (key === 'Q' && !this.state.gameOver) {
                // Quit game
                this.state = exitGame(this.state);
                this.showNotification('Game exited.');
            }
        });
    },

    showNotification(message) {
        this.notification = message;
        this.notificationTimer = 2000; // Show for 2 seconds
    },

    loop(currentTime) {
        if (!this.isRunning) return;

        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update notification timer
        if (this.notificationTimer > 0) {
            this.notificationTimer -= deltaTime;
            if (this.notificationTimer <= 0) {
                this.notification = null;
            }
        }

        // Accumulate time for fixed logic updates
        this.logicAccumulator += deltaTime;

        // Fixed timestep logic updates (10Hz)
        while (this.logicAccumulator >= this.LOGIC_STEP) {
            this.state = updateTime(this.state, this.LOGIC_STEP);
            this.logicAccumulator -= this.LOGIC_STEP;
        }

        // Render at display refresh rate
        if (typeof Renderer !== 'undefined') {
            Renderer.render(this.state, this.notification);
        }

        requestAnimationFrame((time) => this.loop(time));
    },

    stop() {
        this.isRunning = false;
    }
};

// ============================================
// START GAME ON LOAD
// ============================================

window.addEventListener('load', () => {
    if (typeof Renderer !== 'undefined') {
        Renderer.init();
    }
    GameLoop.init();
});
