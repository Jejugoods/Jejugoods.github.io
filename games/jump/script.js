const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game Constants
const GRAVITY = 0.4;
const JUMP_FORCE = -11;
const MOVEMENT_SPEED = 5;
const PLATFORM_WIDTH = 70;
const PLATFORM_HEIGHT = 20;
const PLATFORM_GAP_MIN = 40; // Reduced from 60
const PLATFORM_GAP_MAX = 100; // Reduced from 130

// Assets (Using Imagebitmap for cleaner handling potentially, or just Image)
const tigerImg = new Image();
const platformImg = new Image();
const backgroundImg = new Image();

// Helper to remove white background
function createTransparentImage(src, callback) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = src;
    img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);

        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;

        // Loop through pixels
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // If white or very light grey
            if (r > 240 && g > 240 && b > 240) {
                data[i + 3] = 0; // Set alpha to 0
            }
        }

        tempCtx.putImageData(imageData, 0, 0);
        const newImg = new Image();
        newImg.src = tempCanvas.toDataURL();
        callback(newImg);
    };
}

// Load and process images
createTransparentImage('assets/tiger.png', (processedImg) => {
    tigerImg.src = processedImg.src;
});

createTransparentImage('assets/platform.png', (processedImg) => {
    platformImg.src = processedImg.src;
});

backgroundImg.src = 'assets/background.png';

// Game State
let gameState = 'MENU'; // MENU, PLAYING, GAMEOVER
let score = 0;
let platforms = [];
let particles = [];
let keys = {
    ArrowLeft: false,
    ArrowRight: false
};
let frameCount = 0; // For animation

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
    const touchX = e.touches[0].clientX;
    const screenWidth = window.innerWidth;
    if (touchX < screenWidth / 2) {
        keys.ArrowLeft = true;
        keys.ArrowRight = false;
    } else {
        keys.ArrowRight = true;
        keys.ArrowLeft = false;
    }
});

window.addEventListener('touchend', () => {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
});

// Player Class (White Tiger)
class Player {
    constructor() {
        this.width = 60; // Slightly larger for image visibility
        this.height = 60;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - 150;
        this.vx = 0;
        this.vy = 0;
        this.facingRight = true;
    }

