// Habbo-style Game with Phaser.js
class HabboGame {
    constructor() {
        this.game = null;
        this.currentScene = null;
        this.characters = [];
        this.currentRoom = 'fashion';
        this.init();
    }

    init() {
        const config = {
            type: Phaser.AUTO,
            width: window.innerWidth,
            height: window.innerHeight * 0.7,
            parent: 'game-container',
            backgroundColor: '#34495e',
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 0 },
                    debug: false
                }
            },
            scene: {
                preload: this.preload.bind(this),
                create: this.create.bind(this),
                update: this.update.bind(this)
            }
        };

        this.game = new Phaser.Game(config);
        this.currentScene = this.game.scene.scenes[0];
    }

    preload() {
        // Create simple colored rectangles as sprites
        this.currentScene.add.graphics()
            .fillStyle(0xff6b9d)
            .fillRect(0, 0, 32, 48)
            .generateTexture('character-amber', 32, 48);

        this.currentScene.add.graphics()
            .fillStyle(0x4cc9f0)
            .fillRect(0, 0, 32, 48)
            .generateTexture('character-bella', 32, 48);

        this.currentScene.add.graphics()
            .fillStyle(0x7209b7)
            .fillRect(0, 0, 32, 48)
            .generateTexture('character-emma', 32, 48);

        this.currentScene.add.graphics()
            .fillStyle(0xf72585)
            .fillRect(0, 0, 32, 48)
            .generateTexture('character-luna', 32, 48);

        // Room floor texture
        this.currentScene.add.graphics()
            .fillGradientStyle(0xffe4e1, 0xffe4e1, 0xf0f8ff, 0xf0f8ff)
            .fillRect(0, 0, 64, 64)
            .generateTexture('floor-tile', 64, 64);

        // Furniture textures
        this.currentScene.add.graphics()
            .fillStyle(0x8b4513)
            .fillRect(0, 0, 96, 64)
            .generateTexture('sofa', 96, 64);

        this.currentScene.add.graphics()
            .fillStyle(0x654321)
            .fillRect(0, 0, 64, 96)
            .generateTexture('table', 64, 96);

        this.currentScene.add.graphics()
            .fillStyle(0x228b22)
            .fillRect(0, 0, 48, 80)
            .generateTexture('plant', 48, 80);
    }

    create() {
        this.createRoom();
        this.createCharacters();
        this.setupInteractions();
        this.setupCamera();
    }

    createRoom() {
        const roomData = this.getRoomData(this.currentRoom);
        
        // Create isometric floor
        const floorWidth = 15;
        const floorHeight = 10;
        const tileWidth = 64;
        const tileHeight = 32;

        for (let x = 0; x < floorWidth; x++) {
            for (let y = 0; y < floorHeight; y++) {
                const isoX = (x - y) * (tileWidth / 2);
                const isoY = (x + y) * (tileHeight / 2);
                
                const tile = this.currentScene.add.image(
                    400 + isoX, 
                    200 + isoY, 
                    'floor-tile'
                );
                
                tile.setOrigin(0.5, 1);
                tile.setTint(roomData.floorColor);
                tile.setAlpha(0.8);
            }
        }

        // Add furniture based on room type
        this.addFurniture(roomData);

        // Add room title
        const title = this.currentScene.add.text(
            this.currentScene.cameras.main.width / 2,
            50,
            `${roomData.emoji} ${roomData.name}`,
            {
                fontSize: '32px',
                fontFamily: 'Inter, sans-serif',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
        title.setOrigin(0.5);
        title.setScrollFactor(0); // Fixed position
    }

    getRoomData(roomType) {
        const rooms = {
            fashion: {
                name: '時尚穿搭房',
                emoji: '🎀',
                floorColor: 0xffb3d1,
                wallColor: 0xdcedc1,
                furniture: ['sofa', 'table', 'plant']
            },
            beauty: {
                name: '美妝保養房',
                emoji: '💄',
                floorColor: 0xdda0dd,
                wallColor: 0xf0e68c,
                furniture: ['table', 'plant', 'sofa']
            },
            travel: {
                name: '旅行探索房',
                emoji: '✈️',
                floorColor: 0x87ceeb,
                wallColor: 0x98fb98,
                furniture: ['plant', 'sofa', 'table']
            },
            music: {
                name: '音樂聊天房',
                emoji: '🎵',
                floorColor: 0xda70d6,
                wallColor: 0x20b2aa,
                furniture: ['sofa', 'sofa', 'plant']
            }
        };
        return rooms[roomType] || rooms.fashion;
    }

    addFurniture(roomData) {
        const furniturePositions = [
            { x: 300, y: 250 },
            { x: 500, y: 300 },
            { x: 650, y: 280 },
            { x: 400, y: 350 }
        ];

        roomData.furniture.forEach((furniture, index) => {
            if (furniturePositions[index]) {
                const pos = furniturePositions[index];
                const item = this.currentScene.add.image(pos.x, pos.y, furniture);
                item.setOrigin(0.5, 1);
                item.setInteractive();
                
                // Add click interaction for furniture
                item.on('pointerdown', () => {
                    this.showFurnitureInfo(furniture);
                });

                // Add hover effect
                item.on('pointerover', () => {
                    item.setTint(0xcccccc);
                });
                
                item.on('pointerout', () => {
                    item.clearTint();
                });
            }
        });
    }

    createCharacters() {
        this.characters = [];

        const characterData = [
            {
                name: 'Amber',
                sprite: 'character-amber',
                x: 350,
                y: 300,
                personality: '溫柔友善',
                skill: '時尚穿搭',
                exp: 2560,
                description: '我是 Amber，你的專屬時尚顧問！擅長搭配建議和風格分析。'
            },
            {
                name: 'Bella',
                sprite: 'character-bella',
                x: 450,
                y: 280,
                personality: '活潑開朗',
                skill: '美妝保養',
                exp: 1890,
                description: '嗨！我是 Bella，美妝達人！讓我幫你找到最適合的妝容。'
            },
            {
                name: 'Emma',
                sprite: 'character-emma',
                x: 550,
                y: 320,
                personality: '冒險精神',
                skill: '旅行規劃',
                exp: 3200,
                description: '我是 Emma，旅行專家！一起探索世界的美好吧！'
            },
            {
                name: 'Luna',
                sprite: 'character-luna',
                x: 400,
                y: 250,
                personality: '藝術氣息',
                skill: '音樂品味',
                exp: 2100,
                description: '我是 Luna，音樂愛好者！想聽什麼風格的音樂呢？'
            }
        ];

        characterData.forEach(data => {
            const character = this.createCharacter(data);
            this.characters.push(character);
        });
    }

    createCharacter(data) {
        const character = this.currentScene.physics.add.sprite(data.x, data.y, data.sprite);
        character.setOrigin(0.5, 1);
        character.setInteractive();
        character.setCollideWorldBounds(true);
        
        // Store character data
        character.characterData = data;
        
        // Add name tag
        const nameTag = this.currentScene.add.text(
            data.x, 
            data.y - 60,
            data.name,
            {
                fontSize: '14px',
                fontFamily: 'Inter, sans-serif',
                color: '#ffffff',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                padding: { x: 8, y: 4 }
            }
        );
        nameTag.setOrigin(0.5);
        character.nameTag = nameTag;

        // Add speech bubble (initially hidden)
        const speechBubble = this.currentScene.add.text(
            data.x,
            data.y - 90,
            '',
            {
                fontSize: '12px',
                fontFamily: 'Inter, sans-serif',
                color: '#333333',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                padding: { x: 10, y: 6 },
                wordWrap: { width: 150 }
            }
        );
        speechBubble.setOrigin(0.5);
        speechBubble.setVisible(false);
        character.speechBubble = speechBubble;

        // Click interaction
        character.on('pointerdown', () => {
            this.showCharacterDialog(character);
        });

        // Hover effects
        character.on('pointerover', () => {
            character.setTint(0xffff88);
            this.showSpeechBubble(character, this.getRandomGreeting());
        });

        character.on('pointerout', () => {
            character.clearTint();
            this.hideSpeechBubble(character);
        });

        // Random movement
        this.setupCharacterMovement(character);

        return character;
    }

    setupCharacterMovement(character) {
        // Random idle animations
        this.currentScene.time.addEvent({
            delay: Phaser.Math.Between(3000, 8000),
            callback: () => {
                this.moveCharacterRandomly(character);
            },
            loop: true
        });

        // Idle bounce animation
        this.currentScene.tweens.add({
            targets: character,
            y: character.y - 5,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    moveCharacterRandomly(character) {
        const currentX = character.x;
        const currentY = character.y;
        const newX = currentX + Phaser.Math.Between(-100, 100);
        const newY = currentY + Phaser.Math.Between(-50, 50);

        // Constrain to room bounds
        const boundedX = Phaser.Math.Clamp(newX, 200, 700);
        const boundedY = Phaser.Math.Clamp(newY, 200, 400);

        // Move character
        this.currentScene.tweens.add({
            targets: character,
            x: boundedX,
            y: boundedY,
            duration: 2000,
            ease: 'Power2',
            onUpdate: () => {
                // Update name tag position
                character.nameTag.x = character.x;
                character.nameTag.y = character.y - 60;
                
                // Update speech bubble position
                character.speechBubble.x = character.x;
                character.speechBubble.y = character.y - 90;
            }
        });

        // Show walking animation (simple scale effect)
        this.currentScene.tweens.add({
            targets: character,
            scaleX: 1.1,
            scaleY: 0.9,
            duration: 100,
            yoyo: true,
            repeat: 10
        });
    }

    showSpeechBubble(character, text) {
        character.speechBubble.setText(text);
        character.speechBubble.setVisible(true);
        
        // Auto hide after 3 seconds
        this.currentScene.time.delayedCall(3000, () => {
            this.hideSpeechBubble(character);
        });
    }

    hideSpeechBubble(character) {
        character.speechBubble.setVisible(false);
    }

    getRandomGreeting() {
        const greetings = [
            '嗨！很高興見到你！',
            '今天過得如何呢？',
            '有什麼想聊的嗎？',
            '需要我的幫助嗎？',
            '歡迎來到這個房間！',
            '想聽聽我的建議嗎？'
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }

    showCharacterDialog(character) {
        // Show character modal from the main page
        if (typeof showCharacterModal === 'function') {
            showCharacterModal(character.characterData);
        }

        // Also add a chat message
        const responses = [
            `${character.characterData.name}: 嗨！我是專精於${character.characterData.skill}的 AI 助理！`,
            `${character.characterData.name}: 很高興認識你！需要任何${character.characterData.skill}的建議嗎？`,
            `${character.characterData.name}: 我已經累積了${character.characterData.exp}點經驗值！讓我來幫助你吧！`
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        if (typeof addChatMessage === 'function') {
            addChatMessage('ai', character.characterData.name, randomResponse.split(': ')[1]);
        }
    }

    showFurnitureInfo(furniture) {
        const furnitureInfo = {
            sofa: '舒適的沙發，適合放鬆聊天',
            table: '精美的桌子，放著一些雜誌',
            plant: '綠色植物，為房間增添生機'
        };

        if (typeof addChatMessage === 'function') {
            addChatMessage('ai', 'Amber', furnitureInfo[furniture] || '這是房間裡的裝flying物品');
        }
    }

    setupInteractions() {
        // Room click to move (optional feature)
        this.currentScene.input.on('pointerdown', (pointer, gameObjects) => {
            if (gameObjects.length === 0) {
                // Clicked on empty space - could add player movement here
                console.log('Clicked on empty space at:', pointer.x, pointer.y);
            }
        });
    }

    setupCamera() {
        // Set camera bounds
        this.currentScene.cameras.main.setBounds(0, 0, 1000, 600);
        
        // Optional: Follow a character or allow camera movement
        // this.currentScene.cameras.main.startFollow(this.characters[0]);
    }

    switchRoom(roomType) {
        this.currentRoom = roomType;
        
        // Clear current scene
        this.currentScene.children.removeAll();
        
        // Recreate room
        this.createRoom();
        this.createCharacters();
    }

    update() {
        // Game loop updates go here
        // For now, just update character positions relative to name tags
        this.characters.forEach(character => {
            if (character.nameTag) {
                character.nameTag.x = character.x;
                character.nameTag.y = character.y - 60;
            }
            if (character.speechBubble && character.speechBubble.visible) {
                character.speechBubble.x = character.x;
                character.speechBubble.y = character.y - 90;
            }
        });
    }

    // Public methods for external control
    addMessage(characterName, message) {
        const character = this.characters.find(c => c.characterData.name === characterName);
        if (character) {
            this.showSpeechBubble(character, message);
        }
    }

    moveCharacter(characterName, x, y) {
        const character = this.characters.find(c => c.characterData.name === characterName);
        if (character) {
            this.currentScene.tweens.add({
                targets: character,
                x: x,
                y: y,
                duration: 1500,
                ease: 'Power2'
            });
        }
    }

    // Resize handler
    resize() {
        const canvas = this.game.canvas;
        const parent = canvas.parentElement;
        
        canvas.style.width = parent.clientWidth + 'px';
        canvas.style.height = parent.clientHeight + 'px';
        
        this.game.scale.resize(parent.clientWidth, parent.clientHeight);
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const habboGame = new HabboGame();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        habboGame.resize();
    });
    
    // Make game instance available globally
    window.habboGame = habboGame;
    
    // Integrate with room switching
    const originalSwitchRoom = window.switchRoom;
    window.switchRoom = function(roomType) {
        if (originalSwitchRoom) {
            originalSwitchRoom(roomType);
        }
        if (habboGame) {
            habboGame.switchRoom(roomType);
        }
    };
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HabboGame;
}