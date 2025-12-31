import { GameScene } from './scenes/GameScene.js';
import { AnimTestScene } from './scenes/AnimTestScene.js';

const config = {
    type: Phaser.AUTO, // WebGL with Canvas fallback
    width: 390,
    height: 844,
    parent: 'game-container',
    backgroundColor: '#87CEEB', // Sky blue background
    scene: [GameScene, AnimTestScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
        activePointers: 1
    }
};

const game = new Phaser.Game(config);
