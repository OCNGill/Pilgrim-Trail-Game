/**
 * Pilgrim Trail - Core Game Logic
 * Turn-Based Phase System (Morning, Afternoon, Evening)
 * Historical Simulation starting Nov 11, 1620
 */

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const PHASES = {
    MORNING: 0,
    AFTERNOON: 1,
    EVENING: 2
};

const PHASE_NAMES = ['Morning', 'Afternoon', 'Evening'];

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const ACTIONS = {
    TRAVEL: { id: 1, name: 'Travel', phaseCost: 1, type: 'movement' },
    HUNT: { id: 2, name: 'Hunt', phaseCost: 1, type: 'resource' },
    FORAGE: { id: 3, name: 'Forage', phaseCost: 1, type: 'resource' },
    REST: { id: 4, name: 'Rest', phaseCost: 1, type: 'recovery' },
    TRADE: { id: 5, name: 'Trade', phaseCost: 1, type: 'interaction' },
    SERMON: { id: 6, name: 'Sermon', phaseCost: 1, type: 'morale' } // Sunday only
};

// ============================================
// GAME STATE STRUCTURE
// ============================================

const INITIAL_STATE = {
    // Time & Progress
    date: {
        year: 1620,
        month: 10,  // November (0-indexed)
        day: 11,    // 11th
        dayOfWeek: 6 // Saturday (0=Sun, 6=Sat)
    },
    daysElapsed: 0,
    phase: PHASES.MORNING,

    // Location
    miles: 0,
    destinationMiles: 80, // Extended slightly for gameplay buffer

    // Core Resources
    resources: {
        food: 200,    // Starting supply
        medicine: 10
    },

    // Party Stats
    party: {
        survivors: 12, // Starting roster count
        morale: 0,     // Range: -10 to +10
        trust: -3,     // Range: -5 (Hostile) to +5 (Allied)
        health: 100    // General health percentage
    },

    // Flags & Trackers
    flags: {
        christmasCelebrated: false,
        samosetMet: false,
        squantoJoined: false,
        fishingTaught: false,
        starving: false
    },

    stats: {
        huntStreak: 0,
        failStreak: 0
    },

    // Roster (Historical Payload)
    roster: [
        { name: 'William Bradford', alive: true, ill: false, priority: 10 },
        { name: 'Myles Standish', alive: true, ill: false, priority: 9 },
        { name: 'Stephen Hopkins', alive: true, ill: false, priority: 5 },
        { name: 'Priscilla Mullins', alive: true, ill: false, priority: 6 },
        { name: 'Edward Winslow', alive: true, ill: false, priority: 7 },
        { name: 'John Alden', alive: true, ill: false, priority: 4 },
        { name: 'John Howland', alive: true, ill: false, priority: 3 },
        { name: 'Elizabeth Hopkins', alive: true, ill: false, priority: 8 },
        { name: 'William Brewster', alive: true, ill: false, priority: 5 },
        { name: 'Richard Warren', alive: true, ill: false, priority: 2 },
        { name: 'Francis Cooke', alive: true, ill: false, priority: 1 },
        { name: 'John Carver', alive: true, ill: false, priority: 1 }
    ],

    // System State
    currentEvent: null, // { text, type, timer }
    lastActionMessage: "Welcome to Cape Cod. The journey begins.",
    availableActions: Object.values(ACTIONS),
    gameOver: false,
    victory: false,
    gameOverReason: '',
    exited: false
};

// ============================================
// HISTORICAL TIMELINE
// ============================================

