const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
const finalScoreElement = document.getElementById('final-score');
const totalPlaysElement = document.getElementById('total-plays');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const touchHint = document.getElementById('touch-controls-hint');
const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar');

// Logical Scale Constants
const LOGICAL_WIDTH = 480;
let scaleFactor = 1;

// Base Physics Constants (To be scaled in initGame)
const BASE_GRAVITY = 0.4;
const BASE_JUMP_FORCE = -13;
const BASE_MOVEMENT_SPEED = 5;
const BASE_PLATFORM_WIDTH = 90;
const BASE_PLATFORM_HEIGHT = 20;
const BASE_PLATFORM_GAP_MIN = 100;
const BASE_PLATFORM_GAP_MAX = 190;
const BASE_FPS = 60;

// Current Scaled Constants
let GRAVITY, JUMP_FORCE, MOVEMENT_SPEED, PLATFORM_WIDTH, PLATFORM_HEIGHT, PLATFORM_GAP_MIN, PLATFORM_GAP_MAX;
let gameWidth, gameHeight; // Logical dimensions for drawing and logic

// Assets Tracking
const assets = {
    tigerJump: 'assets/tiger_jump.png',
    tigerFail: 'assets/tiger_fail.png',
    platform: 'assets/platform.png',
    background: 'assets/background.png'
};

const images = {};
let loadedAssets = 0;
const criticalAssets = Object.keys(assets).length;

function hideLoadingScreen() {
    loadingScreen.classList.add('hidden');
}

// Safety Timeout - Force start after 10 seconds if stuck
const safetyTimeout = setTimeout(hideLoadingScreen, 10000);

function checkAssetsLoaded() {
    loadedAssets++;
    const progress = (loadedAssets / criticalAssets) * 100;
    loadingBar.style.width = `${progress}%`;

    if (loadedAssets === criticalAssets) {
        clearTimeout(safetyTimeout);
        setTimeout(hideLoadingScreen, 500);
    }
}

// Load Assets
const tigerJumpImg = new Image();
const tigerFallImg = new Image();
const platformImg = new Image();
const backgroundImg = new Image();

tigerJumpImg.onload = checkAssetsLoaded;
tigerFallImg.onload = checkAssetsLoaded;
platformImg.onload = checkAssetsLoaded;
backgroundImg.onload = checkAssetsLoaded;

tigerJumpImg.onerror = checkAssetsLoaded;
tigerFallImg.onerror = checkAssetsLoaded;
platformImg.onerror = checkAssetsLoaded;
backgroundImg.onerror = checkAssetsLoaded;

tigerJumpImg.src = assets.tigerJump;
tigerFallImg.src = assets.tigerFail;
platformImg.src = assets.platform;
backgroundImg.src = assets.background;

// Game State
let gameState = 'MENU';
let score = 0;
let platforms = [];
let items = [];
let particles = [];
let keys = {
    ArrowLeft: false,
    ArrowRight: false
};
let frameCount = 0;
let lastTime = 0;
let gameTimer = 30;
let hintTimer = 10;
let itemSpawnTimer = 0;
let itemsSpawnedInWindow = 0;

// Counter API Logic
async function updatePlayCountUI() {
    try {
        const response = await fetch('https://api.counterapi.dev/v1/jejugoods-tiger-jump/plays');
        const data = await response.json();
        if (totalPlaysElement && data.count !== undefined) {
            totalPlaysElement.innerText = data.count.toLocaleString();
        }
    } catch (e) {
        console.error('Failed to fetch play count', e);
        if (totalPlaysElement) totalPlaysElement.innerText = '수많은';
    }
}

async function incrementPlayCount() {
    try {
        await fetch('https://api.counterapi.dev/v1/jejugoods-tiger-jump/plays/up');
    } catch (e) {
        console.error('Failed to increment play count', e);
    }
}

// Item Effects State
let activeEffects = {
    superJump: 0,
    doubleScore: 0,
    dizzy: 0,
    fastSpeed: 0
};

// Input Handling
window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        keys[e.code] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        keys[e.code] = false;
    }
});

// Touch controls for mobile
window.addEventListener('touchstart', (e) => {
    if (gameState === 'PLAYING') {
        e.preventDefault();
        const touchX = e.touches[0].clientX;
        const screenWidth = window.innerWidth;
        if (touchX < screenWidth / 2) {
            keys.ArrowLeft = true;
            keys.ArrowRight = false;
        } else {
            keys.ArrowRight = true;
            keys.ArrowLeft = false;
        }
    }
}, { passive: false });

