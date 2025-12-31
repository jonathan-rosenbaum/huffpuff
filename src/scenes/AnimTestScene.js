/**
 * Animation Stage - Build animation sequences
 * 1. Tap an actor to see its animations
 * 2. Tap an animation to add it to the sentence
 * 3. Tap an item in the sentence to reverse/delete it
 * 4. Press PLAY to watch the sequence
 */
export class AnimTestScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AnimTestScene' });
    }

    init() {
        this.animLibrary = {
            hero: [
                { name: 'eric_pivot_to_tank', frames: 20, label: 'Pivot→Tank' },
                { name: 'eric_pivot_to_suck', frames: 51, label: 'Pivot→Suck' },
                { name: 'eric_scared', frames: 38, label: 'Scared' },
                { name: 'eric_startled_to_calm', frames: 43, label: 'Startled→Calm' },
                { name: 'eric_suck_blow', frames: 18, label: 'Suck&Blow' },
            ],
            balloon: [
                { name: 'balloon_phases', frames: 40, label: 'Inflate' },
                { name: 'balloon_pop', frames: 4, label: 'Pop' },
            ],
            scully: [
                { name: 'scully_run_right', frames: 10, label: 'Run→' },
                { name: 'scully_pivot_to_front', frames: 8, label: 'Pivot Front' },
                { name: 'scully_pivot_to_left', frames: 7, label: 'Pivot←' },
                { name: 'scully_run_left', frames: 9, label: '←Run' },
            ],
        };

        this.selectedActorType = null;
        this.sentence = [];  // Array of { type, anim, reversed }
        this.isPlaying = false;
        this.playIndex = 0;
        this.playFrame = 1;
    }

    preload() {
        this.loadingText = this.add.text(195, 400, 'Loading...', {
            fontSize: '18px', color: '#fff'
        }).setOrigin(0.5);

        // Load all frames
        const allAnims = [
            ...this.animLibrary.hero.map(a => ({ ...a, path: 'assets/sprites/hero' })),
            ...this.animLibrary.balloon.map(a => ({ ...a, path: 'assets/sprites/balloon' })),
            ...this.animLibrary.scully.map(a => ({ ...a, path: 'assets/sprites/scully' })),
        ];

        allAnims.forEach(anim => {
            for (let i = 1; i <= anim.frames; i++) {
                const num = String(i).padStart(2, '0');
                this.load.image(`${anim.name}_${num}`, `${anim.path}/${anim.name}_${num}.png`);
            }
        });

        this.load.on('progress', (v) => {
            this.loadingText.setText(`Loading... ${Math.round(v * 100)}%`);
        });
    }

    create() {
        const { width, height } = this.scale;
        this.loadingText.destroy();

        // Background
        this.add.rectangle(width/2, height/2, width, height, 0x1a1a2e);

        // Back button
        this.add.text(15, 15, '< Back', {
            fontSize: '14px', color: '#0af', backgroundColor: '#222', padding: { x: 8, y: 4 }
        }).setInteractive().on('pointerdown', () => this.scene.start('GameScene'));

        // Help button
        this.add.text(width - 15, 15, '?', {
            fontSize: '16px', color: '#fff', backgroundColor: '#555', padding: { x: 10, y: 4 }
        }).setOrigin(1, 0).setInteractive().on('pointerdown', () => this.showHelpModal());

        // Actor type buttons at top
        this.createActorButtons();  // y = 55

        // Stage area for preview - taller to fit actors
        this.stageTop = 90;
        this.stageHeight = 300;
        this.stageBottom = this.stageTop + this.stageHeight;
        this.add.rectangle(width/2, this.stageTop + this.stageHeight/2, width - 20, this.stageHeight, 0x222233);

        // Preview sprite (shows during playback) - positioned at bottom of stage
        this.previewSprite = this.add.sprite(width/2, this.stageBottom - 10, 'eric_pivot_to_tank_01');
        this.previewSprite.setScale(0.35);
        this.previewSprite.setOrigin(0.5, 1);
        this.previewSprite.setVisible(false);

        // Frame counter (below stage)
        this.frameText = this.add.text(width/2, this.stageBottom + 5, '', {
            fontSize: '11px', color: '#0f0'
        }).setOrigin(0.5);

        // Animation picker area
        this.animButtons = [];
        this.animPickerY = this.stageBottom + 25;
        this.add.text(width/2, this.animPickerY - 20, 'ANIMATIONS', {
            fontSize: '10px', color: '#444'
        }).setOrigin(0.5);

        // Sentence display area - positioned based on animation picker
        this.sentenceY = this.animPickerY + 135;
        this.add.text(15, this.sentenceY - 15, 'SEQUENCE:', {
            fontSize: '10px', color: '#555'
        });
        this.add.rectangle(width/2, this.sentenceY + 45, width - 20, 95, 0x1a1a28);
        this.sentenceItems = [];
        this.updateSentenceDisplay();

        // Play controls at bottom
        this.createPlayControls();

        // Popup for editing sentence items (hidden initially)
        this.createEditPopup();

        // Create help modal (hidden initially)
        this.createHelpModal();
    }

    createActorButtons() {
        const { width } = this.scale;
        const types = ['hero', 'balloon', 'scully'];
        const btnWidth = 100;
        const gap = 15;
        const startX = width/2 - (types.length * btnWidth + (types.length - 1) * gap) / 2;

        this.actorButtons = [];

        types.forEach((type, i) => {
            const x = startX + i * (btnWidth + gap) + btnWidth/2;
            const y = 55;

            const bg = this.add.rectangle(x, y, btnWidth, 35, 0x334455);
            bg.setInteractive();

            const text = this.add.text(x, y, type.toUpperCase(), {
                fontSize: '14px', color: '#fff'
            }).setOrigin(0.5);

            bg.on('pointerdown', () => this.selectActorType(type));

            this.actorButtons.push({ bg, text, type });
        });
    }

    selectActorType(type) {
        this.selectedActorType = type;

        // Highlight selected button
        this.actorButtons.forEach(btn => {
            btn.bg.setFillStyle(btn.type === type ? 0x446688 : 0x334455);
        });

        // Show animations for this type
        this.showAnimations(type);
    }

    showAnimations(type) {
        // Clear old buttons
        this.animButtons.forEach(item => item.destroy());
        this.animButtons = [];

        const anims = this.animLibrary[type];
        const { width } = this.scale;

        // Create button for each animation - compact 2-column grid
        const btnHeight = 32;
        const btnWidth = 175;
        const gap = 6;
        const cols = 2;
        const startX = width/2 - (cols * btnWidth + (cols - 1) * gap) / 2;

        anims.forEach((anim, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * (btnWidth + gap);
            const y = this.animPickerY + row * (btnHeight + gap);

            const bg = this.add.rectangle(x + btnWidth/2, y + btnHeight/2, btnWidth, btnHeight, 0x445566);
            bg.setInteractive();

            const text = this.add.text(x + btnWidth/2, y + btnHeight/2,
                `${anim.label} (${anim.frames}f)`, {
                fontSize: '11px', color: '#fff', align: 'center'
            }).setOrigin(0.5);

            bg.on('pointerdown', () => this.addToSentence(type, anim));
            bg.on('pointerover', () => bg.setFillStyle(0x557788));
            bg.on('pointerout', () => bg.setFillStyle(0x445566));

            this.animButtons.push(bg, text);
        });
    }

    addToSentence(type, anim) {
        this.sentence.push({
            type,
            anim,
            reversed: false
        });
        this.updateSentenceDisplay();
    }

    updateSentenceDisplay() {
        // Clear old items
        this.sentenceItems.forEach(item => item.destroy());
        this.sentenceItems = [];

        if (this.sentence.length === 0) {
            const empty = this.add.text(195, this.sentenceY + 45, '(tap animations to add)', {
                fontSize: '11px', color: '#555'
            }).setOrigin(0.5);
            this.sentenceItems.push(empty);
            return;
        }

        // Layout sentence items horizontally with wrapping
        const itemWidth = 68;
        const itemHeight = 38;
        const gap = 4;
        const maxPerRow = 5;
        const startX = 15;

        this.sentence.forEach((item, i) => {
            const col = i % maxPerRow;
            const row = Math.floor(i / maxPerRow);
            const x = startX + col * (itemWidth + gap);
            const y = this.sentenceY + 5 + row * (itemHeight + gap);

            // Background (color by type)
            const colors = { hero: 0x446644, balloon: 0x664444, scully: 0x444466 };
            const bg = this.add.rectangle(x + itemWidth/2, y + itemHeight/2, itemWidth, itemHeight, colors[item.type]);
            bg.setInteractive();

            // Label
            const label = item.reversed ? `← ${item.anim.label}` : item.anim.label;
            const text = this.add.text(x + itemWidth/2, y + itemHeight/2, label, {
                fontSize: '8px', color: '#fff', align: 'center', wordWrap: { width: itemWidth - 4 }
            }).setOrigin(0.5);

            // Index number
            const num = this.add.text(x + 2, y + 1, `${i + 1}`, {
                fontSize: '7px', color: '#ccc'
            });

            // Tap to edit
            bg.on('pointerdown', () => this.showEditPopup(i));

            this.sentenceItems.push(bg, text, num);
        });
    }

    createEditPopup() {
        const { width, height } = this.scale;

        // Semi-transparent overlay
        this.popupOverlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.7);
        this.popupOverlay.setInteractive();
        this.popupOverlay.on('pointerdown', () => this.hideEditPopup());

        // Popup box
        this.popupBox = this.add.rectangle(width/2, height/2, 200, 180, 0x333344);

        // Title
        this.popupTitle = this.add.text(width/2, height/2 - 60, 'Edit Item', {
            fontSize: '14px', color: '#fff'
        }).setOrigin(0.5);

        // Buttons
        const btnStyle = { fontSize: '14px', color: '#fff', padding: { x: 15, y: 8 } };

        this.popupReverse = this.add.text(width/2, height/2 - 20, 'REVERSE', {
            ...btnStyle, backgroundColor: '#0066aa'
        }).setOrigin(0.5).setInteractive();

        this.popupDelete = this.add.text(width/2, height/2 + 25, 'DELETE', {
            ...btnStyle, backgroundColor: '#aa3333'
        }).setOrigin(0.5).setInteractive();

        this.popupCancel = this.add.text(width/2, height/2 + 70, 'CANCEL', {
            ...btnStyle, backgroundColor: '#555555'
        }).setOrigin(0.5).setInteractive();

        this.popupCancel.on('pointerdown', () => this.hideEditPopup());

        // Group popup elements
        this.popupElements = [
            this.popupOverlay, this.popupBox, this.popupTitle,
            this.popupReverse, this.popupDelete, this.popupCancel
        ];
        this.popupElements.forEach(el => el.setVisible(false));

        this.editingIndex = -1;
    }

    showEditPopup(index) {
        if (this.isPlaying) return;

        this.editingIndex = index;
        const item = this.sentence[index];

        this.popupTitle.setText(`${index + 1}. ${item.anim.label}`);
        this.popupReverse.setText(item.reversed ? 'UN-REVERSE' : 'REVERSE');

        this.popupReverse.off('pointerdown');
        this.popupReverse.on('pointerdown', () => {
            this.sentence[index].reversed = !this.sentence[index].reversed;
            this.hideEditPopup();
            this.updateSentenceDisplay();
        });

        this.popupDelete.off('pointerdown');
        this.popupDelete.on('pointerdown', () => {
            this.sentence.splice(index, 1);
            this.hideEditPopup();
            this.updateSentenceDisplay();
        });

        this.popupElements.forEach(el => el.setVisible(true));
    }

    hideEditPopup() {
        this.popupElements.forEach(el => el.setVisible(false));
        this.editingIndex = -1;
    }

    createHelpModal() {
        const { width, height } = this.scale;

        // Overlay
        this.helpOverlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.85);
        this.helpOverlay.setInteractive();
        this.helpOverlay.on('pointerdown', () => this.hideHelpModal());

        // Modal box
        this.helpBox = this.add.rectangle(width/2, height/2, width - 40, 400, 0x222244, 1);
        this.helpBox.setStrokeStyle(2, 0x4466aa);

        // Title
        this.helpTitle = this.add.text(width/2, height/2 - 170, 'ANIMATION STAGE', {
            fontSize: '18px', color: '#fff', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Instructions
        const instructions = [
            '1. Tap HERO, BALLOON, or SCULLY',
            '   to select an actor type',
            '',
            '2. Tap an animation to add it',
            '   to your sequence',
            '',
            '3. Tap any item in the sequence',
            '   to REVERSE or DELETE it',
            '',
            '4. Press PLAY SEQUENCE to',
            '   watch it loop',
            '',
            '5. Use Speed +/- to adjust fps',
            '',
            '6. CLEAR empties the sequence'
        ];

        this.helpText = this.add.text(width/2, height/2, instructions.join('\n'), {
            fontSize: '13px', color: '#ccc', align: 'left', lineSpacing: 4
        }).setOrigin(0.5);

        // Close button
        this.helpClose = this.add.text(width/2, height/2 + 165, 'TAP ANYWHERE TO CLOSE', {
            fontSize: '12px', color: '#888'
        }).setOrigin(0.5);

        // Group elements
        this.helpElements = [this.helpOverlay, this.helpBox, this.helpTitle, this.helpText, this.helpClose];
        this.helpElements.forEach(el => el.setVisible(false));
    }

    showHelpModal() {
        this.helpElements.forEach(el => el.setVisible(true));
    }

    hideHelpModal() {
        this.helpElements.forEach(el => el.setVisible(false));
    }

    createPlayControls() {
        const { width, height } = this.scale;

        // Speed and Clear row - above play button
        const controlsY = height - 80;

        // Speed control
        this.speed = 24;
        this.add.text(15, controlsY, 'Speed:', { fontSize: '11px', color: '#888' });
        this.speedText = this.add.text(55, controlsY, '24', { fontSize: '11px', color: '#0f0' });

        const speedBtn = { fontSize: '12px', color: '#fff', backgroundColor: '#333', padding: { x: 6, y: 2 } };
        this.add.text(80, controlsY - 2, '-', speedBtn).setInteractive()
            .on('pointerdown', () => {
                this.speed = Math.max(4, this.speed - 4);
                this.speedText.setText(`${this.speed}`);
            });
        this.add.text(105, controlsY - 2, '+', speedBtn).setInteractive()
            .on('pointerdown', () => {
                this.speed = Math.min(60, this.speed + 4);
                this.speedText.setText(`${this.speed}`);
            });

        // Clear button
        this.add.text(width - 60, controlsY, 'CLEAR', {
            fontSize: '11px', color: '#f66', backgroundColor: '#322', padding: { x: 6, y: 3 }
        }).setInteractive().on('pointerdown', () => {
            this.sentence = [];
            this.updateSentenceDisplay();
            this.stopPlayback();
        });

        // Play/Stop button - centered at bottom
        this.playBtn = this.add.text(width/2, height - 35, 'PLAY SEQUENCE', {
            fontSize: '16px', color: '#fff', backgroundColor: '#006600', padding: { x: 25, y: 12 }
        }).setOrigin(0.5).setInteractive()
            .on('pointerdown', () => this.togglePlayback());
    }

    togglePlayback() {
        if (this.isPlaying) {
            this.stopPlayback();
        } else {
            this.startPlayback();
        }
    }

    startPlayback() {
        if (this.sentence.length === 0) return;

        this.isPlaying = true;
        this.playIndex = 0;
        this.playFrame = 1;
        this.lastFrameTime = this.time.now;

        this.playBtn.setText('STOP');
        this.playBtn.setStyle({ backgroundColor: '#660000' });

        this.previewSprite.setVisible(true);
        this.updatePreviewSprite();
    }

    stopPlayback() {
        this.isPlaying = false;
        this.playBtn.setText('PLAY SEQUENCE');
        this.playBtn.setStyle({ backgroundColor: '#006600' });
        this.previewSprite.setVisible(false);
        this.frameText.setText('');
    }

    updatePreviewSprite() {
        if (!this.isPlaying || this.sentence.length === 0) return;

        const item = this.sentence[this.playIndex];
        const totalFrames = item.anim.frames;

        // Calculate actual frame (handle reverse)
        let frame = item.reversed ? (totalFrames - this.playFrame + 1) : this.playFrame;
        frame = Math.max(1, Math.min(totalFrames, frame));

        const num = String(frame).padStart(2, '0');
        const key = `${item.anim.name}_${num}`;

        if (this.textures.exists(key)) {
            this.previewSprite.setTexture(key);

            // Get texture dimensions and scale to fit stage while maintaining relative sizes
            const texture = this.textures.get(key);
            const frameData = texture.get();
            const spriteHeight = frameData.height;

            // Base scale that fits tallest sprite (hero ~720px) into stage with margin
            const maxHeight = this.stageHeight - 20;  // 280px usable
            const baseScale = maxHeight / 720;  // ~0.39 base scale

            // Relative scales - hero is baseline, others proportional
            const relativeScales = { hero: 1.0, balloon: 0.6, scully: 0.7 };
            const scale = baseScale * (relativeScales[item.type] || 1.0);

            this.previewSprite.setScale(scale);
        }

        this.frameText.setText(`${this.playIndex + 1}/${this.sentence.length}: ${item.anim.label} [${this.playFrame}/${totalFrames}]`);
    }

    update(time, delta) {
        if (!this.isPlaying || this.sentence.length === 0) return;

        const frameTime = 1000 / this.speed;
        if (time - this.lastFrameTime >= frameTime) {
            this.playFrame++;

            const item = this.sentence[this.playIndex];
            if (this.playFrame > item.anim.frames) {
                // Move to next item in sentence
                this.playIndex++;
                this.playFrame = 1;

                if (this.playIndex >= this.sentence.length) {
                    // Loop back to start
                    this.playIndex = 0;
                }
            }

            this.updatePreviewSprite();
            this.lastFrameTime = time;
        }
    }
}
