// Hero state constants
const HeroState = {
    IDLE: 'idle',
    PIVOTING_TO_TANK: 'pivoting_to_tank',
    AT_TANK: 'at_tank',
    PIVOTING_FROM_TANK: 'pivoting_from_tank',
    PIVOTING_TO_SUCK: 'pivoting_to_suck',
    AT_SUCK: 'at_suck',
    SUCKING: 'sucking',           // Actively inhaling (setup frames 4-8)
    BLOW_SETUP: 'blow_setup',     // Transition to blow (setup frames 9-15)
    BLOWING: 'blowing',           // Active blow (cycle frames 13-20)
    SUCK_CYCLE: 'suck_cycle',     // Subsequent inhales (cycle frames 1-12)
    RETURNING_TO_TANK: 'returning_to_tank',  // After blow, go back to tank (not idle)
    RETURNING_TO_IDLE: 'returning_to_idle',  // Only after pop or waiting for Scully
    SCARED: 'scared',
    STARTLED_TO_CALM: 'startled_to_calm'
};

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });

        // Game state
        this.balloonFill = 0;          // 0-100, current balloon inflation
        this.balloonCapacity = 100;    // Max capacity (degrades with yellow/red fills)
        this.lungAir = 0;              // Air stored in lungs after inhale
        this.maxLungAir = 100;         // Max lung capacity

        // Zone thresholds (as % of current capacity)
        this.greenZone = [0, 60];
        this.yellowZone = [61, 85];
        this.redZone = [86, 100];

        // Input state
        this.isInflating = false;
        this.isInhaling = false;
        this.flickStart = null;

        // Balloon replacement state
        this.isWaitingForBalloon = false;

        // Balloon ownership and orientation tracking
        this.balloonHolder = 'none';  // 'none', 'scully', 'hero'
        this.balloonFlipped = false;  // false = opening down (at tank), true = opening up (at suck)

        // Red zone pop tracking
        this.redZoneEntryTime = null;  // When balloon entered red zone

        // Candles
        this.candles = [];

        // Debug config (tunable via panel)
        this.debug = {
            spreadAngleMin: 5,        // Narrowest (laser) in degrees
            spreadAngleMax: 70,       // Widest in degrees
            reachAtMaxSpread: 50,     // Reach when fully wide (pixels)
            reachAtMinSpread: 350,    // Reach when laser (pixels)
            strengthMultiplier: 1.0,  // Lung volume → cone area multiplier
            degradeYellow: 0.10,      // 10% capacity loss
            degradeRed: 0.15,         // 15% capacity loss
            fillSpeed: 0.5,           // Balloon fill per frame
            inhaleSpeed: 1.0,         // Lung fill per frame
            balloonReplaceTime: 2500, // ms delay for Scully to fetch new balloon
            redPopRate: 0.002,        // Base pop probability per frame in red (geometric increase)
        };
    }

    preload() {
        // Helper to load individual frames
        const loadFrames = (prefix, path, count) => {
            for (let i = 1; i <= count; i++) {
                const num = String(i).padStart(2, '0');
                this.load.image(`${prefix}_${num}`, `${path}_${num}.png`);
            }
        };

        // Hero animations (individual frames)
        loadFrames('eric_pivot_to_tank', 'assets/sprites/hero/eric_pivot_to_tank', 20);
        loadFrames('eric_pivot_to_suck', 'assets/sprites/hero/eric_pivot_to_suck', 51);
        loadFrames('eric_scared', 'assets/sprites/hero/eric_scared', 38);
        loadFrames('eric_startled_to_calm', 'assets/sprites/hero/eric_startled_to_calm', 43);
        loadFrames('eric_suck_blow', 'assets/sprites/hero/eric_suck_blow', 18);

        // Single images
        this.load.image('tank', 'assets/sprites/tank/tank.png');
        this.load.image('cake', 'assets/sprites/cake/cake.png');

        // Candles
        this.load.image('candle1', 'assets/sprites/candles/candle1.png');
        this.load.image('candle2', 'assets/sprites/candles/candle2.png');
        this.load.image('candle3', 'assets/sprites/candles/candle3.png');
        this.load.image('candle4', 'assets/sprites/candles/candle4.png');
        this.load.image('candle5', 'assets/sprites/candles/candle5.png');
        this.load.image('candle_flicker1', 'assets/sprites/candles/candle_flicker1.png');
        this.load.image('candle_flicker2', 'assets/sprites/candles/candle_flicker2.png');
        this.load.image('candle_out', 'assets/sprites/candles/candle_out.png');

        // Balloon animations (individual frames)
        loadFrames('balloon_phases', 'assets/sprites/balloon/balloon_phases', 40);
        loadFrames('balloon_pop', 'assets/sprites/balloon/balloon_pop', 4);

        // Scully animations (individual frames)
        loadFrames('scully_run_right', 'assets/sprites/scully/scully_run_right', 10);
        loadFrames('scully_pivot_to_front', 'assets/sprites/scully/scully_pivot_to_front', 8);
        loadFrames('scully_pivot_to_left', 'assets/sprites/scully/scully_pivot_to_left', 7);
        loadFrames('scully_run_left', 'assets/sprites/scully/scully_run_left', 9);

        // UI animations (individual frames)
        loadFrames('sign_lights', 'assets/sprites/ui/sign_lights', 52);

        // Background
        this.load.image('background', 'assets/sprites/backgrounds/thunderdome.png');

        // Sounds
        this.load.audio('music', 'assets/sounds/sexy_boy.mp3');
        this.load.audio('airflow', 'assets/sounds/airflow.mp3');
        this.load.audio('balloon_pop', 'assets/sounds/balloon_pop.mp3');
    }

    create() {
        this.createPlaceholders();
        this.createUI();
        this.createDebugPanel();
        this.setupInput();
        this.createCandles();
        this.updateCandleCount();
        this.setupSounds();
    }

    setupSounds() {
        // Background music - looping
        this.music = this.sound.add('music', { loop: true, volume: 0.5 });

        // Airflow sound - plays while inflating
        this.airflowSound = this.sound.add('airflow', { loop: true, volume: 0.7 });

        // Balloon pop sound
        this.popSound = this.sound.add('balloon_pop', { volume: 1.0 });

        // Start music on first user interaction (browser autoplay policy)
        this.input.once('pointerdown', () => {
            if (!this.music.isPlaying) {
                this.music.play();
            }
        });
    }

    createDebugPanel() {
        // Remove existing panel if present (for scene restart)
        const existingPanel = document.getElementById('debug-panel');
        if (existingPanel) existingPanel.remove();

        // Create HTML-based debug panel
        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.innerHTML = `
            <div class="debug-header" id="debug-toggle">DEBUG</div>
            <div class="debug-content" id="debug-content">
                <div class="debug-row">
                    <label>Spread Min (laser)°</label>
                    <input type="range" min="1" max="30" value="${this.debug.spreadAngleMin}" id="dbg-spreadMin">
                    <span id="dbg-spreadMin-val">${this.debug.spreadAngleMin}</span>
                </div>
                <div class="debug-row">
                    <label>Spread Max (wide)°</label>
                    <input type="range" min="30" max="90" value="${this.debug.spreadAngleMax}" id="dbg-spreadMax">
                    <span id="dbg-spreadMax-val">${this.debug.spreadAngleMax}</span>
                </div>
                <div class="debug-row">
                    <label>Reach @ Wide</label>
                    <input type="range" min="20" max="150" value="${this.debug.reachAtMaxSpread}" id="dbg-reachWide">
                    <span id="dbg-reachWide-val">${this.debug.reachAtMaxSpread}</span>
                </div>
                <div class="debug-row">
                    <label>Reach @ Laser</label>
                    <input type="range" min="100" max="500" value="${this.debug.reachAtMinSpread}" id="dbg-reachLaser">
                    <span id="dbg-reachLaser-val">${this.debug.reachAtMinSpread}</span>
                </div>
                <div class="debug-row">
                    <label>Strength Mult</label>
                    <input type="range" min="0.1" max="3" step="0.1" value="${this.debug.strengthMultiplier}" id="dbg-strength">
                    <span id="dbg-strength-val">${this.debug.strengthMultiplier}</span>
                </div>
                <div class="debug-row">
                    <label>Degrade Yellow %</label>
                    <input type="range" min="0" max="30" value="${this.debug.degradeYellow * 100}" id="dbg-degradeY">
                    <span id="dbg-degradeY-val">${(this.debug.degradeYellow * 100).toFixed(0)}</span>
                </div>
                <div class="debug-row">
                    <label>Degrade Red %</label>
                    <input type="range" min="0" max="50" value="${this.debug.degradeRed * 100}" id="dbg-degradeR">
                    <span id="dbg-degradeR-val">${(this.debug.degradeRed * 100).toFixed(0)}</span>
                </div>
                <div class="debug-row">
                    <label>Fill Speed</label>
                    <input type="range" min="0.1" max="3" step="0.1" value="${this.debug.fillSpeed}" id="dbg-fillSpeed">
                    <span id="dbg-fillSpeed-val">${this.debug.fillSpeed}</span>
                </div>
                <div class="debug-row">
                    <label>Inhale Speed</label>
                    <input type="range" min="0.1" max="3" step="0.1" value="${this.debug.inhaleSpeed}" id="dbg-inhaleSpeed">
                    <span id="dbg-inhaleSpeed-val">${this.debug.inhaleSpeed}</span>
                </div>
                <div class="debug-row">
                    <label>Balloon Replace (ms)</label>
                    <input type="range" min="0" max="5000" step="100" value="${this.debug.balloonReplaceTime}" id="dbg-replaceTime">
                    <span id="dbg-replaceTime-val">${this.debug.balloonReplaceTime}</span>
                </div>
                <div class="debug-row">
                    <label>Red Pop Rate</label>
                    <input type="range" min="0.0005" max="0.01" step="0.0005" value="${this.debug.redPopRate}" id="dbg-popRate">
                    <span id="dbg-popRate-val">${this.debug.redPopRate}</span>
                </div>
                <button id="dbg-reset">Reset Game</button>
                <button id="dbg-anim-test" style="background:#06c;margin-top:5px;">Test Animations</button>
            </div>
        `;
        document.body.appendChild(panel);

        // Toggle collapse/expand
        document.getElementById('debug-toggle').addEventListener('click', () => {
            const content = document.getElementById('debug-content');
            content.classList.toggle('collapsed');
        });

        // Wire up all sliders
        this.wireDebugSlider('dbg-spreadMin', 'spreadAngleMin', 1);
        this.wireDebugSlider('dbg-spreadMax', 'spreadAngleMax', 1);
        this.wireDebugSlider('dbg-reachWide', 'reachAtMaxSpread', 1);
        this.wireDebugSlider('dbg-reachLaser', 'reachAtMinSpread', 1);
        this.wireDebugSlider('dbg-strength', 'strengthMultiplier', 1);
        this.wireDebugSlider('dbg-degradeY', 'degradeYellow', 0.01);
        this.wireDebugSlider('dbg-degradeR', 'degradeRed', 0.01);
        this.wireDebugSlider('dbg-fillSpeed', 'fillSpeed', 1);
        this.wireDebugSlider('dbg-inhaleSpeed', 'inhaleSpeed', 1);
        this.wireDebugSlider('dbg-replaceTime', 'balloonReplaceTime', 1);
        this.wireDebugSlider('dbg-popRate', 'redPopRate', 1);

        // Reset button
        document.getElementById('dbg-reset').addEventListener('click', () => {
            this.scene.restart();
        });

        // Animation test button
        document.getElementById('dbg-anim-test').addEventListener('click', () => {
            this.scene.start('AnimTestScene');
        });
    }

    wireDebugSlider(sliderId, debugKey, multiplier) {
        const slider = document.getElementById(sliderId);
        const valSpan = document.getElementById(sliderId + '-val');
        slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value) * multiplier;
            this.debug[debugKey] = val;
            valSpan.textContent = multiplier === 0.01 ? (val * 100).toFixed(0) : val;
        });
    }

    updateCandleCount() {
        const remaining = this.candles.filter(c => c.lit).length;
        this.candleText.setText(`Candles: ${remaining}`);
    }

    createPlaceholders() {
        const { width, height } = this.scale;

        // Background - centered, allowing overflow on sides
        this.background = this.add.image(width / 2, height / 2, 'background');
        // Scale to fit height, allowing width overflow
        const bgScale = height / this.background.height;
        this.background.setScale(bgScale);

        // Portrait layout: tank on left, hero center-left, cake on right
        // Ground level - move everything up from bottom
        const groundY = height - 150;

        // Tank (left side) - actual sprite
        // Tank sprite is 412x1024, scale down to fit portrait (10% larger)
        const tankScale = 0.25;
        const tankX = 95;  // Moved rightward
        this.tank = this.add.sprite(tankX, groundY, 'tank');
        this.tank.setScale(tankScale);
        this.tank.setOrigin(0.5, 1); // Bottom center origin
        this.tank.setDepth(10);  // Tank is furthest back

        // Create invisible hitbox for tank interaction (covers tank + nozzle area)
        // Use a zone instead of rectangle to avoid rendering issues
        this.tankHitArea = this.add.zone(tankX, groundY - 100, 110, 260);
        this.tankHitArea.setOrigin(0.5, 0.5);

        // Hero (center) - actual sprite
        // Hero sprite is 544x720 per frame, scale to fit portrait screen
        const heroScale = 0.44;
        this.characterX = width * 0.42;
        this.characterY = groundY;

        this.hero = this.add.sprite(this.characterX, this.characterY, 'eric_pivot_to_tank_01');
        this.hero.setScale(heroScale);
        this.hero.setOrigin(0.5, 1); // Bottom center origin
        this.hero.setDepth(20);  // Hero in front of tank and balloon

        // Create all hero animations
        this.createHeroAnimations();

        // Mouth position (for blow trajectory origin) - adjusted for portrait sprite
        this.mouthX = this.characterX + 50;
        this.mouthY = this.characterY - 200;

        // Chest/inhale zone (where you drag balloon to suck in)
        this.chestX = this.characterX + 20;
        this.chestY = this.characterY - 140;
        this.chestZone = this.add.circle(this.chestX, this.chestY, 40, 0x00ff00, 0.0); // Invisible

        // Balloon positions for different hero states
        // Tank position: balloon at Eric's extended hand near tank nozzle
        this.balloonAtTankX = tankX + 35;  // Just right of tank nozzle
        this.balloonAtTankY = groundY - 200;  // At hand height

        // Suck position: balloon at Eric's mouth
        this.balloonAtSuckX = this.characterX + 10;
        this.balloonAtSuckY = this.characterY - 240;  // At mouth height

        // Rest position (when idle - hidden or at default spot)
        this.balloonRestX = this.characterX + 35;
        this.balloonRestY = this.characterY - 180;

        // Create balloon sprite (starts hidden - Scully delivers it)
        this.balloon = this.add.sprite(this.balloonAtTankX, this.balloonAtTankY, 'balloon_phases_01');
        this.balloon.setScale(0.25);  // Scale down balloon sprite
        this.balloon.setOrigin(0.5, 1);  // Origin at nozzle (bottom center)
        this.balloon.setDepth(15);  // Balloon behind hero, in front of tank
        this.balloon.setVisible(false);  // Hidden until Scully delivers or hero inflates
        this.balloonHolder = 'hero';  // Start with hero holding (for now, until Scully entrance is implemented)

        // Balloon has 40 frames: 1-40 maps to fill 0-100%
        this.balloonFrames = {
            total: 40,
            greenEnd: 24,      // Frames 1-24: green zone (0-60%)
            yellowEnd: 34,     // Frames 25-34: yellow zone (61-85%)
            redEnd: 40         // Frames 35-40: red zone (86-100%)
        };

        // Cheeks indicator - hidden for now since hero has actual face
        this.leftCheek = this.add.ellipse(0, 0, 8, 8, 0xFFB6B6, 0);
        this.rightCheek = this.add.ellipse(0, 0, 8, 8, 0xFFB6B6, 0);

        // Cake (right side) - actual sprite
        this.createCakeWithSprite();
    }

    recreateBalloon() {
        // Reset red zone tracking
        this.redZoneEntryTime = null;

        // Create fresh balloon sprite
        if (this.balloon) {
            this.balloon.destroy();
        }
        this.balloon = this.add.sprite(this.balloonAtTankX, this.balloonAtTankY, 'balloon_phases_01');
        this.balloon.setScale(0.25);
        this.balloon.setOrigin(0.5, 1);  // Origin at nozzle (bottom center)
        this.balloon.setDepth(15);  // Balloon behind hero, in front of tank
        this.balloon.setVisible(true);
        this.balloonHolder = 'hero';
        this.balloonFlipped = false;  // Opening down for tank position
        this.updateBalloonVisual();
    }

    createHeroAnimations() {
        // Helper to generate frame array from individual images
        const makeFrames = (prefix, start, end) => {
            const frames = [];
            for (let i = start; i <= end; i++) {
                const num = String(i).padStart(2, '0');
                frames.push({ key: `${prefix}_${num}` });
            }
            return frames;
        };

        // Helper to generate reversed frame array
        const makeFramesReverse = (prefix, start, end) => {
            const frames = [];
            for (let i = end; i >= start; i--) {
                const num = String(i).padStart(2, '0');
                frames.push({ key: `${prefix}_${num}` });
            }
            return frames;
        };

        // === IDLE & TANK ANIMATIONS ===

        // Idle - first frame of pivot_to_tank
        this.anims.create({
            key: 'anim_idle',
            frames: [{ key: 'eric_pivot_to_tank_01' }],
            frameRate: 1,
            repeat: 0
        });

        // Pivot to tank (20 frames)
        this.anims.create({
            key: 'anim_pivot_to_tank',
            frames: makeFrames('eric_pivot_to_tank', 1, 20),
            frameRate: 24,
            repeat: 0
        });

        // At tank - hold last frame while inflating
        this.anims.create({
            key: 'anim_at_tank',
            frames: [{ key: 'eric_pivot_to_tank_20' }],
            frameRate: 1,
            repeat: 0
        });

        // Pivot from tank back to idle (reverse)
        this.anims.create({
            key: 'anim_pivot_from_tank',
            frames: makeFramesReverse('eric_pivot_to_tank', 1, 20),
            frameRate: 24,
            repeat: 0
        });

        // === PIVOT TO SUCK POSITION ===

        // Pivot to suck position (51 frames)
        this.anims.create({
            key: 'anim_pivot_to_suck',
            frames: makeFrames('eric_pivot_to_suck', 1, 51),
            frameRate: 30,
            repeat: 0
        });

        // At suck position - hold last frame
        this.anims.create({
            key: 'anim_at_suck',
            frames: [{ key: 'eric_pivot_to_suck_51' }],
            frameRate: 1,
            repeat: 0
        });

        // === SUCK/BLOW ANIMATIONS ===
        // eric_suck_blow has 18 frames total
        // Frames 1-5: suck setup, 6-9: suck hold area, 10-18: blow

        // Suck setup - frames 1-5
        this.anims.create({
            key: 'anim_suck_setup',
            frames: makeFrames('eric_suck_blow', 1, 5),
            frameRate: 24,
            repeat: 0
        });

        // Hold at suck position (frame 5)
        this.anims.create({
            key: 'anim_suck_hold',
            frames: [{ key: 'eric_suck_blow_05' }],
            frameRate: 1,
            repeat: 0
        });

        // Blow setup - frames 6-9 (transition from suck to blow)
        this.anims.create({
            key: 'anim_blow_setup',
            frames: makeFrames('eric_suck_blow', 6, 9),
            frameRate: 24,
            repeat: 0
        });

        // Suck cycle - frames 1-9 (for subsequent inhales)
        this.anims.create({
            key: 'anim_suck_cycle',
            frames: makeFrames('eric_suck_blow', 1, 9),
            frameRate: 24,
            repeat: 0
        });

        // Hold at suck cycle position (frame 9)
        this.anims.create({
            key: 'anim_suck_cycle_hold',
            frames: [{ key: 'eric_suck_blow_09' }],
            frameRate: 1,
            repeat: 0
        });

        // Blow - frames 10-18 (the actual blow animation)
        this.anims.create({
            key: 'anim_blow',
            frames: makeFrames('eric_suck_blow', 10, 18),
            frameRate: 24,
            repeat: 0
        });

        // === RETURN TO TANK (after blow - hand back on nozzle) ===
        // Use pivot_to_suck in reverse (suck position → tank position)
        this.anims.create({
            key: 'anim_return_to_tank',
            frames: makeFramesReverse('eric_pivot_to_suck', 1, 51),
            frameRate: 30,
            repeat: 0
        });

        // === RETURN TO IDLE (only after pop or waiting for Scully) ===
        // Use pivot_to_tank in reverse (tank → idle)
        this.anims.create({
            key: 'anim_return_to_idle',
            frames: makeFramesReverse('eric_pivot_to_tank', 1, 20),
            frameRate: 24,
            repeat: 0
        });

        // === SCARED/STARTLED ===

        // Scared (38 frames) - when balloon pops
        this.anims.create({
            key: 'anim_scared',
            frames: makeFrames('eric_scared', 1, 38),
            frameRate: 24,
            repeat: 0
        });

        // Startled to calm (43 frames) - recovery after scare
        this.anims.create({
            key: 'anim_startled_to_calm',
            frames: makeFrames('eric_startled_to_calm', 1, 43),
            frameRate: 24,
            repeat: 0
        });

        // Track hero state for animation logic
        this.heroState = HeroState.IDLE;

        // Track if first suck/blow cycle (uses setup) vs subsequent (uses cycle)
        this.isFirstSuckBlowCycle = true;

        // Track if we've entered the suck/blow phase (for proper texture selection)
        this.inSuckBlowPhase = false;
    }

    /**
     * Central state transition handler - ensures proper texture/animation sequencing
     */
    transitionTo(newState) {
        const prevState = this.heroState;
        this.heroState = newState;

        // Clear any pending animation callbacks
        this.hero.off('animationcomplete');

        switch (newState) {
            case HeroState.IDLE:
                this.hero.setTexture('eric_pivot_to_tank_01');
                this.hero.play('anim_idle');
                this.isFirstSuckBlowCycle = true; // Reset for next cycle
                this.inSuckBlowPhase = false; // Reset phase tracking
                break;

            case HeroState.PIVOTING_TO_TANK:
                this.hero.setTexture('eric_pivot_to_tank_01');
                this.hero.play('anim_pivot_to_tank');
                // Show balloon at tank position as hero pivots toward it
                if (this.balloon) {
                    this.balloon.setPosition(this.balloonAtTankX, this.balloonAtTankY);
                    this.balloon.setFlipY(false);  // Opening down for tank
                    this.balloon.setVisible(true);
                    this.balloonFlipped = false;
                }
                this.hero.once('animationcomplete', () => {
                    this.transitionTo(HeroState.AT_TANK);
                });
                break;

            case HeroState.AT_TANK:
                this.hero.setTexture('eric_pivot_to_tank_20');
                // No animation - just hold last frame
                // Start airflow sound when at tank and inflating
                if (this.isInflating && this.airflowSound && !this.airflowSound.isPlaying) {
                    this.airflowSound.play();
                }
                // Show balloon at tank position
                if (this.balloon) {
                    this.balloon.setVisible(true);
                    this.balloon.setFlipY(false);  // Opening down for tank
                    this.balloon.setPosition(this.balloonAtTankX, this.balloonAtTankY);
                }
                break;

            case HeroState.PIVOTING_FROM_TANK:
                this.hero.setTexture('eric_pivot_to_tank_20');
                this.hero.play('anim_pivot_from_tank');
                this.hero.once('animationcomplete', () => {
                    this.transitionTo(HeroState.IDLE);
                });
                break;

            case HeroState.PIVOTING_TO_SUCK:
                this.hero.setTexture('eric_pivot_to_suck_01');
                this.hero.play('anim_pivot_to_suck');
                // Track animation frames to flip balloon when back is to camera
                // pivot_to_suck has 51 frames, flip around frame 25-30
                this.hero.on('animationupdate', (anim, frame) => {
                    if (anim.key === 'anim_pivot_to_suck' && this.balloon) {
                        const frameNum = parseInt(frame.textureKey.split('_').pop());
                        if (frameNum >= 25 && !this.balloonFlipped) {
                            // Flip balloon when hero's back is to camera
                            this.balloon.setFlipY(true);
                            this.balloonFlipped = true;
                            // Move to suck position
                            this.balloon.setPosition(this.balloonAtSuckX, this.balloonAtSuckY);
                        }
                    }
                });
                this.hero.once('animationcomplete', () => {
                    this.hero.off('animationupdate');  // Clean up listener
                    this.transitionTo(HeroState.AT_SUCK);
                });
                break;

            case HeroState.AT_SUCK:
                // Always show rest position - hand to mouth, cheeks NOT puffed
                // Puffed cheeks only appear during SUCKING animation
                this.hero.setTexture('eric_pivot_to_suck_51');
                this.hero.play('anim_at_suck');
                // Position balloon at suck position
                if (this.balloon) {
                    this.balloon.setPosition(this.balloonAtSuckX, this.balloonAtSuckY);
                    this.balloon.setFlipY(true);  // Opening up for sucking
                    this.balloon.setVisible(this.balloonFill > 0);
                    this.balloonFlipped = true;
                }
                break;

            case HeroState.SUCKING:
                this.inSuckBlowPhase = true; // Mark that we've entered suck/blow phase
                if (this.isFirstSuckBlowCycle) {
                    // First time: use suck_blow frames 1-5
                    this.hero.setTexture('eric_suck_blow_01');
                    this.hero.play('anim_suck_setup');
                    this.hero.once('animationcomplete', () => {
                        // Hold at frame 5 while air transfers
                        this.hero.setTexture('eric_suck_blow_05');
                    });
                } else {
                    // Subsequent: use suck_blow frames 1-9
                    this.hero.setTexture('eric_suck_blow_01');
                    this.hero.play('anim_suck_cycle');
                    this.hero.once('animationcomplete', () => {
                        // Hold at frame 9 while air transfers
                        this.hero.setTexture('eric_suck_blow_09');
                    });
                }
                break;

            case HeroState.BLOW_SETUP:
                if (this.isFirstSuckBlowCycle) {
                    // First time: use suck_blow frames 6-9
                    this.hero.setTexture('eric_suck_blow_06');
                    this.hero.play('anim_blow_setup');
                    this.isFirstSuckBlowCycle = false; // Next time use cycle
                } else {
                    // Already in cycle, go straight to blow
                    this.transitionTo(HeroState.BLOWING);
                    return;
                }
                this.hero.once('animationcomplete', () => {
                    this.transitionTo(HeroState.BLOWING);
                });
                break;

            case HeroState.BLOWING:
                this.hero.setTexture('eric_suck_blow_10');
                this.hero.play('anim_blow');

                // Create the gust using stored flick data
                if (this.pendingFlick) {
                    this.createGustFromFlick(this.pendingFlick.end);
                    this.pendingFlick = null;
                }

                this.hero.once('animationcomplete', () => {
                    // After blow, check if more lung air for another cycle
                    if (this.lungAir > 0 && this.balloonFill > 0) {
                        this.transitionTo(HeroState.SUCK_CYCLE);
                    } else if (this.lungAir > 0) {
                        // Has lung air but no balloon air - stay ready to blow
                        this.transitionTo(HeroState.AT_SUCK);
                    } else {
                        // Return to tank position (hand on nozzle), NOT face front
                        this.transitionTo(HeroState.RETURNING_TO_TANK);
                    }
                });
                break;

            case HeroState.SUCK_CYCLE:
                // Return to suck position in cycle
                this.hero.setTexture('eric_suck_blow_01');
                this.hero.play('anim_suck_cycle');
                this.hero.once('animationcomplete', () => {
                    this.transitionTo(HeroState.AT_SUCK);
                });
                break;

            case HeroState.RETURNING_TO_TANK:
                // After blow, return to tank position (hand on nozzle)
                this.hero.setTexture('eric_pivot_to_suck_51');
                this.hero.play('anim_return_to_tank');
                // Track animation frames to flip balloon when back is to camera
                // return_to_tank is reversed pivot_to_suck (51 frames going backward)
                // Flip around frame 25 (going from 51 to 1)
                this.hero.on('animationupdate', (anim, frame) => {
                    if (anim.key === 'anim_return_to_tank' && this.balloon) {
                        const frameNum = parseInt(frame.textureKey.split('_').pop());
                        if (frameNum <= 25 && this.balloonFlipped) {
                            // Flip balloon back when hero's back is to camera
                            this.balloon.setFlipY(false);
                            this.balloonFlipped = false;
                            // Move to tank position
                            this.balloon.setPosition(this.balloonAtTankX, this.balloonAtTankY);
                        }
                    }
                });
                this.hero.once('animationcomplete', () => {
                    this.hero.off('animationupdate');  // Clean up listener
                    this.transitionTo(HeroState.AT_TANK);
                });
                break;

            case HeroState.RETURNING_TO_IDLE:
                // Only used after pop or when waiting for Scully
                this.hero.setTexture('eric_pivot_to_tank_20');
                this.hero.play('anim_return_to_idle');
                this.hero.once('animationcomplete', () => {
                    this.transitionTo(HeroState.IDLE);
                });
                break;

            case HeroState.SCARED:
                this.hero.setTexture('eric_scared_01');
                this.hero.play('anim_scared');
                // Hide balloon (it just popped)
                if (this.balloon) {
                    this.balloon.setVisible(false);
                }
                this.balloonFlipped = false;  // Reset for next balloon
                this.hero.once('animationcomplete', () => {
                    this.transitionTo(HeroState.STARTLED_TO_CALM);
                });
                break;

            case HeroState.STARTLED_TO_CALM:
                this.hero.setTexture('eric_startled_to_calm_01');
                this.hero.play('anim_startled_to_calm');
                this.hero.once('animationcomplete', () => {
                    this.transitionTo(HeroState.IDLE);
                });
                break;
        }
    }

    createCakePlaceholder() {
        const { width, height } = this.scale;
        const cakeX = width - 80;
        const cakeBaseY = height - 100;

        // 12 tiers with slot counts: 20,16,14,12,10,8,6,5,4,3,2,1 = 101
        const tierConfigs = [
            { width: 130, height: 45, slots: 20 },
            { width: 118, height: 40, slots: 16 },
            { width: 106, height: 38, slots: 14 },
            { width: 94, height: 36, slots: 12 },
            { width: 82, height: 34, slots: 10 },
            { width: 70, height: 32, slots: 8 },
            { width: 58, height: 30, slots: 6 },
            { width: 48, height: 28, slots: 5 },
            { width: 38, height: 26, slots: 4 },
            { width: 28, height: 24, slots: 3 },
            { width: 20, height: 22, slots: 2 },
            { width: 12, height: 20, slots: 1 }
        ];

        let currentY = cakeBaseY;
        this.cakeTiers = [];
        this.candleSlots = []; // Store all 101 slot positions

        tierConfigs.forEach((tier, tierIndex) => {
            const tierY = currentY - tier.height / 2;

            // Draw tier
            const tierShape = this.add.rectangle(
                cakeX, tierY,
                tier.width, tier.height,
                0xFFB6C1 // Pink frosting
            );
            tierShape.setStrokeStyle(2, 0xFF69B4);
            this.cakeTiers.push(tierShape);

            // Create candle slots along top edge of this tier
            const slotY = currentY - tier.height; // Top of tier
            const slotSpacing = tier.width / (tier.slots + 1);

            for (let s = 0; s < tier.slots; s++) {
                const slotX = cakeX - tier.width / 2 + slotSpacing * (s + 1);
                this.candleSlots.push({
                    x: slotX,
                    y: slotY,
                    tier: tierIndex,
                    index: s
                });
            }

            currentY -= tier.height;
        });

        // Store cake bounds
        this.cakeBounds = {
            x: cakeX,
            top: currentY,
            bottom: cakeBaseY,
            width: 130
        };
    }

    createCakeWithSprite() {
        const { width, height } = this.scale;

        // Ground level (same as other sprites)
        const groundY = height - 150;

        // Cake sprite is 506x1024, scale to fit portrait layout
        const cakeScale = 0.33;
        const cakeX = width - 90;
        const cakeBaseY = groundY;

        this.cake = this.add.sprite(cakeX, cakeBaseY, 'cake');
        this.cake.setScale(cakeScale);
        this.cake.setOrigin(0.5, 1); // Bottom center origin
        this.cake.setTint(0xaaaaaa); // Darken cake for candle contrast
        this.cake.setDepth(30);  // Cake in front of everything

        // Store cake bounds for candle positioning
        const cakeWidth = 506 * cakeScale;
        const cakeHeight = 1024 * cakeScale;

        this.cakeBounds = {
            x: cakeX,
            top: cakeBaseY - cakeHeight,
            bottom: cakeBaseY,
            width: cakeWidth
        };

        // Generate candle slots along the visible tiers of the cake
        // The cake has multiple tiers getting narrower toward top
        this.candleSlots = [];

        // Tier positions tuned to match the actual cake sprite (from bottom to top)
        // y is distance from bottom of cake to TOP of each tier
        // Elevated by ~2 candle heights (~0.09 of cake height)
        const tierConfigs = [
            { y: 0.19, width: 0.92, slots: 9 },   // Tier 1 (bottom)
            { y: 0.24, width: 0.87, slots: 8 },   // Tier 2
            { y: 0.29, width: 0.82, slots: 8 },   // Tier 3
            { y: 0.34, width: 0.77, slots: 7 },   // Tier 4
            { y: 0.39, width: 0.72, slots: 7 },   // Tier 5
            { y: 0.44, width: 0.67, slots: 6 },   // Tier 6
            { y: 0.49, width: 0.62, slots: 6 },   // Tier 7
            { y: 0.54, width: 0.56, slots: 5 },   // Tier 8
            { y: 0.59, width: 0.50, slots: 5 },   // Tier 9
            { y: 0.64, width: 0.44, slots: 4 },   // Tier 10
            { y: 0.69, width: 0.38, slots: 4 },   // Tier 11
            { y: 0.74, width: 0.32, slots: 3 },   // Tier 12
            { y: 0.79, width: 0.26, slots: 3 },   // Tier 13
            { y: 0.84, width: 0.21, slots: 2 },   // Tier 14
            { y: 0.89, width: 0.16, slots: 2 },   // Tier 15
            { y: 0.94, width: 0.12, slots: 1 },   // Tier 16
        ];

        tierConfigs.forEach((tier, tierIndex) => {
            const slotY = cakeBaseY - (cakeHeight * tier.y);
            const tierWidth = cakeWidth * tier.width;
            const slotSpacing = tierWidth / (tier.slots + 1);

            for (let s = 0; s < tier.slots; s++) {
                const slotX = cakeX - tierWidth / 2 + slotSpacing * (s + 1);
                this.candleSlots.push({
                    x: slotX,
                    y: slotY,
                    tier: tierIndex,
                    index: s
                });
            }
        });
    }

    createCandles(pattern = null) {
        // If no pattern, light all 101 candles
        const activeSlots = pattern || this.candleSlots.map(() => true);

        this.candleSlots.forEach((slot, index) => {
            if (!activeSlots[index]) return; // Skip if slot is "off" in pattern

            const candleX = slot.x;
            const candleY = slot.y;

            // Candle stick (blue) - 25% larger
            const stick = this.add.rectangle(candleX, candleY + 5, 3, 12, 0x4A90D9);

            // Flame (orange/yellow) - 25% larger
            const flame = this.add.ellipse(candleX, candleY - 3, 5, 8, 0xFF9500);
            flame.setStrokeStyle(1, 0xFFCC00);

            this.candles.push({
                stick,
                flame,
                x: candleX,
                y: candleY - 3, // Flame position for hit detection
                lit: true,
                slotIndex: index
            });
        });
    }

    createUI() {
        const { width } = this.scale;

        // Balloon fill meter (top left)
        this.meterX = 80;
        this.meterY = 18;
        this.meterMaxWidth = 100;

        this.add.text(10, 10, 'Balloon:', { fontSize: '14px', color: '#333' });
        this.balloonMeterBg = this.add.rectangle(this.meterX, this.meterY, this.meterMaxWidth, 16, 0x333333);
        this.balloonMeterBg.setOrigin(0, 0.5);
        this.balloonMeterFill = this.add.rectangle(this.meterX, this.meterY, 0, 14, 0x7ED321);
        this.balloonMeterFill.setOrigin(0, 0.5);

        // Zone indicators on meter (stored so we can move them)
        this.yellowZoneLine = this.add.rectangle(this.meterX + 60, this.meterY, 2, 16, 0xFFFF00, 0.9);
        this.redZoneLine = this.add.rectangle(this.meterX + 85, this.meterY, 2, 16, 0xFF0000, 0.9);

        // Lung air meter (below balloon meter)
        this.add.text(10, 35, 'Lungs:', { fontSize: '14px', color: '#333' });
        this.lungMeterBg = this.add.rectangle(80, 43, 100, 16, 0x333333);
        this.lungMeterBg.setOrigin(0, 0.5);
        this.lungMeterFill = this.add.rectangle(80, 43, 0, 14, 0x87CEEB);
        this.lungMeterFill.setOrigin(0, 0.5);

        // Candles remaining (will be updated after createCandles)
        this.candleText = this.add.text(width - 10, 10, 'Candles: --', {
            fontSize: '14px',
            color: '#333'
        }).setOrigin(1, 0);

        // Instructions
        this.instructionText = this.add.text(width / 2, 80,
            'Hold TANK to inflate\nDrag to MOUTH to inhale\nFlick RIGHT to blow', {
            fontSize: '12px',
            color: '#666',
            align: 'center'
        }).setOrigin(0.5);
    }

    setupInput() {
        // Track pointer for all gestures
        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointermove', this.onPointerMove, this);
        this.input.on('pointerup', this.onPointerUp, this);
    }

    onPointerDown(pointer) {
        const tankBounds = this.tankHitArea.getBounds();

        // Check if touching tank area - start inflating
        if (Phaser.Geom.Rectangle.Contains(tankBounds, pointer.x, pointer.y)) {
            // Can only go to tank from idle state
            if (this.heroState === HeroState.IDLE) {
                this.isInflating = true;
                this.flickStart = null;
                this.transitionTo(HeroState.PIVOTING_TO_TANK);
            } else if (this.heroState === HeroState.AT_TANK) {
                // Already at tank, just start inflating
                this.isInflating = true;
                this.flickStart = null;
                // Start airflow sound
                if (this.airflowSound && !this.airflowSound.isPlaying) {
                    this.airflowSound.play();
                }
            }
        } else {
            // Store start position for potential flick
            this.flickStart = { x: pointer.x, y: pointer.y, time: pointer.downTime };
        }
    }

    onPointerMove(pointer) {
        if (!pointer.isDown) return;

        // Check if dragging toward chest (inhale zone)
        const distToChest = Phaser.Math.Distance.Between(
            pointer.x, pointer.y, this.chestX, this.chestY
        );

        // Can start inhaling when hero is at suck position
        if (distToChest < 50 && this.balloonFill > 0 && !this.isInflating &&
            this.heroState === HeroState.AT_SUCK) {
            if (!this.isInhaling) {
                this.isInhaling = true;
                // Trigger the suck animation
                this.transitionTo(HeroState.SUCKING);
            }
        } else if (this.isInflating) {
            // Check if still on tank
            const tankBounds = this.tankHitArea.getBounds();
            if (!Phaser.Geom.Rectangle.Contains(tankBounds, pointer.x, pointer.y)) {
                this.isInflating = false;
            }
        }
    }

    onPointerUp(pointer) {
        // Check for flick gesture (blow)
        if (this.flickStart && !this.isInflating && !this.isInhaling && this.lungAir > 0) {
            const flickEnd = { x: pointer.x, y: pointer.y };
            const dxFromMouth = flickEnd.x - this.mouthX;
            const dyFromMouth = flickEnd.y - this.mouthY;
            const distFromMouth = Math.sqrt(dxFromMouth * dxFromMouth + dyFromMouth * dyFromMouth);

            // Must flick to the right of mouth
            if (dxFromMouth > 20 && distFromMouth > 50) {
                // Store flick data for when blow animation completes
                this.pendingFlick = { end: flickEnd, distance: distFromMouth };
                this.transitionTo(HeroState.BLOW_SETUP);
            }
        }

        // Handle end of inflation
        if (this.isInflating && this.balloonFill > 0) {
            this.applyBalloonDegradation();
        }

        // When done inflating, transition based on balloon state
        if (this.isInflating &&
            (this.heroState === HeroState.AT_TANK || this.heroState === HeroState.PIVOTING_TO_TANK)) {
            if (this.balloonFill > 0) {
                // Has air - pivot to suck position
                this.transitionTo(HeroState.PIVOTING_TO_SUCK);
            } else {
                // No air - return to idle
                this.transitionTo(HeroState.PIVOTING_FROM_TANK);
            }
        }

        // Handle end of inhaling
        if (this.isInhaling) {
            if (this.balloonFill <= 0 && this.lungAir <= 0) {
                // No more air anywhere - return to idle
                this.transitionTo(HeroState.RETURNING_TO_IDLE);
                this.recreateBalloon();
            } else {
                // Still have air - go back to at_suck ready state
                this.transitionTo(HeroState.AT_SUCK);
            }
        }

        this.isInflating = false;
        this.isInhaling = false;
        this.flickStart = null;

        // Stop airflow sound
        if (this.airflowSound && this.airflowSound.isPlaying) {
            this.airflowSound.stop();
        }
    }

    applyBalloonDegradation() {
        const fillPercent = (this.balloonFill / this.balloonCapacity) * 100;

        if (fillPercent > this.redZone[0]) {
            // In red zone
            this.balloonCapacity *= (1 - this.debug.degradeRed);
            this.showDegradationFeedback(`RED! -${(this.debug.degradeRed * 100).toFixed(0)}%`);
            this.updateMeterCapacity();

            // Check for pop (random chance in red)
            if (Math.random() < 0.3) {
                this.popBalloon();
            }
        } else if (fillPercent > this.yellowZone[0]) {
            // In yellow zone
            this.balloonCapacity *= (1 - this.debug.degradeYellow);
            this.showDegradationFeedback(`Yellow -${(this.debug.degradeYellow * 100).toFixed(0)}%`);
            this.updateMeterCapacity();
        }
        // Green zone - no degradation
    }

    showDegradationFeedback(message) {
        // Use balloon position if exists, otherwise use stored rest position
        const x = this.balloon ? this.balloon.x : this.balloonRestX;
        const y = this.balloon ? this.balloon.y : this.balloonRestY;
        const text = this.add.text(x, y - 50, message, {
            fontSize: '12px',
            color: '#ff0000'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: text,
            y: text.y - 30,
            alpha: 0,
            duration: 1000,
            onComplete: () => text.destroy()
        });
    }

    popBalloon() {
        // Play pop sound
        if (this.popSound) {
            this.popSound.play();
        }

        // Store position before destroying (use rest position as fallback)
        const popX = this.balloon ? this.balloon.x : this.balloonRestX;
        const popY = this.balloon ? this.balloon.y : this.balloonRestY;

        // Destroy balloon immediately to avoid any rendering artifacts
        if (this.balloon) {
            this.balloon.destroy();
            this.balloon = null;
        }

        // Visual feedback at stored position
        const popText = this.add.text(popX, popY, 'POP!', {
            fontSize: '24px',
            color: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.balloonFill = 0;
        this.isWaitingForBalloon = true;

        // Play scared animation using state machine
        this.transitionTo(HeroState.SCARED);

        // Fade out pop text
        this.tweens.add({
            targets: popText,
            alpha: 0,
            y: popText.y - 30,
            duration: 500,
            onComplete: () => popText.destroy()
        });

        // Wait for Scully to fetch new balloon
        this.time.delayedCall(this.debug.balloonReplaceTime, () => {
            this.balloonCapacity = 100; // Fresh balloon
            this.balloonFill = 0; // Empty balloon
            this.recreateBalloon();
            this.isWaitingForBalloon = false;
            this.updateMeterCapacity(); // Reset meter to full size
        });
    }

    createGustFromFlick(end) {
        // Trajectory is always from MOUTH to release point
        const dx = end.x - this.mouthX;
        const dy = end.y - this.mouthY;
        const angle = Math.atan2(dy, dx);

        // Distance from mouth to release point determines spread
        const distFromMouth = Math.sqrt(dx * dx + dy * dy);

        // DISTANCE FROM MOUTH determines spread: close = wide, far = narrow/laser
        // Close (<80px) = max spread, Far (>250px) = min spread (laser)
        const flickRatio = Phaser.Math.Clamp((distFromMouth - 80) / 170, 0, 1);
        const spreadAngle = Phaser.Math.Linear(
            this.debug.spreadAngleMax,
            this.debug.spreadAngleMin,
            flickRatio
        );

        // Create gust with geometric cone calculation
        this.createGust(angle, spreadAngle, this.lungAir);

        // One flick = dump ALL lung air
        this.lungAir = 0;
        this.updateCheeks();
        this.updateLungMeter();
    }

    createGust(angle, spreadAngle, lungVolume) {
        // Gust origin (from mouth)
        const gustX = this.mouthX;
        const gustY = this.mouthY;

        // GEOMETRIC CONE CALCULATION
        // Cone area is fixed by lung volume * strength multiplier
        // Area of wedge = 0.5 * r^2 * theta
        // So r = sqrt(2 * Area / theta)
        const coneArea = lungVolume * this.debug.strengthMultiplier;
        const spreadRad = Phaser.Math.DegToRad(spreadAngle);

        // Calculate reach based on spread angle (inverse relationship)
        // Wide spread = short reach, narrow spread = long reach
        const spreadRatio = (spreadAngle - this.debug.spreadAngleMin) /
            (this.debug.spreadAngleMax - this.debug.spreadAngleMin);
        const gustLength = Phaser.Math.Linear(
            this.debug.reachAtMinSpread,  // Laser reach (far)
            this.debug.reachAtMaxSpread,  // Wide reach (short)
            spreadRatio
        );

        const graphics = this.add.graphics();
        graphics.fillStyle(0xADD8E6, 0.4);
        graphics.beginPath();
        graphics.moveTo(gustX, gustY);
        graphics.arc(gustX, gustY, gustLength, angle - spreadRad, angle + spreadRad);
        graphics.closePath();
        graphics.fillPath();

        // Check candle collisions
        this.checkGustCollisions(gustX, gustY, angle, spreadRad, gustLength, coneArea);

        // Fade out gust visual (500ms so you can see what happened)
        this.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: 500,
            onComplete: () => graphics.destroy()
        });
    }

    checkGustCollisions(gustX, gustY, angle, spreadRad, length, power) {
        this.candles.forEach(candle => {
            if (!candle.lit) return;

            // Check if candle is within gust cone
            const dx = candle.x - gustX;
            const dy = candle.y - gustY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > length) return;

            const candleAngle = Math.atan2(dy, dx);
            let angleDiff = Math.abs(candleAngle - angle);
            if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

            if (angleDiff <= spreadRad) {
                // Candle is in the cone - extinguish it
                // TODO: Add power falloff back after testing
                this.extinguishCandle(candle);
            }
        });
    }

    extinguishCandle(candle) {
        candle.lit = false;
        candle.flame.setVisible(false);
        this.updateCandleCount();

        // Check win condition
        const remaining = this.candles.filter(c => c.lit).length;
        if (remaining === 0) {
            this.showWin();
        }
    }

    showWin() {
        const { width, height } = this.scale;
        this.add.text(width / 2, height / 2, 'ALL CANDLES OUT!', {
            fontSize: '32px',
            color: '#00aa00',
            fontStyle: 'bold'
        }).setOrigin(0.5);
    }

    update(time, delta) {
        // Handle continuous inflate (only when hero is at tank touching nozzle)
        if (this.isInflating && !this.isWaitingForBalloon && this.heroState === HeroState.AT_TANK) {
            this.balloonFill = Math.min(this.balloonCapacity, this.balloonFill + this.debug.fillSpeed);
            this.updateBalloonVisual();
            this.updateBalloonMeter();

            // Check if in red zone - geometric pop probability
            const fillPercent = (this.balloonFill / this.balloonCapacity) * 100;
            if (fillPercent > this.redZone[0]) {
                // Track when we entered red zone
                if (!this.redZoneEntryTime) {
                    this.redZoneEntryTime = time;
                }

                // Time in red zone (ms)
                const timeInRed = time - this.redZoneEntryTime;

                // Geometric probability: increases over time
                // P = 1 - (1 - baseRate)^(timeInRed/100)
                // Higher baseRate = pops faster
                const popProbability = 1 - Math.pow(1 - this.debug.redPopRate, timeInRed / 100);

                if (Math.random() < popProbability) {
                    this.popBalloon();
                }
            } else {
                // Exited red zone, reset timer
                this.redZoneEntryTime = null;
            }
        }

        // Handle continuous inhale
        if (this.isInhaling && this.balloonFill > 0 && !this.isWaitingForBalloon) {
            const transfer = Math.min(this.debug.inhaleSpeed, this.balloonFill);
            const spaceInLungs = this.maxLungAir - this.lungAir;
            const actualTransfer = Math.min(transfer, spaceInLungs);

            this.balloonFill -= actualTransfer;
            this.lungAir += actualTransfer;

            this.updateBalloonVisual();
            this.updateBalloonMeter();
            this.updateLungMeter();
            this.updateCheeks();

            // Reset red zone timer if balloon drops below red zone
            const fillPercent = (this.balloonFill / this.balloonCapacity) * 100;
            if (fillPercent <= this.redZone[0]) {
                this.redZoneEntryTime = null;
            }
        }
    }

    updateBalloonVisual() {
        // Skip if balloon doesn't exist (destroyed during inhale or pop)
        if (!this.balloon) return;

        // Map fill level (0-100) to frame number (1-40)
        // Ensure minimum frame 1 when there's any fill, 0 fill = frame 1 (deflated)
        const fillPercent = this.balloonCapacity > 0 ? (this.balloonFill / this.balloonCapacity) * 100 : 0;
        const frameIndex = Math.max(1, Math.min(40, Math.ceil(fillPercent * 0.4)));
        const frameNum = String(frameIndex).padStart(2, '0');
        this.balloon.setTexture(`balloon_phases_${frameNum}`);

        // Position balloon based on hero state
        this.updateBalloonPosition();
    }

    updateBalloonPosition() {
        if (!this.balloon || this.balloonHolder !== 'hero') return;

        // Position based on current hero state
        switch (this.heroState) {
            case HeroState.PIVOTING_TO_TANK:
            case HeroState.AT_TANK:
            case HeroState.RETURNING_TO_TANK:
                // At tank: balloon at hero's extended hand near nozzle
                this.balloon.setPosition(this.balloonAtTankX, this.balloonAtTankY);
                this.balloon.setFlipY(false);  // Opening down (into tank)
                this.balloon.setVisible(true);
                break;

            case HeroState.PIVOTING_TO_SUCK:
                // During pivot: keep balloon visible, flip happens mid-animation
                this.balloon.setVisible(true);
                // Flip when back is to camera (roughly mid-animation)
                // This will be refined with animation progress tracking
                break;

            case HeroState.AT_SUCK:
            case HeroState.SUCKING:
            case HeroState.BLOW_SETUP:
            case HeroState.BLOWING:
            case HeroState.SUCK_CYCLE:
                // At suck position: balloon at hero's mouth
                this.balloon.setPosition(this.balloonAtSuckX, this.balloonAtSuckY);
                this.balloon.setFlipY(true);  // Opening up (into mouth)
                this.balloon.setVisible(this.balloonFill > 0);  // Hide when empty
                break;

            case HeroState.IDLE:
            case HeroState.PIVOTING_FROM_TANK:
            case HeroState.RETURNING_TO_IDLE:
            case HeroState.SCARED:
            case HeroState.STARTLED_TO_CALM:
                // Hide balloon during these states
                this.balloon.setVisible(false);
                break;

            default:
                // Default position
                this.balloon.setPosition(this.balloonRestX, this.balloonRestY);
        }
    }

    updateBalloonMeter() {
        // Fill width relative to current capacity (which fits in current meter width)
        const meterWidth = (this.balloonCapacity / 100) * this.meterMaxWidth;
        const fillWidth = (this.balloonFill / this.balloonCapacity) * meterWidth;
        this.balloonMeterFill.setSize(fillWidth, 14);

        // Color the meter based on zone
        const fillPercent = (this.balloonFill / this.balloonCapacity) * 100;
        if (fillPercent > this.redZone[0]) {
            this.balloonMeterFill.setFillStyle(0xD0021B);
        } else if (fillPercent > this.yellowZone[0]) {
            this.balloonMeterFill.setFillStyle(0xF5A623);
        } else {
            this.balloonMeterFill.setFillStyle(0x7ED321);
        }
    }

    updateMeterCapacity() {
        // Shrink meter background based on current balloon capacity
        const capacityRatio = this.balloonCapacity / 100;
        const newWidth = capacityRatio * this.meterMaxWidth;

        this.balloonMeterBg.setSize(newWidth, 16);

        // Move zone lines leftward proportionally
        const yellowPos = this.meterX + (this.yellowZone[0] / 100) * newWidth;
        const redPos = this.meterX + (this.redZone[0] / 100) * newWidth;

        this.yellowZoneLine.setX(yellowPos);
        this.redZoneLine.setX(redPos);
    }

    updateLungMeter() {
        const fillWidth = (this.lungAir / this.maxLungAir) * 100;
        this.lungMeterFill.setSize(fillWidth, 14);
    }

    updateCheeks() {
        // Show puffed cheeks when air in lungs
        const puff = this.lungAir / this.maxLungAir;
        this.leftCheek.setAlpha(puff * 0.8);
        this.rightCheek.setAlpha(puff * 0.8);
        this.leftCheek.setScale(1 + puff * 0.5);
        this.rightCheek.setScale(1 + puff * 0.5);
    }
}
