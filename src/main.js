import { GameScene } from './scenes/GameScene.js';

const config = {
    type: Phaser.AUTO,
    width: 390,
    height: 844,
    parent: 'game-container',
    backgroundColor: '#f5f5dc', // Warm beige background
    scene: [GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
        activePointers: 1
    }
};

const game = new Phaser.Game(config);