window.addEventListener('touchend', (e) => {
    if (gameState === 'PLAYING') {
        e.preventDefault();
        keys.ArrowLeft = false;
        keys.ArrowRight = false;
    }
}, { passive: false });

// Player Class (White Tiger - Animated Sprite)
class Player {
    constructor() {
        this.width = 135 * scaleFactor;
        this.height = 135 * scaleFactor;
        this.x = gameWidth / 2 - this.width / 2;
        this.y = gameHeight - 150 * scaleFactor;
        this.vx = 0;
        this.vy = 0;
        this.facingRight = true;
        this.scaleX = 1;
        this.scaleY = 1;
    }

    draw() {
        ctx.save();

        // Flip context if facing left
        if (this.vx < -0.1) this.facingRight = false;
        if (this.vx > 0.1) this.facingRight = true;

        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        ctx.translate(centerX, centerY);

        // Apply Squash & Stretch + Facing Direction
        // If facing left, scaleX should be negative relative to the base scale
        const dir = this.facingRight ? 1 : -1;
        ctx.scale(this.scaleX * dir, this.scaleY);

        // Determine Sprite based on state
        let spriteToDraw = tigerJumpImg; // Default to Jump (Ready state) looks better than Idle

        if (this.vy > 0.5) {
            spriteToDraw = tigerFallImg; // Falling down
        }

        // Draw Image
        if (spriteToDraw.complete) {
            ctx.drawImage(spriteToDraw, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            // Fallback
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Dizzy Effect (Stars over head)
        if (activeEffects.dizzy > 0) {
            ctx.font = '40px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('💫', 0, -this.height / 2 - 20);
        }

        ctx.restore();
    }

    update(dtScalar) {
        // Handle Control Inversion (Dizzy Effect)
        let leftInput = keys.ArrowLeft;
        let rightInput = keys.ArrowRight;

        if (activeEffects.dizzy > 0) {
            // Swap inputs
            [leftInput, rightInput] = [rightInput, leftInput];
        }

        // Horizontal Movement
        let speed = MOVEMENT_SPEED;
        if (activeEffects.fastSpeed > 0) speed *= 2;

        if (leftInput) {
            this.vx = -speed;
        } else if (rightInput) {
            this.vx = speed;
        } else {
            this.vx *= Math.pow(0.8, dtScalar); // Friction
        }
        this.x += this.vx * dtScalar;

        // Vertical Movement
        this.vy += GRAVITY * dtScalar;
        this.y += this.vy * dtScalar;

        // Restore scale (Elastic effect)
        this.scaleX += (1 - this.scaleX) * 0.1 * dtScalar;
        this.scaleY += (1 - this.scaleY) * 0.1 * dtScalar;

        // Floor collision (only for start)
        if (this.y + this.height > gameHeight && score === 0) {
            this.y = gameHeight - this.height;
            this.vy = 0;
            this.jump(); // Auto jump on start
        }

        // Screen Boundaries (Walls)
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > gameWidth) this.x = gameWidth - this.width;
    }

    jump() {
        // Super Jump Effect
        let jumpPower = JUMP_FORCE;
        if (activeEffects.superJump > 0) {
            jumpPower *= 1.3; // 30% boost (enough for screen clearing jumps)
            // Visual flair for super jump
            createBurstParticles(this.x + this.width / 2, this.y + this.height, '#ff7675');
        }

        this.vy = jumpPower;

        // Squash & Stretch Impact
        this.scaleX = 0.8; // Thin
        this.scaleY = 1.3; // Tall (Stretch on jump)

        // Create dust particles (Enhanced cloud effect)
        for (let i = 0; i < 30; i++) {
            particles.push(new Particle(this.x + this.width / 2, this.y + this.height - 10));
        }
    }
}

// Item Class (Lucky Bag - Bokjumeoni)
class Item {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40 * scaleFactor;
        this.height = 40 * scaleFactor;
        this.floatOffset = 0;
    }

