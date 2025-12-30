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

        // Degradation rates
        this.yellowDegradation = 0.10;  // 10%
        this.redDegradation = 0.15;     // 15%

        // Input state
        this.isInflating = false;
        this.isInhaling = false;
        this.flickStart = null;

        // Candles
        this.candles = [];
    }

    create() {
        this.createPlaceholders();
        this.createUI();
        this.setupInput();
        this.createCandles(); // All 101 slots lit (pass pattern array to customize)
        this.updateCandleCount();
    }

    updateCandleCount() {
        const remaining = this.candles.filter(c => c.lit).length;
        this.candleText.setText(`Candles: ${remaining}`);
    }

    createPlaceholders() {
        const { width, height } = this.scale;

        // Tank (left side, bottom) - Royal blue rectangle
        this.tank = this.add.rectangle(60, height - 200, 60, 150, 0x0066CC);
        this.tank.setStrokeStyle(3, 0x004499);
        this.tankNozzle = this.add.rectangle(60, height - 290, 20, 30, 0x888888);

        // Tank label
        this.add.text(60, height - 200, 'TANK', {
            fontSize: '12px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Character (center-left) - Simple body shape
        this.characterX = 130;
        this.characterY = height - 180;

        // Body (black sweater)
        this.characterBody = this.add.rectangle(
            this.characterX, this.characterY,
            50, 80, 0x222222
        );
        // Head
        this.characterHead = this.add.circle(
            this.characterX, this.characterY - 60,
            25, 0xFFDBAC
        );
        // Cap (grey)
        this.characterCap = this.add.ellipse(
            this.characterX, this.characterY - 75,
            40, 15, 0x666666
        );

        // Mouth position (for blow trajectory origin)
        this.mouthX = this.characterX + 25;
        this.mouthY = this.characterY - 50;

        // Chest/inhale zone (where you drag balloon to suck in)
        this.chestX = this.characterX;
        this.chestY = this.characterY - 20;
        this.chestZone = this.add.circle(this.chestX, this.chestY, 30, 0x00ff00, 0.0); // Invisible

        // Balloon (centered over hero at chest level) - Lime green
        this.balloonRestX = this.characterX;
        this.balloonRestY = this.characterY - 120; // Above head when full
        this.balloon = this.add.ellipse(
            this.balloonRestX, this.balloonRestY,
            10, 15, 0x7ED321
        );
        this.balloon.setStrokeStyle(2, 0x5BA318);

        // Cheeks indicator (puffs when air in lungs)
        this.leftCheek = this.add.ellipse(
            this.characterX - 15, this.characterY - 55,
            8, 8, 0xFFB6B6, 0
        );
        this.rightCheek = this.add.ellipse(
            this.characterX + 15, this.characterY - 55,
            8, 8, 0xFFB6B6, 0
        );

        // Cake (right side) - Multi-tier placeholder
        this.createCakePlaceholder();
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

    createCandles(pattern = null) {
        // If no pattern, light all 101 candles
        const activeSlots = pattern || this.candleSlots.map(() => true);

        this.candleSlots.forEach((slot, index) => {
            if (!activeSlots[index]) return; // Skip if slot is "off" in pattern

            const candleX = slot.x;
            const candleY = slot.y;

            // Candle stick (blue) - smaller to fit more
            const stick = this.add.rectangle(candleX, candleY + 8, 4, 16, 0x4A90D9);

            // Flame (orange/yellow)
            const flame = this.add.ellipse(candleX, candleY - 4, 6, 10, 0xFF9500);
            flame.setStrokeStyle(1, 0xFFCC00);

            this.candles.push({
                stick,
                flame,
                x: candleX,
                y: candleY - 4, // Flame position for hit detection
                lit: true,
                slotIndex: index
            });
        });
    }

    createUI() {
        const { width } = this.scale;

        // Balloon fill meter (top left)
        this.add.text(10, 10, 'Balloon:', { fontSize: '14px', color: '#333' });
        this.balloonMeterBg = this.add.rectangle(80, 18, 100, 16, 0x333333);
        this.balloonMeterBg.setOrigin(0, 0.5);
        this.balloonMeterFill = this.add.rectangle(80, 18, 0, 14, 0x7ED321);
        this.balloonMeterFill.setOrigin(0, 0.5);

        // Zone indicators on meter
        this.add.rectangle(80 + 60, 18, 1, 16, 0xFFFF00, 0.8); // Yellow line
        this.add.rectangle(80 + 85, 18, 1, 16, 0xFF0000, 0.8); // Red line

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
        const tankBounds = this.tank.getBounds();
        const nozzleBounds = this.tankNozzle.getBounds();

        // Check if touching tank/nozzle area - start inflating
        if (Phaser.Geom.Rectangle.Contains(tankBounds, pointer.x, pointer.y) ||
            Phaser.Geom.Rectangle.Contains(nozzleBounds, pointer.x, pointer.y)) {
            this.isInflating = true;
            this.flickStart = null;
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

        if (distToChest < 50 && this.balloonFill > 0 && !this.isInflating) {
            this.isInhaling = true;
            this.isInflating = false;
        } else if (this.isInflating) {
            // Check if still on tank
            const tankBounds = this.tank.getBounds();
            const nozzleBounds = this.tankNozzle.getBounds();
            if (!Phaser.Geom.Rectangle.Contains(tankBounds, pointer.x, pointer.y) &&
                !Phaser.Geom.Rectangle.Contains(nozzleBounds, pointer.x, pointer.y)) {
                this.isInflating = false;
            }
        }
    }

    onPointerUp(pointer) {
        // Check for flick gesture
        if (this.flickStart && !this.isInflating && !this.isInhaling) {
            const flickEnd = { x: pointer.x, y: pointer.y };

            // Check if release is to the right of mouth (valid blow direction)
            const dxFromMouth = flickEnd.x - this.mouthX;
            const dyFromMouth = flickEnd.y - this.mouthY;
            const distFromMouth = Math.sqrt(dxFromMouth * dxFromMouth + dyFromMouth * dyFromMouth);

            // Must release to the right of mouth, with some minimum distance
            if (dxFromMouth > 20 && distFromMouth > 50) {
                this.executeFlick(this.flickStart, flickEnd, distFromMouth);
            }
        }

        // Handle end of inflation - apply degradation
        if (this.isInflating && this.balloonFill > 0) {
            this.applyBalloonDegradation();
        }

        this.isInflating = false;
        this.isInhaling = false;
        this.flickStart = null;
    }

    applyBalloonDegradation() {
        const fillPercent = (this.balloonFill / this.balloonCapacity) * 100;

        if (fillPercent > this.redZone[0]) {
            // In red zone
            this.balloonCapacity *= (1 - this.redDegradation);
            this.showDegradationFeedback('RED! -15% capacity');

            // Check for pop (random chance in red)
            if (Math.random() < 0.3) {
                this.popBalloon();
            }
        } else if (fillPercent > this.yellowZone[0]) {
            // In yellow zone
            this.balloonCapacity *= (1 - this.yellowDegradation);
            this.showDegradationFeedback('Yellow -10% capacity');
        }
        // Green zone - no degradation
    }

    showDegradationFeedback(message) {
        const text = this.add.text(this.balloon.x, this.balloon.y - 50, message, {
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
        // Visual feedback
        this.add.text(this.balloon.x, this.balloon.y, 'POP!', {
            fontSize: '24px',
            color: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Reset balloon
        this.balloonFill = 0;
        this.balloonCapacity = 100; // New balloon
        this.updateBalloonVisual();

        // TODO: Scully fetch animation
    }

    executeFlick(start, end, flickDistance) {
        if (this.lungAir <= 0) return;

        // Trajectory is always from MOUTH to release point
        const dx = end.x - this.mouthX;
        const dy = end.y - this.mouthY;
        const angle = Math.atan2(dy, dx);

        // Distance from mouth to release point determines spread
        const distFromMouth = Math.sqrt(dx * dx + dy * dy);

        // DISTANCE FROM MOUTH determines spread: close = wide, far = narrow/laser
        // Close (<80px) = 70deg wide, Far (>250px) = 5deg laser
        const flickRatio = Phaser.Math.Clamp((distFromMouth - 80) / 170, 0, 1);
        const spreadAngle = Phaser.Math.Linear(70, 5, flickRatio);

        // Power: short flick = weak, long flick = strong
        const power = this.lungAir * Phaser.Math.Linear(0.4, 1.2, flickRatio);

        // Create gust visual
        this.createGust(angle, spreadAngle, power);

        // One flick = dump ALL lung air
        this.lungAir = 0;
        this.updateCheeks();
        this.updateLungMeter(); // FIX: Actually update the lung meter!
    }

    createGust(angle, spreadAngle, power) {
        const { width } = this.scale;

        // Gust origin (from mouth)
        const gustX = this.mouthX;
        const gustY = this.mouthY;

        // Create cone visualization
        const spreadRad = Phaser.Math.DegToRad(spreadAngle);
        const gustLength = 280 + power; // Extended range to reach cake

        const graphics = this.add.graphics();
        graphics.fillStyle(0xADD8E6, 0.4);
        graphics.beginPath();
        graphics.moveTo(gustX, gustY);
        graphics.arc(gustX, gustY, gustLength, angle - spreadRad, angle + spreadRad);
        graphics.closePath();
        graphics.fillPath();

        // Check candle collisions
        this.checkGustCollisions(gustX, gustY, angle, spreadRad, gustLength, power);

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
        // Handle continuous inflate
        if (this.isInflating) {
            this.balloonFill = Math.min(this.balloonCapacity, this.balloonFill + 0.5);
            this.updateBalloonVisual();
            this.updateBalloonMeter();
        }

        // Handle continuous inhale
        if (this.isInhaling && this.balloonFill > 0) {
            const transfer = Math.min(1, this.balloonFill);
            const spaceInLungs = this.maxLungAir - this.lungAir;
            const actualTransfer = Math.min(transfer, spaceInLungs);

            this.balloonFill -= actualTransfer;
            this.lungAir += actualTransfer;

            this.updateBalloonVisual();
            this.updateBalloonMeter();
            this.updateLungMeter();
            this.updateCheeks();
        }
    }

    updateBalloonVisual() {
        // Scale balloon based on fill (min size 10x15, max 50x70)
        const scale = 1 + (this.balloonFill / this.balloonCapacity) * 4;
        this.balloon.setScale(scale, scale);

        // Color based on zone
        const fillPercent = (this.balloonFill / this.balloonCapacity) * 100;
        if (fillPercent > this.redZone[0]) {
            this.balloon.setFillStyle(0xD0021B); // Red
        } else if (fillPercent > this.yellowZone[0]) {
            this.balloon.setFillStyle(0xF5A623); // Yellow
        } else {
            this.balloon.setFillStyle(0x7ED321); // Green
        }
    }

    updateBalloonMeter() {
        const fillWidth = (this.balloonFill / 100) * 100; // Relative to original 100
        this.balloonMeterFill.setSize(fillWidth, 14);

        // Color the meter
        const fillPercent = (this.balloonFill / this.balloonCapacity) * 100;
        if (fillPercent > this.redZone[0]) {
            this.balloonMeterFill.setFillStyle(0xD0021B);
        } else if (fillPercent > this.yellowZone[0]) {
            this.balloonMeterFill.setFillStyle(0xF5A623);
        } else {
            this.balloonMeterFill.setFillStyle(0x7ED321);
        }
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