const TIMELINE_EVENTS = [
    {
        type: 'mile', value: 20,
        date: { month: 11, day: 6 }, // Dec 6
        title: "First Encounter",
        text: "Arrows fly from the woods! The Nauset attack!",
        options: [
            { text: "Fire warning shots (-1 Trust, Unharmed)", action: (s) => { s.party.trust -= 1; s.lastActionMessage = "You fired muskets. They scattered."; } },
            { text: "Hold fire & Retreat (+1 Trust, May take hit)", action: (s) => { s.party.trust += 1; if (Math.random() < 0.3) killRandom(s, 'Arrow Wound'); s.lastActionMessage = "You retreated peacefully."; } }
        ]
    },
    {
        type: 'mile', value: 40,
        date: { month: 11, day: 11 }, // Dec 11
        title: "Corn Cache",
        text: "You find buried baskets of Indian Corn.",
        options: [
            { text: "Take it all (+50 Food, -2 Trust)", action: (s) => { s.resources.food += 50; s.party.trust -= 2; s.lastActionMessage = "We needed the food."; } },
            { text: "Leave it alone (+1 Trust, -1 Morale)", action: (s) => { s.party.trust += 1; s.party.morale -= 1; s.lastActionMessage = "We shall not steal."; } }
        ]
    },
    {
        type: 'date', month: 11, day: 25, // Dec 25
        title: "Christmas Day",
        text: "It is Christmas. Shall we celebrate?",
        options: [
            { text: "Celebrate! (+1 Morale, -20 Food)", action: (s) => { s.party.morale += 1; s.resources.food -= 20; s.flags.christmasCelebrated = true; s.lastActionMessage = "Merry Christmas!"; } },
            { text: "Forbid it (-1 Morale)", action: (s) => { s.party.morale -= 1; s.lastActionMessage = "Bradford forbids revelry in the streets."; } }
        ]
    },
    {
        type: 'mile', value: 60,
        date: { month: 2, day: 16 }, // Mar 16
        title: "Samoset Arrives",
        text: "A tall native approaches: 'Welcome, Englishmen!'",
        options: [
            { text: "Offer Food (+2 Trust, +2 Morale)", action: (s) => { s.resources.food -= 10; s.party.trust += 2; s.party.morale += 2; s.flags.samosetMet = true; s.lastActionMessage = "He likes the biscuits and beer."; } },
            { text: "Be wary (No change)", action: (s) => { s.lastActionMessage = "He leaves after a brief exchange."; } }
        ]
    },
    {
        type: 'mile', value: 70,
        date: { month: 2, day: 22 }, // Mar 22
        title: "Squanto",
        text: "Squanto offers to teach us local ways.",
        condition: (s) => s.party.trust >= 0,
        options: [
            { text: "Accept Help (+Food/Day)", action: (s) => { s.flags.squantoJoined = true; s.flags.fishingTaught = true; s.lastActionMessage = "Squanto shows us how to fish with eels."; } }
        ]
    }
];

// ============================================
// CORE LOGIC
// ============================================

function createInitialState() {
    return JSON.parse(JSON.stringify(INITIAL_STATE));
}

function getFormattedDate(state) {
    const m = MONTHS[state.date.month];
    return `${m} ${state.date.day}, ${state.date.year}`;
}

/**
 * Advance the calendar by 1 day
 */
function advanceDate(state) {
    state.daysElapsed++;
    state.date.dayOfWeek = (state.date.dayOfWeek + 1) % 7;
    state.date.day++;

    const maxDays = DAYS_IN_MONTH[state.date.month];
    if (state.date.day > maxDays) {
        state.date.day = 1;
        state.date.month++;
        if (state.date.month > 11) {
            state.date.month = 0;
            state.date.year++;
        }
    }

    // Daily Food Consumption
    const foodNeeded = state.party.survivors * 2; // 2 food per person

    // Fishing Bonus
    let foodGain = 0;
    if (state.flags.fishingTaught) foodGain += 15;

    state.resources.food = state.resources.food - foodNeeded + foodGain;

    if (state.resources.food < 0) {
        state.resources.food = 0;
        state.flags.starving = true;
        // Morale hit
        state.party.morale = clamp(state.party.morale - 2, -10, 10);
        // Chance of death
        if (Math.random() < 0.2) {
            killRandom(state, "Starvation");
        }
    } else {
        state.flags.starving = false;
    }

    // Morale Death Spiral Check
    if (state.party.morale < -5) {
        state.lastActionMessage = "Despair sets in...";
        if (Math.random() < 0.1) killRandom(state, "Gave up hope");
    }

    checkHistoricalEvents(state);
}

/**
 * Check for historical events matching date or mile
 */
