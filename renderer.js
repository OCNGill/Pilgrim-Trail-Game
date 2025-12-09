/**
 * Pilgrim Trail - Renderer
 * 8-bit style canvas rendering system
 * Updated for Turn-Based Phase System
 */

const Renderer = {
    canvas: null,
    ctx: null,

    WIDTH: 640,
    HEIGHT: 480,
    scale: 1,

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

    FONT_SIZE: 16,
    FONT_FAMILY: 'monospace',

    init() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.WIDTH;
        this.canvas.height = this.HEIGHT;
        this.ctx.imageSmoothingEnabled = false;

        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
    },

    handleResize() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const scaleX = windowWidth / this.WIDTH;
        const scaleY = windowHeight / this.HEIGHT;
        this.scale = Math.floor(Math.min(scaleX, scaleY));
        this.scale = Math.max(1, this.scale);
        this.canvas.style.width = (this.WIDTH * this.scale) + 'px';
        this.canvas.style.height = (this.HEIGHT * this.scale) + 'px';
    },

    clear(color = this.PALETTE.BLACK) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
    },

    drawRect(x, y, width, height, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(width), Math.floor(height));
    },

    drawRectOutline(x, y, width, height, color, lineWidth = 2) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeRect(Math.floor(x), Math.floor(y), Math.floor(width), Math.floor(height));
    },

    drawText(text, x, y, color = this.PALETTE.WHITE, size = this.FONT_SIZE, align = 'left') {
        this.ctx.fillStyle = color;
        this.ctx.font = `${size}px ${this.FONT_FAMILY}`;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(text, Math.floor(x), Math.floor(y));
    },

    drawTextShadow(text, x, y, color = this.PALETTE.WHITE, shadowColor = this.PALETTE.BLACK, size = this.FONT_SIZE, align = 'left') {
        this.drawText(text, x + 2, y + 2, shadowColor, size, align);
        this.drawText(text, x, y, color, size, align);
    },

    getSkyColor(phase) {
        switch (phase) {
            case 0: return this.PALETTE.BLUE; // Morning
            case 1: return '#4D8AB5'; // Afternoon
            case 2: return '#3E2F5B'; // Evening
            default: return this.PALETTE.DARK_BLUE;
        }
    },

    render(state) {
        const skyColor = this.getSkyColor(state.phase);
        this.clear(skyColor);

        // Header
        this.drawRect(0, 0, this.WIDTH, 50, this.PALETTE.DARK_PURPLE);

        // Date Display
        const dateStr = `${MONTHS[state.date.month]} ${state.date.day}, ${state.date.year}`;
        this.drawTextShadow(dateStr, 20, 15, this.PALETTE.YELLOW, this.PALETTE.BLACK, 20);

        // Phase Display
        const phaseName = PHASE_NAMES[state.phase];
        this.drawTextShadow(phaseName, this.WIDTH - 20, 15, this.PALETTE.PEACH, this.PALETTE.BLACK, 20, 'right');

        this.renderStatus(state);
        this.renderParty(state);
        this.renderActionMenu(state);

        // Event Overlay
        if (state.currentEvent) {
            this.renderEvent(state.currentEvent);
        }

        // Game Over
        if (state.gameOver) {
            this.renderGameOver(state);
        }
    },

    renderStatus(state) {
        const boxX = 20;
        const boxY = 70;
        const width = 300;
        const height = 150;

        this.drawRect(boxX, boxY, width, height, this.PALETTE.DARK_GRAY);
        this.drawRectOutline(boxX, boxY, width, height, this.PALETTE.LIGHT_GRAY, 2);

        let y = boxY + 15;
        this.drawTextShadow(`Location: Mile ${state.miles} / ${state.destinationMiles}`, boxX + 15, y, this.PALETTE.WHITE);
        y += 25;
        this.drawTextShadow(`Food: ${state.resources.food}`, boxX + 15, y, state.resources.food < 50 ? this.PALETTE.RED : this.PALETTE.GREEN);
        y += 25;

        // Morale Bar
        this.drawTextShadow(`Morale: ${state.party.morale}`, boxX + 15, y, this.PALETTE.YELLOW);
        this.drawRect(boxX + 100, y + 4, 150, 10, this.PALETTE.BLACK); // Bar bg
        const moralePct = (state.party.morale + 10) / 20; // Normalize -10..10 to 0..1
        this.drawRect(boxX + 100, y + 4, 150 * moralePct, 10, this.PALETTE.ORANGE);
        y += 25;

        // Trust Bar
        this.drawTextShadow(`Trust: ${state.party.trust}`, boxX + 15, y, this.PALETTE.PINK);
        this.drawRect(boxX + 100, y + 4, 150, 10, this.PALETTE.BLACK);
        const trustPct = (state.party.trust + 5) / 10; // Normalize -5..5 to 0..1
        this.drawRect(boxX + 100, y + 4, 150 * trustPct, 10, this.PALETTE.INDIGO);
    },

    renderParty(state) {
        const boxX = 340;
        const boxY = 70;
        const width = 280;
        const height = 300;

        this.drawRect(boxX, boxY, width, height, this.PALETTE.DARK_GRAY);
        this.drawRectOutline(boxX, boxY, width, height, this.PALETTE.BROWN, 2);

        this.drawTextShadow("Mayflower Party", boxX + width / 2, boxY + 10, this.PALETTE.ORANGE, this.PALETTE.BLACK, 16, 'center');

        let y = boxY + 40;
        state.roster.forEach(p => {
            const color = p.alive ? (p.ill ? this.PALETTE.RED : this.PALETTE.WHITE) : this.PALETTE.DARK_GRAY;
            const text = p.alive ? p.name : `${p.name} (RIP)`;
            this.drawTextShadow(text, boxX + 20, y, color, this.PALETTE.BLACK, 12);
            y += 18;
        });
    },

    renderActionMenu(state) {
        const boxX = 20;
        const boxY = 240;
        const width = 300;
        const height = 220;

        this.drawRect(boxX, boxY, width, height, this.PALETTE.DARK_BLUE);
        this.drawRectOutline(boxX, boxY, width, height, this.PALETTE.BLUE, 2);

        // Feedback Message
        if (state.lastActionMessage) {
            this.drawTextShadow(state.lastActionMessage, boxX + 10, boxY + 10, this.PALETTE.YELLOW, this.PALETTE.BLACK, 12);
        }

        const actionsY = boxY + 50;
        this.drawTextShadow("ACTIONS (Press Number):", boxX + 10, actionsY, this.PALETTE.PEACH);

        state.availableActions.forEach(action => {
            if (action.id === 6 && state.date.dayOfWeek !== 0) return; // Hide Sermon if not Sunday

            const y = actionsY + 25 + (action.id * 20);
            this.drawTextShadow(`[${action.id}] ${action.name}`, boxX + 20, y, this.PALETTE.WHITE);
        });

        this.drawTextShadow("[SPACE] Rest/Pass", boxX + 20, height + boxY - 30, this.PALETTE.DARK_GRAY, this.PALETTE.BLACK, 12);
    },

    renderEvent(event) {
        const boxWidth = 400;
        const boxHeight = 100;
        const x = (this.WIDTH - boxWidth) / 2;
        const y = (this.HEIGHT - boxHeight) / 2;

        this.drawRect(x, y, boxWidth, boxHeight, this.PALETTE.DARK_PURPLE);
        this.drawRectOutline(x, y, boxWidth, boxHeight, this.PALETTE.YELLOW, 3);

        this.drawTextShadow("EVENT!", this.WIDTH / 2, y + 10, this.PALETTE.YELLOW, this.PALETTE.BLACK, 20, 'center');
        this.drawTextShadow(event.text, this.WIDTH / 2, y + 40, this.PALETTE.WHITE, this.PALETTE.BLACK, 14, 'center');
    },

    renderGameOver(state) {
        this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
        this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        const color = state.victory ? this.PALETTE.GREEN : this.PALETTE.RED;
        const title = state.victory ? "VICTORY" : "GAME OVER";

        this.drawTextShadow(title, this.WIDTH / 2, 150, color, this.PALETTE.BLACK, 40, 'center');
        this.drawTextShadow(state.gameOverReason, this.WIDTH / 2, 220, this.PALETTE.WHITE, this.PALETTE.BLACK, 16, 'center');
        this.drawTextShadow("Press [R] to Restart", this.WIDTH / 2, 300, this.PALETTE.YELLOW, this.PALETTE.BLACK, 20, 'center');
    }
};

window.Renderer = Renderer;