    draw() {
        // if (this.collected) return; // Removed as per instruction

        this.floatOffset = Math.sin(frameCount * 0.1) * 5;
        const renderY = this.y + this.floatOffset;

        ctx.save();
        ctx.translate(this.x + this.width / 2, renderY + this.height / 2);

        // Draw Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(0, 25, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw Pouch Body (Red/Blue gradient)
        const grad = ctx.createLinearGradient(-15, -20, 15, 20);
        grad.addColorStop(0, '#ff7675'); // Pinkish Red
        grad.addColorStop(1, '#d63031'); // Deep Red
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(0, -20); // Top knot center
        ctx.bezierCurveTo(-20, -10, -25, 25, 0, 25); // Left side
        ctx.bezierCurveTo(25, 25, 20, -10, 0, -20); // Right side
        ctx.fill();
        ctx.strokeStyle = '#632c2c'; // Dark outline
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw Gold Tie
        ctx.fillStyle = '#fdcb6e'; // Gold
        ctx.beginPath();
        ctx.arc(0, -12, 6, 0, Math.PI * 2); // Knot
        ctx.fill();
        ctx.stroke();

        // Draw 'Lucky' Symbol (Hanja 'Bok' simplified)
        ctx.fillStyle = 'white';
        ctx.font = '20px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('福', 0, 5);

        ctx.restore();
    }

    update() {
        // Items move with platforms (scrolling handled in main loop)
    }
}

// Platform Class (Clouds - Image Based)
class Platform {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = PLATFORM_WIDTH;
        this.height = PLATFORM_HEIGHT * 2.5;
        this.hitboxHeight = PLATFORM_HEIGHT;
        this.type = Math.random() < 0.1 ? 'moving' : 'normal';
        this.vx = this.type === 'moving' ? (Math.random() < 0.5 ? 2 * scaleFactor : -2 * scaleFactor) : 0;
    }

    draw() {
        if (platformImg.complete) {
            // Draw slightly larger than Hitbox for visual fluff
            ctx.drawImage(platformImg, this.x - 10, this.y - 10, this.width + 20, this.height);
        } else {
            // Fallback
            ctx.fillStyle = '#dfe6e9';
            ctx.fillRect(this.x, this.y, this.width, this.hitboxHeight);
        }

        // Moving platform indicator (visual only)
    }

    update(dtScalar) {
        if (this.type === 'moving') {
            this.x += this.vx * dtScalar;
            if (this.x < 0 || this.x + this.width > gameWidth) {
                this.vx *= -1;
            }
        }
    }
}