function checkHistoricalEvents(state) {
    // Simple check - in a full app, we'd handle the options UI
    // For this Turn-Based MVP, we'll auto-resolve loosely or just show text
    // Refinement: Ideally needs a dialog state. For now, we put text in currentEvent.

    const event = TIMELINE_EVENTS.find(e => {
        if (e.type === 'mile' && Math.abs(state.miles - e.value) < 2) return true;
        if (e.type === 'date' && state.date.month === e.month && state.date.day === e.day) return true;
        return false;
    });

    if (event) {
        // Just trigger the first option effect automatically for MVP flow
        // Or set a notification
        state.currentEvent = {
            text: `${event.title}: ${event.text}`,
            timer: 4000
        };
        // Apply effect of first option as default behavior if we don't have modal UI yet
        // In next iteration, we build the Choice UI.
        if (event.options && event.options[0]) {
            event.options[0].action(state);
        }
    }

    // Clear event after some time or input? 
    // For now we assume renderer shows it for a bit or until next action
}

/**
 * Handle Player Action Input
 */
function performAction(state, actionId) {
    if (state.gameOver) return state;

    const newState = JSON.parse(JSON.stringify(state));
    const action = Object.values(ACTIONS).find(a => a.id === actionId);

    if (!action) return state;

    // Validate Sermon (Sunday only)
    if (action.id === ACTIONS.SERMON.id && newState.date.dayOfWeek !== 0) {
        newState.lastActionMessage = "Sermons are held on Sundays.";
        return newState;
    }

    // Execute Logic
    switch (action.id) {
        case ACTIONS.TRAVEL.id:
            handleTravel(newState);
            break;
        case ACTIONS.HUNT.id:
            handleHunt(newState);
            break;
        case ACTIONS.FORAGE.id:
            handleForage(newState);
            break;
        case ACTIONS.REST.id:
            handleRest(newState);
            break;
        case ACTIONS.TRADE.id:
            handleTrade(newState);
            break;
        case ACTIONS.SERMON.id:
            handleSermon(newState);
            break;
    }

    // Advance Phase
    newState.phase++;
    if (newState.phase > PHASES.EVENING) {
        newState.phase = PHASES.MORNING;
        advanceDate(newState);
    }

    return newState;
}

function handleTravel(state) {
    // Success Formula: Base 80% + (Morale * 2)%
    const chance = 80 + (state.party.morale * 2);
    const roll = Math.random() * 100;

    if (state.party.morale < -8) {
        state.lastActionMessage = "Crisis! The party refuses to move.";
        return;
    }

    let miles = 3; // Base speed
    // Morale penalty
    if (state.party.morale < -5) miles = 1;

    if (roll < chance) {
        state.miles += miles;
        state.lastActionMessage = `Traveled ${miles} miles toward Plymouth.`;
        if (state.miles >= state.destinationMiles) {
            state.gameOver = true;
            state.victory = true;
            state.gameOverReason = "You have reached Plymouth Rock! The colony is established.";
        }
    } else {
        state.lastActionMessage = "Slow progress. Wagon stuck in mud.";
    }
}

function handleHunt(state) {
    // Success: Base 40% + (Trust * 5)% + (Morale * 2)%
    const chance = 40 + (state.party.trust * 5) + (state.party.morale * 2);

    if (state.party.morale < -8) {
        state.lastActionMessage = "Too disorganized to hunt.";
        return;
    }

    if (Math.random() * 100 < chance) {
        const amount = 30 + Math.floor(Math.random() * 30);
        state.resources.food += amount;
        state.stats.huntStreak++;
        state.stats.failStreak = 0;

        if (state.stats.huntStreak >= 3) {
            state.party.morale = clamp(state.party.morale + 1, -10, 10);
            state.stats.huntStreak = 0; // Reset to avoid spamming
        }

        state.lastActionMessage = `Hunter's feast! Caught ${amount} food.`;
    } else {
        state.stats.huntStreak = 0;
        state.stats.failStreak++;
        state.lastActionMessage = "The woods are silent. No game found.";

        if (state.stats.failStreak >= 3) {
            state.party.morale = clamp(state.party.morale - 1, -10, 10);
            state.stats.failStreak = 0;
        }
    }
}