    draw() {
        ctx.save();

        // Flip context if facing left
        if (this.vx < -0.1) this.facingRight = false;
        if (this.vx > 0.1) this.facingRight = true;

        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        ctx.translate(centerX, centerY);
        if (!this.facingRight) ctx.scale(-1, 1);

        // Draw Image
        if (tigerImg.complete && tigerImg.src) {
            ctx.drawImage(tigerImg, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            // Fallback
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    update() {
        // Horizontal Movement
        if (keys.ArrowLeft) {
            this.vx = -MOVEMENT_SPEED;
        } else if (keys.ArrowRight) {
            this.vx = MOVEMENT_SPEED;
        } else {
            this.vx *= 0.8; // Friction
        }
        this.x += this.vx;

        // Vertical Movement
        this.vy += GRAVITY;
        this.y += this.vy;

        // Floor collision (only for start)
        if (this.y + this.height > canvas.height && score === 0) {
            this.y = canvas.height - this.height;
            this.vy = 0;
            this.jump(); // Auto jump on start
        }

        // Wrap around screen
        if (this.x + this.width < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = -this.width;
    }

    jump() {
        this.vy = JUMP_FORCE;
        // Create dust particles
        for (let i = 0; i < 5; i++) {
            particles.push(new Particle(this.x + this.width / 2, this.y + this.height));
        }
    }
}

// Platform Class (Clouds)
class Platform {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = PLATFORM_WIDTH;
        this.height = PLATFORM_HEIGHT * 2.5; // Taller for image aspect ratio
        this.hitboxHeight = 20; // Only collide with top part
        this.type = Math.random() < 0.1 ? 'moving' : 'normal';
        this.vx = this.type === 'moving' ? (Math.random() < 0.5 ? 2 : -2) : 0;
    }

    draw() {
        if (platformImg.complete && platformImg.src) {
            // Draw slightly larger than Hitbox for visual fluff
            ctx.drawImage(platformImg, this.x - 10, this.y - 10, this.width + 20, this.height);
        } else {
            // Fallback
            ctx.fillStyle = '#dfe6e9';
            ctx.fillRect(this.x, this.y, this.width, this.hitboxHeight);
        }

        // Moving platform indicator (optional - visual only)
        // If the platform image itself suggests movement, or we could add sparkles
    }

    update() {
        if (this.type === 'moving') {
            this.x += this.vx;
            if (this.x < 0 || this.x + this.width > canvas.width) {
                this.vx *= -1;
            }
        }
    }
}

// Particle Class (Sparkles/Dust)
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.vx = Math.random() * 2 - 1;
        this.vy = Math.random() * 2 - 1;
        this.alpha = 1;
        this.color = Math.random() < 0.5 ? '#ffffff' : '#f1c40f'; // White or Gold sparkles
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.05;
    }
    draw() {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        // Star shape or circle
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Background Drawing
function drawBackground() {
    if (backgroundImg.complete) {
        // Simple parallax logic:
        // Background moves very slowly based on player vertical position
        // This is tricky with infinite scroll without repeating image
        // Just fill screen for now
        const scale = Math.max(canvas.width / backgroundImg.width, canvas.height / backgroundImg.height);
        const x = (canvas.width / 2) - (backgroundImg.width / 2) * scale;
        const y = (canvas.height / 2) - (backgroundImg.height / 2) * scale;
        ctx.drawImage(backgroundImg, x, y, backgroundImg.width * scale, backgroundImg.height * scale);

    } else {
        // Fallback Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#0984e3'); // Deep Blue
        gradient.addColorStop(1, '#74b9ff'); // Light Blue
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// Game Logic
let player = new Player();

function initGame() {
    canvas.width = window.innerWidth > 480 ? 480 : window.innerWidth;
    canvas.height = window.innerHeight;
    player = new Player();
    platforms = [];
    score = 0;
    scoreElement.innerText = 0;

    // Create initial platforms
    let y = canvas.height - 100;
    while (y > 0) {
        let x = Math.random() * (canvas.width - PLATFORM_WIDTH);
        platforms.push(new Platform(x, y));
        y -= Math.random() * (PLATFORM_GAP_MAX - PLATFORM_GAP_MIN) + PLATFORM_GAP_MIN;
    }
}

function update() {
    frameCount++;
    if (gameState !== 'PLAYING') return;

    // Clear & Draw Background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    // Update & Draw Player
    player.update();
    player.draw();

    // Move Camera (Scroll platforms down if player goes up high)
    if (player.y < canvas.height / 2) {
        let deltaY = canvas.height / 2 - player.y;
        player.y += deltaY; // Keep player fixed relative to screen

        platforms.forEach(p => {
            p.y += deltaY;
        });

        score += Math.floor(deltaY);
        scoreElement.innerText = score;
    }

    // Platform Management
    platforms.forEach((p, index) => {
        p.update();
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
        if (p.y > canvas.height) {
            platforms.splice(index, 1);
        }
    });

    // Generate new platforms
    while (platforms[platforms.length - 1].y > PLATFORM_GAP_MIN) {
        let y = platforms[platforms.length - 1].y - (Math.random() * (PLATFORM_GAP_MAX - PLATFORM_GAP_MIN) + PLATFORM_GAP_MIN);
        let x = Math.random() * (canvas.width - PLATFORM_WIDTH);
        platforms.push(new Platform(x, y));
    }

    // Particles
    particles.forEach((p, i) => {
        p.update();
        p.draw();
        if (p.alpha <= 0) particles.splice(i, 1);
    });

    // Game Over Check
    if (player.y > canvas.height) {
        gameOver();
    }

    requestAnimationFrame(update);
}

function startGame() {
    gameState = 'PLAYING';
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    initGame();
    update();
}

function gameOver() {
    gameState = 'GAMEOVER';
    finalScoreElement.innerText = score;
    gameOverScreen.classList.add('active');
}

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Handle resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth > 480 ? 480 : window.innerWidth;
    canvas.height = window.innerHeight;
});

// Initial Setup
canvas.width = window.innerWidth > 480 ? 480 : window.innerWidth;
canvas.height = window.innerHeight;
// Draw generic background on load (wait for image?)
backgroundImg.onload = () => {
    if (gameState === 'MENU') drawBackground();
};