// Particle Class (Dust Clouds)
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = (Math.random() * 15 + 10) * scaleFactor; // Larger starting size for "clouds"
        this.vx = (Math.random() - 0.5) * 8 * scaleFactor; // Wider horizontal spread
        this.vy = (Math.random() * 2 - 1) * scaleFactor; // More vertical variety
        this.alpha = 1;

        // Use provided color or default white-ish
        this.baseColor = color || '255, 255, 255';
    }

    update(dtScalar) {
        this.x += this.vx * dtScalar;
        this.y += this.vy * dtScalar;
        this.vx *= Math.pow(0.96, dtScalar); // Slow down
        this.vy *= Math.pow(0.96, dtScalar);
        this.alpha -= 0.02 * dtScalar; // Fading
        this.size += 0.5 * scaleFactor * dtScalar; // Expanding smoke
    }

    draw() {
        if (this.alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.alpha;

        // Radial gradient for soft edges (No hard borders!)
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.size
        );
        gradient.addColorStop(0, `rgba(${this.baseColor}, 0.6)`);
        gradient.addColorStop(0.4, `rgba(${this.baseColor}, 0.2)`);
        gradient.addColorStop(1, `rgba(${this.baseColor}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Helper to spawn a burst of particles
function createBurstParticles(x, y, color) {
    // If color is hex, convert to RGB for the gradient class
    let rgb = '255, 255, 255';
    if (color === '#ff7675') rgb = '255, 118, 117'; // Super Jump Pink
    if (color === '#fdcb6e') rgb = '253, 203, 110'; // Gold
    if (color === '#fab1a0') rgb = '250, 177, 160'; // Peach
    if (color === '#a29bfe') rgb = '162, 155, 254'; // Purple
    if (color === '#55efc4') rgb = '85, 239, 196'; // Mint Green for Fast Speed

    for (let i = 0; i < 15; i++) {
        let p = new Particle(x, y, rgb);
        p.vy = (Math.random() - 0.5) * 12 * scaleFactor;
        p.vx = (Math.random() - 0.5) * 12 * scaleFactor;
        p.size = (Math.random() * 20 + 10) * scaleFactor;
        particles.push(p);
    }
}

// Background Drawing
function drawBackground() {
    if (backgroundImg.complete) {
        // Use logical dimensions for scaling/positioning
        const scale = Math.max(gameWidth / backgroundImg.width, gameHeight / backgroundImg.height);
        const x = (gameWidth / 2) - (backgroundImg.width / 2) * scale;
        const y = (gameHeight / 2) - (backgroundImg.height / 2) * scale;
        ctx.drawImage(backgroundImg, x, y, backgroundImg.width * scale, backgroundImg.height * scale);
    } else {
        // Fallback Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, gameHeight);
        gradient.addColorStop(0, '#0984e3'); // Deep Blue
        gradient.addColorStop(1, '#74b9ff'); // Light Blue
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, gameWidth, gameHeight);
    }
}

// UI Drawing
function drawUI() {
    // Top Right Effects List
    let yPos = 80;
    ctx.textAlign = 'right';

    // Helper for background
    const drawEffectBox = (title, desc, color, y) => {
        const boxWidth = 220;
        const boxHeight = 50;
        const x = gameWidth - 10;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x - boxWidth, y - 25, boxWidth, boxHeight, 10);
        } else {
            ctx.rect(x - boxWidth, y - 25, boxWidth, boxHeight);
        }
        ctx.fill();

        // Title
        ctx.font = 'bold 20px "Noto Sans KR", sans-serif';
        ctx.fillStyle = color;
        ctx.fillText(title, x - 10, y);

        // Description
        ctx.font = '14px "Noto Sans KR", sans-serif';
        ctx.fillStyle = '#ffffff'; // White for readability
        ctx.fillText(desc, x - 10, y + 20);
    };

    if (activeEffects.superJump > 0) {
        drawEffectBox(`🚀 슈퍼 점프: ${Math.ceil(activeEffects.superJump / 60)}초`, '점프력이 높아져요!', '#fdcb6e', yPos);
        yPos += 60;
    }
    if (activeEffects.doubleScore > 0) {
        drawEffectBox(`💰 점수 2배: ${Math.ceil(activeEffects.doubleScore / 60)}초`, '점수가 팍팍 올라요!', '#fab1a0', yPos);
        yPos += 60;
    }
    if (activeEffects.dizzy > 0) {
        drawEffectBox(`💫 어지러움: ${Math.ceil(activeEffects.dizzy / 60)}초`, '조작이 반대로 바뀌어요!', '#a29bfe', yPos);
        yPos += 60;
    }
    if (activeEffects.fastSpeed > 0) {
        drawEffectBox(`🌪️ 광풍: ${Math.ceil(activeEffects.fastSpeed / 60)}초`, '속도가 너무 빨라요!', '#55efc4', yPos);
        yPos += 60;
    }
    ctx.textAlign = 'start'; // Reset
}

// Game Logic
let player = new Player();

function updateCanvasSize() {
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = window.innerWidth > 480 ? 480 : window.innerWidth;
    const cssHeight = window.innerHeight;

    gameWidth = cssWidth;
    gameHeight = cssHeight;

    // Physical resolution
    canvas.width = gameWidth * dpr;
    canvas.height = gameHeight * dpr;

    // Scale context to work with logical units
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
    ctx.scale(dpr, dpr);

    // Image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Update global scale factor for sprites
    scaleFactor = gameWidth / LOGICAL_WIDTH;

    // Update Scaled Constants
    GRAVITY = BASE_GRAVITY * scaleFactor;
    JUMP_FORCE = BASE_JUMP_FORCE * scaleFactor;
    MOVEMENT_SPEED = BASE_MOVEMENT_SPEED * scaleFactor;
    PLATFORM_WIDTH = BASE_PLATFORM_WIDTH * scaleFactor;
    PLATFORM_HEIGHT = BASE_PLATFORM_HEIGHT * scaleFactor;
    PLATFORM_GAP_MIN = BASE_PLATFORM_GAP_MIN * scaleFactor;
    PLATFORM_GAP_MAX = BASE_PLATFORM_GAP_MAX * scaleFactor;
}

function initGame() {
    updateCanvasSize();

    player = new Player();
    platforms = [];
    items = [];
    score = 0;
    gameTimer = 30;
    lastTime = 0;
    scoreElement.innerText = 0;

    // Reset effects
    activeEffects = {
        superJump: 0,
        doubleScore: 0,
        dizzy: 0,
        fastSpeed: 0
    };

    // Create initial platforms
    let y = gameHeight - 100;
    while (y > 0) {
        let x;
        // Keep initial clouds centered to avoid hint arrows
        const sideMargin = 100;
        const availableWidth = gameWidth - (sideMargin * 2) - PLATFORM_WIDTH;
        if (availableWidth > 0) {
            x = sideMargin + Math.random() * availableWidth;
        } else {
            x = Math.random() * (gameWidth - PLATFORM_WIDTH);
        }

        platforms.push(new Platform(x, y));
        y -= Math.random() * (PLATFORM_GAP_MAX - PLATFORM_GAP_MIN) + PLATFORM_GAP_MIN;
    }
}

function activateRandomEffect() {
    const rand = Math.random();
    gameTimer += 5; // Add 5 seconds on any collection
    if (rand < 0.25) {
        // Super Jump (8 seconds)
        activeEffects.superJump = 60 * 8;
        createBurstParticles(player.x + player.width / 2, player.y, '#fdcb6e');
    } else if (rand < 0.50) {
        // Double Score (10 seconds)
        activeEffects.doubleScore = 60 * 10;
        createBurstParticles(player.x + player.width / 2, player.y, '#fab1a0');
    } else if (rand < 0.75) {
        // Dizzy (Poison) (5 seconds)
        activeEffects.dizzy = 60 * 5;
        createBurstParticles(player.x + player.width / 2, player.y, '#a29bfe');
    } else {
        // Fast Speed (Poison) (5 seconds)
        activeEffects.fastSpeed = 60 * 5;
        createBurstParticles(player.x + player.width / 2, player.y, '#55efc4');
    }
}

function update(timestamp) {
    if (gameState !== 'PLAYING') return;

    if (!lastTime) lastTime = timestamp;
    const dt = timestamp - lastTime; // Delta time in milliseconds
    lastTime = timestamp;
    const dtScalar = dt / (1000 / BASE_FPS); // Normalize to 60 FPS

    frameCount++;
    gameTimer -= dt / 1000; // Decrement game timer by actual seconds passed
    const remainingSeconds = Math.max(0, Math.ceil(gameTimer));
    timerElement.innerText = remainingSeconds;

    // Highlight when 10s or less
    if (gameTimer <= 10) {
        timerElement.parentElement.classList.add('warning');
    } else {
        timerElement.parentElement.classList.remove('warning');
    }

    // Clear & Draw Background
    ctx.clearRect(0, 0, gameWidth, gameHeight);
    drawBackground();

    // Decrement Effect Timers
    if (activeEffects.superJump > 0) activeEffects.superJump -= dtScalar;
    if (activeEffects.doubleScore > 0) activeEffects.doubleScore -= dtScalar;
    if (activeEffects.dizzy > 0) activeEffects.dizzy -= dtScalar;
    if (activeEffects.fastSpeed > 0) activeEffects.fastSpeed -= dtScalar;

    // Touch Hint Management
    if (hintTimer > 0) {
        hintTimer -= dt / 1000;
        if (hintTimer <= 0) {
            touchHint.classList.add('hidden');
        }
    }

    // Item Spawn Timer Logic
    itemSpawnTimer += dt / 1000;
    if (itemSpawnTimer >= 5.0) {
        itemSpawnTimer = 0;
        itemsSpawnedInWindow = 0;
    }

    // Update & Draw Player
    player.update(dtScalar);
    player.draw();

    // Move Camera (Scroll platforms down if player goes up high)
    if (player.y < gameHeight / 2) {
        let deltaY = gameHeight / 2 - player.y;
        player.y += deltaY; // Keep player fixed relative to screen

        platforms.forEach(p => {
            p.y += deltaY;
        });

        items.forEach(i => {
            i.y += deltaY;
        });

        // Score Calculation
        let addedScore = Math.floor(deltaY);
        if (activeEffects.doubleScore > 0) addedScore *= 2;
        score += addedScore;
        scoreElement.innerText = score;
    }

    // Platform Management
    platforms.forEach((p, index) => {
        p.update(dtScalar);
        p.draw();

        // Collision Check (Only when falling)
        // Check against the hitbox (top part of the image)
        if (
            player.vy > 0 &&
            player.x + player.width * 0.7 > p.x &&
            player.x + player.width * 0.3 < p.x + p.width &&
            player.y + player.height * 0.8 > p.y &&
            player.y + player.height * 0.8 < p.y + p.hitboxHeight + 15
        ) {
            player.jump();
        }

        // Remove platforms below screen
        if (p.y > gameHeight) {
            platforms.splice(index, 1);
        }
    });

    // Item Management
    items.forEach((item, index) => {
        item.draw();

        // Item Collision (Simple AABB)
        if (
            player.x < item.x + item.width &&
            player.x + player.width > item.x &&
            player.y < item.y + item.height &&
            player.y + player.height > item.y
        ) {
            // Collect Item
            items.splice(index, 1);
            activateRandomEffect();
        }

        // Remove items below screen
        if (item.y > gameHeight) {
            items.splice(index, 1);
        }
    });

    // Generate new platforms
    while (platforms[platforms.length - 1].y > PLATFORM_GAP_MIN) {
        let y = platforms[platforms.length - 1].y - (Math.random() * (PLATFORM_GAP_MAX - PLATFORM_GAP_MIN) + PLATFORM_GAP_MIN);

        let x;
        // If arrows are showing, keep clouds in the center to avoid overlap
        if (hintTimer > 0) {
            const sideMargin = 100 * scaleFactor;
            const availableWidth = gameWidth - (sideMargin * 2) - PLATFORM_WIDTH;
            if (availableWidth > 0) {
                x = sideMargin + Math.random() * availableWidth;
            } else {
                x = Math.random() * (gameWidth - PLATFORM_WIDTH);
            }
        } else {
            x = Math.random() * (gameWidth - PLATFORM_WIDTH);
        }

        platforms.push(new Platform(x, y));

        // Spawn Item logic (Guaranteed 1-2 items every 5 seconds)
        // Probabilistic spawn that forces minimum if window is ending
        let shouldSpawn = false;

        // If window is half over and none spawned, 20% chance
        // If window is almost over and none spawned, force it
        if (itemsSpawnedInWindow === 0) {
            if (itemSpawnTimer > 4.5) shouldSpawn = true;
            else if (itemSpawnTimer > 2.5 && Math.random() < 0.15) shouldSpawn = true;
        } else if (itemsSpawnedInWindow === 1 && itemSpawnTimer > 3.5 && Math.random() < 0.1) {
            // Low chance for a second item in the same window
            shouldSpawn = true;
        }

        if (shouldSpawn && itemsSpawnedInWindow < 2) {
            items.push(new Item(x + PLATFORM_WIDTH / 2 - 20, y - 40));
            itemsSpawnedInWindow++;
        }
    }

    // Particles
    particles.forEach((p, i) => {
        p.update(dtScalar);
        p.draw();
        if (p.alpha <= 0) particles.splice(i, 1);
    });

    // Draw UI
    drawUI();

    // Game Over Check
    if (player.y > gameHeight) {
        gameOver('fall');
    } else if (gameTimer <= 0) {
        gameOver('timeout');
    } else {
        requestAnimationFrame(update);
    }
}

function startGame() {
    gameState = 'PLAYING';
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    touchHint.classList.remove('hidden');
    hintTimer = 10;

    // Increment global play count
    incrementPlayCount();

    initGame();
    requestAnimationFrame(update);
}

function gameOver(reason) {
    gameState = 'GAMEOVER';
    finalScoreElement.innerText = score;

    const msgElement = document.getElementById('game-over-msg');
    if (reason === 'timeout') {
        msgElement.innerText = '시간이 다 됐어요!';
    } else {
        msgElement.innerText = '떨어졌어요!';
    }

    gameOverScreen.classList.add('active');
}

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Handle resize
window.addEventListener('resize', () => {
    updateCanvasSize();
    if (gameState === 'MENU') drawBackground();
});

// Initial Setup
updateCanvasSize();

// Draw generic background on load
backgroundImg.onload = () => {
    if (gameState === 'MENU') drawBackground();
};

// Initial Data Fetch
updatePlayCountUI();