function handleForage(state) {
    const amount = 5 + Math.floor(Math.random() * 10);
    state.resources.food += amount;
    state.lastActionMessage = `Found ${amount} berries and nuts.`;
}

function handleRest(state) {
    state.party.morale = clamp(state.party.morale + 1, -10, 10);
    state.lastActionMessage = "Resting raised spirits slightly.";
}

function handleTrade(state) {
    if (state.party.trust < -3) {
        state.lastActionMessage = "Natives hide from us. No trade possible.";
        return;
    }
    // Simple trade logic: -Medicine/Tools (not tracked yet) for Food
    // For now, assume trading labor for corn
    if (Math.random() > 0.5) {
        state.resources.food += 15;
        state.party.trust = clamp(state.party.trust + 1, -5, 5);
        state.lastActionMessage = "Successful trade with locals.";
    } else {
        state.lastActionMessage = "They have nothing to share today.";
    }
}

function handleSermon(state) {
    if (state.party.morale > -5) {
        state.party.morale = clamp(state.party.morale + 1, -10, 10);
        state.lastActionMessage = "A sermon lifts our hearts.";
    } else {
        state.lastActionMessage = "The congregation is too despondent to listen.";
    }
}

// ============================================
// UTILITIES
// ============================================

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

function killRandom(state, cause) {
    const living = state.roster.filter(p => p.alive).sort((a, b) => a.priority - b.priority);
    if (living.length === 0) return;

    const victim = living[0]; // Lowest priority
    victim.alive = false;
    victim.causeOfDeath = cause;
    state.party.survivors--;
    state.party.morale = clamp(state.party.morale - 2, -10, 10);
    state.lastActionMessage = `${victim.name} died of ${cause}.`;

    if (state.party.survivors <= 0) {
        state.gameOver = true;
        state.gameOverReason = "The colony has failed. All are lost.";
    }
}

// ============================================
// SAVE / LOAD SYSTEM
// ============================================
const SAVE_KEY = 'pilgrim_trail_v2';

function saveGame(state) {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
        return { success: true, message: 'Game Saved.' };
    } catch (e) { console.error(e); }
}

function loadGame() {
    try {
        const data = localStorage.getItem(SAVE_KEY);
        if (data) return { success: true, state: JSON.parse(data), message: 'Game Loaded.' };
    } catch (e) { console.error(e); }
    return { success: false };
}

// ============================================
// CONTROLLER
// ============================================

const GameLoop = {
    state: null,

    init() {
        this.state = createInitialState();
        this.bindInput();
        this.render();
    },

    bindInput() {
        document.addEventListener('keydown', (e) => {
            const key = e.key;

            if (this.state.gameOver) {
                if (key.toLowerCase() === 'r') this.init();
                return;
            }

            // map keys 1-6 to actions
            if (['1', '2', '3', '4', '5', '6'].includes(key)) {
                this.state = performAction(this.state, parseInt(key));
                this.render();
            }

            // Advance Phase manually if needed (debug) or if design changes
            if (e.code === 'Space') {
                // Map Space to REST for now
                this.state = performAction(this.state, 4);
                this.render();
            }
        });
    },

    render() {
        // Assume Renderer is global from renderer.js
        if (window.Renderer) {
            window.Renderer.render(this.state);
        }
    }
};

// Start
window.onload = () => {
    try {
        // Initialize Renderer first
        if (window.Renderer) {
            try {
                window.Renderer.init();
            } catch (renderError) {
                console.error("Renderer Init Error:", renderError);
                document.body.innerHTML = `<h1 style="color:red">Renderer Init Error:</h1><p>${renderError.message}</p><pre>${renderError.stack}</pre>`;
                return;
            }
        } else {
            throw new Error("Renderer module not loaded! Check script tags.");
        }

        // Initialize Game Loop
        GameLoop.init();

    } catch (e) {
        console.error("Initialization Error:", e);
        // Display error on screen if canvas fails
        document.body.innerHTML = `<h1 style="color:red">Initialization Error:</h1><p>${e.message}</p><pre>${e.stack}</pre>`;
    }
};
