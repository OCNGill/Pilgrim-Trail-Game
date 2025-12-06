/**
 * Pilgrim Trail - Renderer
 * 8-bit style canvas rendering system
 * Completely separated from game logic
 */

const Renderer = {
    canvas: null,
    ctx: null,

    // Logical resolution (8-bit era style)
    WIDTH: 640,
    HEIGHT: 480,

    // Current scale factor
    scale: 1,

    // 8-bit color palette (16 colors - similar to CGA/EGA era)
    PALETTE: {
        BLACK: '#000000',
        DARK_BLUE: '#1D2B53',
        DARK_PURPLE: '#7E2553',
        DARK_GREEN: '#008751',
        BROWN: '#AB5236',
        DARK_GRAY: '#5F574F',
        LIGHT_GRAY: '#C2C3C7',
        WHITE: '#FFF1E8',
        RED: '#FF004D',
        ORANGE: '#FFA300',
        YELLOW: '#FFEC27',
        GREEN: '#00E436',
        BLUE: '#29ADFF',
        INDIGO: '#83769C',
        PINK: '#FF77A8',
        PEACH: '#FFCCAA'
    },

    // Font settings
    FONT_SIZE: 16,
    FONT_FAMILY: 'monospace',

    /**
     * Initialize the renderer
     */
    init() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }

        this.ctx = this.canvas.getContext('2d');

        // Set logical resolution
        this.canvas.width = this.WIDTH;
        this.canvas.height = this.HEIGHT;

        // Disable image smoothing for crisp pixels
        this.ctx.imageSmoothingEnabled = false;

        // Setup resize handler
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
    },

    /**
     * Handle window resize - scale canvas while maintaining aspect ratio
     */
    handleResize() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        const scaleX = windowWidth / this.WIDTH;
        const scaleY = windowHeight / this.HEIGHT;

        // Use the smaller scale to fit within window
        this.scale = Math.floor(Math.min(scaleX, scaleY));
        this.scale = Math.max(1, this.scale); // Minimum scale of 1

        // Apply CSS scaling
        this.canvas.style.width = (this.WIDTH * this.scale) + 'px';
        this.canvas.style.height = (this.HEIGHT * this.scale) + 'px';
    },

    /**
     * Clear the screen with a color
     */
    clear(color = this.PALETTE.BLACK) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
    },

    /**
     * Draw a filled rectangle
     */
    drawRect(x, y, width, height, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(width), Math.floor(height));
    },

    /**
     * Draw a rectangle outline
     */
    drawRectOutline(x, y, width, height, color, lineWidth = 2) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeRect(Math.floor(x), Math.floor(y), Math.floor(width), Math.floor(height));
    },

    /**
     * Draw text with 8-bit style
     */
    drawText(text, x, y, color = this.PALETTE.WHITE, size = this.FONT_SIZE, align = 'left') {
        this.ctx.fillStyle = color;
        this.ctx.font = `${size}px ${this.FONT_FAMILY}`;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(text, Math.floor(x), Math.floor(y));
    },

    /**
     * Draw text with shadow for better readability
     */
    drawTextShadow(text, x, y, color = this.PALETTE.WHITE, shadowColor = this.PALETTE.BLACK, size = this.FONT_SIZE, align = 'left') {
        // Draw shadow
        this.drawText(text, x + 2, y + 2, shadowColor, size, align);
        // Draw main text
        this.drawText(text, x, y, color, size, align);
    },

    /**
     * Main render function - called by game loop
     */
    render(state, notification) {
        // Clear screen
        this.clear(this.PALETTE.DARK_BLUE);

        // Draw header bar
        this.drawRect(0, 0, this.WIDTH, 40, this.PALETTE.DARK_PURPLE);
        this.drawTextShadow('PILGRIM TRAIL', 20, 10, this.PALETTE.YELLOW, this.PALETTE.BLACK, 20);

        // Draw main status display
        this.renderStatus(state);

        // Draw party roster (replaces event log)
        this.renderPartyRoster(state);

        // Draw journey stats
        this.renderJourneyStats(state);

        // Draw day progress bar
        this.renderDayProgress(state);

        // Draw current event prominently (center of screen)
        if (state.currentEvent) {
            this.renderCurrentEvent(state.currentEvent);
        }

        // Draw exited screen if applicable
        if (state.exited) {
            this.renderExited();
        }
        // Draw game over screen if applicable
        else if (state.gameOver) {
            this.renderGameOver(state);
        }

        // Draw notification if present
        if (notification) {
            this.renderNotification(notification);
        }

        // Draw controls help
        this.renderControls(state);
    },

    /**
     * Render the main status display
     */
    renderStatus(state) {
        const boxX = 40;
        const boxY = 60;
        const boxWidth = 350;
        const boxHeight = 130;

        // Status box background
        this.drawRect(boxX, boxY, boxWidth, boxHeight, this.PALETTE.DARK_GRAY);
        this.drawRectOutline(boxX, boxY, boxWidth, boxHeight, this.PALETTE.LIGHT_GRAY, 3);

        // Status title
        this.drawTextShadow('=== TRAIL STATUS ===', boxX + boxWidth / 2, boxY + 10, this.PALETTE.WHITE, this.PALETTE.BLACK, 14, 'center');

        // Day counter
        this.drawTextShadow(`Day: ${state.day}`, boxX + 15, boxY + 35, this.PALETTE.YELLOW, this.PALETTE.BLACK, 16);

        // Distance display with travel status
        let travelStatus = state.traveling ? 'Traveling' : 'Stopped';
        let travelColor = state.traveling ? this.PALETTE.GREEN : this.PALETTE.ORANGE;

        // Show forced stop status
        if (state.modifiers.forcedStop) {
            travelStatus = 'Halted!';
            travelColor = this.PALETTE.RED;
        }

        const milesText = `Mile ${state.miles} / ${state.settings.destinationMiles}`;
        this.drawTextShadow(milesText, boxX + 130, boxY + 35, this.PALETTE.BLUE, this.PALETTE.BLACK, 16);
        this.drawTextShadow(`[${travelStatus}]`, boxX + 275, boxY + 35, travelColor, this.PALETTE.BLACK, 14);

        // Show speed modifier if active
        if (state.modifiers.speedPenalty > 0) {
            const penaltyText = `Speed -${state.modifiers.speedPenalty} (${state.modifiers.speedPenaltyDays}d)`;
            this.drawTextShadow(penaltyText, boxX + 15, boxY + 55, this.PALETTE.RED, this.PALETTE.BLACK, 12);
        }

        // Party info
        this.drawTextShadow(`Survivors: ${state.party.survivors}`, boxX + 15, boxY + 75, this.PALETTE.GREEN, this.PALETTE.BLACK, 16);

        // Resources with warning
        const foodColor = state.resources.food < 20 ? this.PALETTE.RED : this.PALETTE.PEACH;
        this.drawTextShadow(`Food: ${state.resources.food}`, boxX + 150, boxY + 75, foodColor, this.PALETTE.BLACK, 16);

        // Flashing food warnings
        const showWarning = state.warningFlashTimer < 1000; // Flash every second
        if (state.resources.food < 10 && showWarning) {
            this.drawTextShadow('⚠ STARVING', boxX + 250, boxY + 75, this.PALETTE.RED, this.PALETTE.BLACK, 14);
        } else if (state.resources.food < 20 && state.resources.food >= 10 && showWarning) {
            this.drawTextShadow('⚠ LOW FOOD', boxX + 250, boxY + 75, this.PALETTE.ORANGE, this.PALETTE.BLACK, 14);
        }

        // Hunt result display (below status box) with animations
        if (state.huntResult) {
            const huntY = boxY + boxHeight + 5;
            const huntBoxWidth = 340;
            const huntBoxHeight = 60;
            const huntBoxX = boxX + (boxWidth - huntBoxWidth) / 2;

            // Calculate animation progress (0 to 1, where 0 = start, 1 = end)
            const animProgress = state.huntAnimTimer > 0 ? 1 - (state.huntAnimTimer / 500) : 1;

            if (state.huntResult.success) {
                this.drawRect(huntBoxX, huntY, huntBoxWidth, huntBoxHeight, this.PALETTE.DARK_GREEN);
                this.drawRectOutline(huntBoxX, huntY, huntBoxWidth, huntBoxHeight, this.PALETTE.GREEN, 2);

                // Grow animation for "FEAST!" text
                const baseSize = 12;
                const maxSize = 24;
                const growSize = baseSize + (maxSize - baseSize) * animProgress;

                this.drawTextShadow('FEAST!', huntBoxX + huntBoxWidth / 2, huntY + 12, this.PALETTE.YELLOW, this.PALETTE.BLACK, Math.round(growSize), 'center');
                this.drawTextShadow(`+${state.huntResult.amount} food - Praise the Lord!`, huntBoxX + huntBoxWidth / 2, huntY + 38, this.PALETTE.WHITE, this.PALETTE.BLACK, 11, 'center');
            } else {
                // Shake animation for failure
                const shakeIntensity = state.huntResult.shakeIntensity || 1;
                const shakeOffset = state.huntAnimTimer > 0 ?
                    Math.sin(animProgress * Math.PI * 6) * shakeIntensity * 3 : 0;

                this.drawRect(huntBoxX + shakeOffset, huntY, huntBoxWidth, huntBoxHeight, this.PALETTE.DARK_GRAY);
                this.drawRectOutline(huntBoxX + shakeOffset, huntY, huntBoxWidth, huntBoxHeight, this.PALETTE.RED, 2);

                // Word wrap long messages
                const message = state.huntResult.message || 'Hunt failed.';
                if (message.length > 45) {
                    // Split into two lines
                    const midPoint = message.lastIndexOf(' ', 45);
                    const line1 = message.substring(0, midPoint);
                    const line2 = message.substring(midPoint + 1);
                    this.drawTextShadow(line1, huntBoxX + huntBoxWidth / 2 + shakeOffset, huntY + 14, this.PALETTE.YELLOW, this.PALETTE.BLACK, 11, 'center');
                    this.drawTextShadow(line2, huntBoxX + huntBoxWidth / 2 + shakeOffset, huntY + 32, this.PALETTE.YELLOW, this.PALETTE.BLACK, 11, 'center');
                } else {
                    this.drawTextShadow(message, huntBoxX + huntBoxWidth / 2 + shakeOffset, huntY + 22, this.PALETTE.YELLOW, this.PALETTE.BLACK, 12, 'center');
                }
            }
        }
    },

    /**
     * Render the party roster (Mayflower passengers)
     */
    renderPartyRoster(state) {
        const boxX = 405;
        const boxY = 60;
        const boxWidth = 220;
        const boxHeight = 200;

        // Roster box background
        this.drawRect(boxX, boxY, boxWidth, boxHeight, this.PALETTE.DARK_GRAY);
        this.drawRectOutline(boxX, boxY, boxWidth, boxHeight, this.PALETTE.PEACH, 2);

        // Title
        this.drawTextShadow('MAYFLOWER PASSENGERS', boxX + boxWidth / 2, boxY + 8, this.PALETTE.YELLOW, this.PALETTE.BLACK, 11, 'center');

        // Passenger list
        let entryY = boxY + 26;
        const lineHeight = 14;

        for (let i = 0; i < state.roster.length; i++) {
            const passenger = state.roster[i];

            // Determine display name and color
            let displayName = passenger.name;
            let nameColor = this.PALETTE.WHITE;
            let suffix = '';
            let isStrikethrough = false;

            // Check if dead
            if (!passenger.alive) {
                nameColor = this.PALETTE.DARK_GRAY;
                isStrikethrough = true;
                suffix = ` [${passenger.causeOfDeath || 'DEAD'}]`;
            }
            // Check for illness
            else if (passenger.ill) {
                nameColor = this.PALETTE.RED;
                suffix = ' [ILL]';
            }
            // Check for special tags (like +Oceanus)
            else if (passenger.tag) {
                suffix = ` [${passenger.tag}]`;
                if (passenger.tag === '+Oceanus') {
                    nameColor = this.PALETTE.PINK;
                }
            }

            // Truncate long names
            if (displayName.length > 18) {
                displayName = displayName.substring(0, 15) + '...';
            }

            // Draw passenger name
            this.drawTextShadow(displayName, boxX + 10, entryY, nameColor, this.PALETTE.BLACK, 10);

            // Draw strikethrough line for dead passengers
            if (isStrikethrough) {
                const textWidth = this.ctx.measureText(displayName).width;
                this.ctx.strokeStyle = this.PALETTE.RED;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(boxX + 10, entryY + 6);
                this.ctx.lineTo(boxX + 10 + textWidth, entryY + 6);
                this.ctx.stroke();
            }

            // Draw suffix if any
            if (suffix) {
                const suffixColor = !passenger.alive ? this.PALETTE.RED :
                    passenger.ill ? this.PALETTE.RED : this.PALETTE.PINK;
                this.drawTextShadow(suffix, boxX + 115, entryY, suffixColor, this.PALETTE.BLACK, 8);
            }

            entryY += lineHeight;
        }
    },

    /**
     * Render journey statistics
     */
    renderJourneyStats(state) {
        const boxX = 405;
        const boxY = 270;
        const boxWidth = 220;
        const boxHeight = 85;

        // Stats box background
        this.drawRect(boxX, boxY, boxWidth, boxHeight, this.PALETTE.DARK_PURPLE);
        this.drawRectOutline(boxX, boxY, boxWidth, boxHeight, this.PALETTE.INDIGO, 2);

        // Title
        this.drawTextShadow('JOURNEY STATS', boxX + boxWidth / 2, boxY + 8, this.PALETTE.YELLOW, this.PALETTE.BLACK, 11, 'center');

        // Hunt stats
        const huntText = `Hunt Attempts: ${state.stats.huntAttempts} (${state.stats.huntSuccesses} successful)`;
        this.drawTextShadow(huntText, boxX + 10, boxY + 28, this.PALETTE.PEACH, this.PALETTE.BLACK, 10);

        // Days traveled
        const daysText = `Days Traveled: ${state.stats.daysTraveled}`;
        this.drawTextShadow(daysText, boxX + 10, boxY + 45, this.PALETTE.LIGHT_GRAY, this.PALETTE.BLACK, 10);

        // Average miles per day
        let avgMiles = 0;
        if (state.stats.daysTraveled > 0) {
            avgMiles = (state.miles / state.stats.daysTraveled).toFixed(1);
        }
        const avgText = `Miles per Day: ${avgMiles} avg`;
        this.drawTextShadow(avgText, boxX + 10, boxY + 62, this.PALETTE.BLUE, this.PALETTE.BLACK, 10);
    },

    /**
     * Render current event prominently in center
     */
    renderCurrentEvent(event) {
        const boxWidth = 450;
        const boxHeight = 80;
        const boxX = (this.WIDTH - boxWidth) / 2;
        const boxY = 240;

        // Semi-transparent overlay behind
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(boxX - 20, boxY - 10, boxWidth + 40, boxHeight + 20);

        // Event box
        this.drawRect(boxX, boxY, boxWidth, boxHeight, this.PALETTE.DARK_PURPLE);
        this.drawRectOutline(boxX, boxY, boxWidth, boxHeight, this.PALETTE.YELLOW, 3);

        // Event icon/marker
        this.drawTextShadow('⚓ EVENT ⚓', this.WIDTH / 2, boxY + 12, this.PALETTE.YELLOW, this.PALETTE.BLACK, 14, 'center');

        // Event text
        this.drawTextShadow(event.text, this.WIDTH / 2, boxY + 38, this.PALETTE.WHITE, this.PALETTE.BLACK, 18, 'center');

        // Effect description
        let effectText = this.getEffectDescription(event);
        const effectColor = this.getEffectColor(event);
        this.drawTextShadow(effectText, this.WIDTH / 2, boxY + 60, effectColor, this.PALETTE.BLACK, 14, 'center');
    },

    /**
     * Get human-readable effect description
     */
    getEffectDescription(event) {
        switch (event.effect) {
            case 'food':
                return event.value > 0 ? `+${event.value} Food` : `${event.value} Food`;
            case 'bonusMiles':
                return `+${event.value} Miles`;
            case 'speedPenalty':
                return `Speed reduced for ${event.duration || 3} days`;
            case 'forcedStop':
                return 'Must stop and assess';
            case 'birth':
                return '+1 Survivor (2 days passed)';
            case 'disease':
                return '-1 Survivor';
            case 'death':
                return '-1 Survivor';
            case 'morale':
                return 'Morale boosted!';
            case 'none':
                return 'A harrowing moment...';
            default:
                return '';
        }
    },

    /**
     * Get effect color based on type
     */
    getEffectColor(event) {
        switch (event.effect) {
            case 'food':
                return event.value > 0 ? this.PALETTE.GREEN : this.PALETTE.RED;
            case 'bonusMiles':
                return this.PALETTE.GREEN;
            case 'speedPenalty':
                return this.PALETTE.RED;
            case 'forcedStop':
                return this.PALETTE.ORANGE;
            case 'birth':
                return this.PALETTE.PINK;
            case 'disease':
                return this.PALETTE.RED;
            case 'death':
                return this.PALETTE.RED;
            case 'morale':
                return this.PALETTE.YELLOW;
            case 'none':
                return this.PALETTE.INDIGO;
            default:
                return this.PALETTE.WHITE;
        }
    },

    /**
     * Render day progress bar
     */
    renderDayProgress(state) {
        const barX = 40;
        const barY = 365;
        const barWidth = 350;
        const barHeight = 20;

        // Background
        this.drawRect(barX, barY, barWidth, barHeight, this.PALETTE.DARK_GRAY);
        this.drawRectOutline(barX, barY, barWidth, barHeight, this.PALETTE.LIGHT_GRAY, 2);

        // Progress fill
        const fillWidth = (barWidth - 4) * state.dayProgress;
        this.drawRect(barX + 2, barY + 2, fillWidth, barHeight - 4, this.PALETTE.ORANGE);

        // Label
        this.drawTextShadow('Day Progress', barX, barY - 15, this.PALETTE.WHITE, this.PALETTE.BLACK, 12);
    },

    /**
     * Render game over or victory screen
     */
    renderGameOver(state) {
        // Darkened overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        // Game over box
        const boxWidth = 450;
        const boxHeight = 200;
        const boxX = (this.WIDTH - boxWidth) / 2;
        const boxY = (this.HEIGHT - boxHeight) / 2;

        if (state.victory) {
            // Victory screen
            this.drawRect(boxX, boxY, boxWidth, boxHeight, this.PALETTE.DARK_GREEN);
            this.drawRectOutline(boxX, boxY, boxWidth, boxHeight, this.PALETTE.GREEN, 4);

            this.drawTextShadow('VICTORY!', this.WIDTH / 2, boxY + 30, this.PALETTE.YELLOW, this.PALETTE.BLACK, 36, 'center');
            this.drawTextShadow('You have completed the pilgrimage!', this.WIDTH / 2, boxY + 80, this.PALETTE.WHITE, this.PALETTE.BLACK, 18, 'center');
            this.drawTextShadow(`Journey completed in ${state.day} days`, this.WIDTH / 2, boxY + 110, this.PALETTE.PEACH, this.PALETTE.BLACK, 16, 'center');
            this.drawTextShadow('Press [R] to restart', this.WIDTH / 2, boxY + 155, this.PALETTE.YELLOW, this.PALETTE.BLACK, 16, 'center');
        } else {
            // Game over screen
            this.drawRect(boxX, boxY, boxWidth, boxHeight, this.PALETTE.DARK_PURPLE);
            this.drawRectOutline(boxX, boxY, boxWidth, boxHeight, this.PALETTE.RED, 4);

            this.drawTextShadow('GAME OVER', this.WIDTH / 2, boxY + 30, this.PALETTE.RED, this.PALETTE.BLACK, 32, 'center');
            this.drawTextShadow(state.gameOverReason || 'Your journey has ended.', this.WIDTH / 2, boxY + 80, this.PALETTE.WHITE, this.PALETTE.BLACK, 14, 'center');
            this.drawTextShadow(`You survived ${state.day} days and traveled ${state.miles} miles`, this.WIDTH / 2, boxY + 110, this.PALETTE.PEACH, this.PALETTE.BLACK, 14, 'center');
            this.drawTextShadow('Press [R] to restart', this.WIDTH / 2, boxY + 155, this.PALETTE.YELLOW, this.PALETTE.BLACK, 16, 'center');
        }
    },

    /**
     * Render notification message
     */
    renderNotification(message) {
        const boxWidth = 300;
        const boxHeight = 40;
        const boxX = (this.WIDTH - boxWidth) / 2;
        const boxY = this.HEIGHT - 80;

        this.drawRect(boxX, boxY, boxWidth, boxHeight, this.PALETTE.DARK_GREEN);
        this.drawRectOutline(boxX, boxY, boxWidth, boxHeight, this.PALETTE.GREEN, 2);
        this.drawTextShadow(message, this.WIDTH / 2, boxY + 10, this.PALETTE.WHITE, this.PALETTE.BLACK, 16, 'center');
    },

    /**
     * Render controls help
     */
    renderControls(state) {
        const y = this.HEIGHT - 25;
        let controlsText;

        if (state.exited) {
            controlsText = 'Game Exited - Refresh to restart';
        } else if (state.gameOver) {
            controlsText = '[S] Save  [L] Load  [R] Restart';
        } else if (state.traveling) {
            controlsText = '[SPACE] Stop  [S] Save  [L] Load  [Q] Quit';
        } else {
            controlsText = '[SPACE] Travel  [H] Hunt  [S] Save  [L] Load  [Q] Quit';
        }

        this.drawTextShadow(controlsText, this.WIDTH / 2, y, this.PALETTE.INDIGO, this.PALETTE.BLACK, 12, 'center');
    },

    /**
     * Render exited screen
     */
    renderExited() {
        // Darkened overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        this.drawTextShadow('Game Exited', this.WIDTH / 2, this.HEIGHT / 2 - 20, this.PALETTE.LIGHT_GRAY, this.PALETTE.BLACK, 32, 'center');
        this.drawTextShadow('Save data cleared. Refresh to start new game.', this.WIDTH / 2, this.HEIGHT / 2 + 20, this.PALETTE.INDIGO, this.PALETTE.BLACK, 16, 'center');
    }
};
